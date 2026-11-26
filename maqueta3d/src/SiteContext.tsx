import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { site } from "./data/site";

const { presentation, venues } = site;

/** Entorno decorativo de la maqueta: suelo, calles, árboles y marcas de las canchas.
 * Todo lo que cuelga de un grupo llamado ENTORNO se omite del GLB exportado (ver exportScene.ts):
 * es ambientación ilustrativa, no un levantamiento del sitio. */
export const ENTORNO = "entorno-ilustrativo";

function mulberry32(semilla: number) {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lienzo(ancho: number, alto: number) {
  const c = document.createElement("canvas");
  c.width = ancho;
  c.height = alto;
  return { c, x: c.getContext("2d")! };
}

function textura(c: HTMLCanvasElement, repetir?: [number, number]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repetir) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repetir[0], repetir[1]);
  }
  return t;
}

function useTextura(crear: () => THREE.CanvasTexture, deps: unknown[]) {
  const t = useMemo(crear, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => t.dispose(), [t]);
  return t;
}

function pasto(largo: number, ancho: number) {
  const { c, x } = lienzo(512, 512);
  x.fillStyle = "#a7c196";
  x.fillRect(0, 0, 512, 512);
  const azar = mulberry32(11);
  const tonos = ["#9bb88a", "#b3cc9f", "#a0bd90", "#bcd2a8", "#94b284"];
  for (let i = 0; i < 6000; i++) {
    x.fillStyle = tonos[(azar() * tonos.length) | 0];
    const s = 1 + azar() * 3;
    x.fillRect(azar() * 512, azar() * 512, s, s * 1.7);
  }
  return textura(c, [largo / 40, ancho / 40]);
}

function asfalto(repeticiones: number) {
  const { c, x } = lienzo(256, 64);
  x.fillStyle = "#6c7279";
  x.fillRect(0, 0, 256, 64);
  const azar = mulberry32(5);
  for (let i = 0; i < 500; i++) {
    x.fillStyle = azar() > 0.5 ? "#757b82" : "#62686e";
    x.fillRect(azar() * 256, azar() * 64, 2, 2);
  }
  x.fillStyle = "#f1ead0";
  x.fillRect(20, 29, 96, 6); // línea central discontinua
  x.fillStyle = "#d9d6c8";
  x.fillRect(0, 2, 256, 3);
  x.fillRect(0, 59, 256, 3);
  return textura(c, [repeticiones, 1]);
}

/** Marcas de un campo de hockey (referencia reglamentaria FIH, ver `sources.hockey`): línea central,
 * líneas de 22,9 m, círculos de tiro de 14,63 m y puntos de penal. Las líneas se dibujan algo más
 * gruesas que las reales (75 mm) para que se vean desde la vista general. */
function marcasHockey(largo: number, ancho: number) {
  const px = 20;
  const { c, x } = lienzo(Math.round(largo * px), Math.round(ancho * px));
  x.fillStyle = "#3f8a74";
  x.fillRect(0, 0, c.width, c.height);
  const azar = mulberry32(3);
  for (let i = 0; i < 2500; i++) {
    x.fillStyle = azar() > 0.5 ? "#449179" : "#3a806b";
    x.fillRect(azar() * c.width, azar() * c.height, 3, 3);
  }
  x.save();
  x.translate(c.width / 2, c.height / 2);
  x.scale(px, -px); // metros, y hacia arriba
  x.strokeStyle = "#f6f4e8";
  x.fillStyle = "#f6f4e8";
  x.lineWidth = 0.18;
  x.strokeRect(-largo / 2 + 0.09, -ancho / 2 + 0.09, largo - 0.18, ancho - 0.18);
  x.beginPath();
  x.moveTo(0, -ancho / 2);
  x.lineTo(0, ancho / 2);
  for (const s of [-1, 1]) {
    const lx = s * (largo / 2 - 22.9);
    x.moveTo(lx, -ancho / 2);
    x.lineTo(lx, ancho / 2);
  }
  x.stroke();
  for (const s of [-1, 1]) {
    x.save();
    if (s < 0) x.scale(-1, 1);
    const g = largo / 2, r = 14.63, p = 1.83; // línea de meta, radio del círculo y semiancho de la portería
    x.beginPath();
    x.arc(g, p, r, Math.PI / 2, Math.PI);
    x.moveTo(g - r, p);
    x.lineTo(g - r, -p);
    x.arc(g, -p, r, Math.PI, (3 * Math.PI) / 2);
    x.stroke();
    x.beginPath();
    x.arc(g - 6.4, 0, 0.25, 0, Math.PI * 2);
    x.fill();
    x.restore();
  }
  x.restore();
  return textura(c);
}

/** Diamante de béisbol dentro de la huella provisional (sus medidas están POR MEDIR). */
function marcasDiamante(largo: number, ancho: number) {
  const px = 7;
  const { c, x } = lienzo(Math.round(largo * px), Math.round(ancho * px));
  x.fillStyle = "#9fbd8f";
  x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = "#bfa97f";
  x.lineWidth = Math.min(c.width, c.height) * 0.05;
  x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, c.width - x.lineWidth, c.height - x.lineWidth);
  const lado = Math.min(c.width, c.height) * 0.4;
  x.save();
  x.translate(c.width / 2, c.height * 0.58);
  x.rotate(Math.PI / 4);
  x.fillStyle = "#c9b48c";
  x.fillRect(-lado / 2, -lado / 2, lado, lado);
  x.fillStyle = "#a9c597";
  x.fillRect(-lado * 0.36, -lado * 0.36, lado * 0.72, lado * 0.72);
  x.fillStyle = "#f4f1e4";
  for (const [bx, by] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) x.fillRect(bx * lado / 2 - 5, by * lado / 2 - 5, 10, 10);
  x.restore();
  x.fillStyle = "#c9b48c";
  x.beginPath();
  x.arc(c.width / 2, c.height * 0.58, lado * 0.1, 0, Math.PI * 2);
  x.fill();
  return textura(c);
}

