"""Mean RGB of named regions in two images (both resized to 960x512).
usage: python tools/regions.py ref shot name=x0,y0,x1,y1 ..."""
import sys, cv2, numpy as np
a = cv2.resize(cv2.imread(sys.argv[1]), (960, 512), interpolation=cv2.INTER_AREA)
b = cv2.resize(cv2.imread(sys.argv[2]), (960, 512), interpolation=cv2.INTER_AREA)
for spec in sys.argv[3:]:
    n, r = spec.split('=')
    x0, y0, x1, y1 = map(int, r.split(','))
    ma = a[y0:y1, x0:x1].reshape(-1, 3).mean(0)[::-1]; mb = b[y0:y1, x0:x1].reshape(-1, 3).mean(0)[::-1]
    print(f'{n:10s} ref RGB {np.round(ma).astype(int)}   shot RGB {np.round(mb).astype(int)}   ratio {np.round(ma / np.maximum(mb, 1), 2)}')
