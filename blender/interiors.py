# Executed inside build_campus.py's namespace (exec) – lobby, tower floors, office floor, devices.
# Blender coords: X east, Y north, Z up. Uses: B, L_X0, L_X1, L_Y0, T_Y0, T_Y1, LOB_Y0, LOB_Y1, Z_LOBBY,
# Z_SPLIT, Z_TOP, U_X0, U_X1, batch, mat, blib, rnd, math

# ---------------------------------------------------------------------------
# materials
# ---------------------------------------------------------------------------
MI = dict(
    lobby_wall=mat('lobby_wall', '#d9dadb', 0.55),
    lobby_floor=mat('lobby_floor', '#d4d5d6', 0.12),
    lobby_ceiling=mat('lobby_ceiling', '#e4e5e6', 0.8),
    ceiling_slot=mat('ceiling_slot', '#2b2e31', 0.6),
    column_dark=mat('column_dark', '#727a82', 0.35, 0.3),
    led=mat('led', '#ffffff', 0.5, 0, '#fff4e0', 6.0),
    led_cove=mat('led_cove', '#ffffff', 0.5, 0, '#fff7ea', 2.5),
    desk_white=mat('desk_white', '#f2f2f2', 0.25),
    plinth=mat('plinth_dark', '#1f2326', 0.6),
    gate=mat('gate_metal', '#7e858c', 0.3, 0.6),
    gate_glass=mat('gate_glass', '#c6d3dc', 0.05, 0.0, alpha=0.35),
    tv_bezel=mat('tv_bezel', '#1b2229', 0.35, 0.3),
    screen=mat('screen_campus', '#ffffff', 0.4, 0, '#ffffff', 1.0),
    backlight=mat('backlight', '#e9f1f8', 0.5, 0, '#e8f2fb', 1.6),
    slab=mat('tower_slab', '#dfe5ea', 0.8),
    slab_light=mat('tower_light', '#ffffff', 0.5, 0, '#ffffff', 3.0),
    o_floor=mat('office_floor', '#d9dbdc', 0.1),
    o_ceiling=mat('office_ceiling', '#eceded', 0.85),
    o_slab=mat('office_slab', '#f3f5f7', 0.7),
    o_mullion=mat('office_mullion', '#3a4147', 0.45, 0.5),
    o_glass=mat('office_glass', '#d8e4ec', 0.04, 0.0, alpha=0.18),
    o_frost=mat('office_frost', '#dde6ee', 0.3, 0.0, alpha=0.55),
    o_column=mat('office_column', '#f1f2f3', 0.6),
    o_desktop=mat('office_desktop', '#f4f5f6', 0.3),
    o_deskside=mat('office_deskside', '#9eb1c6', 0.45, 0.1),
    o_drawer=mat('office_drawer', '#e9ebed', 0.4),
    o_metal=mat('office_metal', '#c9ced3', 0.3, 0.8),
    o_chair=mat('office_chair', '#3b3f43', 0.55),
    o_chairframe=mat('office_chairframe', '#202325', 0.4, 0.5),
    o_monitor=mat('office_monitor', '#1a1c1e', 0.35, 0.3),
    o_monscreen=mat('office_screen', '#ffffff', 0.4, 0, '#ffffff', 0.9),
    o_keyboard=mat('office_keyboard', '#e6e8ea', 0.5),
    o_pot=mat('office_pot', '#f2f2ef', 0.5),
    o_leaf=mat('office_leaf', '#3f7a3a', 0.8),
    o_sofa=mat('office_sofa', '#4a5560', 0.85),
    o_partition=mat('office_partition', '#a9b4bd', 0.6),
    o_wall=mat('office_wall', '#c9cbcc', 0.7),
    o_tv=mat('office_tv', '#2a2f33', 0.3, 0.2),
    o_light=mat('office_light', '#ffffff', 0.5, 0, '#ffffff', 2.4),
    o_diffuser=mat('office_diffuser', '#d6d9db', 0.6),
    dev_white=mat('device_white', '#e9e5da', 0.45),
    dev_dark=mat('device_dark', '#2c2c2a', 0.5),
    dev_lens=mat('device_lens', '#bfc9c3', 0.15, 0.2),
)

# ---------------------------------------------------------------------------
# LOBBY  (inside podium: x L_X0..L_X1, y LOB_Y0..LOB_Y1, z B..B+Z_LOBBY)
# ---------------------------------------------------------------------------
LZ0, LZ1 = B + 0.02, B + Z_LOBBY - 0.2
lw = batch('lobby_wall', MI['lobby_wall'])
lf = batch('lobby_floor', MI['lobby_floor'])
lc = batch('lobby_ceiling', MI['lobby_ceiling'])
cs = batch('ceiling_slot', MI['ceiling_slot'])
cd = batch('column_dark', MI['column_dark'])
led = batch('led', MI['led'])
cove = batch('led_cove', MI['led_cove'])

