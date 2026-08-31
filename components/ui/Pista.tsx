"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cx, RAPIDO } from "@/lib/ui";

/**
 * La pista.
 *
 * Un rótulo que aparece al detenerse encima. Tres cosas que el `title` nativo no
 * hace y aquí sí: sale a los 400 ms —no medio segundo largo—, se puede componer,
 * y responde al foco de teclado además de al ratón.
 *
 * Retraso a la entrada y no a la salida. Al recorrer una fila de seis botones no
 * debe encenderse una pista bajo cada uno; pero una vez encendida, moverse al
 * botón de al lado tiene que enseñar la suya sin volver a esperar.
 *
 * No es sitio para nada indispensable: en una pantalla táctil no hay «pasar por
 * encima», así que lo que sólo esté aquí no existe para quien usa el teléfono.
 */
export function Pista({
  texto, lado = "arriba", className, children,
}: {
  texto: string;
  lado?: "arriba" | "abajo";
  /** Sustituye al `inline-flex` del envoltorio: sirve para esconderlo con el
   *  mismo punto de ruptura que su contenido, sin dejar un hueco vacío. */
  className?: string;
  children: React.ReactNode;
}) {
  const [ve, setVe] = useState(false);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const abrir = () => {
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = setTimeout(() => setVe(true), 400);
  };
  const cerrar = () => {
    if (reloj.current) clearTimeout(reloj.current);
    setVe(false);
  };

  return (
    <span
      className={cx("relative", className ?? "inline-flex")}
      onMouseEnter={abrir} onMouseLeave={cerrar}
      onFocus={abrir} onBlur={cerrar}
    >
      {/* `inline-flex` y no un `<span>` a secas: dentro va un control con
          medidas propias —una rejilla de 36 px, un botón— y un contenedor en
          línea normal le impondría la caja de una línea de texto. */}
      <span className="inline-flex" aria-describedby={ve ? id : undefined}>{children}</span>
      <AnimatePresence>
        {ve && (
          <motion.span
            id={id} role="tooltip"
            initial={{ opacity: 0, y: lado === "arriba" ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: lado === "arriba" ? 4 : -4 }}
            transition={RAPIDO}
            className={cx(
              "pointer-events-none absolute left-1/2 z-[500] -translate-x-1/2 whitespace-nowrap",
              "rounded-[6px] bg-tinta-950 px-2 py-1 text-[12px] font-medio text-hueso shadow-media",
              lado === "arriba" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
            )}
          >
            {texto}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
