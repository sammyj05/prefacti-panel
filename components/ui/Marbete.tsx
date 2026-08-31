"use client";

import { cx } from "@/lib/ui";

/**
 * El marbete.
 *
 * La etiqueta de estado. Va en pastilla y en sans, no en versalitas de mono: en
 * una ficha con dos marbetes seguidos, el mono en caja alta pesaba más que el
 * nombre del proyecto que tenía encima.
 *
 * Los tonos son semánticos y sólo tres llevan color. Un marbete de color dice
 * «mira esto»; si todos lo llevan, ninguno lo dice. Lo neutro —una etapa, un
 * tipo de obra, un distrito— va en tinta sobre papel hundido.
 *
 * El punto de delante es opcional y hace un trabajo concreto: distinguir dos
 * estados a distancia sin depender del color, que es lo que necesita quien no
 * separa el rojo del verde.
 */

type Tono = "neutro" | "bien" | "mal" | "aviso" | "marca";

const TONOS: Record<Tono, { caja: string; punto: string }> = {
  neutro: { caja: "bg-hueso-mesa text-tinta-700 border-transparent", punto: "bg-tinta-400" },
  bien:   { caja: "bg-viable/10 text-viable border-viable/22", punto: "bg-viable" },
  mal:    { caja: "bg-riesgo/10 text-riesgo border-riesgo/22", punto: "bg-riesgo" },
  aviso:  { caja: "bg-tenso/12 text-tenso border-tenso/25", punto: "bg-tenso" },
  marca:  { caja: "bg-minio-100 text-minio-700 border-minio-500/20", punto: "bg-minio-600" },
};

export function Marbete({
  tono = "neutro", punto, children, className, style,
}: {
  tono?: Tono;
  punto?: boolean;
  children: React.ReactNode;
  className?: string;
  /**
   * Color propio, para lo que no cabe en los cinco tonos: las seis etapas de
   * obra tienen su propia rampa —de claro a oscuro siguiendo el avance— y son
   * un dato, no un juicio. Con `style` puesto, el punto hereda el color del
   * texto en vez del del tono.
   */
  style?: React.CSSProperties;
}) {
  const t = TONOS[tono];
  return (
    <span
      style={style}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px]",
        "text-[12px] font-medio leading-none whitespace-nowrap",
        !style && t.caja, className,
      )}
    >
      {punto && (
        <span aria-hidden
          className={cx("h-[5px] w-[5px] rounded-full", !style && t.punto)}
          style={style ? { background: "currentColor" } : undefined} />
      )}
      {children}
    </span>
  );
}
