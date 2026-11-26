/** Validación y lectura/escritura de CSV según `esquema.ts`. Sin React ni DOM: se prueba con node --test. */
import { TABLAS, type Columna, type Tabla } from "./esquema.ts";

export type Fila = Record<string, string>;
export interface ResultadoFila { fila: number; datos: Fila; errores: string[] }
/** Listas de referencia para comprobar llaves foráneas (opcional). */
export interface Contexto { ciudades?: string[]; organizaciones?: string[]; espacios?: string[] }

/** Mismo criterio que `idn.texto_limpio` en la base SQL: sin correo, sin 7+ dígitos seguidos, sin prefijo internacional. */
export const textoLimpio = (t: string) =>
  !/[^\s@]+@[^\s@]+/.test(t) && !/[0-9]{7,}/.test(t.replace(/[ .\-_()]/g, "")) && !/\+[0-9]{1,3}[ -]?[0-9]/.test(t);

const celdaCsv = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
export const encabezado = (t: Tabla) => t.columnas.map((c) => c.nombre);
export const aCsv = (t: Tabla, filas: Fila[]) =>
  [encabezado(t).join(","), ...filas.map((f) => t.columnas.map((c) => celdaCsv(f[c.nombre] ?? "")).join(","))].join("\n") + "\n";
export const ejemplo = (t: Tabla): Fila => Object.fromEntries(t.columnas.map((c) => [c.nombre, c.ejemplo]));
export const plantillaCsv = (t: Tabla) => aCsv(t, [ejemplo(t)]);

/** CSV con comillas (RFC 4180 básico). */
export function parsearCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [], celda = "", comillas = false;
  const t = texto.replace(/^﻿/, "");
  const cerrar = () => { fila.push(celda); celda = ""; if (fila.some((x) => x !== "")) filas.push(fila); fila = []; };
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) {
      if (c === '"' && t[i + 1] === '"') { celda += '"'; i++; }
      else if (c === '"') comillas = false;
      else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") { fila.push(celda); celda = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; cerrar(); }
    else celda += c;
  }
  cerrar();
  return filas;
}

function errorColumna(c: Columna, v: string): string | null {
  if (v === "") return c.obligatoria ? `${c.nombre}: es obligatoria` : null;
  switch (c.tipo) {
    case "id": return /^[a-z0-9][a-z0-9-]{2,39}$/.test(v) ? null : `${c.nombre}: usa minúsculas, números y guiones (3-40 caracteres)`;
    case "mes": return /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? null : `${c.nombre}: formato AAAA-MM`;
    case "si_no": return v === "0" || v === "1" ? null : `${c.nombre}: escribe 1 (sí) o 0 (no)`;
    case "opcion": return c.opciones!.includes(v) ? null : `${c.nombre}: elige una de ${c.opciones!.join(" | ")}`;
    case "entero":
    case "decimal": {
      if (!(c.tipo === "entero" ? /^-?\d+$/ : /^-?\d+(\.\d+)?$/).test(v)) return `${c.nombre}: debe ser un número${c.tipo === "entero" ? " entero" : " con punto decimal"}`;
      const n = Number(v);
      if (c.min !== undefined && n < c.min) return `${c.nombre}: mínimo ${c.min}`;
      if (c.max !== undefined && n > c.max) return `${c.nombre}: máximo ${c.max}`;
      return null;
    }
    case "texto":
      if (c.largo && v.length > c.largo) return `${c.nombre}: máximo ${c.largo} caracteres`;
      return textoLimpio(v) ? null : `${c.nombre}: parece traer correo, teléfono o documento; quítalo`;
  }
}

