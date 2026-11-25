"""Galaxy Z Fold5 · editable procedural Blender asset for AInimation Studio.

HEADLESS: Blender --background --factory-startup --python galaxy-z-fold5.py -- [output-directory]

Units are 10 mm. Samsung nominal body: open W129.9/H154.9/D6.1 mm;
closed W67.1/H154.9/D13.4 mm, excluding camera rings and side buttons.
Source: Samsung Global Newsroom, Galaxy Z Flip5 / Fold5 announcement, 26 July 2023.
The camera rings, ports, colours and hinge mechanism are a visual reconstruction,
not a manufacturing CAD model. No player configuration or IoT tags are embedded.

Opening angle A = 180 degrees flat; 90 Flex; 0 closed.
Blender: beta=(180-A)*pi/360; FoldLeft.rotation.y=beta, FoldRight.rotation.y=-beta.
GLB / Three.js (+Y up): FoldLeft.rotation.z=-beta, FoldRight.rotation.z=beta.
HingeShell.position.y=.305+.365*sin(beta) in Three.js (Blender location.z).
The articulated groups share the pivot (0, .67, 0) in GLB coordinates.
At every A in [0,180], the two rigid leaves remain on opposite sides of X=0.

ScreenLeft and ScreenRight share one continuous UV domain: U0..0.5 / U0.5..1.
The display is +Z-facing in Blender and +Y-facing in GLB; CoverScreen is on
the exterior of FoldLeft. Camera rings are on the exterior of FoldRight.
Runtime material replacements should preserve each mesh's exported UVs.
"""

import bpy
import json
import math
import os
import sys
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(ARGS[0]) if ARGS else os.path.dirname(HERE)
os.makedirs(OUT, exist_ok=True)
MODEL_DIR = os.path.join(OUT, 'model')
os.makedirs(MODEL_DIR, exist_ok=True)
GLB_PATH = os.path.join(OUT, 'galaxy-z-fold5.glb')
BLEND_PATH = os.path.join(MODEL_DIR, 'galaxy-z-fold5.blend')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = .01

W, H, T = 12.99, 15.49, .61
PIVOT_Z, HINGE_REST = .67, .305
SW, SH = 12.36, 14.84
HALF = W / 2
model_objects = []

def material(name, colour, metal=0, rough=.4, emission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*colour, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = rough
    if emission:
        shader.inputs['Emission Color'].default_value = (*colour, 1)
        shader.inputs['Emission Strength'].default_value = emission
    return mat

graphite = material('Graphite · satin Armor Aluminium', (.095, .103, .112), .86, .28)
back_glass = material('Graphite · matte rear glass', (.065, .071, .081), .12, .31)
polished = material('Graphite · polished chamfer', (.205, .22, .235), .95, .19)
rubber = material('Black · seals and antenna breaks', (.009, .012, .017), .05, .52)
glass = material('Black glass bezel', (.006, .009, .015), .2, .13)
lens_glass = material('Optical glass · blue coating', (.008, .02, .033), .36, .1)
lens_glint = material('Optical glass · fine reflection', (.025, .08, .125), .44, .15)
flash_mat = material('Flash diffuser', (.81, .77, .64), .05, .33)
logo_mat = material('Laser-etched Samsung mark', (.13, .145, .16), .5, .4)

def display_material(name):
    mat = material(name, (.008, .025, .048), .05, .2)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    shader = nodes.get('Principled BSDF')
    uv = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 2.4
    noise.inputs['Detail'].default_value = 1.8
    noise.inputs['Roughness'].default_value = .55
    links.new(uv.outputs['UV'], noise.inputs['Vector'])
    ramp = nodes.new('ShaderNodeValToRGB')
    colours = [(.0, (.003, .006, .015, 1)), (.38, (.006, .017, .04, 1)),
               (.52, (.01, .07, .095, 1)), (.62, (.04, .25, .22, 1)),
               (.74, (.22, .43, .33, 1)), (1.0, (.38, .58, .42, 1))]
    ramp.color_ramp.elements.remove(ramp.color_ramp.elements[1])
    ramp.color_ramp.elements[0].position = colours[0][0]
    ramp.color_ramp.elements[0].color = colours[0][1]
    for position, colour in colours[1:]:
        ramp.color_ramp.elements.new(position).color = colour
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], shader.inputs['Base Color'])
    links.new(ramp.outputs['Color'], shader.inputs['Emission Color'])
    shader.inputs['Emission Strength'].default_value = .45
    return mat

