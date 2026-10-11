"""Unproject reference-frame pixels onto horizontal planes for a candidate camera (Blender Z-up coords).
usage: python tools/unproject.py cx,cy,cz tx,ty,tz vfov  name=px,py[,z] ..."""
import sys, numpy as np
W, H = 960, 512
c = np.array(list(map(float, sys.argv[1].split(','))))
t = np.array(list(map(float, sys.argv[2].split(','))))
fov = float(sys.argv[3])
f = (H / 2) / np.tan(np.radians(fov) / 2)
fw = (t - c) / np.linalg.norm(t - c)
rt = np.cross(fw, [0, 0, 1.0]); rt /= np.linalg.norm(rt)
up = np.cross(rt, fw)
def ray(px, py):
    d = fw * f + rt * (px - W / 2) + up * (H / 2 - py)
    return d / np.linalg.norm(d)
def project(p):
    v = np.array(p) - c
    z = v @ fw
    return (W / 2 + f * (v @ rt) / z, H / 2 - f * (v @ up) / z)
for s in sys.argv[4:]:
    name, v = s.split('=')
    a = list(map(float, v.split(',')))
    if name.startswith('P:'):
        x, y = project(a)
        print(f"{name:14s} world {a} -> px ({x:6.1f},{y:6.1f})")
        continue
    z = a[2] if len(a) > 2 else 0.0
    d = ray(a[0], a[1])
    k = (z - c[2]) / d[2]
    p = c + d * k
    print(f"{name:14s} px ({a[0]:.0f},{a[1]:.0f}) z={z:5.1f} -> world ({p[0]:7.1f},{p[1]:7.1f})")
