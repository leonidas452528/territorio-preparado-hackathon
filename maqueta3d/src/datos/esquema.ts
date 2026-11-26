/** Esquema de la base de datos en texto plano (CSV). Es la ÚNICA fuente: de aquí salen el diccionario
 * (`bd/diccionario.csv`), la guía de datos de la app, los formularios, las plantillas y el validador.
 * Cada tabla es un archivo `bd/<tabla>.csv` (UTF-8, coma, primera fila = encabezados).
 * Solo datos agregados y públicos: nada que identifique a una persona (Ley 1581/2012; menores, Ley 1098/2006). */

export type Tipo = "id" | "texto" | "entero" | "decimal" | "mes" | "opcion" | "si_no";

export interface Columna {
  nombre: string;
  tipo: Tipo;
  obligatoria: boolean;
  /** Valores permitidos cuando tipo = "opcion". */
  opciones?: string[];
  min?: number;
  max?: number;
  /** Longitud máxima para tipo texto. */
  largo?: number;
  /** Nombre legible para el formulario (si falta, se deriva del nombre de la columna). */
  etiqueta?: string;
  /** Qué significa y cómo llenarla, en lenguaje llano. */
  ayuda: string;
  ejemplo: string;
}

export interface Tabla {
  id: string;
  titulo: string;
  /** Quién llena esta tabla. */
  quien: "entidad" | "comunidad";
  resumen: string;
  columnas: Columna[];
  /** Regla entre columnas, en palabras (se muestra en la guía; la lógica está en validar.ts). */
  reglas: string[];
}

const ID = "Letras minúsculas, números y guiones (3-40 caracteres).";

export const TIPOS_ORG = ["propiedad_horizontal", "jac", "comite_barrial", "caja_compensacion", "aseguradora", "otra"];
export const TIPOS_REPORTE = ["estado_espacio", "necesidad", "alerta_barrial"];
export const TIPOS_ESPACIO = ["parque", "cancha", "coliseo", "salon_comunal", "parqueadero", "colegio", "otro"];

