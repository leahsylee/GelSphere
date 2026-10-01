#!/usr/bin/env python3
"""Encode click-to-advance clips from PowerPoint's native GelSLAM MP4 export."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'source/videos/gelslam-powerpoint-export.mp4'
VIDEOS = ROOT / 'static/videos'
IMAGES = ROOT / 'static/images/research'


def run(*args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                    *map(str, args)], check=True)


# Keep the native geometry intact. Remove only the title/footer margins.
# Frame boundaries are on a normalized 30 fps timeline. Adjacent stages share
# their held boundary pose; the idle hold between alignment and fusion is cut.
# The last red scan patch is fully visible before tactile images enter at 84.
stages = [('scan', 0, 84), ('match', 83, 150),
          ('align', 149, 221), ('fuse', 360, 574)]
filters = 'fps=30,crop=1780:800:70:210,scale=1602:720'
for name, first, stop in stages:
    output = VIDEOS / f'gelslam-{name}.mp4'
    run('-i', SOURCE, '-vf', filters + f',trim=start_frame={first}:end_frame={stop},setpts=PTS-STARTPTS',
        '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output)
    for position, time in [('start', 0), ('end', (stop-first-1)/30)]:
        run('-ss', time, '-i', output, '-frames:v', '1', '-q:v', '2',
            IMAGES / f'gelslam-{name}-{position}.jpg')
    print(f'Prepared {name}: {stop-first} frames')
# A complete video remains available through native controls without scripting.
concat = ';'.join(
    f'[0:v]{filters},trim=start_frame={first}:end_frame={stop},setpts=PTS-STARTPTS[v{i}]'
    for i, (_, first, stop) in enumerate(stages))
concat += ';' + ''.join(f'[v{i}]' for i in range(4)) + 'concat=n=4:v=1:a=0[out]'
run('-i', SOURCE, '-filter_complex', concat, '-map', '[out]', '-an',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', VIDEOS / 'gelslam-presentation.mp4')
