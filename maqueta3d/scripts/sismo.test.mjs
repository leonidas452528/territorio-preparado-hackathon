import test from "node:test";
import assert from "node:assert/strict";
import {
  AJUSTE_PROFUNDO, R_HIPO_REAL_CALI, SISMO_REAL, azar, danoMedio, gradoDano, intensidad, intensidadEn, vulnerabilidad,
} from "../src/sismo.ts";

test("intensidad: Allen, Wald y Worden 2012 (Rhypo) con los coeficientes de OpenQuake", () => {
  // Cálculo a mano: 2,085 + 1,428·7,4 − 1,402·ln(√(202² + 22,30²)) + 0,078·ln(202/50) ≈ 5,31
  assert.ok(Math.abs(intensidad(7.4, 202) - 5.31) < 0.02);
  assert.ok(intensidad(7.4, 50) > intensidad(7.4, 100));
  assert.ok(intensidad(6.5, 30) > intensidad(5.5, 30));
});

test("el sismo real calibrado da VI en suelo firme y VI-VII en suelo blando del centro de Cali", () => {
  const real = (blando) => intensidadEn(SISMO_REAL.magnitud, Math.sqrt(R_HIPO_REAL_CALI ** 2 - SISMO_REAL.profundidad ** 2), SISMO_REAL.profundidad, blando);
  assert.ok(Math.abs(real(false) - 6) < 1e-9);
  assert.ok(Math.abs(real(true) - 6.5) < 1e-9);
  assert.ok(AJUSTE_PROFUNDO > 0.5 && AJUSTE_PROFUNDO < 0.9);
  assert.equal(intensidadEn(6, 10, 10, false), intensidad(6, Math.hypot(10, 10))); // superficial: sin ajuste
});

test("método macrosísmico: μD = 2,5 cuando I = 13,1 − 6,25·V; más vulnerable, más daño", () => {
  const { V, Q } = vulnerabilidad(1);
  assert.ok(Math.abs(danoMedio(13.1 - 6.25 * V, V, Q) - 2.5) < 1e-12);
  assert.ok(danoMedio(7, vulnerabilidad(1).V, 2.3) > danoMedio(7, vulnerabilidad(10).V, 2.6));
});

test("grados de daño: binomial con promedio μD, monótona en μD para el mismo edificio", () => {
  assert.equal(gradoDano(0, 0.99), 0);
  assert.equal(gradoDano(5, 0.01), 5);
  const n = 20000;
  let suma = 0;
  for (let i = 0; i < n; i++) suma += gradoDano(1.7, azar(i));
  assert.ok(Math.abs(suma / n - 1.7) < 0.05);
  for (let i = 0; i < 200; i++) assert.ok(gradoDano(2.4, azar(i)) >= gradoDano(1.1, azar(i)));
});
