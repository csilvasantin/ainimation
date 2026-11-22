# Apple Watch Ultra · modelo procedural para el gemelo digital (DeepAgent Neo, 22-nov-2026).
# Unidades: 1 = 10 mm. Caja 49 × 44 × 14,4 mm en titanio natural, cristal plano, corona y botón lateral en la
# protección derecha, botón de Acción naranja a la izquierda, correa Ocean azul y puck de carga USB-C.
# Uso: blender -b --python apple-watch-ultra.py -- /ruta/salida.glb
import bpy, bmesh, math, sys
from mathutils import Vector

out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'apple-watch-ultra.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

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

titanium = material('Titanium', (0.62, 0.60, 0.56), metallic=1.0, roughness=0.38)
titanium_dark = material('TitaniumDark', (0.30, 0.29, 0.27), metallic=1.0, roughness=0.45)
glass = material('Glass', (0.02, 0.02, 0.025), metallic=0.0, roughness=0.08)
screen_mat = material('Screen', (0.0, 0.0, 0.0), roughness=0.3, emission=(0.02, 0.02, 0.03))
orange = material('ActionOrange', (1.0, 0.36, 0.05), roughness=0.5)
band_blue = material('OceanBlue', (0.05, 0.26, 0.62), roughness=0.6)
band_blue_dark = material('OceanBlueDark', (0.03, 0.18, 0.46), roughness=0.65)
black = material('Black', (0.02, 0.02, 0.02), roughness=0.5)
white = material('PuckWhite', (0.92, 0.92, 0.92), roughness=0.4)
sensor = material('SensorGlass', (0.05, 0.05, 0.06), roughness=0.15)

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
    pass
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

# ── Caja (49 alto en Y, 44 ancho en X, 14,4 grueso en Z) ──
W, H, T = 4.4, 4.9, 1.44
case = rounded_box('Case', (W, H, T), (0, 0, T / 2), titanium, bevel=0.55, segments=10)
# Bisel plano superior y cristal de zafiro plano, ligeramente elevado
crystal = rounded_box('Crystal', (W - 0.3, H - 0.3, 0.12), (0, 0, T + 0.05), glass, bevel=0.5, segments=8)
# Pantalla: 410×502 px ≈ 35 × 43 mm, con esquinas redondeadas (la textura del gemelo recorta el radio).
screen = plane('Screen', (3.52, 4.3), (0, 0, T + 0.115), screen_mat)
# Trasera: cúpula de sensores
cylinder('SensorDome', 1.45, 0.08, (0, 0, 0.02), sensor, vertices=64)
cylinder('SensorRing', 1.55, 0.05, (0, 0, 0.03), titanium_dark, vertices=64)

# ── Protección de la corona (lado derecho, +X) ──
guard = rounded_box('CrownGuard', (0.75, 2.6, T * 0.82), (W / 2 + 0.15, 0.1, T / 2 + 0.02), titanium, bevel=0.3, segments=8)
# Corona digital: cilindro en el eje X, con anillo naranja
crown = cylinder('DigitalCrown', 0.5, 0.42, (W / 2 + 0.72, 0.72, T / 2 + 0.1), titanium, rotation=(0, math.pi / 2, 0), vertices=64, bevel=0.06)
cylinder('CrownRing', 0.52, 0.08, (W / 2 + 0.62, 0.72, T / 2 + 0.1), orange, rotation=(0, math.pi / 2, 0), vertices=64)
# Estrías de la corona
for i in range(24):
    a = i / 24 * math.tau
    bpy.ops.mesh.primitive_cube_add(size=1, location=(W / 2 + 0.72, 0.72 + math.cos(a) * 0.5, T / 2 + 0.1 + math.sin(a) * 0.5), rotation=(a, 0, 0))
    o = bpy.context.active_object
    o.scale = (0.34, 0.05, 0.05)
    bpy.ops.object.transform_apply(scale=True)
    finish(o, f'CrownRidge{i}', titanium_dark)
# Botón lateral (pastilla plana bajo la corona)
side = rounded_box('SideButton', (0.18, 1.0, 0.36), (W / 2 + 0.6, -0.72, T / 2 + 0.05), titanium_dark, bevel=0.09, segments=6)

# ── Botón de Acción (lado izquierdo, −X), naranja ──
action = rounded_box('ActionButton', (0.22, 1.25, 0.42), (-W / 2 - 0.06, 0.1, T / 2 + 0.05), orange, bevel=0.1, segments=6)
# Rejillas de altavoz (lado izquierdo)
for i in range(2):
    rounded_box(f'Speaker{i}', (0.06, 0.55, 0.16), (-W / 2 - 0.01, -1.05 - i * 0.7, T / 2), black, bevel=0.03, segments=3)

# ── Correa Ocean azul: dos tramos planos con la trama tubular ──
def band(name, direction):
    y0 = direction * (H / 2 + 0.05)
    length = 7.2
    body = rounded_box(name, (3.6, length, 0.34), (0, y0 + direction * length / 2, 0.17), band_blue, bevel=0.16, segments=6)
    # Tubos transversales característicos de la Ocean Band
    n = 15
    for i in range(n):
        y = y0 + direction * (0.45 + i * (length - 0.6) / (n - 1))
        cylinder(f'{name}Tube{i}', 0.17, 3.3, (0, y, 0.33), band_blue_dark, rotation=(0, math.pi / 2, 0), vertices=24)
    # Enganche al reloj (asa de titanio)
    rounded_box(f'{name}Lug', (3.2, 0.5, 0.5), (0, y0 + direction * 0.2, 0.42), titanium_dark, bevel=0.12, segments=5)
    return body

band('BandTop', 1)
band('BandBottom', -1)
# Hebilla en el tramo inferior
rounded_box('Buckle', (3.5, 0.9, 0.5), (0, -(H / 2 + 7.0), 0.3), titanium, bevel=0.14, segments=6)
cylinder('BucklePin', 0.1, 3.0, (0, -(H / 2 + 7.0), 0.56), titanium_dark, rotation=(0, math.pi / 2, 0), vertices=16)

# ── Puck de carga USB-C bajo el reloj y cable hacia el Mac Studio ──
cylinder('ChargingPuck', 1.95, 0.5, (0, 0, -0.27), white, vertices=72, bevel=0.1)
cylinder('PuckCore', 1.5, 0.52, (0, 0, -0.27), titanium_dark, vertices=72)
cable = cylinder('UsbCable', 0.11, 9.0, (-2.6, 2.5, -0.35), white, rotation=(0, math.pi / 2, 0), vertices=16)
cable.location = (-6.3, 0.0, -0.35)
cylinder('CableRoot', 0.14, 1.6, (-2.7, 0, -0.35), white, rotation=(0, math.pi / 2, 0), vertices=16)
rounded_box('UsbCPlug', (0.9, 0.84, 0.28), (-11.2, 0, -0.35), titanium_dark, bevel=0.1, segments=4)

for obj in objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
print('WATCH_GLB_OK', out, len(objects), 'objetos')
