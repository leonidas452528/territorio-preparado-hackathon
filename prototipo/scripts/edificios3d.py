"""Edificios del catastro para la maqueta 3D realista.

Entrada: prototipo/datos/raw/ciudad3d/edificios/e_*.json (bajar_edificios.sh: solo geometría, npisos y área),
         raw/ciudad3d/manzanas.json y las capas de amenaza de la app (maqueta3d/public/data/flood.json, seismic.json).
Salida (prototipo/datos/procesados/ciudad3d/):
  edificios.bin.gz  por teselas de 1 km; por edificio: pisos (u8), banderas (u8), n (u8) y n vértices int16 en
                    unidades de 0,2 m: el primero respecto al origen de la tesela y los demás como diferencia con el anterior.
                    Banderas: bits 0-1 nivel de inundación (0-3), bit 2 licuación/corrimiento, bit 3 sin dato de pisos.
  mascaras.bin.gz   máscara de manzanas cada 8 m (calles = 0) + nivel de inundación cada 20 m (u8, fila 0 = sur).
  edificios.json    índice de teselas y dimensiones de las máscaras.
"""
import gzip
import json
import math
import struct
from pathlib import Path

from PIL import Image, ImageDraw

from ciudad3d import CAJA, KX, KY, ORIGEN, RAW, OUT, local, nivel_inundacion, simplificar
from geo import _anillos

APP = Path(__file__).resolve().parents[2] / "maqueta3d" / "public" / "data"
TESELA = 1000  # m
O, E, S, N = CAJA
X0, Y0 = local(O, S)
X1, Y1 = local(E, N)


def raster(res, poligonos):
    """poligonos: [(anillo_en_metros, valor)], en orden (el último gana). Devuelve (ancho, alto, bytes) con fila 0 = sur."""
    ancho, alto = math.ceil((X1 - X0) / res), math.ceil((Y1 - Y0) / res)
    img = Image.new("L", (ancho, alto), 0)
    lapiz = ImageDraw.Draw(img)
    for anillo, valor in poligonos:
        if len(anillo) >= 3:
            lapiz.polygon([((x - X0) / res, (Y1 - y) / res) for x, y in anillo], fill=valor)
    return ancho, alto, img.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()


def capa(nombre, valor):
    out = []
    for f in json.load(open(APP / f"{nombre}.json"))["features"]:
        v = valor(f["properties"])
        out += [([local(*c[:2]) for c in p[0]], v) for p in _anillos(f["geometry"])]
    return sorted(out, key=lambda t: t[1])  # niveles altos al final: ganan


def area(pts):
    return abs(sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]))) / 2


def main():
    inund = capa("flood", lambda p: nivel_inundacion(p["label"]))
    licua = capa("seismic", lambda p: 1)
    _, _, inund5 = raster(5, inund)
    ancho5, alto5, licua5 = raster(5, licua)
    def en(r, x, y):
        i, j = int((x - X0) / 5), int((y - Y0) / 5)
        return r[j * ancho5 + i] if 0 <= i < ancho5 and 0 <= j < alto5 else 0

    teselas, vistos = {}, set()
    total = sin_pisos = descartados = 0
    for ruta in sorted((RAW / "edificios").glob("e_*.json"), key=lambda p: int(p.stem[2:])):
        for f in json.load(open(ruta))["features"]:
            if f["id"] in vistos or not f["geometry"]:
                descartados += 1
                continue
            vistos.add(f["id"])
            exterior = max((p[0] for p in _anillos(f["geometry"])), key=lambda a: area([local(*c[:2]) for c in a]))
            pts = [local(*c[:2]) for c in exterior]
            if pts[0] == pts[-1]:
                pts = pts[:-1]
            pts = simplificar(pts + pts[:1], 0.35)[:-1] if len(pts) > 4 else pts
            if len(pts) < 3 or len(pts) > 255 or area(pts) < 4:
                descartados += 1
                continue
            cx = sum(x for x, _ in pts) / len(pts)
            cy = sum(y for _, y in pts) / len(pts)
            ti, tj = int((cx - X0) // TESELA), int((cy - Y0) // TESELA)
            ox, oy = X0 + ti * TESELA, Y0 + tj * TESELA
            pisos = f["properties"]["npisos"]
            sin = not pisos or pisos <= 0
            sin_pisos += sin
            banderas = en(inund5, cx, cy) | (en(licua5, cx, cy) << 2) | (sin << 3)
            datos = struct.pack("<BBB", 1 if sin else min(pisos, 255), banderas, len(pts))
            q = [(round((x - ox) * 5), round((y - oy) * 5)) for x, y in pts]  # unidades de 0,2 m
            datos += b"".join(struct.pack("<hh", *v) for v in [q[0]] + [(b[0] - a[0], b[1] - a[1]) for a, b in zip(q, q[1:])])
            t = teselas.setdefault((ti, tj), [0, []])
            t[0] += 1
            t[1].append(datos)
            total += 1

    binario, indice = bytearray(), []
    for (ti, tj), (n, partes) in sorted(teselas.items()):
        bloque = b"".join(partes)
        indice.append([ti, tj, len(binario), len(bloque), n])
        binario += bloque
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "edificios.bin.gz").write_bytes(gzip.compress(bytes(binario), 9))

    # Máscara de manzanas (urbanas; las rurales tipo 00 no son "manzana") y nivel de inundación para el terreno.
    manzanas = [([local(*c[:2]) for c in p[0]], 255)
                for f in json.load(open(RAW / "manzanas.json"))["features"]
                if f["properties"]["tipo_avalu"] != "00" for p in _anillos(f["geometry"])]
    am, hm, mascara = raster(8, manzanas)
    ai, hi, inund20 = raster(20, inund)
    (OUT / "mascaras.bin.gz").write_bytes(gzip.compress(mascara + inund20, 9))
    json.dump({"origen": ORIGEN, "kx": KX, "ky": KY, "tesela": TESELA, "x0": X0, "y0": Y0,
               "teselas": indice, "total": total, "sin_pisos": sin_pisos, "descartados": descartados,
               "mascara": {"res": 8, "ancho": am, "alto": hm}, "inundacion": {"res": 20, "ancho": ai, "alto": hi}},
              open(OUT / "edificios.json", "w"), separators=(",", ":"))
    print(f"edificios {total} (sin pisos {sin_pisos}, descartados {descartados}) en {len(indice)} teselas | "
          f"binario {len(binario) / 1e6:.1f} MB → gz {(OUT / 'edificios.bin.gz').stat().st_size / 1e6:.1f} MB | "
          f"máscaras gz {(OUT / 'mascaras.bin.gz').stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    assert area([(0, 0), (2, 0), (2, 2), (0, 2)]) == 4
    main()
