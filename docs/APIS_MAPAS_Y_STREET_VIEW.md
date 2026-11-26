# Street View y APIs de mapas: paso a paso y alternativas gratis

**Consulta:** 8 de octubre de 2026. Los precios de Google salen de su página oficial, actualizada el 7 de octubre de 2026. Las cifras de terceros que no se pudieron confirmar en una página oficial están marcadas **(verificar)**.

---

## 1. Qué se puede hacer con Google Street View (y qué no)

| Uso | API | ¿Clave? | Costo |
|---|---|---|---|
| Botón que abre Street View en Google Maps | Google Maps URLs | No | Gratis. **Ya está en la app y en el HTML** |
| Ver el panorama **dentro** de nuestra página | Maps Embed API (modo `streetview`) | Sí | **Gratis e ilimitado** (SKU *Embed*, Essentials) |
| Saber si un punto tiene panorama antes de mostrarlo | Street View Metadata | Sí | **Gratis e ilimitado** |
| Foto fija del sitio para fichas o informes | Street View Static API | Sí | 10.000 gratis al mes; después USD 7 por cada 1.000 |
| Panorama interactivo con control total (JS) | Maps JavaScript API, `StreetViewPanorama` | Sí | 5.000 gratis al mes (*Dynamic Street View*, Pro); después USD 14 por cada 1.000 |
| Edificios fotorrealistas 3D de Google | Map Tiles API, *Photorealistic 3D Tiles* | Sí | 1.000 gratis al mes (Enterprise); después USD 6 por cada 1.000 |
| **Mapear la ciudad a partir de Street View** (sacar edificios, árboles, vías…) | — | — | **No permitido**: los términos de Google prohíben crear contenido a partir del contenido de Google Maps y extraerlo |

Desde el 1 de marzo de 2025 ya no existe el crédito mensual de USD 200: cada SKU tiene su propio cupo gratis mensual (10.000 Essentials, 5.000 Pro, 1.000 Enterprise), que se reinicia el día 1 de cada mes. **Igual exige una cuenta de facturación con tarjeta**, aunque solo se use lo gratuito.

**Recomendación para el proyecto:** usar la **Maps Embed API** (gratis, sin límite) para ver el sitio dentro de la página, y la **Metadata** (gratis) para no mostrar un recuadro vacío donde no hay panorama.

## 2. Paso a paso: Street View dentro de la página (Maps Embed API)

1. **Proyecto:** entra a https://console.cloud.google.com con la cuenta del equipo y crea un proyecto, por ejemplo `territorio-preparado`.
2. **Facturación:** en *Facturación*, vincula una cuenta de facturación (pide tarjeta). Si es la primera vez, Google da una prueba de USD 300, pero los cupos gratis de Maps se usan primero.
3. **Habilitar la API:** en *APIs y servicios → Biblioteca*, busca y habilita **Maps Embed API**. Para la foto fija, habilita también **Street View Static API**.
4. **Crear la clave:** en *APIs y servicios → Credenciales → Crear credenciales → Clave de API*.
5. **Restringir la clave (obligatorio):**
   - *Restricciones de aplicaciones → Sitios web (referentes HTTP)*: agrega `http://localhost:8000/*` para las pruebas y el dominio real cuando exista (`https://tu-dominio/*`).
   - *Restricciones de API*: deja solo **Maps Embed API** y, si la usas, **Street View Static API**.
   - Una clave de navegador queda visible en el código de la página. La restricción por dominio es lo que impide que otros la usen.
6. **Tope de gasto:** en *Facturación → Presupuestos y alertas*, crea un presupuesto (por ejemplo USD 1) con alerta al correo. En *APIs y servicios → Cuotas*, limita las solicitudes diarias de Static y Dynamic. Así nunca habrá un cobro sorpresa.
7. **Probar con un servidor local:** un archivo abierto con doble clic (`file://`) **no envía referente**, así que la clave restringida lo rechaza. Para probar:
   ```bash
   cd entregables/simulacion-ciudad
   python3 -m http.server 8000
   # abrir http://localhost:8000/simulacion_ciudad_cali.html
   ```
