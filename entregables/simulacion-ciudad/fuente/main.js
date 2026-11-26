// Maqueta 3D realista de Cali + cuadro de simulación, en un solo archivo y sin servidor.
// Cerca de la cámara: 634.239 edificios reales del catastro (huella y pisos). Lejos: volumetría por manzana.
// La lógica (incendio, demanda, elegibilidad, modelo sísmico) se importa de maqueta3d/src y tiene pruebas.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { M2_POR_PERSONA, PESOS, capacidadPersonas, dotacion, idoneidad, percentil } from "../../../maqueta3d/src/albergues.ts";
import { planningRules } from "../../../maqueta3d/src/data/site.ts";
import { altura, aLocal, celdasQuemadas, cercaDe, elegirSeparados, propagarIncendio } from "../../../maqueta3d/src/ciudadSim.ts";
import { eligibility } from "../../../maqueta3d/src/planning.ts";
import { googleMapsLinks } from "../../../maqueta3d/src/googleMaps.ts";
import {
  AJUSTE_PROFUNDO, AMPLIFICACION_SUELO_BLANDO, GRADOS_EMS, SISMO_REAL, azar, danoMedio, gradoDano, intensidadEn, romano, vulnerabilidad,
} from "../../../maqueta3d/src/sismo.ts";

const PASOS = 60;
const METROS_PISO = 3;
// Profundidad representativa dentro de cada rango oficial del POT: baja < 0,45 m; media 0,45-0,90 m; alta > 0,90 m.
const PROFUNDIDAD_AGUA = [0, 0.3, 0.7, 1.5];
const NIVELES_AGUA = ["", "baja (< 0,45 m)", "media (0,45-0,90 m)", "alta (> 0,90 m, incluye no mitigable)"];
const IGNICIONES = {
  "Cristo Rey (aprox.)": [-76.5652, 3.4357],
  "Cerro de las Tres Cruces (aprox.)": [-76.5485, 3.4655],
  "Pichindé (aprox.)": [-76.6155, 3.4405],
};
const EPICENTROS = {
  real: { ...SISMO_REAL },
  cali: { nombre: "Hipotético bajo el centro de Cali", lat: 3.4516, lon: -76.532, profundidad: 10, magnitud: 6.5 },
};
const TEXTOS = {
  inundacion: {
    titulo: "Inundación",
    fuente: "Zonas de amenaza fluvial y pluvial del POT 2014 y del expediente municipal (DAPM / IDESC). El agua sube hasta una profundidad representativa del rango oficial de cada zona y deja la marca de lodo en las fachadas. Las zonas de amenaza «mitigable» están protegidas por obras como el jarillón del río Cauca: la simulación muestra qué pasaría si esas protecciones fallan. No es un modelo hidráulico.",
  },
  sismo: {
    titulo: "Sismo",
    fuente: "Intensidad con la ecuación de Allen, Wald y Worden (2012) y daño de cada edificio con el método macrosísmico (Lagomarsino y Giovinazzi 2006, escala EMS-98). La vulnerabilidad se asume por número de pisos porque no hay inventario estructural abierto. La vibración es solo visual.",
  },
  incendio: {
    titulo: "Incendio forestal (ejercicio)",
    fuente: "Propagación ilustrativa sobre la cobertura boscosa del POT y, como supuesto, las laderas no urbanas por encima de 1.050 m. Avanza con la pendiente, el viento y azar con semilla fija. No hay capa oficial de amenaza por incendio: no es un pronóstico.",
  },
};
const LEYENDA = {
  inundacion: [["#33504f", "Agua en la zona (más oscuro, más profunda)"], ["#6b5a3e", "Marca de agua y lodo en fachadas"]],
  sismo: [["#b3d873", "Daño leve"], ["#f9d95a", "Moderado"], ["#f59a40", "Importante"], ["#db402e", "Muy grave"], ["#801414", "Colapso"]],
  incendio: [["#ff7a1a", "Frente activo"], ["#1f1b19", "Área quemada"], ["#4a403a", "Fachadas con hollín (dentro del margen)"]],
};

// --- Datos embebidos ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const leerJSON = (id) => JSON.parse($(id).textContent);
const bytes = (id) => Uint8Array.from(atob($(id).textContent.trim()), (c) => c.charCodeAt(0));
const descomprimir = async (id) =>
  new Uint8Array(await new Response(new Blob([bytes(id)]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
const fmt = new Intl.NumberFormat("es-CO").format;
/** Crea un nodo con propiedades y lo llena con los hijos que no sean nulos. */
const el = (tag, props = {}, ...hijos) => {
  const nodo = Object.assign(document.createElement(tag), props);
  nodo.append(...hijos.filter((h) => h !== null && h !== undefined && h !== false));
  return nodo;
};
const fmt1 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format;
const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const movil = innerWidth < 900;

const E = leerJSON("datos-escenarios");
const IDX = leerJSON("datos-edificios-indice");
const FIRMS = leerJSON("datos-firms");
const MLY = leerJSON("datos-mapillary");
const EXTRA = leerJSON("datos-espacios-extra"); // id → [pendiente %, distancia a salud m, nombre]
const REALES = leerJSON("datos-albergues-reales").albergues;
let DIRS = null, DIRDIC = null; // dirección más cercana (≤ 30 m) de cada edificio
const { areaMinima, etiquetas: rotulos, espacios } = leerJSON("datos-espacios");
const ESPACIOS = espacios.map(([id, name, commune, areaM2, lon, lat, f, s]) => ({
  properties: { id, name, commune, areaM2, coordinates: [lon, lat], flood: f.map((i) => rotulos[i]), seismic: s.map((i) => rotulos[i]) },
}));
const { oeste_sur: [X0, Y0], paso: PASO, ancho: ANCHO, alto: ALTO } = E.relieve;
const tresD = (x, y, sobre = 0) => new THREE.Vector3(x, altura(E.relieve, x, y) + sobre, -y);

// --- Escena --------------------------------------------------------------------------------------
const visor = $("visor");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
visor.prepend(renderer.domElement);
const rotulador = new CSS2DRenderer();
rotulador.domElement.className = "capa-etiquetas";
visor.append(rotulador.domElement);
const escena = new THREE.Scene();
escena.background = new THREE.Color("#d9e7f2");
escena.fog = new THREE.Fog("#d9e7f2", 9000, 42000);
escena.add(new THREE.HemisphereLight("#f2f7ff", "#b9ad8f", 1.5));
const sol = new THREE.DirectionalLight("#fff6e8", 2.6);
sol.position.set(-5200, 8200, 3600);
escena.add(sol);
const camara = new THREE.PerspectiveCamera(42, 1, 5, 90000);
const controles = new OrbitControls(camara, renderer.domElement);
controles.maxPolarAngle = Math.PI / 2.08;
controles.minDistance = 120;
controles.maxDistance = 38000;
controles.enableDamping = true;
const CENTRO = aLocal(E, [-76.532, 3.4516]); // Plaza de Caicedo
const VISTAS = {
  centro: { objetivo: tresD(CENTRO[0], CENTRO[1]), desde: new THREE.Vector3(1250, 900, 1650) },
  general: { objetivo: new THREE.Vector3(0, 1000, 0), desde: new THREE.Vector3(1500, 5500, 8000) },
};
controles.target.copy(VISTAS.centro.objetivo);
camara.position.copy(VISTAS.centro.objetivo).add(VISTAS.centro.desde);
new ResizeObserver(() => {
  const w = visor.clientWidth, h = visor.clientHeight;
  renderer.setSize(w, h);
  rotulador.setSize(w, h);
  camara.aspect = w / h;
  camara.updateProjectionMatrix();
}).observe(visor);
const ciudad = new THREE.Group(); // terreno, manzanas y edificios: tiembla en el sismo
const pines = new THREE.Group();
escena.add(ciudad, pines);

function etiqueta(titulo, subtitulo) {
  const div = document.createElement("div");
  div.className = "etiqueta";
  const b = document.createElement("strong");
  b.textContent = titulo;
  const s = document.createElement("span");
  s.textContent = subtitulo;
  div.append(b, s);
  return new CSS2DObject(div);
}

// --- Uniformes compartidos por los sombreadores --------------------------------------------------
const U = {
  uModo: { value: 0 }, // 0 inundación, 1 sismo, 2 incendio
  uAvance: { value: 1 },
  uPaso: { value: PASOS },
  uAnalitico: { value: 0 },
  uDetalle: { value: new THREE.Vector3(0, 0, 2500) }, // centro x, centro z, radio de edificios reales
  uCaja: { value: new THREE.Vector4(X0, Y0, IDX.mascara.ancho * IDX.mascara.res, IDX.mascara.alto * IDX.mascara.res) },
  uMascara: { value: null },
  uInund: { value: null },
  uQuema: { value: null },
};
function textura(datos, ancho, alto, suave = true) {
  const t = new THREE.DataTexture(datos, ancho, alto, THREE.RedFormat, THREE.UnsignedByteType);
  t.unpackAlignment = 1;
  t.magFilter = suave ? THREE.LinearFilter : THREE.NearestFilter;
  t.minFilter = suave ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter;
  t.generateMipmaps = suave;
  t.needsUpdate = true;
  return t;
}
const quemaTex = new Uint8Array(ANCHO * ALTO).fill(255);
U.uQuema.value = textura(quemaTex, ANCHO, ALTO);
U.uQuema.value.generateMipmaps = false;
U.uQuema.value.minFilter = THREE.LinearFilter;

function inyectar(material, { vertexHead = "", vertex = "", fragmentHead = "", color = "", emisivo = "" }) {
  material.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader
      .replace("#include <common>", `#include <common>\n${vertexHead}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${vertex}`);
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", `#include <common>\n${fragmentHead}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${color}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${emisivo}`);
  };
  return material;
}

const UNIFORMES_GLSL = `uniform float uModo; uniform float uAvance; uniform float uPaso; uniform float uAnalitico; uniform vec3 uDetalle;`;

// Terreno: vías y lotes según la máscara de manzanas, agua en zonas de inundación, quema del incendio.
const matTerreno = inyectar(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), {
  vertexHead: "varying vec3 vMundoT;",
  vertex: "vMundoT = (modelMatrix * vec4(transformed, 1.0)).xyz;",
  fragmentHead: `${UNIFORMES_GLSL} uniform vec4 uCaja; uniform sampler2D uMascara; uniform sampler2D uInund; uniform sampler2D uQuema;
    varying vec3 vMundoT;`,
  color: `
    vec2 uvT = vec2((vMundoT.x - uCaja.x) / uCaja.z, (-vMundoT.z - uCaja.y) / uCaja.w);
    float lote = texture(uMascara, uvT).r;
    float urbano = textureLod(uMascara, uvT, 3.5).r;
    if (urbano > 0.1) diffuseColor.rgb = mix(vec3(0.42, 0.43, 0.45), vec3(0.84, 0.82, 0.77), smoothstep(0.35, 0.65, lote));
    float nivelT = texture(uInund, uvT).r * 255.0;
    if (uModo < 0.5 && nivelT > 0.05) {
      vec3 agua = nivelT > 2.5 ? vec3(0.20, 0.31, 0.33) : nivelT > 1.5 ? vec3(0.27, 0.39, 0.40) : vec3(0.38, 0.48, 0.46);
      diffuseColor.rgb = mix(diffuseColor.rgb, agua, 0.88 * uAvance * clamp(nivelT, 0.0, 1.0));
    }
    float quemaT = texture(uQuema, uvT).r * 255.0;
    if (uModo > 1.5 && quemaT < 250.0 && uPaso >= quemaT) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.11, 0.10), 0.88);`,
  emisivo: `
    if (uModo > 1.5 && quemaT < 250.0 && uPaso >= quemaT && uPaso - quemaT < 6.0)
      totalEmissiveRadiance += vec3(1.0, 0.36, 0.06) * 1.6 * (1.0 - (uPaso - quemaT) / 6.0);`,
});

// Manzanas: se ven lejos; dentro del círculo de detalle se esconden y aparecen los edificios reales.
const matManzanas = inyectar(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }), {
  vertexHead: `attribute vec2 aCentroM; ${UNIFORMES_GLSL}`,
  vertex: "if (distance(aCentroM, uDetalle.xy) < uDetalle.z) transformed.y -= 5000.0;",
});

