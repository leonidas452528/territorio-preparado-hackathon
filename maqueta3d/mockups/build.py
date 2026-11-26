#!/usr/bin/env python3
"""Compone las maquetas: inserta una sola vez el arte de datos reales (curvas de nivel y manzanas de Cali) como <symbol> reutilizable."""
import re, pathlib
aqui = pathlib.Path(__file__).parent
def interior(p):
    t = (aqui / "assets" / p).read_text()
    vb = re.search(r'viewBox="([^"]+)"', t).group(1)
    return vb, re.sub(r'^<svg[^>]*>|</svg>$', '', t.strip())
vi, iso = interior("isolineas.svg"); vm, man = interior("manzanas.svg")
defs = (f'<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
        f'<symbol id="iso" viewBox="{vi}" preserveAspectRatio="xMidYMid slice">{iso}</symbol>'
        f'<symbol id="man" viewBox="{vm}" preserveAspectRatio="xMidYMid meet">{man}</symbol></defs></svg>')
for f in sorted((aqui / "src").glob("*.html")):
    (aqui / f.name).write_text(f.read_text().replace("<!--DEFS-->", defs))
    print("ok", f.name)