lf.box(L_X0 + 0.05, LOB_Y0 + 0.05, B - 0.2, L_X1 - 0.05, LOB_Y1, B + 0.02, skip=('bottom',))
lc.face([(L_X0, LOB_Y0, LZ1), (L_X0, LOB_Y1, LZ1), (L_X1, LOB_Y1, LZ1), (L_X1, LOB_Y0, LZ1)])
WALL_Y = LOB_Y1 - 0.3
COL_X0, COL_X1 = -0.3, 2.53          # dark pier + narrow glazed slot in the back wall (measured from the reference frame)
PIER_X1 = 1.34
lw.box(L_X0, WALL_Y, LZ0, COL_X0, LOB_Y1, LZ1 - 0.6, skip=('bottom', 'top'))
lw.box(COL_X1, WALL_Y, LZ0, L_X1, LOB_Y1, LZ1 - 0.6, skip=('bottom', 'top'))
lc.box(L_X0, WALL_Y + 0.35, LZ1 - 0.6, L_X1, LOB_Y1, LZ1, skip=('bottom',))
cove.box(L_X0, WALL_Y + 0.3, LZ1 - 0.62, L_X1, WALL_Y + 0.38, LZ1 - 0.55)
# deep dark jambs + header (reads as a grey column when seen obliquely)
cd.box(COL_X0, WALL_Y - 1.6, LZ0, PIER_X1, LOB_Y1 + 1.2, LZ1)
cd.box(COL_X1 - 0.1, WALL_Y - 0.3, LZ0, COL_X1, LOB_Y1 + 1.2, LZ1)
cd.box(PIER_X1, WALL_Y - 0.9, LZ1 - 1.6, COL_X1, LOB_Y1 + 1.2, LZ1)
# glass passage at the back of the portal showing the outside
bl = batch('backlight', MI['backlight'])
bl.face([(PIER_X1, LOB_Y1 + 1.2, LZ0), (COL_X1 - 0.1, LOB_Y1 + 1.2, LZ0), (COL_X1 - 0.1, LOB_Y1 + 1.2, LZ1 - 1.6),
         (PIER_X1, LOB_Y1 + 1.2, LZ1 - 1.6)], uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
lf.box(COL_X0, LOB_Y1 - 0.3, B - 0.2, COL_X1, LOB_Y1 + 1.2, B + 0.02, skip=('bottom',))
for x in (PIER_X1 + 0.05, COL_X1 - 0.15):
    batch('lobby_mullion', MI['tv_bezel']).box(x - 0.04, WALL_Y - 0.05, LZ0, x + 0.04, WALL_Y + 0.03, LZ1 - 1.6)


def led_seg(x0, z0, x1, z1, y, w=0.075):
    dx, dz = x1 - x0, z1 - z0
    L = math.hypot(dx, dz)
    nx, nz = -dz / L * w / 2, dx / L * w / 2
    led.face([(x0 - nx, y, z0 - nz), (x1 - nx, y, z1 - nz), (x1 + nx, y, z1 + nz), (x0 + nx, y, z0 + nz)])


yL = WALL_Y - 0.012
TOPW = LZ1 - 0.65
# two light lines forming a wide V around the pier (unprojected from the reference frame)
led_seg(-7.9, TOPW, -1.43, LZ0 + 0.12, yL)
led_seg(4.02, LZ0 + 0.12, 10.6, TOPW, yL)
# base strips
led.box(L_X0, WALL_Y - 0.06, LZ0, COL_X0, WALL_Y, LZ0 + 0.05)
led.box(COL_X1, WALL_Y - 0.06, LZ0, L_X1, WALL_Y, LZ0 + 0.05)

# ceiling slots (dark linear lines, radiating)
for (a, b) in (((1.8, WALL_Y), (L_X0 + 1.0, LOB_Y0 + 1.0)), ((1.8, WALL_Y), (L_X1 - 1.0, LOB_Y0 + 1.0)),
               ((-6.0, WALL_Y), (-9.0, LOB_Y0 + 0.5)), ((10.0, WALL_Y), (13.0, LOB_Y0 + 0.5)),
               ((L_X0 + 0.5, WALL_Y - 2.0), (L_X1 - 0.5, WALL_Y - 2.0))):
    cs.quad_strip(a, b, 0.09, LZ1 - 0.01)
# flip the slot faces downward
_csF = cs.F[-5:]
for f in _csF:
    f.reverse()

# TV screen with backlit campus digital twin
tvb = batch('tv_bezel', MI['tv_bezel'])
SX0, SX1, SZ0, SZ1 = 7.16, 14.08, B + 1.5, B + 5.15
tvb.box(SX0 - 0.12, WALL_Y - 0.12, SZ0 - 0.12, SX1 + 0.12, WALL_Y - 0.01, SZ1 + 0.12)
scr = batch('screen_campus', MI['screen'])
scr.face([(SX0, WALL_Y - 0.125, SZ0), (SX1, WALL_Y - 0.125, SZ0), (SX1, WALL_Y - 0.125, SZ1), (SX0, WALL_Y - 0.125, SZ1)],
         uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])

