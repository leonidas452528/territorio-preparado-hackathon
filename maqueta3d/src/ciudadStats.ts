/** Resúmenes numéricos de la simulación de ciudad (sin React ni three), para presentarlos y probarlos.
 * Solo agrega lo que ya está en los datos: no inventa cifras (AGENTS.md, regla 9). */
import type { Escenario, Escenarios } from "./ciudadSim";

export interface FilaNivel {
  nivel: 1 | 2 | 3;
  etiqueta: string;
  manzanas: number;
  construcciones: number;
}

/** Etiqueta de cada nivel de afectación según el escenario (el nivel 3 es el más intenso). */
export const etiquetasNivel: Record<Escenario, Partial<Record<1 | 2 | 3, string>>> = {
  inundacion: { 3: "Amenaza alta", 2: "Amenaza media", 1: "Amenaza baja" },
  sismo: { 1: "Daño leve", 2: "Daño moderado", 3: "Daño importante o mayor" },
  incendio: { 3: "Dentro del margen supuesto" },
};

/** Manzanas y construcciones por nivel de afectación (los niveles sin manzanas no se listan). */
export function resumenPorNivel(e: Escenarios, escenario: Escenario, niveles: number[]): FilaNivel[] {
  const filas = new Map<number, FilaNivel>();
  niveles.forEach((n, k) => {
    if (!n) return;
    const nivel = n as 1 | 2 | 3;
    const fila = filas.get(nivel) ?? {
      nivel,
      etiqueta: etiquetasNivel[escenario][nivel] ?? `Nivel ${nivel}`,
      manzanas: 0,
      construcciones: 0,
    };
    fila.manzanas += 1;
    fila.construcciones += e.manzanas[k][3];
    filas.set(nivel, fila);
  });
  return [...filas.values()].sort((a, b) => b.nivel - a.nivel);
}

export type ClaseDano = "destruida" | "danada" | "posible";

/** Clasificación de la etiqueta de daño de Copernicus / ICube-SERTIT. */
export function claseDano(etiqueta: string): ClaseDano {
  if (/destroy/i.test(etiqueta)) return "destruida";
  if (/possibly|sin definir/i.test(etiqueta)) return "posible";
  return "danada";
}

/** Naturaleza del dato: no es lo mismo un daño observado en imagen satelital que uno estimado por un modelo. */
export type TipoFuente = "observado" | "modelo" | "reportado";

export const tipoFuente = (fuente: string): TipoFuente =>
  /copernicus|icube|sertit/i.test(fuente) ? "observado" : /modelo|microsoft|airbus/i.test(fuente) ? "modelo" : "reportado";

export interface ResumenDanos {
  total: number;
  porClase: Record<ClaseDano, number>;
  porFuente: Record<string, number>;
  porTipo: Record<TipoFuente, number>;
}

export function resumenDanos(e: Escenarios): ResumenDanos {
  const r: ResumenDanos = {
    total: e.danos_sismo.length,
    porClase: { destruida: 0, danada: 0, posible: 0 },
    porFuente: {},
    porTipo: { observado: 0, modelo: 0, reportado: 0 },
  };
  for (const [, , etiqueta, fuente] of e.danos_sismo) {
    r.porClase[claseDano(etiqueta)] += 1;
    r.porTipo[tipoFuente(fuente)] += 1;
    r.porFuente[fuente] = (r.porFuente[fuente] ?? 0) + 1;
  }
  return r;
}

/** Celdas quemadas y hectáreas (celda de `paso` m de lado). Ejercicio ilustrativo, no un pronóstico. */
export function resumenIncendio(quemadas: [number, number, number][], paso: number, pasoActual: number, ventana = 6) {
  const activas = quemadas.filter(([, , t]) => pasoActual - t < ventana).length;
  return {
    celdas: quemadas.length,
    hectareas: (quemadas.length * paso * paso) / 10000,
    activas,
  };
}

/** Participación (0-1) de un valor sobre un máximo, acotada; para dibujar barras sin desbordes. */
export const proporcion = (valor: number, maximo: number) => (maximo > 0 ? Math.min(1, Math.max(0, valor / maximo)) : 0);
