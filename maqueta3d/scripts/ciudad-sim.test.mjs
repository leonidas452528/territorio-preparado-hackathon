import test from "node:test";
import assert from "node:assert/strict";
import { afectacion, altura, celdasQuemadas, demandaCercana, elegirSeparados, propagarIncendio } from "../src/ciudadSim.ts";

// Ladera de 5 x 5 celdas de 100 m que sube hacia el oeste; solo la mitad oeste tiene vegetación.
const ancho = 5, alto = 5;
const e = {
  origen: [0, 0], kx: 1, ky: 1,
  relieve: { oeste_sur: [0, 0], paso: 100, ancho, alto,
    alturas: Array.from({ length: 25 }, (_, c) => 1000 + (ancho - (c % ancho)) * 50) },
  vegetacion: Array.from({ length: 25 }, (_, c) => (c % ancho <= 2 ? "1" : "0")).join(""),
  manzanas: [[50, 50, 6, 10, 3, 0], [450, 450, 3, 4, 1, 1], [5000, 5000, 3, 99, 2, 1]],
  inundacion: [], licuacion: [], danos_sismo: [],
};

test("relieve bilineal", () => {
  assert.equal(altura(e.relieve, 0, 0), 1250);
  assert.equal(altura(e.relieve, 50, 0), 1225);
});

test("el incendio solo avanza por vegetación y es reproducible", () => {
  const q = propagarIncendio(e, [200, 200], { pasos: 30 });
  assert.deepEqual(q, propagarIncendio(e, [200, 200], { pasos: 30 }));
  q.forEach((t, c) => { if (t >= 0) assert.notEqual(e.vegetacion[c], "0"); });
  // Un inicio en celda no combustible se acerca a la combustible más próxima.
  assert.ok(propagarIncendio(e, [400, 200], { pasos: 5 }).some((t) => t === 0));
  assert.ok(celdasQuemadas(e, q, 30).length > 1);
  assert.ok(propagarIncendio(e, [-9999, 0]).every((t) => t === -1));
});

test("inundación revela alta, luego media y baja", () => {
  assert.deepEqual(afectacion(e, "inundacion", 0.1), [3, 0, 0]);
  assert.deepEqual(afectacion(e, "inundacion", 0.5), [3, 0, 2]);
  assert.deepEqual(afectacion(e, "inundacion", 1), [3, 1, 2]);
  assert.deepEqual(afectacion(e, "sismo", 1), [0, 2, 2]);
  assert.deepEqual(afectacion(e, "incendio", 1, [[100, 100, 0]], 300), [3, 3, 0]);
});

test("la demanda suma construcciones de manzanas afectadas dentro del radio", () => {
  assert.deepEqual(demandaCercana(e, [3, 1, 0], [[0, 0], [9000, 9000]], 1000), [14, 0]);
});

test("los acopios sugeridos quedan separados", () => {
  const c = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 1200, y: 0 }, { x: 5000, y: 0 }];
  assert.deepEqual(elegirSeparados(c, 1000, 2), [c[0], c[2]]);
});
