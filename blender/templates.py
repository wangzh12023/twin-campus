# ---------------------------------------------------------------------------
# instance templates (exported but hidden in three.js)
# ---------------------------------------------------------------------------
def tpl_tree(name, blobs, trunk_h=3.2, trunk_r=0.18):
    lb = Batch(name + '_leaf', M['leaf'], colors=True)
    tb = Batch(name + '_trunk', M['trunk'])
    tb.cylinder(0, 0, 0, trunk_h + 0.6, trunk_r, n=6, r_top=trunk_r * 0.7)
    for (x, y, z, r, shade) in blobs:
        v, f = blib.icosphere(1, r)
        col = (0.30 * shade, 0.52 * shade, 0.30 * shade, 1.0)
        verts = [(x + a, y + b, z + c * 0.9) for a, b, c in v]
        for face in f:
            pts = [verts[i] for i in face]
            # top faces lighter, bottom faces darker
            nz = blib.newell(pts)[2]
            k = 0.85 + 0.25 * nz
            lb.face(pts, color=(col[0] * k, col[1] * k, col[2] * k, 1.0))
    a = lb.build()
    b = tb.build()
    return a, b


tpl_tree('TPL_tree', [(0, 0, 4.3, 1.7, 1.0), (0.9, 0.4, 3.7, 1.3, 0.95), (-0.8, -0.5, 3.8, 1.25, 0.9), (0.1, -0.2, 5.3, 1.2, 1.08)])
tpl_tree('TPL_tree_round', [(0, 0, 5.4, 2.2, 1.0), (1.4, 0.6, 4.8, 1.6, 0.95), (-1.3, -0.7, 4.9, 1.6, 0.92), (0.3, 1.2, 4.6, 1.4, 0.9),
                            (-0.2, -1.3, 5.8, 1.5, 1.05), (0.4, 0.1, 6.6, 1.5, 1.1)], trunk_h=4.0, trunk_r=0.2)
lb = Batch('TPL_bush_leaf', M['leaf'], colors=True)
v, f = blib.icosphere(1, 1.0)
for face in f:
    pts = [v[i] for i in face]
    nz = blib.newell(pts)[2]
    k = 0.85 + 0.25 * nz
    lb.face([(a, b, c * 0.85 + 0.75) for a, b, c in pts], color=(0.33 * k, 0.55 * k, 0.32 * k, 1))
lb.build()
# potted plant foliage (ficus-like): stems + many small leaves
pl_leaf = Batch('TPL_plant_leaf', mat('plant_leaf', '#3d7a37', 0.75), colors=True)
pl_stem = Batch('TPL_plant_stem', mat('plant_stem', '#5a4a3a', 0.9))
prng = random.Random(3)
pl_stem.cylinder(0, 0, 0, 0.9, 0.025, n=6, r_top=0.015)
clusters = [(0.0, 0.0, 1.05, 0.32), (0.18, 0.08, 0.8, 0.24), (-0.16, -0.05, 0.72, 0.22), (0.05, -0.15, 1.3, 0.22),
            (-0.08, 0.12, 0.55, 0.18)]
for (cx_, cy_, cz_, cr_) in clusters:
    pl_stem.face([(0, 0, cz_ * 0.6), (0.01, 0, cz_ * 0.6), (cx_ + 0.01, cy_, cz_), (cx_, cy_, cz_)])
    for k in range(int(70 * cr_ / 0.3)):
        u = prng.uniform(0, 2 * math.pi)
        v = prng.uniform(-1, 1)
        rr = cr_ * prng.uniform(0.35, 1.0)
        px = cx_ + rr * math.sqrt(1 - v * v) * math.cos(u)
        py = cy_ + rr * math.sqrt(1 - v * v) * math.sin(u)
        pz = cz_ + rr * v * 0.8
        L_ = prng.uniform(0.09, 0.14)
        W_ = L_ * 0.45
        a_ = prng.uniform(0, 2 * math.pi)
        tilt = prng.uniform(-0.6, 0.4)
        dx_, dy_ = math.cos(a_), math.sin(a_)
        tip = (px + dx_ * L_, py + dy_ * L_, pz + tilt * L_)
        mid = (px + dx_ * L_ * 0.45, py + dy_ * L_ * 0.45, pz + tilt * L_ * 0.45)
        sx_, sy_ = -dy_ * W_ / 2, dx_ * W_ / 2
        shade = prng.uniform(0.75, 1.15)
        col = (0.24 * shade, 0.48 * shade, 0.22 * shade, 1.0)
        q = [(px, py, pz), (mid[0] + sx_, mid[1] + sy_, mid[2] + 0.01), tip, (mid[0] - sx_, mid[1] - sy_, mid[2] + 0.01)]
        pl_leaf.face(q, color=col)
        pl_leaf.face(list(reversed(q)), color=(col[0] * 0.8, col[1] * 0.8, col[2] * 0.8, 1))
pl_leaf.build()
pl_stem.build()
cb = Batch('TPL_car', M['car'], colors=True)
cb.color = (1, 1, 1, 1)
cb.box(-0.95, -2.2, 0.25, 0.95, 2.2, 1.0)
cb.color = (0.75, 0.78, 0.82, 1)
cb.box(-0.85, -1.1, 1.0, 0.85, 1.0, 1.55)
cb.color = (0.1, 0.1, 0.1, 1)
for (x, y) in ((-0.95, -1.4), (0.95, -1.4), (-0.95, 1.4), (0.95, 1.4)):
    cb.box(x - 0.15, y - 0.35, 0.0, x + 0.15, y + 0.35, 0.6)
cb.build()

# ---------------------------------------------------------------------------
blib.build_all()

# mark which nodes are templates
for ob in bpy.data.objects:
    if ob.name.startswith('TPL_'):
        ob['template'] = 1

blib.export_glb(os.path.join(OUT, 'campus.glb'))
with open(os.path.join(OUT, 'campus_instances.json'), 'w') as fp:
    json.dump(instances, fp, separators=(',', ':'))
print('CAMPUS DONE', {k: len(v) for k, v in instances.items()},
      sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH'))
