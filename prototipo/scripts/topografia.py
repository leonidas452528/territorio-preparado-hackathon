"""Modelo de terreno a 20 m a partir de las curvas de nivel oficiales (POT 2014, IDESC, cada 10 m).

Las curvas se dibujan en la grilla con su cota y el espacio entre ellas se llena con interpolación armónica
(ecuación de Laplace, de la malla gruesa a la fina): la superficie pasa exactamente por las curvas y no inventa
picos ni hoyos. Fuera de la cobertura de las curvas (la franja oriental, al otro lado del Cauca) se usa el SRTM.
Ventaja frente al SRTM: es terreno desnudo, sin la altura de edificios y árboles que el radar suma.

Entrada: prototipo/datos/raw/ciudad3d/curvas_nivel.json (bajar_topografia_direcciones.sh).
Salida: prototipo/datos/procesados/ciudad3d/dem20.npy (+ dem20.json con origen y resolución).
"""
import json
import math

import numpy as np
from PIL import Image, ImageDraw

from ciudad3d import CAJA, OUT, RAW, local, relieve

RES = 20
COTA_MIN, COTA_MAX = 900, 4500  # descarta cotas 0 y 500, que no existen en Cali


def jacobi(z, fijo, valores, veces):
    for _ in range(veces):
        p = np.pad(z, 1, mode="edge")
        z = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
        z[fijo] = valores[fijo]
    return z


def reducir(valores, fijo):
    """2x2 → 1: promedio de las celdas fijas del bloque (fija si alguna lo es)."""
    h, w = (valores.shape[0] // 2) * 2, (valores.shape[1] // 2) * 2
    v = np.where(fijo, valores, 0)[:h, :w].reshape(h // 2, 2, w // 2, 2)
    f = fijo[:h, :w].reshape(h // 2, 2, w // 2, 2)
    n = f.sum(axis=(1, 3))
    return np.where(n > 0, v.sum(axis=(1, 3)) / np.maximum(n, 1), 0), n > 0


def main():
    O, E, S, N = CAJA
    x0, y0 = local(O, S)
    x1, y1 = local(E, N)
    ancho, alto = math.ceil((x1 - x0) / RES), math.ceil((y1 - y0) / RES)
    img = Image.new("I", (ancho, alto), 0)
    lapiz = ImageDraw.Draw(img)
    usadas = 0
    for f in json.load(open(RAW / "curvas_nivel.json"))["features"]:
        cota = f["properties"]["cota"]
        if not cota or not COTA_MIN <= cota <= COTA_MAX or not f["geometry"]:
            continue
        usadas += 1
        for linea in f["geometry"]["coordinates"]:
            pts = [((x - x0) / RES, (y1 - y) / RES) for x, y in (local(*c[:2]) for c in linea)]
            if len(pts) > 1:
                lapiz.line(pts, fill=cota, width=1)
    valores = np.flipud(np.array(img, dtype=np.float64))  # fila 0 = sur
    fijo = valores > 0

    # SRTM a la misma resolución: punto de partida y relleno lejos de las curvas.
    r = relieve(RES, usar_curvas=False)
    srtm = np.array(r["alturas"], dtype=np.float64).reshape(r["alto"], r["ancho"])[:alto, :ancho]
    srtm = np.pad(srtm, ((0, alto - srtm.shape[0]), (0, ancho - srtm.shape[1])), mode="edge")

    # Pirámide: de 20 m a 320 m.
    niveles = [(valores, fijo)]
    while min(niveles[-1][0].shape) > 120:
        niveles.append(reducir(*niveles[-1]))
    v, f = niveles[-1]
    z = np.array(Image.fromarray(srtm.astype(np.float32)).resize((v.shape[1], v.shape[0]), Image.Resampling.BILINEAR))
    z = jacobi(z.astype(np.float64), f, v, 3000)
    for v, f in reversed(niveles[:-1]):
        z = np.array(Image.fromarray(z.astype(np.float32)).resize((v.shape[1], v.shape[0]), Image.Resampling.BILINEAR)).astype(np.float64)
        z = jacobi(z, f, v, 400)

    # Cobertura de las curvas: dentro del tramo que abarcan en cada fila y en cada columna. Afuera (la franja
    # oriental, al otro lado del Cauca) se pasa al SRTM con una transición de ~500 m.
    filas = np.zeros(fijo.shape, bool)
    for j in range(fijo.shape[0]):
        c = np.flatnonzero(fijo[j])
        if c.size:
            filas[j, c[0]:c[-1] + 1] = True
    cols = np.zeros(fijo.shape, bool)
    for i in range(fijo.shape[1]):
        c = np.flatnonzero(fijo[:, i])
        if c.size:
            cols[c[0]:c[-1] + 1, i] = True
    peso = (filas & cols).astype(np.float64)
    k = 25  # suavizado con caja de 25 celdas (500 m), por sumas acumuladas
    for eje in (0, 1):
        c = np.cumsum(np.pad(peso, [(k, k) if e == eje else (0, 0) for e in (0, 1)], mode="edge"), axis=eje)
        peso = (np.take(c, range(2 * k, c.shape[eje]), axis=eje) - np.take(c, range(0, c.shape[eje] - 2 * k), axis=eje)) / (2 * k)
    # El SRTM mide techos y copas: en el valle (bajo 1.000 m) se corrige con la diferencia mediana frente a las curvas.
    valle = (peso > 0.99) & (z < 1000)
    sesgo = float(np.median(z[valle] - srtm[valle]))
    dem = peso * z + (1 - peso) * (srtm + sesgo)

    OUT.mkdir(parents=True, exist_ok=True)
    np.save(OUT / "dem20.npy", dem.astype(np.float32))
    (OUT / "dem20.json").write_text(json.dumps({"x0": x0, "y0": y0, "res": RES, "ancho": ancho, "alto": alto,
                                                "fuente": "Curvas de nivel IDESC (pot_2014:bcs_curvas_nivel, cada 10 m) "
                                                          "+ SRTM fuera de la cobertura de las curvas"}))
    dif = (dem - srtm)[peso > 0.99]
    print(f"curvas usadas {usadas} | grilla {ancho}x{alto} a {RES} m | {dem.min():.0f}-{dem.max():.0f} m | "
          f"cubierto por curvas {np.mean(peso > 0.99) * 100:.0f} % | curvas - SRTM: media {dif.mean():.1f} m, "
          f"p5 {np.percentile(dif, 5):.1f}, p95 {np.percentile(dif, 95):.1f} | corrección del SRTM en el valle {sesgo:.1f} m")


if __name__ == "__main__":
    t = jacobi(np.zeros((3, 3)), np.array([[1, 0, 1]] * 3, bool), np.array([[2.0, 0, 4]] * 3), 200)
    assert abs(t[1, 1] - 3) < 1e-6  # entre dos curvas, la interpolación armónica es lineal
    main()