// Edificios: fachadas, ventanas y techos procedurales; deterioro según el escenario.
const matEdificios = inyectar(new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.82, side: THREE.DoubleSide }), {
  vertexHead: `attribute vec4 aDatos; attribute vec4 aEsc; attribute vec2 aCentro; ${UNIFORMES_GLSL}
    varying vec4 vDatosE; varying vec4 vEscE; varying vec3 vMundoE; varying float vSobre;`,
  vertex: `
    float baseE = aDatos.x, altoE = aDatos.y, relE = aDatos.z, semE = aDatos.w;
    float aparece = abs(uModo - 1.0) < 0.5 ? smoothstep(0.4, 0.7, uAvance) : 0.0;
    float k5 = step(4.5, aEsc.x) * aparece;
    float k4 = step(3.5, aEsc.x) * (1.0 - step(4.5, aEsc.x)) * aparece;
    float k3 = step(2.5, aEsc.x) * (1.0 - step(3.5, aEsc.x)) * aparece;
    float sobre = transformed.y - baseE;
    sobre *= 1.0 - k5 * (1.0 - min(1.0, 2.2 / max(altoE, 2.2))) - k4 * 0.45;
    transformed.y = baseE + sobre;
    float angE = semE * 6.2831853;
    transformed.xz += vec2(cos(angE), sin(angE)) * relE * altoE * (0.02 * k3 + 0.07 * k4 + 0.12 * k5);
    if (distance(aCentro, uDetalle.xy) > uDetalle.z) transformed.y -= 5000.0;
    vDatosE = aDatos; vEscE = aEsc; vSobre = sobre;
    vMundoE = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
  fragmentHead: `${UNIFORMES_GLSL} varying vec4 vDatosE; varying vec4 vEscE; varying vec3 vMundoE; varying float vSobre;
    float hashE(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    vec3 fachada(float s) {
      if (s < 0.30) return vec3(0.93, 0.92, 0.89);
      if (s < 0.47) return vec3(0.91, 0.86, 0.75);
      if (s < 0.62) return vec3(0.70, 0.43, 0.32);
      if (s < 0.73) return vec3(0.80, 0.80, 0.78);
      if (s < 0.83) return vec3(0.90, 0.77, 0.55);
      if (s < 0.92) return vec3(0.87, 0.67, 0.61);
      return vec3(0.72, 0.81, 0.83);
    }
    vec3 colorGrado(float g) {
      if (g < 0.5) return vec3(0.92, 0.92, 0.90);
      if (g < 1.5) return vec3(0.70, 0.85, 0.45);
      if (g < 2.5) return vec3(0.98, 0.85, 0.35);
      if (g < 3.5) return vec3(0.96, 0.60, 0.25);
      if (g < 4.5) return vec3(0.86, 0.25, 0.18);
      return vec3(0.50, 0.08, 0.08);
    }`,
  color: `{
    vec3 nE = normalize(cross(dFdx(vMundoE), dFdy(vMundoE)));
    float semE = vDatosE.w, altoE = vDatosE.y, y = vSobre;
    vec3 c = fachada(semE);
    if (abs(nE.y) > 0.6) {
      c = (altoE < 6.5 && fract(semE * 7.31) < 0.62) ? vec3(0.64, 0.34, 0.25) : vec3(0.71, 0.71, 0.69);
    } else {
      vec2 tE = normalize(vec2(-nE.z, nE.x) + 1e-5);
      float u = dot(vMundoE.xz, tE);
      float fx = fract(u / 3.1), fy = fract(y / 3.0);
      float lejos = 1.0 - smoothstep(700.0, 2400.0, distance(cameraPosition, vMundoE));
      float ventana = step(0.3, fx) * step(fx, 0.72) * step(0.3, fy) * step(fy, 0.78) * step(0.9, y) * step(y, altoE - 0.4) * lejos;
      c = mix(c, vec3(0.21, 0.27, 0.33), ventana * 0.85);
      c *= 1.0 - 0.10 * step(fy, 0.05) * lejos;
      c *= 0.92 + 0.08 * smoothstep(0.0, 2.0, y);
    }
    float aparece = abs(uModo - 1.0) < 0.5 ? smoothstep(0.4, 0.7, uAvance) : 0.0;
    float g = vEscE.x * aparece;
    if (g > 0.5) {
      float grieta = 1.0 - smoothstep(0.0, 0.035 + 0.012 * g, abs(fract((vMundoE.x + vMundoE.z) * 0.17 + y * 0.23 + semE * 9.0) - 0.5));
      float grieta2 = (1.0 - smoothstep(0.0, 0.03, abs(fract((vMundoE.x - vMundoE.z) * 0.11 - y * 0.31 + semE * 3.0) - 0.5))) * step(1.5, g);
      c = mix(c, c * 0.3, max(grieta, grieta2) * 0.85);
      c = mix(c, vec3(0.58, 0.53, 0.47), smoothstep(2.5, 5.0, g) * 0.55);
      if (g > 4.5) c = mix(vec3(0.52, 0.47, 0.42), vec3(0.35, 0.32, 0.29), hashE(floor(vMundoE.xz * 1.5) + floor(y * 2.0)));
      if (uAnalitico > 0.5) c = mix(c, colorGrado(vEscE.x), 0.8);
    }
    if (uModo < 0.5 && vEscE.y > 0.0) {
      float agua = vEscE.y * uAvance;
      c = mix(c, vec3(0.30, 0.35, 0.32), step(y, agua) * 0.85);
      c = mix(c, vec3(0.42, 0.35, 0.24), step(agua, y) * step(y, agua + 0.22) * 0.75 * step(0.01, agua));
      if (uAnalitico > 0.5) c = mix(c, vEscE.y > 1.0 ? vec3(0.12, 0.37, 0.62) : vEscE.y > 0.5 ? vec3(0.31, 0.59, 0.81) : vec3(0.61, 0.79, 0.91), 0.7 * uAvance);
    }
    if (uModo > 1.5 && vEscE.z >= 0.0 && uPaso >= vEscE.z) {
      float hollin = clamp((uPaso - vEscE.z) / 10.0, 0.0, 1.0) * 0.72;
      c = mix(c, vec3(0.15, 0.13, 0.12), hollin * (0.55 + 0.45 * (1.0 - smoothstep(0.0, 8.0, y))));
      if (uAnalitico > 0.5) c = mix(c, vec3(0.75, 0.16, 0.11), 0.7);
    }
    diffuseColor.rgb = c;
  }`,
});

// --- Estado ----------------------------------------------------------------------------------
const estado = {
  escenario: "sismo",
  avance: 1,
  epicentro: "real",
  epi: { ...EPICENTROS.real },
  magnitud: SISMO_REAL.magnitud,
  profundidad: SISMO_REAL.profundidad,
  ignicion: aLocal(E, IGNICIONES["Cristo Rey (aprox.)"]),
  viento: 90,
  margen: 300,
};
let B = null, manzanas = null, terreno = null, indiceManzana = null, quema = new Int16Array(ANCHO * ALTO).fill(-1);
let resumenSismo = null, anim = null, vuelo = null, acopiosClave = "";

// --- Edificios: lectura del binario y geometría por teselas ----------------------------------------
function leerEdificios(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const n = IDX.total;
  const B = {
    n, dv, cx: new Float32Array(n), cy: new Float32Array(n), base: new Float32Array(n), pisos: new Uint8Array(n),
    banderas: new Uint8Array(n), inicio: new Uint32Array(n), grado: new Uint8Array(n), fuego: new Int16Array(n).fill(-1), teselas: [],
  };
  let k = 0;
  for (const [ti, tj, off, len, cuantos] of IDX.teselas) {
    const ox = IDX.x0 + ti * IDX.tesela, oy = IDX.y0 + tj * IDX.tesela;
    B.teselas.push({ ox, oy, primero: k, cuantos, malla: null, cx: ox + IDX.tesela / 2, cy: oy + IDX.tesela / 2 });
    for (let o = off; o < off + len; k++) {
      B.pisos[k] = dv.getUint8(o);
      B.banderas[k] = dv.getUint8(o + 1);
      const nv = dv.getUint8(o + 2);
      B.inicio[k] = o;
      o += 3;
      let x = 0, y = 0, sx = 0, sy = 0;
      for (let v = 0; v < nv; v++, o += 4) {
        x += dv.getInt16(o, true);
        y += dv.getInt16(o + 2, true);
        sx += x;
        sy += y;
      }
      B.cx[k] = ox + (sx / nv) * 0.2;
      B.cy[k] = oy + (sy / nv) * 0.2;
      B.base[k] = altura(E.relieve, B.cx[k], B.cy[k]);
    }
  }
  return B;
}

function construirTesela(t) {
  let nv = 0, ni = 0;
  for (let k = t.primero; k < t.primero + t.cuantos; k++) {
    const n = B.dv.getUint8(B.inicio[k] + 2);
    nv += 2 * n;
    ni += 6 * n + 3 * (n - 2);
  }
  const pos = new Float32Array(nv * 3), datos = new Float32Array(nv * 4), esc = new Float32Array(nv * 4), centro = new Float32Array(nv * 2);
  const indices = new Uint32Array(ni), rangos = new Uint32Array(t.cuantos * 2);
  let v = 0, i = 0;
  for (let k = t.primero, b = 0; k < t.primero + t.cuantos; k++, b++) {
    let o = B.inicio[k];
    const n = B.dv.getUint8(o + 2);
    o += 3;
    const alto = Math.max(B.pisos[k], 1) * METROS_PISO, base = B.base[k], sem = azar(k * 7 + 3);
    const contorno = [];
    let x = 0, y = 0;
    for (let q = 0; q < n; q++, o += 4) {
      x += B.dv.getInt16(o, true);
      y += B.dv.getInt16(o + 2, true);
      const wx = t.ox + x * 0.2, wy = t.oy + y * 0.2;
      contorno.push(new THREE.Vector2(wx, wy));
      pos.set([wx, base - 1.5, -wy], (v + q) * 3);
      pos.set([wx, base + alto, -wy], (v + n + q) * 3);
    }
    for (let q = 0; q < 2 * n; q++) {
      datos.set([base, alto, q < n ? 0 : 1, sem], (v + q) * 4);
      centro.set([B.cx[k], -B.cy[k]], (v + q) * 2);
    }
    for (let q = 0; q < n; q++) {
      const a = v + q, c = v + ((q + 1) % n);
      indices.set([a, c, c + n, a, c + n, a + n], i);
      i += 6;
    }
    for (const [p, q, r] of THREE.ShapeUtils.triangulateShape(contorno, [])) {
      indices.set([v + n + p, v + n + q, v + n + r], i);
      i += 3;
    }
    rangos[b * 2] = v;
    rangos[b * 2 + 1] = 2 * n;
    v += 2 * n;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aDatos", new THREE.BufferAttribute(datos, 4));
  g.setAttribute("aEsc", new THREE.BufferAttribute(esc, 4));
  g.setAttribute("aCentro", new THREE.BufferAttribute(centro, 2));
  g.setIndex(new THREE.BufferAttribute(indices.subarray(0, i), 1));
  g.computeBoundingSphere();
  t.malla = new THREE.Mesh(g, matEdificios);
  t.malla.userData.rangos = rangos;
  ciudad.add(t.malla);
  escribirEscenario(t);
}

function escribirEscenario(t) {
  const atributo = t.malla.geometry.getAttribute("aEsc"), a = atributo.array, rangos = t.malla.userData.rangos;
  for (let b = 0; b < t.cuantos; b++) {
    const k = t.primero + b, g = B.grado[k], agua = PROFUNDIDAD_AGUA[B.banderas[k] & 3], f = B.fuego[k];
    for (let q = rangos[b * 2], fin = q + rangos[b * 2 + 1]; q < fin; q++) {
      a[q * 4] = g;
      a[q * 4 + 1] = agua;
      a[q * 4 + 2] = f;
    }
  }
  atributo.needsUpdate = true;
}

function liberar(t) {
  ciudad.remove(t.malla);
  t.malla.geometry.dispose();
  t.malla = null;
}

/** Edificios reales en un círculo alrededor del centro de la vista; el radio crece al alejarse. */
function actualizarDetalle() {
  if (!B) return;
  const d = camara.position.distanceTo(controles.target);
  const r = THREE.MathUtils.clamp(d * 0.85, 900, movil ? 2400 : 3800);
  U.uDetalle.value.set(controles.target.x, controles.target.z, r);
  let nuevas = 0;
  for (const t of B.teselas) {
    const dist = Math.hypot(t.cx - controles.target.x, -t.cy - controles.target.z);
    const cerca = dist < r + 760;
    if (cerca && !t.malla && nuevas < 2) {
      construirTesela(t);
      nuevas++;
    }
    if (t.malla) {
      t.malla.visible = cerca;
      if (dist > r + 4000) liberar(t);
    }
  }
}

// --- Escenarios por edificio ----------------------------------------------------------------------
const VQ = Array.from({ length: 256 }, (_, p) => vulnerabilidad(Math.max(p, 1)));
function calcularSismo() {
  const [ex, ey] = aLocal(E, [estado.epi.lon, estado.epi.lat]);
  const conteo = [0, 0, 0, 0, 0, 0];
  let imin = 99, imax = 0;
  for (let k = 0; k < B.n; k++) {
    const r = Math.hypot(B.cx[k] - ex, B.cy[k] - ey) / 1000;
    const I = intensidadEn(estado.magnitud, r, estado.profundidad, (B.banderas[k] & 4) !== 0);
    const { V, Q } = VQ[B.pisos[k]];
    const g = gradoDano(danoMedio(I, V, Q), azar(k));
    B.grado[k] = g;
    conteo[g]++;
    if (I < imin) imin = I;
    if (I > imax) imax = I;
  }
  const rCentro = Math.hypot(CENTRO[0] - ex, CENTRO[1] - ey) / 1000;
  resumenSismo = { conteo, imin, imax, rEpi: rCentro, iCentro: intensidadEn(estado.magnitud, rCentro, estado.profundidad, false), ex, ey };
}

function rehacerIncendio() {
  quema = propagarIncendio(E, estado.ignicion, { pasos: PASOS, vientoHaciaGrados: estado.viento });
  for (let c = 0; c < quema.length; c++) quemaTex[c] = quema[c] >= 0 ? quema[c] : 255;
  U.uQuema.value.needsUpdate = true;
  calcularMargen();
  const inicio = quema.indexOf(0);
  marcaInicio.visible = inicio >= 0;
  if (inicio >= 0) marcaInicio.position.copy(tresD(X0 + (inicio % ANCHO) * PASO, Y0 + Math.floor(inicio / ANCHO) * PASO, 160));
  $("aviso-incendio").textContent = inicio >= 0 ? "" : "No hay vegetación a menos de 600 m de ese punto: elige otro.";
}

/** Paso en que cada edificio queda dentro del margen del área quemada (filtro mínimo separable sobre la grilla). */
function calcularMargen() {
  const r = Math.max(1, Math.round(estado.margen / PASO)), INF = 32767;
  const filas = new Int16Array(ANCHO * ALTO), dil = new Int16Array(ANCHO * ALTO);
  for (let j = 0; j < ALTO; j++)
    for (let i = 0; i < ANCHO; i++) {
      let m = INF;
      for (let a = Math.max(0, i - r); a <= Math.min(ANCHO - 1, i + r); a++) {
        const q = quema[j * ANCHO + a];
        if (q >= 0 && q < m) m = q;
      }
      filas[j * ANCHO + i] = m;
    }
  for (let i = 0; i < ANCHO; i++)
    for (let j = 0; j < ALTO; j++) {
      let m = INF;
      for (let b = Math.max(0, j - r); b <= Math.min(ALTO - 1, j + r); b++) m = Math.min(m, filas[b * ANCHO + i]);
      dil[j * ANCHO + i] = m;
    }
  for (let k = 0; k < B.n; k++) {
    const i = Math.round((B.cx[k] - X0) / PASO), j = Math.round((B.cy[k] - Y0) / PASO);
    const m = i >= 0 && j >= 0 && i < ANCHO && j < ALTO ? dil[j * ANCHO + i] : INF;
    B.fuego[k] = m < INF ? m : -1;
  }
  calcularMargen.dil = dil;
}

function pintarManzanas() {
  const color = manzanas.geometry.getAttribute("color");
  const c = new THREE.Color(), base = new THREE.Color("#ebe7df");
  const tonos = {
    inundacion: ["#ebe7df", "#9cc9e8", "#4f97cf", "#1f5f9e"].map((h) => new THREE.Color(h)),
    sismo: ["#ebe7df", "#b3d873", "#f9d95a", "#f59a40", "#db402e", "#801414"].map((h) => new THREE.Color(h)),
  };
  const [ex, ey] = resumenSismo ? [resumenSismo.ex, resumenSismo.ey] : [0, 0];
  const paso = Math.round(estado.avance * PASOS);
  const nivelM = E.manzanas.map((m) => {
    if (estado.escenario === "inundacion") return estado.avance > 0 ? m[4] : 0;
    if (estado.escenario === "sismo") {
      if (estado.avance < 0.55) return 0;
      const I = intensidadEn(estado.magnitud, Math.hypot(m[0] - ex, m[1] - ey) / 1000, estado.profundidad, m[5] === 1);
      const { V, Q } = VQ[Math.max(1, Math.round(m[2] / METROS_PISO))];
      return Math.min(5, Math.round(danoMedio(I, V, Q)));
    }
    const i = Math.round((m[0] - X0) / PASO), j = Math.round((m[1] - Y0) / PASO);
    const t = calcularMargen.dil?.[j * ANCHO + i] ?? 32767;
    return t <= paso ? 1 : 0;
  });
  for (let v = 0; v < indiceManzana.length; v++) {
    const n = nivelM[indiceManzana[v]] ?? 0;
    if (estado.escenario === "incendio") c.copy(base).lerp(new THREE.Color("#4a403a"), n * 0.7);
    else c.copy(n ? tonos[estado.escenario][n] : base);
    color.setXYZ(v, c.r, c.g, c.b);
  }
  color.needsUpdate = true;
}

// --- Marcadores ------------------------------------------------------------------------------------
const marcaInicio = etiqueta("Inicio", "ejercicio de incendio");
const marcaEpicentro = etiqueta("Epicentro", "");
escena.add(marcaInicio, marcaEpicentro);
const danosReales = (() => {
  const geo = new THREE.ConeGeometry(18, 60, 6);
  geo.rotateX(Math.PI);
  const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ emissive: "#3a0000" }), E.danos_sismo.length);
  const mat = new THREE.Matrix4(), c = new THREE.Color();
  E.danos_sismo.forEach(([x, y, grado], k) => {
    const p = tresD(x, y, 70);
    m.setMatrixAt(k, mat.makeTranslation(p.x, p.y, p.z));
    m.setColorAt(k, c.set(/destroy/i.test(grado) ? "#7a1010" : /possibly|sin definir/i.test(grado) ? "#e0a030" : "#c43a1c"));
  });
  escena.add(m);
  return m;
})();
const focos = FIRMS.focos.map((f) => {
  const [x, y] = aLocal(E, [f.lon, f.lat]);
  const rot = etiqueta("Foco de calor real", `NASA FIRMS · ${f.fecha}`);
  rot.position.copy(tresD(x, y, 200));
  escena.add(rot);
  return { ...f, x, y, rot };
});
const humo = (() => {
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 64;
  const ctx = lienzo.getContext("2d");
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const puntos = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({
    map: new THREE.CanvasTexture(lienzo), size: 340, color: "#8d8782", transparent: true, opacity: 0.42, depthWrite: false,
  }));
  puntos.userData.bases = [];
  escena.add(puntos);
  return puntos;
})();
function actualizarHumo(paso) {
  let bases = [];
  if (estado.escenario === "incendio") {
    for (let c = 0; c < quema.length && bases.length < 360; c++)
      if (quema[c] >= 0 && quema[c] <= paso && paso - quema[c] < 8)
        bases.push({ p: tresD(X0 + (c % ANCHO) * PASO, Y0 + Math.floor(c / ANCHO) * PASO, 40), fase: azar(c), alto: 700 });
    humo.material.color.set("#8d8782");
    humo.material.size = 340;
  } else if (estado.escenario === "sismo" && estado.avance > 0.4 && B) {
    // Polvo sobre los colapsos más cercanos a la vista (grados 4 y 5).
    const ox = controles.target.x, oz = controles.target.z, cerca = [];
    for (let k = 0; k < B.n; k++)
      if (B.grado[k] >= 4) {
        const d = (B.cx[k] - ox) ** 2 + (-B.cy[k] - oz) ** 2;
        if (d < 2500 ** 2) cerca.push([d, k]);
      }
    cerca.sort((a, b) => a[0] - b[0]);
    bases = cerca.slice(0, 300).map(([, k]) => ({ p: new THREE.Vector3(B.cx[k], B.base[k] + 4, -B.cy[k]), fase: azar(k), alto: 60 }));
    humo.material.color.set("#b9ab98");
    humo.material.size = 70;
  }
  humo.userData.bases = bases;
  humo.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(bases.length * 3), 3));
}

// --- Acopios -----------------------------------------------------------------------------------------
const geoPin = new THREE.CylinderGeometry(30, 30, 140, 16);
const matPin = new THREE.MeshStandardMaterial({ color: "#1f8a4c", emissive: "#0c3b20" });
function afectado() {
  const paso = Math.round(estado.avance * PASOS);
  if (estado.escenario === "inundacion") return (k) => (B.banderas[k] & 3) > 0;
  if (estado.escenario === "sismo") return (k) => B.grado[k] >= 3;
  return (k) => B.fuego[k] >= 0 && B.fuego[k] <= paso;
}
const CELDA = 250;
function mallaAfectados() {
  const malla = new Map(), es = afectado();
  for (let k = 0; k < B.n; k++)
    if (es(k)) {
      const clave = `${Math.floor(B.cx[k] / CELDA)},${Math.floor(B.cy[k] / CELDA)}`;
      malla.set(clave, (malla.get(clave) ?? 0) + 1);
    }
  return malla;
}
/** Centro de la celda de 250 m con más edificaciones afectadas: a donde viaja la cámara. */
function zonaMasAfectada() {
  let mejor = null, max = 0;
  for (const [clave, n] of mallaAfectados()) if (n > max) [mejor, max] = [clave, n];
  if (!mejor) return null;
  const [i, j] = mejor.split(",").map(Number);
  return tresD((i + 0.5) * CELDA, (j + 0.5) * CELDA);
}
function sugerirAcopios() {
  const RADIO = 1500, malla = mallaAfectados();
  const cerca = estado.escenario === "incendio" ? cercaDe(celdasQuemadas(E, quema, PASOS), estado.margen) : null;
  const r = Math.ceil(RADIO / CELDA);
  return elegirSeparados(
    ESPACIOS.flatMap((s) => {
      const [x, y] = aLocal(E, s.properties.coordinates);
      let motivo;
      if (cerca) {
        if (cerca(x, y)) return [];
        motivo = "Ejercicio: fuera del área quemada y del margen supuesto. No es una recomendación operativa; la decide Bomberos / el CMGRD.";
      } else {
        const e = eligibility(s, estado.escenario === "sismo" ? "earthquake" : "flood");
        if (e.excluded) return [];
        motivo = e.reason;
      }
      const ci = Math.floor(x / CELDA), cj = Math.floor(y / CELDA);
      let demanda = 0;
      for (let a = -r; a <= r; a++)
        for (let b = -r; b <= r; b++)
          if (((a + 0.5) * CELDA) ** 2 + ((b + 0.5) * CELDA) ** 2 <= RADIO ** 2) demanda += malla.get(`${ci + a},${cj + b}`) ?? 0;
      return demanda ? [{ s, x, y, motivo, demanda }] : [];
    }).sort((a, b) => b.demanda - a.demanda || (b.s.properties.areaM2 ?? 0) - (a.s.properties.areaM2 ?? 0)),
  );
}

function mostrarAcopios(lista) {
  pines.clear(); // al quitarlas, las etiquetas CSS2D se borran del DOM
  const ol = $("acopios");
  ol.replaceChildren();
  $("acopios-espera").hidden = !!lista;
  $("cuenta-acopios").textContent = lista ? String(lista.length) : "";
  const motivos = [...new Set((lista ?? []).map((a) => a.motivo))];
  $("acopios-motivo").textContent = motivos.length === 1 ? motivos[0] : "";
  if (!lista) return;
  if (!lista.length) ol.append(el("li", { textContent: "Ningún espacio cumple el criterio con estos parámetros." }));
  lista.forEach((a, k) => {
    const base = tresD(a.x, a.y);
    const pin = new THREE.Mesh(geoPin, matPin);
    pin.position.copy(base).setY(base.y + 70);
    const rot = etiqueta(String(k + 1), "acopio");
    rot.position.copy(base).setY(base.y + 230);
    pines.add(pin, rot);
    const p = a.s.properties, enl = googleMapsLinks(p.coordinates), foto = MLY.espacios[p.id];
    const ver = el("button", { type: "button", textContent: "Ver" });
    ver.addEventListener("click", () => volarA(tresD(a.x, a.y), new THREE.Vector3(420, 380, 520)));
    ol.append(el("li", {},
      el("span", { className: "nombre", textContent: p.name, title: p.name }),
      el("span", { className: "dato", textContent: `Comuna ${p.commune ?? "sin asignar"} · ${fmt(p.areaM2 ?? 0)} m² · ${fmt(a.demanda)} edificaciones afectadas a 1,5 km` }),
      motivos.length > 1 ? el("span", { className: "dato", textContent: a.motivo }) : null,
      el("span", { className: "acciones" }, ver, enlace(enl.streetView, "Street View"),
        foto ? enlace(`https://www.mapillary.com/app/?pKey=${foto.id}`, `Foto ${foto.fecha.slice(0, 4)}`) : null, enlace(enl.map, "Maps"))));
  });
}