8. **Código del recuadro** (por cada sitio de acopio, con su latitud y longitud):
   ```html
   <iframe width="100%" height="320" style="border:0" loading="lazy" allowfullscreen
     referrerpolicy="strict-origin-when-cross-origin"
     src="https://www.google.com/maps/embed/v1/streetview?key=TU_CLAVE&location=3.4516,-76.5320&heading=0&pitch=0&fov=80">
   </iframe>
   ```
   Parámetros: `location` (lat,lng) o `pano` (identificador del panorama); `heading` de −180 a 360 (rumbo); `pitch` de −90 a 90; `fov` de 10 a 100 (por defecto 90). Google indica que con `referrerpolicy="strict-origin-when-cross-origin"` el navegador sí envía el dominio y la restricción funciona.
9. **Antes de mostrarlo, comprobar si hay panorama (gratis):**
   `https://maps.googleapis.com/maps/api/streetview/metadata?location=3.4516,-76.5320&key=TU_CLAVE`. Si la respuesta trae `"status": "OK"` hay panorama; si trae `ZERO_RESULTS` no lo hay, y se muestra solo el enlace.
10. **Foto fija (opcional):** `https://maps.googleapis.com/maps/api/streetview?size=640x400&location=3.4516,-76.5320&fov=80&key=TU_CLAVE`. Cuenta contra el cupo de 10.000 al mes. No se deben guardar copias de las imágenes **(verificar el alcance en los términos vigentes)**.

**Lo que hay que llevar a la app:** solo la clave. El HTML ya tiene la latitud y longitud de cada sitio. Cuando exista la clave, se agrega el recuadro en la ficha de cada acopio.

## 3. Alternativas gratis para mapear mejor la ciudad

### 3.1 Librerías para dibujar el mapa (como Leaflet)

| Librería | Para qué sirve en el proyecto | Costo y licencia |
|---|---|---|
| **Leaflet** (la que ya usamos) | Mapa 2D liviano | Gratis, BSD-2 |
| **MapLibre GL JS** — https://maplibre.org | El mejor paso desde Leaflet: mapas vectoriales con edificios en 3D, relieve e inclinación de cámara | Gratis, código abierto (BSD-3) |
| **OpenFreeMap** — https://openfreemap.org | El "fondo" para MapLibre: mapa base de OpenStreetMap **sin clave, sin registro y sin límite de vistas**, y permite uso comercial. Estilo: `https://tiles.openfreemap.org/styles/liberty` | Gratis, sin garantía de servicio |
| **OpenLayers** — https://openlayers.org | El más fuerte con servicios WMS/WFS como los de la IDESC y el IGAC | Gratis, BSD-2 |
| **deck.gl** — https://deck.gl | Muchos datos a la vez: mapas de calor, hexágonos, columnas 3D sobre MapLibre | Gratis, MIT |
| **CesiumJS** — https://cesium.com/platform/cesiumjs/ | Globo 3D y 3D Tiles; puede cargar las teselas fotorrealistas de Google | Gratis, Apache-2.0. Cesium ion tiene un plan gratis **(verificar condiciones)** |
| **3DTilesRendererJS** — https://github.com/NASA-AMMOS/3DTilesRendererJS | Cargar 3D Tiles (incluidas las de Google) dentro de **nuestra** escena de Three.js | Gratis, Apache-2.0 |

### 3.2 Datos y APIs gratis que mejoran la simulación

