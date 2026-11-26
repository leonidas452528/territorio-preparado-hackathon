# Plan de APIs para el escaneo completo de Cali

**Para qué sirve:** es la lista de cuentas y claves que hay que crear, en orden, para cubrir toda la ciudad con datos que **sí se pueden procesar y publicar**, y el método para medir qué zonas quedan sin cobertura.
**Creado:** 8 de octubre de 2026. Precios, cupos y condiciones de cada servicio, con sus fuentes: `docs/APIS_MAPAS_Y_STREET_VIEW.md`.

> **Regla de oro:** "escanear la ciudad" (sacar edificios, vías, árboles, daños) solo con fuentes abiertas o propias: catastro de la IDESC, Mapillary, Panoramax, OpenStreetMap y satélites Copernicus/ESA. **Google Street View solo para mirar**: sus términos prohíben crear datos a partir de su contenido.

---

## 1. Dónde guardar las claves (antes de crear cualquiera)

1. Las claves **nunca** van al repositorio. Se guardan en un archivo fuera de él, en la misma carpeta donde ya están las cuentas de demostración:
   ```bash
   mkdir -p ~/.config/territorio-preparado
   touch ~/.config/territorio-preparado/claves.env
   chmod 600 ~/.config/territorio-preparado/claves.env
   ```
2. Formato del archivo (una línea por clave, **siempre entre comillas simples**: el token de Mapillary trae el carácter `|`, que la terminal interpreta como tubería):
   ```bash
   GOOGLE_MAPS_KEY=''
   MAPILLARY_TOKEN='MLY|…'
   FIRMS_MAP_KEY='…'
   ORS_API_KEY=''
   COPERNICUS_USER=''
   ```
3. Para usarlas en la terminal sin que queden en el historial: `set -a; . ~/.config/territorio-preparado/claves.env; set +a`.
4. En la app web, solo la clave de Google va en `maqueta3d/.env.local`, que ya está excluido por `.gitignore`. Las demás claves se usan en los scripts de descarga, no en el navegador.
5. Si una clave se filtra (por ejemplo, si aparece en un chat o en un commit), se revoca y se crea otra. Así se hizo con la contraseña de la base de datos.

## 2. Cuentas a crear, en orden de prioridad

### ☑ 1. Mapillary: fotos de calle abiertas (la base del escaneo)
- **Qué cubre:** fotos de calle de toda la ciudad donde alguien haya capturado, más **objetos detectados** automáticamente (señales, postes, hidrantes, semáforos). Licencia CC BY-SA: **sí se pueden derivar datos** con atribución.
- **Costo:** gratis.
- **Pasos:**
  1. Crear una cuenta en https://www.mapillary.com/signup
  2. Ir a https://www.mapillary.com/dashboard/developers → *Register application* (nombre: `territorio-preparado`; permisos: solo lectura).
  3. Copiar el **Client Token** en `MAPILLARY_TOKEN`.
- **Probar** (fotos junto a la Plaza de Caicedo). **La caja debe ser pequeña** (unos 100 m): con una caja de 1 km responde «Please reduce the amount of data…»:
  ```bash
  curl -s "https://graph.mapillary.com/images?access_token=$MAPILLARY_TOKEN&fields=id,captured_at,geometry&bbox=-76.5325,3.4512,-76.5315,3.4520&limit=3"
  ```
- **Atribución obligatoria:** "Imágenes de Mapillary, CC BY-SA".
- **(verificar)** la política de uso vigente y los límites de solicitudes antes de bajar la ciudad completa.

### ☐ 2. Google Maps Platform: ver Street View dentro de la herramienta
- **Qué cubre:** solo **visualización** del panorama de cada sitio de acopio. No sirve para mapear.
- **Costo:** Maps Embed y Street View Metadata son gratis e ilimitados; Static Street View tiene 10.000 gratis al mes. Exige cuenta de facturación con tarjeta.
- **Pasos:** sección 2 de `docs/APIS_MAPAS_Y_STREET_VIEW.md` (proyecto, facturación, habilitar **Maps Embed API**, crear la clave, **restringirla por dominio y por API**, presupuesto de USD 1 con alerta).
- **Guardar en:** `GOOGLE_MAPS_KEY` y en `maqueta3d/.env.local`.
- **Probar:** abrir en el navegador `https://www.google.com/maps/embed/v1/streetview?key=CLAVE&location=3.4516,-76.5320` desde `http://localhost:8000`.

### ☑ 3. NASA FIRMS: focos de incendio reales
- **Qué cubre:** focos de calor detectados por satélite (MODIS y VIIRS) en Cali y el Valle, casi en tiempo real. Sirven para arrancar el ejercicio de incendio en un foco real.
- **Costo:** gratis. Unas 5.000 transacciones cada 10 minutos.
- **Pasos:** pedir el MAP_KEY en https://firms.modaps.eosdis.nasa.gov/api/map_key (llega por correo) y guardarlo en `FIRMS_MAP_KEY`.
- **Probar** (focos VIIRS de los últimos 5 días en la caja de Cali; **el máximo por consulta es 5 días**):
  ```bash
  curl -s "https://firms.modaps.eosdis.nasa.gov/api/area/csv/$FIRMS_MAP_KEY/VIIRS_SNPP_NRT/-76.66,3.31,-76.44,3.52/5"
  ```
- **Estado de la clave** (transacciones usadas): `https://firms.modaps.eosdis.nasa.gov/mapserver/mapkey_status/?MAP_KEY=$FIRMS_MAP_KEY`

