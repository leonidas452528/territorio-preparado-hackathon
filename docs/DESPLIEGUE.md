# Despliegue de la Fase 1 (hosting estático)

**Estado (27-oct-2026):** preparado, **no publicado**. Publicar es una decisión del equipo: el sitio queda accesible por enlace. El repositorio es privado; GitHub Pages sigue publicando la demo anterior sin cabeceras de seguridad.

## Por qué Netlify (o Cloudflare Pages) y no GitHub Pages
GitHub Pages no permite cabeceras HTTP, así que la política de seguridad (CSP, HSTS, `nosniff`…) de `maqueta3d/public/_headers` no tendría efecto. Netlify y Cloudflare Pages leen ese archivo tal cual. Ambos sirven brotli automáticamente y no hay servidor propio que defender.

## Pasos (Netlify, unos 5 minutos)
1. Entrar en Netlify → *Add new site* → *Import an existing project* → elegir el repositorio. `netlify.toml` (raíz) ya define la carpeta base `maqueta3d`, la versión de Node (24.22.1), `npm ci --ignore-scripts`, el escáner de secretos, las 40 pruebas de lógica y la compilación, y publica `dist/`.
2. Alternativa sin conectar el repositorio: en `maqueta3d/` ejecutar `npm ci --ignore-scripts && npm run build` y arrastrar la carpeta `dist/` a *Deploys* (carga manual).
3. No hacen falta variables de entorno: la Fase 1 usa solo los JSON estáticos. (Fase 2: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, y añadir el dominio de Supabase a `connect-src` en `_headers`.)

## Verificación después de publicar
```bash
curl -sI https://<sitio>.netlify.app | grep -iE "content-security-policy|strict-transport|x-content-type|x-robots"
```
Debe mostrar CSP, HSTS, `nosniff` y `X-Robots-Tag: noindex`. Abrir las cuatro vistas 3D (mapa, refugio, simulación de ciudad, kit) con la consola abierta: no debe haber errores de «Content Security Policy». En la prueba local hubo 0 violaciones.

## Peso medido (compilación del 27-oct-2026)
| Qué se descarga | Bruto | gzip | brotli |
|---|---|---|---|
| Pestaña «Mapa» (código + CSS del núcleo) | 1.260 KB | 354 KB | 297 KB |
| Datos del mapa (5 JSON) | 8.378 KB | 1.745 KB | 982 KB |
| **Total de la primera vista** | | **≈ 2,1 MB** | **≈ 1,3 MB** |
| Pestaña «Simulación de ciudad» (GLB + escenarios) | 3.236 KB | 1.739 KB | 1.652 KB |

El GLB ya viene comprimido con Draco, por eso casi no baja. Con brotli se cumple la meta de menos de 2 MB en la primera vista; no hizo falta partir los JSON por comuna.

## Mientras no se defina el dominio
`_headers` incluye `X-Robots-Tag: noindex, nofollow`; quitarlo al pasar al dominio definitivo.

## Marcha atrás
Netlify conserva cada despliegue: *Deploys* → elegir uno anterior → *Publish deploy*.
