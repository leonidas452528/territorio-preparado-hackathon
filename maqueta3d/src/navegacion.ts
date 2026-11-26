/** Áreas de la app y sus secciones. La ruta es `#/<area>/<seccion>`; `tab` es el identificador interno de la vista. */
export type Area = "entidad" | "aporta";
export interface Seccion { id: string; tab: string; etiqueta: string; grupo: string; /** requiere los datos y la maqueta de la ciudad piloto */ soloCiudadConDatos?: boolean }

export const AREAS: Record<Area, { titulo: string; lema: string; secciones: Seccion[] }> = {
  entidad: {
    titulo: "Entidades",
    lema: "Conocer el riesgo, simular y preparar.",
    secciones: [
      { id: "ciudad", tab: "ficha", etiqueta: "Ficha de ciudad", grupo: "Conocer" },
      { id: "mapa", tab: "map", etiqueta: "Mapa de espacios", grupo: "Conocer", soloCiudadConDatos: true },
      { id: "simular", tab: "ciudad", etiqueta: "Simular una amenaza", grupo: "Simular y preparar", soloCiudadConDatos: true },
      { id: "refugio", tab: "scene", etiqueta: "Demostración de refugio", grupo: "Simular y preparar", soloCiudadConDatos: true },
      { id: "preparar", tab: "plan", etiqueta: "Preparar un espacio", grupo: "Simular y preparar", soloCiudadConDatos: true },
      { id: "kit", tab: "kit", etiqueta: "El kit", grupo: "Simular y preparar" },
      { id: "prevencion", tab: "prevention", etiqueta: "Orientación preventiva", grupo: "Informar", soloCiudadConDatos: true },
      { id: "recibidos", tab: "recibidos", etiqueta: "Datos recibidos", grupo: "Datos" },
      { id: "guia", tab: "guia", etiqueta: "Guía de datos", grupo: "Datos" },
      { id: "operacion", tab: "operacion", etiqueta: "Operación", grupo: "Datos", soloCiudadConDatos: true },
    ],
  },
  aporta: {
    titulo: "Comunidad",
    lema: "Reporta cada mes y propone espacios, sin datos personales.",
    secciones: [
      { id: "reportar", tab: "reportar", etiqueta: "Enviar reporte mensual", grupo: "Aportar" },
      { id: "espacio", tab: "espacio", etiqueta: "Proponer un espacio", grupo: "Aportar" },
      { id: "guia", tab: "guia", etiqueta: "Guía de datos", grupo: "Aportar" },
      { id: "mapa", tab: "map", etiqueta: "Mapa de espacios", grupo: "Consultar", soloCiudadConDatos: true },
      { id: "prevencion", tab: "prevention", etiqueta: "Orientación preventiva", grupo: "Consultar", soloCiudadConDatos: true },
    ],
  },
};

export interface Ruta { area: Area | null; seccion: string | null; pagina: "home" | "aliados" | "trabajo" }

/** `#/` → inicio; `#/aliados`; `#/entidad/mapa`. Rutas viejas de un solo segmento (`#/mapa`) caen en Entidades. */
export function leerRuta(hash: string): Ruta {
  const partes = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (partes.length === 0 || partes[0] === "inicio") return { area: null, seccion: null, pagina: "home" };
  if (partes[0] === "aliados") return { area: null, seccion: null, pagina: "aliados" };
  const area = (partes[0] === "entidad" || partes[0] === "aporta" ? partes[0] : "entidad") as Area;
  const id = partes.length > 1 || (partes[0] !== "entidad" && partes[0] !== "aporta") ? partes[partes.length - 1] : null;
  const s = AREAS[area].secciones.find((x) => x.id === id) ?? AREAS[area].secciones[0];
  return { area, seccion: s.id, pagina: "trabajo" };
}

export const hrefDe = (area: Area, seccion: string) => `#/${area}/${seccion}`;