inner_display = display_material('Inner display · replace with runtime canvas')
cover_display = display_material('Cover display · replace with runtime canvas')

def empty(name, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.empty_display_type = 'PLAIN_AXES'
    obj.empty_display_size = .4
    if parent:
        obj.parent = parent
    model_objects.append(obj)
    return obj

root = empty('GalaxyZFold5')
left = empty('FoldLeft', (0, 0, PIVOT_Z), root)
right = empty('FoldRight', (0, 0, PIVOT_Z), root)
hinge = empty('HingeShell', (0, 0, HINGE_REST), root)
bpy.context.view_layer.update()

def finish(obj, name, mat, parent):
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world
    model_objects.append(obj)
    return obj

def outline(x0, x1, y0, y1, radii, steps=10):
    # Corners counter-clockwise: bottom-right, top-right, top-left, bottom-left.
    result = []
    for cx, cy, radius, start in [
        (x1-radii[0], y0+radii[0], radii[0], -90),
        (x1-radii[1], y1-radii[1], radii[1], 0),
        (x0+radii[2], y1-radii[2], radii[2], 90),
        (x0+radii[3], y0+radii[3], radii[3], 180),
    ]:
        points = [(cx, cy)] if radius == 0 else [
            (cx+radius*math.cos(math.radians(start+i*90/steps)),
             cy+radius*math.sin(math.radians(start+i*90/steps)))
            for i in range(steps+1)
        ]
        for point in points:
            if not result or Vector(point).xy != Vector(result[-1]).xy:
                result.append(point)
    return result

def slab(name, bounds, z0, z1, radii, mat, parent, bevel=.012):
    points = outline(*bounds, radii)
    n = len(points)
    vertices = [(x, y, z0) for x, y in points] + [(x, y, z1) for x, y in points]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2*n))]
    faces += [(i, (i+1) % n, (i+1) % n+n, i+n) for i in range(n)]
    mesh = bpy.data.meshes.new(name+' mesh')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    for polygon in mesh.polygons:
        polygon.use_smooth = len(polygon.vertices) == 4
    if bevel:
        mod = obj.modifiers.new('Fine machined edge', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
    return finish(obj, name, mat, parent)

def box(name, size, location, mat, parent, bevel=.025, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Rounded edges', 'BEVEL')
        mod.width = min(bevel, min(size)/2.1)
        mod.segments = 4
    return finish(obj, name, mat, parent)

def cylinder(name, radius, depth, location, mat, parent, rotation=(0, 0, 0), vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                      location=location, rotation=rotation)
    obj = bpy.context.object
    for face in obj.data.polygons:
        face.use_smooth = len(face.vertices) == 4
    bevel = obj.modifiers.new('Turned edge', 'BEVEL')
    bevel.width = min(.012, depth/4)
    bevel.segments = 3
    return finish(obj, name, mat, parent)

def screen(name, bounds, radii, z, mat, parent, exterior=False):
    points = outline(*bounds, radii, steps=14)
    cx = (bounds[0]+bounds[1])/2
    cy = (bounds[2]+bounds[3])/2
    vertices = [(cx, cy, z)] + [(x, y, z) for x, y in points]
    faces = [(0, i+1, (i+1) % len(points)+1) for i in range(len(points))]
    if exterior:
        faces = [tuple(reversed(face)) for face in faces]
    mesh = bpy.data.meshes.new(name+' continuous UV mesh')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name='DisplayUV')
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vertex = vertices[mesh.loops[loop_index].vertex_index]
            if exterior:
                u = .5-(vertex[0]-cx)/(bounds[1]-bounds[0])
                v = (vertex[1]-bounds[2])/(bounds[3]-bounds[2])
            else:
                u, v = vertex[0]/SW+.5, vertex[1]/SH+.5
            uv.data[loop_index].uv = (u, v)
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    return finish(obj, name, mat, parent)

# Two shells. Rounded outer corners are a profile, so their radius does not get
# clamped to half the 6.1 mm thickness as it would with a bevelled primitive cube.
for side, parent in [(-1, left), (1, right)]:
    suffix = 'Left' if side < 0 else 'Right'
    x0, x1 = (-HALF, -.025) if side < 0 else (.025, HALF)
    radii = (.07, .07, .62, .62) if side < 0 else (.62, .62, .07, .07)
    slab('Frame'+suffix, (x0, x1, -H/2, H/2), .025, T-.025, radii, graphite, parent)
    slab('LowerChamfer'+suffix, (x0+.009, x1-.009, -H/2+.009, H/2-.009), .025, .045,
         radii, polished, parent, .006)
    slab('UpperChamfer'+suffix, (x0+.009, x1-.009, -H/2+.009, H/2-.009), T-.045, T-.025,
         radii, polished, parent, .006)
    slab('RearGlass'+suffix, (x0+.06, x1-.06, -H/2+.065, H/2-.065), 0, .029,
         tuple(max(.025, radius-.05) for radius in radii), back_glass, parent, .006)
    slab('InnerBezel'+suffix, (x0+.025, x1-.025, -H/2+.06, H/2-.06), T-.031, T,
         tuple(max(.02, radius-.025) for radius in radii), glass, parent, .006)

screen('ScreenLeft', (-SW/2, 0, -SH/2, SH/2), (0, 0, .34, .34), T+.003, inner_display, left)
screen('ScreenRight', (0, SW/2, -SH/2, SH/2), (.34, .34, 0, 0), T+.003, inner_display, right)

# Exterior left: the tall 6.2-inch cover display, black bezel, centred 10 MP camera.
cover_cx, cover_w, cover_h = -HALF/2, 5.68, 14.55
cover_bounds = (cover_cx-cover_w/2, cover_cx+cover_w/2, -cover_h/2, cover_h/2)
slab('CoverBezel', (cover_bounds[0]-.08, cover_bounds[1]+.08, -cover_h/2-.08, cover_h/2+.08),
     -.012, .004, (.5,)*4, glass, left, .005)
screen('CoverScreen', cover_bounds, (.44,)*4, -.015, cover_display, left, exterior=True)
cylinder('CoverCameraRing', .115, .008, (cover_cx, 6.82, -.025), rubber, left)
cylinder('CoverCameraLens', .073, .009, (cover_cx, 6.82, -.033), lens_glass, left)

# Interior under-display camera: deliberately subtle, unlike a hole-punch screen.
cylinder('UnderDisplayCamera', .071, .003, (3.6, 6.56, T+.005),
         material('Under-display optical aperture', (.025, .06, .075), .12, .36), right, vertices=32)

# Exterior right: three separate raised lens rings and the Fold5 camera island.
cx, cy = 5.15, 5.15
slab('CameraIsland', (cx-.67, cx+.67, cy-2.04, cy+2.04), -.082, -.005,
     (.62,)*4, graphite, right, .015)
for index, dy in enumerate((1.34, 0, -1.34), 1):
    y = cy+dy
    cylinder('CameraRing'+str(index), .545, .145, (cx, y, -.145), polished, right)
    cylinder('CameraSeal'+str(index), .468, .012, (cx, y, -.224), rubber, right)
    cylinder('CameraLens'+str(index), .402, .015, (cx, y, -.234), lens_glass, right)
    cylinder('CameraOptic'+str(index), .21 if index != 2 else .16, .003,
             (cx-.035, y+.025, -.244), lens_glint, right, vertices=40)
    cylinder('LensGlint'+str(index), .038, .002, (cx-.17, y+.17, -.247),
             material('Lens highlight '+str(index), (.16, .23, .27), .5, .18), right, vertices=20)
cylinder('RearFlashRim', .205, .022, (cx-1.0, cy+.53, -.025), graphite, right, vertices=32)
cylinder('RearFlash', .145, .025, (cx-1.0, cy+.53, -.04), flash_mat, right, vertices=32)

# Samsung's understated laser etch on the rear glass (mesh, no external fonts).
bpy.ops.object.text_add(location=(HALF/2, -3.7, -.012), rotation=(math.pi, 0, 0))
logo = bpy.context.object
logo.data.body = 'SAMSUNG'
logo.data.align_x = 'CENTER'
logo.data.align_y = 'CENTER'
logo.data.size = .41
logo.data.space_character = 1.18
logo.data.extrude = .0007
bpy.ops.object.convert(target='MESH')
finish(bpy.context.object, 'SamsungRearMark', logo_mat, right)

# Right outer edge: fingerprint/power key and two halves of the volume rocker.
box('SideButton', (.071, 1.11, .25), (HALF+.022, 2.4, .30), graphite, right, .025)
box('VolumeUp', (.067, .86, .175), (HALF+.02, 4.84, .30), polished, right, .025)
box('VolumeDown', (.067, .86, .175), (HALF+.02, 3.97, .30), polished, right, .025)

# Port and grille on the lower right leaf, stereo grille on the upper left leaf.
box('UsbCPort', (.88, .032, .23), (HALF/2, -H/2-.006, .29), rubber, right, .09)
box('UsbCInnerTongue', (.54, .038, .043), (HALF/2, -H/2-.025, .29), polished, right, .012)
for index in range(6):
    cylinder('BottomSpeaker'+str(index), .046, .034, (4.65+index*.235, -H/2-.008, .30),
             rubber, right, rotation=(math.pi/2, 0, 0), vertices=18)
    cylinder('TopSpeaker'+str(index), .046, .034, (-4.65-index*.235, H/2+.008, .30),
             rubber, left, rotation=(math.pi/2, 0, 0), vertices=18)
cylinder('BottomMicrophone', .038, .034, (1.48, -H/2-.008, .30), rubber, right,
         rotation=(math.pi/2, 0, 0), vertices=18)
cylinder('TopMicrophone', .038, .034, (-1.48, H/2+.008, .30), rubber, left,
         rotation=(math.pi/2, 0, 0), vertices=18)

for side, parent in [(-1, left), (1, right)]:
    for index, y in enumerate((-5.65, 5.65)):
        box(('Left' if side < 0 else 'Right')+'AntennaBreak'+str(index),
            (.027, .054, .50), (side*(HALF+.003), y, .30), rubber, parent, .007)
# SIM tray seam and its pinhole along the left frame.
box('SimTraySeam', (.012, 2.0, .22), (-HALF-.006, 1.8, .30), rubber, left, .005)
box('SimTray', (.016, 1.87, .17), (-HALF-.014, 1.8, .30), graphite, left, .005)
cylinder('SimPin', .025, .018, (-HALF-.026, 2.54, .30), rubber, left,
         rotation=(0, math.pi/2, 0), vertices=16)

# The central shell follows a simple moving-axis approximation to the waterdrop
# hinge. It is concealed below the interior display in the flat pose.
cylinder('HingeBarrel', .215, H-.55, (0, 0, HINGE_REST), graphite, hinge,
         rotation=(math.pi/2, 0, 0), vertices=64)
for y in (-H/2+.28, H/2-.28):
    cylinder('HingeEnd'+('Top' if y > 0 else 'Bottom'), .216, .05,
             (0, y, HINGE_REST), polished, hinge, rotation=(math.pi/2, 0, 0), vertices=48)

# Editable pose control in the .blend. Runtime viewers can apply the documented
# transforms directly; drivers are not required by the GLB.
root['opening_degrees'] = 180.0
root.id_properties_ui('opening_degrees').update(min=0, max=180, description='180 flat · 90 Flex · 0 closed')
for group, sign in [(left, 1), (right, -1)]:
    driver = group.driver_add('rotation_euler', 1).driver
    variable = driver.variables.new()
    variable.name = 'angle'
    variable.targets[0].id = root
    variable.targets[0].data_path = '["opening_degrees"]'
    driver.expression = str(sign)+'*(180-angle)*pi/360'
driver = hinge.driver_add('location', 2).driver
variable = driver.variables.new()
variable.name = 'angle'
variable.targets[0].id = root
variable.targets[0].data_path = '["opening_degrees"]'
driver.expression = '.305+.365*sin((180-angle)*pi/360)'

def set_pose(angle):
    root['opening_degrees'] = float(angle)
    root.update_tag()
    scene.frame_set(scene.frame_current)
    bpy.context.view_layer.update()

def bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == 'MESH'
              for corner in obj.bound_box]
    minimum = [min(point[axis] for point in points) for axis in range(3)]
    maximum = [max(point[axis] for point in points) for axis in range(3)]
    return {'min': minimum, 'max': maximum, 'size': [maximum[i]-minimum[i] for i in range(3)]}

