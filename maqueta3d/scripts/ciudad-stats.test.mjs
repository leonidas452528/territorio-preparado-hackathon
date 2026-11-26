import test from "node:test";
import assert from "node:assert/strict";
import { claseDano, tipoFuente, proporcion, resumenDanos, resumenIncendio, resumenPorNivel } from "../src/ciudadStats.ts";

const e = {
  manzanas: [[0, 0, 6, 10, 3, 0], [1, 1, 3, 4, 1, 1], [2, 2, 3, 99, 2, 1], [3, 3, 3, 5, 3, 0]],
  danos_sismo: [
    [0, 0, "Destroyed", "Copernicus EMSR916"],
    [1, 1, "Damaged", "Copernicus EMSR916"],
    [2, 2, "Possibly damaged", "ICube-SERTIT"],
    [3, 3, "Sin definir", "MEN sedes educativas"],
  ],
};

test("resumen por nivel suma manzanas y construcciones y ordena de mayor a menor", () => {
  const filas = resumenPorNivel(e, "inundacion", [3, 1, 2, 3]);
  assert.deepEqual(filas.map((f) => f.nivel), [3, 2, 1]);
  assert.equal(filas[0].manzanas, 2);
  assert.equal(filas[0].construcciones, 15);
  assert.equal(filas[0].etiqueta, "Amenaza alta");
  assert.equal(resumenPorNivel(e, "inundacion", [0, 0, 0, 0]).length, 0);
});

test("los daños se clasifican igual que en la escena y se cuentan por fuente", () => {
  assert.equal(claseDano("Destroyed"), "destruida");
  assert.equal(claseDano("Possibly damaged"), "posible");
  assert.equal(claseDano("Damaged"), "danada");
  const r = resumenDanos(e);
  assert.equal(r.total, 4);
  assert.deepEqual(r.porClase, { destruida: 1, danada: 1, posible: 2 });
  assert.deepEqual(r.porFuente, { "Copernicus EMSR916": 2, "ICube-SERTIT": 1, "MEN sedes educativas": 1 });
});

test("hectáreas del incendio a partir de celdas de 60 m", () => {
  const r = resumenIncendio([[0, 0, 1], [60, 0, 9], [120, 0, 10]], 60, 10);
  assert.equal(r.celdas, 3);
  assert.equal(r.hectareas, (3 * 3600) / 10000);
  assert.equal(r.activas, 2);
});

test("la proporción está acotada", () => {
  assert.equal(proporcion(5, 10), 0.5);
  assert.equal(proporcion(50, 10), 1);
  assert.equal(proporcion(1, 0), 0);
});

test("la fuente distingue observado, modelo y reportado", () => {
  assert.equal(tipoFuente("Copernicus EMSR916"), "observado");
  assert.equal(tipoFuente("ICube-SERTIT"), "observado");
  assert.equal(tipoFuente("Microsoft/Airbus (modelo IA)"), "modelo");
  assert.equal(tipoFuente("MEN sedes educativas"), "reportado");
  const r = resumenDanos(e);
  assert.deepEqual(r.porTipo, { observado: 3, modelo: 0, reportado: 1 });
});
