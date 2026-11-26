import { Html } from "@react-three/drei";
export default function SceneLabel({
  title,
  subtitle,
  position,
  pin = false,
  compact = false,
}: {
  title: string;
  subtitle: string;
  position: readonly [number, number, number];
  /** Marcador numérico compacto (evita rótulos grandes superpuestos). */
  pin?: boolean;
  /** Solo el título, más pequeño: el detalle va en el panel de datos. */
  compact?: boolean;
}) {
  return (
    <Html center position={[...position]} zIndexRange={[10, 0]}>
      {pin ? (
        <div className="pin-num">{title}</div>
      ) : (
        <div className={compact ? "scene-label compact" : "scene-label"} title={subtitle}>
          <strong>{title}</strong>
          {!compact && <span>{subtitle}</span>}
        </div>
      )}
    </Html>
  );
}
