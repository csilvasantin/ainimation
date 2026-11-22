# Samsung Galaxy Fold abierto · modelo procedural para el gemelo digital (DeepAgent Neo, 22-nov-2026).
# Unidades: 1 = 10 mm. Abierto como un libro, tumbado con la pantalla interior hacia arriba (≈ 143 × 158 mm entre las
# dos mitades, bisagra en el centro), marco de aluminio, pantalla exterior en la trasera de la mitad derecha, módulo de
# tres cámaras en la trasera izquierda, botón lateral y volumen en el canto derecho, cable USB-C hacia el Mac Studio.
# Uso: blender -b --python samsung-fold.py -- /ruta/salida.glb
import bpy, math, sys

out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'samsung-fold.glb'
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

aluminium = material('Aluminium', (0.55, 0.56, 0.58), metallic=1.0, roughness=0.35)
dark = material('Dark', (0.16, 0.16, 0.17), metallic=0.8, roughness=0.4)
back_glass = material('BackGlass', (0.12, 0.13, 0.16), metallic=0.3, roughness=0.25)
glass = material('Glass', (0.02, 0.02, 0.025), roughness=0.08)
screen_mat = material('Screen', (0.0, 0.0, 0.0), roughness=0.3, emission=(0.02, 0.02, 0.03))
cover_mat = material('CoverScreen', (0.01, 0.01, 0.012), roughness=0.2)
lens = material('Lens', (0.03, 0.03, 0.05), roughness=0.1)
lens_ring = material('LensRing', (0.35, 0.34, 0.32), metallic=1.0, roughness=0.3)
black = material('Black', (0.02, 0.02, 0.02), roughness=0.5)
white = material('CableWhite', (0.92, 0.92, 0.92), roughness=0.4)

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

# ── Dos mitades abiertas (cada una 71 × 158 × 5,6 mm) con la bisagra en X = 0 ──
HW, H, T = 7.1, 15.8, 0.56
for side, name in ((-1, 'LeftHalf'), (1, 'RightHalf')):
    rounded_box(name, (HW, H, T), (side * (HW / 2 + 0.12), 0, T / 2), aluminium, bevel=0.35, segments=8)
    rounded_box(name + 'Back', (HW - 0.14, H - 0.14, 0.05), (side * (HW / 2 + 0.12), 0, 0.0), back_glass, bevel=0.3, segments=6)
# Bisagra
cylinder('Hinge', 0.3, H - 0.4, (0, 0, T / 2), dark, rotation=(math.pi / 2, 0, 0), vertices=32)
# Cristal y pantalla interior continua (≈ 143 × 152 mm; la textura del gemelo recorta las esquinas)
rounded_box('Crystal', (2 * HW + 0.1, H - 0.2, 0.06), (0, 0, T + 0.02), glass, bevel=0.3, segments=6)
plane('Screen', (14.0, 15.0), (0, 0, T + 0.055), screen_mat)
# Cámara frontal interior (agujero)
cylinder('InnerCamera', 0.12, 0.02, (HW / 2 + 0.3, H / 2 - 1.0, T + 0.06), black, vertices=20)

# ── Trasera: pantalla exterior (mitad derecha) y módulo de cámaras (mitad izquierda) ──
plane_back = plane('CoverScreen', (5.6, 14.6), (HW / 2 + 0.12, 0, -0.03), cover_mat)
plane_back.rotation_euler = (math.pi, 0, 0)
cx, cy = -(HW / 2 + 0.12) - 1.6, H / 2 - 2.0
rounded_box('CameraIsland', (1.5, 4.6, 0.14), (cx, cy - 1.2, -0.07), dark, bevel=0.5, segments=6)
for i, dy in enumerate((0.0, -1.3, -2.6)):
    cylinder(f'LensRing{i}', 0.5, 0.16, (cx, cy + dy, -0.2), lens_ring, vertices=40, bevel=0.03)
    cylinder(f'Lens{i}', 0.34, 0.06, (cx, cy + dy, -0.28), lens, vertices=40)
cylinder('Flash', 0.18, 0.05, (cx + 0.95, cy - 0.6, -0.12), material('Flash', (0.95, 0.92, 0.8), roughness=0.3, emission=(0.4, 0.38, 0.3)), vertices=20)

# ── Botones en el canto derecho (+X): lateral (con huella) y volumen ──
rounded_box('SideButton', (0.14, 1.3, 0.26), (HW + 0.12 + HW / 2 + 0.03, 4.4, T / 2), dark, bevel=0.06, segments=5)
rounded_box('VolumeUp', (0.14, 0.9, 0.26), (HW + 0.12 + HW / 2 + 0.03, 6.3, T / 2), dark, bevel=0.06, segments=5)
rounded_box('VolumeDown', (0.14, 0.9, 0.26), (HW + 0.12 + HW / 2 + 0.03, 5.3, T / 2), dark, bevel=0.06, segments=5)

# ── Canto inferior de la mitad derecha: altavoz, USB-C y cable al Mac Studio ──
px = HW / 2 + 0.12
for i in range(5):
    cylinder(f'SpeakerHole{i}', 0.05, 0.1, (px + 1.0 + i * 0.3, -H / 2, T / 2), black, rotation=(math.pi / 2, 0, 0), vertices=10)
rounded_box('UsbCPort', (0.9, 0.12, 0.3), (px, -H / 2 - 0.02, T / 2), black, bevel=0.1, segments=4)
rounded_box('UsbCPlug', (0.86, 1.2, 0.28), (px, -H / 2 - 0.62, T / 2), dark, bevel=0.1, segments=4)
cylinder('CableRoot', 0.14, 1.4, (px, -H / 2 - 1.9, T / 2), white, rotation=(math.pi / 2, 0, 0), vertices=16)
cylinder('UsbCable', 0.11, 9.0, (px, -H / 2 - 7.0, T / 2), white, rotation=(math.pi / 2, 0, 0), vertices=16)

for obj in objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
print('FOLD_GLB_OK', out, len(objects), 'objetos')
