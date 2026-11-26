/** Lógica de la simulación de ciudad (sin React ni three), para poder probarla con node --test.
 * Coordenadas locales en metros: x = este, y = norte, origen en escenarios.json. */
export type Escenario = "inundacion" | "sismo" | "incendio";
/** [x, y, altura_m, construcciones, nivel_inundacion 0-3, licuacion 0/1] */
export type Manzana = [number, number, number, number, number, number];
export interface Relieve {
  oeste_sur: [number, number];
  paso: number;
  ancho: number;
  alto: number;
  alturas: number[];
}
export interface Escenarios {
  origen: [number, number];
  kx: number;
  ky: number;
  relieve: Relieve;
  vegetacion: string;
  manzanas: Manzana[];
  inundacion: { nivel: number; tipo: string; anillos: [number, number][][] }[];
  licuacion: { etiqueta: string; anillos: [number, number][][] }[];
  danos_sismo: [number, number, string, string][];
}

export const aLocal = (e: Escenarios, [lon, lat]: readonly [number, number]) =>
  [(lon - e.origen[0]) * e.kx, (lat - e.origen[1]) * e.ky] as const;

export function altura({ oeste_sur: [x0, y0], paso, ancho, alto, alturas }: Relieve, x: number, y: number) {
  const i = Math.min(Math.max((x - x0) / paso, 0), ancho - 1.001);
  const j = Math.min(Math.max((y - y0) / paso, 0), alto - 1.001);
  const i0 = Math.floor(i), j0 = Math.floor(j), fx = i - i0, fy = j - j0;
  const z = (a: number, b: number) => alturas[b * ancho + a];
  return (
    z(i0, j0) * (1 - fx) * (1 - fy) + z(i0 + 1, j0) * fx * (1 - fy) +
    z(i0, j0 + 1) * (1 - fx) * fy + z(i0 + 1, j0 + 1) * fx * fy
  );
}

/** Generador pseudoaleatorio con semilla: el mismo ejercicio da el mismo resultado. */
function mulberry32(semilla: number) {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ejercicio de propagación de incendio forestal sobre la cobertura boscosa oficial ("1") y las laderas
 * no urbanas sobre 1.050 m ("2", supuesto).
 * ponytail: autómata celular ilustrativo (pendiente + viento + azar), no un modelo de comportamiento
 * del fuego (FARSITE, Rothermel). Reemplazar si Bomberos o la CVC entregan una capa o un modelo.
 * Devuelve el paso en que se quema cada celda (-1 = no se quema). */
export function propagarIncendio(
  e: Escenarios,
  inicio: readonly [number, number],
  { pasos = 60, vientoHaciaGrados = 270, semilla = 7 } = {},
) {
  const { ancho, alto, alturas, paso, oeste_sur: [x0, y0] } = e.relieve;
  const quema = new Int16Array(ancho * alto).fill(-1);
  const inicioCelda = celdaCombustible(e, inicio);
  if (inicioCelda < 0) return quema;
  const i0 = inicioCelda % ancho, j0 = (inicioCelda - i0) / ancho;
  const azar = mulberry32(semilla);
  const rad = (vientoHaciaGrados * Math.PI) / 180;
  const viento = [Math.sin(rad), Math.cos(rad)]; // 0° = norte, 90° = este
  quema[j0 * ancho + i0] = 0;
  let frente = [j0 * ancho + i0];
  for (let t = 1; t <= pasos && frente.length; t++) {
    const nuevo: number[] = [];
    for (const c of frente) {
      const ci = c % ancho, cj = (c - ci) / ancho;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const ni = ci + di, nj = cj + dj, n = nj * ancho + ni;
        if (ni < 0 || nj < 0 || ni >= ancho || nj >= alto || quema[n] >= 0) continue;
        if (e.vegetacion[n] === "0") continue;
        const largo = Math.hypot(di, dj);
        const pendiente = (alturas[n] - alturas[c]) / (paso * largo); // sube = más rápido
        const aFavor = (di * viento[0] + dj * viento[1]) / largo;
        const p = 0.35 * Math.exp(2.5 * Math.max(-0.5, Math.min(pendiente, 1))) * (1 + 0.6 * aFavor);
        if (azar() < p) {
          quema[n] = t;
          nuevo.push(n);
        } else nuevo.push(c); // el frente sigue activo y puede intentar de nuevo
      }
    }
    frente = [...new Set(nuevo)].filter((c) => quema[c] >= 0 && t - quema[c] < 6);
  }
  return quema;
}

