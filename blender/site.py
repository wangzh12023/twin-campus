# Site: ground, road grid, background city, campus block landscape, plaza, ring.
# Executed inside build_campus.py.  All coordinates here are in the frame measured from the
# reference video ("M" frame, metres); SITE_OFF moves them into the tower-local frame used
# by tower.py / interiors.py.
SITE_OFF = (-5.0, 12.5, 0.0)
PLAZA_Z = 3.2
RX = [-560, -440, -330, -210, -93.5, 97.5, 215, 335, 455, 575]      # N-S road centre lines
RY = [-510, -390, -270, -160, -50, 119.5, 235, 355, 475, 595]       # E-W road centre lines
RW = {-93.5: 10.0}
EXTENT = 640.0
WALK_W = 4.0
WATER_Z = 0.12


def rw(c):
    return RW.get(c, 13.0)


instances = {k: [] for k in ('tree', 'tree_tall', 'bush', 'car', 'tree_round')}


def _i(x, y, z):
    return [round(x + blib.OFFSET[0], 2), round(z, 2), round(-(y + blib.OFFSET[1]), 2)]


def add_tree(x, y, z, s=1.0, kind='tree'):
    instances[kind].append(_i(x, y, z) + [round(s, 3), round(rnd.uniform(0, 6.283), 3), round(rnd.uniform(0, 1), 3)])


def add_bush(x, y, z, s=0.55):
    instances['bush'].append(_i(x, y, z) + [round(s, 3), round(rnd.uniform(0, 6.283), 3), round(rnd.uniform(0, 1), 3)])


def add_car(x, y, rot, color):
    instances['car'].append(_i(x, y, 0.0) + [1.0, round(rot, 3), color])


blib.OFFSET[:] = SITE_OFF
gnd = batch('ground', M['ground'])
gnd.face([(-EXTENT, -EXTENT, -0.05), (EXTENT, -EXTENT, -0.05), (EXTENT, EXTENT, -0.05), (-EXTENT, EXTENT, -0.05)])
road = batch('road', M['road'])
mark = batch('marking', M['marking'])
walk = batch('sidewalk', M['sidewalk'])
water = batch('water', M['water'])
rim = batch('rim', M['white'])
grass = batch('grass', M['grass'])
bgw = batch('bg_white', M['bgwhite'])
pav = batch('paving', M['paving'])
stp = batch('steps', M['steps'])
wht = batch('white', M['white'])
plnt = batch('planter', M['planter'])

for x in RX:
    w = rw(x)
    road.face([(x - w / 2, -EXTENT, 0.0), (x + w / 2, -EXTENT, 0.0), (x + w / 2, EXTENT, 0.0), (x - w / 2, EXTENT, 0.0)])
for y in RY:
    w = rw(y)
    road.face([(-EXTENT, y - w / 2, 0.005), (EXTENT, y - w / 2, 0.005), (EXTENT, y + w / 2, 0.005), (-EXTENT, y + w / 2, 0.005)])


def dashed(a, b, z=0.03, dash=3.0, gap=5.0, w=0.2):
    ax, ay = a
    bx, by = b
    L = math.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / L, (by - ay) / L
    t = 0.0
    while t < L:
        t2 = min(t + dash, L)
        mark.quad_strip((ax + ux * t, ay + uy * t), (ax + ux * t2, ay + uy * t2), w, z)
        t += dash + gap


def near_road(v, centres):
    return any(abs(v - c) < rw(c) / 2 + 9 for c in centres)


NEAR_X = [x for x in RX if abs(x) < 340]
NEAR_Y = [y for y in RY if abs(y) < 360]
for x in NEAR_X:
    ys = sorted(RY)
    for i in range(len(ys) - 1):
        dashed((x, ys[i] + rw(ys[i]) / 2 + 8), (x, ys[i + 1] - rw(ys[i + 1]) / 2 - 8))
for y in NEAR_Y:
    xs = sorted(RX)
    for i in range(len(xs) - 1):
        dashed((xs[i] + rw(xs[i]) / 2 + 8, y), (xs[i + 1] - rw(xs[i + 1]) / 2 - 8, y))
