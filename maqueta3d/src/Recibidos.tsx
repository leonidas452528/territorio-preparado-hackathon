import { useState } from "react";
import { ORDEN_TABLAS, TABLAS } from "./datos/esquema";
import type { Ciudad } from "./ciudades";
import SubirCsv from "./SubirCsv";

/** Área entidad: verifica archivos recibidos antes de agregarlos a `bd/`. */
export default function Recibidos({ ciudades }: { ciudades: Ciudad[] }) {
  const [id, setId] = useState("reportes");
  return (
    <div className="pagina">
      <header className="pagina-cab">
        <h2>Datos recibidos</h2>
        <p>Verifica el archivo que entregó una organización antes de agregarlo a la carpeta <code>bd/</code>. Se comprueban tipos, reglas y que la ciudad exista. Los códigos de organización y los espacios se cruzan con las tablas de <code>bd/</code> cuando la entidad las tenga cargadas (en esta demostración no).</p>
      </header>
      <label className="campo">
        <span>Tabla</span>
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {ORDEN_TABLAS.map((k) => <option key={k} value={k}>{TABLAS[k].titulo}</option>)}
        </select>
      </label>
      <SubirCsv key={id} tabla={TABLAS[id]} ctx={{ ciudades: ciudades.map((c) => c.ciudad_id) }} />
    </div>
  );
}
