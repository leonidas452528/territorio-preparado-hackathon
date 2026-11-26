import test from "node:test";
import assert from "node:assert/strict";
import { PESOS, capacidadPersonas, dotacion, idoneidad, percentil } from "../src/albergues.ts";

test("los pesos suman 1 y el puntaje va de 0 a 100", () => {
  assert.ok(Math.abs(Object.values(PESOS).reduce((a, b) => a + b, 0) - 1) < 1e-12);
  const ideal = idoneidad({ demanda: 900, demandaReferencia: 900, personas: 600, pendiente: 1, distanciaSalud: 200, seguridad: 1 });
  assert.equal(ideal.puntaje, 100);
  const malo = idoneidad({ demanda: 0, demandaReferencia: 900, personas: 0, pendiente: 12, distanciaSalud: 5000, seguridad: 0 });
  assert.equal(malo.puntaje, 0);
});

test("pendiente: 2 % ideal, 8 % no apta; sin dato cuenta a medias", () => {
  const base = { demanda: 0, demandaReferencia: 1, personas: 0, distanciaSalud: null, seguridad: 0 };
  assert.equal(idoneidad({ ...base, pendiente: 2 }).criterios.pendiente, 1);
  assert.equal(idoneidad({ ...base, pendiente: 8 }).criterios.pendiente, 0);
  assert.equal(idoneidad({ ...base, pendiente: null }).criterios.pendiente, 0.5);
});

test("capacidad con 45 m² por persona y dotación con las reglas del proyecto", () => {
  assert.equal(capacidadPersonas(10000), 222);
  assert.equal(capacidadPersonas(null), 0);
  assert.deepEqual(dotacion(222), { kits: 12, banos: 12, litrosDia: 3330 });
  assert.equal(percentil([5, 1, 3, 2, 4], 0.9), 5);
});
