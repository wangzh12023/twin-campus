"""Small mesh-building toolkit for headless Blender scripts.

Geometry is accumulated into per-material batches (plain Python lists) and only
turned into Blender meshes at the end. That keeps thousands of boxes / trees
cheap to generate and produces few draw calls in the exported glTF.
"""
import bpy
import bmesh
import math
import random
from mathutils import Vector, Matrix


# ----------------------------------------------------------------------------
# scene / materials
# ----------------------------------------------------------------------------

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _MATS.clear()
    _BATCHES.clear()


def hex2lin(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


_MATS = {}


def mat(name, color='#cccccc', rough=0.6, metal=0.0, emission=None, strength=0.0, alpha=1.0):
    if name in _MATS:
        return _MATS[name]
    m = bpy.data.materials.new(name)
    if m.node_tree is None:
        m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*hex2lin(color), 1.0)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*hex2lin(emission), 1.0)
        bsdf.inputs['Emission Strength'].default_value = strength
    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            pass
    m.diffuse_color = (*hex2lin(color), alpha)
    _MATS[name] = m
    return m


# ----------------------------------------------------------------------------
# batches
# ----------------------------------------------------------------------------

_BATCHES = {}
OFFSET = [0.0, 0.0, 0.0]   # translation applied to everything added while it is set (tower-local -> world)


def _off(p):
    return (p[0] + OFFSET[0], p[1] + OFFSET[1], p[2] + OFFSET[2])


def newell(pts):
    n = [0.0, 0.0, 0.0]
    k = len(pts)
    for i in range(k):
        a = pts[i]
        b = pts[(i + 1) % k]
        n[0] += (a[1] - b[1]) * (a[2] + b[2])
        n[1] += (a[2] - b[2]) * (a[0] + b[0])
        n[2] += (a[0] - b[0]) * (a[1] + b[1])
    l = math.sqrt(n[0] ** 2 + n[1] ** 2 + n[2] ** 2) or 1.0
    return (n[0] / l, n[1] / l, n[2] / l)


def box_uv(pts):
    """World-space (metre) planar UVs picked by dominant normal axis."""
    nx, ny, nz = newell(pts)
    ax, ay, az = abs(nx), abs(ny), abs(nz)
    if az >= ax and az >= ay:
        return [(p[0], p[1]) for p in pts]
    if ax >= ay:
        s = 1.0 if nx > 0 else -1.0
        return [(s * p[1], p[2]) for p in pts]
    s = -1.0 if ny > 0 else 1.0
    return [(s * p[0], p[2]) for p in pts]