/** Decal sobre el campo de hockey, a la altura de su superficie. */
export function CampoHockey() {
  const f = venues.hockey.field.value;
  const t = useTextura(() => marcasHockey(f.length, f.width), [f.length, f.width]);
  return (
    <mesh name={ENTORNO} rotation={[-Math.PI / 2, 0, 0]} position={[0, presentation.surfaceThickness * 1.5 + 0.045, 0]} receiveShadow>
      <planeGeometry args={[f.length, f.width]} />
      <meshStandardMaterial map={t} roughness={0.95} />
    </mesh>
  );
}

export function DiamanteBeisbol() {
  const b = venues.baseball.placeholderFootprint.value;
  const t = useTextura(() => marcasDiamante(b.length, b.width), [b.length, b.width]);
  return (
    <mesh name={ENTORNO} rotation={[-Math.PI / 2, 0, 0]} position={[0, presentation.surfaceThickness + 0.04, 0]} receiveShadow>
      <planeGeometry args={[b.length, b.width]} />
      <meshStandardMaterial map={t} roughness={1} />
    </mesh>
  );
}

function Arboles({ excluir, limites }: { excluir: [number, number, number, number]; limites: [number, number, number, number] }) {
  const copa = useRef<THREE.InstancedMesh>(null);
  const tronco = useRef<THREE.InstancedMesh>(null);
  const arboles = useMemo(() => {
    const azar = mulberry32(21);
    const [x0, x1, z0, z1] = limites, [ex0, ex1, ez0, ez1] = excluir;
    const lista: { x: number; z: number; r: number; h: number; tono: number }[] = [];
    for (let i = 0; i < 900 && lista.length < 170; i++) {
      const x = x0 + azar() * (x1 - x0), z = z0 + azar() * (z1 - z0);
      if (x > ex0 && x < ex1 && z > ez0 && z < ez1) continue;
      if (lista.some((a) => (a.x - x) ** 2 + (a.z - z) ** 2 < 49)) continue;
      lista.push({ x, z, r: 2.4 + azar() * 2.2, h: 2.6 + azar() * 1.8, tono: azar() });
    }
    return lista;
  }, [excluir, limites]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), color = new THREE.Color();
    arboles.forEach((a, k) => {
      tronco.current!.setMatrixAt(k, m.compose(new THREE.Vector3(a.x, a.h / 2, a.z), q, new THREE.Vector3(1, a.h, 1)));
      copa.current!.setMatrixAt(k, m.compose(new THREE.Vector3(a.x, a.h + a.r * 0.55, a.z), q, new THREE.Vector3(a.r, a.r * 0.9, a.r)));
      copa.current!.setColorAt(k, color.setHSL(0.27 + a.tono * 0.05, 0.38, 0.36 + a.tono * 0.1));
    });
    tronco.current!.instanceMatrix.needsUpdate = true;
    copa.current!.instanceMatrix.needsUpdate = true;
    if (copa.current!.instanceColor) copa.current!.instanceColor.needsUpdate = true;
  }, [arboles]);
  return (
    <>
      <instancedMesh ref={tronco} args={[undefined, undefined, arboles.length]}>
        <cylinderGeometry args={[0.28, 0.4, 1, 6]} />
        <meshStandardMaterial color="#6d5a45" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={copa} args={[undefined, undefined, arboles.length]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>
    </>
  );
}

/** Suelo con textura, calles y arbolado alrededor del complejo. Ambientación ilustrativa. */
export function EntornoSitio() {
  const g = presentation.ground.value;
  const [cx, cy, cz] = g.center;
  const suelo = useTextura(() => pasto(g.length, g.width), [g.length, g.width]);
  const viaS = useTextura(() => asfalto(g.length / 26), [g.length]);
  const viaO = useTextura(() => asfalto(g.width / 26), [g.width]);
  const x0 = cx - g.length / 2, x1 = cx + g.length / 2, z0 = cz - g.width / 2, z1 = cz + g.width / 2;
  const anchoVia = 9;
  const viaSur = z1 - 7, viaOeste = x0 + 7;
  const limites = useMemo<[number, number, number, number]>(() => [x0 + 14, x1 - 6, z0 + 6, z1 - 15], [x0, x1, z0, z1]);
  const excluir = useMemo<[number, number, number, number]>(() => [-75, 235, -140, 78], []); // zona de los tres escenarios y su ruta
  return (
    <group name={ENTORNO}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, cy + 0.07, cz]} receiveShadow>
        <planeGeometry args={[g.length, g.width]} />
        <meshStandardMaterial map={suelo} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, cy + 0.1, viaSur]} receiveShadow>
        <planeGeometry args={[g.length, anchoVia]} />
        <meshStandardMaterial map={viaS} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[viaOeste, cy + 0.11, cz]} receiveShadow>
        <planeGeometry args={[g.width, anchoVia]} />
        <meshStandardMaterial map={viaO} roughness={0.9} />
      </mesh>
      <Arboles excluir={excluir} limites={limites} />
    </group>
  );
}