# reception desk: long white bench with rounded ends on a dark recessed plinth
dw = batch('desk_white', MI['desk_white'])
pl = batch('plinth_dark', MI['plinth'])
DX0, DX1, DY0, DY1 = 6.1, 14.5, WALL_Y - 2.6, WALL_Y - 1.1
H_D = 1.15
R = (DY1 - DY0) / 2
poly = []
for i in range(13):
    a = math.pi / 2 + math.pi * i / 12
    poly.append((DX0 + R + R * math.cos(a), (DY0 + DY1) / 2 + R * math.sin(a)))
for i in range(13):
    a = -math.pi / 2 + math.pi * i / 12
    poly.append((DX1 - R + R * math.cos(a), (DY0 + DY1) / 2 + R * math.sin(a)))
poly = list(reversed(poly))
# ensure CCW
area = sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly)))
if area < 0:
    poly = list(reversed(poly))
dw.prism(poly, LZ0 + 0.18, LZ0 + H_D, top=True, bottom=True)
inset = [(DX0 + 0.5, DY0 + 0.25), (DX1 - 0.5, DY0 + 0.25), (DX1 - 0.5, DY1 - 0.25), (DX0 + 0.5, DY1 - 0.25)]
pl.prism(inset, LZ0, LZ0 + 0.18, top=False)
# turnstile gates in front of the column
gm = batch('gate_metal', MI['gate'])
gg = batch('gate_glass', MI['gate_glass'])
for i, x in enumerate((-1.1, 0.0, 1.1, 2.2)):
    gm.box(x - 0.13, WALL_Y - 2.75, LZ0, x + 0.13, WALL_Y - 1.75, LZ0 + 1.05)
    if i < 3:
        gg.face([(x + 0.13, WALL_Y - 2.3, LZ0 + 0.35), (x + 0.5, WALL_Y - 2.3, LZ0 + 0.35), (x + 0.5, WALL_Y - 2.3, LZ0 + 1.0),
                 (x + 0.13, WALL_Y - 2.3, LZ0 + 1.0)])
# a pair of small planters by the glass
for (x, y) in ((L_X1 - 0.8, LOB_Y0 + 1.2), (L_X0 + 0.8, LOB_Y0 + 1.2)):
    batch('lobby_pot', MI['o_pot']).cylinder(x, y, LZ0, LZ0 + 0.55, 0.28, n=14)

# ---------------------------------------------------------------------------
# generic tower floors (seen through the curtain wall)
# ---------------------------------------------------------------------------
OFFICE_LEVEL = 5
FZ = B + Z_LOBBY + 4.0 * OFFICE_LEVEL          # office floor top
slab = batch('tower_slab', MI['slab'])
tl = batch('tower_light', MI['slab_light'])


slab_o = batch('tower_slab_office', MI['slab'])
tl_o = batch('tower_light_office', MI['slab_light'])


def floor_slab(x0, y0, x1, y1, z, sb=None, lb=None):
    sb = sb or slab
    lb = lb or tl
    sb.box(x0, y0, z - 0.45, x1, y1, z)
    # rows of ceiling luminaires under the slab
    for yy in [y0 + 2.5 + k * 3.2 for k in range(int((y1 - y0 - 3) / 3.2) + 1)]:
        for xx in [x0 + 2 + k * 3.6 for k in range(int((x1 - x0 - 3) / 3.6) + 1)]:
            lb.box(xx, yy, z - 0.5, xx + 1.4, yy + 0.18, z - 0.45)


k = 0
z = B + Z_LOBBY + 4.0
while z < B + Z_SPLIT - 1.0:
    if abs(z - FZ) < 0.5 or abs(z - (FZ + 4.0)) < 0.5:
        floor_slab(L_X0 + 0.5, L_Y0 + 0.5, L_X1 - 0.5, T_Y1 - 0.5, z, slab_o, tl_o)
    else:
        floor_slab(L_X0 + 0.5, L_Y0 + 0.5, L_X1 - 0.5, T_Y1 - 0.5, z)
    z += 4.0
z = B + Z_SPLIT_R + 3.0
while z < B + Z_TOP - 1.0:
    floor_slab(U_X0 + 0.5, T_Y0 + 0.5, U_X1 - 0.5, T_Y1 - 0.5, z)
    z += 4.0

# ---------------------------------------------------------------------------
# OFFICE FLOOR (IOT / AI)   x L_X0..L_X1 (-12..16), y L_Y0..T_Y1 (28..58)
# ---------------------------------------------------------------------------
OX0, OX1, OY0, OY1 = L_X0, L_X1, L_Y0, T_Y1
CH = 3.55                                   # clear ceiling height
of = batch('office_floor', MI['o_floor'])
oc = batch('office_ceiling', MI['o_ceiling'])
osl = batch('office_slab', MI['o_slab'])
om = batch('office_mullion', MI['o_mullion'])
og = batch('office_glass', MI['o_glass'])
ofr = batch('office_frost', MI['o_frost'])
ocol = batch('office_column', MI['o_column'])
olt = batch('office_light', MI['o_light'])
odf = batch('office_diffuser', MI['o_diffuser'])