class Batch:
    def __init__(self, name, material, smooth=False, colors=False):
        self.name = name
        self.material = material
        self.smooth = smooth
        self.use_colors = colors
        self.V = []
        self.F = []
        self.UV = []   # per corner
        self.COL = []  # per corner rgba
        self.color = (1, 1, 1, 1)

    # -- raw ------------------------------------------------------------
    def face(self, pts, uvs=None, color=None):
        base = len(self.V)
        pts = [_off(p) for p in pts]
        self.V.extend(pts)
        self.F.append(list(range(base, base + len(pts))))
        self.UV.extend(uvs if uvs is not None else box_uv(pts))
        c = color or self.color
        self.COL.extend([c] * len(pts))

    def indexed(self, verts, faces, uvs=None, colors=None):
        """Shared-vertex geometry (for smooth shading). uvs: per-vertex list."""
        base = len(self.V)
        verts = [_off(v) for v in verts]
        self.V.extend(verts)
        for fi, f in enumerate(faces):
            self.F.append([base + i for i in f])
            if uvs is not None:
                self.UV.extend([uvs[i] for i in f])
            else:
                self.UV.extend(box_uv([verts[i] for i in f]))
            c = colors[fi] if colors else self.color
            self.COL.extend([c] * len(f))

    # -- primitives -----------------------------------------------------
    def box(self, x0, y0, z0, x1, y1, z1, skip=(), rot=0.0, pivot=None):
        """Axis aligned box between two corners; optional rotation about Z."""
        c = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
             (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
        if rot:
            px, py = pivot if pivot else ((x0 + x1) / 2, (y0 + y1) / 2)
            cs, sn = math.cos(rot), math.sin(rot)
            c = [(px + (x - px) * cs - (y - py) * sn, py + (x - px) * sn + (y - py) * cs, z) for x, y, z in c]
        faces = {
            'bottom': (0, 3, 2, 1), 'top': (4, 5, 6, 7),
            'front': (0, 1, 5, 4), 'right': (1, 2, 6, 5),
            'back': (2, 3, 7, 6), 'left': (3, 0, 4, 7),
        }
        for k, f in faces.items():
            if k in skip:
                continue
            self.face([c[i] for i in f])

    def cbox(self, cx, cy, cz, sx, sy, sz, rot=0.0, skip=()):
        self.box(cx - sx / 2, cy - sy / 2, cz - sz / 2, cx + sx / 2, cy + sy / 2, cz + sz / 2, skip=skip, rot=rot)

    def prism(self, poly, z0, z1, top=True, bottom=False, sides=True):
        n = len(poly)
        if sides:
            for i in range(n):
                a = poly[i]
                b = poly[(i + 1) % n]
                self.face([(a[0], a[1], z0), (b[0], b[1], z0), (b[0], b[1], z1), (a[0], a[1], z1)])
        if top:
            self.face([(p[0], p[1], z1) for p in poly])
        if bottom:
            self.face([(p[0], p[1], z0) for p in reversed(poly)])

    def flat(self, poly, z):
        self.face([(p[0], p[1], z) for p in poly])

    def quad_strip(self, a, b, width, z, cap=0.0):
        """Flat strip on the ground from 2D point a to b."""
        ax, ay = a
        bx, by = b
        dx, dy = bx - ax, by - ay
        l = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / l * width / 2, dx / l * width / 2
        self.face([(ax - nx, ay - ny, z), (bx - nx, by - ny, z), (bx + nx, by + ny, z), (ax + nx, ay + ny, z)])

    def cylinder(self, cx, cy, z0, z1, r, n=12, caps=True, r_top=None):
        rt = r if r_top is None else r_top
        ring0 = [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n), z0) for i in range(n)]
        ring1 = [(cx + rt * math.cos(2 * math.pi * i / n), cy + rt * math.sin(2 * math.pi * i / n), z1) for i in range(n)]
        for i in range(n):
            j = (i + 1) % n
            self.face([ring0[i], ring0[j], ring1[j], ring1[i]])
        if caps:
            self.face(list(ring1))
            self.face(list(reversed(ring0)))

    def template(self, tpl, M, color=None):
        """Add a Template (verts, faces) transformed by 4x4 Matrix M."""
        verts = [tuple(M @ Vector(v)) for v in tpl.verts]
        for fi, f in enumerate(tpl.faces):
            c = color
            if tpl.face_colors is not None and color is None:
                c = tpl.face_colors[fi]
            self.face([verts[i] for i in f], color=c)

    # -- output ---------------------------------------------------------
    def build(self, parent=None):
        if not self.F:
            return None
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.V, [], self.F)
        uv = me.uv_layers.new(name='UVMap')
        flat = [c for uvp in self.UV for c in uvp]
        uv.data.foreach_set('uv', flat)
        if self.use_colors:
            ca = me.color_attributes.new(name='Col', type='BYTE_COLOR', domain='CORNER')
            ca.data.foreach_set('color', [c for col in self.COL for c in col])
            me.color_attributes.active_color = ca
        me.polygons.foreach_set('use_smooth', [self.smooth] * len(me.polygons))
        me.validate(clean_customdata=False)
        me.update()
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        me.materials.append(self.material)
        if parent is not None:
            ob.parent = parent
        return ob