function volarA(objetivo, desde) {
  const fin = objetivo.clone().add(desde);
  if (reducido) {
    controles.target.copy(objetivo);
    camara.position.copy(fin);
    return;
  }
  const t0 = performance.now(), desdeT = controles.target.clone(), desdeC = camara.position.clone();
  vuelo = (ahora) => {
    const k = Math.min(1, (ahora - t0) / 1400), s = k * k * (3 - 2 * k);
    controles.target.lerpVectors(desdeT, objetivo, s);
    camara.position.lerpVectors(desdeC, fin, s);
    if (k === 1) vuelo = null;
  };
}

// --- Cuadro de simulación ------------------------------------------------------------------------------
function barras(filas) {
  const max = Math.max(1, ...filas.map((f) => f[1]));
  return el("div", { className: "barras" }, ...filas.flatMap(([texto, valor, color]) => [
    el("span", { textContent: texto }),
    el("span", { className: "b" }, el("i", { style: `width:${(valor / max) * 100}%;background:${color}` })),
    el("span", { className: "v", textContent: fmt(valor) }),
  ]));
}
function resumir() {
  const caja = $("resumen");
  caja.replaceChildren();
  if (estado.escenario === "sismo" && resumenSismo) {
    const s = resumenSismo;
    caja.append(
      el("p", { className: "kpi" }, el("strong", { textContent: s.imin === s.imax ? romano(s.imin) : `${romano(s.imin)} a ${romano(s.imax)}` }), el("span", { textContent: "intensidad estimada en Cali (Mercalli Modificada)" })),
      el("p", { className: "sub", textContent: `Mw ${fmt1(estado.magnitud)} · a ${fmt(Math.round(s.rEpi))} km del centro · ${fmt(estado.profundidad)} km de profundidad · ${fmt(B.n)} edificaciones (EMS-98)` }),
      barras([["Colapso", s.conteo[5], "#801414"], ["Muy grave", s.conteo[4], "#db402e"], ["Importante", s.conteo[3], "#f59a40"], ["Moderado", s.conteo[2], "#f9d95a"], ["Leve", s.conteo[1], "#b3d873"], ["Sin daño", s.conteo[0], "#cfd6cf"]]));
    if (estado.epicentro === "real" && estado.magnitud === SISMO_REAL.magnitud && estado.profundidad === SISMO_REAL.profundidad)
      caja.append(el("p", { className: "comparacion", textContent: `Frente a lo ocurrido: la UNGRD reportó 879 viviendas destruidas y 16.357 averiadas en Cali (corte 17-sep); la Alcaldía, 1.078 edificaciones con sticker rojo de 3.403 evaluadas. El modelo estima ${fmt(s.conteo[4] + s.conteo[5])} con daño muy grave o colapso y ${fmt(s.conteo[2] + s.conteo[3])} con daño moderado o importante. Los conos son los daños observados por satélite.` }));
  } else if (estado.escenario === "inundacion") {
    const n = [0, 0, 0, 0];
    for (let k = 0; k < B.n; k++) n[B.banderas[k] & 3]++;
    caja.append(
      el("p", { className: "kpi" }, el("strong", { textContent: fmt(n[1] + n[2] + n[3]) }), el("span", { textContent: `edificaciones en zona de inundación, de ${fmt(B.n)}` })),
      barras([["Alta > 0,9 m", n[3], "#1f5f9e"], ["Media 0,45-0,9 m", n[2], "#4f97cf"], ["Baja < 0,45 m", n[1], "#9cc9e8"]]));
  } else {
    const paso = Math.round(estado.avance * PASOS);
    let n = 0, celdas = 0;
    for (let k = 0; k < B.n; k++) if (B.fuego[k] >= 0 && B.fuego[k] <= paso) n++;
    for (const q of quema) if (q >= 0 && q <= paso) celdas++;
    caja.append(
      el("p", { className: "kpi" }, el("strong", { textContent: `${fmt1((celdas * PASO * PASO) / 10000)} ha` }), el("span", { textContent: "de área quemada" })),
      el("p", { className: "sub", textContent: `${fmt(n)} edificaciones dentro del margen de ${fmt(estado.margen)} m · paso ${paso} de ${PASOS}` }));
  }
}

