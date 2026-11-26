/** Escenario sísmico explicable, edificio por edificio.
 *
 * 1. Intensidad (MMI) según magnitud y distancia hipocentral: Allen, Wald y Worden (2012), "Intensity attenuation
 *    for active crustal regions", J. Seismology 16:409-433, versión con distancia hipocentral. Coeficientes tomados
 *    de la implementación de la Fundación GEM (OpenQuake, clase AllenEtAl2012Rhypo).
 * 2. Daño medio por edificio: método macrosísmico de Lagomarsino y Giovinazzi (2006), Bull. Earthquake Eng.
 *    μD = 2,5·[1 + tanh((I + 6,25·V − 13,1) / Q)], con grados de daño 0-5 de la escala EMS-98, y distribución
 *    binomial de los grados alrededor de ese promedio.
 *
 * Supuestos (no hay inventario estructural de Cali en datos abiertos): la clase de vulnerabilidad se asigna por
 * número de pisos, los suelos blandos (zonas de licuación o corrimiento) suman medio grado y los sismos profundos
 * llevan un ajuste calibrado con el sismo real del 10-ago-2026. Es un escenario para preparar, no un pronóstico.
 */

const AWW12 = { c0: 2.085, c1: 1.428, c2: -1.402, c4: 0.078, m1: -0.209, m2: 2.042 };

/** Intensidad de Mercalli Modificada a `rHipo` km del hipocentro de un sismo de magnitud `mag` (Mw). */
export function intensidad(mag: number, rHipo: number) {
  const rm = AWW12.m1 + AWW12.m2 * Math.exp(mag - 5);
  let i = AWW12.c0 + AWW12.c1 * mag + AWW12.c2 * Math.log(Math.sqrt(rHipo ** 2 + rm ** 2));
  if (rHipo > 50) i += AWW12.c4 * Math.log(rHipo / 50);
  return i;
}

/** Sismo del 10 de agosto de 2026, solución del SGC: San José del Palmar (Chocó), Mw 7,4, 103 km de profundidad. */
export const SISMO_REAL = { nombre: "Sismo real del 10-ago-2026 (SGC)", lat: 4.99, lon: -76.29, profundidad: 103, magnitud: 7.4 };
/** Distancia hipocentral (km) del sismo real al centro de Cali (Plaza de Caicedo, 3,4516 N; -76,5320 O). */
export const R_HIPO_REAL_CALI = 202;
/** Suelo blando (zonas de licuación o corrimiento de la IDESC): +0,5 grados. Supuesto, verificar con la
 * microzonificación sísmica de Cali. */
export const AMPLIFICACION_SUELO_BLANDO = 0.5;
/** La ecuación es para sismos corticales y subestima los intraplaca profundos: con el sismo real da ~V en Cali,
 * y el SGC reportó intensidades de hasta VII. Para hipocentros de 50 km o más se suma lo necesario para que el
 * sismo real dé VI en suelo firme del centro de Cali (y VI-VII en suelo blando). */
export const AJUSTE_PROFUNDO = 6 - intensidad(SISMO_REAL.magnitud, R_HIPO_REAL_CALI);

export function intensidadEn(mag: number, rEpi: number, profundidad: number, sueloBlando: boolean) {
  const i = intensidad(mag, Math.hypot(rEpi, profundidad));
  return i + (sueloBlando ? AMPLIFICACION_SUELO_BLANDO : 0) + (profundidad >= 50 ? AJUSTE_PROFUNDO : 0);
}

/** Clase EMS-98 por pisos (supuesto) con su índice de vulnerabilidad V (valores más probables de Lagomarsino y
 * Giovinazzi 2006, verificar) y ductilidad Q (2,3 mampostería; 2,6 concreto diseñado con norma). */
export function vulnerabilidad(pisos: number) {
  if (pisos <= 2) return { clase: "B", V: 0.74, Q: 2.3 }; // mampostería de 1-2 pisos, mucha autoconstrucción
  if (pisos <= 5) return { clase: "C", V: 0.58, Q: 2.3 }; // mampostería confinada o pórticos sin norma completa
  return { clase: "D", V: 0.42, Q: 2.6 }; // pórticos de concreto con norma sismorresistente
}

export const danoMedio = (I: number, V: number, Q: number) => 2.5 * (1 + Math.tanh((I + 6.25 * V - 13.1) / Q));

const COMB = [1, 5, 10, 10, 5, 1];
/** Grado de daño EMS-98 (0-5) de un edificio: cuantil `u` (0-1) de la binomial con promedio μD. Con el mismo `u`,
 * más intensidad nunca da menos daño. */
export function gradoDano(muD: number, u: number) {
  const p = Math.min(Math.max(muD / 5, 0), 1);
  let acumulado = 0;
  for (let k = 0; k < 5; k++) {
    acumulado += COMB[k] * p ** k * (1 - p) ** (5 - k);
    if (u < acumulado) return k;
  }
  return 5;
}

/** Número pseudoaleatorio estable (0-1) por edificio: el mismo edificio siempre usa el mismo cuantil. */
export function azar(i: number) {
  let x = (i + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export const ROMANOS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export const romano = (i: number) => ROMANOS[Math.min(12, Math.max(1, Math.round(i)))];
export const GRADOS_EMS = ["Sin daño", "Leve", "Moderado", "Importante", "Muy grave", "Colapso"];
