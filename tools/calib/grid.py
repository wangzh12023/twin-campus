"""Overlay a labelled pixel grid on (a crop of) an image, enlarged, for reading coordinates.
usage: python tools/grid.py in.jpg out.png x0 y0 w h scale [step]"""
import sys
from PIL import Image, ImageDraw, ImageFont
src, dst, x0, y0, w, h, sc = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:8])
step = int(sys.argv[8]) if len(sys.argv) > 8 else 20
im = Image.open(src).convert('RGB').crop((x0, y0, x0 + w, y0 + h)).resize((w * sc, h * sc), Image.LANCZOS)
d = ImageDraw.Draw(im, 'RGBA')
try:
    f = ImageFont.truetype('arial.ttf', 11)
except Exception:
    f = ImageFont.load_default()
for x in range((x0 // step) * step, x0 + w + 1, step):
    if x < x0: continue
    X = (x - x0) * sc
    major = x % 100 == 0
    d.line([(X, 0), (X, h * sc)], fill=(255, 0, 0, 150 if major else 60), width=1)
    d.text((X + 2, 2), str(x), fill=(255, 255, 0, 255), font=f)
for y in range((y0 // step) * step, y0 + h + 1, step):
    if y < y0: continue
    Y = (y - y0) * sc
    major = y % 100 == 0
    d.line([(0, Y), (w * sc, Y)], fill=(255, 0, 0, 150 if major else 60), width=1)
    d.text((2, Y + 1), str(y), fill=(255, 255, 0, 255), font=f)
im.save(dst)
