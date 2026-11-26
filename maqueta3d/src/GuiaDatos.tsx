import { ORDEN_TABLAS, TABLAS, type Tipo } from "./datos/esquema";
import { ejemplo, plantillaCsv } from "./datos/validar";
import { descargar } from "./EditorDatos";

const TIPO: Record<Tipo, string> = { id: "código", texto: "texto", entero: "número entero", decimal: "número con punto", mes: "mes AAAA-MM", opcion: "una opción", si_no: "1 = sí, 0 = no" };

/** Guía de cómo se ingresan los datos: se genera desde el esquema, así nunca se desactualiza. */
export default function GuiaDatos() {
  return (
    <div className="pagina guia">
      <header className="pagina-cab">
        <h2>Guía de datos</h2>
        <p>Los datos viven en archivos de texto (CSV), uno por tabla. Antes de montar una base grande, esto basta: se puede abrir en cualquier hoja de cálculo y cada cambio queda registrado.</p>
      </header>

      <ol className="pasos">
        <li><b>Llena</b><span>Usa el formulario de la app o descarga la plantilla y ábrela en una hoja de cálculo.</span></li>
        <li><b>Verifica</b><span>Sube el archivo: la app marca cada fila con error y dice cómo arreglarla.</span></li>
        <li><b>Entrega</b><span>Envía el CSV al ente que te dio tu código. En esta fase de demostración la app no envía nada.</span></li>
        <li><b>Se guarda</b><span>La entidad lo agrega a la carpeta <code>bd/</code> del proyecto, con historial de quién cambió qué.</span></li>
      </ol>

      <aside className="aviso">
        <b>Reglas para todas las tablas:</b> solo conteos y lugares públicos; nunca nombres, documentos, teléfonos, correos ni direcciones de vivienda; sin datos de menores identificables; sin reconocimiento facial. Si no conoces un dato, déjalo vacío: no lo inventes.
      </aside>

      <p><a href={`${import.meta.env.BASE_URL}bd/diccionario.csv`} download>Descargar el diccionario completo (CSV)</a></p>

      {ORDEN_TABLAS.map((id) => {
        const t = TABLAS[id];
        return (
          <section key={id} className="tabla-guia" aria-labelledby={`g-${id}`}>
            <h3 id={`g-${id}`}>{t.titulo} <span className="etiqueta">{t.quien === "entidad" ? "la llena la entidad" : "la llena la comunidad"}</span></h3>
            <p>{t.resumen}</p>
            <button onClick={() => descargar(`plantilla_${t.id}.csv`, plantillaCsv(t))}>Descargar plantilla de {t.titulo.toLowerCase()}</button>
            <div className="tabla-scroll">
              <table>
                <caption className="solo-lectores">Columnas de {t.titulo}</caption>
                <thead><tr><th>Columna</th><th>Qué poner</th><th>Tipo</th><th>Obligatoria</th><th>Ejemplo</th></tr></thead>
                <tbody>
                  {t.columnas.map((c) => (
                    <tr key={c.nombre}>
                      <th scope="row"><code>{c.nombre}</code></th>
                      <td>{c.ayuda}{c.opciones && <><br /><small>Opciones: {c.opciones.join(", ")}</small></>}</td>
                      <td>{TIPO[c.tipo]}</td>
                      <td>{c.obligatoria ? "Sí" : "No"}</td>
                      <td><code>{c.ejemplo}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {t.reglas.length > 0 && <ul className="reglas">{t.reglas.map((r) => <li key={r}>{r}</li>)}</ul>}
            <details>
              <summary>Así se ve una fila en el archivo</summary>
              <pre>{t.columnas.map((c) => c.nombre).join(",")}{"\n"}{t.columnas.map((c) => ejemplo(t)[c.nombre]).join(",")}</pre>
            </details>
          </section>
        );
      })}
    </div>
  );
}
