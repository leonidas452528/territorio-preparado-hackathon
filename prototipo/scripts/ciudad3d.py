"""Prepara la maqueta 3D de Cali: relieve + volumetría por manzana + ríos.

Entrada: prototipo/datos/raw/ciudad3d/ (bajar.sh + teselas Terrarium).
Salida: prototipo/datos/procesados/ciudad3d/ciudad.json, en metros locales
(x = este, y = norte) con origen en ORIGEN. Lo lee el script de Blender.

Altura de cada manzana = promedio de pisos ponderado por área construida x 3 m.
Construcciones con npisos <= 0 (sin dato en catastro) cuentan como 1 piso y
se informan en `sin_pisos`. Es volumetría, no la forma real de cada edificio.
"""
import collections
import json
import math
import struct
import zlib
from pathlib import Path

import numpy as np

from geo import _anillos, bbox, centroide, punto_en

RAIZ = Path(__file__).resolve().parents[1] / "datos"
RAW = RAIZ / "raw" / "ciudad3d"
OUT = RAIZ / "procesados" / "ciudad3d"
ORIGEN = (-76.53, 3.42)  # lon, lat; el mismo valor va en la app
KX = 111320 * math.cos(math.radians(ORIGEN[1]))
KY = 110574
CAJA = (-76.66, -76.44, 3.31, 3.52)  # O, E, S, N
PASO = 60  # m por celda del relieve
METROS_PISO = 3


def local(lon, lat):
    return round((lon - ORIGEN[0]) * KX, 1), round((lat - ORIGEN[1]) * KY, 1)


def png_rgb(ruta):
    """Decodifica PNG RGB de 8 bits sin entrelazar (formato Terrarium)."""
    d = Path(ruta).read_bytes()
    w, h, prof, tipo = struct.unpack(">IIBB", d[16:26])
    assert (prof, tipo) == (8, 2), ruta
    i, idat = 8, b""
    while i < len(d):
        n, t = struct.unpack(">I4s", d[i:i + 8])
        if t == b"IDAT":
            idat += d[i + 8:i + 8 + n]
        i += 12 + n
    raw = np.frombuffer(zlib.decompress(idat), np.uint8).reshape(h, 1 + w * 3)
    out = np.zeros((h, w * 3), np.int32)
    for y in range(h):
        f, fila = raw[y, 0], raw[y, 1:].astype(np.int32)
        arriba = out[y - 1] if y else np.zeros(w * 3, np.int32)
        if f == 0:
            out[y] = fila
        elif f == 2:
            out[y] = (fila + arriba) & 255
        else:  # 1 Sub, 3 Average, 4 Paeth dependen del píxel izquierdo
            r = out[y]
            for x in range(w * 3):
                a = r[x - 3] if x >= 3 else 0
                if f == 1:
                    p = a
                elif f == 3:
                    p = (a + arriba[x]) >> 1
                else:
                    c = arriba[x - 3] if x >= 3 else 0
                    b = arriba[x]
                    pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                    p = a if pa <= pb and pa <= pc else b if pb <= pc else c
                r[x] = (fila[x] + p) & 255
    return out.reshape(h, w, 3)