### ☐ 4. openrouteservice: a cuántos minutos queda cada acopio
- **Qué cubre:** isócronas, es decir, la zona que queda a 5, 10 o 15 minutos caminando o en carro de cada sitio, y rutas. Reemplaza el radio fijo de 1,5 km.
- **Costo:** gratis: 2.000 rutas y 500 isócronas al día. Hay un plan *Collaborative* con más cupo para entidades humanitarias, académicas y públicas (la Universidad Libre podría pedirlo).
- **Pasos:** crear una cuenta en https://account.heigit.org, pedir el plan *Standard* y copiar la clave en `ORS_API_KEY`.
- **Probar** (isócrona de 10 minutos a pie desde un punto):
  ```bash
  curl -s -X POST "https://api.openrouteservice.org/v2/isochrones/foot-walking" \
    -H "Authorization: $ORS_API_KEY" -H "Content-Type: application/json" \
    -d '{"locations":[[-76.5320,3.4516]],"range":[600]}'
  ```

### ☐ 5. Copernicus Data Space: imágenes satelitales Sentinel-2
- **Qué cubre:** imágenes de 10 m cada pocos días. Sirven para ver el antes y el después de un evento y la vegetación seca para el incendio.
- **Costo:** gratis con cuenta.
- **Pasos:** registrarse en https://dataspace.copernicus.eu y guardar el usuario en `COPERNICUS_USER`. La contraseña no se guarda en texto plano: se pide al momento de usarla.

### Sin cuenta ni clave (ya se pueden usar)
| Servicio | Qué aporta | Acceso |
|---|---|---|
| **IDESC (Alcaldía de Cali)** | Catastro con 713.863 construcciones y pisos, POT, amenazas, y un **modelo de elevación municipal** (`raster:dem_modelo_elevacion_digital`, en WMS). Hay que evaluar si se puede descargar con valores de altura | https://ws-idesc.cali.gov.co/geoserver/ows |
| **ESA WorldCover** | Cobertura del suelo a 10 m (pasto, arbusto, bosque, urbano), tesela `N03W078` | https://esa-worldcover.org (CC BY 4.0) |
| **Open-Meteo** | Viento y humedad del día para el ejercicio de incendio | https://open-meteo.com (no comercial) |
| **OpenFreeMap** | Mapa base vectorial con edificios para MapLibre | https://openfreemap.org |
| **Panoramax** | Otra fuente abierta de fotos de calle | https://panoramax.fr **(verificar cobertura en Cali)** |
| **Overpass / OpenStreetMap** | Hospitales, bomberos, colegios y vías | https://overpass-api.de |

## 3. Método para el escaneo completo: medir la cobertura y llenar los huecos

1. **Grilla de la ciudad:** dividir la zona urbana en celdas de 250 m (unas 2.000 celdas para unos 120 km² urbanos; verificar el área exacta con el perímetro urbano del POT). La caja y las manzanas ya están en `prototipo/datos/procesados/ciudad3d/ciudad.json`.
2. **Por cada celda, medir:**
   - edificios del catastro (ya lo tenemos);
   - fotos de Mapillary: cuántas hay y de qué año (`captured_at`);
   - objetos detectados por Mapillary (postes, señales, hidrantes);
   - elementos de OpenStreetMap (vías, servicios);
   - cobertura del suelo (WorldCover).
3. **Mapa de cobertura:** pintar cada celda como **verde** (fotos de los últimos 2 años), **amarillo** (fotos viejas) o **rojo** (sin fotos), y darle prioridad a las celdas rojas que tienen espacios públicos candidatos a acopio o zonas de amenaza.
4. **Llenar los huecos con captura propia y abierta:** el equipo recorre las celdas rojas con la app de Mapillary o de Panoramax en el celular. Las fotos quedan públicas con CC BY-SA y entran al escaneo. Así la cobertura se vuelve **completa y legal**, sin depender de Google.
5. **Registro:** cada recorrido se anota en la bitácora (`docs/PROYECTO.md`) con fecha, celdas cubiertas y responsable.

> Lo que **no** se hace: recorrer Street View de Google celda por celda ni guardar sus imágenes o metadatos para armar un mapa de cobertura. Eso es crear contenido a partir de Google Maps y lo prohíben sus términos. La Metadata de Google se consulta solo en el momento de mostrar un sitio.

## 4. Registro de cuentas (sin secretos)

| Servicio | Cuenta (correo del equipo) | Creada el | Responsable | Restricciones aplicadas | Cupo |
|---|---|---|---|---|---|
| Mapillary | (cuenta del usuario) | 2026-10-08 | William Ortiz | Token de cliente, solo lectura | Gratis |
| Google Maps Platform | | | | Dominio + solo Maps Embed; presupuesto USD 1 | Embed ilimitado |
| NASA FIRMS | (cuenta del usuario) | 2026-10-08 | William Ortiz | — | 5.000 transacciones cada 10 min (confirmado en el estado de la clave) |
| openrouteservice | | | | — | 2.000 rutas / 500 isócronas al día |
| Copernicus Data Space | | | | — | Gratis |

## 5. Qué se integra en la maqueta cuando llegue cada clave

| Clave | Cambio en la maqueta |
|---|---|
| Google Maps Embed | Recuadro de Street View en la ficha de cada sitio de acopio, con comprobación previa por Metadata |
| Mapillary | Foto de calle abierta en cada ficha y capa de cobertura fotográfica por celda |
| NASA FIRMS | Focos reales del día como puntos de inicio del ejercicio de incendio |
| openrouteservice | Zona a 10 y 15 minutos a pie de cada acopio, en lugar del radio de 1,5 km |
| Open-Meteo (sin clave) | Viento real del día en el ejercicio de incendio |
| WorldCover (sin clave) | Pasto y rastrojo medidos por satélite, en lugar del supuesto de ladera |