function aplicar({ sismo = false, incendio = false } = {}) {
  if (!B) return;
  if (sismo) calcularSismo();
  if (incendio) rehacerIncendio();
  for (const t of B.teselas) if (t.malla) escribirEscenario(t);
  actualizarVista();
}

function actualizarVista() {
  const { escenario, avance } = estado;
  U.uModo.value = { inundacion: 0, sismo: 1, incendio: 2 }[escenario];
  U.uAvance.value = avance;
  U.uPaso.value = avance * PASOS;
  $("avance").value = String(avance);
  $("avance-valor").textContent = `${Math.round(avance * 100)} %`;
  danosReales.visible = escenario === "sismo" && $("ver-danos").checked && avance > 0.55;
  marcaEpicentro.visible = escenario === "sismo" && resumenSismo && Math.abs(resumenSismo.ex - X0) < 30000 && resumenSismo.ex > X0 && resumenSismo.ex < X0 + ANCHO * PASO && resumenSismo.ey > Y0 && resumenSismo.ey < Y0 + ALTO * PASO;
  if (marcaEpicentro.visible) marcaEpicentro.position.copy(tresD(resumenSismo.ex, resumenSismo.ey, 300));
  marcaInicio.visible = escenario === "incendio" && quema.indexOf(0) >= 0;
  focos.forEach((f) => (f.rot.visible = escenario === "incendio"));
  humo.visible = escenario === "incendio" || (escenario === "sismo" && avance > 0.4);
  if (humo.visible) actualizarHumo(Math.round(avance * PASOS));
  pintarManzanas();
  resumir();
  const clave = [escenario, avance === 1, estado.magnitud, estado.profundidad, estado.epicentro, estado.epi.lat, estado.margen, estado.viento, estado.ignicion.join()].join("|");
  if (clave !== acopiosClave && pestana === "simulacion") {
    acopiosClave = clave;
    mostrarAcopios(avance === 1 ? sugerirAcopios() : null);
  }
}

