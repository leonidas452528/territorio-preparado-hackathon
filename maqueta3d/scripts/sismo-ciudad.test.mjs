import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { escenarioSismo, EPICENTROS, nivelDeDano, pisosDe, pmf } from "../src/sismoCiudad.ts";

const e = JSON.parse(fs.readFileSync(new URL("../public/ciudad/escenarios.json", import.meta.url)));
const local = ({ lon, lat }) => [(lon - e.origen[0]) * e.kx, (lat - e.origen[1]) * e.ky];

test("la distribución de grados suma 1 y los niveles siguen el daño medio", () => {
  assert.ok(Math.abs(pmf(0.37).reduce((a, b) => a + b, 0) - 1) < 1e-12);
  assert.deepEqual([0.2, 0.5, 1.5, 2.5, 4].map(nivelDeDano), [0, 1, 2, 3, 3]);
  assert.equal(pisosDe(4.7), 2);
  assert.equal(pisosDe(0), 1);
});

test("más magnitud nunca da menos daño importante, y el escenario conserva el total de construcciones", () => {
  const epi = local(EPICENTROS.cali);
  let previo = -1;
  for (const mag of [4.5, 5.5, 6.5, 7.5, 8.5]) {
    const r = escenarioSismo(e, { magnitud: mag, profundidad: 15, epicentro: epi });
    assert.ok(r.importantes >= previo, `Mw ${mag}`);
    assert.equal(r.grados.reduce((a, b) => a + b, 0) > 0, true);
    assert.ok(Math.abs(r.grados.reduce((a, b) => a + b, 0) - r.total) <= 6); // redondeo por grado
    previo = r.importantes;
  }
});

test("más lejos y más profundo da menos daño", () => {
  const cerca = escenarioSismo(e, { magnitud: 6.5, profundidad: 10, epicentro: local(EPICENTROS.cali) });
  const profundo = escenarioSismo(e, { magnitud: 6.5, profundidad: 120, epicentro: local(EPICENTROS.cali) });
  const lejos = escenarioSismo(e, { magnitud: 6.5, profundidad: 10, epicentro: [60000, 60000] });
  assert.ok(profundo.importantes < cerca.importantes);
  assert.ok(lejos.importantes < cerca.importantes);
});

test("referencia con el sismo real del 10-ago-2026: orden de magnitud frente al reporte oficial", () => {
  const r = escenarioSismo(e, { magnitud: 7.4, profundidad: 103, epicentro: local(EPICENTROS.real) });
  // La Alcaldía reportó más de 12.000 edificaciones afectadas (criterio distinto). Se exige solo el mismo orden de magnitud.
  assert.ok(r.importantes > 6000 && r.importantes < 30000, `importantes = ${r.importantes}`);
  assert.ok(r.intensidadCentro > 5.5 && r.intensidadCentro < 7.5, `I centro = ${r.intensidadCentro}`);
  assert.ok(r.distanciaCentroKm > 150 && r.distanciaCentroKm < 250);
});
