import { useEffect, useState, type ReactNode } from "react";

interface Geo { left: number; width: number; top: number; height: number; centro: [number, number]; aspecto: [number, number]; manzanas: number; cota_min: number; cota_max: number }
interface Datos { curvas: string; manzanas: string; geo: Geo }
const cache = new Map<string, Promise<Datos | null>>();

/** Descarga la lámina de una ciudad (curvas de nivel + manzanas) si existe. Son archivos propios generados por
 * `scripts/generar-lamina.py`, por eso se pueden incrustar en línea y tematizar con CSS. */
function cargar(base: string, id: string): Promise<Datos | null> {
  if (!cache.has(id)) {
    const txt = async (u: string) => {
      const r = await fetch(u);
      const t = r.ok ? await r.text() : "";
      return t.startsWith("<svg") && !/<script/i.test(t) ? t : null;
    };
    cache.set(
      id,
      (async () => {
        try {
          const [curvas, manzanas, g] = await Promise.all([txt(`${base}art/${id}-curvas.svg`), txt(`${base}art/${id}-manzanas.svg`), fetch(`${base}art/${id}.json`)]);
          if (!curvas || !manzanas || !g.ok) return null;
          return { curvas, manzanas, geo: (await g.json()) as Geo };
        } catch {
          return null;
        }
      })(),
    );
  }
  return cache.get(id)!;
}

export function useLamina(id: string) {
  const [d, setD] = useState<Datos | null | undefined>(undefined);
  useEffect(() => {
    let vivo = true;
    setD(undefined);
    cargar(import.meta.env.BASE_URL, id).then((x) => vivo && setD(x));
    return () => { vivo = false; };
  }, [id]);
  return d;
}

/** Lámina de ciudad: dos capas alineadas. Los hijos se posicionan en % sobre la caja del relieve. */
export default function Lamina({ datos, children, className = "" }: { datos: Datos; children?: ReactNode; className?: string }) {
  const { geo } = datos;
  return (
    <div className={`lamina ${className}`} style={{ aspectRatio: `${geo.aspecto[0]} / ${geo.aspecto[1]}` }} role="img" aria-label="Curvas de nivel y manzanas de la ciudad">
      <div className="lamina-capa" dangerouslySetInnerHTML={{ __html: datos.curvas }} />
      <div className="lamina-capa lamina-manz" style={{ left: `${geo.left}%`, top: `${geo.top}%`, width: `${geo.width}%`, height: `${geo.height}%` }} dangerouslySetInnerHTML={{ __html: datos.manzanas }} />
      {children}
    </div>
  );
}
export type { Datos as DatosLamina };
