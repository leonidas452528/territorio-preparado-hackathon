"""Albergues reales del sismo del 10-ago-2026, datos por espacio candidato y dirección de cada edificio.

Salidas (prototipo/datos/procesados/ciudad3d/):
  albergues_reales.json  lista curada abajo (con fuentes), ubicada con el inventario de espacios, el centro del
                         barrio o la nomenclatura domiciliaria.
  espacios_extra.json    por espacio de ≥ 1.000 m²: pendiente (%) del modelo de curvas (dem20) y servicio de salud
                         más cercano (IPS del REPS y equipamientos de salud de la IDESC) con su distancia.
  direcciones.bin.gz     por edificio (orden de edificios.bin.gz): índice de dirección (u32) y de barrio (u16).
  direcciones.json       diccionarios de direcciones y barrios (sin NPN, predio ni otros identificadores).
Uso: python3 prototipo/scripts/albergues_direcciones.py
"""
import gzip
import json
import math
import struct
import unicodedata
from pathlib import Path

import numpy as np

from ciudad3d import OUT, RAW, local
from geo import _anillos, centroide

REPO = Path(__file__).resolve().parents[2]
APP = REPO / "maqueta3d" / "public" / "data"
IDESC = REPO / "prototipo" / "datos" / "raw" / "idesc"
AREA_MINIMA = 1000

ELPAIS = "https://www.elpais.com.co/cali/terremoto-en-cali-estos-son-los-lugares-habilitados-para-recibir-a-los-damnificados-1038.html"
ALCALDIA = "https://www.cali.gov.co/boletines/publicaciones/193628/alcaldia-de-cali-refuerza-la-atencion-integral-a-familias-afectadas-por-el-sismo-mediante-la-disposicion-de-albergues-temporales/"
RCN = "https://newsroom.rcnradio.com/colombia/cali-estos-son-los-centros-de-acopio-y-albergues-habilitados-tras-el-terremoto-de-7-4-en-colombia-conoce-que-ayudas-se-necesitan"
DEFENSORIA = "https://www.defensoria.gov.co/web/guest/-/defensoria-pide-atencion-urgente-para-336-familias-en-albergues-de-cali?redirect=%2F"
AFP = "https://albertonews.com/internacionales/la-lluvia-amenaza-los-albergues-improvisados-de-cali-no-tenemos-a-donde-ir/"
OCCIDENTE = "https://occidente.co/cali/albergues-de-cali-tras-sismo-control-subsidios-arriendo/"

# Lista curada (8-oct-2026). "ubicar": ("espacio", nombre exacto del inventario) | ("barrio", nombre) |
# ("direccion", dirección de la nomenclatura) | None (no publicada).
REALES = [
    {"nombre": "Coliseo de Hockey Miguel Calero (Canchas Panamericanas)", "tipo": "albergue oficial",
     "detalle": "Calle 9 con carreras 37A/39. 146 cupos habilitados (Alcaldía, 12-ago); unas 60 familias (AFP, 13-ago).",
     "fuentes": [ALCALDIA, RCN, ELPAIS, AFP], "ubicar": ("espacio", "cancha de hockey")},
    {"nombre": "Diamante de Béisbol", "tipo": "albergue oficial",
     "detalle": "Carrera 39 con calle 9. Anunciado como albergue el 11-ago.", "fuentes": [ELPAIS, RCN],
     "ubicar": ("espacio", "diamante de beisbol miguel chavez")},
    {"nombre": "Unidad Deportiva Jaime Aparicio", "tipo": "albergue oficial y centro de acopio",
     "detalle": "Albergue, centro de acopio y descanso de rescatistas (Secretaría del Deporte, 11-ago). Complejo donde están la cancha de hockey y el diamante.",
     "fuentes": [ELPAIS], "ubicar": ("punto", (-76.5374, 3.4225), "aprox.: entre la cancha de hockey y el diamante")},
    {"nombre": "Escuela Nacional del Deporte", "tipo": "centro de acopio", "detalle": "Calle 9 # 34-01.",
     "fuentes": [RCN], "ubicar": ("direccion", "CL 9 # 34 - 01")},
    {"nombre": "Plazoleta Jairo Varela", "tipo": "centro de acopio", "detalle": "Avenida 2 Norte # 10 Norte-1.",
     "fuentes": [RCN], "ubicar": ("punto", (-76.5347, 3.4550), "aprox.: junto a las direcciones AV 2A # 10 NORTE de la nomenclatura (barrio Centenario); la plazoleta no tiene placa propia")},
    {"nombre": "Chiminango I", "tipo": "albergue autogestionado",
     "detalle": "Carpas con lonas y palos. Con Chiminango II y Calimio Norte: 336 hogares (1.046 personas) al 18-ago (Defensoría).",
     "fuentes": [DEFENSORIA, AFP], "ubicar": ("barrio", "Chiminangos Primera Etapa")},
    {"nombre": "Chiminango II", "tipo": "albergue autogestionado", "detalle": "Ver Chiminango I (Defensoría, 19-ago).",
     "fuentes": [DEFENSORIA], "ubicar": ("barrio", "Chiminangos Segunda Etapa")},
    {"nombre": "Calimio Norte (sector Ramalí)", "tipo": "albergue autogestionado", "detalle": "Ver Chiminango I (Defensoría, 19-ago).",
     "fuentes": [DEFENSORIA], "ubicar": ("barrio", "Urbanización Calimio")},
    {"nombre": "Altos de Santa Elena", "tipo": "albergue autogestionado",
     "detalle": "Familias en carpas mientras se evalúan sus casas; otras fueron atendidas en la Iglesia Reyes y Sacerdotes (Alcaldía, 12-ago).",
     "fuentes": [ALCALDIA, OCCIDENTE], "ubicar": ("barrio", "Altos de Santa Elena")},
    {"nombre": "Iglesia Reyes y Sacerdotes", "tipo": "albergue en iglesia (apoyo de la Alcaldía)",
     "detalle": "Familias evacuadas de Altos de Santa Elena. Dirección no publicada.", "fuentes": [ALCALDIA], "ubicar": None},
]

