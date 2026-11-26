import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TABLAS, ORDEN_TABLAS } from "../src/datos/esquema.ts";
import { diccionarioCsv, validarCsv, validarFila, plantillaCsv, textoLimpio, ejemplo, parsearCsv } from "../src/datos/validar.ts";

const leer = (t) => readFileSync(`bd/${t}.csv`, "utf8");
const col = (t, c) => parsearCsv(leer(t)).slice(1).map((f) => f[parsearCsv(leer(t))[0].indexOf(c)]);

test("todos los CSV de bd/ cumplen el esquema y sus llaves entre tablas", () => {
  const ctx = { ciudades: col("ciudades", "ciudad_id"), organizaciones: col("organizaciones", "codigo_organizacion"), espacios: col("espacios_propuestos", "espacio_id") };
  for (const id of ORDEN_TABLAS) {
    const r = validarCsv(TABLAS[id], leer(id), ctx);
    assert.equal(r.errorGlobal, undefined, id);
    for (const f of r.filas) assert.deepEqual(f.errores, [], `${id} fila ${f.fila}`);
  }
});
test("el diccionario publicado está al día con el esquema", () => {
  assert.equal(readFileSync("bd/diccionario.csv", "utf8"), diccionarioCsv());
  assert.equal(readFileSync("public/bd/diccionario.csv", "utf8"), diccionarioCsv());
});
test("cada plantilla descargable valida sin errores", () => {
  for (const t of Object.values(TABLAS)) {
    const r = validarCsv(t, plantillaCsv(t));
    assert.deepEqual(r.filas[0].errores, [], t.id);
  }
});
test("reportes: sumas, discapacidad, espacio y llaves", () => {
  const t = TABLAS.reportes, e = ejemplo(t);
  assert.ok(validarFila(t, { ...e, n_total: "100" }).some((x) => x.includes("sumar")));
  assert.ok(validarFila(t, { ...e, n_discapacidad: "500" }).some((x) => x.includes("n_discapacidad")));
  assert.ok(validarFila(t, { ...e, n_0_5: "" }).some((x) => x.includes("4 grupos")));
  assert.ok(validarFila(t, { ...e, tipo_reporte: "estado_espacio", espacio_id: "" }).some((x) => x.includes("espacio_id")));
  assert.ok(validarFila(t, e, { organizaciones: ["otro-codigo"] }).some((x) => x.includes("no existe")));
  assert.ok(validarFila(t, { ...e, ciudad_id: "x-y" }, { ciudades: ["cali-co"] }).some((x) => x.includes("ciudad_id")));
});
test("espacios: privado sin autorización se rechaza; texto con datos personales también", () => {
  const t = TABLAS.espacios_propuestos, e = ejemplo(t);
  assert.ok(validarFila(t, { ...e, propietario: "privado", autorizacion: "no" }).some((x) => x.includes("privado")));
  for (const malo of ["escribir a ana@correo.com", "llamar 300 123 4567", "+57 3001234567", "cc 1130123456"]) assert.equal(textoLimpio(malo), false, malo);
  assert.ok(validarFila(t, { ...e, observacion: "llamar 300 123 4567" }).length > 0);
});
test("columnas con datos personales se rechazan completas", () => {
  const t = TABLAS.reportes;
  assert.match(validarCsv(t, plantillaCsv(t).replace("observacion", "nombre")).errorGlobal, /no permitidas/);
});
