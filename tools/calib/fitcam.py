"""Fit a pinhole camera (pos, target, vfov) to model-point <-> reference-pixel correspondences.
Blender Z-up coords; image 960x512."""
import sys, json, numpy as np
from scipy.optimize import least_squares
W, H = 960, 512
def project(params, P):
    c = params[0:3]; t = params[3:6]; fov = params[6]
    f = (H / 2) / np.tan(np.radians(fov) / 2)
    fw = (t - c) / np.linalg.norm(t - c)
    rt = np.cross(fw, [0, 0, 1.0]); rt /= np.linalg.norm(rt)
    up = np.cross(rt, fw)
    out = []
    for p in P:
        v = np.array(p) - c
        z = v @ fw
        out.append((W / 2 + f * (v @ rt) / z, H / 2 - f * (v @ up) / z))
    return np.array(out)
corr = json.loads(sys.argv[1])
x0 = np.array(json.loads(sys.argv[2]))
P = [c[0] for c in corr]; Q = np.array([c[1] for c in corr])
def res(x):
    r = (project(x, P) - Q).ravel()
    # keep target at a fixed distance-ish (regularise the free slide along the view ray)
    return np.concatenate([r, [0.02 * (np.linalg.norm(x[3:6] - x0[3:6]))]])
fixfov = len(sys.argv) > 3
if fixfov:
    fov = x0[6]
    r = least_squares(lambda y: res(np.concatenate([y, [fov]])), x0[:6])
    x = np.concatenate([r.x, [fov]])
else:
    r = least_squares(res, x0)
    x = r.x
pr = project(x, P)
print('cam', np.round(x[0:3], 2).tolist(), 'tgt', np.round(x[3:6], 2).tolist(), 'fov', round(float(x[6]), 2))
for (p, q), e in zip(corr, pr):
    print(f"  {str(p):28s} ref {q}  got ({e[0]:6.1f},{e[1]:6.1f})  err {np.hypot(*(e - np.array(q))):5.1f}")
