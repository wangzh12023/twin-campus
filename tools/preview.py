"""Quick Cycles preview of the exported glb from given camera views.
usage: blender -b -P tools/preview.py -- in.glb out_prefix  name:cx,cy,cz:tx,ty,tz:lens ...
coords are Blender Z-up.
"""
import bpy, sys, math, mathutils
argv = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
sc = bpy.context.scene
for ob in list(bpy.data.objects):
    if ob.name.startswith('TPL_'):
        ob.hide_render = True
sc.render.engine = 'CYCLES'
sc.cycles.samples = 24
sc.cycles.use_denoising = True
sc.cycles.device = 'GPU'
p = bpy.context.preferences.addons['cycles'].preferences
p.compute_device_type = 'OPTIX'
p.get_devices()
for d in p.devices:
    d.use = True
sc.render.resolution_x = 960
sc.render.resolution_y = 512
w = bpy.data.worlds.new('w')
sc.world = w
w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.65, 0.85, 1)
w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
sun = bpy.data.lights.new('s', 'SUN')
sun.energy = 3.5
so = bpy.data.objects.new('s', sun)
sc.collection.objects.link(so)
so.rotation_euler = (math.radians(45), 0, math.radians(-35))
cam = bpy.data.cameras.new('c')
co = bpy.data.objects.new('c', cam)
sc.collection.objects.link(co)
sc.camera = co
for spec in argv[2:]:
    name, c, t, lens = spec.split(':')
    c = [float(x) for x in c.split(',')]
    t = [float(x) for x in t.split(',')]
    co.location = c
    d = mathutils.Vector(t) - mathutils.Vector(c)
    co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam.lens = float(lens)
    sc.render.filepath = argv[1] + '_' + name + '.png'
    bpy.ops.render.render(write_still=True)
    print('RENDERED', name)
