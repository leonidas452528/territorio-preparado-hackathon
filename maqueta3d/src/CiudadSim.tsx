import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as THREE from "three";
import Label from "./SceneLabel";
import { googleMapsLinks } from "./googleMaps";
import { eligibility } from "./planning";
import { formatNumber, type Space, type Territory } from "./types";
import { asignarUv, texturaTerreno } from "./terrenoTextura";
import CiudadPanel, { type CapasSismo } from "./CiudadPanel";
import { EPICENTROS, escenarioSismo, type EpicentroId } from "./sismoCiudad";
import { claseDano, resumenDanos, resumenIncendio, resumenPorNivel, tipoFuente } from "./ciudadStats";
import {
  afectacion, altura, aLocal, celdasQuemadas, cercaDe, demandaCercana, elegirSeparados, propagarIncendio,
  type Escenario, type Escenarios,
} from "./ciudadSim";

const BASE = import.meta.env.BASE_URL;
const GLB = `${BASE}ciudad/cali.glb`;
const PASOS_INCENDIO = 60;
const AREA_MINIMA = 1000; // m²: supuesto del ejercicio para acopio, no norma
const IGNICIONES = {
  "Cristo Rey (aprox.)": [-76.5652, 3.4357],
  "Cerro de las Tres Cruces (aprox.)": [-76.5485, 3.4655],
  "Pichindé (aprox.)": [-76.6155, 3.4405],
} as const;
const textos: Record<Escenario, { titulo: string; fuente: string }> = {
  inundacion: {
    titulo: "Inundación",
    fuente: "Amenaza fluvial y pluvial del POT 2014 y expediente municipal (DAPM / IDESC). La animación revela alta → media → baja; no es un modelo hidráulico.",
  },
  sismo: {
    titulo: "Sismo",
    fuente: "Elige magnitud, profundidad y epicentro: se estima la intensidad (Allen, Wald y Worden 2012) y el daño esperado por manzana según los pisos (Lagomarsino y Giovinazzi 2006). Los puntos son los daños reales del 10-ago-2026 (Copernicus, ICube-SERTIT, Microsoft/Airbus, MEN). Es un escenario para preparar, no un pronóstico.",
  },
  incendio: {
    titulo: "Incendio forestal (ejercicio)",
    fuente: "Propagación ilustrativa sobre la cobertura boscosa del POT y, como supuesto, las laderas no urbanas sobre 1.050 m (pastos y rastrojo). Pendiente + viento + azar con semilla. No hay capa oficial de amenaza por incendio: no es un pronóstico.",
  },
};
// Colores de la manzana según afectación: [sin afectación, 1, 2, 3]
const paleta: Record<Escenario, string[]> = {
  inundacion: ["#efece5", "#9cc9e8", "#4f97cf", "#1f5f9e"],
  sismo: ["#efece5", "#f2c48d", "#e8913a", "#c4561c"],
  incendio: ["#efece5", "#f5b7a0", "#e8684a", "#c0281c"],
};
const tresD = (e: Escenarios, x: number, y: number, sobre = 0) =>
  [x, altura(e.relieve, x, y) + sobre, -y] as [number, number, number];

function Ciudad({ e, niveles, escenario, onSuelo }: {
  e: Escenarios; niveles: number[]; escenario: Escenario; onSuelo: (x: number, y: number) => void;
}) {
  const { scene } = useGLTF(GLB, `${BASE}draco/`);
  const manzanas = scene.getObjectByName("Manzanas") as THREE.Mesh;
  useLayoutEffect(() => {
    const g = manzanas.geometry;
    if (!g.getAttribute("color")) g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.getAttribute("position").count * 3), 3));
    manzanas.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
  }, [manzanas]);
  useLayoutEffect(() => {
    const terreno = scene.getObjectByName("Terreno") as THREE.Mesh;
    if (!terreno.geometry.getAttribute("uv")) asignarUv(terreno.geometry, e);
    const mapa = texturaTerreno(e);
    terreno.material = new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.95 });
    return () => mapa.dispose();
  }, [scene, e]);
  useEffect(() => {
    const g = manzanas.geometry, uv = g.getAttribute("uv"), color = g.getAttribute("color");
    const cs = paleta[escenario].map((c) => new THREE.Color(c));
    for (let v = 0; v < uv.count; v++) {
      const c = cs[niveles[Math.round(uv.getX(v))] ?? 0];
      color.setXYZ(v, c.r, c.g, c.b);
    }
    color.needsUpdate = true;
  }, [manzanas, niveles, escenario]);
  const clic = (ev: ThreeEvent<MouseEvent>) => {
    if (ev.object.name !== "Terreno") return;
    ev.stopPropagation();
    onSuelo(ev.point.x, -ev.point.z);
  };
  return <primitive object={scene} onClick={clic} />;
}

