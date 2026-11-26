import { useState } from "react";
import type { Columna, Tabla } from "./datos/esquema";
import { aCsv, validarFila, type Contexto, type Fila } from "./datos/validar";
import SubirCsv from "./SubirCsv";

export function descargar(nombre: string, texto: string, tipo = "text/csv") {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
  Object.assign(document.createElement("a"), { href: url, download: nombre }).click();
  URL.revokeObjectURL(url);
}

function Campo({ c, valor, cambiar }: { c: Columna; valor: string; cambiar: (v: string) => void }) {
  const id = `campo-${c.nombre}`;
  const comun = { id, value: valor, "aria-describedby": `${id}-ayuda`, required: c.obligatoria };
  let control;
  if (c.tipo === "opcion")
    control = (
      <select {...comun} onChange={(e) => cambiar(e.target.value)}>
        <option value="">Elige…</option>
        {c.opciones!.map((o) => <option key={o} value={o}>{o.replaceAll("_", " ")}</option>)}
      </select>
    );
  else if (c.tipo === "si_no")
    control = (
      <select {...comun} onChange={(e) => cambiar(e.target.value)}>
        <option value="">Elige…</option>
        <option value="1">Sí</option>
        <option value="0">No</option>
      </select>
    );
  else if (c.tipo === "mes") control = <input {...comun} type="month" onChange={(e) => cambiar(e.target.value)} />;
  else if (c.tipo === "entero" || c.tipo === "decimal")
    control = <input {...comun} type="number" inputMode={c.tipo === "entero" ? "numeric" : "decimal"} step={c.tipo === "entero" ? 1 : "any"} min={c.min} max={c.max} placeholder={c.ejemplo} onChange={(e) => cambiar(e.target.value)} />;
  else if (c.largo && c.largo >= 200)
    control = <textarea {...comun} rows={2} maxLength={c.largo} placeholder={c.ejemplo} onChange={(e) => cambiar(e.target.value)} />;
  else control = <input {...comun} type="text" maxLength={c.largo ?? 40} placeholder={c.ejemplo} onChange={(e) => cambiar(e.target.value)} />;
  return (
    <div className="campo">
      <label htmlFor={id}>
        {c.etiqueta ?? c.nombre} {c.obligatoria ? <em>obligatoria</em> : <em>opcional</em>}
      </label>
      {control}
      <small id={`${id}-ayuda`}>{c.ayuda}</small>
    </div>
  );
}

/** Editor guiado de una tabla: formulario con ayuda por campo, lista de filas, CSV descargable o archivo para verificar. */
export default function EditorDatos({ tabla, ctx, inicial }: { tabla: Tabla; ctx?: Contexto; inicial?: Fila }) {
  const vacio = (): Fila => ({ ...Object.fromEntries(tabla.columnas.map((c) => [c.nombre, ""])), ...inicial });
  const [borrador, setBorrador] = useState<Fila>(vacio);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [errores, setErrores] = useState<string[]>([]);
  // Se conservan los datos de contexto que casi no cambian entre filas.
  const fijos = ["ciudad_id", "periodo", "codigo_organizacion"];
  return (
    <div className="editor">
      <form
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          const e2 = validarFila(tabla, borrador, ctx);
          setErrores(e2);
          if (e2.length) return;
          setFilas((f) => [...f, borrador]);
          setBorrador({ ...vacio(), ...Object.fromEntries(fijos.filter((k) => k in borrador).map((k) => [k, borrador[k]])) });
        }}
      >
        <div className="campos">
          {tabla.columnas.map((c) => <Campo key={c.nombre} c={c} valor={borrador[c.nombre]} cambiar={(v) => setBorrador((b) => ({ ...b, [c.nombre]: v }))} />)}
        </div>
        {tabla.reglas.length > 0 && <ul className="reglas">{tabla.reglas.map((r) => <li key={r}>{r}</li>)}</ul>}
        {errores.length > 0 && (
          <div role="alert" className="aviso aviso-error">
            <b>Revisa esto antes de agregar:</b>
            <ul>{errores.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        )}
        <button type="submit" className="primario">Agregar a la lista</button>
      </form>

      <section className="editor-lista" aria-label="Filas listas para entregar">
        <h3>Tu lista ({filas.length})</h3>
        {filas.length === 0 ? (
          <p className="vacio">Aún no hay filas. Llena el formulario y pulsa «Agregar a la lista», o verifica un archivo abajo.</p>
        ) : (
          <>
            <div className="tabla-scroll">
              <table>
                <thead><tr>{tabla.columnas.map((c) => <th key={c.nombre}>{c.nombre}</th>)}<th /></tr></thead>
                <tbody>
                  {filas.map((f, i) => (
                    <tr key={i}>
                      {tabla.columnas.map((c) => <td key={c.nombre}>{f[c.nombre]}</td>)}
                      <td><button className="texto" onClick={() => setFilas((x) => x.filter((_, j) => j !== i))}>Quitar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="primario" onClick={() => descargar(`${tabla.id}.csv`, aCsv(tabla, filas))}>Descargar {tabla.id}.csv</button>
          </>
        )}
        <h3>¿Ya tienes un archivo?</h3>
        <SubirCsv tabla={tabla} ctx={ctx} onValidas={(f) => setFilas((x) => [...x, ...f])} />
      </section>
    </div>
  );
}
