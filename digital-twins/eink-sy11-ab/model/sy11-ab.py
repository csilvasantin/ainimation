# SY11-ab · modelo procedural para el gemelo digital (Woz, 23-nov-2026, t1378u).
# Unidades: 1 = 10 mm. El aparato está de pie, pantalla hacia +Z, alto en Y, ancho en X.
#
# Medidas: no hay ficha mecánica oficial del SY11-ab. La resolución 480×800 y la paleta
# BWRY salen del firmware SY11-014 (sonda 0x81 del puente). El cuerpo, de unos 60 × 100 ×
# 9,5 mm, es una aproximación a partir de la descripción de Carlos (5–6 cm de ancho por
# 9–10 cm de alto, marco ancho sobre todo abajo) y de las proporciones de su foto
# (perspectiva, no ortogonal). No invento milímetros de fabricante.
#
# Detalles de la foto: carcasa crema, esquinas redondeadas, un saliente a cada lado,
# tres LED en fila en el centro del marco inferior, USB-C blanco en el lateral izquierdo.
#
# Uso: blender -b --python sy11-ab.py -- /ruta/salida.glb [/ruta/salida.blend] [/ruta/render.png]
import bpy, math, sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out_glb = args[0] if len(args) > 0 else 'sy11-ab.glb'
out_blend = args[1] if len(args) > 1 else ''
out_render = args[2] if len(args) > 2 else ''

bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, color, metallic=0.0, roughness=0.5, emission=None, emission_strength=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    return m

cream = material('CreamShell', (0.86, 0.81, 0.74), roughness=0.42)
cream_soft = material('CreamSoft', (0.90, 0.86, 0.80), roughness=0.5)
screen_mat = material('ScreenMat', (0.04, 0.04, 0.045), roughness=0.35, emission=(0.03, 0.03, 0.035), emission_strength=0.25)
black = material('Black', (0.03, 0.03, 0.03), roughness=0.45)
metal = material('MetalDark', (0.28, 0.27, 0.25), metallic=1.0, roughness=0.35)
led_on = material('LedAmber', (0.95, 0.75, 0.25), roughness=0.25, emission=(1.0, 0.7, 0.15), emission_strength=2.2)
white = material('CableWhite', (0.93, 0.93, 0.93), roughness=0.4)

objects = []

def finish(obj, name, mat):
    obj.name = name
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    objects.append(obj)
    return obj

