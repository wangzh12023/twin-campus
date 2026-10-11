"""Build a compact ref|shot comparison sheet.  usage: python tools/pairs.py out.jpg width ref1:shot1 ref2:shot2 ..."""
import sys, numpy as np, cv2
out, w = sys.argv[1], int(sys.argv[2])
rows = []
for spec in sys.argv[3:]:
    a, b = spec.split(':', 1) if not spec[1:3] == ':/' else (spec[:spec.index(':', 3)], spec[spec.index(':', 3) + 1:])
    A, Bm = cv2.imread(a), cv2.imread(b)
    h = int(w * A.shape[0] / A.shape[1])
    A = cv2.resize(A, (w, h), interpolation=cv2.INTER_AREA)
    Bm = cv2.resize(Bm, (w, h), interpolation=cv2.INTER_AREA)
    rows.append(np.hstack([A, np.full((h, 4, 3), 255, np.uint8), Bm]))
    rows.append(np.full((4, rows[-1].shape[1], 3), 255, np.uint8))
cv2.imwrite(out, np.vstack(rows[:-1]), [cv2.IMWRITE_JPEG_QUALITY, 88])
