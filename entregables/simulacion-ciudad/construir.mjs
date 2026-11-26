// Arma simulacion_ciudad_cali.html: un solo archivo que se abre con doble clic, sin servidor ni internet
// (solo la fuente tipográfica viene de Google Fonts; sin conexión usa la del sistema).
// Uso: node entregables/simulacion-ciudad/construir.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(AQUI, "../../maqueta3d");
const esbuild = createRequire(path.join(APP, "package.json"))("esbuild");
const AREA_MINIMA = 1000; // m²: supuesto del ejercicio, el mismo de la pestaña 07 de la app

const { outputFiles: [js] } = await esbuild.build({
  entryPoints: [path.join(AQUI, "fuente/main.js")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  write: false,
  nodePaths: [path.join(APP, "node_modules")],
  logLevel: "warning",
});

const leer = (ruta) => fs.readFileSync(path.join(APP, ruta));
const rotulos = [];
const indice = (t) => (rotulos.includes(t) ? rotulos.indexOf(t) : rotulos.push(t) - 1);
const espacios = JSON.parse(leer("public/data/spaces.json")).features
  .filter(({ properties: p }) => (p.areaM2 ?? 0) >= AREA_MINIMA)
  .map(({ properties: p }) => [p.id, p.name, p.commune, p.areaM2, ...p.coordinates.map((c) => +c.toFixed(6)),
    p.flood.map(indice), p.seismic.map(indice)]);
const seguro = (json) => json.replace(/</g, "\\u003c"); // nada de "</script>" dentro del bloque
const bloque = (id, tipo, contenido) => `<script id="${id}" type="${tipo}">${contenido}</script>`;
const DRACO = "node_modules/three/examples/jsm/libs/draco/gltf/";
const PROC = path.resolve(AQUI, "../../prototipo/datos/procesados/ciudad3d"); // edificios3d.py y apis_externas.py
const procesado = (nombre, siFalta) => {
  const ruta = path.join(PROC, nombre);
  if (fs.existsSync(ruta)) return fs.readFileSync(ruta);
  if (siFalta === undefined) throw new Error(`Falta ${ruta}: corre prototipo/scripts/edificios3d.py`);
  console.warn(`Aviso: falta ${nombre}; se usa vacío`);
  return Buffer.from(siFalta);
};
const datos = [
  bloque("datos-escenarios", "application/json", seguro(JSON.stringify(JSON.parse(leer("public/ciudad/escenarios.json"))))),
  bloque("datos-espacios", "application/json", seguro(JSON.stringify({ areaMinima: AREA_MINIMA, etiquetas: rotulos, espacios }))),
  bloque("datos-glb", "text/plain", leer("public/ciudad/cali.glb").toString("base64")),
  bloque("datos-edificios-indice", "application/json", seguro(procesado("edificios.json").toString())),
  bloque("datos-edificios", "text/plain", procesado("edificios.bin.gz").toString("base64")),
  bloque("datos-mascaras", "text/plain", procesado("mascaras.bin.gz").toString("base64")),
  bloque("datos-firms", "application/json", seguro(procesado("firms_focos.json", '{"consulta":"","focos":[]}').toString())),
  bloque("datos-mapillary", "application/json", seguro(procesado("mapillary_espacios.json", '{"espacios":{}}').toString())),
  bloque("datos-espacios-extra", "application/json", seguro(procesado("espacios_extra.json", "{}").toString())),
  bloque("datos-albergues-reales", "application/json", seguro(procesado("albergues_reales.json", '{"albergues":[]}').toString())),
  bloque("datos-direcciones", "text/plain", procesado("direcciones.bin.gz").toString("base64")),
  bloque("datos-direcciones-dic", "text/plain", zlib.gzipSync(procesado("direcciones.json"), { level: 9 }).toString("base64")),
  bloque("datos-draco-js", "text/plain", leer(DRACO + "draco_wasm_wrapper.js").toString("base64")),
  bloque("datos-draco-wasm", "text/plain", leer(DRACO + "draco_decoder.wasm").toString("base64")),
].join("\n");
const plantilla = fs.readFileSync(path.join(AQUI, "fuente/index.html"), "utf8");
const html = plantilla
  .replace("<!--DATOS-->", () => datos)
  .replace("<!--SCRIPT-->", () => `<script>${js.text.replace(/<\/script/gi, "<\\/script")}</script>`);
const salida = path.join(AQUI, "simulacion_ciudad_cali.html");
fs.writeFileSync(salida, html);
console.log(`${path.relative(process.cwd(), salida)}: ${(html.length / 1e6).toFixed(1)} MB · ${espacios.length} espacios · JS ${(js.text.length / 1e3).toFixed(0)} KB`);