poses = {}
for angle in (180, 90, 0):
    set_pose(angle)
    poses[str(angle)] = bounds(model_objects)
    # All geometry of the two rigid leaves, including their displays, is kept
    # strictly on its own side of the centre plane. No leaf-to-leaf penetration.
    for parent, sign in [(left, -1), (right, 1)]:
        for obj in parent.children:
            if obj.type != 'MESH':
                continue
            xs = [(obj.matrix_world @ Vector(corner)).x for corner in obj.bound_box]
            if (sign < 0 and max(xs) > .00001) or (sign > 0 and min(xs) < -.00001):
                raise AssertionError('Leaf crosses hinge plane: '+obj.name+' pose '+str(angle))
set_pose(180)

# Export only the model and articulated empties. The preview studio is added
# later and therefore cannot leak into the GLB.
bpy.ops.object.select_all(action='DESELECT')
for obj in model_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.export_scene.gltf(filepath=GLB_PATH, export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True, export_animations=False,
                          export_extras=False, export_cameras=False, export_lights=False)

# Preview studio for the editable .blend and its poster. This is not in the GLB.
studio = bpy.data.collections.new('Preview studio · not exported')
scene.collection.children.link(studio)
def studio_link(obj):
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    studio.objects.link(obj)
    return obj

world = bpy.data.worlds.new('Graphite studio')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.12, .15, .19, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .55
scene.world = world

