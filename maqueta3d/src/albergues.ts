/** Idoneidad de un espacio para instalar un albergue temporal, explicable criterio por criterio.
 *
 * Capacidad: 45 m² por persona, cifra de planificación de las normas Esfera (2018) para asentamientos tipo
 * campamento, que incluye vías, servicios y áreas comunes (verificar edición vigente). Pendiente ideal ≤ 2 % y
 * no apta desde 8 % (supuesto de diseño; verificar con la guía de alojamientos temporales de la UNGRD).
 * Pesos: supuesto del equipo, visibles en la herramienta para que se puedan discutir.
 */
export const M2_POR_PERSONA = 45;
export const PESOS = { demanda: 0.35, capacidad: 0.2, seguridad: 0.2, pendiente: 0.15, salud: 0.1 } as const;
export type Criterio = keyof typeof PESOS;

const recortar = (v: number) => Math.min(1, Math.max(0, v));
export const capacidadPersonas = (areaM2: number | null) => Math.floor((areaM2 ?? 0) / M2_POR_PERSONA);

export interface Entrada {
  demanda: number; // edificaciones afectadas a menos de 1,5 km
  demandaReferencia: number; // demanda que se considera "máxima" en el caso (p. ej. percentil 90)
  personas: number;
  pendiente: number | null; // %
  distanciaSalud: number | null; // m al servicio de salud más cercano
  seguridad: number; // 0-1, según el escenario
}

export function idoneidad(e: Entrada) {
  const criterios: Record<Criterio, number> = {
    demanda: recortar(e.demanda / Math.max(1, e.demandaReferencia)),
    capacidad: recortar(e.personas / 500),
    seguridad: recortar(e.seguridad),
    pendiente: e.pendiente == null ? 0.5 : recortar(1 - (e.pendiente - 2) / 6),
    salud: e.distanciaSalud == null ? 0.5 : recortar(1 - (e.distanciaSalud - 500) / 2500),
  };
  const puntaje = (Object.keys(PESOS) as Criterio[]).reduce((s, k) => s + criterios[k] * PESOS[k], 0);
  return { puntaje: Math.round(puntaje * 100), criterios };
}

/** Kits y servicios para `personas`, con las reglas del proyecto (kit de 20 personas, 1 baño por 20). */
export function dotacion(personas: number, personasPorKit = 20, personasPorBano = 20, litrosPersonaDia = 15) {
  return {
    kits: Math.ceil(personas / personasPorKit),
    banos: Math.ceil(personas / personasPorBano),
    litrosDia: personas * litrosPersonaDia,
  };
}

/** Percentil `p` (0-1) de una lista de números. */
export function percentil(valores: number[], p: number) {
  if (!valores.length) return 0;
  const o = [...valores].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.floor(p * o.length))];
}
