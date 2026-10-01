#!/usr/bin/env python3
"""Extract the supplied slide assets and prepare compact website media.

Requires Pillow and ffmpeg. Source slides and evaluation images are preserved.
"""
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'static/images/research'
OUT.mkdir(parents=True, exist_ok=True)


def save(im, name, limit=1200):
    im.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    im.save(OUT / f'{name}.webp', quality=94, method=6)


def crop_fraction(im, edges):
    l, t, r, b = edges
    return im.crop((round(im.width*l), round(im.height*t),
                    round(im.width*(1-r)), round(im.height*(1-b))))


with ZipFile(ROOT / 'source/presentations/GelSphere.pptx') as deck:
    def slide_image(number):
        return Image.open(BytesIO(deck.read(f'ppt/media/image{number}.png'))).convert('RGBA')

    # Slide 28: retain its actual raw / normal / accuracy mapping and crops.
    for number, name, edges in [
        (60, 'hex-reference', (.10728, .10547, .10736, .10917)),
        (61, 'hex-specular-normal', (.27336, .27332, .27331, .27332)),
        (62, 'hex-specular-raw', (.27336, .27336, .27331, .27331)),
        (63, 'hex-matte-raw', (0, 0, 0, 0)),
        (64, 'hex-matte-normal', (0, 0, 0, 0)),
        (67, 'hex-specular-accuracy', (0, 0, 0, 0)),
        (66, 'hex-matte-accuracy', (0, 0, 0, 0)),
        (65, 'hex-scale', (.80858, .14759, .00847, .09004)),
        (89, 'force-rig', (0, 0, 0, 0)),
        (85, 'feather-object', (.20629, 0, .26531, .26579)),
    ]:
        save(crop_fraction(slide_image(number), edges), name)

# Fade only the existing red landmark rings, preserving the underlying normals.
# These panel bounds come from the supplied correspondence_evaluation.png.
evaluation = Image.open(ROOT / 'source/figures/feather/correspondence-evaluation.png').convert('RGBA')
for name, source, left in [('reference', 'ground-truth-normal.png', 15),
                           ('specular', 'specular-normal.png', 508),
                           ('matte', 'matte-normal.png', 1000)]:
    normal = Image.open(ROOT / 'source/figures/feather' / source).convert('RGB')
    save(normal.crop((0, 0, 800, 1832)), f'feather-{name}', 920)
    marks = evaluation.crop((left, 411, left+466, 1867))
    # Extract the annotation layer; these are measured correspondences, not a
    # synthetic segmentation mask. Keep its registration with the original map.
    marks.putdata([(r, g, b, a if r > 180 and g < 110 and b < 110 else 0)
                   for r, g, b, a in marks.getdata()])
    marks = marks.resize((800, 2500), Image.Resampling.LANCZOS).crop((0, 0, 800, 1832))
    save(marks, f'feather-{name}-landmarks', 920)

# The supplied force movie has generous slide margins and burned-in headings.
# Crop those headings; the page supplies accessible labels in the website font.
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
    '-i', str(ROOT / 'source/videos/force-estimation.mp4'), '-vf', 'crop=1830:638:42:316,scale=1600:-2',
    '-an', '-c:v', 'libx264', '-crf', '21', '-preset', 'medium',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    str(ROOT / 'static/videos/force-comparison.mp4')], check=True)
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', '5', '-i', str(ROOT / 'static/videos/force-comparison.mp4'),
    '-frames:v', '1', '-q:v', '3', str(OUT / 'force-poster.jpg')], check=True)
print('Prepared slide illustrations, landmark overlays, and force comparison')
