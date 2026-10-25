"""Regenera public/fonts/material-symbols-subset.woff2 con solo los iconos que usa la app.

La fuente completa (material-symbols-0.ttf, ~950 KB) se descargaba en el panel por dos iconos.
El subconjunto conserva las letras y las ligaduras de los nombres de icono que aparecen en
src/app (.ts y .html). Si agregas un icono nuevo, vuelve a ejecutar:
    pip install fonttools brotli && python3 scripts/subset-icons.py
`npm run check:icons` falla si un icono usado no está en el subconjunto.
"""
import glob, os, re
from fontTools import subset
from fontTools.ttLib import TTFont

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
font = TTFont(os.path.join(root, 'public/fonts/material-symbols-0.ttf'))
# Los nombres de icono son ligaduras (rlig): 'restore' produce el glifo 'history', etc.
cmap = {g: chr(c) for c, g in font.getBestCmap().items()}
ligatures = {}
for lookup in font['GSUB'].table.LookupList.Lookup:
    for table in lookup.SubTable:
        table = getattr(table, 'ExtSubTable', table)
        for first, items in getattr(table, 'ligatures', {}).items():
            for lig in items:
                if first in cmap and all(c in cmap for c in lig.Component):
                    ligatures[cmap[first] + ''.join(cmap[c] for c in lig.Component)] = lig.LigGlyph
tokens = set()
for path in glob.glob(os.path.join(root, 'src/app/**/*.*'), recursive=True):
    if path.endswith(('.ts', '.html')) and not path.endswith('.spec.ts'):
        tokens |= set(re.findall(r'[a-z][a-z0-9_]*', open(path, encoding='utf8').read()))
icons = sorted(t for t in tokens if t in ligatures)
names = set(font.getGlyphOrder())
glyphs = sorted({ligatures[i] for i in icons})
glyphs += [g + '.fill' for g in glyphs if g + '.fill' in names]
options = subset.Options()
options.layout_closure = False  # sin esto se conservarían todas las ligaduras de la fuente
options.layout_features = ['*']
options.flavor = 'woff2'
subsetter = subset.Subsetter(options)
subsetter.populate(glyphs=glyphs, text='abcdefghijklmnopqrstuvwxyz0123456789_ ')
subsetter.subset(font)
font.flavor = 'woff2'
font.save(os.path.join(root, 'public/fonts/material-symbols-subset.woff2'))
with open(os.path.join(root, 'public/fonts/material-symbols-subset.txt'), 'w') as out:
    out.write('\n'.join(i for i in icons if len(i) > 1) + '\n')
print(f'{len(icons)} nombres conservados')
