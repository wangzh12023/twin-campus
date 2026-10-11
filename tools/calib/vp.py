"""Estimate vanishing points / camera intrinsics from a reference frame using LSD line segments.
usage: python tools/vp.py frame.jpg [debug.png]"""
import sys, numpy as np, cv2
img = cv2.imread(sys.argv[1]); H, W = img.shape[:2]
g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
lsd = cv2.createLineSegmentDetector(0)
segs = lsd.detect(g)[0].reshape(-1, 4)
L = np.hypot(segs[:, 2] - segs[:, 0], segs[:, 3] - segs[:, 1])
segs = segs[L > 28]
# mask UI: panel, watermark strips, bottom bar
def bad(s):
    for (x0, y0, x1, y1) in ((55, 135, 295, 355), (0, 420, 330, 512), (820, 420, 960, 512), (0, 0, 130, 40), (330, 455, 600, 512), (880, 0, 960, 40)):
        for (x, y) in ((s[0], s[1]), (s[2], s[3])):
            if x0 <= x <= x1 and y0 <= y <= y1: return True
    return False
segs = np.array([s for s in segs if not bad(s)])
ang = np.degrees(np.arctan2(segs[:, 3] - segs[:, 1], segs[:, 2] - segs[:, 0])) % 180
def homog(s):
    return np.cross([s[0], s[1], 1.0], [s[2], s[3], 1.0])
def fit_vp(S, iters=3000, tol=1.2):
    lines = np.array([homog(s) for s in S]); lines /= np.linalg.norm(lines[:, :2], axis=1)[:, None]
    mids = np.c_[(S[:, 0] + S[:, 2]) / 2, (S[:, 1] + S[:, 3]) / 2]
    lens = np.hypot(S[:, 2] - S[:, 0], S[:, 3] - S[:, 1])
    rng = np.random.default_rng(1); best = (0, None, None)
    for _ in range(iters):
        i, j = rng.choice(len(S), 2, replace=False)
        v = np.cross(lines[i], lines[j])
        if abs(v[2]) < 1e-9: continue
        v = v / v[2]
        # angular error between each segment and the direction to the VP
        d = v[:2] - mids; d /= np.linalg.norm(d, axis=1)[:, None]
        sd = np.c_[S[:, 2] - S[:, 0], S[:, 3] - S[:, 1]]; sd /= np.linalg.norm(sd, axis=1)[:, None]
        err = np.degrees(np.arcsin(np.clip(np.abs(d[:, 0] * sd[:, 1] - d[:, 1] * sd[:, 0]), 0, 1)))
        inl = err < tol
        score = lens[inl].sum()
        if score > best[0]: best = (score, v[:2], inl)
    # refine: least squares on inliers
    A = lines[best[2]]; w = lens[best[2]]
    u, s, vt = np.linalg.svd(A * w[:, None]); v = vt[-1]; v = v / v[2]
    return v[:2], best[2]
vert = segs[(ang > 68) & (ang < 112)]
vv, vin = fit_vp(vert)
print('vertical VP', np.round(vv, 1), 'inliers', vin.sum(), '/', len(vert))
rest = segs[~((ang > 68) & (ang < 112))]
ra = np.degrees(np.arctan2(rest[:, 3] - rest[:, 1], rest[:, 2] - rest[:, 0])) % 180
out = img.copy()
for s in vert[vin]: cv2.line(out, (int(s[0]), int(s[1])), (int(s[2]), int(s[3])), (0, 0, 255), 1)
res = {}
cols = [(0, 255, 0), (255, 0, 0), (0, 255, 255)]
remaining = rest.copy()
for k in range(3):
    if len(remaining) < 8: break
    v, inl = fit_vp(remaining, tol=1.0)
    print(f'horizontal VP {k}', np.round(v, 1), 'inliers', inl.sum(), '/', len(remaining), 'len', round(float(np.hypot(remaining[inl][:,2]-remaining[inl][:,0], remaining[inl][:,3]-remaining[inl][:,1]).sum())))
    for s in remaining[inl]: cv2.line(out, (int(s[0]), int(s[1])), (int(s[2]), int(s[3])), cols[k], 1)
    res[k] = v
    remaining = remaining[~inl]
if len(sys.argv) > 2: cv2.imwrite(sys.argv[2], out)
# intrinsics from vertical VP + horizon through the two strongest horizontal VPs
if len(res) >= 2:
    for (a, b) in ((0, 1), (0, 2), (1, 2)):
        if a not in res or b not in res: continue
        p, q = res[a], res[b]
        yh = (p[1] + q[1]) / 2
        f2 = (vv[1] - H / 2) * (H / 2 - yh)
        if f2 <= 0: continue
        f = np.sqrt(f2); th = np.degrees(np.arctan2(H / 2 - yh, f))
        fx2 = -(p[0] - W / 2) * (q[0] - W / 2) * np.cos(np.radians(th)) ** 2
        print(f'pair {a},{b}: horizon y={yh:.0f} (p.y={p[1]:.0f}, q.y={q[1]:.0f})  f={f:.0f}px  vfov={2*np.degrees(np.arctan(H/2/f)):.1f}  pitch={th:.1f}  f_from_orth={np.sqrt(fx2) if fx2>0 else float("nan"):.0f}'
              f'  az1={np.degrees(np.arctan((p[0]-W/2)*np.cos(np.radians(th))/f)):.1f} az2={np.degrees(np.arctan((q[0]-W/2)*np.cos(np.radians(th))/f)):.1f}')
