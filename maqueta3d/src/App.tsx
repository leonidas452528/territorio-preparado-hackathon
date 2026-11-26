import { brand } from "./brand";
import Home from "./Home";
import Aliados from "./Aliados";
import Reportar from "./Reportar";
import Recibidos from "./Recibidos";
import GuiaDatos from "./GuiaDatos";
import SinDatosCiudad from "./SinDatosCiudad";
import Ficha from "./Ficha";
import { AREAS, hrefDe, leerRuta } from "./navegacion";
import { cargarCiudades, type Ciudad } from "./ciudades";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import TerritoryMap from "./TerritoryMap";
import GoogleMapsLinks from "./GoogleMapsLinks";
import Kit from "./Kit";
import {
  formatNumber as fmt,
  type Space,
  type Territory,
  type Threat,
} from "./types";
const Intervention = lazy(() => import("./Intervention"));
const Prevention = lazy(() => import("./Prevention"));
const SiteScene = lazy(() => import("./SiteScene"));
const Operacion = lazy(() => import("./Operacion"));
const CiudadSim = lazy(() => import("./CiudadSim"));
import { supabase } from "./supabase";
import { loadTerritoryFromApi } from "./territoryApi";
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function App() {
  const [data, setData] = useState<Territory | null>(null),
    [error, setError] = useState(""),
    [origen, setOrigen] = useState<"base" | "estatico" | "respaldo">("estatico");
  const [hash, setHash] = useState(location.hash),
    [ciudades, setCiudades] = useState<Ciudad[]>([]),
    [ciudadId, setCiudadId] = useState("cali-co"),
    [commune, setCommune] = useState(""),
    [neighborhood, setNeighborhood] = useState("");
  const [source, setSource] = useState(""),
    [query, setQuery] = useState(""),
    [threat, setThreat] = useState<Threat>("flood");
  const [crossing, setCrossing] = useState(""),
    [selected, setSelected] = useState<Space | null>(null),
    [page, setPage] = useState(0);
  const [showHazards, setShowHazards] = useState(true),
    [showNeighborhoods, setShowNeighborhoods] = useState(false),
    [showStreets, setShowStreets] = useState(true);
  const ruta = leerRuta(hash);
  const area = ruta.area ?? "entidad";
  const tab = ruta.pagina === "trabajo" ? AREAS[area].secciones.find((s) => s.id === ruta.seccion)!.tab : ruta.pagina;
  const setTab = (t: string) => {
    const dest = [area, "entidad" as const]
      .map((a) => [a, AREAS[a].secciones.find((s) => s.tab === t)] as const)
      .find(([, s]) => s);
    if (dest) location.hash = hrefDe(dest[0], dest[1]!.id);
  };
  useEffect(() => {
    const alCambiar = () => setHash(location.hash);
    addEventListener("hashchange", alCambiar);
    return () => removeEventListener("hashchange", alCambiar);
  }, []);
  useEffect(() => {
    const c = new AbortController();
    cargarCiudades(import.meta.env.BASE_URL, c.signal).then(setCiudades).catch(() => undefined);
    return () => c.abort();
  }, []);
  const ciudad = ciudades.find((c) => c.ciudad_id === ciudadId) ?? ciudades[0];
  const conDatos = ciudad?.nivel_detalle === "maqueta";
  useEffect(() => {
    const controller = new AbortController();
    const estatico = async (key: string) => {
      const r = await fetch(`${import.meta.env.BASE_URL}data/${key}.json`, {
        signal: controller.signal,
      });
      if (!r.ok) throw new Error(`No se pudo cargar ${key}`);
      return r.json();
    };
    (async () => {
      const manifest = await estatico("manifest");
      // Con base de datos configurada, los datos salen de `api`; si no responde, se usan los JSON (respaldo público).
      if (supabase) {
        try {
          const territorio = await loadTerritoryFromApi(supabase as never, manifest);
          if (!controller.signal.aborted) {
            setData(territorio);
            setOrigen("base");
          }
          return;
        } catch (e) {
          console.warn("Base de datos no disponible; se usan los archivos estáticos.", e);
          setOrigen("respaldo");
        }
      }
      const entries = await Promise.all(
        ["spaces", "communes", "neighborhoods", "flood", "seismic"].map(
          async (key) => [key, await estatico(key)],
        ),
      );
      if (!controller.signal.aborted)
        setData({
          ...Object.fromEntries(entries),
          manifest,
        } as unknown as Territory);
    })().catch((e) => {
      if (e.name !== "AbortError")
        setError(
          "No se pudieron cargar los datos. Comprueba la conexión con la aplicación y vuelve a cargar.",
        );
    });
    return () => controller.abort();
  }, []);
  const records = data?.spaces.features ?? [];
  const neighborhoods = useMemo(
    () =>
      [
        ...new Set(
          records
            .filter(
              (f) =>
                !commune ||
                (commune === "unassigned"
                  ? !f.properties.commune
                  : f.properties.commune === commune),
            )
            .map((f) => f.properties.neighborhood)
            .filter((v): v is string => !!v),
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [data, commune],
  );
  const filtered = useMemo(
    () =>
      records.filter(
        ({ properties: p }) =>
          (!commune ||
            (commune === "unassigned" ? !p.commune : p.commune === commune)) &&
          (!neighborhood || p.neighborhood === neighborhood) &&
          (!source || p.sourceKey === source) &&
          (!query ||
            normalize(`${p.name} ${p.neighborhood ?? ""} ${p.id}`).includes(
              normalize(query),
            )) &&
          (!crossing ||
            (crossing === "yes"
              ? p[threat].length > 0
              : p[threat].length === 0)),
      ),
    [data, commune, neighborhood, source, query, crossing, threat],
  );
  const scope = [commune, neighborhood, source, query, crossing, threat].join(
    "|",
  );
  useEffect(() => {
    setPage(0);
    setSelected(null);
  }, [scope]);
  const choose = (space: Space) => setSelected(space);
  const reset = () => {
    setCommune("");
    setNeighborhood("");
    setSource("");
    setQuery("");
    setCrossing("");
  };
  const planningScope = useMemo(
    () =>
      records.filter(
        ({ properties: p }) =>
          (!commune ||
            (commune === "unassigned" ? !p.commune : p.commune === commune)) &&
          (!neighborhood || p.neighborhood === neighborhood),
      ),
    [data, commune, neighborhood],
  );
  const p = selected?.properties;
  const pages = Math.ceil(filtered.length / 12);
  const plano = ruta.pagina === "trabajo" && area === "entidad";
  useEffect(() => {
    document.documentElement.dataset.tema = plano ? "plano" : "marca";
  }, [plano]);
  const secciones = AREAS[area].secciones.filter((s) => s.tab !== "operacion" || supabase);
  const iSec = secciones.findIndex((s) => s.id === ruta.seccion);
  const selectores = ciudad && (
    <>
      <label className="sel-idioma">
        <span className="solo-lectores">Idioma</span>
        <select aria-label="Idioma" defaultValue="es" title="Solo hay español por ahora">
          <option value="es">Español</option>
          <option value="en" disabled>English (pendiente)</option>
          <option value="pt" disabled>Português (pendiente)</option>
          <option value="fr" disabled>Français (pendiente)</option>
        </select>
      </label>
      <label className="sel-ciudad">
        <span className="solo-lectores">Ciudad</span>
        <select value={ciudad.ciudad_id} onChange={(e) => setCiudadId(e.target.value)} aria-label="Ciudad">
          {ciudades.map((c) => <option key={c.ciudad_id} value={c.ciudad_id}>{c.nombre}, {c.pais}</option>)}
        </select>
      </label>
    </>
  );
  const enlacesAreas = (
    <>
      <a href="#/" aria-current={ruta.pagina === "home" ? "page" : undefined}>Inicio</a>
      <a href={hrefDe("entidad", "ciudad")} aria-current={ruta.area === "entidad" ? "page" : undefined}>Entidades</a>
      <a href={hrefDe("aporta", "reportar")} aria-current={ruta.area === "aporta" ? "page" : undefined}>Comunidad</a>
      <a href="#/aliados" aria-current={ruta.pagina === "aliados" ? "page" : undefined}>Aliados</a>
    </>
  );
  return (
    <div className="app" data-tema={plano ? "plano" : "marca"}>
      {!plano && (
        <header className="mk-top">
          <a className="mk-marca" href="#/">{brand.name}</a>
          <nav className="mk-areas" aria-label="Áreas">{enlacesAreas}</nav>
          <div className="mk-selectores">{selectores}</div>
        </header>
      )}
      <nav className="areas-movil" aria-label="Áreas (móvil)">{enlacesAreas}</nav>
      {!plano && ruta.pagina === "trabajo" && (
        <nav className="mk-sub" aria-label={`Secciones de ${AREAS[area].titulo}`}>
          {secciones.map((s) => <a key={s.id} href={hrefDe(area, s.id)} aria-current={ruta.seccion === s.id ? "page" : undefined}>{s.etiqueta}</a>)}
        </nav>
      )}
      <div className={plano ? "hoja" : "mk-cuerpo"}>
        {plano && (
          <aside className="hoja-lateral">
            <a className="hoja-marca" href="#/">{brand.name}</a>
            <div className="hoja-selectores">{selectores}</div>
            {[...new Set(secciones.map((s) => s.grupo))].map((g) => (
              <nav key={g} className="hoja-grupo" aria-label={g === "Conocer" ? `Secciones de ${AREAS[area].titulo}` : g}>
                <h2>{g}</h2>
                <ul>
                  {secciones.filter((s) => s.grupo === g).map((s) => (
                    <li key={s.id}><a href={hrefDe(area, s.id)} aria-current={ruta.seccion === s.id ? "page" : undefined}>{s.etiqueta}</a></li>
                  ))}
                </ul>
              </nav>
            ))}
            <a className="hoja-descarga" href={`${import.meta.env.BASE_URL}data/sectores.csv`} download>Descargar resumen por sector</a>
            <p className="hoja-salir"><a href="#/">Inicio</a> · <a href={hrefDe("aporta", "reportar")}>Comunidad</a> · <a href="#/aliados">Aliados</a></p>
          </aside>
        )}
      <main className={plano ? "hoja-main" : "mk-main"}>
        {ruta.pagina === "home" ? (
          ciudad ? <Home ciudades={ciudades} ciudadId={ciudad.ciudad_id} onCiudad={setCiudadId} /> : <p role="status" className="notice">Cargando…</p>
        ) : ruta.pagina === "aliados" ? (
          <Aliados />
        ) : tab === "guia" ? (
          <GuiaDatos />
        ) : !ciudad ? (
          <p role="status" className="notice">Cargando…</p>
        ) : tab === "ficha" ? (
          <Ficha ciudad={ciudad} ciudades={ciudades} onCiudad={setCiudadId} />
        ) : tab === "reportar" ? (
          <Reportar tipo="reportes" ciudad={ciudad} ciudades={ciudades} />
        ) : tab === "espacio" ? (
          <Reportar tipo="espacios_propuestos" ciudad={ciudad} ciudades={ciudades} />
        ) : tab === "recibidos" ? (
          <Recibidos ciudades={ciudades} />
        ) : tab === "kit" ? (
          <Kit />
        ) : !conDatos ? (
          <SinDatosCiudad ciudad={ciudad} />
        ) : error ? (
          <p role="alert" className="notice">
            {error}
          </p>
        ) : !data ? (
          <p role="status" className="notice">
            Cargando el inventario y las capas de Cali…
          </p>
        ) : tab === "ciudad" ? (
          <Suspense fallback={<p>Cargando la maqueta de Cali…</p>}>
            <CiudadSim
              data={data}
              onPreparar={(s) => {
                setSelected(s);
                setTab("plan");
              }}
            />
          </Suspense>
        ) : tab === "operacion" ? (
          <Suspense fallback={<p>Cargando operación…</p>}>
            <Operacion espacio={selected} onMap={() => setTab("map")} />
          </Suspense>
        ) : tab === "prevention" ? (
          <Suspense fallback={<p>Cargando orientación…</p>}>
            <Prevention onMap={() => setTab("map")} />
          </Suspense>
        ) : tab === "plan" ? (
          <Suspense fallback={<p>Cargando preparación…</p>}>
            <Intervention
              key={selected?.properties.id ?? "empty"}
              data={data}
              origin={selected}
              scope={planningScope}
              scopeLabel={[
                commune === "unassigned"
                  ? "Sin comuna asignada"
                  : commune
                    ? `Comuna ${commune}`
                    : "Todo Cali",
                neighborhood,
              ]
                .filter(Boolean)
                .join(" · ")}
              onMap={() => setTab("map")}
            />
          </Suspense>
        ) : tab === "scene" ? (
          <Suspense fallback={<p>Cargando maqueta…</p>}>
            <SiteScene />
          </Suspense>
        ) : (
          <>
            <section className="stats" aria-label="Resumen del filtro">
              <div>
                <strong>
                  {fmt(
                    filtered.filter(
                      (f) => f.properties.sourceKey === "publicSpaces",
                    ).length,
                  )}
                </strong>
                <span>Espacios públicos inventariados</span>
              </div>
              <div>
                <strong>
                  {fmt(
                    filtered.filter((f) => f.properties.sourceKey === "sports")
                      .length,
                  )}
                </strong>
                <span>Registros de escenarios deportivos</span>
              </div>
              <div>
                <strong>
                  {fmt(
                    filtered.filter((f) => f.properties[threat].length).length,
                  )}
                </strong>
                <span>Registros con cruce de amenaza</span>
              </div>
              <div className="unknown-stat">
                <strong>Por confirmar</strong>
                <span>Disponibilidad para una emergencia</span>
              </div>
            </section>
            <div className="workspace">
              <aside className="filters">
                <div className="section-title">
                  <h2>Explorar un sector</h2>
                  <button className="text-button" onClick={reset}>
                    Limpiar
                  </button>
                </div>
                <label>
                  Buscar espacio o barrio
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ej. Calimio, hockey, San Antonio"
                  />
                </label>
                <label>
                  Comuna
                  <select
                    aria-label="Comuna"
                    value={commune}
                    onChange={(e) => {
                      setCommune(e.target.value);
                      setNeighborhood("");
                    }}
                  >
                    <option value="">Todas las comunas</option>
                    <option value="unassigned">Sin comuna asignada</option>
                    {[...data.communes.features]
                      .sort((a, b) =>
                        a.properties!.code.localeCompare(b.properties!.code),
                      )
                      .map((f) => (
                        <option
                          key={f.properties!.code}
                          value={f.properties!.code}
                        >
                          {f.properties!.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Barrio / sector
                  <select
                    aria-label="Barrio / sector"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                  >
                    <option value="">Todos los barrios y sectores</option>
                    {neighborhoods.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Inventario
                  <select
                    aria-label="Inventario"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="">Ambas fuentes</option>
                    <option value="publicSpaces">
                      Espacio público (polígonos)
                    </option>
                    <option value="sports">
                      Escenarios deportivos (puntos)
                    </option>
                  </select>
                </label>
                <hr />
                <label>
                  Amenaza consultada
                  <select
                    aria-label="Amenaza consultada"
                    value={threat}
                    onChange={(e) => setThreat(e.target.value as Threat)}
                  >
                    <option value="flood">Inundación fluvial y pluvial</option>
                    <option value="seismic">
                      Licuación y corrimiento lateral
                    </option>
                  </select>
                </label>
                <label>
                  Cruce geográfico
                  <select
                    aria-label="Cruce geográfico"
                    value={crossing}
                    onChange={(e) => setCrossing(e.target.value)}
                  >
                    <option value="">Todos los registros</option>
                    <option value="yes">Con cruce detectado</option>
                    <option value="no">Sin cruce detectado</option>
                  </select>
                </label>
                <p className="filter-note">
                  “Sin cruce” no significa libre de riesgo. No se han evaluado
                  todas las amenazas.
                </p>
                <div className="layer-options">
                  <h3>Capas del mapa</h3>
                  <label>
                    <input
                      type="checkbox"
                      checked={showHazards}
                      onChange={(e) => setShowHazards(e.target.checked)}
                    />{" "}
                    Amenaza consultada
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={showNeighborhoods}
                      onChange={(e) => setShowNeighborhoods(e.target.checked)}
                    />{" "}
                    Límites de barrios
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={showStreets}
                      onChange={(e) => setShowStreets(e.target.checked)}
                    />{" "}
                    Calles (OpenStreetMap) · requiere internet
                  </label>
                </div>
                <p className="small-note">
                  Los sectores corresponden a comunas y barrios oficiales. Las
                  dos fuentes pueden compartir predios; sus registros no
                  equivalen a lugares únicos.
                </p>
              </aside>
              <section className="map-panel">
                <div className="map-heading">
                  <div>
                    <p className="eyebrow">SANTIAGO DE CALI</p>
                    <h2>
                      {neighborhood ||
                        (commune === "unassigned"
                          ? "Sin comuna asignada"
                          : commune
                            ? `Comuna ${commune}`
                            : "Una red por conocer")}
                    </h2>
                  </div>
                  <span>{fmt(filtered.length)} registros</span>
                </div>
                <div className="map-wrap">
                  <TerritoryMap
                    data={data}
                    spaces={filtered}
                    selected={selected}
                    select={choose}
                    threat={threat}
                    showHazards={showHazards}
                    showNeighborhoods={showNeighborhoods}
                    showStreets={showStreets}
                    scope={scope}
                  />
                  <span className="north">N ↑</span>
                  {!filtered.length && (
                    <div className="map-empty" role="status">
                      No hay registros para estos filtros.
                    </div>
                  )}
                </div>
                <div className="legend">
                  <span>
                    <i className="swatch teal" />
                    Espacio público sin cruce
                  </span>
                  <span>
                    <i className="swatch blue" />
                    Registro deportivo sin cruce
                  </span>
                  <span>
                    <i className="swatch rust" />
                    Registro con cruce
                  </span>
                  <span>
                    <i className="swatch sand" />
                    Amenaza cartografiada
                  </span>
                </div>
                <p className="map-source">
                  Fuente: Alcaldía de Cali · DAPM / IDESC y Secretaría del
                  Deporte. Derivado CC BY-SA 4.0. Los polígonos muestran huellas
                  inventariadas, no superficie libre.
                </p>
              </section>
            </div>
            <section className="results">
              <div className="inventory">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">REGISTROS DEL SECTOR</p>
                    <h2>Consulta cada espacio</h2>
                  </div>
                  <span>{fmt(filtered.length)} resultados</span>
                </div>
                <div className="record-list">
                  {filtered.slice(page * 12, page * 12 + 12).map((f) => (
                    <button
                      className={`record ${selected?.properties.id === f.properties.id ? "selected" : ""}`}
                      key={f.properties.id}
                      onClick={() => choose(f)}
                    >
                      <span
                        className={`record-icon ${f.properties[threat].length ? "exposed" : ""}`}
                      >
                        {f.properties.sourceKey === "publicSpaces" ? "▧" : "●"}
                      </span>
                      <span>
                        <strong>{f.properties.name}</strong>
                        <small>
                          Comuna {f.properties.commune ?? "sin asignar"} ·{" "}
                          {f.properties.neighborhood ?? "Barrio sin asignar"} ·{" "}
                          {f.properties.areaM2 === null
                            ? "Área sin dato"
                            : `${fmt(f.properties.areaM2)} m² de huella`}
                        </small>
                      </span>
                      <span className="record-arrow">↗</span>
                    </button>
                  ))}
                </div>
                {!filtered.length && (
                  <p>
                    No se encontraron espacios. Prueba con otro barrio o limpia
                    los filtros.
                  </p>
                )}
                <div className="pagination">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    ← Anterior
                  </button>
                  <span>
                    {pages ? `${page + 1} / ${pages}` : "Sin resultados"}
                  </span>
                  <button
                    disabled={page + 1 >= pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
              <aside
                id="space-detail"
                className="detail"
                aria-live="polite"
                tabIndex={-1}
              >
                {p ? (
                  <>
                    <p className="eyebrow">FICHA DEL ESPACIO · {p.id}</p>
                    <h2>{p.name}</h2>
                    <span className="badge">Disponibilidad por confirmar</span>
                    <GoogleMapsLinks coordinates={p.coordinates} />
                    <button
                      className="prepare-space"
                      onClick={() => {
                        setTab("plan");
                        window.scrollTo({ top: 0 });
                      }}
                    >
                      Preparar este espacio
                    </button>
                    <p className="small-note">
                      Punto de referencia del inventario:{" "}
                      {p.coordinates[1].toFixed(6)},{" "}
                      {p.coordinates[0].toFixed(6)}. No identifica una entrada
                      verificada. Street View depende de la cobertura; comprueba
                      la fecha de las imágenes.
                    </p>
                    <dl>
                      <dt>Fuente</dt>
                      <dd>
                        {p.sourceKey === "publicSpaces"
                          ? "EPOU · espacio público"
                          : "Catálogo deportivo · acceso por verificar"}
                      </dd>
                      <dt>Huella inventariada</dt>
                      <dd>
                        {p.areaM2 === null
                          ? "Sin dato"
                          : `${fmt(p.areaM2)} m² · no equivale a capacidad`}
                      </dd>
                      <dt>Condición en el catálogo</dt>
                      <dd>
                        {p.condition ?? "Sin dato"} · no es evaluación vigente
                      </dd>
                      <dt>Aforo / baños / suministro de agua</dt>
                      <dd>Sin datos confirmados</dd>
                      <dt>Evaluación estructural y fecha</dt>
                      <dd>Sin evidencia registrada</dd>
                      <dt>Método de cruce</dt>
                      <dd>{p.assessmentMethod}</dd>
                    </dl>
                    <h3>
                      {threat === "flood"
                        ? "Cruces con inundación"
                        : "Cruces con susceptibilidad sísmica"}
                    </h3>
                    {p[threat].length ? (
                      <ul>
                        {p[threat].map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        Sin intersección detectada en las capas consultadas.
                        Requiere verificación de riesgo.
                      </p>
                    )}
                    {p.sourceCommune && p.sourceCommune !== p.commune && (
                      <p className="notice">
                        El catálogo original asigna comuna {p.sourceCommune}; el
                        cruce con los límites archivados asigna{" "}
                        {p.commune ?? "sin dato"}. Verificar.
                      </p>
                    )}
                    <p className="small-note">
                      Antes de proponer su uso: confirmar administración y
                      acceso, evaluación técnica, accesibilidad, servicios y
                      autorización de Gestión del Riesgo.
                    </p>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={
                        data.manifest.sources.find(
                          (s) =>
                            s.key ===
                            (p.sourceKey === "sports"
                              ? "sports"
                              : "publicSpaces"),
                        )?.page
                      }
                    >
                      Consultar fuente primaria ↗
                    </a>
                  </>
                ) : (
                  <div className="detail-empty">
                    <span>↖</span>
                    <p className="eyebrow">DEL MAPA A LA FICHA</p>
                    <h2>
                      Cada lugar necesita
                      <br />
                      una verificación.
                    </h2>
                    <p>
                      Selecciona un polígono, un punto o un registro para
                      consultar sus datos y lo que falta por confirmar.
                    </p>
                  </div>
                )}
              </aside>
            </section>
            <details className="sources">
              <summary>Fuentes, método y límites de la información</summary>
              <p>
                {data.manifest.attribution}. Archivos descargados el{" "}
                {data.manifest.snapshotDate}; no se afirma disponibilidad
                actual.
              </p>
              <ul>
                {data.manifest.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Capa</th>
                      <th>Registros fuente</th>
                      <th>Licencia</th>
                      <th>Descarga oficial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.manifest.sources.map((s) => (
                      <tr key={s.key}>
                        <td>
                          <a href={s.page} target="_blank" rel="noreferrer">
                            {s.name}
                          </a>
                        </td>
                        <td>{fmt(s.count)}</td>
                        <td>{s.license}</td>
                        <td>
                          <a href={s.download} target="_blank" rel="noreferrer">
                            GeoJSON WFS ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <a
                href={`${import.meta.env.BASE_URL}data/manifest.json`}
                download
              >
                Descargar procedencia y huellas SHA-256
              </a>{" "}
              ·{" "}
              <a
                href={`${import.meta.env.BASE_URL}data/source-checks.json`}
                download
              >
                Verificación remota del 25 de septiembre
              </a>
            </details>
          </>
        )}
        {ruta.pagina === "trabajo" && <footer>
          <strong>Recomendar para preparar. La autoridad decide.</strong>
          <p>
            Esta herramienta no certifica disponibilidad, estabilidad
            estructural ni seguridad contra incendios. Solo información pública
            sobre espacios; sin identificación personal.
          </p>
        </footer>}
      </main>
      {plano && ciudad && (
        <footer className="cajetin" aria-label="Cajetín de la hoja">
          <div><small>Proyecto</small><b>{brand.name}</b></div>
          <div><small>Ciudad</small><b>{ciudad.nombre}, {ciudad.pais}</b></div>
          <div><small>Sección</small><b>{secciones[iSec]?.etiqueta}</b></div>
          <div><small>Marco legal</small><b>{ciudad.marco_legal}</b></div>
          <div className="est"><small>Estado</small><b>{["ciudad", "scene", "plan"].includes(tab) ? "ILUSTRATIVO, no es pronóstico" : "DEMOSTRACIÓN"}</b></div>
          <div><small>Hoja</small><b>{iSec + 1} / {secciones.length}</b></div>
        </footer>
      )}
      </div>
    </div>
  );
}