function ponerLeyenda() {
  const extra = pestana === "albergues"
    ? [["#1f8a4c", "Albergue sugerido (número = puesto)"], ["#6b4fa0", "Albergue o acopio real (sismo 10-ago)"]]
    : [["#1f8a4c", "Acopio sugerido"]];
  $("leyenda").replaceChildren(...[...LEYENDA[estado.escenario], ...extra].map(([color, texto]) => el("span", {}, el("i", { style: `background:${color}` }), texto)));
}
function ponerEscenario() {
  const e = estado.escenario;
  document.querySelectorAll("[data-escenario]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.escenario === e)));
  $("opciones-incendio").hidden = e !== "incendio";
  $("opciones-sismo").hidden = e !== "sismo";
  $("fuente").textContent = TEXTOS[e].fuente;
  ponerLeyenda();
}

// --- Controles ---------------------------------------------------------------------------------------
$("criterio").textContent = `Espacios públicos y escenarios deportivos de al menos ${fmt(areaMinima)} m² (supuesto) que quedan fuera del escenario. Se ordenan por edificaciones afectadas a menos de 1,5 km y se separan al menos 1 km entre sí. Es una preselección para revisar en sitio: no confirma disponibilidad, estado estructural ni autorización.`;
document.querySelectorAll("[data-escenario]").forEach((b) =>
  b.addEventListener("click", () => {
    anim = null;
    estado.escenario = b.dataset.escenario;
    estado.avance = 1;
    ponerEscenario();
    actualizarVista();
    irAZona();
  }),
);
$("simular").addEventListener("click", () => {
  if (reducido) {
    estado.avance = 1;
    return actualizarVista();
  }
  anim = performance.now();
});
$("avance").addEventListener("input", (ev) => {
  anim = null;
  estado.avance = Number(ev.target.value);
  actualizarVista();
});
$("analitico").addEventListener("change", (ev) => (U.uAnalitico.value = ev.target.checked ? 1 : 0));
$("ver-danos").addEventListener("change", actualizarVista);
$("vista-centro").addEventListener("click", () => volarA(VISTAS.centro.objetivo, VISTAS.centro.desde));
$("vista-general").addEventListener("click", () => volarA(VISTAS.general.objetivo, VISTAS.general.desde));
$("vista-zona").addEventListener("click", () => irAZona());
function irAZona() {
  const z = zonaMasAfectada();
  if (z) volarA(z, estado.escenario === "incendio" ? new THREE.Vector3(1300, 900, 1500) : new THREE.Vector3(380, 300, 460));
}

const magnitud = $("magnitud"), profundidad = $("profundidad"), epicentro = $("epicentro");
const mostrarSismo = () => {
  $("magnitud-valor").textContent = fmt1(estado.magnitud);
  $("profundidad-valor").textContent = `${fmt(estado.profundidad)} km`;
  magnitud.value = String(estado.magnitud);
  profundidad.value = String(estado.profundidad);
};
let espera = null;
const recalcularSismo = () => {
  mostrarSismo();
  clearTimeout(espera);
  espera = setTimeout(() => aplicar({ sismo: true }), 60);
};
magnitud.addEventListener("input", () => {
  estado.magnitud = Number(magnitud.value);
  recalcularSismo();
});
profundidad.addEventListener("input", () => {
  estado.profundidad = Number(profundidad.value);
  recalcularSismo();
});
epicentro.addEventListener("change", () => {
  if (epicentro.value === "mapa") return;
  estado.epicentro = epicentro.value;
  estado.epi = { ...EPICENTROS[epicentro.value] };
  estado.magnitud = estado.epi.magnitud;
  estado.profundidad = estado.epi.profundidad;
  recalcularSismo();
});

const inicio = $("inicio");
for (const nombre of Object.keys(IGNICIONES)) inicio.append(new Option(nombre, nombre));
focos.forEach((f, k) => inicio.append(new Option(`Foco real NASA FIRMS · ${f.fecha} ${f.hora_utc.padStart(4, "0").replace(/(..)$/, ":$1")} UTC`, `firms-${k}`)));
inicio.append(Object.assign(new Option("Punto elegido en la maqueta", "mapa"), { disabled: true }));
inicio.addEventListener("change", () => {
  const f = inicio.value.startsWith("firms-") ? focos[Number(inicio.value.slice(6))] : null;
  estado.ignicion = f ? [f.x, f.y] : aLocal(E, IGNICIONES[inicio.value]);
  aplicar({ incendio: true });
});
$("viento").addEventListener("change", (ev) => {
  estado.viento = Number(ev.target.value);
  aplicar({ incendio: true });
});
$("margen").addEventListener("input", (ev) => {
  estado.margen = Number(ev.target.value);
  $("margen-valor").textContent = `${estado.margen} m`;
  clearTimeout(espera);
  espera = setTimeout(() => {
    calcularMargen();
    aplicar();
  }, 80);
});
$("focos-firms").textContent = focos.length
  ? `NASA FIRMS registró ${focos.length} foco(s) de calor en el área de la maqueta entre el ${FIRMS.consulta.slice(0, 10)} y los 5 días anteriores; están en la lista de inicio.`
  : `NASA FIRMS no registró focos de calor en el área de la maqueta en los 5 días anteriores al ${FIRMS.consulta.slice(0, 10)}.`;

// --- Clic en la maqueta: ficha del edificio o del pin; con "Elegir" activo, epicentro o inicio del incendio ----
let eligiendo = null;
document.querySelectorAll("[data-elegir]").forEach((b) =>
  b.addEventListener("click", () => {
    eligiendo = eligiendo === b.dataset.elegir ? null : b.dataset.elegir;
    document.querySelectorAll("[data-elegir]").forEach((o) => o.setAttribute("aria-pressed", String(o.dataset.elegir === eligiendo)));
  }),
);
const enlace = (href, texto) => Object.assign(document.createElement("a"), { href, target: "_blank", rel: "noreferrer", textContent: texto });
const aLonLat = (x, y) => [E.origen[0] + x / E.kx, E.origen[1] + y / E.ky];
function mostrarFicha(titulo, lineas, coords, extra = []) {
  const c = $("ficha-contenido");
  c.replaceChildren(Object.assign(document.createElement("h4"), { textContent: titulo }));
  for (const l of lineas) if (l) c.append(Object.assign(document.createElement("p"), { textContent: l }));
  c.append(...extra);
  if (coords) {
    const e = googleMapsLinks(coords);
    const acc = Object.assign(document.createElement("p"), { className: "acciones" });
    acc.append(enlace(e.streetView, "Street View"), enlace(e.map, "Google Maps"));
    c.append(acc);
  }
  $("ficha").hidden = false;
}
$("cerrar-ficha").addEventListener("click", () => ($("ficha").hidden = true));

function teselaDe(k) {
  let a = 0, b = B.teselas.length - 1;
  while (a < b) {
    const m = (a + b + 1) >> 1;
    if (B.teselas[m].primero <= k) a = m;
    else b = m - 1;
  }
  return B.teselas[a];
}
function huella(k) {
  const t = teselaDe(k), pts = [];
  let o = B.inicio[k];
  const n = B.dv.getUint8(o + 2);
  o += 3;
  let x = 0, y = 0;
  for (let q = 0; q < n; q++, o += 4) {
    x += B.dv.getInt16(o, true);
    y += B.dv.getInt16(o + 2, true);
    pts.push([t.ox + x * 0.2, t.oy + y * 0.2]);
  }
  return pts;
}
const areaPoligono = (pts) =>
  Math.abs(pts.reduce((s, [x0, y0], i) => s + x0 * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y0, 0)) / 2;
const direccionDe = (k) =>
  DIRS && DIRS.texto[k] !== 0xffffffff ? { texto: DIRDIC.textos[DIRS.texto[k]], barrio: DIRDIC.barrios[DIRS.barrio[k]] } : null;
function edificioCercano(x, y, radio = 40) {
  let mejor = -1, d2 = radio * radio;
  for (let k = 0; k < B.n; k++) {
    const d = (B.cx[k] - x) ** 2 + (B.cy[k] - y) ** 2;
    if (d < d2) [mejor, d2] = [k, d];
  }
  return mejor;
}
function fichaEdificio(k) {
  const dir = direccionDe(k), sinPisos = (B.banderas[k] & 8) !== 0;
  const lineas = [
    dir ? `Barrio ${dir.barrio} · dirección catastral más cercana al edificio.` : "Sin dirección de la nomenclatura a menos de 30 m.",
    `${sinPisos ? "Sin dato de pisos en el catastro (se dibuja de 1 piso)" : `${B.pisos[k]} piso(s) en el catastro`} · huella de ${fmt(Math.round(areaPoligono(huella(k))))} m².`,
  ];
  if (estado.escenario === "sismo" && resumenSismo) {
    const I = intensidadEn(estado.magnitud, Math.hypot(B.cx[k] - resumenSismo.ex, B.cy[k] - resumenSismo.ey) / 1000, estado.profundidad, (B.banderas[k] & 4) !== 0);
    lineas.push(`Sismo simulado de magnitud ${fmt1(estado.magnitud)}: intensidad ${romano(I)} y daño estimado «${GRADOS_EMS[B.grado[k]].toLowerCase()}» (grado ${B.grado[k]} de 5 en la escala EMS-98; clase de vulnerabilidad supuesta ${VQ[B.pisos[k]].clase}).`);
    if (B.banderas[k] & 4) lineas.push("Está en zona de licuación o corrimiento (suelo blando).");
  } else if (estado.escenario === "inundacion") {
    const n = B.banderas[k] & 3;
    lineas.push(n ? `Zona de amenaza ${NIVELES_AGUA[n]}: agua representativa de ${fmt1(PROFUNDIDAD_AGUA[n])} m.` : "Fuera de las zonas de amenaza por inundación.");
  } else {
    const f = B.fuego[k];
    lineas.push(f >= 0 ? `Queda dentro del margen de ${fmt(estado.margen)} m del área quemada desde el paso ${f} de ${PASOS}.` : "Fuera del margen del área quemada en este ejercicio.");
  }
  lineas.push("Estimación del modelo para preparar la respuesta: no es una evaluación de la edificación.");
  mostrarFicha(dir ? dir.texto : "Edificación del catastro", lineas, aLonLat(B.cx[k], B.cy[k]));
}
const traducirGrado = (g) =>
  (/destroy/i.test(g) ? "destruida" : /possibly/i.test(g) ? "posiblemente dañada" : /damaged/i.test(g) ? "dañada" : g.toLowerCase()) +
  (/modelo/i.test(g) ? " (modelo de IA)" : "");
function fichaDano(i) {
  const [x, y, grado, fuente] = E.danos_sismo[i];
  const k = edificioCercano(x, y), dir = k >= 0 ? direccionDe(k) : null;
  mostrarFicha(`Daño observado: ${traducirGrado(grado)}`, [
    `Fuente: ${fuente}. Sismo del 10 de agosto de 2026.`,
    dir ? `Edificación más cercana: ${dir.texto} (barrio ${dir.barrio}).` : "Sin dirección de la nomenclatura a menos de 30 m.",
    k >= 0 && !(B.banderas[k] & 8) ? `${B.pisos[k]} piso(s) según el catastro.` : "",
  ], aLonLat(x, y));
}
function edificioDeVertice(t, v) {
  const r = t.malla.userData.rangos;
  let a = 0, b = t.cuantos - 1;
  while (a < b) {
    const m = (a + b + 1) >> 1;
    if (r[m * 2] <= v) a = m;
    else b = m - 1;
  }
  return t.primero + a;
}
let abajo = null;
renderer.domElement.addEventListener("pointerdown", (ev) => (abajo = [ev.clientX, ev.clientY]));
renderer.domElement.addEventListener("pointerup", (ev) => {
  if (!terreno || !B || !abajo || Math.hypot(ev.clientX - abajo[0], ev.clientY - abajo[1]) > 5) return;
  const r = renderer.domElement.getBoundingClientRect();
  const rayo = new THREE.Raycaster();
  rayo.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camara);
  if (eligiendo) {
    const [toque] = rayo.intersectObject(terreno);
    if (!toque) return;
    const x = toque.point.x - ciudad.position.x, y = -(toque.point.z - ciudad.position.z);
    if (eligiendo === "ignicion") {
      estado.ignicion = [x, y];
      inicio.value = "mapa";
      aplicar({ incendio: true });
    } else {
      estado.epicentro = "mapa";
      estado.epi = { ...estado.epi, lon: aLonLat(x, y)[0], lat: aLonLat(x, y)[1] };
      epicentro.value = "mapa";
      recalcularSismo();
    }
    eligiendo = null;
    document.querySelectorAll("[data-elegir]").forEach((o) => o.setAttribute("aria-pressed", "false"));
    return;
  }
  if (danosReales.visible) {
    const [h] = rayo.intersectObject(danosReales);
    if (h) return fichaDano(h.instanceId);
  }
  const mallas = B.teselas.filter((t) => t.malla?.visible).map((t) => t.malla);
  const d = U.uDetalle.value;
  for (const h of rayo.intersectObjects(mallas, false)) {
    const k = edificioDeVertice(B.teselas.find((t) => t.malla === h.object), h.face.a);
    if (Math.hypot(B.cx[k] - d.x, -B.cy[k] - d.y) <= d.z) return fichaEdificio(k);
  }
});

