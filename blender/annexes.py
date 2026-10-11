# Annex buildings (M frame, shifted by SITE_OFF). Executed inside build_campus.py.
fr = batch('annex_frame', M['frame'])
blib.OFFSET[:] = SITE_OFF
ag = batch('glass_annex', M['aglass'])
wd = batch('wood', M['wood'])
rg = batch('glass_roof', M['roofglass'])
sol = batch('solar', M['solar'])
asl = batch('annex_slab', mat('annex_slab', '#e9eef3', 0.7))
core = batch('annex_core', mat('annex_core', '#d9c3a6', 0.7))


def louvres(x0, y0, x1, y1, z0, z1, step=0.9):
    """timber fins around a rectangle."""
    nx_, ny_ = int((x1 - x0) / step), int((y1 - y0) / step)
    for i in range(nx_ + 1):
        x = x0 + i * (x1 - x0) / nx_
        wd.cbox(x, y0, (z0 + z1) / 2, 0.22, 0.35, z1 - z0)
        wd.cbox(x, y1, (z0 + z1) / 2, 0.22, 0.35, z1 - z0)
    for i in range(ny_ + 1):
        y = y0 + i * (y1 - y0) / ny_
        wd.cbox(x0, y, (z0 + z1) / 2, 0.35, 0.22, z1 - z0)
        wd.cbox(x1, y, (z0 + z1) / 2, 0.35, 0.22, z1 - z0)


def annex_cube(x0, y0, x1, y1, h, floors=5):
    """front-left annex: crisp glass cube, thin white mullions, timber ground floor, blue glass lid."""
    gf = 5.0
    core.box(x0 + 1.2, y0 + 1.2, 0.15, x1 - 1.2, y1 - 1.2, gf, skip=('bottom', 'top'))
    louvres(x0 + 0.5, y0 + 0.5, x1 - 0.5, y1 - 0.5, 0.2, gf)
    fr.box(x0, y0, gf, x1, y1, gf + 0.5)
    ag.box(x0 + 0.25, y0 + 0.25, gf + 0.5, x1 - 0.25, y1 - 0.25, h, skip=('bottom', 'top'))
    fh = (h - gf - 0.5) / floors
    for k in range(1, floors):
        z = gf + 0.5 + k * fh
        asl.box(x0 + 0.6, y0 + 0.6, z - 0.3, x1 - 0.6, y1 - 0.6, z)
        fr.box(x0, y0, z - 0.16, x1, y0 + 0.3, z + 0.16)
        fr.box(x0, y1 - 0.3, z - 0.16, x1, y1, z + 0.16)
        fr.box(x0, y0, z - 0.16, x0 + 0.3, y1, z + 0.16)
        fr.box(x1 - 0.3, y0, z - 0.16, x1, y1, z + 0.16)
    nx_, ny_ = int((x1 - x0) / 1.55), int((y1 - y0) / 1.55)
    for i in range(nx_ + 1):
        x = x0 + i * (x1 - x0) / nx_
        fr.cbox(x, y0 + 0.12, (gf + h) / 2, 0.1, 0.28, h - gf)
        fr.cbox(x, y1 - 0.12, (gf + h) / 2, 0.1, 0.28, h - gf)
    for i in range(ny_ + 1):
        y = y0 + i * (y1 - y0) / ny_
        fr.cbox(x0 + 0.12, y, (gf + h) / 2, 0.28, 0.1, h - gf)
        fr.cbox(x1 - 0.12, y, (gf + h) / 2, 0.28, 0.1, h - gf)
    for (x, y) in ((x0, y0), (x1, y0), (x1, y1), (x0, y1)):
        fr.cbox(x, y, (gf + h) / 2, 0.5, 0.5, h - gf)
    rg.box(x0, y0, h, x1, y1, h + 0.5, skip=('bottom',))
    cxm, cym = (x0 + x1) / 2, (y0 + y1) / 2
    fr.box(cxm - 6.5, cym - 6.5, h + 0.5, cxm + 6.5, cym + 6.5, h + 1.5, skip=('bottom',))
    sol.box(cxm - 5.0, cym - 5.0, h + 1.5, cxm + 5.0, cym + 5.0, h + 1.6, skip=('bottom',))


def annex_white(x0, y0, x1, y1, h, floors=6):
    """rear-left annex: white slab edges and fins over blue glass, white roof."""
    gf = 5.0
    core.box(x0 + 1.4, y0 + 1.4, 0.15, x1 - 1.4, y1 - 1.4, gf, skip=('bottom', 'top'))
    louvres(x0 + 0.8, y0 + 0.8, x1 - 0.8, y1 - 0.8, 0.2, gf)
    ag.box(x0 + 0.9, y0 + 0.9, gf, x1 - 0.9, y1 - 0.9, h, skip=('bottom', 'top'))
    fh = (h - gf) / floors
    for k in range(floors):
        fr.box(x0, y0, gf + k * fh - 0.5, x1, y1, gf + k * fh + 0.3)
    fr.box(x0, y0, h - 0.2, x1, y1, h + 0.9, skip=('bottom',))
    nx_, ny_ = int((x1 - x0) / 2.2), int((y1 - y0) / 2.2)
    for i in range(nx_ + 1):
        x = x0 + i * (x1 - x0) / nx_
        fr.cbox(x, y0 + 0.25, (gf + h) / 2, 0.2, 0.6, h - gf)
        fr.cbox(x, y1 - 0.25, (gf + h) / 2, 0.2, 0.6, h - gf)
    for i in range(ny_ + 1):
        y = y0 + i * (y1 - y0) / ny_
        fr.cbox(x0 + 0.25, y, (gf + h) / 2, 0.6, 0.2, h - gf)
        fr.cbox(x1 - 0.25, y, (gf + h) / 2, 0.6, 0.2, h - gf)
    cxm, cym = (x0 + x1) / 2, (y0 + y1) / 2
    fr.box(cxm - 6, cym + 2, h + 0.9, cxm + 6, cym + 12, h + 2.3, skip=('bottom',))
    sol.box(cxm - 4.6, cym + 3.4, h + 2.3, cxm + 4.6, cym + 10.6, h + 2.4, skip=('bottom',))
    sol.box(cxm - 5, cym - 2, h + 0.9, cxm + 5, cym + 0.5, h + 1.3, skip=('bottom',))


