import { formatNumber } from "./types";
import { proporcion, type FilaNivel, type ResumenDanos, type TipoFuente } from "./ciudadStats";
import type { Escenario } from "./ciudadSim";
import type { ResumenSismo } from "./sismoCiudad";

const ROMANO = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const gradoTexto = ["G0 Sin daño", "G1 Leve", "G2 Moderado", "G3 Sustancial", "G4 Muy grave", "G5 Colapso"];

export type CapasSismo = Record<TipoFuente, boolean>;

const claseDano = {
  destruida: { texto: "Destruida", color: "#7a1010" },
  danada: { texto: "Dañada", color: "#c43a1c" },
  posible: { texto: "Posible daño o sin definir", color: "#e0a030" },
};
const tipoTexto: Record<TipoFuente, { texto: string; nota: string; color: string }> = {
  observado: { texto: "Observado en imagen satelital", nota: "Copernicus EMSR916 · ICube-SERTIT", color: "#c43a1c" },
  modelo: { texto: "Estimado por modelo de IA", nota: "Microsoft/Airbus: no es una observación", color: "#e8913a" },
  reportado: { texto: "Sedes educativas reportadas", nota: "MEN: reportan afectación sin definir impacto", color: "#3a6fb5" },
};

interface Props {
  escenario: Escenario;
  avance: number;
  filas: FilaNivel[];
  colores: string[]; // paleta del escenario, por nivel
  danos: ResumenDanos;
  capas: CapasSismo;
  onCapa: (t: TipoFuente) => void;
  incendio: { celdas: number; hectareas: number; activas: number };
  margen: number;
  sismo: ResumenSismo | null;
  magnitud: number;
  profundidad: number;
  esSismoReal: boolean;
}

/** Panel de datos superpuesto al 3D: cifras, leyenda y procedencia. Todo es ilustrativo y está marcado como tal. */
export default function CiudadPanel({ escenario, avance, filas, colores, danos, capas, onCapa, incendio, margen, sismo, magnitud, profundidad, esSismoReal }: Props) {
  const maxConstr = Math.max(1, ...filas.map((f) => f.construcciones));
  const sismoActivo = escenario === "sismo" && avance > 0.4;
  return (
    <aside className="ciudad-hud" aria-label="Datos de la simulación">
      <header>
        <strong>Datos del escenario</strong>
        <span className="chip-ilustrativo">Ilustrativo</span>
      </header>

      {escenario !== "incendio" && (
        <section>
          <h4>{escenario === "inundacion" ? "Manzanas por nivel de amenaza (POT)" : "Manzanas por daño esperado"}</h4>
          {filas.length === 0 && <p className="muted">Sin manzanas afectadas todavía.</p>}
          {filas.map((f) => (
            <div className="hud-fila" key={f.nivel}>
              <span className="swatch" style={{ background: colores[f.nivel] }} />
              <div>
                <div className="hud-fila-t">
                  <span>{f.etiqueta}</span>
                  <b>{formatNumber(f.manzanas)}</b>
                </div>
                <div className="hud-barra">
                  <i style={{ width: `${100 * proporcion(f.construcciones, maxConstr)}%`, background: colores[f.nivel] }} />
                </div>
                <small>{formatNumber(f.construcciones)} construcciones</small>
              </div>
            </div>
          ))}
        </section>
      )}

      {escenario === "sismo" && sismo && (
        <section>
          <h4>Escenario: Mw {magnitud.toFixed(1).replace(".", ",")} a {profundidad} km</h4>
          <p className="muted">
            Intensidad esperada en el centro de Cali:{" "}
            <b>{ROMANO[Math.max(1, Math.min(12, Math.round(sismo.intensidadCentro)))]}</b> (MMI) · a {formatNumber(Math.round(sismo.distanciaCentroKm))} km del epicentro.
          </p>
          <p className="hud-sub">Construcciones esperadas por grado de daño (EMS-98)</p>
          {sismo.grados.map((n, g) => (
            <div className="hud-mini" key={g}>
              {gradoTexto[g]} <b>{formatNumber(n)}</b>
              <div className="hud-barra"><i style={{ width: `${100 * proporcion(n, sismo.total)}%`, background: ["#9bbf6a", "#d8c24a", "#e8913a", "#c43a1c", "#8a1c1c", "#4a0d0d"][g] }} /></div>
            </div>
          ))}
          <p>Daño importante o mayor (G3–G5): <b>{formatNumber(sismo.importantes)}</b> de {formatNumber(sismo.total)}</p>
          {esSismoReal && (
            <p className="muted">Referencia: la Alcaldía reportó más de 12.000 edificaciones afectadas con otros criterios; no es una validación de este modelo.</p>
          )}
          <p className="muted">Estimación estadística por manzana y pisos; escenario para preparar, no pronóstico ni evaluación de edificios (NSR-10).</p>
        </section>
      )}

      {escenario === "sismo" && (
        <section>
          <h4>Daños por origen del dato</h4>
          {!sismoActivo && <p className="muted">Avanza la simulación para ver los daños.</p>}
          {(Object.keys(tipoTexto) as TipoFuente[]).map((t) => (
            <label className="hud-capa" key={t}>
              <input type="checkbox" checked={capas[t]} onChange={() => onCapa(t)} />
              <span className="swatch" style={{ background: tipoTexto[t].color }} />
              <span>
                {tipoTexto[t].texto} <b>{formatNumber(danos.porTipo[t])}</b>
                <small>{tipoTexto[t].nota}</small>
              </span>
            </label>
          ))}
          <p className="hud-sub">Clasificación de los daños</p>
          {(Object.keys(claseDano) as (keyof typeof claseDano)[]).map((c) => (
            <div className="hud-mini" key={c}>
              <span className="swatch" style={{ background: claseDano[c].color }} />
              {claseDano[c].texto} <b>{formatNumber(danos.porClase[c])}</b>
            </div>
          ))}
          <p className="muted">La vibración de la escena es ilustrativa; la licuación es el cruce con la capa del IDESC.</p>
        </section>
      )}

      {escenario === "incendio" && (
        <section>
          <h4>Propagación (ejercicio)</h4>
          <div className="hud-kpis">
            <div><b>{formatNumber(Math.round(incendio.hectareas))}</b><small>hectáreas quemadas</small></div>
            <div><b>{formatNumber(incendio.activas)}</b><small>celdas con frente activo</small></div>
          </div>
          {filas.map((f) => (
            <div className="hud-mini" key={f.nivel}>
              <span className="swatch" style={{ background: colores[f.nivel] }} />
              Manzanas a menos de {margen} m del fuego <b>{formatNumber(f.manzanas)}</b>
              <small>{formatNumber(f.construcciones)} construcciones</small>
            </div>
          ))}
          <div className="hud-leyenda">
            <span><i style={{ background: "#ff7a1a" }} />Frente activo</span>
            <span><i style={{ background: "#3b3430" }} />Quemado</span>
          </div>
          <p className="muted">No es un pronóstico: pendiente + viento + azar con semilla. La decisión es de Bomberos y el CMGRD.</p>
        </section>
      )}

      <section className="hud-leyenda">
        <span><i className="pin" />Sitio sugerido de acopio</span>
      </section>
    </aside>
  );
}
