# Cómo llevar Territorio Preparado a otras ciudades

**Problema:** la maqueta 3D de Cali se curó a mano (14.179 manzanas, relieve, amenazas oficiales). Repetir eso en cada ciudad no escala.

**Decisión de diseño:** el 3D es un *nivel opcional*, no un requisito. Cada ciudad (fila de `maqueta3d/bd/ciudades.csv`) declara su `nivel_detalle`:

| Nivel | Qué ofrece | Qué necesita | Esfuerzo por ciudad |
|---|---|---|---|
| `mapa` | Mapa 2D con límites, espacios propuestos y reportes mensuales | Los CSV de `bd/` y un mapa base abierto | Horas: lo llena la comunidad con la guía de datos |
| `edificios` | 3D automático: edificios extruidos sobre el relieve | Huellas de edificios abiertas y un modelo digital de elevación público | Un script repetible por ciudad (no escrito aún) |
| `maqueta` | 3D curado con amenazas, simulación de sismo/inundación/incendio y acopios | Datos oficiales de amenaza y revisión local | Semanas: solo Cali hoy |

## Ruta técnica propuesta para el nivel `edificios` (no implementada)
1. **Huellas y alturas:** OpenStreetMap y/o Overture Maps (edificios). Licencias ODbL y CDLA-Permissive según la fuente: **verificar** antes de redistribuir.
2. **Relieve:** Copernicus DEM GLO-30 o SRTM (verificar términos de atribución).
3. **Generación:** un script que, dada una caja de coordenadas, descarga las huellas, las extruye con la altura disponible (o niveles × 3 m, como en Cali) y empaqueta un GLB comprimido (Draco/meshopt) más un JSON de manzanas con el mismo formato que `escenarios.json`. Así el simulador de sismo (`sismoCiudad.ts`) funcionaría sin cambios.
4. **Límite honesto:** sin catastro oficial, las alturas son incompletas; el panel debe mostrar el porcentaje de edificios con altura conocida y marcar el resto como estimado.

## Qué se hizo ya
- La app elige ciudad desde `bd/ciudades.csv`. Para una ciudad sin maqueta muestra sus niveles y envía a la comunidad a proponer espacios y reportar.
- Barcelona figura como `propuesta` en nivel `mapa` (sede del congreso): **no hay datos de Barcelona cargados**.

## Pendiente
- Script del nivel `edificios` y prueba con una ciudad pequeña.
- Mapa 2D genérico por ciudad (hoy el mapa de espacios usa los datos de Cali).
- Decidir con el equipo qué ciudad sigue después de Cali.