# floor slab with a protruding white ledge (seen in the cut-away view)
osl.box(OX0 - 1.1, OY0 - 1.1, FZ - 0.75, OX1 + 0.4, OY1 + 0.4, FZ - 0.02)
of.face([(OX0, OY0, FZ), (OX1, OY0, FZ), (OX1, OY1, FZ), (OX0, OY1, FZ)])
# ceiling slab
osl.box(OX0 - 0.5, OY0 - 0.5, FZ + CH + 0.02, OX1 + 0.3, OY1 + 0.3, FZ + CH + 0.65)
oc.face([(OX0, OY0, FZ + CH), (OX0, OY1, FZ + CH), (OX1, OY1, FZ + CH), (OX1, OY0, FZ + CH)])
# ceiling: linear light strips + diffusers + ceiling joints
for y in [OY0 + 3.0 + k * 4.0 for k in range(7)]:
    for x0 in (OX0 + 1.5, OX0 + 10.5, OX0 + 19.5):
        olt.box(x0, y, FZ + CH - 0.03, x0 + 6.5, y + 0.12, FZ + CH)
for (x, y) in ((11.0, 46.0), (11.5, 34.0), (-4, 40), (2, 52), (-8, 47)):
    odf.box(x - 0.7, y - 0.35, FZ + CH - 0.06, x + 0.7, y + 0.35, FZ + CH)
for x in [OX0 + k * 2.4 for k in range(1, 12)]:
    odf.box(x - 0.01, OY0, FZ + CH - 0.005, x + 0.01, OY1, FZ + CH)

# curtain wall: big panes with dark mullions on all four sides
def curtain(a, b, panes):
    ax, ay = a
    bx, by = b
    og.face([(ax, ay, FZ), (bx, by, FZ), (bx, by, FZ + CH), (ax, ay, FZ + CH)])
    og.face([(bx, by, FZ), (ax, ay, FZ), (ax, ay, FZ + CH), (bx, by, FZ + CH)])
    for i in range(panes + 1):
        t = i / panes
        x = ax + (bx - ax) * t
        y = ay + (by - ay) * t
        om.cbox(x, y, FZ + CH / 2, 0.14, 0.14, CH)
    for zz in (FZ + 0.06, FZ + CH - 0.06):
        if ax == bx:
            om.box(ax - 0.07, min(ay, by), zz - 0.06, ax + 0.07, max(ay, by), zz + 0.06)
        else:
            om.box(min(ax, bx), ay - 0.07, zz - 0.06, max(ax, bx), ay + 0.07, zz + 0.06)


curtain((OX0, OY0), (OX1, OY0), 6)
curtain((OX0, OY1), (OX0, OY0), 6)
# east facade: tall panes with deep mullions (reads as fins from inside the corridor)
og.face([(OX1, OY0, FZ), (OX1, OY1, FZ), (OX1, OY1, FZ + CH), (OX1, OY0, FZ + CH)])
og.face([(OX1, OY1, FZ), (OX1, OY0, FZ), (OX1, OY0, FZ + CH), (OX1, OY1, FZ + CH)])
for i in range(13):
    y = OY0 + i * (OY1 - OY0) / 12
    om.box(OX1 - 0.14, y - 0.07, FZ, OX1, y + 0.07, FZ + CH)
for zz in (FZ + 0.06, FZ + CH - 0.06):
    om.box(OX1 - 0.12, OY0, zz - 0.06, OX1 + 0.02, OY1, zz + 0.06)
# north end: solid wall with a lighter dado band
mw0 = batch('office_wall', MI['o_wall'])
mw0.box(OX0, OY1 - 0.3, FZ, OX1, OY1, FZ + CH)
batch('office_band', mat('office_band', '#8d969d', 0.6)).box(OX0, OY1 - 0.32, FZ + 2.35, OX1, OY1 - 0.29, FZ + 2.6)

# structural columns (two lines: one between desk banks, one bordering the east corridor)
COLS = [(x, y) for x in (-1.2, 9.4) for y in (34.0, 42.8, 51.6)]     # east line 6.6 m from the glass, as in the reference aisle
for (x, y) in COLS:
    ocol.box(x - 0.45, y - 0.45, FZ, x + 0.45, y + 0.45, FZ + CH)
    batch('office_switch', MI['o_drawer']).box(x - 0.47, y - 0.08, FZ + 1.3, x - 0.45, y + 0.08, FZ + 1.45)
# edge gateway box + fire alarm on the corridor column
batch('office_gateway', MI['dev_white']).box(9.85, 42.6, FZ + 1.55, 9.95, 43.0, FZ + 1.85)
batch('office_firebtn', mat('fire_red', '#c8473b', 0.5)).box(9.85, 42.7, FZ + 1.15, 9.92, 42.9, FZ + 1.3)

# --- workstation templates -------------------------------------------------
dt = batch('office_desktop', MI['o_desktop'])
dsd = batch('office_deskside', MI['o_deskside'])
dd = batch('office_drawer', MI['o_drawer'])
dmet = batch('office_metal', MI['o_metal'])
ch_ = batch('office_chair', MI['o_chair'])
chf = batch('office_chairframe', MI['o_chairframe'])
mon = batch('office_monitor', MI['o_monitor'])
msc = batch('office_screen', MI['o_monscreen'])
kb = batch('office_keyboard', MI['o_keyboard'])
ptn = batch('office_partition', MI['o_partition'])

