import { TABLAS } from "./datos/esquema";
import type { Ciudad } from "./ciudades";
import EditorDatos from "./EditorDatos";

/** Área comunidad: reporte mensual y propuesta de espacios con el mismo editor guiado. */
export default function Reportar({ tipo, ciudad, ciudades }: { tipo: "reportes" | "espacios_propuestos"; ciudad: Ciudad; ciudades: Ciudad[] }) {
  const t = TABLAS[tipo];
  const ctx = { ciudades: ciudades.map((c) => c.ciudad_id) };
  return (
    <div className="pagina">
      <header className="pagina-cab">
        <h2>{tipo === "reportes" ? "Enviar reporte mensual" : "Proponer un espacio"}</h2>
        <p>{t.resumen}</p>
        <p className="aviso" role="note">
          <b>Demostración:</b> la verificación ocurre en tu navegador y no se envía nada. Descarga el CSV y entrégalo al ente que te dio tu código. Ciudad: <b>{ciudad.nombre}</b>.
        </p>
      </header>
      <EditorDatos key={`${tipo}-${ciudad.ciudad_id}`} tabla={t} ctx={ctx} inicial={{ ciudad_id: ciudad.ciudad_id }} />
    </div>
  );
}