| Fuente | Qué aporta | Acceso |
|---|---|---|
| **Mapillary** — https://www.mapillary.com/developer/api-documentation | Fotos a nivel de calle (más de 3.000 millones de imágenes) y objetos detectados (señales, postes). **Alternativa legal a Street View para mapear**: las imágenes son CC BY-SA y permiten derivar datos con atribución ("Images from Mapillary, CC BY-SA") | Gratis con token de desarrollador. **(verificar cobertura en Cali y la política de uso vigente)** |
| **Panoramax** — https://panoramax.fr y **KartaView** — https://kartaview.org | Otras colecciones abiertas de fotos de calle | Gratis **(verificar cobertura en Cali)** |
| **NASA FIRMS** — https://firms.modaps.eosdis.nasa.gov/api/map_key | **Focos de calor reales** (MODIS y VIIRS), casi en tiempo real. Sirve para ubicar el inicio del ejercicio de incendio en un foco real. Endpoint: `/api/area/csv/[MAP_KEY]/[FUENTE]/[OESTE,SUR,ESTE,NORTE]/[DÍAS]`, **de 1 a 5 días por consulta** (probado el 8-oct-2026: con 10 días responde «Invalid day range. Expects [1..5]») | Clave gratis por correo. Unas 5.000 transacciones cada 10 minutos (Q&A de NASA, 2025) |
| **Open-Meteo** — https://open-meteo.com | **Viento real** (dirección y velocidad a 10 m) para el ejercicio de incendio, en vez de elegirlo a mano | Sin clave. Gratis para uso no comercial, hasta menos de 10.000 llamadas al día; datos CC BY 4.0 |
| **openrouteservice** — https://openrouteservice.org/plans/ | **Isócronas**: qué zona queda a 10 o 15 minutos a pie de cada acopio, en vez de un radio fijo de 1,5 km. También rutas | Clave gratis: 2.000 rutas y 500 isócronas al día. Hay un plan *Collaborative* para entidades humanitarias, académicas y públicas con más cupo |
| **ESA WorldCover** — https://esa-worldcover.org | **Cobertura del suelo a 10 m** (bosque, pasto, arbusto, cultivo, urbano). Reemplazaría el supuesto de "ladera no urbana" del incendio por un dato real de pastos y rastrojo. A Cali le corresponde la tesela `N03W078` | Gratis, CC BY 4.0 (citar ESA y la DOI de la versión). También en AWS Open Data |
| **Copernicus DEM GLO-30** — https://registry.opendata.aws/copernicus-dem/ | Relieve de 30 m más reciente que el SRTM que usamos | Gratis, en AWS Open Data |
| **Copernicus Data Space** — https://dataspace.copernicus.eu | Imágenes Sentinel-2 (10 m) para ver el antes y el después de un evento | Gratis con cuenta |
| **Overpass / OpenStreetMap** — https://overpass-api.de | Vías, hospitales, estaciones de bomberos y colegios | Gratis; servidores públicos saturados a veces (el 8 de octubre no respondieron) |
| **Nominatim** — https://nominatim.org | Buscar direcciones (geocodificación) | Gratis, con política de uso: pocas consultas por segundo **(verificar)** |
| **IDESC** — https://ws-idesc.cali.gov.co/geoserver/ows | Catastro, POT, amenazas: la fuente principal que ya usamos | Gratis |

## 4. Prioridad sugerida para el proyecto

1. **Clave de Maps Embed API** (sección 2): Street View dentro de la ficha de cada acopio, gratis.
2. **openrouteservice (isócronas):** pasar de "1,5 km en línea recta" a "15 minutos a pie" es más fiel y más fácil de explicar.
3. **NASA FIRMS + Open-Meteo:** el ejercicio de incendio arranca en focos reales y con el viento del día.
4. **ESA WorldCover:** quita el supuesto de la ladera y usa el pasto y rastrojo medidos por satélite.
5. **MapLibre + OpenFreeMap:** si se quiere un mapa base vectorial con edificios 3D además de nuestra maqueta.

## Fuentes de esta guía

- Precios de Google Maps Platform (actualizada el 7-oct-2026): https://developers.google.com/maps/billing-and-pricing/pricing
- Cambios del 1 de marzo de 2025 (fin del crédito de USD 200 y cupos por SKU): https://developers.google.com/maps/billing-and-pricing/march-2025
- Preguntas frecuentes de facturación (cuenta de facturación obligatoria): https://developers.google.com/maps/billing-and-pricing/faq
- Maps Embed API, modo Street View y `referrerpolicy`: https://developers.google.com/maps/documentation/embed/embedding-map
- Términos de Google Maps Platform: https://cloud.google.com/maps-platform/terms. No se pudo leer la página completa. La prohibición de crear contenido a partir del contenido de Google Maps aparece citada en https://conductatlas.com/platform/google-maps/google-maps-platform-terms-of-service/provision/CA-P-041128/prohibition-on-creating-content-from-google-maps-content/ y en https://wiki.openstreetmap.org/wiki/Google **(verificar el número de sección en la versión vigente)**
- Mapillary, licencia CC BY-SA: https://help.mapillary.com/hc/en-us/articles/115001770409-CC-BY-SA-license-for-open-data
- NASA FIRMS, clave y límites: https://firms.modaps.eosdis.nasa.gov/api/map_key y https://appliedsciences.nasa.gov/sites/default/files/2025-05/Part%203%20FIRMS%202025%20Q&A%20Session.docx.pdf
- Open-Meteo, términos: https://open-meteo.com/en/terms
- openrouteservice, planes: https://openrouteservice.org/plans/
- ESA WorldCover, licencia y descarga: https://registry.opendata.aws/esa-worldcover-vito/ y https://worldcover2021.esa.int/download
- OpenFreeMap: https://openfreemap.org y https://openfreemap.org/quick_start/