monitor_spots = []


def rot2(px, py, cx, cy, a):
    c, s = math.cos(a), math.sin(a)
    return (cx + px * c - py * s, cy + px * s + py * c)


def chair(cx, cy, facing):
    """facing: angle (rad) the sitter looks toward (0 = +y)."""
    a = facing
    z = FZ

    def P(px, py):
        return rot2(px, py, cx, cy, a)
    # 5-star base
    for k in range(5):
        ang = k * 2 * math.pi / 5
        ex, ey = rot2(0, 0.33, cx, cy, ang)
        chf.quad_strip((cx, cy), (ex, ey), 0.05, z + 0.08)
        chf.cbox(ex, ey, z + 0.04, 0.06, 0.06, 0.08)
    chf.cylinder(cx, cy, z + 0.08, z + 0.45, 0.025, n=8)
    # seat
    s = [P(-0.26, -0.24), P(0.26, -0.24), P(0.26, 0.24), P(-0.26, 0.24)]
    ch_.prism(s, z + 0.45, z + 0.53, bottom=True)
    # back (slightly reclined)
    b0 = P(-0.23, -0.27)
    b1 = P(0.23, -0.27)
    b2 = P(0.23, -0.33)
    b3 = P(-0.23, -0.33)
    zb0, zb1 = z + 0.58, z + 1.08
    lean = rot2(0, -0.08, 0, 0, a)
    for (p, q) in ((b0, b1), (b1, b2), (b2, b3), (b3, b0)):
        ch_.face([(p[0], p[1], zb0), (q[0], q[1], zb0), (q[0] + lean[0], q[1] + lean[1], zb1), (p[0] + lean[0], p[1] + lean[1], zb1)])
    ch_.face([(b0[0] + lean[0], b0[1] + lean[1], zb1), (b1[0] + lean[0], b1[1] + lean[1], zb1),
              (b2[0] + lean[0], b2[1] + lean[1], zb1), (b3[0] + lean[0], b3[1] + lean[1], zb1)])
    m = P(0, -0.3)
    chf.box(m[0] - 0.03, m[1] - 0.03, z + 0.47, m[0] + 0.03, m[1] + 0.03, z + 0.62)
    # arm rests
    for sx in (-0.29, 0.29):
        p0 = P(sx, -0.15)
        p1 = P(sx, 0.18)
        chf.cbox(p0[0], p0[1], z + 0.6, 0.03, 0.03, 0.18)
        chf.quad_strip(p0, p1, 0.05, z + 0.7)


