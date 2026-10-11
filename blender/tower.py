# HQ tower shell (tower-local coordinates). Executed inside build_campus.py.
tg = batch('glass_tower', M['tglass'])
tgl = batch('glass_tower_low', mat('glass_tower_low', '#2a7fa6', 0.05, 0.2))
fr = batch('tower_frame', M['frame'])
dfr = batch('tower_frame_dark', M['darkframe'])

TOWER_BASE = PLAZA_Z
B = TOWER_BASE
Z_LOBBY = 9.5
Z_SPLIT = 47.8                 # split between the two glass volumes on the west side ...
Z_SPLIT_R = 55.4               # ... stepping up to this height east of the kink
KX0, KX1 = -10.2, -3.9         # x-range of the diagonal step in the split line
Z_TOP = 92.4
T_Y0, T_Y1 = 30.0, 58.0
L_X0, L_X1, L_Y0 = -12.0, 16.0, 28.0      # lower glass volume (protrudes 2 m south)
U_X0, U_X1 = -19.5, 16.0                  # upper glass volume (overhangs the west pier)
zl, zr, zt, zb = B + Z_SPLIT, B + Z_SPLIT_R, B + Z_TOP, B + Z_LOBBY

# lower volume: straight part + stepped top
tgl.box(L_X0, L_Y0, zb, L_X1, T_Y1, zl, skip=('bottom', 'top'))
for y, flip in ((L_Y0, False), (T_Y1, True)):
    q = [(KX0, y, zl), (L_X1, y, zl), (L_X1, y, zr), (KX1, y, zr)]
    tgl.face(list(reversed(q)) if flip else q)
tgl.face([(L_X1, L_Y0, zl), (L_X1, T_Y1, zl), (L_X1, T_Y1, zr), (L_X1, L_Y0, zr)])
# white ledge on top of the protruding lower volume (follows the kink)
for q in ([(L_X0, L_Y0, zl), (KX0, L_Y0, zl), (KX0, T_Y0, zl), (L_X0, T_Y0, zl)],
          [(KX0, L_Y0, zl), (KX1, L_Y0, zr), (KX1, T_Y0, zr), (KX0, T_Y0, zl)],
          [(KX1, L_Y0, zr), (L_X1, L_Y0, zr), (L_X1, T_Y0, zr), (KX1, T_Y0, zr)]):
    fr.face(q)
for (a, b) in (((L_X0, zl), (KX0, zl)), ((KX0, zl), (KX1, zr)), ((KX1, zr), (L_X1, zr))):
    fr.face([(a[0], L_Y0 - 0.06, a[1] - 0.5), (b[0], L_Y0 - 0.06, b[1] - 0.5), (b[0], L_Y0 - 0.06, b[1] + 0.25), (a[0], L_Y0 - 0.06, a[1] + 0.25)])
# upper volume
tg.box(U_X0, T_Y0, zr, U_X1, T_Y1, zt, skip=('top', 'bottom'))
for y, flip in ((T_Y0, False), (T_Y1, True)):
    q = [(U_X0, y, zl), (KX0, y, zl), (KX1, y, zr), (U_X0, y, zr)]
    tg.face(list(reversed(q)) if flip else q)
tg.face([(U_X0, T_Y1, zl), (U_X0, T_Y0, zl), (U_X0, T_Y0, zr), (U_X0, T_Y1, zr)])
fr.box(U_X0, T_Y0, zl - 0.6, L_X0, T_Y1, zl)                 # soffit of the overhang
# west pier carrying the overhang, east spine full height
batch('tower_pier', M['frame']).box(-19.5, 33.0, B, -12.0, 55.0, zl - 0.6)
fr.box(16.0, 24.0, B, 21.5, 62.0, zt + 3.0)
# roof, parapet, plant rooms
fr.box(U_X0, T_Y0, zt, U_X1, T_Y1, zt + 0.5)
for (x0, y0, x1, y1) in ((U_X0, T_Y0, U_X1, T_Y0 + 0.6), (U_X0, T_Y1 - 0.6, U_X1, T_Y1),
                         (U_X0, T_Y0, U_X0 + 0.6, T_Y1), (U_X1 - 0.6, T_Y0, U_X1, T_Y1)):
    fr.box(x0, y0, zt + 0.5, x1, y1, zt + 1.8, skip=('bottom',))
