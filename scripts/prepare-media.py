#!/usr/bin/env python3
"""Prepare web assets from the original research media. Requires ffmpeg."""
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
VIDEOS = ROOT / 'static/videos'
IMAGES = ROOT / 'static/images'


def encode(source, name, filters=None, start=None, duration=None):
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']
    if start is not None:
        cmd += ['-ss', str(start)]
    cmd += ['-i', str(ROOT / source)]
    if duration is not None:
        cmd += ['-t', str(duration)]
    if filters:
        cmd += ['-vf', filters]
    cmd += ['-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
            '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(VIDEOS / name)]
    subprocess.run(cmd, check=True)
    print(f'Prepared {name}', flush=True)


def poster(video, name, time):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                    '-ss', str(time), '-i', str(VIDEOS / video), '-frames:v', '1',
                    '-vf', 'scale=1280:-2', '-q:v', '3', str(IMAGES / name)], check=True)


def mechanism_clips():
    # Trim decoded frames, not keyframes. Adjacent clips share one boundary
    # frame, so the held pose is also the first frame of the next stage.
    source = 'Animations/GelSphere_crossSection_withouterMagent_animation_whiteBG.mp4'
    for name, first, stop in [
        ('optical-core', 0, 25),
        ('magnetic-suspension', 24, 61),
        ('ball-bearings', 60, 145),
        ('assembled', 144, 200),
    ]:
        video = f'sensor-{name}.mp4'
        encode(source, video,
               f'trim=start_frame={first}:end_frame={stop},setpts=PTS-STARTPTS')
        poster(video, f'sensor-{name}.jpg', 0)


def main():
    VIDEOS.mkdir(exist_ok=True)
    IMAGES.mkdir(exist_ok=True)
    # Keep only the specular demonstration; preserve both the raw image and mesh.
    encode('static/videos/live_reconstruction.mp4', 'overview-demo.mp4',
           'crop=840:824:992:172,scale=840:824', start=9, duration=19)
    # Screen recording: remove margins, cursor/recording controls at the end,
    # and unused audio. The six synchronized demonstrations stay together.
    recording = next(ROOT.glob('Screen Recording*.mov'))
    encode(recording, 'single-frame-demo.mp4',
           'crop=2248:1008:168:92,scale=1920:-2,fps=30', start=0.5, duration=30)
    encode('Animations/Trimmed Optics.mp4', 'optics-principle.mp4', 'scale=1500:1500')
    encode('Animations/GelSphere_crossSection_withouterMagent_animation_whiteBG.mp4',
           'sensor-assembly.mp4', 'scale=1500:1500')
    mechanism_clips()
    for video, image, time in [
        ('overview-demo.mp4', 'overview-poster.jpg', 12),
        ('single-frame-demo.mp4', 'single-frame-poster.jpg', 10),
        ('optics-principle.mp4', 'optics-poster.jpg', 1.8),
        ('sensor-assembly.mp4', 'sensor-poster.jpg', 0),
        ('live_reconstruction.mp4', 'continuous-poster.jpg', 28),
        ('teaser.mp4', 'project-poster.jpg', 0),
    ]:
        poster(video, image, time)
    for source, name in [('Exploded_View.png', 'exploded-view.png'),
                         ('new_CrossSection.png', 'cross-section.png')]:
        shutil.copy2(ROOT / source, IMAGES / name)
    for source, name in [('Single_and_hex_v2 (1).jpg', 'single_and_hex.jpg'),
                         ('Large_Surface (1).jpg', 'large_surface.jpg'),
                         ('Force_Estimation (9).jpg', 'force_estimation.jpg'),
                         ('Fabricated_v2.jpg', 'fabricated.jpg')]:
        shutil.copy2(ROOT / 'Figures' / source, IMAGES / name)


if __name__ == '__main__':
    main()