def workstation(cx, cy, facing, with_chair=True, idx=0):
    """desk centred at (cx,cy); user faces `facing` (0=+y)."""
    a = facing

    def P(px, py):
        return rot2(px, py, cx, cy, a)
    W, D, H = 1.5, 0.75, 0.74
    top = [P(-W / 2, -D / 2), P(W / 2, -D / 2), P(W / 2, D / 2), P(-W / 2, D / 2)]
    dt.prism(top, FZ + H - 0.03, FZ + H, bottom=True)
    # blue-grey side panels (panel legs)
    for sx in (-W / 2 + 0.03, W / 2 - 0.03):
        q = [P(sx - 0.025, -D / 2 + 0.04), P(sx + 0.025, -D / 2 + 0.04), P(sx + 0.025, D / 2 - 0.04), P(sx - 0.025, D / 2 - 0.04)]
        dsd.prism(q, FZ, FZ + H - 0.03)
    # modesty panel
    q = [P(-W / 2 + 0.05, D / 2 - 0.08), P(W / 2 - 0.05, D / 2 - 0.08), P(W / 2 - 0.05, D / 2 - 0.05), P(-W / 2 + 0.05, D / 2 - 0.05)]
    dsd.prism(q, FZ + 0.25, FZ + H - 0.03)
    # drawer pedestal
    q = [P(W / 2 - 0.5, -D / 2 + 0.08), P(W / 2 - 0.08, -D / 2 + 0.08), P(W / 2 - 0.08, D / 2 - 0.12), P(W / 2 - 0.5, D / 2 - 0.12)]
    dd.prism(q, FZ + 0.03, FZ + 0.6)
    for zz in (0.22, 0.42):
        h0 = P(W / 2 - 0.36, -D / 2 + 0.075)
        h1 = P(W / 2 - 0.22, -D / 2 + 0.075)
        dmet.quad_strip(h0, h1, 0.015, FZ + zz)
    # low privacy partition at the back edge
    q = [P(-W / 2, D / 2 - 0.02), P(W / 2, D / 2 - 0.02), P(W / 2, D / 2 + 0.02), P(-W / 2, D / 2 + 0.02)]
    ptn.prism(q, FZ + H, FZ + H + 0.38)
    # monitor
    mz = FZ + H
    st = P(0, D / 2 - 0.2)
    mon.box(st[0] - 0.1, st[1] - 0.08, mz, st[0] + 0.1, st[1] + 0.08, mz + 0.015)
    mon.cbox(st[0], st[1], mz + 0.18, 0.04, 0.04, 0.34) if abs(math.sin(a)) < 0.5 else mon.cbox(st[0], st[1], mz + 0.18, 0.04, 0.04, 0.34)
    c = P(0, D / 2 - 0.24)
    hw, z0, z1 = 0.31, mz + 0.16, mz + 0.53
    l0 = P(-hw, D / 2 - 0.24)
    r0 = P(hw, D / 2 - 0.24)
    l1 = P(-hw, D / 2 - 0.20)
    r1 = P(hw, D / 2 - 0.20)
    mon.face([(l1[0], l1[1], z0), (r1[0], r1[1], z0), (r1[0], r1[1], z1), (l1[0], l1[1], z1)])
    mon.face([(r1[0], r1[1], z0), (l1[0], l1[1], z0), (l0[0], l0[1], z0), (r0[0], r0[1], z0)])
    mon.face([(l0[0], l0[1], z1), (r0[0], r0[1], z1), (r1[0], r1[1], z1), (l1[0], l1[1], z1)])
    mon.face([(l0[0], l0[1], z0), (l1[0], l1[1], z0), (l1[0], l1[1], z1), (l0[0], l0[1], z1)])
    mon.face([(r1[0], r1[1], z0), (r0[0], r0[1], z0), (r0[0], r0[1], z1), (r1[0], r1[1], z1)])
    # bezel + screen (screen faces the user, i.e. -facing direction)
    e = 0.02
    s0 = P(-hw + e, D / 2 - 0.245)
    s1 = P(hw - e, D / 2 - 0.245)
    mon.face([(r0[0], r0[1], z0), (l0[0], l0[1], z0), (l0[0], l0[1], z1), (r0[0], r0[1], z1)])
    msc.face([(s0[0], s0[1], z0 + e), (s1[0], s1[1], z0 + e), (s1[0], s1[1], z1 - e), (s0[0], s0[1], z1 - e)],
             uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
    # keyboard + mouse
    k0 = P(-0.22, -0.05)
    k1 = P(0.22, -0.05)
    kb.quad_strip(k0, k1, 0.14, mz + 0.012)
    m = P(0.34, -0.05)
    kb.cbox(m[0], m[1], mz + 0.015, 0.06, 0.06, 0.03, rot=a)
    if with_chair:
        cpos = P(0.05, -D / 2 - 0.42)
        chair(cpos[0], cpos[1], a + rnd.uniform(-0.25, 0.25))


# rows of desks running east-west; users face north so monitors face the south (camera side)
ROW_Y = (30.4, 34.9, 39.4, 43.9, 48.4)
for ry in ROW_Y:
    for i in range(11):
        x = 7.6 - i * 1.55
        if any(abs(x - cx_) < 1.0 and abs(ry - cy_) < 1.2 for (cx_, cy_) in COLS):
            continue
        if x < -5.0 and ry < 36.0:
            continue  # meeting room in the south-west corner
        workstation(x, ry, 0.0)

# lounge at the west end of the corridor
sofa = batch('office_sofa', MI['o_sofa'])


def armchair(cx, cy, a):
    def P(px, py):
        return rot2(px, py, cx, cy, a)
    base = [P(-0.45, -0.4), P(0.45, -0.4), P(0.45, 0.4), P(-0.45, 0.4)]
    sofa.prism(base, FZ, FZ + 0.42, bottom=False)
    back = [P(-0.45, 0.25), P(0.45, 0.25), P(0.45, 0.42), P(-0.45, 0.42)]
    sofa.prism(back, FZ + 0.42, FZ + 0.82)
    for sx in (-0.45, 0.33):
        arm = [P(sx, -0.4), P(sx + 0.12, -0.4), P(sx + 0.12, 0.42), P(sx, 0.42)]
        sofa.prism(arm, FZ + 0.42, FZ + 0.62)


armchair(9.2, 55.4, math.radians(200))
armchair(12.2, 55.6, math.radians(160))
dt.cylinder(10.7, 54.4, FZ, FZ + 0.45, 0.5, n=20)
armchair(4.5, 55.8, math.radians(180))
armchair(2.6, 55.8, math.radians(180))
dt.cylinder(-1.5, 55.5, FZ, FZ + 0.72, 0.6, n=20)

# pendant lamps
for (x, y) in ((10.7, 54.4), (3.6, 52.5)):
    dmet.cylinder(x, y, FZ + 2.3, FZ + CH, 0.008, n=4, caps=False)
    v, f = blib.lathe([(0.0, 0.0), (0.28, 0.02), (0.3, 0.1), (0.18, 0.28), (0.02, 0.32)], 16)
    v = [(x + a_, y + b_, FZ + 2.05 + c_) for a_, b_, c_ in v]
    dmet.indexed(v, f)

# plants in tall white pots (north windows + corners)
pots = batch('office_pot', MI['o_pot'])
plant_spots = [(14.9, 30.4, 1.15), (15.0, 37.4, 1.0), (15.0, 45.6, 1.05), (15.0, 52.5, 1.1), (6.8, 56.6, 0.95), (13.2, 56.8, 0.9),
               (-11.0, 39.0, 0.85), (7.0, 29.4, 0.8)]
for (x, y, s) in plant_spots:
    pr = [(0.0, 0.0), (0.24 * s, 0.0), (0.3 * s, 0.62 * s), (0.27 * s, 0.62 * s), (0.25 * s, 0.56 * s), (0.0, 0.56 * s)]
    v, f = blib.lathe(pr, 16)
    v = [(x + a_, y + b_, FZ + c_) for a_, b_, c_ in v]
    pots.indexed(v, f)
    instances.setdefault('plant', []).append([round(x, 2), round(FZ + 0.56 * s, 2), round(-y, 2), round(s, 3),
                                              round(rnd.uniform(0, 6.28), 3), 0])

# glass meeting room (south-west) with TV
mw = batch('office_wall', MI['o_wall'])
tv = batch('office_tv', MI['o_tv'])
MR = (OX0, OY0, -5.6, 37.0)
for (a, b, n) in (((MR[2], MR[1]), (MR[2], MR[3]), 4), ((MR[2], MR[3]), (MR[0], MR[3]), 4)):
    ax, ay = a
    bx, by = b
    ofr.face([(ax, ay, FZ), (bx, by, FZ), (bx, by, FZ + CH), (ax, ay, FZ + CH)])
    ofr.face([(bx, by, FZ), (ax, ay, FZ), (ax, ay, FZ + CH), (bx, by, FZ + CH)])
    for i in range(n + 1):
        t = i / n
        om.cbox(ax + (bx - ax) * t, ay + (by - ay) * t, FZ + CH / 2, 0.06, 0.06, CH)
    om.quad_strip(a, b, 0.07, FZ + CH - 0.02)
    om.quad_strip(a, b, 0.07, FZ + 0.03)
    om.quad_strip(a, b, 0.07, FZ + 1.05)
mw.box(OX0 + 0.05, OY0 + 1.0, FZ, OX0 + 0.3, MR[3] - 0.5, FZ + CH)
tv.box(OX0 + 0.3, 30.8, FZ + 1.1, OX0 + 0.36, 34.2, FZ + 2.9)
dt.box(-10.2, 31.0, FZ + 0.72, -7.6, 34.6, FZ + 0.76)
dsd.box(-9.0, 32.6, FZ, -8.8, 33.0, FZ + 0.72)
for (x, y, a) in ((-10.6, 32.0, -math.pi / 2), (-10.6, 33.6, -math.pi / 2), (-7.2, 32.0, math.pi / 2), (-7.2, 33.6, math.pi / 2)):
    chair(x, y, a)
# back (north-west) glass room partitions seen behind the desks
for (a, b, n) in (((-4.0, 52.4), (-12.0, 52.4), 3), ((-4.0, 52.4), (-4.0, OY1 - 0.3), 1)):
    ax, ay = a
    bx, by = b
    ofr.face([(ax, ay, FZ), (bx, by, FZ), (bx, by, FZ + CH), (ax, ay, FZ + CH)])
    ofr.face([(bx, by, FZ), (ax, ay, FZ), (ax, ay, FZ + CH), (bx, by, FZ + CH)])
    for i in range(n + 1):
        t = i / n
        om.cbox(ax + (bx - ax) * t, ay + (by - ay) * t, FZ + CH / 2, 0.06, 0.06, CH)
    om.quad_strip(a, b, 0.07, FZ + CH - 0.02)

# --- IoT devices -----------------------------------------------------------
dw2 = batch('device_white', MI['dev_white'])
dk2 = batch('device_dark', MI['dev_dark'])
SENSOR = (10.6, 41.0, FZ + CH)
# multi-sensor dome: deep rounded puck hanging from the ceiling (as in the close-up of the reference)
DOME = [(0.0, 0.0), (0.205, 0.0), (0.208, -0.018), (0.203, -0.045), (0.188, -0.072), (0.165, -0.095), (0.133, -0.113),
        (0.095, -0.125), (0.05, -0.131), (0.0, -0.133)]


def dome_z(r):
    """underside height (negative, relative to the ceiling) of the dome at radius r"""
    for (r0, z0), (r1, z1) in zip(DOME[1:], DOME[2:]):
        if r1 <= r <= r0:
            t = (r - r1) / max(1e-6, r0 - r1)
            return z1 + (z0 - z1) * t
    return DOME[-1][1]


prof = [(r, -z) for r, z in reversed(DOME)]
v, f = blib.lathe([(r, z) for r, z in prof], 72)
v = [(SENSOR[0] + a_, SENSOR[1] + b_, SENSOR[2] - c_) for a_, b_, c_ in v]
batch('device_dome', MI['dev_white'], smooth=True).indexed(v, f)
# lens and holes (small dark discs on the underside)
lens = batch('device_lens', MI['dev_lens'])
lv, lfc = blib.uv_sphere(20, 10, 0.034)
lens.indexed([(SENSOR[0] + a_, SENSOR[1] + b_, SENSOR[2] + dome_z(0.0) + c_ * 0.55) for a_, b_, c_ in lv], lfc)
for k in range(8):
    ang = k * math.pi / 4 + 0.2
    rr = 0.07 if k % 2 == 0 else 0.1
    zz = SENSOR[2] + dome_z(rr)
    dk2.cylinder(SENSOR[0] + rr * math.cos(ang), SENSOR[1] + rr * math.sin(ang), zz - 0.0015, zz + 0.002, 0.0065, n=10)
zz = SENSOR[2] + dome_z(0.134)
dk2.cylinder(SENSOR[0] + 0.12, SENSOR[1] + 0.06, zz - 0.0015, zz + 0.004, 0.012, n=12)
for k in range(6):
    zz = SENSOR[2] + dome_z(0.153)
    dk2.cylinder(SENSOR[0] - 0.15 + (k % 3) * 0.012, SENSOR[1] - 0.03 + (k // 3) * 0.012, zz - 0.001, zz + 0.003, 0.0032, n=6)
# dark crescent window on the side of the dome (a band following the dome surface, faces the close-up camera)
def dome_r(zr):
    lo_, hi_ = 0.0, 0.208
    for _ in range(30):
        m = (lo_ + hi_) / 2
        if dome_z(m) < zr: lo_ = m
        else: hi_ = m
    return lo_ + 0.003


slot = batch('device_slot', mat('device_slot', '#6b6d6a', 0.6))
N_SL, N_RW, A0, AS, ZB = 28, 6, -0.75, 1.4, -0.122
for k in range(N_SL):
    a0, a1 = A0 + k * AS / N_SL, A0 + (k + 1) * AS / N_SL
    def top(a):
        return ZB + 0.012 + 0.038 * math.sin(math.pi * (a - A0) / AS)    # crescent: tallest in the middle
    for j in range(N_RW):
        def P(a, t):
            zr = ZB + (top(a) - ZB) * t
            rr = dome_r(zr)
            return (SENSOR[0] + rr * math.cos(a), SENSOR[1] + rr * math.sin(a), SENSOR[2] + zr)
        t0, t1 = j / N_RW, (j + 1) / N_RW
        slot.face([P(a0, t0), P(a1, t0), P(a1, t1), P(a0, t1)])

# security camera: bullet housing with sun shield on a ceiling pole near the south-east glass corner,
# lens pointing north-west into the room (seen in profile against the east glazing in the close-up)
CAM = (14.6, 29.6, FZ + CH)
LENS_A = math.radians(135.0)                 # lens direction azimuth (from +x, ccw) -> north-west
ldx, ldy = math.cos(LENS_A), math.sin(LENS_A)
dw2.box(CAM[0] - 0.17, CAM[1] - 0.17, CAM[2] - 0.03, CAM[0] + 0.17, CAM[1] + 0.17, CAM[2])
dw2.box(CAM[0] - 0.04, CAM[1] - 0.04, CAM[2] - 0.47, CAM[0] + 0.04, CAM[1] + 0.04, CAM[2] - 0.03)
hx, hy, hz = CAM[0] + 0.1 * ldx, CAM[1] + 0.1 * ldy, CAM[2] - 0.55
Mx = blib.mat_trs((hx, hy, hz), (0, math.radians(-12), LENS_A + math.pi))
hb = Batch('_tmp', MI['dev_white'])
hb.box(-0.3, -0.085, -0.07, 0.2, 0.085, 0.06)              # body (lens end at -x)
hb.box(-0.38, -0.105, 0.06, 0.24, 0.105, 0.085)            # sun shield, overhanging the lens
hb.box(-0.38, -0.105, -0.02, -0.36, -0.095, 0.06)          # shield side lips
hb.box(-0.38, 0.095, -0.02, -0.36, 0.105, 0.06)
hb.box(0.02, -0.03, -0.16, 0.08, 0.03, -0.07)              # knuckle under the body
hb.box(-0.02, -0.05, -0.2, 0.12, 0.05, -0.16)
for f_ in hb.F:
    dw2.face([tuple(Mx @ Vector(hb.V[i])) for i in f_])
lb_ = Batch('_tmp2', MI['dev_dark'])
lb_.box(-0.305, -0.065, -0.055, -0.295, 0.065, 0.045)
for f_ in lb_.F:
    dk2.face([tuple(Mx @ Vector(lb_.V[i])) for i in f_])

blib.empty('DEV_SENSOR', SENSOR)
blib.empty('DEV_CAMERA', (hx, hy, hz))
blib.empty('OFFICE_CENTER', ((OX0 + OX1) / 2, (OY0 + OY1) / 2, FZ + 1.6))
blib.empty('LOBBY_SCREEN', ((SX0 + SX1) / 2, WALL_Y - 0.13, (SZ0 + SZ1) / 2))
blib.empty('LOBBY_FLOOR', ((SX0 + SX1) / 2, WALL_Y - 3.0, B))
OFFICE_FZ = FZ

blib.empty('DEV_LIGHT', (2.0, 40.0, FZ + CH))
blib.empty('DEV_FRESHAIR', (11.0, 46.0, FZ + CH))
blib.empty('DEV_GATEWAY', (9.9, 43.2, FZ + 1.7))
blib.empty('DEV_FIRE', (9.9, 43.2, FZ + 1.22))
