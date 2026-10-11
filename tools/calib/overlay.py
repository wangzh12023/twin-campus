"""Draw wireframe boxes / polylines (Blender Z-up metres) over a reference frame with a given camera.
usage: python tools/overlay.py frame out.png cam.json shapes.json [scale]
cam.json: {"c":[x,y,z],"f":703,"pitch":28.3,"yaw":7.1}
shapes: [{"box":[x0,y0,x1,y1,z0,z1],"col":[b,g,r],"rot":deg,"name":""}, {"poly":[[x,y,z],...],"closed":true}]"""
import sys, json, numpy as np, cv2
img = cv2.imread(sys.argv[1]); H, W = img.shape[:2]
cam = json.load(open(sys.argv[3])); shapes = json.load(open(sys.argv[4]))
sc = int(sys.argv[5]) if len(sys.argv) > 5 else 2
img = cv2.resize(img, (W * sc, H * sc), interpolation=cv2.INTER_LANCZOS4)
c = np.array(cam['c'], float); f = cam['f']; th = np.radians(cam['pitch']); ph = np.radians(cam['yaw'])
fw = np.array([-np.sin(ph) * np.cos(th), np.cos(ph) * np.cos(th), -np.sin(th)])
rt = np.array([np.cos(ph), np.sin(ph), 0.0]); up = np.cross(rt, fw)
def P(p):
    v = np.array(p, float) - c; z = v @ fw
    if z < 1: return None
    return (int(round((W / 2 + f * (v @ rt) / z) * sc)), int(round((H / 2 - f * (v @ up) / z) * sc)))
def line(a, b, col):
    pa, pb = P(a), P(b)
    if pa and pb: cv2.line(img, pa, pb, col, 1, cv2.LINE_AA)
for s in shapes:
    col = tuple(s.get('col', [0, 0, 255]))
    if 'box' in s:
        x0, y0, x1, y1, z0, z1 = s['box']
        pts = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        if s.get('rot'):
            a = np.radians(s['rot']); cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            pts = [(cx + (x - cx) * np.cos(a) - (y - cy) * np.sin(a), cy + (x - cx) * np.sin(a) + (y - cy) * np.cos(a)) for x, y in pts]
        for i in range(4):
            a, b = pts[i], pts[(i + 1) % 4]
            line((*a, z0), (*b, z0), col); line((*a, z1), (*b, z1), col); line((*a, z0), (*a, z1), col)
        if s.get('name'):
            p = P((pts[0][0], pts[0][1], z1))
            if p: cv2.putText(img, s['name'], (p[0] + 3, p[1] - 3), cv2.FONT_HERSHEY_SIMPLEX, 0.4, col, 1)
    if 'poly' in s:
        pl = s['poly']; n = len(pl)
        for i in range(n if s.get('closed', True) else n - 1):
            line(pl[i], pl[(i + 1) % n], col)
cv2.imwrite(sys.argv[2], img)
