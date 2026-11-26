import * as THREE from "three";
import type { Escenarios } from "./ciudadSim";

/** Textura del terreno generada en el navegador a partir de datos reales ya cargados (cero bytes extra por red):
 * sombreado del relieve (luz del noroeste), tinte por altitud y la máscara de vegetación (0 sin cobertura,
 * 1 pasto/arbusto, 2 bosque). Es una representación ilustrativa, no una imagen satelital. */
const mezcla = (a: number[], b: number[], t: number) => a.map((x, i) => x + (b[i] - x) * t);
const URBANO = [214, 210, 200], PASTO = [176, 200, 134], BOSQUE = [128, 164, 106], ALTO = [196, 178, 146];

export function texturaTerreno(e: Escenarios) {
  const { ancho, alto, alturas, paso } = e.relieve;
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d")!;
  const img = ctx.createImageData(ancho, alto);
  const h = (i: number, j: number) => alturas[Math.min(alto - 1, Math.max(0, j)) * ancho + Math.min(ancho - 1, Math.max(0, i))];
  for (let j = 0; j < alto; j++)
    for (let i = 0; i < ancho; i++) {
      const dx = (h(i + 1, j) - h(i - 1, j)) / (2 * paso), dy = (h(i, j + 1) - h(i, j - 1)) / (2 * paso);
      // normal ≈ (-dx, -dy, 1); luz desde el noroeste y arriba
      const sombra = Math.max(0.72, Math.min(1.12, 0.94 + (dx - dy) * 0.45));
      const veg = e.vegetacion[j * ancho + i];
      let c = veg === "2" ? BOSQUE : veg === "1" ? PASTO : URBANO;
      c = mezcla(c, ALTO, Math.min(1, Math.max(0, (alturas[j * ancho + i] - 1500) / 1400)) * (veg === "0" ? 0.3 : 0.55));
      const o = ((alto - 1 - j) * ancho + i) * 4;
      img.data[o] = Math.min(255, c[0] * sombra);
      img.data[o + 1] = Math.min(255, c[1] * sombra);
      img.data[o + 2] = Math.min(255, c[2] * sombra);
      img.data[o + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(lienzo);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Calcula UV del terreno (el GLB no las trae) a partir de la posición local. */
export function asignarUv(g: THREE.BufferGeometry, e: Escenarios) {
  const p = g.getAttribute("position"), { ancho, alto, paso, oeste_sur: [x0, y0] } = e.relieve;
  const uv = new Float32Array(p.count * 2);
  for (let v = 0; v < p.count; v++) {
    uv[v * 2] = (p.getX(v) - x0) / (ancho * paso);
    uv[v * 2 + 1] = (-p.getZ(v) - y0) / (alto * paso);
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