# zebra crossings on the four arms of each nearby intersection
for x in (-93.5, 97.5, -210, 215):
    for y in (-50, 119.5, -160, 235):
        wx, wy = rw(x), rw(y)
        for sgn in (-1, 1):
            cy_ = y + sgn * (wy / 2 + 3.5)
            n = int((wx - 1.5) / 1.1)
            for i in range(n):
                mark.cbox(x - (wx - 1.5) / 2 + (i + 0.5) * (wx - 1.5) / n, cy_, 0.03, 0.55, 3.6, 0.02)
            cx_ = x + sgn * (wx / 2 + 3.5)
            n = int((wy - 1.5) / 1.1)
            for i in range(n):
                mark.cbox(cx_, y - (wy - 1.5) / 2 + (i + 0.5) * (wy - 1.5) / n, 0.03, 3.6, 0.55, 0.02)


def water_poly(poly, z=WATER_Z, rim_h=0.3, rim_w=0.5):
    area = sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly)))
    if area < 0:
        poly = list(reversed(poly))
    water.flat(poly, z)
    n = len(poly)
    for i in range(n):
        a = poly[i]
        b = poly[(i + 1) % n]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = dy / L * rim_w / 2, -dx / L * rim_w / 2
        p = [(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny), (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)]
        rim.prism(p, z - 0.25, z + rim_h, top=True)


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def tower_box(cx, cy, w, d, h, rot=0.0):
    bgw.box(cx - w / 2, cy - d / 2, 0.1, cx + w / 2, cy + d / 2, h, skip=('bottom',), rot=rot, pivot=(cx, cy))
    r = rnd.random()
    if r < 0.3 and h > 50:
        w2, d2 = w * rnd.uniform(0.5, 0.75), d * rnd.uniform(0.5, 0.75)
        bgw.box(cx - w2 / 2, cy - d2 / 2, h, cx + w2 / 2, cy + d2 / 2, h + rnd.uniform(3, 9), skip=('bottom',), rot=rot, pivot=(cx, cy))
    elif r < 0.5:
        for (a, b, c, d_) in ((-w / 2, -d / 2, w / 2, -d / 2 + 0.7), (-w / 2, d / 2 - 0.7, w / 2, d / 2)):
            bgw.box(cx + a, cy + b, h, cx + c, cy + d_, h + 1.3, skip=('bottom',), rot=rot, pivot=(cx, cy))


def tree_strip(x0, y0, x1, y1, rows=1, spacing=7.5, lawn=True, s=(0.85, 1.1), along=None):
    along_x = (x1 - x0) >= (y1 - y0) if along is None else along
    if lawn:
        grass.box(x0, y0, 0.1, x1, y1, 0.24, skip=('bottom',))
    if along_x:
        n = max(1, int((x1 - x0) / spacing))
        for r in range(rows):
            yy = y0 + (r + 0.5) * (y1 - y0) / rows
            for i in range(n):
                add_tree(x0 + (i + 0.5) * (x1 - x0) / n + rnd.uniform(-0.7, 0.7), yy + rnd.uniform(-0.5, 0.5), 0.24, rnd.uniform(*s))
    else:
        n = max(1, int((y1 - y0) / spacing))
        for r in range(rows):
            xx = x0 + (r + 0.5) * (x1 - x0) / rows
            for i in range(n):
                add_tree(xx + rnd.uniform(-0.5, 0.5), y0 + (i + 0.5) * (y1 - y0) / n + rnd.uniform(-0.7, 0.7), 0.24, rnd.uniform(*s))


def blocks():
    xs, ys = sorted(RX), sorted(RY)
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            yield (xs[i] + rw(xs[i]) / 2, ys[j] + rw(ys[j]) / 2, xs[i + 1] - rw(xs[i + 1]) / 2, ys[j + 1] - rw(ys[j + 1]) / 2)


def city_block(x0, y0, x1, y1, water_p=0.5, h_base=45, tall=False):
    ix0, iy0, ix1, iy1 = x0 + WALK_W, y0 + WALK_W, x1 - WALK_W, y1 - WALK_W
    if rnd.random() < water_p:
        cw = rnd.uniform(12, 22)
        side = rnd.choice('wesn')
        if side == 'w':
            water_poly(rect(ix0, iy0, ix0 + cw, iy1))
            ix0 += cw + 3
        elif side == 'e':
            water_poly(rect(ix1 - cw, iy0, ix1, iy1))
            ix1 -= cw + 3
        elif side == 's':
            water_poly(rect(ix0, iy0, ix1, iy0 + cw))
            iy0 += cw + 3
        else:
            water_poly(rect(ix0, iy1 - cw, ix1, iy1))
            iy1 -= cw + 3
    if rnd.random() < 0.45:
        if rnd.random() < 0.5:
            tree_strip(ix0, iy0, ix1, iy0 + 7)
            iy0 += 9
        else:
            tree_strip(ix0, iy0, ix0 + 7, iy1)
            ix0 += 9
    W_, H_ = ix1 - ix0, iy1 - iy0
    if W_ < 22 or H_ < 22:
        return
    nx, ny = max(1, int(W_ / 44)), max(1, int(H_ / 44))
    for i in range(nx):
        for j in range(ny):
            if rnd.random() < 0.15:
                continue
            cw, ch = W_ / nx, H_ / ny
            w = rnd.uniform(0.5, 0.78) * cw
            d = rnd.uniform(0.5, 0.78) * ch
            px = ix0 + (i + 0.5) * cw + rnd.uniform(-0.08, 0.08) * cw
            py = iy0 + (j + 0.5) * ch + rnd.uniform(-0.08, 0.08) * ch
            h = h_base + rnd.uniform(-12, 55) + (rnd.uniform(30, 110) if tall else 0)
            tower_box(px, py, w, d, max(16, h))