/** Celda combustible más cercana al punto, a menos de 10 celdas (600 m); -1 si no hay. */
export function celdaCombustible(e: Escenarios, [x, y]: readonly [number, number], radio = 10) {
  const { ancho, alto, paso, oeste_sur: [x0, y0] } = e.relieve;
  const i = Math.round((x - x0) / paso), j = Math.round((y - y0) / paso);
  let mejor = -1, d2 = Infinity;
  for (let a = -radio; a <= radio; a++)
    for (let b = -radio; b <= radio; b++) {
      const ni = i + a, nj = j + b;
      if (ni < 0 || nj < 0 || ni >= ancho || nj >= alto || e.vegetacion[nj * ancho + ni] === "0") continue;
      if (a * a + b * b < d2) [mejor, d2] = [nj * ancho + ni, a * a + b * b];
    }
  return mejor;
}

/** Celdas quemadas hasta el paso t, en coordenadas locales. */
export function celdasQuemadas(e: Escenarios, quema: Int16Array, t: number) {
  const { ancho, paso, oeste_sur: [x0, y0] } = e.relieve;
  const out: [number, number, number][] = [];
  quema.forEach((q, c) => {
    if (q >= 0 && q <= t) out.push([x0 + (c % ancho) * paso, y0 + Math.floor(c / ancho) * paso, q]);
  });
  return out;
}

/** Afectación por manzana (0 = no, 1-3 = intensidad) según el escenario y su avance (0-1). */
export function afectacion(
  e: Escenarios,
  escenario: Escenario,
  avance: number,
  quemadas: [number, number, number][] = [],
  bufferIncendio = 300,
) {
  if (escenario === "inundacion") {
    // La animación revela primero amenaza alta, luego media y baja: orden de las categorías del POT,
    // no un tránsito hidráulico.
    const hasta = avance < 1 / 3 ? 3 : avance < 2 / 3 ? 2 : 1;
    return e.manzanas.map((m) => (m[4] >= hasta ? m[4] : 0));
  }
  if (escenario === "sismo") return e.manzanas.map((m) => (avance > 0.4 && m[5] ? 2 : 0));
  const cerca = cercaDe(quemadas, bufferIncendio);
  return e.manzanas.map(([x, y]) => (cerca(x, y) ? 3 : 0));
}

/** ¿El punto está a menos de ~`buffer` m de una celda quemada? Rejilla gruesa (aprox. 1-2 × buffer)
 * para no comparar cada punto con cada celda. */
export function cercaDe(quemadas: [number, number, number][], buffer: number) {
  const k = (x: number, y: number) => `${Math.floor(x / buffer)},${Math.floor(y / buffer)}`;
  const rejilla = new Set(quemadas.map(([x, y]) => k(x, y)));
  return (x: number, y: number) => {
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) if (rejilla.has(k(x + a * buffer, y + b * buffer))) return true;
    return false;
  };
}

/** Demanda cercana: construcciones de manzanas afectadas a menos de `radio` m de cada punto. */
export function demandaCercana(
  e: Escenarios,
  afectadas: number[],
  puntos: readonly (readonly [number, number])[],
  radio = 1500,
) {
  const r2 = radio * radio;
  const activas = e.manzanas.filter((_, k) => afectadas[k] > 0);
  return puntos.map(([x, y]) =>
    activas.reduce((s, m) => ((m[0] - x) ** 2 + (m[1] - y) ** 2 <= r2 ? s + m[3] : s), 0),
  );
}

/** Toma en orden los mejores, saltando los que quedan a menos de `separacion` m de uno ya elegido,
 * para no sugerir tres parques del mismo barrio. */
export function elegirSeparados<T extends { x: number; y: number }>(ordenados: T[], separacion = 1000, cuantos = 8) {
  const elegidos: T[] = [];
  for (const c of ordenados) {
    if (elegidos.length >= cuantos) break;
    if (elegidos.every((o) => (o.x - c.x) ** 2 + (o.y - c.y) ** 2 >= separacion ** 2)) elegidos.push(c);
  }
  return elegidos;
}