/** Polígonos oficiales como láminas translúcidas a la altura del terreno. */
function Laminas({ e, anillos, color, opacidad }: {
  e: Escenarios; anillos: [number, number][][]; color: string; opacidad: number;
}) {
  const geo = useMemo(() => {
    const partes = anillos.filter((a) => a.length > 3).map((a) => {
      const g = new THREE.ShapeGeometry(new THREE.Shape(a.map(([x, y]) => new THREE.Vector2(x, y))));
      g.rotateX(-Math.PI / 2); // (x, y) → (x, 0, -y)
      g.translate(0, altura(e.relieve, a[0][0], a[0][1]) + 4, 0);
      return g;
    });
    return partes.length ? mergeGeometries(partes) : null;
  }, [e, anillos]);
  if (!geo) return null;
  return (
    <mesh geometry={geo} renderOrder={2}>
      <meshStandardMaterial color={color} transparent opacity={opacidad} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Puntos({ puntos, tamano, color }: { puntos: [number, number, number][]; tamano: [number, number, number]; color: (k: number) => string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), c = new THREE.Color();
    puntos.forEach((p, k) => {
      ref.current!.setMatrixAt(k, m.makeTranslation(p[0], p[1] + tamano[1] / 2, p[2]));
      ref.current!.setColorAt(k, c.set(color(k)));
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  }, [puntos, tamano, color]);
  if (!puntos.length) return null;
  return (
    <instancedMesh key={puntos.length} ref={ref} args={[undefined, undefined, puntos.length]}>
      <boxGeometry args={tamano} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}

type Vista = { id: number; pos: [number, number, number]; target: [number, number, number] };

/** Mueve la cámara y el punto de mira hacia una vista, con suavizado; se detiene si la persona toma el control. */
function Vuelo({ vista, reducido }: { vista: Vista | null; reducido: boolean }) {
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3; update: () => void;
    addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void;
  } | null;
  const camera = useThree((s) => s.camera);
  const activo = useRef(false);
  const meta = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });
  useEffect(() => {
    if (!vista || !controls) return;
    meta.current.pos.set(...vista.pos);
    meta.current.target.set(...vista.target);
    if (reducido) {
      camera.position.copy(meta.current.pos);
      controls.target.copy(meta.current.target);
      controls.update();
    } else activo.current = true;
  }, [vista, controls, camera, reducido]);
  useEffect(() => {
    if (!controls) return;
    const parar = () => (activo.current = false);
    controls.addEventListener("start", parar);
    return () => controls.removeEventListener("start", parar);
  }, [controls]);
  useFrame((_, dt) => {
    if (!activo.current || !controls) return;
    const k = 1 - Math.pow(0.0015, dt);
    camera.position.lerp(meta.current.pos, k);
    controls.target.lerp(meta.current.target, k);
    controls.update();
    if (camera.position.distanceTo(meta.current.pos) < 8) activo.current = false;
  });
  return null;
}

