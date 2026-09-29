"""Render the scroll animation from the supplied exploded-view Blender scene.

Run with Blender, keeping the original .blend unchanged:
  blender -b GelSphere_exploded_image.blend --disable-autoexec \
    --python scripts/render-exploded.py -- --output /tmp/gelsphere-render

The model's top-level component origins define the assembled pose. Their saved
transforms define the exploded pose. Rendering keeps the original meshes,
materials, internal parents, and lighting.
"""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--size', type=int, default=1000)
parser.add_argument('--samples', type=int, default=16)
parser.add_argument('--frames', help='Optional comma-separated preview frames, 0–96')
parser.add_argument('--device', choices=['METAL', 'CPU'], default='METAL')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
args.output.mkdir(parents=True, exist_ok=True)

scene = bpy.context.scene
scene.frame_set(0)
camera = scene.camera
roots = [o for o in scene.objects if o.type == 'MESH' and not o.parent and o.name != 'Cube']
exploded = {o.name: (o.location.copy(), o.rotation_euler.copy()) for o in roots}
for obj in scene.objects:
    obj.animation_data_clear()
if scene.rigidbody_world:
    scene.rigidbody_world.enabled = False

if args.device == 'METAL':
    preferences = bpy.context.preferences.addons['cycles'].preferences
    preferences.compute_device_type = 'METAL'
    preferences.get_devices()
    for device in preferences.devices:
        device.use = device.type == 'METAL'
scene.cycles.device = 'GPU' if args.device == 'METAL' else 'CPU'
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
# Rebuild render data between poses: the Metal backend can retain stale
# geometry/lighting when these imported component transforms move.
scene.render.use_persistent_data = False
scene.render.resolution_x = scene.render.resolution_y = args.size
scene.render.resolution_percentage = 100
scene.render.fps = 24
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.film_transparent = False
camera.data.clip_start = 0.001
camera.data.sensor_fit = 'HORIZONTAL'
camera.data.lens = 110

# Keep the original light enclosure for illumination, but show a pure white
# camera background so the footage blends into the website.
bpy.data.objects['Cube'].visible_camera = False
nodes, links = scene.world.node_tree.nodes, scene.world.node_tree.links
output = next(node for node in nodes if node.type == 'OUTPUT_WORLD')
original_background = output.inputs['Surface'].links[0].from_socket
light_path = nodes.new('ShaderNodeLightPath')
white = nodes.new('ShaderNodeBackground')
white.inputs['Color'].default_value = (1, 1, 1, 1)
mix = nodes.new('ShaderNodeMixShader')
links.new(light_path.outputs['Is Camera Ray'], mix.inputs[0])
links.new(original_background, mix.inputs[1])
links.new(white.outputs[0], mix.inputs[2])
links.new(mix.outputs[0], output.inputs['Surface'])

def smooth(t):
    t = min(1, max(0, t))
    return t * t * (3 - 2 * t)

def pose(frame):
    progress = frame / 96
    separation = smooth((progress - 0.08) / 0.92)
    framing = smooth(progress)
    for obj in roots:
        location, rotation = exploded[obj.name]
        obj.location = location * separation
        obj.rotation_euler = tuple(angle * separation for angle in rotation)
    target = Vector((0, 0, 0.018)).lerp(Vector((-0.015, -0.01, 0.141)), framing)
    distance = 0.355 + (1.35 - 0.355) * framing
    elevation = math.radians(35 + (20.6 - 35) * framing)
    azimuth = math.radians(205 + (134.94 - 205) * framing)
    direction = Vector((math.cos(azimuth) * math.cos(elevation),
                        math.sin(azimuth) * math.cos(elevation), math.sin(elevation)))
    camera.location = target + direction * distance
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()

frames = [int(f) for f in args.frames.split(',')] if args.frames else range(97)
for frame in frames:
    pose(frame)
    scene.render.filepath = str(args.output / f'{frame:04d}.png')
    result = bpy.ops.render.render(write_still=True)
    if 'FINISHED' not in result:
        raise RuntimeError(f'Render interrupted at frame {frame}')
    print(f'EXPLODED_FRAME {frame}/96', flush=True)

# Export actual projected component centers for aligning the HTML/SVG labels.
pose(96)
anchors = {}
for name in ['cap_PLA', 'silicone_top_gray', 'PCB', 'internal_base_PLA',
             'camera_board_', 'battery_lightgray', 'switch', 'switch_magnet',
             'body_left_PLA', 'inner_base_magnet']:
    obj = scene.objects[name]
    center = sum((obj.matrix_world @ Vector(v) for v in obj.bound_box), Vector()) / 8
    point = world_to_camera_view(scene, camera, center)
    anchors[name] = [round(point.x * 1000, 2), round((1 - point.y) * 1000, 2)]
(args.output / 'anchors.json').write_text(json.dumps(anchors, indent=2))
print('EXPLODED_RENDER_COMPLETE', flush=True)