fr.box(-14, 34, zt + 0.5, 11, 54, zt + 4.6, skip=('bottom',))
fr.box(-9, 38, zt + 4.6, 5, 50, zt + 6.6, skip=('bottom',))
sol_t = batch('solar', M['solar'])
sol_t.box(-12, 35.5, zt + 4.6, -2, 37.5, zt + 4.75, skip=('bottom',))
sol_t.box(-7, 41, zt + 6.6, 3, 47, zt + 6.75, skip=('bottom',))

# lobby podium: glass box between the piers + white canopy band
LOB_Y0 = 24.5
LOB_Y1 = 44.0
lobby_glass = batch('glass_lobby', mat('glass_lobby', '#bcd3e6', 0.05, 0.0, alpha=0.25))
lobby_glass.box(L_X0, LOB_Y0, B, L_X1, LOB_Y1, zb, skip=('bottom', 'top', 'back'))
fr.box(L_X0, LOB_Y0 - 0.3, zb - 0.15, L_X1, T_Y1, zb + 0.6, skip=('top',))
NM = 16
for i in range(NM + 1):
    x = L_X0 + i * (L_X1 - L_X0) / NM
    dfr.cbox(x, LOB_Y0, B + Z_LOBBY / 2, 0.1, 0.22, Z_LOBBY)
for z in (3.4, 6.6):
    dfr.box(L_X0, LOB_Y0 - 0.08, B + z, L_X1, LOB_Y0 + 0.08, B + z + 0.1)
for k in range(9):
    y = LOB_Y0 + k * (LOB_Y1 - LOB_Y0) / 8
    for x in (L_X0, L_X1):
        dfr.cbox(x, y, B + Z_LOBBY / 2, 0.22, 0.1, Z_LOBBY)
for z in (3.4, 6.6):
    for x in (L_X0, L_X1):
        dfr.box(x - 0.08, LOB_Y0, B + z, x + 0.08, LOB_Y1, B + z + 0.1)
dfr.box(-0.5, LOB_Y0 - 0.14, B + 3.3, 8.5, LOB_Y0 + 0.14, B + 3.45)
for x in (-0.5, 1.75, 4.0, 6.25, 8.5):
    dfr.cbox(x, LOB_Y0, B + 1.7, 0.12, 0.2, 3.4)


def text_mesh(name, body, size, loc, rot, material, extrude=0.05, align='CENTER'):
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = body
    cu.size = size
    cu.extrude = extrude
    cu.align_x = align
    ob = bpy.data.objects.new(name + '_c', cu)
    bpy.context.scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    o2 = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o2)
    o2.location = loc
    o2.rotation_euler = rot
    me.materials.append(material)
    return o2


text_mesh('sign_brand', 'TwinCampus', 1.05, (4.0, LOB_Y0 - 0.16, B + 6.9), (math.pi / 2, 0, 0), M['sign'], 0.06)
text_mesh('crown_text', 'TwinCampus', 1.7, (3.0, T_Y0 - 0.12, zt - 7.0), (math.pi / 2, 0, 0), M['logo'], 0.02)
lg = batch('tower_logo', M['logo'])
for (x0, x1, z0, z1) in ((-15.8, -13.2, -8.2, -5.6), (-14.2, -11.6, -6.8, -4.2)):          # "twin squares" mark
    lg.box(x0, T_Y0 - 0.16, zt + z0, x1, T_Y0 - 0.04, zt + z1)
