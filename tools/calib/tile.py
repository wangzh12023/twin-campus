"""Tile images into a contact sheet. usage: python tools/tile.py out.jpg cols width img1 img2 ..."""
import sys, numpy as np, cv2
out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ims = [cv2.imread(p) for p in sys.argv[4:]]
h = int(w * ims[0].shape[0] / ims[0].shape[1])
ims = [cv2.resize(i, (w, h), interpolation=cv2.INTER_AREA) for i in ims]
for i, p in zip(ims, sys.argv[4:]):
    cv2.putText(i, p.split('/')[-1][:28], (6, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
while len(ims) % cols: ims.append(np.full_like(ims[0], 255))
rows = [np.hstack(ims[r * cols:(r + 1) * cols]) for r in range(len(ims) // cols)]
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
