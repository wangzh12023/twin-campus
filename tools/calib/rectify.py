"""Top-down rectification of the ground plane of a reference frame.
usage: python tools/rectify.py frame.jpg out.png f pitch_deg yaw_deg [span_h] [res]
World units are multiples of the camera height h (unknown scale). North is up in the output."""
import sys, numpy as np, cv2
img = cv2.imread(sys.argv[1]); H, W = img.shape[:2]
f = float(sys.argv[3]); th = np.radians(float(sys.argv[4])); ph = np.radians(float(sys.argv[5]))
span = float(sys.argv[6]) if len(sys.argv) > 6 else 2.2
res = int(sys.argv[7]) if len(sys.argv) > 7 else 1100
fw = np.array([-np.sin(ph) * np.cos(th), np.cos(ph) * np.cos(th), -np.sin(th)])
rt = np.array([np.cos(ph), np.sin(ph), 0.0])
up = np.cross(rt, fw)
# output pixel (u,v) -> ground point (x,y) in h units, camera at origin height 1
cx0, cy0 = float(sys.argv[8]) if len(sys.argv) > 8 else 0.0, float(sys.argv[9]) if len(sys.argv) > 9 else 1.1
xs = (np.arange(res) / res - 0.5) * span + cx0
ys = (0.5 - np.arange(res) / res) * span + cy0
X, Y = np.meshgrid(xs, ys)
V = np.stack([X, Y, -np.ones_like(X)], -1)          # vector from camera to ground point
z = V @ fw
px = W / 2 + f * (V @ rt) / z
py = H / 2 - f * (V @ up) / z
out = cv2.remap(img, px.astype(np.float32), py.astype(np.float32), cv2.INTER_LINEAR, borderValue=(40, 40, 40))
out[z <= 0] = (40, 40, 40)
step = 0.1
for k in np.arange(np.floor((cx0 - span / 2) / step) * step, cx0 + span / 2, step):
    u = int((k - cx0) / span * res + res / 2)
    if 0 <= u < res:
        cv2.line(out, (u, 0), (u, res), (0, 0, 255), 1)
        cv2.putText(out, f'{k:.1f}', (u + 2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 255), 1)
for k in np.arange(np.floor((cy0 - span / 2) / step) * step, cy0 + span / 2, step):
    v = int(res / 2 - (k - cy0) / span * res)
    if 0 <= v < res:
        cv2.line(out, (0, v), (res, v), (0, 0, 255), 1)
        cv2.putText(out, f'{k:.1f}', (2, v - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 255), 1)
cv2.imwrite(sys.argv[2], out)
