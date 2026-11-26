import { useState } from "react";
import { emergencyCalculation, lifecycle, planningRules, site, storageLayout, type SceneState } from "./data/site";
import { formatNumber } from "./types";

const { venues, presentation } = site;

interface Props {
  state: SceneState;
  viewId: string;
  onView: (id: string) => void;
}

/** Panel de datos del sitio piloto: lista numerada de escenarios (enfoca la cámara) y cálculo de referencia.
 * Todas las cifras salen de `data/site.ts`; el cálculo es ilustrativo y no acredita aforo ni disponibilidad. */
export default function SitePanel({ state, viewId, onView }: Props) {
  const [abierto, setAbierto] = useState(true);
  const q = emergencyCalculation.value;
  const personas = site.scenario.people.value;
  const kit = site.equipment.kit.value;
  const campo = venues.hockey.field.value;
  const sala = presentation.genericHall.value;
  const diamante = venues.baseball.placeholderFootprint.value;
  const escenarios = [
    { n: 1, vista: "hockey", titulo: "Campo de hockey", dato: `${campo.length} × ${campo.width} m · referencia reglamentaria`, estado: "referencia" },
    { n: 2, vista: "volleyball", titulo: "Coliseo Francisco Chois", dato: `${sala.length} × ${sala.width} × ${sala.height} m ilustrativos`, estado: "POR MEDIR" },
    { n: 3, vista: "baseball", titulo: "Diamante de béisbol (acopio)", dato: `${diamante.length} × ${diamante.width} m ilustrativos · ${storageLayout.value.sectors.length} sectores`, estado: "POR MEDIR" },
  ];
  const descripcion = lifecycle.value.states.find((s) => s.id === state)?.description;
  if (!abierto)
    return (
      <button className="site-hud-abrir" onClick={() => setAbierto(true)} aria-label="Mostrar datos del sitio">
        Datos del sitio
      </button>
    );
  return (
    <aside className="site-hud" aria-label="Datos del sitio piloto">
      <header>
        <strong>Sitio piloto</strong>
        <span className="chip-ilustrativo">Ilustrativo</span>
        <button className="site-hud-cerrar" onClick={() => setAbierto(false)} aria-label="Ocultar datos del sitio">
          ×
        </button>
      </header>
      <small>Unidad Deportiva Jaime Aparicio · posiciones aproximadas</small>
      <ol className="site-hud-lista">
        {escenarios.map((e) => (
          <li key={e.n}>
            <button aria-label={`Enfocar ${e.n}: ${e.titulo}`} aria-pressed={viewId === e.vista} onClick={() => onView(e.vista)}>
              <span className="pin-num">{e.n}</span>
              <span>
                <b>{e.titulo}</b>
                <small>{e.dato}</small>
              </span>
              <em className={e.estado === "POR MEDIR" ? "pendiente" : ""}>{e.estado}</em>
            </button>
          </li>
        ))}
      </ol>
      {state === "emergency" ? (
        <section>
          <h4>Cálculo de referencia · {personas} personas</h4>
          <dl>
            <dt>Kits requeridos</dt>
            <dd>
              <b>{q.kitsRequired}</b> = ⌈{personas}/{kit.people}⌉ · {q.indoorKits} interiores + {q.outdoorKits} con cubierta
            </dd>
            <dt>Baños portátiles</dt>
            <dd>
              <b>{q.toiletsRequired}</b> = ⌈{personas}/{planningRules.peoplePerToilet}⌉ (1 por {planningRules.peoplePerToilet}, Esfera)
            </dd>
            <dt>Agua de uso no potable</dt>
            <dd>
              <b>{formatNumber(q.nonPotableLitersPerDay)} L/día</b> = {personas} × {planningRules.litersPerPersonDay} L
            </dd>
            <dt>Superficie de kits</dt>
            <dd>
              <b>{formatNumber(q.totalKitFootprintM2)} m²</b> = {q.kitsRequired} × {kit.footprintM2} m²
            </dd>
          </dl>
          <p className="muted">Supuestos ilustrativos: no es aforo autorizado ni diseño aprobado. La ocupación del registro es SIMULADA.</p>
        </section>
      ) : (
        <section>
          <h4>{lifecycle.value.states.find((s) => s.id === state)?.label}</h4>
          <p className="muted">{descripcion}</p>
        </section>
      )}
      <p className="muted">
        <b>POR MEDIR</b> = dato que todavía no se levantó en el sitio. El entorno (árboles, calles, texturas) es ambientación ilustrativa.
      </p>
    </aside>
  );
}