def light(name, location, energy, size, target, colour):
    obj = bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA'))
    studio.objects.link(obj)
    obj.location = location
    obj.data.energy = energy
    obj.data.shape = 'DISK'
    obj.data.size = size
    obj.data.color = colour
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z', 'Y').to_euler()
    return obj

light('Large softbox', (-9, 4, 18), 1900, 12, (0, 0, 0), (.78, .88, 1))
light('Warm edge', (10, 5, 11), 1450, 9, (0, 0, 0), (1, .87, .72))
light('Top strip', (0, -12, 8), 1150, 8, (0, 0, 0), (.62, .83, 1))

bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.31))
floor = studio_link(bpy.context.object)
floor.name = 'Preview floor · not exported'
floor.data.materials.append(material('Studio floor', (.027, .035, .048), .15, .42))

camera_data = bpy.data.cameras.new('Preview camera')
camera = bpy.data.objects.new('Preview camera', camera_data)
studio.objects.link(camera)
scene.camera = camera
camera_data.lens = 58
def point_camera(location, target):
    camera.location = location
    camera.rotation_euler = (Vector(target)-camera.location).to_track_quat('-Z', 'Y').to_euler()

point_camera((19, -24, 34), (0, 0, .3))
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 1280
scene.render.resolution_y = 1120
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.render.filepath = os.path.join(OUT, 'poster.png')
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
bpy.ops.render.render(write_still=True)

