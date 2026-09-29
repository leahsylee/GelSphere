"""Encode Blender frames for responsive, reversible browser scrubbing.

Usage: python3 scripts/encode-exploded.py /tmp/gelsphere-render
Requires ffmpeg on PATH. Run from any directory; outputs go into static/.
"""
import argparse
from pathlib import Path
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('frames', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
videos = root / 'static/videos'
images = root / 'static/images'
for frame in range(97):
    if not (args.frames / f'{frame:04d}.png').is_file():
        parser.error(f'Missing Blender frame {frame:04d}.png')

def run(*arguments):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'warning', '-y', *map(str, arguments)], check=True)

with tempfile.TemporaryDirectory(prefix='gelsphere-encode-') as temporary:
    end = Path(temporary) / 'assembled-end.png'
    run('-sseof', '-0.05', '-i', videos / 'sensor-assembled.mp4',
        '-frames:v', 1, '-update', 1, end)
    # The first frame is the exact rolling-mechanism endpoint. Blend into the
    # new lighting/camera over four frames while the rendered camera pulls back.
    run('-framerate', 24, '-i', args.frames / '%04d.png',
        '-loop', 1, '-framerate', 24, '-i', end,
        '-filter_complex',
        "[1:v]scale=1000:1000,setsar=1[hold];"
        "[0:v][hold]blend=all_expr='A*min(T*6,1)+B*(1-min(T*6,1))',format=yuv420p[out]",
        '-map', '[out]', '-frames:v', 97, '-an', '-c:v', 'libx264',
        '-crf', 21, '-preset', 'medium', '-g', 1, '-keyint_min', 1,
        '-sc_threshold', 0, '-movflags', '+faststart', videos / 'sensor-exploded.mp4')
    run('-i', end, '-frames:v', 1, '-q:v', 2, '-update', 1,
        images / 'sensor-assembled-end.jpg')

for name, time in [('start', 0), ('end', 4)]:
    run('-ss', time, '-i', videos / 'sensor-exploded.mp4', '-frames:v', 1,
        '-q:v', 2, '-update', 1, images / f'sensor-exploded-{name}.jpg')
print('Encoded 97 independently seekable frames at 24 fps (4.04 seconds).')
