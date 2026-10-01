#!/usr/bin/env python3
"""Make a lightweight copy of the original GelSLAM slides for native export.

All slide objects, crops, groups, animations, and Morph transitions are retained.
The source deck is never changed. Requires lxml.
"""
import argparse
import posixpath
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from lxml import etree as ET

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path)
args = parser.parse_args()
args.output.parent.mkdir(parents=True, exist_ok=True)
ns = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
slides = {f'slides/slide{i}.xml' for i in (29, 30, 31)}

with ZipFile(ROOT / 'source/presentations/GelSphere.pptx') as source:
    def xml(name):
        return ET.fromstring(source.read(name))

    def serialized(node):
        return ET.tostring(node, xml_declaration=True, encoding='UTF-8', standalone=True)

    presentation = xml('ppt/presentation.xml')
    relationships = xml('ppt/_rels/presentation.xml.rels')
    retained = set()
    for rel in list(relationships):
        if rel.get('Type').endswith('/slide'):
            if rel.get('Target') in slides:
                retained.add(rel.get('Id'))
            else:
                relationships.remove(rel)
    slide_ids = presentation.find('p:sldIdLst', ns)
    for slide in list(slide_ids):
        if slide.get(f'{{{ns["r"]}}}id') not in retained:
            slide_ids.remove(slide)
    # Custom shows may refer to excluded slides; the three-slide copy has none.
    for node in presentation.findall('p:custShowLst', ns):
        presentation.remove(node)
    overrides = {'ppt/presentation.xml': serialized(presentation),
                 'ppt/_rels/presentation.xml.rels': serialized(relationships)}
    available = set(source.namelist())
    kept = set()

    def visit(part):
        if part in kept or part not in available:
            return
        kept.add(part)
        parent, filename = posixpath.split(part)
        relpath = posixpath.join(parent, '_rels', filename + '.rels')
        if relpath not in available:
            return
        kept.add(relpath)
        for rel in ET.fromstring(overrides.get(relpath, source.read(relpath))):
            if rel.get('TargetMode') == 'External':
                continue
            target = rel.get('Target')
            visit(target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(parent, target)))

    kept.add('_rels/.rels')
    for rel in xml('_rels/.rels'):
        if rel.get('TargetMode') != 'External':
            visit(rel.get('Target').lstrip('/'))
    content_types = xml('[Content_Types].xml')
    for entry in list(content_types):
        if entry.tag.endswith('}Override') and entry.get('PartName').lstrip('/') not in kept:
            content_types.remove(entry)
    overrides['[Content_Types].xml'] = serialized(content_types)
    kept.add('[Content_Types].xml')
    with ZipFile(args.output, 'w', ZIP_DEFLATED) as out:
        for part in sorted(kept):
            out.writestr(part, overrides.get(part, source.read(part)))
print(f'Prepared {args.output} ({args.output.stat().st_size / 1024**2:.1f} MB)')