# Additional low-cost visual checks: closed exterior and 90-degree Flex. Keep
# them with the source so reviewers can distinguish offline renders from a
# screenshot or the physical player's current picture.
scene.render.resolution_x = 1000
scene.render.resolution_y = 1000
scene.cycles.samples = 24
set_pose(90)
point_camera((18, -24, 21), (0, 0, 2.8))
scene.render.filepath = os.path.join(MODEL_DIR, 'fold5-flex-check.png')
bpy.ops.render.render(write_still=True)
set_pose(0)
point_camera((-21, -27, 16), (0, 0, 3.5))
scene.render.filepath = os.path.join(MODEL_DIR, 'fold5-closed-check.png')
bpy.ops.render.render(write_still=True)
set_pose(180)
point_camera((19, -24, 34), (0, 0, .3))
scene.render.resolution_x = 1280
scene.render.resolution_y = 1120
scene.cycles.samples = 32
scene.render.filepath = os.path.join(OUT, 'poster.png')

# Save the editable file in its base (flat) pose, with the original camera.
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
report = {'units': '10 mm', 'nominalBodyMm': {
          'open': {'width': 129.9, 'height': 154.9, 'depth': 6.1},
          'closed': {'width': 67.1, 'height': 154.9, 'depth': 13.4}},
          'glbUp': '+Y', 'webScaleForWidth3': 3/W,
          'blenderPoseBounds': poses, 'modelObjects': len(model_objects),
          'uv': {'ScreenLeft': [0, .5], 'ScreenRight': [.5, 1], 'CoverScreen': [0, 1]},
          'rig': {'pivotGLB': [0, .67, 0], 'beta': '(180-openingDegrees)*Math.PI/360',
                  'FoldLeft.rotation.z': '-beta', 'FoldRight.rotation.z': 'beta',
                  'HingeShell.position.y': '.305+.365*Math.sin(beta)'}}
with open(os.path.join(MODEL_DIR, 'geometry-report.json'), 'w') as stream:
    json.dump(report, stream, indent=2)
print('FOLD5_ASSET_OK', json.dumps(report))
