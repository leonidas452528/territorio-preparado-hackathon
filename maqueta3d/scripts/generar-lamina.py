#!/usr/bin/env python3
"""Genera la «lámina» de una ciudad (curvas de nivel + manzanas) como SVG a partir de public/ciudad/escenarios.json.
Uso: python3 scripts/generar-lamina.py [ciudad_id]   (requiere numpy; solo en desarrollo)
Salida: public/art/<ciudad>-curvas.svg y <ciudad>-manzanas.svg (se incrustan en línea para poder tematizarlos con CSS)."""
import json, sys
import numpy as np

ciudad = sys.argv[1] if len(sys.argv) > 1 else "cali-co"
e = json.load(open("public/ciudad/escenarios.json"))
r = e["relieve"]; W, H = r["ancho"], r["alto"]
z = np.array(r["alturas"], dtype=float).reshape(H, W)[::2, ::2]
h, w = z.shape

def segmentos(nivel):
    out = []
    for j in range(h - 1):
        for i in range(w - 1):
            a, b, c, d = z[j, i], z[j, i + 1], z[j + 1, i + 1], z[j + 1, i]
            idx = (a > nivel) * 8 + (b > nivel) * 4 + (c > nivel) * 2 + (d > nivel)
            if idx in (0, 15): continue
            def I(p, q, x1, y1, x2, y2):
                t = (nivel - p) / (q - p) if q != p else .5
                return (round(x1 + (x2 - x1) * t, 1), round(y1 + (y2 - y1) * t, 1))
            T = I(a, b, i, j, i + 1, j); R = I(b, c, i + 1, j, i + 1, j + 1); B = I(d, c, i, j + 1, i + 1, j + 1); L = I(a, d, i, j, i, j + 1)
            out += {1: [(L, B)], 2: [(B, R)], 3: [(L, R)], 4: [(T, R)], 5: [(T, L), (B, R)], 6: [(T, B)], 7: [(T, L)], 8: [(T, L)], 9: [(T, B)], 10: [(T, R), (L, B)], 11: [(T, R)], 12: [(L, R)], 13: [(B, R)], 14: [(L, B)]}[idx]
    return out

def cadenas(segs):
    """Une segmentos que comparten extremo en polilíneas (reduce el tamaño del archivo)."""
    ext = {}
    for k, (p, q) in enumerate(segs):
        ext.setdefault(p, []).append(k); ext.setdefault(q, []).append(k)
    usado = [False] * len(segs); res = []
    for k0 in range(len(segs)):
        if usado[k0]: continue
        usado[k0] = True; p, q = segs[k0]; linea = [p, q]
        for sentido in (0, 1):
            while True:
                fin = linea[-1] if sentido == 0 else linea[0]
                sig = next((k for k in ext[fin] if not usado[k]), None)
                if sig is None: break
                usado[sig] = True; a, b = segs[sig]; nuevo = b if a == fin else a
                linea.append(nuevo) if sentido == 0 else linea.insert(0, nuevo)
        res.append(linea)
    return res

def trazado(niveles):
    d = []
    for n in niveles:
        for l in cadenas(segmentos(n)):
            d.append("M" + "L".join(f"{x:g} {y:g}" for x, y in l))
    return "".join(d)

fino = [n for n in range(1000, 3200, 50) if n % 250]
grueso = list(range(1000, 3200, 250))
open(f"public/art/{ciudad}-curvas.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w - 1} {h - 1}"><path class="f" d="{trazado(fino)}"/><path class="g" d="{trazado(grueso)}"/></svg>')

mz = e["manzanas"]; xs = [m[0] for m in mz]; ys = [m[1] for m in mz]
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
cls = {0: [], 1: [], 2: [], 3: []}
for m in mz:
    k = 0 if m[2] < 6 else 1 if m[2] < 12 else 2 if m[2] < 24 else 3
    cls[k].append(f"M{(m[0] - x0) / 10:.0f} {(y1 - m[1]) / 10:.0f}h6v6h-6z")
paths = "".join(f'<path class="h{k}" d="{"".join(v)}"/>' for k, v in cls.items())
open(f"public/art/{ciudad}-manzanas.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {(x1 - x0) / 10 + 6:.0f} {(y1 - y0) / 10 + 6:.0f}">{paths}</svg>')
# Proporciones para alinear las dos capas (fracciones del relieve que ocupa la caja de manzanas)
ox, oy, paso = r["oeste_sur"][0], r["oeste_sur"][1], r["paso"]
ancho_m, alto_m = W * paso, H * paso
geo = json.dumps({"left": round((x0 - ox) / ancho_m * 100, 1), "width": round((x1 - x0) / ancho_m * 100, 1), "top": round((1 - (y1 - oy) / alto_m) * 100, 1), "height": round((y1 - y0) / alto_m * 100, 1),
                  "centro": [round((0 - ox) / ancho_m * 100, 1), round((1 - (0 - oy) / alto_m) * 100, 1)], "aspecto": [w - 1, h - 1], "manzanas": len(mz), "cota_min": int(z.min()), "cota_max": int(z.max())})
open(f"public/art/{ciudad}.json", "w").write(geo)
print(geo)
