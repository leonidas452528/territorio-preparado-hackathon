import { parsearCsv } from "./datos/validar";

export interface Ciudad { ciudad_id: string; nombre: string; pais: string; lat: number; lon: number; nivel_detalle: "mapa" | "edificios" | "maqueta"; estado: "piloto" | "propuesta"; idioma: string; marco_legal: string }

export const NIVELES = {
  mapa: { nombre: "Mapa", detalle: "Mapa 2D con límites y los espacios que la comunidad reporta. Funciona en cualquier ciudad con solo CSV." },
  edificios: { nombre: "Edificios", detalle: "3D automático: huellas de edificios abiertas y relieve público, sin curaduría manual." },
  maqueta: { nombre: "Maqueta", detalle: "3D curado con amenazas, simulaciones y sitios de acopio. Hoy solo Cali." },
} as const;

export async function cargarCiudades(base: string, señal?: AbortSignal): Promise<Ciudad[]> {
  const r = await fetch(`${base}bd/ciudades.csv`, { signal: señal });
  if (!r.ok) throw new Error("No se pudo cargar el catálogo de ciudades");
  const [enc, ...filas] = parsearCsv(await r.text());
  return filas.map((f) => {
    const o = Object.fromEntries(enc.map((c, i) => [c, f[i]]));
    return { ...o, lat: Number(o.lat), lon: Number(o.lon) } as Ciudad;
  });
}
