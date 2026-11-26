const ALIADOS = [
  ["Cajas de compensación", "Instalaciones (salones, canchas, sedes) como candidatas a acopio o alojamiento temporal, y su red de afiliados para difundir la plantilla."],
  ["Conjuntos y administradoras", "Reporte mensual agregado, salón comunal y zonas comunes como puntos de encuentro, y brigadas conectadas con el CMGRD."],
  ["Aseguradoras", "Conocimiento del riesgo por manzana para prevención y campañas, sin datos de asegurados: solo información agregada y pública."],
  ["Juntas de Acción Comunal", "Reporte mensual por barrio, validación de lo que muestra el mapa y enlace con la comunidad."],
] as const;

/** Aliados: propuesta de colaboración. No hay acuerdos firmados. */
export default function Aliados() {
  return (
    <div className="pagina">
      <header className="pagina-cab">
        <h2>Aliados</h2>
        <p>Territorio Preparado funciona mejor con quienes ya tienen espacios, comunidad y conocimiento del riesgo.</p>
        <p className="aviso">Esta es una <b>propuesta de colaboración</b>. Hoy no hay convenios firmados con ninguna entidad.</p>
      </header>
      <dl className="aliados">
        {ALIADOS.map(([t, d]) => (
          <div key={t}><dt>{t}</dt><dd>{d}</dd></div>
        ))}
      </dl>
      <section>
        <h3>Reglas para cualquier alianza</h3>
        <ul className="reglas">
          <li>Solo datos agregados; nada que identifique a personas (Ley 1581 de 2012; menores, Ley 1098 de 2006).</li>
          <li>La decisión operativa sigue en el CMGRD y las entidades de socorro; la herramienta orienta, no ordena.</li>
          <li>Los espacios privados se usan solo con autorización expresa de su propietario.</li>
          <li>Las cifras de costos y alcance están en los informes de formulación; marcadas «(verificar)» hasta confirmar con cada aliado.</li>
        </ul>
      </section>
    </div>
  );
}
