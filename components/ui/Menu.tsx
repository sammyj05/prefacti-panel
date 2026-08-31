"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { cx, ENTRA_PANEL, useCierreExterno } from "@/lib/ui";

/**
 * El desplegable.
 *
 * Había cuatro en el panel —empresa, estilo, forma y métricas— y cada uno traía
 * su propio cierre: dos escuchaban `click` en `window`, uno `mousedown` en el
 * documento, y los cuatro habían escrito por separado la animación de entrada.
 * Los que escuchaban `click` tenían además un fallo real: marcar una casilla
 * dentro del panel cerraba el panel, porque entre el `mousedown` y el `click`
 * la lista se reordenaba y el destino del evento ya no estaba dentro.
 *
 * Aquí el cierre es uno solo, en `lib/ui`, y con él se arreglan los cuatro.
 *
 * El disparador se pasa como función y recibe el estado. Es lo que permite que
 * cada sitio dibuje el suyo —una pastilla con el nombre de la empresa, un icono
 * de paleta, un botón con contador— sin que el menú tenga que saber nada de
 * ellos ni llevar diez propiedades de aspecto.
 */

export function Menu({
  disparador, children, ancho = 260, lado = "izquierda", rotulo,
}: {
  /**
   * Los atributos accesibles van en su propio objeto y no sueltos junto a
   * `abierto`. Es a propósito: sueltos, la forma natural de escribir un
   * disparador —`({ alternar, ...aria }) => <button {...aria} />`— arrastra
   * también `abierto` al marcado, y React avisa de un atributo desconocido en
   * el `<button>`. Anidados, el reparto no se puede equivocar.
   */
  disparador: (props: {
    abierto: boolean;
    alternar: () => void;
    aria: { "aria-expanded": boolean; "aria-haspopup": "menu" };
  }) => React.ReactNode;
  children: (props: { cerrar: () => void }) => React.ReactNode;
  ancho?: number;
  /** De qué borde cuelga. A la derecha, para lo que vive al final de la banda. */
  lado?: "izquierda" | "derecha";
  rotulo?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const cerrar = useCallback(() => setAbierto(false), []);
  useCierreExterno(caja, abierto, cerrar);

  return (
    <div ref={caja} className="relative shrink-0">
      {disparador({
        abierto,
        alternar: () => setAbierto(v => !v),
        aria: { "aria-expanded": abierto, "aria-haspopup": "menu" },
      })}

      <AnimatePresence>
        {abierto && (
          <motion.div
            {...ENTRA_PANEL}
            role="menu"
            aria-label={rotulo}
            style={{ width: ancho }}
            className={cx(
              "absolute top-[calc(100%+6px)] z-50 max-w-[calc(100vw-2rem)] overflow-hidden",
              "rounded-[10px] border border-trazo-fino bg-hueso-alto shadow-flota",
              lado === "derecha" ? "right-0" : "left-0",
            )}
          >
            {children({ cerrar })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** El rótulo de un grupo dentro del menú. */
export function MenuRotulo({ children }: { children: React.ReactNode }) {
  return <div className="px-3 pb-1 pt-2.5"><span className="nota text-tinta-400">{children}</span></div>;
}

/** Filete separador. Uno, y sólo entre bloques que hacen cosas distintas. */
export function MenuFilete() {
  return <div className="my-1 h-px bg-trazo-fino" role="separator" />;
}

/**
 * Una fila del menú.
 *
 * `marcada` reserva su hueco a la derecha aunque no esté marcada. Si la marca
 * apareciera y desapareciera, el texto de cada fila se movería al cambiar de
 * opción, que es el tipo de salto que hace que un menú parezca improvisado.
 */
export function MenuItem({
  children, detalle, icono: Icono, marcada, peligro, ...resto
}: {
  children: React.ReactNode;
  detalle?: string;
  icono?: React.ComponentType<{ className?: string }>;
  marcada?: boolean;
  peligro?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      role="menuitem"
      className={cx(
        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
        peligro ? "text-riesgo hover:bg-riesgo/8" : "text-tinta-900 hover:bg-hueso-mesa",
        "disabled:pointer-events-none disabled:opacity-45",
      )}
      {...resto}
    >
      {Icono && <Icono className="h-4 w-4 shrink-0 text-tinta-400" aria-hidden />}
      <span className="min-w-0 flex-1">
        <span className={cx("block truncate text-[13.5px]", marcada ? "font-medio" : "font-libro")}>
          {children}
        </span>
        {detalle && <span className="block truncate text-[12px] text-tinta-400">{detalle}</span>}
      </span>
      {marcada !== undefined && (
        <Check className={cx("h-4 w-4 shrink-0 text-minio-600", !marcada && "opacity-0")} aria-hidden />
      )}
    </button>
  );
}