// --- Albergues: puntos más adecuados por caso y comparación con los reales -----------------------------
const CASOS = [
  { corto: "Inundación", nombre: "Inundación (zonas de amenaza del POT)", escenario: "inundacion" },
  { corto: "Sismo real 7,4", nombre: "Sismo real del 10-ago-2026 (Mw 7,4; 103 km)", escenario: "sismo", epicentro: "real", magnitud: 7.4, profundidad: 103 },
  { corto: "Sismo Cali 6,5", nombre: "Sismo hipotético bajo Cali (Mw 6,5; 10 km)", escenario: "sismo", epicentro: "cali", magnitud: 6.5, profundidad: 10 },
  { corto: "Sismo Cali 7,0", nombre: "Sismo hipotético bajo Cali (Mw 7,0; 10 km)", escenario: "sismo", epicentro: "cali", magnitud: 7.0, profundidad: 10 },
  ...Object.entries(IGNICIONES).map(([n, c]) => ({
    corto: `Incendio ${n.replace(" (aprox.)", "")}`, nombre: `Incendio forestal desde ${n}, viento hacia el este`,
    escenario: "incendio", ignicion: aLocal(E, c), viento: 90,
  })),
];
const selCaso = $("caso");
CASOS.forEach((c, i) => selCaso.append(new Option(c.nombre, String(i))));
selCaso.value = "1";
let pestana = "simulacion", ultimoTop = [], albergueMontado = null;

function aplicarCaso(c) {
  anim = null;
  estado.escenario = c.escenario;
  estado.avance = 1;
  if (c.escenario === "sismo") {
    Object.assign(estado, { epicentro: c.epicentro, epi: { ...EPICENTROS[c.epicentro] }, magnitud: c.magnitud, profundidad: c.profundidad });
    epicentro.value = c.epicentro;
    mostrarSismo();
  }
  if (c.escenario === "incendio") {
    Object.assign(estado, { ignicion: c.ignicion, viento: c.viento });
    $("viento").value = String(c.viento);
  }
  ponerEscenario();
  aplicar({ sismo: c.escenario === "sismo", incendio: c.escenario === "incendio" });
}

function enAnillos(anillos, x, y) {
  return anillos.some((a) => {
    let dentro = false;
    for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
      const [xi, yi] = a[i], [xj, yj] = a[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  });
}
const nivelInundacionEn = (x, y) => Math.max(0, ...E.inundacion.filter((z) => z.nivel > 0 && enAnillos(z.anillos, x, y)).map((z) => z.nivel));
const licuacionEn = (x, y) => E.licuacion.some((z) => enAnillos(z.anillos, x, y));

function evaluarAlbergues() {
  const malla = mallaAfectados(), RADIO = 1500, r = Math.ceil(RADIO / CELDA);
  const quemadas = estado.escenario === "incendio" ? celdasQuemadas(E, quema, PASOS) : null;
  const dentro = quemadas && cercaDe(quemadas, estado.margen), cercano = quemadas && cercaDe(quemadas, estado.margen + 1000);
  const colapsos = new Map();
  if (estado.escenario === "sismo")
    for (let k = 0; k < B.n; k++)
      if (B.grado[k] >= 4) {
        const c = `${Math.floor(B.cx[k] / 50)},${Math.floor(B.cy[k] / 50)}`;
        colapsos.set(c, (colapsos.get(c) ?? 0) + 1);
      }
  const filas = ESPACIOS.flatMap((s) => {
    const p = s.properties, [x, y] = aLocal(E, p.coordinates);
    let seguridad = 1;
    if (quemadas) {
      if (dentro(x, y)) return [];
      seguridad = cercano(x, y) ? 0.5 : 1;
    } else if (eligibility(s, estado.escenario === "sismo" ? "earthquake" : "flood").excluded) return [];
    if (colapsos.size) {
      let n = 0;
      const ci = Math.floor(x / 50), cj = Math.floor(y / 50);
      for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) n += colapsos.get(`${ci + a},${cj + b}`) ?? 0;
      seguridad = 1 - Math.min(1, n / 5); // escombros: colapsos o daño muy grave a ~100 m
    }
    const ci = Math.floor(x / CELDA), cj = Math.floor(y / CELDA);
    let demanda = 0;
    for (let a = -r; a <= r; a++)
      for (let b = -r; b <= r; b++)
        if (((a + 0.5) * CELDA) ** 2 + ((b + 0.5) * CELDA) ** 2 <= RADIO ** 2) demanda += malla.get(`${ci + a},${cj + b}`) ?? 0;
    const [pendiente, distanciaSalud, salud] = EXTRA[p.id] ?? [null, null, ""];
    return [{ s, x, y, demanda, personas: capacidadPersonas(p.areaM2), pendiente, distanciaSalud, salud, seguridad }];
  });
  const referencia = percentil(filas.map((f) => f.demanda).filter((d) => d > 0), 0.9);
  for (const f of filas) Object.assign(f, idoneidad({ ...f, demandaReferencia: referencia }));
  return elegirSeparados(filas.filter((f) => f.demanda > 0).sort((a, b) => b.puntaje - a.puntaje || b.demanda - a.demanda || b.personas - a.personas), 1000, 10);
}

function evaluarReales() {
  const dentro = estado.escenario === "incendio" ? cercaDe(celdasQuemadas(E, quema, PASOS), estado.margen) : null;
  return REALES.map((r) => {
    if (!r.coordenadas) return { ...r, avisos: [], coincide: false };
    const [x, y] = aLocal(E, r.coordenadas), avisos = [];
    const nivel = nivelInundacionEn(x, y);
    if (nivel) avisos.push(`está en zona de amenaza ${NIVELES_AGUA[nivel]} por inundación`);
    if (licuacionEn(x, y)) avisos.push("está en zona de licuación o corrimiento");
    if (r.pendiente != null && r.pendiente > 8) avisos.push(`pendiente de ${fmt1(r.pendiente)} %: no apta para carpas`);
    if (dentro?.(x, y)) avisos.push("queda dentro del área quemada o su margen en este caso");
    return { ...r, x, y, avisos, coincide: ultimoTop.some((f) => Math.hypot(f.x - x, f.y - y) < 400) };
  });
}

