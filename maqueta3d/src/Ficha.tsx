import { NIVELES, type Ciudad } from "./ciudades";
import { hrefDe } from "./navegacion";
import Lamina, { useLamina } from "./Lamina";

const NIVEL_N = { mapa: 1, edificios: 2, maqueta: 3 } as const;
const fmt = (n: number) => n.toLocaleString("es-CO");

/** Ficha de ciudad: lo que se sabe de una ciudad y el nivel de detalle que tiene. Sirve para cualquier ciudad del catálogo. */
export default function Ficha({ ciudad, ciudades, onCiudad }: { ciudad: Ciudad; ciudades: Ciudad[]; onCiudad: (id: string) => void }) {
  const lamina = useLamina(ciudad.ciudad_id);
  const n = NIVEL_N[ciudad.nivel_detalle];
  return (
    <div className="ficha">
      <div className="ficha-mapa">
        {lamina ? (
          <Lamina datos={lamina} className="lamina-ficha"><span className="norte"><i />N</span></Lamina>
        ) : (
          <div className="ficha-vacio">
            <b>{ciudad.nombre} todavía no tiene lámina</b>
            <p>La lámina se genera con el relieve y los edificios de la ciudad. Mientras tanto, la comunidad puede <a href={hrefDe("aporta", "espacio")}>proponer espacios</a> y <a href={hrefDe("aporta", "reportar")}>enviar reportes</a> con los CSV de la guía.</p>
          </div>
        )}
      </div>
      <div className="ficha-datos">
        <div className="ficha-ciudades" role="tablist" aria-label="Ciudades">
          {ciudades.map((c) => (
            <button key={c.ciudad_id} role="tab" aria-selected={c.ciudad_id === ciudad.ciudad_id} onClick={() => onCiudad(c.ciudad_id)}>{c.nombre}</button>
          ))}
        </div>
        <h2>{ciudad.nombre}</h2>
        <p className="coord">{Math.abs(ciudad.lat).toFixed(2).replace(".", ",")}° {ciudad.lat >= 0 ? "N" : "S"} · {Math.abs(ciudad.lon).toFixed(2).replace(".", ",")}° {ciudad.lon >= 0 ? "E" : "O"} · {ciudad.pais}</p>
        <div className="nivel" aria-label={`Nivel ${NIVELES[ciudad.nivel_detalle].nombre}, ${n} de 3`}>
          {[1, 2, 3].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}
          <span>{NIVELES[ciudad.nivel_detalle].nombre} · {ciudad.estado}</span>
        </div>
        <p className="nota">{NIVELES[ciudad.nivel_detalle].detalle}</p>
        <table>
          <tbody>
            {lamina && <tr><th scope="row">Manzanas modeladas</th><td>{fmt(lamina.geo.manzanas)}</td></tr>}
            {lamina && <tr><th scope="row">Altitud en el área</th><td>{fmt(lamina.geo.cota_min)} a {fmt(lamina.geo.cota_max)} m</td></tr>}
            <tr><th scope="row">Idioma</th><td>{ciudad.idioma.toUpperCase()}</td></tr>
            <tr><th scope="row">Marco legal local</th><td>{ciudad.marco_legal}</td></tr>
          </tbody>
        </table>
        {ciudad.nivel_detalle === "maqueta" && <a className="boton primario" href={hrefDe("entidad", "simular")}>Simular una amenaza</a>}
        <a className="boton" href={hrefDe("aporta", "espacio")}>Proponer espacios</a>
        <a className="boton" href={hrefDe("entidad", "guia")}>Cómo agregar datos de esta ciudad</a>
      </div>
    </div>
  );
}
