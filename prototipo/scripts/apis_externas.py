"""Consulta Mapillary y NASA FIRMS para la maqueta 3D. Las claves se leen de ~/.config/territorio-preparado/claves.env
(nunca del repositorio) y no se imprimen ni se guardan en las salidas.

Salidas (prototipo/datos/procesados/ciudad3d/):
  mapillary_espacios.json  foto de calle más cercana (≤ 70 m) a cada espacio de ≥ 1.000 m²: id, fecha y distancia.
                           En la maqueta solo va el enlace público https://www.mapillary.com/app/?pKey=<id>.
  firms_focos.json         focos de calor de los últimos 5 días en la caja de la maqueta (VIIRS y MODIS).
Uso: python3 prototipo/scripts/apis_externas.py [mapillary|firms]
"""
import csv
import io
import json
import math
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from ciudad3d import CAJA, OUT

REPO = Path(__file__).resolve().parents[2]
CLAVES = Path.home() / ".config" / "territorio-preparado" / "claves.env"
AREA_MINIMA = 1000
RADIO = 0.00065  # grados, unos 70 m


def clave(nombre):
    for linea in CLAVES.read_text().splitlines():
        if linea.startswith(nombre + "="):
            return linea.split("=", 1)[1].strip().strip("'\"")
    sys.exit(f"Falta {nombre} en {CLAVES}")


def leer(url, intentos=4):
    for i in range(intentos):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "territorio-preparado/0.1"}), timeout=60) as r:
                return r.read()
        except Exception as e:  # red inestable o límite de solicitudes: espera y reintenta
            if i == intentos - 1:
                raise RuntimeError(type(e).__name__) from None  # sin la URL: lleva la clave
            time.sleep(2 ** i)


def mapillary():
    token = clave("MAPILLARY_TOKEN")
    espacios = [f["properties"] for f in json.load(open(REPO / "maqueta3d/public/data/spaces.json"))["features"]
                if (f["properties"]["areaM2"] or 0) >= AREA_MINIMA]

    def cercana(p):
        lon, lat = p["coordinates"]
        q = urllib.parse.urlencode({"access_token": token, "fields": "id,captured_at,geometry", "limit": 25,
                                    "bbox": f"{lon - RADIO},{lat - RADIO},{lon + RADIO},{lat + RADIO}"})
        try:
            datos = json.loads(leer(f"https://graph.mapillary.com/images?{q}")).get("data", [])
        except RuntimeError as e:
            return p["id"], {"error": str(e)}
        if not datos:
            return p["id"], None
        def metros(img):
            x, y = img["geometry"]["coordinates"]
            return math.hypot((x - lon) * 111320 * math.cos(math.radians(lat)), (y - lat) * 110574)
        img = min(datos, key=lambda i: (metros(i) // 15, -i["captured_at"]))  # la más cerca; si empatan, la más nueva
        return p["id"], {"id": img["id"], "fecha": datetime.fromtimestamp(img["captured_at"] / 1000, timezone.utc).date().isoformat(),
                         "m": round(metros(img))}

    with ThreadPoolExecutor(6) as pool:
        resultado = dict(pool.map(cercana, espacios))
    errores = sum(1 for v in resultado.values() if v and "error" in v)
    con = {k: v for k, v in resultado.items() if v and "error" not in v}
    (OUT / "mapillary_espacios.json").write_text(json.dumps({"consulta": datetime.now(timezone.utc).isoformat(timespec="minutes"),
                                                             "radio_m": 70, "espacios": con}, ensure_ascii=False))
    recientes = sum(1 for v in con.values() if v["fecha"] >= "2024-01-01")
    print(f"Mapillary: {len(con)} de {len(espacios)} espacios con foto a ≤ 70 m ({recientes} de 2024 en adelante); errores {errores}")


def firms():
    llave = clave("FIRMS_MAP_KEY")
    O, E, S, N = CAJA
    focos = []
    for fuente in ("VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "VIIRS_SNPP_NRT", "MODIS_NRT"):
        texto = leer(f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{llave}/{fuente}/{O},{S},{E},{N}/5").decode()
        if not texto.startswith("latitude"):
            print(f"{fuente}: {texto[:80]}")
            continue
        for f in csv.DictReader(io.StringIO(texto)):
            focos.append({"lat": float(f["latitude"]), "lon": float(f["longitude"]), "fecha": f["acq_date"],
                          "hora_utc": f["acq_time"], "satelite": fuente.split("_NRT")[0], "confianza": f["confidence"],
                          "frp_mw": float(f["frp"]) if f.get("frp") else None})
    (OUT / "firms_focos.json").write_text(json.dumps({"consulta": datetime.now(timezone.utc).isoformat(timespec="minutes"),
                                                      "dias": 5, "caja": CAJA, "focos": focos}, ensure_ascii=False))
    print(f"FIRMS: {len(focos)} focos en la caja de la maqueta en los últimos 5 días")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for tarea in sys.argv[1:] or ["firms", "mapillary"]:
        {"firms": firms, "mapillary": mapillary}[tarea]()
