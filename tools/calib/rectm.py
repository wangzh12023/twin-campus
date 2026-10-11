"""Top-down rectification in MODEL METRES (Blender X east / Y north), ground plane z=zp.
usage: python tools/rectm.py frame out f pitch yaw h camX camY x0 y0 x1 y1 [ppm] [zp] [grid]"""
import sys, numpy as np, cv2
a = sys.argv
img = cv2.imread(a[1]); H, W = img.shape[:2]
f, th, ph, h, cx, cy = float(a[3]), np.radians(float(a[4])), np.radians(float(a[5])), float(a[6]), float(a[7]), float(a[8])
x0, y0, x1, y1 = map(float, a[9:13])
ppm = float(a[13]) if len(a) > 13 else 4.0
zp = float(a[14]) if len(a) > 14 else 0.0
grid = float(a[15]) if len(a) > 15 else 10.0
fw = np.array([-np.sin(ph) * np.cos(th), np.cos(ph) * np.cos(th), -np.sin(th)])
rt = np.array([np.cos(ph), np.sin(ph), 0.0]); up = np.cross(rt, fw)
w, hh = int((x1 - x0) * ppm), int((y1 - y0) * ppm)
X, Y = np.meshgrid(x0 + (np.arange(w) + 0.5) / ppm, y1 - (np.arange(hh) + 0.5) / ppm)
V = np.stack([X - cx, Y - cy, np.full_like(X, zp - h)], -1)
z = V @ fw
px = W / 2 + f * (V @ rt) / z; py = H / 2 - f * (V @ up) / z
out = cv2.remap(img, px.astype(np.float32), py.astype(np.float32), cv2.INTER_CUBIC, borderValue=(40, 40, 40))
out[z <= 0] = (40, 40, 40)
k = np.ceil(x0 / grid) * grid
while k <= x1:
    u = int((k - x0) * ppm); major = abs(k % (grid * 5)) < 1e-6
    cv2.line(out, (u, 0), (u, hh), (0, 0, 255) if major else (60, 60, 255), 1)
    cv2.putText(out, f'{k:.0f}', (u + 2, 11), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (0, 255, 255), 1)
    k += grid
k = np.ceil(y0 / grid) * grid
while k <= y1:
    v = int((y1 - k) * ppm); major = abs(k % (grid * 5)) < 1e-6
    cv2.line(out, (0, v), (w, v), (0, 0, 255) if major else (60, 60, 255), 1)
    cv2.putText(out, f'{k:.0f}', (2, v - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (0, 255, 255), 1)
    k += grid
cv2.imwrite(a[2], out)