annex_cube(-63.5, -21.5, -32.5, 8.6, 27.4)
annex_white(-60.0, 13.0, -33.0, 55.0, 27.0)


def wedge_building(cx, cy, rot, L=35.0, W=19.0, H=17.0, z0=PLAZA_Z):
    """right wing: rotated bar, glazed toward the plaza, white on the other faces."""
    cs, sn = math.cos(rot), math.sin(rot)

    def P(u, v, z):
        return (cx + u * cs - v * sn, cy + u * sn + v * cs, z)
    hl, hw, gf = L / 2, W / 2, 4.2
    foot = [(-hl, -hw), (hl, -hw), (hl, hw), (-hl, hw)]
    p0 = [P(u, v, z0 + gf) for u, v in foot]
    p1 = [P(u, v, z0 + H) for u, v in foot]
    ag.face([p0[0], p0[1], p1[1], p1[0]])
    ag.face([p0[3], p0[0], p1[0], p1[3]])
    fr.face([p0[1], p0[2], p1[2], p1[1]])
    fr.face([p0[2], p0[3], p1[3], p1[2]])
    r0 = [P(u * 1.02, v * 1.05, z0 + H) for u, v in foot]
    r1 = [P(u * 1.02, v * 1.05, z0 + H + 1.2) for u, v in foot]
    for i in range(4):
        j = (i + 1) % 4
        fr.face([r0[i], r0[j], r1[j], r1[i]])
    fr.face(r1)
    fr.face(list(reversed(r0)))
    for k in range(2):
        sol.face([P(-9 + k * 9.5, -3.2, z0 + H + 1.25), P(-1 + k * 9.5, -3.2, z0 + H + 1.25), P(-1 + k * 9.5, 3.2, z0 + H + 1.25),
                  P(-9 + k * 9.5, 3.2, z0 + H + 1.25)])
    c0 = [P(u * 0.94, v * 0.9, z0) for u, v in foot]
    c1 = [P(u * 0.94, v * 0.9, z0 + gf) for u, v in foot]
    for i in range(4):
        j = (i + 1) % 4
        wd.face([c0[i], c0[j], c1[j], c1[i]])
    n = int(L / 1.0)
    for i in range(n + 1):
        a = P(-hl + i * L / n, -hw, 0)
        wd.cbox(a[0], a[1], z0 + gf / 2, 0.22, 0.35, gf, rot=rot)
    fl = [P(u, v, z0 + gf) for u, v in foot]
    fl2 = [P(u, v, z0 + gf + 0.45) for u, v in foot]
    for i in range(4):
        j = (i + 1) % 4
        fr.face([fl[i], fl[j], fl2[j], fl2[i]])
    n = int(L / 1.6)
    for i in range(n + 1):
        a = P(-hl + i * L / n, -hw - 0.05, 0)
        fr.cbox(a[0], a[1], z0 + (gf + H) / 2, 0.12, 0.2, H - gf, rot=rot)
    for zz in (gf + 4.2, gf + 8.4):
        a, b = P(-hl, -hw - 0.05, 0), P(hl, -hw - 0.05, 0)
        fr.face([(a[0], a[1], z0 + zz - 0.18), (b[0], b[1], z0 + zz - 0.18), (b[0], b[1], z0 + zz + 0.18), (a[0], a[1], z0 + zz + 0.18)])
        asl.face([P(-hl + 0.4, -hw + 0.4, z0 + zz), P(hl - 0.4, -hw + 0.4, z0 + zz), P(hl - 0.4, hw - 0.4, z0 + zz), P(-hl + 0.4, hw - 0.4, z0 + zz)])


wedge_building(53.5, 24.5, math.radians(-50))
blib.OFFSET[:] = (0.0, 0.0, 0.0)

# hotspot anchors & helpers (tower-local; exported as glTF nodes)
blib.empty('HS_IOT', (L_X0 + 0.6, L_Y0 - 0.2, B + 29.0))
blib.empty('HS_DT', (3.0, LOB_Y0 - 0.3, B + 11.0))
blib.empty('HS_AI', (18.8, 23.9, B + 29.0))
blib.empty('HS_DT_STREET', (4.0, LOB_Y0 - 0.6, B + 4.4))
blib.empty('TOWER_CENTER', (0.0, 44.0, B + 45.0))
