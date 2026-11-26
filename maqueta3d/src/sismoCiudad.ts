/** Escenario sísmico sobre la ciudad por manzana (sin React ni three, para poder probarlo con node --test).
 * Usa el motor explicable de `sismo.ts`: intensidad (Allen, Wald y Worden 2012) y daño medio por clase de
 * vulnerabilidad según pisos (Lagomarsino y Giovinazzi 2006), con distribución binomial de los grados EMS-98.
 * Es un escenario para preparar, no un pronóstico ni una evaluación de edificios. */
import { danoMedio, intensidadEn, SISMO_REAL, vulnerabilidad } from "./sismo.ts";
import type { Escenarios } from "./ciudadSim";

/** Epicentros predefinidos (lon, lat). El del sismo real es la solución del SGC; el de Cali es ilustrativo. */
export const EPICENTROS = {
  real: { nombre: "Sismo real del 10-ago-2026 (Chocó, SGC)", lon: SISMO_REAL.lon, lat: SISMO_REAL.lat, profundidad: SISMO_REAL.profundidad, magnitud: SISMO_REAL.magnitud },
  cali: { nombre: "Bajo el centro de Cali (ilustrativo)", lon: -76.532, lat: 3.4516, profundidad: 15, magnitud: 6.5 },
} as const;
export type EpicentroId = keyof typeof EPICENTROS | "mapa";

/** Centro de Cali (Plaza de Caicedo), para informar la intensidad esperada. */
export const CENTRO_CALI: readonly [number, number] = [-76.532, 3.4516];

const COMB = [1, 5, 10, 10, 5, 1];
export const pmf = (p: number) => COMB.map((c, k) => c * p ** k * (1 - p) ** (5 - k));

export interface ParametrosSismo {
  magnitud: number;
  profundidad: number;
  /** Epicentro en coordenadas locales (m): x = este, y = norte, como el resto de la simulación. */
  epicentro: readonly [number, number];
}

export interface ResumenSismo {
  /** Nivel de color por manzana: 0 sin daño relevante, 1 leve, 2 moderado, 3 importante o mayor (según el daño medio). */
  niveles: number[];
  /** Construcciones esperadas por grado EMS-98 (0 sin daño … 5 colapso). */
  grados: number[];
  total: number;
  /** Construcciones con daño importante o mayor (grados 3 a 5). */
  importantes: number;
  /** Intensidad (Mercalli modificada) esperada en suelo firme del centro de Cali. */
  intensidadCentro: number;
  /** Distancia del epicentro al centro de Cali, en km. */
  distanciaCentroKm: number;
}

/** Pisos a partir de la altura de la manzana (promedio de pisos × 3 m, ver prototipo/scripts/ciudad3d.py). */
export const pisosDe = (alturaM: number) => Math.max(1, Math.round(alturaM / 3));

export function nivelDeDano(muD: number) {
  return muD >= 2.5 ? 3 : muD >= 1.5 ? 2 : muD >= 0.5 ? 1 : 0;
}

export function escenarioSismo(e: Pick<Escenarios, "manzanas" | "origen" | "kx" | "ky">, { magnitud, profundidad, epicentro }: ParametrosSismo): ResumenSismo {
  const niveles: number[] = new Array(e.manzanas.length);
  const grados = [0, 0, 0, 0, 0, 0];
  let total = 0;
  e.manzanas.forEach(([x, y, altura, construcciones, , licuacion], k) => {
    const rEpi = Math.hypot(x - epicentro[0], y - epicentro[1]) / 1000;
    const I = intensidadEn(magnitud, rEpi, profundidad, licuacion === 1);
    const v = vulnerabilidad(pisosDe(altura));
    const muD = danoMedio(I, v.V, v.Q);
    niveles[k] = nivelDeDano(muD);
    const f = pmf(Math.min(Math.max(muD / 5, 0), 1));
    for (let g = 0; g < 6; g++) grados[g] += construcciones * f[g];
    total += construcciones;
  });
  const cx = (CENTRO_CALI[0] - e.origen[0]) * e.kx, cy = (CENTRO_CALI[1] - e.origen[1]) * e.ky;
  const rCentro = Math.hypot(cx - epicentro[0], cy - epicentro[1]) / 1000;
  return {
    niveles,
    grados: grados.map(Math.round),
    total,
    importantes: Math.round(grados[3] + grados[4] + grados[5]),
    intensidadCentro: intensidadEn(magnitud, rCentro, profundidad, false),
    distanciaCentroKm: rCentro,
  };
}
