import { useState } from "react";
import type { Tabla } from "./datos/esquema";
import { validarCsv, type Contexto, type Fila, type ResultadoFila } from "./datos/validar";

/** Verifica un archivo CSV contra el esquema, en el navegador. Fase 1: nada se envía. */
export default function SubirCsv({ tabla, ctx, onValidas }: { tabla: Tabla; ctx?: Contexto; onValidas?: (f: Fila[]) => void }) {
  const [filas, setFilas] = useState<ResultadoFila[] | null>(null);
  const [error, setError] = useState("");
  const buenas = filas?.filter((f) => f.errores.length === 0) ?? [];
  return (
    <div className="subir">
      <label className="campo">
        <span>Archivo CSV de {tabla.titulo.toLowerCase()}</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (ev) => {
            const f = ev.target.files?.[0];
            setError("");
            setFilas(null);
            if (!f) return;
            if (f.size > 200_000) return setError("El archivo supera 200 KB. Divídelo en partes.");
            const r = validarCsv(tabla, await f.text(), ctx);
            if (r.errorGlobal) setError(r.errorGlobal);
            else setFilas(r.filas);
          }}
        />
      </label>
      {error && <p role="alert" className="aviso aviso-error">{error}</p>}
      {filas && (
        <div role="status" className="resultado">
          <p><b>{buenas.length}</b> de {filas.length} filas válidas.</p>
          {filas.filter((f) => f.errores.length).map((f) => (
            <p key={f.fila} className="aviso aviso-error">Fila {f.fila}: {f.errores.join("; ")}.</p>
          ))}
          {onValidas && buenas.length > 0 && (
            <button onClick={() => onValidas(buenas.map((f) => f.datos))}>Agregar las {buenas.length} filas válidas a la lista</button>
          )}
        </div>
      )}
    </div>
  );
}
