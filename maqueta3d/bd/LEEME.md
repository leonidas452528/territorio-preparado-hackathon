# Base de datos en texto plano

Cada tabla es un archivo CSV (UTF-8, separado por comas, encabezados en la primera fila). Se versiona con git: cada cambio queda con autor y fecha, y se puede revisar antes de aceptarlo.

| Archivo | Quién lo llena | Qué contiene |
|---|---|---|
| `ciudades.csv` | entidad | ciudades y su nivel de detalle (mapa, edificios, maqueta) |
| `organizaciones.csv` | entidad | quién reporta; el ente asigna el código |
| `espacios_propuestos.csv` | comunidad | lugares propuestos; la entidad los revisa |
| `reportes.csv` | comunidad | reporte mensual, solo conteos |
| `diccionario.csv` | (generado) | cada columna: tipo, obligatoria, regla y ejemplo |

- **El esquema está en `src/datos/esquema.ts`.** El diccionario, la guía de la app, los formularios, las plantillas y el validador salen de ahí. Regenerar: `npm run bd`.
- **Probar:** `npm test` valida todos los CSV de esta carpeta contra el esquema (tipos, llaves entre tablas, reglas).
- Las filas actuales son **de ejemplo** (códigos `demo-…`). Los datos reales de comunidad no deben subirse a un sitio público.
- Solo datos agregados: nada que identifique a una persona. Esto no sustituye la revisión jurídica de la Ley 1581 de 2012 (verificar con el equipo legal).
- Cuando haya más de una persona escribiendo a la vez o más de ~50.000 filas, es la señal para pasar a la base SQL del repositorio (`db/`).