sin_tildes = lambda s: unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().upper()
norm_dir = lambda s: " ".join(sin_tildes(s).replace("(DIRECCION CATASTRAL)", "").replace("NORTE", "N").split())


def direcciones():
    """[(x, y, dirección limpia, barrio)] de la nomenclatura domiciliaria."""
    out = []
    for ruta in sorted((RAW / "direcciones").glob("d_*.json"), key=lambda p: int(p.stem[2:])):
        for f in json.load(open(ruta))["features"]:
            p, g = f["properties"], f["geometry"]
            if not g or not p.get("nddirecc"):
                continue
            x, y = local(*g["coordinates"][:2])
            out.append((x, y, p["nddirecc"].replace(" (Dirección Catastral)", "").strip(), p.get("ndbarrio") or ""))
    return out


def ubicar(item, espacios, barrios, dirs):
    modo = item["ubicar"]
    if not modo:
        return None, "sin ubicación publicada"
    if modo[0] == "punto":
        return list(modo[1]), modo[2]
    if modo[0] == "espacio":
        for f in espacios:
            if f["properties"]["name"] == modo[1]:
                return f["properties"]["coordinates"], f"inventario IDESC: «{modo[1]}»"
    if modo[0] == "barrio":
        for f in barrios:
            if f["properties"]["name"] == modo[1]:
                return [round(c, 6) for c in centroide(f["geometry"])], f"aprox.: centro del barrio {modo[1]}"
    if modo[0] == "direccion":
        buscada = norm_dir(modo[1])
        for x, y, d, _ in dirs:
            if norm_dir(d) == buscada:
                from ciudad3d import ORIGEN, KX, KY
                return [round(ORIGEN[0] + x / KX, 6), round(ORIGEN[1] + y / KY, 6)], f"nomenclatura domiciliaria: {d}"
    return None, "no se encontró en las fuentes de ubicación"


