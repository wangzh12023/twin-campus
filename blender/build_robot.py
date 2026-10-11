"""Humanoid service robot (articulated, no skinning) for the AI section.
Each limb segment is a separate object whose origin sits on its joint, so three.js can
animate it by rotating nodes.  Output: robot.glb
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix
import blib
from blib import mat

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(os.path.dirname(__file__), '..', 'web', 'public', 'models')
blib.reset_scene()

W = mat('robot_white', '#e8ebee', 0.22, 0.35)
D = mat('robot_dark', '#2b2f33', 0.38, 0.65)
V = mat('robot_visor', '#0d1114', 0.08, 0.5)
G = mat('robot_glow', '#9fd6ff', 0.3, 0.0, '#7cc8ff', 3.0)
S = mat('robot_silver', '#b9c0c6', 0.25, 0.9)


def ellipsoid(name, r, scale, loc, material, parent, seg=24, rings=14, rot=(0, 0, 0)):
    v, f = blib.uv_sphere(seg, rings, 1.0)
    Mx = blib.mat_trs(loc, rot, scale)
    v = [tuple(Mx @ Vector(p)) for p in v]
    ob = blib.mesh_object(name, v, f, material, smooth=True, parent=parent)
    return ob


def capsule_shell(name, length, r0, r1, material, parent, loc=(0, 0, 0), flat=1.0, seg=24, down=True):
    """tapered rounded shell from joint (z=0) downward (or upward)."""
    prof = []
    n = 10
    for i in range(n + 1):
        t = i / n
        z = t * length
        r = r0 + (r1 - r0) * t
        # round both ends
        e0 = min(1.0, t * length / (r0 * 0.9)) if r0 > 0 else 1
        e1 = min(1.0, (1 - t) * length / (r1 * 0.9)) if r1 > 0 else 1
        k = math.sqrt(max(0.0, 1 - (1 - e0) ** 2)) * math.sqrt(max(0.0, 1 - (1 - e1) ** 2))
        prof.append((max(0.004, r * k), -z if down else z))
    if down:
        prof = list(reversed(prof))
    v, f = blib.lathe(prof, seg)
    v = [(x * flat + loc[0], y + loc[1], z + loc[2]) for x, y, z in v]
    return blib.mesh_object(name, v, f, material, smooth=True, parent=parent)


def joint(name, loc, parent):
    e = blib.empty(name, loc, parent)
    return e


root = blib.empty('robot_root', (0, 0, 0))
HIP_Z = 0.98
pelvis = joint('pelvis', (0, 0, HIP_Z), root)
# pelvis block (dark) + white hip plate
ellipsoid('pelvis_core', 1, (0.17, 0.12, 0.1), (0, 0, 0.02), D, pelvis)
ellipsoid('pelvis_plate', 1, (0.19, 0.13, 0.07), (0, -0.01, -0.03), W, pelvis)

# torso
spine = joint('spine', (0, 0, 0.1), pelvis)
ellipsoid('abdomen', 1, (0.12, 0.1, 0.12), (0, 0, 0.1), D, spine)
for i in range(3):
    ellipsoid('abs_%d' % i, 1, (0.1 - i * 0.004, 0.095, 0.03), (0, -0.02, 0.05 + i * 0.055), S, spine)
chest = joint('chest', (0, 0, 0.22), spine)
ellipsoid('chest_core', 1, (0.2, 0.13, 0.17), (0, 0.005, 0.15), D, chest)
ellipsoid('chest_plate', 1, (0.205, 0.12, 0.16), (0, -0.03, 0.17), W, chest)
ellipsoid('back_plate', 1, (0.18, 0.09, 0.15), (0, 0.06, 0.16), W, chest)
ellipsoid('chest_light', 1, (0.035, 0.01, 0.012), (0, -0.148, 0.2), G, chest)
for sx in (-1, 1):
    ellipsoid('collar_%d' % sx, 1, (0.08, 0.07, 0.04), (sx * 0.12, 0.0, 0.31), W, chest)

neck = joint('neck', (0, 0, 0.34), chest)
capsule_shell('neck_core', 0.1, 0.045, 0.05, D, neck, down=False)
head = joint('head', (0, 0, 0.1), neck)
ellipsoid('helmet', 1, (0.105, 0.125, 0.135), (0, 0.01, 0.1), W, head)
ellipsoid('face', 1, (0.085, 0.07, 0.1), (0, -0.065, 0.085), D, head)
ellipsoid('visor', 1, (0.075, 0.04, 0.035), (0, -0.112, 0.11), V, head)
ellipsoid('eye_glow', 1, (0.05, 0.008, 0.008), (0, -0.148, 0.112), G, head)
for sx in (-1, 1):
    ellipsoid('ear_%d' % sx, 1, (0.02, 0.045, 0.045), (sx * 0.105, 0.01, 0.09), S, head)

for side, sx in (('L', 1), ('R', -1)):
    sh = joint('shoulder_' + side, (sx * 0.24, 0.0, 0.27), chest)
    ellipsoid('shoulder_ball_' + side, 1, (0.065, 0.065, 0.065), (0, 0, 0), D, sh)
    ellipsoid('shoulder_cap_' + side, 1, (0.09, 0.095, 0.085), (sx * 0.02, 0, 0.02), W, sh)
    capsule_shell('upperarm_' + side, 0.27, 0.058, 0.048, W, sh, loc=(sx * 0.005, 0, -0.03))
    el = joint('elbow_' + side, (sx * 0.005, 0, -0.3), sh)
    ellipsoid('elbow_ball_' + side, 1, (0.045, 0.045, 0.045), (0, 0, 0), D, el)
    capsule_shell('forearm_' + side, 0.25, 0.05, 0.04, W, el, loc=(0, 0, -0.03))
    capsule_shell('forearm_core_' + side, 0.25, 0.035, 0.03, D, el, loc=(0, 0.012, -0.04))
    wr = joint('wrist_' + side, (0, 0, -0.29), el)
    ellipsoid('hand_' + side, 1, (0.03, 0.05, 0.075), (0, 0, -0.06), D, wr)
    ellipsoid('hand_plate_' + side, 1, (0.032, 0.04, 0.045), (sx * 0.004, -0.004, -0.04), S, wr)

    hp = joint('hip_' + side, (sx * 0.1, 0, -0.04), pelvis)
    ellipsoid('hip_ball_' + side, 1, (0.07, 0.07, 0.07), (0, 0, 0), D, hp)
    capsule_shell('thigh_' + side, 0.42, 0.085, 0.06, W, hp, loc=(0, -0.005, -0.03))
    capsule_shell('thigh_core_' + side, 0.42, 0.055, 0.045, D, hp, loc=(0, 0.02, -0.04))
    kn = joint('knee_' + side, (0, 0, -0.45), hp)
    ellipsoid('knee_ball_' + side, 1, (0.05, 0.05, 0.05), (0, 0, 0), D, kn)
    ellipsoid('knee_cap_' + side, 1, (0.05, 0.035, 0.06), (0, -0.04, 0.0), W, kn)
    capsule_shell('shin_' + side, 0.42, 0.065, 0.045, W, kn, loc=(0, -0.008, -0.03))
    capsule_shell('shin_core_' + side, 0.42, 0.045, 0.035, D, kn, loc=(0, 0.015, -0.03))
    an = joint('ankle_' + side, (0, 0, -0.45), kn)
    ellipsoid('ankle_ball_' + side, 1, (0.04, 0.04, 0.04), (0, 0, 0), D, an)
    ellipsoid('foot_' + side, 1, (0.055, 0.12, 0.04), (0, -0.045, -0.045), W, an)
    ellipsoid('sole_' + side, 1, (0.055, 0.12, 0.015), (0, -0.045, -0.075), D, an)

blib.export_glb(os.path.join(OUT, 'robot.glb'))
print('ROBOT DONE', len(bpy.data.objects))