def batch(name, material, smooth=False, colors=False):
    key = name
    if key not in _BATCHES:
        if material is None:
            raise KeyError(name)
        _BATCHES[key] = Batch(name, material, smooth, colors)
    return _BATCHES[key]


def build_all():
    out = []
    for b in _BATCHES.values():
        ob = b.build()
        if ob:
            out.append(ob)
    return out


def empty(name, loc, parent=None):
    ob = bpy.data.objects.new(name, None)
    ob.location = _off(loc)
    bpy.context.scene.collection.objects.link(ob)
    if parent is not None:
        ob.parent = parent
    return ob


# ----------------------------------------------------------------------------
# templates
# ----------------------------------------------------------------------------

class Template:
    def __init__(self, verts, faces, face_colors=None):
        self.verts = verts
        self.faces = faces
        self.face_colors = face_colors


def icosphere(subdiv=1, radius=1.0):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=radius)
    verts = [tuple(v.co) for v in bm.verts]
    faces = [[v.index for v in f.verts] for f in bm.faces]
    bm.free()
    return verts, faces


def uv_sphere(seg=24, rings=12, radius=1.0):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=radius)
    verts = [tuple(v.co) for v in bm.verts]
    faces = [[v.index for v in f.verts] for f in bm.faces]
    bm.free()
    return verts, faces


def torus(R, r, seg=96, sides=24):
    verts, uvs, faces = [], [], []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        for j in range(sides):
            b = 2 * math.pi * j / sides
            x = (R + r * math.cos(b)) * math.cos(a)
            y = (R + r * math.cos(b)) * math.sin(a)
            z = r * math.sin(b)
            verts.append((x, y, z))
            uvs.append((i / seg, j / sides))
    for i in range(seg):
        for j in range(sides):
            a = i * sides + j
            b = ((i + 1) % seg) * sides + j
            c = ((i + 1) % seg) * sides + (j + 1) % sides
            d = i * sides + (j + 1) % sides
            faces.append([a, b, c, d])
    return verts, faces, uvs


def lathe(profile, seg=48):
    """profile: list of (r, z) from bottom to top. Returns smooth verts/faces."""
    verts, faces = [], []
    n = len(profile)
    for i in range(seg):
        a = 2 * math.pi * i / seg
        ca, sa = math.cos(a), math.sin(a)
        for r, z in profile:
            verts.append((r * ca, r * sa, z))
    for i in range(seg):
        i2 = (i + 1) % seg
        for k in range(n - 1):
            a = i * n + k
            b = i2 * n + k
            c = i2 * n + k + 1
            d = i * n + k + 1
            faces.append([a, b, c, d])
    return verts, faces


def mat_trs(loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    T = Matrix.Translation(Vector(loc))
    R = (Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X'))
    S = Matrix.Diagonal((*scale, 1.0))
    return T @ R @ S


def mesh_object(name, verts, faces, material, smooth=True, uvs=None, parent=None, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    if uvs is not None:
        uv = me.uv_layers.new(name='UVMap')
        flat = []
        for f in faces:
            for i in f:
                flat.extend(uvs[i])
        uv.data.foreach_set('uv', flat)
    me.polygons.foreach_set('use_smooth', [smooth] * len(me.polygons))
    me.validate()
    me.update()
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(material)
    if parent is not None:
        ob.parent = parent
    return ob


def export_glb(path):
    kw = dict(filepath=path, export_format='GLB', export_yup=True, export_apply=True,
              export_materials='EXPORT', export_cameras=False, export_lights=False,
              export_extras=True, export_texcoords=True, export_normals=True,
              use_selection=False, use_visible=False)
    for vc in ('ACTIVE', 'MATERIAL'):
        try:
            bpy.ops.export_scene.gltf(**kw, export_vertex_color=vc)
            return
        except TypeError:
            continue
    bpy.ops.export_scene.gltf(**kw)
