"""Fit camera (x,y,z,yaw,pitch,vfov) to point (u,v) and horizontal-line (v only) constraints.
usage: python tools/fit2.py spec.json   spec: {"pts":[[[x,y,z],[u,v]],...], "vonly":[[[x,y,z],v],...], "x0":[x,y,z,yawdeg,pitchdeg,fov]}
yaw: 0 = looking +Y (north), positive = towards -X (west). Blender Z-up."""
import sys, json, numpy as np
from scipy.optimize import least_squares
W, H = 960, 512
S = json.load(open(sys.argv[1]))
def basis(yaw, pitch):
    th, ph = np.radians(pitch), np.radians(yaw)
    fw = np.array([-np.sin(ph) * np.cos(th), np.cos(ph) * np.cos(th), np.sin(th)])
    rt = np.array([np.cos(ph), np.sin(ph), 0.0]); up = np.cross(rt, fw)
    return fw, rt, up
def proj(x, p):
    c = x[:3]; fw, rt, up = basis(x[3], x[4]); f = (H / 2) / np.tan(np.radians(x[5]) / 2)
    v = np.array(p, float) - c; z = v @ fw
    return np.array([W / 2 + f * (v @ rt) / z, H / 2 - f * (v @ up) / z])
def res(x):
    r = []
    for p, q in S['pts']: r.extend(proj(x, p) - q)
    for p, v in S.get('vonly', []): r.append(proj(x, p)[1] - v)
    for d, q, w in S.get('vp', []):            # vanishing point of world direction d at pixel q (weight w)
        c = x[:3]; fw, rt, up = basis(x[3], x[4]); f = (H / 2) / np.tan(np.radians(x[5]) / 2); d = np.array(d, float)
        z = d @ fw
        r.extend([w * (W / 2 + f * (d @ rt) / z - q[0]) / 10, w * (H / 2 - f * (d @ up) / z - q[1])])
    for (yy, zz), q in S.get('xline', []):     # world line along X at (y,z) passes through pixel q
        lo_, hi_ = -500.0, 500.0
        for _ in range(60):
            m = (lo_ + hi_) / 2
            if proj(x, (m, yy, zz))[0] < q[0]: lo_ = m
            else: hi_ = m
        r.append(proj(x, (lo_, yy, zz))[1] - q[1])
    for i, v, w in S.get('prior', []): r.append(w * (x[i] - v))
    return np.array(r)
x0 = np.array(S['x0'], float)
lo = [-np.inf] * 6; hi = [np.inf] * 6
lo[5], hi[5] = 15, 90
r = least_squares(res, x0, bounds=(lo, hi))
x = r.x
print('cam', np.round(x[:3], 2).tolist(), 'yaw', round(x[3], 2), 'pitch', round(x[4], 2), 'fov', round(x[5], 2), 'rms', round(float(np.sqrt(np.mean(r.fun ** 2))), 2))
fw, _, _ = basis(x[3], x[4]); t = x[:3] + fw * 60
print('target(60m)', np.round(t, 2).tolist())
for p, q in S['pts']: print('  ', p, q, np.round(proj(x, p), 1))
for p, v in S.get('vonly', []): print('  v', p, v, round(proj(x, p)[1], 1))
for p in S.get('probe', []): print('  probe', p, np.round(proj(x, p), 1))