for (x0, y0, x1, y1) in blocks():
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    if x0 < 0 < x1 and y0 < 0 < y1:
        continue                                   # campus block
    walk.box(x0, y0, -0.05, x1, y1, 0.15, skip=('bottom',))
    ix0, iy0, ix1, iy1 = x0 + WALK_W, y0 + WALK_W, x1 - WALK_W, y1 - WALK_W
    if x1 < 0 and x0 > -215 and y0 < 0 < y1:
        # west of the campus: tree grove next to the road, towers behind
        tree_strip(x1 - 34, iy0 + 6, x1 - 5, iy1 - 8, rows=3, spacing=8.5, along=False)
        tower_box(x0 + 30, iy0 + 30, 34, 36, 78)
        tower_box(x0 + 34, iy1 - 34, 40, 34, 120)
        tower_box(x0 + 70, cy + 6, 22, 30, 52)
    elif x0 > 0 and x1 < 220 and y0 < 0 < y1:
        # east of the campus: two tree rows, water panels, towers at the back
        tree_strip(x0 + 4, iy0 + 2, x0 + 26, iy1 - 2, rows=2, spacing=9, along=False)
        for (a, b) in ((iy0 + 4, iy0 + 46), (iy0 + 52, iy0 + 86), (iy0 + 92, iy1 - 4)):
            water_poly(rect(x0 + 30, a, x0 + 62, b))
        tower_box(x1 - 26, iy0 + 36, 30, 34, 70)
        tower_box(x1 - 28, iy0 + 100, 28, 30, 105)
        tower_box(x1 - 24, iy1 - 14, 26, 20, 58)
    elif y1 < 0 and y0 > -165 and abs(cx) < 220:
        # south of the campus (foreground): large water basins with white kerbs
        water_poly(rect(ix0 + 2, iy0 + 2, ix1 - 2, iy1 - 3))
    elif y0 > 0 and y1 < 240 and abs(cx) < 220:
        # north: canal along the road, tall towers behind the HQ
        water_poly(rect(ix0, iy0, ix1, iy0 + 16))
        tree_strip(ix0, iy0 + 19, ix1, iy0 + 26, spacing=10, lawn=False)
        n = max(2, int((ix1 - ix0) / 46))
        for k in range(n):
            px = ix0 + (k + 0.5) * (ix1 - ix0) / n
            tower_box(px, iy0 + 52, 28, 26, rnd.uniform(110, 180))
            if rnd.random() < 0.7:
                tower_box(px + rnd.uniform(-6, 6), iy1 - 20, 30, 24, rnd.uniform(70, 150))
    else:
        d = math.hypot(cx, cy)
        city_block(x0, y0, x1, y1, water_p=0.55 if d < 420 else 0.2, h_base=50 if cy < 100 else 70, tall=cy > 120)

# street trees along the roads bounding the campus
for (x, sgn) in ((-93.5, -1), (97.5, 1)):
    xx = x + sgn * (rw(x) / 2 + 2.2)
    for y in range(-150, 230, 9):
        if not near_road(y, RY):
            add_tree(xx, y + rnd.uniform(-1, 1), 0.15, rnd.uniform(0.8, 1.0))
for (y, sgn) in ((-50, -1), (119.5, 1)):
    yy = y + sgn * (rw(y) / 2 + 2.2)
    for x in range(-200, 205, 9):
        if not near_road(x, RX):
            add_tree(x + rnd.uniform(-1, 1), yy, 0.15, rnd.uniform(0.8, 1.0))