export function validarFila(t: Tabla, d: Fila, ctx: Contexto = {}): string[] {
  const e: string[] = [];
  for (const c of t.columnas) { const m = errorColumna(c, (d[c.nombre] ?? "").trim()); if (m) e.push(m); }
  if (e.length) return e; // las reglas entre columnas solo tienen sentido con celdas válidas
  const v = (k: string) => (d[k] ?? "").trim();
  const n = (k: string) => (v(k) === "" ? null : Number(v(k)));
  if (ctx.ciudades && v("ciudad_id") && !ctx.ciudades.includes(v("ciudad_id"))) e.push(`ciudad_id: «${v("ciudad_id")}» no existe en ciudades`);
  if (t.id === "reportes") {
    if (v("tipo_reporte") === "estado_espacio" && !v("espacio_id")) e.push("estado_espacio exige espacio_id");
    const g = ["n_0_5", "n_6_17", "n_18_59", "n_60_mas"].map(n);
    const dados = g.filter((x) => x !== null).length;
    if (dados > 0 && dados < 4) e.push("los 4 grupos de edad van completos o ninguno");
    else if (dados === 4 && n("n_total") !== g.reduce((a, b) => a! + b!, 0)) e.push("los grupos de edad deben sumar n_total");
    if (n("n_discapacidad") !== null && (n("n_total") === null || n("n_discapacidad")! > n("n_total")!)) e.push("n_discapacidad no puede superar n_total");
    if (ctx.organizaciones && !ctx.organizaciones.includes(v("codigo_organizacion"))) e.push(`codigo_organizacion: «${v("codigo_organizacion")}» no existe; pide tu código al ente`);
    if (ctx.espacios && v("espacio_id") && !ctx.espacios.includes(v("espacio_id"))) e.push(`espacio_id: «${v("espacio_id")}» no existe en espacios`);
  }
  if (t.id === "espacios_propuestos" && v("propietario") === "privado" && v("autorizacion") === "no") e.push("un espacio privado sin autorización no se puede proponer");
  if (t.id === "organizaciones" && ctx.ciudades && !ctx.ciudades.includes(v("ciudad_id"))) e.push(`ciudad_id: «${v("ciudad_id")}» no existe en ciudades`);
  return e;
}

/** Valida un CSV completo. Rechaza columnas desconocidas (p. ej. «nombre», «cedula») y archivos grandes. */
export function validarCsv(t: Tabla, texto: string, ctx: Contexto = {}): { filas: ResultadoFila[]; errorGlobal?: string } {
  const f = parsearCsv(texto);
  if (f.length === 0) return { filas: [], errorGlobal: "El archivo está vacío." };
  const enc = f[0].map((x) => x.trim());
  const extra = enc.filter((c) => !t.columnas.some((k) => k.nombre === c));
  if (extra.length) return { filas: [], errorGlobal: `Columnas no permitidas: ${extra.join(", ")}. Solo se aceptan las de la plantilla.` };
  const falta = encabezado(t).filter((c) => !enc.includes(c));
  if (falta.length) return { filas: [], errorGlobal: `Faltan columnas: ${falta.join(", ")}.` };
  if (f.length > 501) return { filas: [], errorGlobal: "Máximo 500 filas por archivo." };
  const filas = f.slice(1).map((celdas, i) => {
    const datos = Object.fromEntries(encabezado(t).map((c) => [c, (celdas[enc.indexOf(c)] ?? "").trim()]));
    return { fila: i + 2, datos, errores: validarFila(t, datos, ctx) };
  });
  return { filas };
}

/** Diccionario de datos como CSV (una fila por columna). */
export function diccionarioCsv(): string {
  const filas: string[] = ["tabla,columna,tipo,obligatoria,valores_o_rango,quien_llena,descripcion,ejemplo"];
  for (const t of Object.values(TABLAS))
    for (const c of t.columnas) {
      const rango = c.opciones ? c.opciones.join("|") : c.min !== undefined || c.max !== undefined ? `${c.min ?? ""}..${c.max ?? ""}` : c.largo ? `máx ${c.largo} caracteres` : "";
      filas.push([t.id, c.nombre, c.tipo, c.obligatoria ? "si" : "no", rango, t.quien, c.ayuda, c.ejemplo].map(celdaCsv).join(","));
    }
  return filas.join("\n") + "\n";
}