def rounded_box(name, size, location, mat, bevel=0.12, segments=6, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(scale=True)
    mod = obj.modifiers.new('Bevel', 'BEVEL')
    mod.width = min(bevel, min(size) / 2.2)
    mod.segments = segments
    mod.limit_method = 'NONE'
    bpy.ops.object.shade_smooth()
    return finish(obj, name, mat)

def cylinder(name, radius, depth, location, mat, rotation=(0, 0, 0), vertices=48, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    if bevel:
        mod = obj.modifiers.new('Bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 4
    bpy.ops.object.shade_smooth()
    return finish(obj, name, mat)

def plane(name, size, location, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.scale = (size[0], size[1], 1)
    bpy.ops.object.transform_apply(scale=True)
    return finish(obj, name, mat)

# Cuerpo aproximado 60 × 100 × 9,5 mm (de pie)
W, H, T = 6.0, 10.0, 0.95
# Pantalla 48 × 80 mm (misma proporción 480×800); marco más alto abajo para los LED
SW, SH = 4.8, 8.0
BEZEL_TOP = 0.85
BEZEL_BOTTOM = 1.15  # marco más alto abajo, donde van los tres LED
screen_cy = BEZEL_BOTTOM + SH / 2  # 5.15: la pantalla queda dentro del cuerpo (Y de 1.15 a 9.15)

rounded_box('Frame', (W, H, T), (0, H / 2, T / 2), cream, bevel=0.42, segments=10)
# Hundido del cristal / área de tinta
rounded_box('BezelWell', (SW + 0.16, SH + 0.16, 0.06), (0, screen_cy, T + 0.01), cream_soft, bevel=0.12, segments=6)
# La malla «Screen» es el lienzo 480×800 del gemelo (eje local: ancho X, alto Y).
plane('Screen', (SW, SH), (0, screen_cy, T + 0.055), screen_mat)

# Salientes laterales (botones), a media altura un poco hacia abajo
rounded_box('SideButtonLeft', (0.18, 0.55, 0.28), (-W / 2 - 0.06, 4.6, T / 2), cream_soft, bevel=0.07, segments=5)
rounded_box('SideButtonRight', (0.18, 0.55, 0.28), (W / 2 + 0.06, 4.6, T / 2), cream_soft, bevel=0.07, segments=5)

# Tres LED en el centro del marco inferior
led_y = 0.55
led_z = T + 0.04
for i, dx in enumerate((-0.22, 0.0, 0.22)):
    cylinder(f'Led{i}', 0.055, 0.04, (dx, led_y, led_z), led_on, vertices=16)

# Puerto USB-C en el lateral izquierdo, más abajo del centro, con cable blanco
usb_y = 2.6
rounded_box('UsbCPort', (0.10, 0.28, 0.12), (-W / 2 - 0.01, usb_y, T / 2), black, bevel=0.04, segments=3)
rounded_box('UsbCPlug', (0.9, 0.30, 0.16), (-W / 2 - 0.50, usb_y, T / 2), metal, bevel=0.06, segments=4)
cylinder('CableRoot', 0.11, 0.7, (-W / 2 - 1.05, usb_y, T / 2), white, rotation=(0, math.pi / 2, 0), vertices=16)
cylinder('UsbCable', 0.09, 6.0, (-W / 2 - 4.3, usb_y, T / 2), white, rotation=(0, math.pi / 2, 0), vertices=16)

# Base apenas visible, para que se sostenga de pie en el visor
rounded_box('Foot', (W - 0.6, 0.18, T + 0.1), (0, 0.06, T / 2), cream_soft, bevel=0.06, segments=4)

for obj in objects:
    obj.select_set(True)

if out_blend:
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)
    print('SY11_BLEND_OK', out_blend)

bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
print('SY11_GLB_OK', out_glb, len(objects), 'objetos')

if out_render:
    # Estudio sencillo: fondo rosa suave como la mesa de Carlos, cámara 3/4.
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 1600
    scene.render.filepath = out_render
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    world = bpy.data.worlds.new('Studio')
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.92, 0.62, 0.82, 1)
    bg.inputs['Strength'].default_value = 0.7
    key = bpy.data.objects.new('KeyLight', bpy.data.lights.new('KeyLight', 'AREA'))
    key.data.energy = 140
    key.data.size = 8
    key.location = (6, 8, 10)
    key.rotation_euler = (math.radians(-35), math.radians(20), math.radians(30))
    fill = bpy.data.objects.new('FillLight', bpy.data.lights.new('FillLight', 'AREA'))
    fill.data.energy = 55
    fill.data.size = 10
    fill.location = (-6, 4, 6)
    fill.rotation_euler = (math.radians(-20), math.radians(-25), 0)
    cam_data = bpy.data.cameras.new('RenderCam')
    cam_data.lens = 50
    cam = bpy.data.objects.new('RenderCam', cam_data)
    # Encuadre 3/4, un poco por encima
    cam.location = (5.8, 6.2, 18.0)
    cam_data.lens = 50
    look = bpy.data.objects.new('LookAt', None)
    look.location = (0.0, 5.2, 0.45)
    scene.collection.objects.link(look)
    con = cam.constraints.new(type='TRACK_TO')
    con.target = look
    con.track_axis = 'TRACK_NEGATIVE_Z'
    con.up_axis = 'UP_Y'
    scene.collection.objects.link(key)
    scene.collection.objects.link(fill)
    scene.collection.objects.link(cam)
    scene.camera = cam
    bpy.ops.render.render(write_still=True)
    print('SY11_RENDER_OK', out_render)