def main():
    espacios = json.load(open(APP / "spaces.json"))["features"]
    barrios = json.load(open(APP / "neighborhoods.json"))["features"]
    dirs = direcciones()
    reales = []
    for item in REALES:
        coords, precision = ubicar(item, espacios, barrios, dirs)
        reales.append({k: v for k, v in item.items() if k != "ubicar"} | {"coordenadas": coords, "ubicacion": precision})
    (OUT / "albergues_reales.json").write_text(json.dumps({"corte": "2026-10-08", "albergues": reales}, ensure_ascii=False))

    # Pendiente y salud por espacio candidato.
    dem, meta = np.load(OUT / "dem20.npy"), json.loads((OUT / "dem20.json").read_text())
    def pendiente(x, y):
        i, j = int((x - meta["x0"]) / meta["res"]), int((y - meta["y0"]) / meta["res"])
        if not (2 <= i < dem.shape[1] - 2 and 2 <= j < dem.shape[0] - 2):
            return None
        dzdx = (dem[j, i + 2] - dem[j, i - 2]) / (4 * meta["res"])
        dzdy = (dem[j + 2, i] - dem[j - 2, i]) / (4 * meta["res"])
        return round(math.hypot(dzdx, dzdy) * 100, 1)
    salud = [(local(*f["geometry"]["coordinates"][:2]), f["properties"]["nombre_ips"])
             for f in json.load(open(IDESC / "ads_ips_capacidad_reps.geojson"))["features"] if f["geometry"]]
    salud += [(local(*centroide(f["geometry"])), f["properties"]["nombre"].title())
              for f in json.load(open(IDESC / "eqp_uco_salud.geojson"))["features"] if f["geometry"]]
    extra = {}
    for f in espacios:
        p = f["properties"]
        if (p["areaM2"] or 0) < AREA_MINIMA:
            continue
        x, y = local(*p["coordinates"])
        (sx, sy), nombre = min(salud, key=lambda s: (s[0][0] - x) ** 2 + (s[0][1] - y) ** 2)
        extra[p["id"]] = [pendiente(x, y), round(math.hypot(sx - x, sy - y)), nombre]
    for r in reales:
        if r["coordenadas"]:
            r["pendiente"] = pendiente(*local(*r["coordenadas"]))
    (OUT / "albergues_reales.json").write_text(json.dumps({"corte": "2026-10-08", "albergues": reales}, ensure_ascii=False))
    (OUT / "espacios_extra.json").write_text(json.dumps(extra, ensure_ascii=False, separators=(",", ":")))

    # Dirección más cercana (≤ 30 m) al centro de cada edificio, en el orden de edificios.bin.gz.
    idx = json.loads((OUT / "edificios.json").read_text())
    binario = gzip.decompress((OUT / "edificios.bin.gz").read_bytes())
    celda = 30.0
    rejilla = {}
    for k, (x, y, _, _) in enumerate(dirs):
        rejilla.setdefault((int(x // celda), int(y // celda)), []).append(k)
    textos, barrios_d, ind_t, ind_b = {}, {}, [], []
    for ti, tj, off, largo, _ in idx["teselas"]:
        ox, oy = idx["x0"] + ti * idx["tesela"], idx["y0"] + tj * idx["tesela"]
        o = off
        while o < off + largo:
            n = binario[o + 2]
            o += 3
            x = y = sx = sy = 0
            for _ in range(n):
                dx, dy = struct.unpack_from("<hh", binario, o)
                x, y, o = x + dx, y + dy, o + 4
                sx, sy = sx + x, sy + y
            cx, cy = ox + sx / n * 0.2, oy + sy / n * 0.2
            mejor, d2 = None, celda ** 2
            gi, gj = int(cx // celda), int(cy // celda)
            for a in (-1, 0, 1):
                for b in (-1, 0, 1):
                    for k in rejilla.get((gi + a, gj + b), ()):
                        e = (dirs[k][0] - cx) ** 2 + (dirs[k][1] - cy) ** 2
                        if e < d2:
                            mejor, d2 = k, e
            if mejor is None:
                ind_t.append(0xFFFFFFFF)
                ind_b.append(0xFFFF)
            else:
                ind_t.append(textos.setdefault(dirs[mejor][2], len(textos)))
                ind_b.append(barrios_d.setdefault(dirs[mejor][3], len(barrios_d)))
    datos = struct.pack(f"<{len(ind_t)}I", *ind_t) + struct.pack(f"<{len(ind_b)}H", *ind_b)
    (OUT / "direcciones.bin.gz").write_bytes(gzip.compress(datos, 9))
    (OUT / "direcciones.json").write_text(json.dumps({"textos": list(textos), "barrios": list(barrios_d)}, ensure_ascii=False, separators=(",", ":")))
    con = sum(1 for t in ind_t if t != 0xFFFFFFFF)
    tam = (OUT / "direcciones.bin.gz").stat().st_size + len(gzip.compress((OUT / "direcciones.json").read_bytes()))
    print(f"albergues reales {len(reales)} ({sum(1 for r in reales if r['coordenadas'])} ubicados) | espacios con datos {len(extra)} | "
          f"direcciones {len(dirs)}; edificios con dirección a ≤ 30 m: {con} de {len(ind_t)} ({con / len(ind_t):.0%}) | gz total {tam / 1e6:.1f} MB")
    for r in reales:
        print(" -", r["nombre"], "→", r["coordenadas"], "|", r["ubicacion"], "| pendiente", r.get("pendiente"))


if __name__ == "__main__":
    assert norm_dir("AV 2 N # 10 N - 1") == norm_dir("AV 2 NORTE # 10 NORTE - 1 (Dirección Catastral)")
    main()
