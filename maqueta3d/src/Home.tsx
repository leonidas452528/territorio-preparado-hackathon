import { NIVELES, type Ciudad } from "./ciudades";
import { hrefDe } from "./navegacion";
import Lamina, { useLamina } from "./Lamina";

const BASE = import.meta.env.BASE_URL;
interface Props { ciudades: Ciudad[]; ciudadId: string; onCiudad: (id: string) => void }

/** Inicio: una lámina de ejemplo, qué es el proyecto y los tres niveles de detalle. Solo lo superficial. */
export default function Home({ ciudades }: Props) {
  const piloto = ciudades.find((c) => c.nivel_detalle === "maqueta") ?? ciudades[0];
  const lamina = useLamina(piloto?.ciudad_id ?? "");
  return (
    <div className="home">
      <section className="h-hero">
        {lamina && (
          <div className="h-arte" aria-hidden="false">
            <Lamina datos={lamina}>
              <span className="h-aqui" style={{ left: `${lamina.geo.centro[0]}%`, top: `${lamina.geo.centro[1]}%` }}>
                <i />
                <span className="h-card">
                  <b>Ejemplo: {piloto.nombre}, ciudad piloto</b>
                  Cada curva es un desnivel de 50 m. Tu ciudad tendrá su propia lámina.
                </span>
              </span>
            </Lamina>
          </div>
        )}
        <div className="h-titular">
          <h1>Leer el territorio antes de que se <em>mueva</em>.</h1>
          <p>Dónde hay espacio, qué amenazas rodean a cada barrio y qué reporta su comunidad cada mes, en cualquier ciudad del mundo. Para que quien decide llegue con un plan.</p>
          <div className="h-botones">
            <a className="boton primario" href={hrefDe("entidad", "ciudad")}>Entrar como entidad</a>
            <a className="boton" href={hrefDe("aporta", "reportar")}>Aportar datos de mi comunidad</a>
          </div>
        </div>
        <dl className="h-cifras">
          <div><dt>ciudades en el catálogo</dt><dd>{ciudades.length}</dd></div>
          <div><dt>niveles de detalle por ciudad</dt><dd>{Object.keys(NIVELES).length}</dd></div>
          <div><dt>archivo CSV basta para empezar</dt><dd>1</dd></div>
        </dl>
      </section>

      <section className="h-seccion" aria-labelledby="laminas">
        <h2 id="laminas">Una ciudad no necesita maqueta para empezar.</h2>
        <p className="h-sub">Modelar cada rincón del mundo en 3D no es realista. Cada ciudad se presenta como una lámina con el nivel de detalle que sus datos permiten, y sube de nivel cuando los tiene.</p>
        <div className="placas">
          <figure className="placa">
            <div className="placa-fig"><img src={`${BASE}art/placa-mapa.jpg`} alt="Mapa de espacios con capas de amenaza" loading="lazy" /></div>
            <figcaption><span>Lámina I</span><b>{NIVELES.mapa.nombre}</b><p>{NIVELES.mapa.detalle}</p><em>Donde empieza toda ciudad nueva</em></figcaption>
          </figure>
          <figure className="placa">
            <div className="placa-fig placa-puntos">{lamina && <div className="lamina-capa-simple" dangerouslySetInnerHTML={{ __html: lamina.manzanas }} />}</div>
            <figcaption><span>Lámina II</span><b>{NIVELES.edificios.nombre}</b><p>{NIVELES.edificios.detalle}</p><em>Siguiente paso, aún sin construir</em></figcaption>
          </figure>
          <figure className="placa">
            <div className="placa-fig"><img src={`${BASE}art/placa-maqueta.jpg`} alt="Maqueta 3D de la ciudad piloto con un sismo simulado" loading="lazy" /></div>
            <figcaption><span>Lámina III</span><b>{NIVELES.maqueta.nombre}</b><p>{NIVELES.maqueta.detalle}</p><em>Hoy solo en la ciudad piloto</em></figcaption>
          </figure>
        </div>
      </section>

      <section className="h-seccion" aria-labelledby="como">
        <h2 id="como">Cómo funciona</h2>
        <ol className="pasos">
          <li><b>La comunidad reporta</b><span>Cada mes envía solo conteos: personas por grupo de edad, estado de un espacio, qué falta. Sin nombres ni documentos.</span></li>
          <li><b>El sistema verifica</b><span>Revisa cada archivo, marca los errores y guarda los datos en archivos de texto, con historial.</span></li>
          <li><b>La entidad decide</b><span>Simula una amenaza, mira dónde hay espacio y prepara un borrador. La decisión sigue siendo de la autoridad.</span></li>
        </ol>
      </section>

      <section className="h-seccion" aria-labelledby="video">
        <h2 id="video">Un sismo, visto en 40 segundos</h2>
        <figure className="h-video">
          <video controls preload="none" poster={`${BASE}video/poster.jpg`} aria-describedby="video-texto"><source src={`${BASE}video/uso-emergencia.mp4`} type="video/mp4" /></video>
          <figcaption>
            <details id="video-texto"><summary>Leer la transcripción</summary>Ocurre un sismo. La entidad abre el simulador, elige la magnitud y el epicentro y ve cuántas construcciones podrían sufrir daño. Revisa los sitios de acopio sugeridos. La comunidad envía su reporte mensual con la plantilla y la entidad ve el consolidado.</details>
          </figcaption>
        </figure>
      </section>

      <section className="h-banda">
        <div><h2>Aliados</h2><p>Cajas de compensación, administradoras de edificios, aseguradoras y juntas vecinales pueden aportar espacios y reportes.</p></div>
        <a className="boton" href="#/aliados">Ver cómo aliarse</a>
      </section>

      <footer className="h-pie">
        <p>Herramienta de apoyo: la decisión es de la autoridad de cada lugar y no se evalúan estructuras. Prototipo de demostración: la ocupación y los reportes son simulados. Datos mínimos y agregados; el marco legal depende del país de cada ciudad.</p>
      </footer>
    </div>
  );
}
