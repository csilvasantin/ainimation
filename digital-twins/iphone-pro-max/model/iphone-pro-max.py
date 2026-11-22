# iPhone Pro Max · modelo procedural para el gemelo digital (DeepAgent Neo, 22-nov-2026).
# Unidades: 1 = 10 mm. Cuerpo 163 × 78 × 8,3 mm con marco de titanio, cristal trasero, meseta de cámaras con tres
# objetivos, Dynamic Island, botón de Acción y volumen a la izquierda, botón lateral y Control de cámara a la
# derecha, y cable USB-C hacia el Mac Studio. Tumbado con la pantalla hacia arriba, el largo en Y.
# Uso: blender -b --python iphone-pro-max.py -- /ruta/salida.glb
import bpy, math, sys

out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'iphone-pro-max.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, color, metallic=0.0, roughness=0.5, emission=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = 1.0
    return m

titanium = material('Titanium', (0.58, 0.56, 0.52), metallic=1.0, roughness=0.35)
titanium_dark = material('TitaniumDark', (0.28, 0.27, 0.25), metallic=1.0, roughness=0.45)
back_glass = material('BackGlass', (0.52, 0.50, 0.46), metallic=0.2, roughness=0.25)
glass = material('Glass', (0.02, 0.02, 0.025), roughness=0.08)
screen_mat = material('Screen', (0.0, 0.0, 0.0), roughness=0.3, emission=(0.02, 0.02, 0.03))
lens = material('Lens', (0.03, 0.03, 0.05), roughness=0.1)
lens_ring = material('LensRing', (0.35, 0.34, 0.32), metallic=1.0, roughness=0.3)
flash = material('Flash', (0.95, 0.92, 0.8), roughness=0.3, emission=(0.4, 0.38, 0.3))
black = material('Black', (0.02, 0.02, 0.02), roughness=0.5)
white = material('CableWhite', (0.92, 0.92, 0.92), roughness=0.4)
orange = material('ActionOrange', (1.0, 0.42, 0.08), roughness=0.5)

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

def plane(name, size, location, mat):
    bpy.ops.mesh.primitive_plane_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.scale = (size[0], size[1], 1)
    bpy.ops.object.transform_apply(scale=True)
    return finish(obj, name, mat)

# ── Cuerpo (78 ancho en X, 163 alto en Y, 8,3 grueso en Z) ──
W, H, T = 7.8, 16.3, 0.83
rounded_box('Frame', (W, H, T), (0, 0, T / 2), titanium, bevel=0.55, segments=10)
rounded_box('BackGlass', (W - 0.16, H - 0.16, 0.06), (0, 0, 0.0), back_glass, bevel=0.5, segments=8)
rounded_box('Crystal', (W - 0.16, H - 0.16, 0.08), (0, 0, T + 0.02), glass, bevel=0.5, segments=8)
# Pantalla: 440 × 956 pt (1320 × 2868 px) ≈ 70 × 152 mm; la textura del gemelo recorta las esquinas.
plane('Screen', (7.0, 15.2), (0, 0, T + 0.065), screen_mat)

# ── Meseta de cámaras (trasera, arriba a la izquierda, −X +Y) ──
px, py = -W / 2 + 2.3, H / 2 - 2.3
rounded_box('CameraPlateau', (3.9, 3.9, 0.22), (px, py, -0.08), back_glass, bevel=0.9, segments=8)
for i, (dx, dy) in enumerate([(-0.95, 0.95), (-0.95, -0.95), (0.95, 0.0)]):
    cylinder(f'LensRing{i}', 0.78, 0.2, (px + dx, py + dy, -0.26), lens_ring, vertices=48, bevel=0.04)
    cylinder(f'Lens{i}', 0.55, 0.08, (px + dx, py + dy, -0.36), lens, vertices=48)
cylinder('Flash', 0.26, 0.06, (px + 0.95, py + 1.1, -0.2), flash, vertices=24)
cylinder('LidarDot', 0.22, 0.06, (px + 0.95, py - 1.1, -0.2), black, vertices=24)

# ── Botones: Acción y volumen a la izquierda (−X); lateral y Control de cámara a la derecha (+X) ──
rounded_box('ActionButton', (0.16, 0.9, 0.3), (-W / 2 - 0.05, 5.3, T / 2), orange, bevel=0.07, segments=5)
rounded_box('VolumeUp', (0.16, 1.2, 0.3), (-W / 2 - 0.05, 3.7, T / 2), titanium_dark, bevel=0.07, segments=5)
rounded_box('VolumeDown', (0.16, 1.2, 0.3), (-W / 2 - 0.05, 2.2, T / 2), titanium_dark, bevel=0.07, segments=5)
rounded_box('SideButton', (0.16, 1.9, 0.3), (W / 2 + 0.05, 3.6, T / 2), titanium_dark, bevel=0.07, segments=5)
rounded_box('CameraControl', (0.14, 1.3, 0.34), (W / 2 + 0.04, 0.6, T / 2), titanium_dark, bevel=0.06, segments=5)

# ── Bordes inferior: altavoz, micro y puerto USB-C con cable al Mac Studio ──
for i in range(6):
    cylinder(f'SpeakerHole{i}', 0.05, 0.12, (1.0 + i * 0.3, -H / 2 - 0.0, T / 2), black, rotation=(math.pi / 2, 0, 0), vertices=10)
rounded_box('UsbCPort', (0.9, 0.12, 0.3), (0, -H / 2 - 0.02, T / 2), black, bevel=0.1, segments=4)
rounded_box('UsbCPlug', (0.86, 1.2, 0.28), (0, -H / 2 - 0.62, T / 2), titanium_dark, bevel=0.1, segments=4)
cylinder('CableRoot', 0.14, 1.4, (0, -H / 2 - 1.9, T / 2), white, rotation=(math.pi / 2, 0, 0), vertices=16)
cylinder('UsbCable', 0.11, 9.0, (0, -H / 2 - 7.0, T / 2), white, rotation=(math.pi / 2, 0, 0), vertices=16)

for obj in objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
print('IPHONE_GLB_OK', out, len(objects), 'objetos')
