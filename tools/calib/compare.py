"""Side-by-side / blend / edge-overlay comparison of a reference frame and a browser capture.
usage: python tools/compare.py ref.jpg shot.png out_prefix"""
import sys, numpy as np, cv2
ref = cv2.imread(sys.argv[1]); shot = cv2.imread(sys.argv[2])
H, W = ref.shape[:2]
shot = cv2.resize(shot, (W, H), interpolation=cv2.INTER_AREA)
cv2.imwrite(sys.argv[3] + '_side.png', np.vstack([ref, shot]))
e = cv2.Canny(cv2.cvtColor(shot, cv2.COLOR_BGR2GRAY), 60, 150)
ov = ref.copy(); ov[e > 0] = (0, 0, 255)
cv2.imwrite(sys.argv[3] + '_edges.png', cv2.resize(ov, (W * 2, H * 2), interpolation=cv2.INTER_NEAREST))
d = np.abs(ref.astype(np.float32) - shot.astype(np.float32)).mean()
print('mean abs diff', round(float(d), 1), ' ref mean', ref.reshape(-1, 3).mean(0).round(0), ' shot mean', shot.reshape(-1, 3).mean(0).round(0))