export const TABLAS: Record<string, Tabla> = {
  ciudades: {
    id: "ciudades",
    titulo: "Ciudades",
    quien: "entidad",
    resumen: "Catálogo de ciudades. Cada ciudad dice con cuánto detalle se puede mostrar.",
    columnas: [
      { nombre: "ciudad_id", tipo: "id", obligatoria: true, ayuda: `Identificador estable: nombre y país. ${ID}`, ejemplo: "cali-co" },
      { nombre: "nombre", tipo: "texto", obligatoria: true, largo: 80, ayuda: "Nombre público de la ciudad.", ejemplo: "Cali" },
      { nombre: "pais", tipo: "texto", obligatoria: true, largo: 2, ayuda: "Código de país de 2 letras (ISO 3166-1).", ejemplo: "CO" },
      { nombre: "lat", tipo: "decimal", obligatoria: true, min: -90, max: 90, ayuda: "Latitud del centro, en grados decimales.", ejemplo: "3.4516" },
      { nombre: "lon", tipo: "decimal", obligatoria: true, min: -180, max: 180, ayuda: "Longitud del centro, en grados decimales.", ejemplo: "-76.5320" },
      { nombre: "nivel_detalle", tipo: "opcion", obligatoria: true, opciones: ["mapa", "edificios", "maqueta"], ayuda: "mapa = mapa 2D y espacios; edificios = 3D automático desde huellas abiertas; maqueta = 3D curado con simulaciones.", ejemplo: "maqueta" },
      { nombre: "estado", tipo: "opcion", obligatoria: true, opciones: ["piloto", "propuesta"], ayuda: "piloto = ya hay datos y equipo; propuesta = solo se ha planteado.", ejemplo: "piloto" },
      { nombre: "idioma", tipo: "opcion", obligatoria: true, opciones: ["es", "en", "pt", "fr", "ca"], ayuda: "Idioma principal de la ciudad para sus avisos y plantillas.", ejemplo: "es" },
      { nombre: "marco_legal", tipo: "texto", obligatoria: true, largo: 120, ayuda: "Norma de gestión del riesgo y de protección de datos que aplica en ese país. Escribe «Por definir» si aún no se ha confirmado: no la inventes.", ejemplo: "Colombia: Ley 1523 de 2012" },
    ],
    reglas: [],
  },
  organizaciones: {
    id: "organizaciones",
    titulo: "Organizaciones",
    quien: "entidad",
    resumen: "Quién reporta. El ente responsable asigna un código a cada conjunto, JAC, comité o aliado. Son organizaciones, no personas.",
    columnas: [
      { nombre: "codigo_organizacion", tipo: "id", obligatoria: true, ayuda: `Código que asigna el ente. Sin nombres de personas. ${ID}`, ejemplo: "conj-azalea-01" },
      { nombre: "ciudad_id", tipo: "id", obligatoria: true, ayuda: "Ciudad donde actúa (debe existir en ciudades).", ejemplo: "cali-co" },
      { nombre: "tipo", tipo: "opcion", obligatoria: true, opciones: TIPOS_ORG, ayuda: "Tipo de organización.", ejemplo: "propiedad_horizontal" },
      { nombre: "zona", tipo: "texto", obligatoria: true, largo: 80, ayuda: "Comuna, barrio o sector. No pongas direcciones de vivienda.", ejemplo: "Comuna 17" },
      { nombre: "activa", tipo: "si_no", obligatoria: true, ayuda: "1 si sigue reportando, 0 si no.", ejemplo: "1" },
    ],
    reglas: [],
  },
  espacios_propuestos: {
    id: "espacios_propuestos",
    titulo: "Espacios propuestos",
    quien: "comunidad",
    resumen: "Lugares que la comunidad propone como punto de encuentro, acopio o alojamiento. La entidad los revisa antes de que cuenten.",
    columnas: [
      { nombre: "espacio_id", tipo: "id", obligatoria: true, ayuda: `Identificador del espacio. ${ID}`, ejemplo: "cali-salon-azalea" },
      { nombre: "ciudad_id", tipo: "id", obligatoria: true, ayuda: "Ciudad (debe existir en ciudades).", ejemplo: "cali-co" },
      { nombre: "nombre_publico", tipo: "texto", obligatoria: true, largo: 100, ayuda: "Nombre del lugar como se conoce públicamente.", ejemplo: "Salón comunal Azalea" },
      { nombre: "tipo_espacio", tipo: "opcion", obligatoria: true, opciones: TIPOS_ESPACIO, ayuda: "Tipo de espacio.", ejemplo: "salon_comunal" },
      { nombre: "lat", tipo: "decimal", obligatoria: true, min: -90, max: 90, ayuda: "Latitud (clic derecho en un mapa y copia el primer número).", ejemplo: "3.3942" },
      { nombre: "lon", tipo: "decimal", obligatoria: true, min: -180, max: 180, ayuda: "Longitud (el segundo número).", ejemplo: "-76.5426" },
      { nombre: "area_m2", tipo: "decimal", obligatoria: false, min: 1, max: 5000000, ayuda: "Área aproximada en m². Déjala vacía si no la conoces: no la inventes.", ejemplo: "180" },
      { nombre: "cubierto", tipo: "si_no", obligatoria: true, ayuda: "1 si tiene techo, 0 si es abierto.", ejemplo: "1" },
      { nombre: "propietario", tipo: "opcion", obligatoria: true, opciones: ["publico", "privado", "desconocido"], ayuda: "Quién es el propietario.", ejemplo: "privado" },
      { nombre: "autorizacion", tipo: "opcion", obligatoria: true, opciones: ["si", "no", "pendiente"], ayuda: "¿El propietario autorizó usarlo en emergencias?", ejemplo: "pendiente" },
      { nombre: "observacion", tipo: "texto", obligatoria: false, largo: 280, ayuda: "Máximo 280 caracteres. Sin nombres, correos, teléfonos ni documentos.", ejemplo: "Tiene baño y tomas de agua." },
    ],
    reglas: ["Si el propietario es privado, la autorización no puede ser «no»: ese espacio no se usa."],
  },
  reportes: {
    id: "reportes",
    titulo: "Reportes mensuales",
    quien: "comunidad",
    resumen: "El reporte mensual de cada organización: solo conteos, nunca personas identificables.",
    columnas: [
      { nombre: "ciudad_id", tipo: "id", obligatoria: true, ayuda: "Ciudad (debe existir en ciudades).", ejemplo: "cali-co" },
      { nombre: "periodo", tipo: "mes", obligatoria: true, ayuda: "Mes que se reporta, formato AAAA-MM.", ejemplo: "2026-10" },
      { nombre: "codigo_organizacion", tipo: "id", obligatoria: true, ayuda: "El código que te dio tu ente (debe existir en organizaciones).", ejemplo: "conj-azalea-01" },
      { nombre: "tipo_reporte", tipo: "opcion", obligatoria: true, opciones: TIPOS_REPORTE, ayuda: "estado_espacio = cómo está un espacio; necesidad = lo que falta; alerta_barrial = algo que preocupa.", ejemplo: "necesidad" },
      { nombre: "espacio_id", tipo: "id", obligatoria: false, ayuda: "Espacio al que se refiere. Obligatorio si el tipo es estado_espacio.", ejemplo: "cali-salon-azalea" },
      { nombre: "n_total", tipo: "entero", obligatoria: false, min: 0, max: 100000, ayuda: "Personas que se podrían alojar o que están en la zona. Solo un número.", ejemplo: "120" },
      { nombre: "n_0_5", tipo: "entero", obligatoria: false, min: 0, max: 100000, ayuda: "De ese total, niñez de 0 a 5 años.", ejemplo: "10" },
      { nombre: "n_6_17", tipo: "entero", obligatoria: false, min: 0, max: 100000, ayuda: "De 6 a 17 años.", ejemplo: "25" },
      { nombre: "n_18_59", tipo: "entero", obligatoria: false, min: 0, max: 100000, ayuda: "De 18 a 59 años.", ejemplo: "70" },
      { nombre: "n_60_mas", tipo: "entero", obligatoria: false, min: 0, max: 100000, ayuda: "De 60 años o más.", ejemplo: "15" },
      { nombre: "n_discapacidad", tipo: "entero", obligatoria: false, min: 0, max: 100000, ayuda: "Opcional y sensible: solo el conteo, nunca quién.", ejemplo: "4" },
      { nombre: "n_animales_compania", tipo: "entero", obligatoria: false, min: 0, max: 100000, ayuda: "Animales de compañía.", ejemplo: "12" },
      { nombre: "observacion", tipo: "texto", obligatoria: false, largo: 280, ayuda: "Máximo 280 caracteres. Sin nombres, correos, teléfonos ni documentos.", ejemplo: "Faltan colchonetas y agua." },
    ],
    reglas: [
      "estado_espacio exige espacio_id.",
      "Los cuatro grupos de edad van completos y suman n_total, o van todos vacíos.",
      "n_discapacidad no puede superar n_total.",
    ],
  },
};

