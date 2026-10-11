"""Twin Campus concept campus – exterior world (aerial + plaza street level).

Run:  blender -b --factory-startup -P blender/build_campus.py -- <out_dir>
Outputs  <out_dir>/campus.glb  and  <out_dir>/campus_instances.json

Blender axes: X east, Y north, Z up (metres). Exported glTF is Y-up.
"""
import sys, os, json, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix
import blib
from blib import mat, batch, Batch

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(os.path.dirname(__file__), '..', 'web', 'public', 'models')
os.makedirs(OUT, exist_ok=True)

blib.reset_scene()
rnd = random.Random(7)

# ---------------------------------------------------------------------------
# materials (names are matched in three.js and replaced with tuned materials)
# ---------------------------------------------------------------------------
M = dict(
    white=mat('white', '#f3f5f8', 0.85),
    bgwhite=mat('bg_white', '#f1f4f8', 0.9),
    tglass=mat('glass_tower', '#1c6f95', 0.05, 0.2),
    aglass=mat('glass_annex', '#3d7fb5', 0.08, 0.1),
    roofglass=mat('glass_roof', '#8fb4d8', 0.2),
    frame=mat('frame_white', '#eef1f5', 0.6),
    darkframe=mat('frame_dark', '#2c3a46', 0.5, 0.4),
    wood=mat('wood', '#c88b55', 0.6),
    paving=mat('paving', '#e4e7ea', 0.8),
    steps=mat('steps', '#eceff2', 0.8),
    sidewalk=mat('sidewalk', '#e2e6ea', 0.85),
    ground=mat('ground', '#e6eaee', 0.9),
    road=mat('road', '#8f969e', 0.9),
    marking=mat('marking', '#f5f6f7', 0.7),
    water=mat('water', '#0e4c71', 0.12),
    grass=mat('grass', '#86b45f', 0.95),
    planter=mat('planter', '#f2f4f6', 0.7),
    ring=mat('ring', '#c9d6e6', 0.12, 1.0),
    solar=mat('solar', '#1e3854', 0.3, 0.3),
    rail=mat('rail_glass', '#cfe0ee', 0.05, 0.0, alpha=0.3),
    sign=mat('sign', '#46505a', 0.5),
    logo=mat('logo_white', '#ffffff', 0.4, 0, '#ffffff', 0.6),
    leaf=mat('leaf', '#4f8a4c', 0.9),
    trunk=mat('trunk', '#5b4b3e', 0.9),
    car=mat('car', '#555b62', 0.4, 0.3),
)


HERE = os.path.dirname(os.path.abspath(__file__))
# The scene is assembled from parts that share this namespace (order matters).
for part in ('site.py', 'tower.py', 'interiors.py', 'annexes.py', 'templates.py'):
    exec(compile(open(os.path.join(HERE, part), encoding='utf-8').read(), part, 'exec'))