const COLORES_CRITERIO = { demanda: "#205c51", capacidad: "#4f97cf", seguridad: "#e8913a", pendiente: "#9fbd88", salud: "#c43a1c" };
const NOMBRES_CRITERIO = { demanda: "demanda", capacidad: "capacidad", seguridad: "seguridad", pendiente: "pendiente", salud: "salud" };
function renderAlbergues() {
  ultimoTop = evaluarAlbergues();
  pines.clear();
  pines.visible = true;
  $("criterios").textContent = `Puntaje de 0 a 100: ${Object.entries(PESOS).map(([k, v]) => `${NOMBRES_CRITERIO[k]} ${Math.round(v * 100)} %`).join(" · ")}. Capacidad con ${M2_POR_PERSONA} m² por persona (normas Esfera, asentamientos tipo campamento; verificar). Pendiente del modelo de curvas de nivel: ideal hasta 2 %, no apta desde 8 %. Seguridad: ${{
    inundacion: "se descartan los espacios que cruzan zonas de inundación",
    sismo: "se descartan los de licuación o corrimiento y se castigan los que tienen colapsos estimados a unos 100 m (escombros)",
    incendio: "se descartan los que quedan dentro del área quemada o su margen y se castigan los que están a menos de 1 km de ella",
  }[estado.escenario]}. Demanda: edificaciones afectadas a menos de 1,5 km.`;
  $("leyenda-criterios").replaceChildren(...Object.entries(PESOS).map(([k, w]) =>
    el("span", {}, el("i", { style: `background:${COLORES_CRITERIO[k]}` }), `${NOMBRES_CRITERIO[k]} ${Math.round(w * 100)} %`)));
  $("cuenta-sugeridos").textContent = String(ultimoTop.length);
  const ol = $("albergues-sugeridos");
  ol.replaceChildren();
  ultimoTop.forEach((f, i) => {
    const base = tresD(f.x, f.y), p = f.s.properties, dot = dotacion(f.personas, 20, planningRules.peoplePerToilet, planningRules.litersPerPersonDay);
    const pin = new THREE.Mesh(geoPin, matPin);
    pin.position.copy(base).setY(base.y + 70);
    const rot = etiqueta(`${i + 1}`, `albergue · ${f.puntaje}/100`);
    rot.element.classList.add("sugerido");
    rot.element.addEventListener("click", () => volarA(base, new THREE.Vector3(260, 220, 320)));
    rot.position.copy(base).setY(base.y + 230);
    pines.add(pin, rot);
    const barra = el("span", { className: "barra", title: "Aporte de cada criterio al puntaje" },
      ...Object.entries(PESOS).map(([k, w]) => el("i", { style: `width:${f.criterios[k] * w * 100}%;background:${COLORES_CRITERIO[k]}`, title: `${NOMBRES_CRITERIO[k]}: ${Math.round(f.criterios[k] * 100)} de 100` })));
    const ver = el("button", { type: "button", textContent: "Ver" });
    ver.addEventListener("click", () => volarA(base, new THREE.Vector3(260, 220, 320)));
    const montar = el("button", { type: "button", textContent: "Montar", title: "Ver el albergue montado en la maqueta" });
    montar.addEventListener("click", () => montarAlbergue(f));
    const ra = el("button", { type: "button", textContent: "📱 RA", title: "Ver en realidad aumentada" });
    ra.addEventListener("click", () => verEnRA(f));
    const enl = googleMapsLinks(p.coordinates), foto = MLY.espacios[p.id];
    ol.append(el("li", {},
      el("span", { className: "puntaje", textContent: String(f.puntaje), title: "Puntaje de 0 a 100" }),
      el("span", { className: "nombre", textContent: p.name, title: p.name }),
      barra,
      el("span", { className: "dato", textContent: `≈ ${fmt(f.personas)} personas · ${fmt(dot.kits)} kits · ${fmt(dot.banos)} baños · ${fmt(dot.litrosDia)} L/día` }),
      el("span", { className: "dato", textContent: `Comuna ${p.commune ?? "?"} · ${fmt(p.areaM2)} m² · demanda ${fmt(f.demanda)} · pendiente ${f.pendiente == null ? "sin dato" : `${fmt1(f.pendiente)} %`} · salud a ${f.distanciaSalud == null ? "?" : fmt(f.distanciaSalud)} m` }),
      el("span", { className: "acciones" }, ver, montar, ra, enlace(enl.streetView, "Street View"),
        foto ? enlace(`https://www.mapillary.com/app/?pKey=${foto.id}`, `Foto ${foto.fecha.slice(0, 4)}`) : null)));
  });
  const reales = evaluarReales(), ul = $("albergues-reales");
  $("cuenta-reales").textContent = String(reales.length);
  ul.replaceChildren(...reales.map((r) => {
    const clase = /autogestionado/.test(r.tipo) ? "autogestionado" : /^centro de acopio/.test(r.tipo) ? "acopio" : "oficial";
    const acc = el("span", { className: "acciones" });
    if (r.coordenadas) {
      const ver = el("button", { type: "button", textContent: "Ver" });
      ver.addEventListener("click", () => volarA(tresD(r.x, r.y), new THREE.Vector3(260, 220, 320)));
      acc.append(ver);
    }
    r.fuentes.forEach((u, i) => acc.append(enlace(u, `Fuente ${i + 1}`)));
    return el("li", {},
      el("span", { className: "nombre", textContent: r.nombre, title: r.nombre }),
      el("span", { className: `tipo ${clase}`, textContent: r.tipo }),
      el("span", { className: "dato", textContent: r.detalle }),
      ...r.avisos.map((a) => el("span", { className: "alerta", textContent: `⚠ En este caso ${a}.` })),
      r.coordenadas ? el("span", { className: r.coincide ? "coincide" : "dato", textContent: r.coincide ? "✓ Coincide con un punto sugerido (a menos de 400 m)." : "No coincide con los puntos sugeridos para este caso." }) : null,
      el("span", { className: "dato", textContent: `Ubicación: ${r.ubicacion}.` }),
      acc);
  }));
}

async function analizarTodos() {
  const boton = $("analizar-todos"), caja = $("matriz-casos"), actual = Number(selCaso.value);
  boton.disabled = true;
  caja.replaceChildren(el("p", { className: "nota", textContent: "Analizando los casos…" }));
  const sitios = new Map();
  for (const c of CASOS) {
    await new Promise((ok) => setTimeout(ok, 0));
    aplicarCaso(c);
    evaluarAlbergues().forEach((f, i) => {
      const e = sitios.get(f.s.properties.id) ?? { f, casos: [] };
      e.casos.push(`${c.corto} · #${i + 1} · ${f.puntaje}`);
      sitios.set(f.s.properties.id, e);
    });
  }
  aplicarCaso(CASOS[actual]);
  renderAlbergues();
  const orden = [...sitios.values()].sort((a, b) => b.casos.length - a.casos.length).slice(0, 15);
  const lista = el("ul", { className: "lista" }, ...orden.map(({ f, casos }) => {
    const li = el("li", { style: "cursor:pointer", title: "Ver en la maqueta" },
      el("span", { className: "puntaje", textContent: `${casos.length}/${CASOS.length}` }),
      el("span", { className: "nombre", textContent: `${f.s.properties.name} · comuna ${f.s.properties.commune ?? "?"}` }),
      el("span", { className: "chips" }, ...casos.map((c) => el("span", { textContent: c }))));
    li.addEventListener("click", () => volarA(tresD(f.x, f.y), new THREE.Vector3(260, 220, 320)));
    return li;
  }));
  caja.replaceChildren(el("details", { className: "tarjeta", open: true },
    el("summary", {}, "Todos los casos: los que más se repiten", el("span", { className: "cuenta", textContent: String(CASOS.length) })),
    el("p", { textContent: `Espacios que quedan entre los 10 mejores de varios de los ${CASOS.length} casos: sirven para más de una amenaza y son los primeros candidatos para preparar con anticipación. Clic para verlos en la maqueta.` }),
    lista));
  caja.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
  boton.disabled = false;
}
$("analizar-todos").addEventListener("click", analizarTodos);
selCaso.addEventListener("change", () => {
  aplicarCaso(CASOS[Number(selCaso.value)]);
  renderAlbergues();
  irAZona();
});

const marcasReales = REALES.filter((r) => r.coordenadas).map((r) => {
  const [x, y] = aLocal(E, r.coordenadas);
  const et = etiqueta(r.nombre, r.tipo);
  et.element.classList.add("real");
  et.element.addEventListener("click", () =>
    mostrarFicha(r.nombre, [r.tipo, r.detalle, `Ubicación: ${r.ubicacion}.`, r.pendiente != null ? `Pendiente del terreno: ${fmt1(r.pendiente)} %.` : ""], r.coordenadas,
      [Object.assign(document.createElement("p"), { className: "acciones" })].map((p) => (r.fuentes.forEach((u, i) => p.append(enlace(u, `Fuente ${i + 1}`))), p))));
  et.position.copy(tresD(x, y, 140));
  et.visible = false;
  escena.add(et);
  return et;
});

function mostrarPestana(cual) {
  pestana = cual;
  for (const n of ["simulacion", "albergues"]) {
    $(`tab-${n}`).setAttribute("aria-selected", String(n === cual));
    $(`panel-${n}`).hidden = n !== cual;
  }
  $("controles-sim").hidden = cual !== "simulacion";
  $("controles-alb").hidden = cual !== "albergues";
  ponerLeyenda();
  document.querySelector(".cuadro").scrollTop = 0;
  marcasReales.forEach((m) => (m.visible = cual === "albergues"));
  if (albergueMontado && cual !== "albergues") {
    escena.remove(albergueMontado);
    albergueMontado = null;
  }
  if (cual === "albergues") {
    aplicarCaso(CASOS[Number(selCaso.value)]);
    renderAlbergues();
  } else {
    pines.visible = true;
    acopiosClave = "";
    actualizarVista();
  }
}
$("tab-simulacion").addEventListener("click", () => mostrarPestana("simulacion"));
$("tab-albergues").addEventListener("click", () => mostrarPestana("albergues"));