export const ORDEN_TABLAS = ["ciudades", "organizaciones", "espacios_propuestos", "reportes"];

const ETIQUETAS: Record<string, string> = {
  ciudad_id: "Ciudad", codigo_organizacion: "Código de tu organización", periodo: "Mes del reporte", tipo_reporte: "Tipo de reporte",
  espacio_id: "Código del espacio", n_total: "Personas en total", n_0_5: "De 0 a 5 años", n_6_17: "De 6 a 17 años", n_18_59: "De 18 a 59 años",
  n_60_mas: "De 60 años o más", n_discapacidad: "Personas con discapacidad", n_animales_compania: "Animales de compañía", observacion: "Observación",
  nombre_publico: "Nombre del lugar", tipo_espacio: "Tipo de espacio", lat: "Latitud", lon: "Longitud", area_m2: "Área en m²", cubierto: "¿Tiene techo?",
  propietario: "Propietario", autorizacion: "¿Autorizó su uso en emergencias?", nivel_detalle: "Nivel de detalle", idioma: "Idioma", marco_legal: "Marco legal local", tipo: "Tipo", zona: "Zona", activa: "¿Sigue activa?",
  nombre: "Nombre", pais: "País", estado: "Estado",
};
for (const tb of Object.values(TABLAS)) for (const c of tb.columnas) c.etiqueta ??= ETIQUETAS[c.nombre];