for x in (-93.5, 97.5, 215, -210):
    for lane in (-1, 1):
        y = -320 + rnd.uniform(0, 30)
        while y < 330:
            if not near_road(y, RY):
                add_car(x + lane * rw(x) / 4, y, 0 if lane > 0 else math.pi, rnd.randrange(4))
            y += rnd.uniform(22, 60)
for y in (-50, 119.5, 235, -160):
    for lane in (-1, 1):
        x = -320 + rnd.uniform(0, 30)
        while x < 330:
            if not near_road(x, RX):
                add_car(x, y + lane * rw(y) / 4, -math.pi / 2 if lane > 0 else math.pi / 2, rnd.randrange(4))
            x += rnd.uniform(24, 70)

# ---------------------------------------------------------------------------
# campus block (between the four roads)
# ---------------------------------------------------------------------------
CX0, CX1, CY0, CY1 = -88.5, 91.0, -43.5, 113.0
walk.box(CX0, CY0, -0.05, CX1, CY1, 0.15, skip=('bottom',))
PZ = PLAZA_Z
PLAT = [(-31, -27), (37, -27), (37, -25), (66, -25), (68, 76), (-31, 76)]     # raised plaza platform
pav.prism(PLAT, 0.1, PZ, top=True)
batch('forecourt', M['paving']).box(-34, -43.5, 0.1, 42, -35, 0.2, skip=('bottom',))
# grand stair: 21 risers from the forecourt (y=-35) up to the plaza edge (y=-27)
N_ST = 21
SX0, SX1 = -29.0, 36.0
for i in range(N_ST):
    z1 = 0.2 + (i + 1) * (PZ - 0.2) / N_ST
    stp.box(SX0, -35 + i * 8.0 / N_ST, 0.1, SX1, -27 + 0.01, z1, skip=('bottom', 'back'))


def stringer(x, w=0.9, h=0.45, y0=-35.4, y1=-27.0, zb=0.1):
    """white cheek wall following the stair slope"""
    x0, x1, t0, t1 = x - w / 2, x + w / 2, 0.2 + h, PZ + h
    wht.face([(x1, y0, zb), (x1, y1, zb), (x1, y1, t1), (x1, y0, t0)])
    wht.face([(x0, y0, t0), (x0, y1, t1), (x0, y1, zb), (x0, y0, zb)])
    wht.face([(x0, y0, t0), (x1, y0, t0), (x1, y1, t1), (x0, y1, t1)])
    wht.face([(x0, y0, zb), (x1, y0, zb), (x1, y0, t0), (x0, y0, t0)])
    wht.face([(x0, y1, t1), (x1, y1, t1), (x1, y1, zb), (x0, y1, zb)])


for x in (SX0 - 0.5, 20.8, SX1 + 0.5):                    # centre stringer measured from the street frame
    stringer(x)
for x in (-32.5, 39.0):                                     # small fountains flanking the stair foot
    water_poly(rect(x - 1.6, -38.5, x + 1.6, -35.6), z=0.5, rim_h=0.25, rim_w=0.4)

# pools on the plaza with white kerbs, square planters with a tree
POOL_W = [(-24, -25), (-11, -25), (-11, -3), (-17, 5), (-24, 5)]
POOL_E = [(22, -25), (21, -17), (24, -3), (30, 4), (37, -3), (41, -10), (60, -26), (55, -32), (37.5, -32), (37.5, -25)]
for P_ in (POOL_W, POOL_E):
    water_poly(P_, z=PZ + 0.05, rim_h=0.22, rim_w=0.5)


def square_planter(x0, y0, x1, y1, h=1.15, n_bush=7, kind='tree_round', s=1.0):
    plnt.box(x0, y0, PZ - 0.2, x1, y1, PZ + h, skip=('bottom',))
    grass.box(x0 + 0.3, y0 + 0.3, PZ + h, x1 - 0.3, y1 - 0.3, PZ + h + 0.06, skip=('bottom',))
    cxm, cym = (x0 + x1) / 2, (y0 + y1) / 2
    add_tree(cxm, cym, PZ + h, s, kind)
    for k in range(n_bush):
        a, b = rnd.uniform(x0 + 0.9, x1 - 0.9), rnd.uniform(y0 + 0.9, y1 - 0.9)
        if abs(a - cxm) < 1.0 and abs(b - cym) < 1.0:
            continue
        add_bush(a, b, PZ + h, rnd.uniform(0.45, 0.62))