def relieve(paso=PASO, usar_curvas=True):
    """Grilla de alturas (fila 0 = sur). Si existe el modelo de topografia.py (curvas de nivel de la IDESC),
    se muestrea de él; si no, del SRTM (Terrain Tiles)."""
    dem = OUT / "dem20.npy"
    if usar_curvas and dem.exists():
        import numpy as _np
        z, meta = _np.load(dem), json.loads((OUT / "dem20.json").read_text())
        O, E, S, N = CAJA
        ancho, alto = int((E - O) * KX // paso) + 1, int((N - S) * KY // paso) + 1
        x0, y0 = local(O, S)
        i = _np.clip(((x0 + _np.arange(ancho) * paso) - meta["x0"]) / meta["res"], 0, z.shape[1] - 1.001)
        j = _np.clip(((y0 + _np.arange(alto) * paso) - meta["y0"]) / meta["res"], 0, z.shape[0] - 1.001)
        ii, jj = _np.meshgrid(i, j)
        i0, j0 = ii.astype(int), jj.astype(int)
        fx, fy = ii - i0, jj - j0
        alturas = (z[j0, i0] * (1 - fx) * (1 - fy) + z[j0, i0 + 1] * fx * (1 - fy)
                   + z[j0 + 1, i0] * (1 - fx) * fy + z[j0 + 1, i0 + 1] * fx * fy).round(1)
        return {"oeste_sur": (x0, y0), "paso": paso, "ancho": ancho, "alto": alto, "alturas": alturas.ravel().tolist(),
                "fuente": "Curvas de nivel IDESC (POT 2014, cada 10 m) + SRTM fuera de su cobertura"}
    z = 13
    n = 2 ** z
    tx = lambda lon: (lon + 180) / 360 * n * 256
    ty = lambda lat: (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n * 256
    O, E, S, N = CAJA
    x0, y0 = int(tx(O) // 256), int(ty(N) // 256)
    x1, y1 = int(tx(E) // 256), int(ty(S) // 256)
    mosaico = np.zeros(((y1 - y0 + 1) * 256, (x1 - x0 + 1) * 256))
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            p = png_rgb(RAW / "terreno" / f"{z}_{x}_{y}.png").astype(float)
            m = p[..., 0] * 256 + p[..., 1] + p[..., 2] / 256 - 32768
            mosaico[(y - y0) * 256:(y - y0 + 1) * 256, (x - x0) * 256:(x - x0 + 1) * 256] = m
    ancho = int((E - O) * KX // paso) + 1
    alto = int((N - S) * KY // paso) + 1
    xs, ys = np.meshgrid(np.arange(ancho), np.arange(alto))  # fila 0 = sur
    lon = O + xs * paso / KX
    lat = S + ys * paso / KY
    px = np.clip(np.vectorize(tx)(lon) - x0 * 256, 0, mosaico.shape[1] - 1).round().astype(int)
    py = np.clip(np.vectorize(ty)(lat) - y0 * 256, 0, mosaico.shape[0] - 1).round().astype(int)
    alturas = mosaico[py, px].round(1)
    return {"oeste_sur": local(O, S), "paso": paso, "ancho": ancho, "alto": alto,
            "alturas": alturas.ravel().tolist(), "fuente": "SRTM (Terrain Tiles, AWS Open Data)"}


def simplificar(anillo, tol=1.5):
    """Douglas-Peucker sobre un anillo ya en metros."""
    if len(anillo) < 5:
        return anillo
    def dp(pts):
        (ax, ay), (bx, by) = pts[0], pts[-1]
        L = math.hypot(bx - ax, by - ay) or 1e-9
        d = [abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / L for px, py in pts[1:-1]]
        i = max(range(len(d)), key=d.__getitem__) if d else None
        if i is None or d[i] <= tol:
            return [pts[0], pts[-1]]
        return dp(pts[:i + 2])[:-1] + dp(pts[i + 1:])
    medio = len(anillo) // 2
    s = dp(anillo[:medio + 1])[:-1] + dp(anillo[medio:])
    return s if len(s) >= 4 else anillo


def manzanas():
    clave = lambda p: (p["sector"], p["comuna"], p["barrio"], p["manzana"])
    agg = collections.defaultdict(lambda: [0.0, 0.0, 0, 0])
    for s in range(0, 800000, 100000):
        ruta = RAW / f"constr_{s}.json"
        if not ruta.exists():
            continue
        for f in json.load(open(ruta))["features"]:
            p = f["properties"]
            a = p["shape_area"] or 0
            pisos = p["npisos"] if p["npisos"] and p["npisos"] > 0 else None
            g = agg[clave(p)]
            g[0] += a
            g[1] += a * (pisos or 1)
            g[2] += 1
            g[3] += pisos is None
    salida, vistas = [], set()
    for f in json.load(open(RAW / "manzanas.json"))["features"]:
        p = f["properties"]
        area, area_pisos, n, sin = agg.get(clave(p), (0, 0, 0, 0))
        # Rurales (tipo 00) y manzanas de más de 10 ha (campus, zonas industriales) se verían como
        # bloques macizos: se dejan fuera de la volumetría. Sus construcciones no se cuentan.
        if not n or p["tipo_avalu"] == "00" or (p["shape_area"] or 0) > 100000:
            continue
        repetida = clave(p) in vistas  # 174 claves repetidas: se cuentan una vez
        vistas.add(clave(p))
        pisos = area_pisos / area if area else 1
        cobertura = min(1, area / p["shape_area"]) if p["shape_area"] else 0
        lon, lat = centroide(f["geometry"])
        for parte, poligono in enumerate(_anillos(f["geometry"])):
            exterior = simplificar([local(*c[:2]) for c in poligono[0]])
            if parte or repetida:  # el conteo va una sola vez
                n = sin = 0
            salida.append({"c": p["comuna"], "pisos": round(pisos, 1),
                           "h": round(pisos * METROS_PISO, 1), "cob": round(cobertura, 2),
                           "n": n, "sin_pisos": sin, "centro": local(lon, lat),
                           "anillo": exterior})
    return salida


def recortar(anillo, x0, y0, x1, y1):
    """Sutherland-Hodgman contra un rectángulo."""
    for dentro, corte in (
        (lambda p: p[0] >= x0, lambda a, b: (x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0]))),
        (lambda p: p[0] <= x1, lambda a, b: (x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0]))),
        (lambda p: p[1] >= y0, lambda a, b: (a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0)),
        (lambda p: p[1] <= y1, lambda a, b: (a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1)),
    ):
        entrada, anillo = anillo, []
        for i, b in enumerate(entrada):
            a = entrada[i - 1]
            if dentro(b):
                if not dentro(a):
                    anillo.append(corte(a, b))
                anillo.append(b)
            elif dentro(a):
                anillo.append(corte(a, b))
        if not anillo:
            return []
    return [(round(x, 1), round(y, 1)) for x, y in anillo]


def rios():
    O, E, S, N = CAJA
    caja = (*local(O, S), *local(E, N))
    out = []
    for f in json.load(open(RAW / "rios.json"))["features"]:
        for poligono in _anillos(f["geometry"]):
            anillo = recortar([local(*c[:2]) for c in poligono[0][:-1]], *caja)
            if len(anillo) >= 3:
                out.append({"nombre": f["properties"].get("nombre"), "anillo": simplificar(anillo + anillo[:1], 3)})
    return out


APP = Path(__file__).resolve().parents[2] / "maqueta3d" / "public"


def nivel_inundacion(etiqueta):
    """3 alta / no mitigable / torrencial / río Cauca, 2 media, 1 baja, 0 sin nivel. Categorías oficiales del POT.
    "Área prioritaria para estudio" (30 km²) no es un nivel de amenaza: no se inunda en la simulación."""
    e = etiqueta.lower()
    if "prioritaria para estudio" in e:
        return 0
    if "media" in e:
        return 2
    if "baja" in e:
        return 1
    return 3


def escenarios(datos):
    """Datos livianos para la app: cruce oficial por manzana y máscara de vegetación por celda."""
    def capa(nombre):
        fs = json.load(open(APP / "data" / f"{nombre}.json"))["features"]
        return [(f, bbox(f["geometry"])) for f in fs]
    inund, sism = capa("flood"), capa("seismic")
    lonlat = lambda x, y: (ORIGEN[0] + x / KX, ORIGEN[1] + y / KY)
    manzanas = []
    for m in datos["manzanas"]:
        lon, lat = lonlat(*m["centro"])
        nivel = max((nivel_inundacion(f["properties"]["label"]) for f, c in inund
                     if punto_en(lon, lat, f["geometry"], c)), default=0)
        seis = int(any(punto_en(lon, lat, f["geometry"], c) for f, c in sism))
        manzanas.append([*m["centro"], m["h"], m["n"], nivel, seis])
    r = datos["relieve"]
    bosque = [(f["geometry"], bbox(f["geometry"]))
              for f in json.load(open(RAW / "cobertura_boscosa.json"))["features"]]
    x0, y0 = r["oeste_sur"]
    urbano = set()  # celdas a menos de ~2 celdas del centro de una manzana
    for m in datos["manzanas"]:
        ci, cj = round((m["centro"][0] - x0) / PASO), round((m["centro"][1] - y0) / PASO)
        urbano.update((ci + a, cj + b) for a in range(-2, 3) for b in range(-2, 3))
    # 1 = cobertura boscosa oficial; 2 = supuesto: ladera no urbana sobre 1.050 m (pastos y rastrojo,
    # sin capa oficial); 0 = no combustible en el ejercicio.
    veg = []
    for j in range(r["alto"]):
        for i in range(r["ancho"]):
            lon, lat = lonlat(x0 + i * PASO, y0 + j * PASO)
            if any(punto_en(lon, lat, g, c) for g, c in bosque):
                veg.append("1")
            elif (i, j) not in urbano and r["alturas"][j * r["ancho"] + i] > 1050:
                veg.append("2")
            else:
                veg.append("0")
    zonas = [{"nivel": nivel_inundacion(f["properties"]["label"]), "tipo": f["properties"]["sourceKey"],
              "anillos": [simplificar([local(*c[:2]) for c in p[0]], 3) for p in _anillos(f["geometry"])]}
             for f, _ in inund]
    licuacion = [{"etiqueta": f["properties"]["label"],
                  "anillos": [simplificar([local(*c[:2]) for c in p[0]], 3) for p in _anillos(f["geometry"])]}
                 for f, _ in sism]
    import csv
    danos = [[*local(float(d["lon"]), float(d["lat"])), d["grado"], d["fuente"]]
             for d in csv.DictReader(open(RAIZ / "procesados" / "danos_puntos_cali.csv"))]
    return {"origen": ORIGEN, "kx": KX, "ky": KY, "danos_sismo": danos,
            "relieve": {**r, "alturas": [round(a) for a in r["alturas"]]},
            "vegetacion": "".join(veg), "manzanas": manzanas,
            "inundacion": zonas, "licuacion": licuacion,
            "campos_manzana": ["x", "y", "altura_m", "construcciones", "nivel_inundacion", "licuacion"]}


if __name__ == "__main__":
    assert local(*ORIGEN) == (0, 0)
    assert [nivel_inundacion(t) for t in ("Area prioritaria para estudio", "Amenaza Baja mitigable", "Amenaza Media mitigable",
                                          "Amenaza inundación río Cauca")] == [0, 1, 2, 3]
    assert len(recortar([(-5, -5), (5, -5), (5, 5), (-5, 5)], 0, 0, 10, 10)) == 4
    assert recortar([(20, 20), (30, 20), (30, 30)], 0, 0, 10, 10) == []
    assert (50, 0.5) not in simplificar([(0, 0), (50, 0.5), (100, 0), (100, 100), (0, 100), (0, 0)])
    OUT.mkdir(parents=True, exist_ok=True)
    datos = {"origen": ORIGEN, "kx": KX, "ky": KY, "metros_piso": METROS_PISO,
             "relieve": relieve(), "manzanas": manzanas(), "rios": rios(),
             "fuentes": ["Catastro de Cali (IDESC): cat_bas_manzanas, cat_bas_construcciones",
                         "POT 2014 (IDESC): bcs_hid_rios",
                         "Relieve: Terrain Tiles (Mapzen/AWS Open Data), SRTM y otras fuentes"]}
    (OUT / "ciudad.json").write_text(json.dumps(datos, separators=(",", ":")))
    esc = escenarios(datos)
    (APP / "ciudad").mkdir(exist_ok=True)
    (APP / "ciudad" / "escenarios.json").write_text(json.dumps(esc, separators=(",", ":")))
    m = esc["manzanas"]
    print(f"inundación {sum(1 for x in m if x[4])} manzanas | licuación {sum(x[5] for x in m)} "
          f"| bosque {esc['vegetacion'].count('1')} celdas, ladera supuesta {esc['vegetacion'].count('2')}")
    r, m = datos["relieve"], datos["manzanas"]
    a = r["alturas"]
    print(f"relieve {r['ancho']}x{r['alto']} {min(a):.0f}-{max(a):.0f} m | manzanas {len(m)} "
          f"| construcciones {sum(x['n'] for x in m)} (sin pisos {sum(x['sin_pisos'] for x in m)})"
          f" | pisos máx {max(x['pisos'] for x in m)}")
