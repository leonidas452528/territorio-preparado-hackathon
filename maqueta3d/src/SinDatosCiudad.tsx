import { NIVELES, type Ciudad } from "./ciudades";
import { hrefDe } from "./navegacion";

/** Se muestra cuando la ciudad elegida aún no tiene la maqueta ni los datos del piloto. */
export default function SinDatosCiudad({ ciudad }: { ciudad: Ciudad }) {
  return (
    <div className="pagina">
      <header className="pagina-cab">
        <h2>{ciudad.nombre} todavía no tiene esta vista</h2>
        <p>Hoy {ciudad.nombre} está en nivel <b>{NIVELES[ciudad.nivel_detalle].nombre.toLowerCase()}</b> ({ciudad.estado}). Las simulaciones y la maqueta solo existen para Cali, la ciudad piloto.</p>
      </header>
      <ol className="niveles">
        {(Object.keys(NIVELES) as (keyof typeof NIVELES)[]).map((k) => (
          <li key={k} aria-current={k === ciudad.nivel_detalle ? "true" : undefined}>
            <b>{NIVELES[k].nombre}</b>
            <span>{NIVELES[k].detalle}</span>
            {k === ciudad.nivel_detalle && <em>Nivel actual</em>}
          </li>
        ))}
      </ol>
      <p>Para empezar en {ciudad.nombre} no hace falta una maqueta: la comunidad puede <a href={hrefDe("aporta", "espacio")}>proponer espacios</a> y <a href={hrefDe("aporta", "reportar")}>enviar reportes</a> con los CSV de la guía.</p>
    </div>
  );
}