square_planter(-22, -16, -14, -6)
square_planter(23, -16, 31, -5)
for (x, y0, y1) in ((-9.5, -22, -10), (18.5, -22, -11)):      # low planters with a row of clipped bushes
    plnt.box(x - 0.55, y0, PZ, x + 0.55, y1, PZ + 0.4, skip=('bottom',))
    n = int((y1 - y0) / 1.25)
    for i in range(n):
        add_bush(x, y0 + 0.6 + i * (y1 - y0 - 1.2) / max(1, n - 1), PZ + 0.4, rnd.uniform(0.5, 0.6))
grass.prism([(25, 5), (33, 5), (30, 16)], PZ, PZ + 0.1)
grass.prism([(37, -3), (50, -5), (58, -21)], PZ, PZ + 0.1)
batch('monolith', mat('monolith', '#5f7fae', 0.5)).box(20.5, -1.2, PZ, 23.5, -0.4, PZ + 1.7)
for (x, y) in ((41, 11), (54, 6), (66, -14), (44, -20), (-27, -22)):     # tree pits
    grass.box(x - 1.6, y - 1.6, PZ, x + 1.6, y + 1.6, PZ + 0.08, skip=('bottom',))
    add_tree(x, y, PZ + 0.08, rnd.uniform(0.95, 1.1))
for (x, y) in ((-33, -39), (30, -40), (-4, -46)):
    add_tree(x, y, 0.2, 1.0)

# faceted pavilion roof between the annexes and the tower (pale blue hip + dark triangular light well)
pv = batch('pavilion', mat('pavilion', '#aebfd8', 0.7))
apex = (-22.0, 12.0, PZ + 3.2)
base = [(-31, -2), (-14.5, 0), (-14.5, 26), (-31, 26)]
for i in range(4):
    a, b = base[i], base[(i + 1) % 4]
    pv.face([(a[0], a[1], PZ), (b[0], b[1], PZ), apex])
batch('pavilion_dark', mat('pavilion_dark', '#17364a', 0.2)).face(
    [(-27.0, 21.0, PZ + 1.3), (-17.0, 11.5, PZ + 1.9), (-17.0, 24.5, PZ + 0.9)])

# ring sculpture: a broad polished ribbon standing on the plaza
RING_C = (2.0, -17.0)
RING_R = 7.3
loop = [(0.0, -0.62), (0.18, -0.62), (0.34, -0.5), (0.34, 0.5), (0.18, 0.62), (0.0, 0.62), (-0.03, 0.6), (-0.03, -0.6)]   # broad ribbon
seg = 144
rvs, rfs, ruv = [], [], []
for i in range(seg):
    a = 2 * math.pi * i / seg
    for k, (dr, ax_) in enumerate(loop):
        r_ = RING_R - 0.13 + dr
        rvs.append((r_ * math.cos(a), r_ * math.sin(a), ax_))
        ruv.append((i / seg, k / len(loop)))
nl = len(loop)
for i in range(seg):
    for k in range(nl):
        rfs.append([i * nl + k, ((i + 1) % seg) * nl + k, ((i + 1) % seg) * nl + (k + 1) % nl, i * nl + (k + 1) % nl])
ring_ob = blib.mesh_object('ring_sculpture', rvs, rfs, M['ring'], smooth=True, uvs=ruv)
ring_ob.rotation_euler = (math.pi / 2, 0, math.radians(-13))
ring_ob.location = (RING_C[0] + SITE_OFF[0], RING_C[1] + SITE_OFF[1], PZ + RING_R + 0.1)
for (ox, oy, s_) in ((1.6, -0.3, 0.95), (0.4, 0.5, 0.7), (2.6, 0.3, 0.6)):
    add_bush(RING_C[0] + ox, RING_C[1] + oy, PZ, s_)

# landscape strips: canal + trees on the east and north sides, lawn + water on the west
water_poly(rect(76, -28, 86, 88))
water_poly(rect(22, 78, 76, 88))
tree_strip(69, -24, 75, 74, spacing=7.5, along=False)
tree_strip(24, 91, 76, 102, rows=2, spacing=8.5)
tree_strip(-46, 60, -34, 102, rows=2, spacing=8.5, along=False)
water_poly(rect(-84, -33, -66, -8))
grass.box(-84, -6, 0.1, -66, 4, 0.24, skip=('bottom',))
for (x, y) in ((-70, -38), (-52, -38), (-40, -37), (-78, 30), (-78, 48), (-78, 66), (-20, 70), (10, 70), (50, 66), (-6, 104), (-70, 96)):
    add_tree(x, y, PZ if (-31 < x < 68 and -27 < y < 76) else 0.2, rnd.uniform(0.9, 1.1))

blib.OFFSET[:] = (0.0, 0.0, 0.0)