/** Marcador de acopio: aguja con esfera y número; el seleccionado muestra el radio de 1,5 km de la demanda. */
function Pin({ x, y, z, n, seleccionado, onClick }: {
  x: number; y: number; z: number; n: number; seleccionado: boolean; onClick: () => void;
}) {
  const escala = seleccionado ? 1.35 : 1;
  return (
    <group position={[x, y, z]}>
      <group scale={escala} onClick={(ev) => { ev.stopPropagation(); onClick(); }}>
        <mesh position={[0, 90, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[34, 180, 16]} />
          <meshStandardMaterial color={seleccionado ? "#0d5c34" : "#1f8a4c"} />
        </mesh>
        <mesh position={[0, 215, 0]}>
          <sphereGeometry args={[62, 24, 16]} />
          <meshStandardMaterial color={seleccionado ? "#0d5c34" : "#1f8a4c"} emissive={seleccionado ? "#1f8a4c" : "#000"} emissiveIntensity={0.5} />
        </mesh>
      </group>
      <Label position={[0, 330 * escala, 0]} title={`${n}`} subtitle="" pin />
      {seleccionado && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 8, 0]} renderOrder={3}>
          <ringGeometry args={[1470, 1500, 72]} />
          <meshBasicMaterial color="#1f8a4c" transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function Vibracion({ activo, children }: { activo: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const a = activo * 18;
    ref.current!.position.set(Math.sin(clock.elapsedTime * 38) * a, 0, Math.cos(clock.elapsedTime * 31) * a);
  });
  return <group ref={ref}>{children}</group>;
}

export default function CiudadSim({ data, onPreparar }: { data: Territory; onPreparar: (s: Space) => void }) {
  const [e, setE] = useState<Escenarios | null>(null);
  const [error, setError] = useState("");
  const [escenario, setEscenario] = useState<Escenario>("inundacion");
  const [avance, setAvance] = useState(1);
  const [ignicion, setIgnicion] = useState<readonly [number, number] | null>(null);
  const [viento, setViento] = useState(90);
  const [buffer, setBuffer] = useState(300);
  const [vista, setVista] = useState<Vista | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [capas, setCapas] = useState<CapasSismo>({ observado: true, modelo: true, reportado: true });
  // Escenario sísmico elegible: magnitud, profundidad y epicentro (por defecto, el sismo real del 10-ago-2026).
  const [mag, setMag] = useState<number>(EPICENTROS.real.magnitud);
  const [prof, setProf] = useState<number>(EPICENTROS.real.profundidad);
  const [epiId, setEpiId] = useState<EpicentroId>("real");
  const [epiMapa, setEpiMapa] = useState<readonly [number, number] | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const reducido = useMemo(() => matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  useEffect(() => {
    fetch(`${BASE}ciudad/escenarios.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("No se pudo cargar la maqueta de ciudad"))))
      .then((d: Escenarios) => {
        setE(d);
        setIgnicion(aLocal(d, IGNICIONES["Cristo Rey (aprox.)"]));
      })
      .catch((err) => setError(String(err.message ?? err)));
  }, []);
  const simular = () => {
    if (reducido) return setAvance(1);
    const t0 = performance.now();
    const paso = () => {
      const a = Math.min(1, (performance.now() - t0) / 8000);
      setAvance(a);
      if (a < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };
  const quema = useMemo(
    () => (e && ignicion ? propagarIncendio(e, ignicion, { pasos: PASOS_INCENDIO, vientoHaciaGrados: viento }) : null),
    [e, ignicion, viento],
  );
  const quemadas = useMemo(
    () => (e && quema && escenario === "incendio" ? celdasQuemadas(e, quema, Math.round(avance * PASOS_INCENDIO)) : []),
    [e, quema, escenario, avance],
  );
  const epicentro = useMemo<readonly [number, number]>(() => {
    if (!e) return [0, 0];
    if (epiId === "mapa" && epiMapa) return epiMapa;
    const p = EPICENTROS[epiId === "cali" ? "cali" : "real"];
    return aLocal(e, [p.lon, p.lat]);
  }, [e, epiId, epiMapa]);
  const sismo = useMemo(
    () => (e && escenario === "sismo" ? escenarioSismo(e, { magnitud: mag, profundidad: prof, epicentro }) : null),
    [e, escenario, mag, prof, epicentro],
  );
  const niveles = useMemo(() => {
    if (!e) return [];
    if (escenario === "sismo" && sismo) return avance > 0.4 ? sismo.niveles : sismo.niveles.map(() => 0);
    return afectacion(e, escenario, avance, quemadas, buffer);
  }, [e, escenario, sismo, avance, quemadas, buffer]);
  const acopios = useMemo(() => {
    if (!e || avance < 1) return [];
    const cerca = cercaDe(quemadas, buffer);
    const candidatos = data.spaces.features.flatMap((s) => {
      if ((s.properties.areaM2 ?? 0) < AREA_MINIMA) return [];
      const [x, y] = aLocal(e, s.properties.coordinates);
      if (escenario === "incendio")
        return cerca(x, y) ? [] : [{ s, x, y, motivo: "Ejercicio: fuera del área quemada y del margen supuesto. No es recomendación operativa; la decide Bomberos / el CMGRD." }];
      const r = eligibility(s, escenario === "sismo" ? "earthquake" : "flood");
      return r.excluded ? [] : [{ s, x, y, motivo: r.reason }];
    });
    const demanda = demandaCercana(e, niveles, candidatos.map((c) => [c.x, c.y] as const));
    return elegirSeparados(
      candidatos
        .map((c, k) => ({ ...c, demanda: demanda[k] }))
        .filter((c) => c.demanda > 0)
        .sort((a, b) => b.demanda - a.demanda || (b.s.properties.areaM2 ?? 0) - (a.s.properties.areaM2 ?? 0)),
    );
  }, [e, avance, quemadas, buffer, data, escenario, niveles]);
  // Daños del sismo separados por origen del dato: observado (satélite), modelo de IA y reportado (MEN).
  const capasSismo = useMemo(() => {
    if (!e) return [];
    const por = (tipo: "observado" | "modelo" | "reportado") => e.danos_sismo.filter((d) => tipoFuente(d[3]) === tipo);
    const col = { destruida: "#7a1010", danada: "#c43a1c", posible: "#e0a030" } as const;
    const obs = por("observado"), mod = por("modelo"), rep = por("reportado");
    return [
      { tipo: "modelo" as const, tam: [26, 34, 26] as [number, number, number], pts: mod.map(([x, y]) => tresD(e, x, y)), color: () => "#e8913a" },
      { tipo: "reportado" as const, tam: [38, 70, 38] as [number, number, number], pts: rep.map(([x, y]) => tresD(e, x, y)), color: () => "#3a6fb5" },
      { tipo: "observado" as const, tam: [60, 130, 60] as [number, number, number], pts: obs.map(([x, y]) => tresD(e, x, y)), color: (k: number) => col[claseDano(obs[k][2])] },
    ];
  }, [e]);
  const afectadas = niveles.filter((n) => n > 0).length;
  const construcciones = e ? niveles.reduce((s, n, k) => (n ? s + e.manzanas[k][3] : s), 0) : 0;
  const hasta = avance < 1 / 3 ? 3 : avance < 2 / 3 ? 2 : 1;
  const filas = useMemo(() => (e ? resumenPorNivel(e, escenario, niveles) : []), [e, escenario, niveles]);
  const danos = useMemo(() => (e ? resumenDanos(e) : { total: 0, porClase: { destruida: 0, danada: 0, posible: 0 }, porFuente: {}, porTipo: { observado: 0, modelo: 0, reportado: 0 } }), [e]);
  const resIncendio = useMemo(
    () => (e ? resumenIncendio(quemadas, e.relieve.paso, Math.round(avance * PASOS_INCENDIO)) : { celdas: 0, hectareas: 0, activas: 0 }),
    [e, quemadas, avance],
  );
  const volar = (lonlat: readonly [number, number], dist = 3800, alto = 2600) => {
    if (!e) return;
    const [x, y] = aLocal(e, lonlat);
    const target = tresD(e, x, y);
    setVista({ id: Date.now(), target, pos: [target[0], target[1] + alto, target[2] + dist] });
  };
  const vistaGeneral = () => setVista({ id: Date.now(), pos: [1500, 6500, 9000], target: [0, 1000, 0] });
  const elegirAcopio = (a: { s: Space; x: number; y: number }) => {
    setSel(a.s.properties.id);
    if (e) {
      const target = tresD(e, a.x, a.y);
      setVista({ id: Date.now(), target, pos: [target[0], target[1] + 1700, target[2] + 2300] });
    }
  };
  const cambiar = (n: Escenario) => {
    setEscenario(n);
    setEligiendo(false);
    setAvance(1);
  };
  if (error) return <p role="alert" className="notice">{error}</p>;
  if (!e) return <p role="status" className="notice">Cargando la maqueta de Cali…</p>;
  return (
    <section className="scene-section ciudad">
      <div className="scene-intro">
        <div>
          <h2>Simulación de ciudad: {textos[escenario].titulo}</h2>
          <p>{textos[escenario].fuente}</p>
        </div>
        <p className="ciudad-resumen">
          <strong>{formatNumber(afectadas)}</strong> manzanas · <strong>{formatNumber(construcciones)}</strong> construcciones en la zona del escenario
          <small>Ilustrativo: no es una predicción ni un modelo hidráulico o estructural.</small>
        </p>
      </div>
      <div className="scene-toolbar">
        {(Object.keys(textos) as Escenario[]).map((n) => (
          <button key={n} className={escenario === n ? "active" : ""} onClick={() => cambiar(n)}>
            {textos[n].titulo}
          </button>
        ))}
        <button onClick={simular}>▶ Simular</button>
        <label>
          Avance <input type="range" min={0} max={1} step={0.01} value={avance} onChange={(ev) => setAvance(+ev.target.value)} />
        </label>
        <span className="toolbar-sep" aria-hidden="true" />
        <span className="toolbar-lbl">Vista</span>
        <button onClick={vistaGeneral}>General</button>
        <button onClick={() => volar([-76.532, 3.4516], 3200, 2200)}>Centro</button>
        <button onClick={() => volar([-76.495, 3.435], 4200, 2800)}>Oriente y Jarillón (aprox.)</button>
        <button onClick={() => volar([-76.5652, 3.4357], 3600, 2600)}>Ladera oeste (aprox.)</button>
      </div>
      {escenario === "sismo" && (
        <div className="scene-toolbar controles-sismo">
          <label>
            Magnitud (Mw) <b>{mag.toFixed(1).replace(".", ",")}</b>{" "}
            <input type="range" min={4} max={8.5} step={0.1} value={mag} aria-label="Magnitud del sismo" onChange={(ev) => setMag(+ev.target.value)} />
          </label>
          <label>
            Profundidad <b>{prof} km</b>{" "}
            <input type="range" min={5} max={150} step={1} value={prof} aria-label="Profundidad del sismo" onChange={(ev) => setProf(+ev.target.value)} />
          </label>
          <label>
            Epicentro{" "}
            <select
              value={epiId}
              aria-label="Epicentro del sismo"
              onChange={(ev) => {
                const v = ev.target.value as EpicentroId;
                setEpiId(v);
                if (v !== "mapa") {
                  setMag(EPICENTROS[v].magnitud);
                  setProf(EPICENTROS[v].profundidad);
                }
              }}
            >
              <option value="real">{EPICENTROS.real.nombre}</option>
              <option value="cali">{EPICENTROS.cali.nombre}</option>
              {epiMapa && <option value="mapa">Punto elegido en el mapa</option>}
            </select>
          </label>
          <button className={eligiendo ? "active" : ""} onClick={() => setEligiendo((v) => !v)}>
            📍 {eligiendo ? "Haz clic en el terreno…" : "Elegir epicentro en el mapa"}
          </button>
          <button
            onClick={() => {
              setEpiId("real");
              setMag(EPICENTROS.real.magnitud);
              setProf(EPICENTROS.real.profundidad);
            }}
          >
            Repetir el sismo del 10-ago
          </button>
        </div>
      )}
      {escenario === "incendio" && (
        <div className="scene-toolbar">
          <label>
            Inicio{" "}
            <select onChange={(ev) => setIgnicion(aLocal(e, IGNICIONES[ev.target.value as keyof typeof IGNICIONES]))}>
              {Object.keys(IGNICIONES).map((k) => <option key={k}>{k}</option>)}
            </select>
          </label>
          <span>o haz clic en la montaña</span>
          <label>
            Viento hacia{" "}
            <select value={viento} onChange={(ev) => setViento(+ev.target.value)}>
              <option value={0}>norte</option>
              <option value={90}>este (ladera abajo, hacia la ciudad)</option>
              <option value={180}>sur</option>
              <option value={270}>oeste (ladera arriba)</option>
            </select>
          </label>
          <label>
            Margen supuesto {buffer} m{" "}
            <input type="range" min={100} max={1000} step={50} value={buffer} onChange={(ev) => setBuffer(+ev.target.value)} />
          </label>
        </div>
      )}
      <div className="scene-canvas ciudad-canvas">
        <CiudadPanel
          escenario={escenario}
          avance={avance}
          filas={filas}
          colores={paleta[escenario]}
          danos={danos}
          capas={capas}
          onCapa={(t) => setCapas((c) => ({ ...c, [t]: !c[t] }))}
          incendio={resIncendio}
          margen={buffer}
          sismo={sismo}
          magnitud={mag}
          profundidad={prof}
          esSismoReal={epiId === "real" && mag === EPICENTROS.real.magnitud && prof === EPICENTROS.real.profundidad}
        />
        <Canvas camera={{ position: [1500, 6500, 9000], fov: 40, near: 10, far: 90000 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}>
          <color attach="background" args={["#dfeaf3"]} />
          <fog attach="fog" args={["#dfeaf3", 18000, 45000]} />
          <hemisphereLight args={["#f4f9ff", "#b8ad92", 1.4]} />
          <directionalLight position={[-6000, 9000, 4000]} intensity={2.3} />
          <Vuelo vista={vista} reducido={reducido} />
          <OrbitControls makeDefault target={[0, 1000, 0]} maxPolarAngle={Math.PI / 2.15} minDistance={300} maxDistance={40000} />
          <Suspense fallback={null}>
            <Vibracion activo={escenario === "sismo" && avance < 0.4 && avance > 0 ? 1 - avance / 0.4 : 0}>
              <Ciudad e={e} niveles={niveles} escenario={escenario} onSuelo={(x, y) => {
                if (escenario === "incendio") setIgnicion([x, y]);
                else if (escenario === "sismo" && eligiendo) {
                  setEpiMapa([x, y]);
                  setEpiId("mapa");
                  setEligiendo(false);
                }
              }} />
            </Vibracion>
          </Suspense>
          {escenario === "sismo" && Math.abs(epicentro[0]) < 20000 && Math.abs(epicentro[1]) < 20000 && (
            <group position={tresD(e, epicentro[0], epicentro[1])}>
              <mesh position={[0, 220, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[80, 440, 16]} />
                <meshStandardMaterial color="#c4161c" emissive="#7a0b10" />
              </mesh>
              <Label position={[0, 560, 0]} title="Epicentro" subtitle="ilustrativo" compact />
            </group>
          )}
          {escenario === "inundacion" &&
            [3, 2, 1].filter((n) => n >= hasta).map((n) => (
              <Laminas key={n} e={e} anillos={e.inundacion.filter((z) => z.nivel === n).flatMap((z) => z.anillos)} color={paleta.inundacion[n]} opacidad={0.45} />
            ))}
          {escenario === "sismo" && avance > 0.4 && (
            <>
              <Laminas e={e} anillos={e.licuacion.flatMap((z) => z.anillos)} color="#e8913a" opacidad={0.3} />
              {capasSismo.map(({ tipo, tam, pts, color }) =>
                capas[tipo] ? <Puntos key={tipo} puntos={pts} tamano={tam} color={color} /> : null,
              )}
            </>
          )}
          {escenario === "incendio" && (
            <Puntos
              puntos={quemadas.map(([x, y]) => tresD(e, x, y))}
              tamano={[e.relieve.paso, 6, e.relieve.paso]}
              color={(k) => (Math.round(avance * PASOS_INCENDIO) - quemadas[k][2] < 6 ? "#ff7a1a" : "#3b3430")}
            />
          )}
          {escenario === "incendio" && ignicion && <Label position={tresD(e, ignicion[0], ignicion[1], 120)} title="Inicio" subtitle="ejercicio" />}
          {acopios.map((a, k) => {
            const [px, py, pz] = tresD(e, a.x, a.y);
            return <Pin key={a.s.properties.id} x={px} y={py} z={pz} n={k + 1} seleccionado={sel === a.s.properties.id} onClick={() => elegirAcopio(a)} />;
          })}
        </Canvas>
      </div>
      <div className="ciudad-acopios">
        <h3>Sitios sugeridos para acopio {avance < 1 && "(termina la simulación)"}</h3>
        <p className="muted">
          Espacios públicos de al menos {formatNumber(AREA_MINIMA)} m² (supuesto) que quedan por fuera del escenario, ordenados por construcciones afectadas a menos de 1,5 km y separados al menos 1 km entre sí. Es una preselección para revisar en sitio: no confirma disponibilidad, estado estructural ni autorización.
        </p>
        <ol>
          {acopios.map((a) => {
            const links = googleMapsLinks(a.s.properties.coordinates);
            return (
              <li key={a.s.properties.id} className={sel === a.s.properties.id ? "sel" : ""}>
                <strong>{a.s.properties.name}</strong> · comuna {a.s.properties.commune ?? "sin asignar"} · {formatNumber(a.s.properties.areaM2 ?? 0)} m² · {formatNumber(a.demanda)} construcciones afectadas cerca
                <small>{a.motivo}</small>
                <span className="notice-actions">
                  <button onClick={() => elegirAcopio(a)}>Ver en el 3D</button>
                  <a href={links.streetView} target="_blank" rel="noreferrer">Ver en Street View</a>
                  <button onClick={() => onPreparar(a.s)}>Preparar intervención</button>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="scene-notes">
        <p>Volumetría por manzana con el promedio de pisos del catastro (713.863 construcciones; las que no tienen dato cuentan como 1 piso). No es la forma real de cada edificio.</p>
        <p>Relieve: Terrain Tiles (AWS Open Data, SRTM ~30 m). Catastro, ríos y cobertura: Alcaldía de Cali · IDESC. Detalle de fuentes en docs/MAQUETA_CIUDAD_3D.md.</p>
        <p>La herramienta recomienda, no decide: la activación de un acopio la registra una persona autorizada (Ley 1523 de 2012).</p>
      </div>
    </section>
  );
}