// Albergue armado con los kits del proyecto: cubierta de 10 × 7 m a 3 m con 5 particiones de 2 × 2 × 2 m
// (20 personas), baños de 1,2 × 1,2 × 2,3 m, tanques de 1 × 1 × 1,2 m, módulos de NNA y salud de 5 × 3,5 × 2,5 m
// y registro de 4 × 3 m (src/data/site.ts). Disposición ilustrativa.
const MAT_ALB = {
  lona: new THREE.MeshStandardMaterial({ color: "#f3f5f4", roughness: 0.7, side: THREE.DoubleSide }),
  poste: new THREE.MeshStandardMaterial({ color: "#8a8f94", metalness: 0.4, roughness: 0.5 }),
  particion: new THREE.MeshStandardMaterial({ color: "#cfd8dc" }),
  bano: new THREE.MeshStandardMaterial({ color: "#2f6fb3" }),
  tanque: new THREE.MeshStandardMaterial({ color: "#3a3f44" }),
  nna: new THREE.MeshStandardMaterial({ color: "#f2b46d" }),
  salud: new THREE.MeshStandardMaterial({ color: "#f4f4f4" }),
  registro: new THREE.MeshStandardMaterial({ color: "#2f7d5a" }),
};
const GEO_ALB = {
  techo: new THREE.BoxGeometry(10, 0.12, 7), poste: new THREE.CylinderGeometry(0.06, 0.06, 3, 8), particion: new THREE.BoxGeometry(1.9, 2, 1.9),
  bano: new THREE.BoxGeometry(1.2, 2.3, 1.2), tanque: new THREE.BoxGeometry(1, 1.2, 1), modulo: new THREE.BoxGeometry(5, 2.5, 3.5), registro: new THREE.BoxGeometry(4, 2.8, 3),
};
function modeloAlbergue(personas) {
  const { kits, banos } = dotacion(personas, 20, planningRules.peoplePerToilet, planningRules.litersPerPersonDay);
  const g = new THREE.Group(), nk = Math.max(1, Math.min(kits, 60)), cols = Math.max(1, Math.ceil(Math.sqrt(nk * 1.4)));
  const pieza = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
  };
  for (let i = 0; i < nk; i++) {
    const cx = (i % cols) * 13, cz = Math.floor(i / cols) * 10;
    pieza(GEO_ALB.techo, MAT_ALB.lona, cx, 3, cz);
    for (const [px, pz] of [[-4.9, -3.4], [4.9, -3.4], [-4.9, 3.4], [4.9, 3.4]]) pieza(GEO_ALB.poste, MAT_ALB.poste, cx + px, 1.5, cz + pz);
    for (let k = 0; k < 5; k++) pieza(GEO_ALB.particion, MAT_ALB.particion, cx - 4 + k * 2, 1, cz);
  }
  const fondo = Math.ceil(nk / cols) * 10 + 2;
  for (let i = 0; i < Math.min(banos, 60); i++) pieza(GEO_ALB.bano, MAT_ALB.bano, (i % 20) * 1.6, 1.15, fondo + Math.floor(i / 20) * 2);
  for (let i = 0; i < Math.max(1, Math.ceil(banos / 10)); i++) pieza(GEO_ALB.tanque, MAT_ALB.tanque, -3 - (i % 4) * 1.4, 0.6, fondo + Math.floor(i / 4) * 1.4);
  pieza(GEO_ALB.modulo, MAT_ALB.nna, -10, 1.25, 0);
  pieza(GEO_ALB.modulo, MAT_ALB.salud, -10, 1.25, 5);
  pieza(GEO_ALB.registro, MAT_ALB.registro, -10, 1.4, 10);
  const centro = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
  g.children.forEach((o) => o.position.sub(new THREE.Vector3(centro.x, 0, centro.z)));
  return g;
}
function montarAlbergue(f) {
  if (albergueMontado) escena.remove(albergueMontado);
  albergueMontado = modeloAlbergue(f.personas);
  albergueMontado.position.copy(tresD(f.x, f.y, 0.3));
  escena.add(albergueMontado);
  pines.visible = false; // el pin taparía el albergue; vuelven al cambiar de caso
  volarA(tresD(f.x, f.y), new THREE.Vector3(55, 45, 75));
}
let visorRA = null;
const cargarVisorRA = () =>
  (visorRA ??= new Promise((ok, mal) => {
    const s = Object.assign(document.createElement("script"), { type: "module", src: "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js" });
    s.onload = ok;
    s.onerror = () => {
      visorRA = null;
      mal(new Error("No se pudo cargar el visor de realidad aumentada: necesita conexión a internet."));
    };
    document.head.append(s);
  }));
async function verEnRA(f) {
  const personas = Math.min(f.personas, 100), dot = dotacion(personas, 20, planningRules.peoplePerToilet, planningRules.litersPerPersonDay);
  $("ra-titulo").textContent = `Albergue en ${f.s.properties.name}`;
  $("ra-visor").textContent = "Preparando el modelo…";
  $("ra-nota").textContent = "";
  $("dialogo-ra").showModal();
  try {
    const glb = await new GLTFExporter().parseAsync(modeloAlbergue(personas), { binary: true });
    await cargarVisorRA();
    const mv = document.createElement("model-viewer");
    mv.src = URL.createObjectURL(new Blob([glb], { type: "model/gltf-binary" }));
    mv.alt = "Módulo de albergue con los kits del proyecto";
    for (const [k, v] of [["ar", ""], ["ar-modes", "webxr quick-look"], ["ar-scale", "fixed"], ["camera-controls", ""], ["shadow-intensity", "1"], ["camera-orbit", "35deg 62deg auto"]])
      mv.setAttribute(k, v);
    $("ra-visor").replaceChildren(mv);
    $("ra-nota").textContent = `Módulo de muestra a escala real para ${fmt(personas)} personas: ${dot.kits} kits de 20 personas (cubierta de 10 × 7 m con 5 particiones), ${dot.banos} baños, tanques, módulos de NNA y salud y punto de registro. En un celular con realidad aumentada (Android con ARCore o iPhone), el botón de RA del visor lo pone sobre el piso con la cámara: ábrelo en el sitio para verlo en su lugar. El espacio completo daría para unas ${fmt(f.personas)} personas (${fmt(dotacion(f.personas).kits)} kits).`;
  } catch (e) {
    $("ra-visor").textContent = e.message;
  }
}
$("cerrar-ra").addEventListener("click", () => $("dialogo-ra").close());

// --- Carga -------------------------------------------------------------------------------------------
const draco = new DRACOLoader();
const wasm = bytes("datos-draco-wasm");
const envoltura = new TextDecoder().decode(bytes("datos-draco-js"));
// ponytail: DRACOLoader no tiene API pública para pasarle el decodificador en memoria; si cambia en una
// versión futura de three, servir draco_wasm_wrapper.js y draco_decoder.wasm con setDecoderPath.
draco._loadLibrary = (_url, tipo) => Promise.resolve(tipo === "arraybuffer" ? wasm.buffer.slice(0) : envoltura);
const cargarModelo = new Promise((ok, mal) => new GLTFLoader().setDRACOLoader(draco).parse(bytes("datos-glb").buffer, "", ok, mal));

Promise.all([cargarModelo, descomprimir("datos-edificios"), descomprimir("datos-mascaras"), descomprimir("datos-direcciones"), descomprimir("datos-direcciones-dic")])
  .then(([gltf, binEdificios, mascaras, binDirecciones, dicDirecciones]) => {
    DIRDIC = JSON.parse(new TextDecoder().decode(dicDirecciones));
    DIRS = { texto: new Uint32Array(binDirecciones.buffer, 0, IDX.total), barrio: new Uint16Array(binDirecciones.buffer, IDX.total * 4, IDX.total) };
    draco.dispose();
    const { ancho: am, alto: hm } = IDX.mascara, { ancho: ai, alto: hi } = IDX.inundacion;
    U.uMascara.value = textura(mascaras.subarray(0, am * hm), am, hm);
    U.uInund.value = textura(mascaras.subarray(am * hm, am * hm + ai * hi), ai, hi);
    U.uInund.value.generateMipmaps = false;
    U.uInund.value.minFilter = THREE.LinearFilter;
    const modelo = gltf.scene;
    manzanas = modelo.getObjectByName("Manzanas");
    terreno = modelo.getObjectByName("Terreno");
    // Manzanas: índice (en la UV) y centro de cada una por vértice.
    const g = manzanas.geometry, uv = g.getAttribute("uv");
    indiceManzana = Int32Array.from({ length: uv.count }, (_, v) => Math.round(uv.getX(v)));
    const centros = new Float32Array(uv.count * 2);
    indiceManzana.forEach((m, v) => centros.set([E.manzanas[m][0], -E.manzanas[m][1]], v * 2));
    g.setAttribute("aCentroM", new THREE.BufferAttribute(centros, 2));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(uv.count * 3), 3));
    manzanas.material = matManzanas;
    // Terreno: bosque oficial, ladera supuesta y valle según la celda de cada vértice.
    const p = terreno.geometry.getAttribute("position"), col = new Float32Array(p.count * 3);
    const tonos = { 0: new THREE.Color("#ddd8c8"), 1: new THREE.Color("#8fb17a"), 2: new THREE.Color("#c2cd9c") };
    for (let v = 0; v < p.count; v++) {
      const i = Math.min(ANCHO - 1, Math.max(0, Math.round((p.getX(v) - X0) / PASO)));
      const j = Math.min(ALTO - 1, Math.max(0, Math.round((-p.getZ(v) - Y0) / PASO)));
      tonos[E.vegetacion[j * ANCHO + i]].toArray(col, v * 3);
    }
    terreno.geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
    terreno.material = matTerreno;
    ciudad.add(modelo);
    B = leerEdificios(binEdificios);
    mostrarSismo();
    ponerEscenario();
    aplicar({ sismo: true, incendio: true });
    $("cargando").hidden = true;
  })
  .catch((error) => {
    $("cargando").textContent = `No se pudo cargar la maqueta: ${error?.message ?? error}. Prueba con Chrome, Edge o Firefox actualizados.`;
  });

renderer.setAnimationLoop((t) => {
  if (anim !== null) {
    estado.avance = Math.min(1, (performance.now() - anim) / 8000);
    if (estado.avance === 1) anim = null;
    actualizarVista();
  }
  if (vuelo) vuelo(performance.now());
  controles.update();
  actualizarDetalle();
  const s = estado.escenario === "sismo" && !reducido && estado.avance > 0 && estado.avance < 0.4 ? 14 * (1 - estado.avance / 0.4) : 0;
  ciudad.position.set(Math.sin(t * 0.038) * s, 0, Math.cos(t * 0.031) * s);
  if (humo.visible && humo.userData.bases.length) {
    const pos = humo.geometry.getAttribute("position");
    humo.userData.bases.forEach(({ p, fase, alto }, k) => {
      const sube = ((t * 0.00006 + fase) % 1) * alto;
      pos.setXYZ(k, p.x + sube * 0.35, p.y + sube, p.z - sube * 0.1);
    });
    pos.needsUpdate = true;
  }
  renderer.render(escena, camara);
  rotulador.render(escena, camara);
});
