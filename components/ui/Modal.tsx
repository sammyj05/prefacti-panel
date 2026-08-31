"use client";

import { useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cx, MEDIO, RAPIDO, useCierreExterno, useSinScroll, useTrampaFoco } from "@/lib/ui";
import { BotonIcono } from "./Boton";

/**
 * El diálogo.
 *
 * De las siete cosas que el pliego pide de un modal —velo, trampa de foco,
 * escape, clic fuera, entrada, salida y tratamiento de móvil— el panel tenía
 * cuatro, repartidas entre la paleta de comandos y el copiloto, y ninguna de
 * las dos devolvía el foco al cerrarse.
 *
 * En el móvil no es un rectángulo centrado sino una hoja pegada abajo. No es
 * moda: un diálogo centrado en un teléfono deja sus acciones en mitad de la
 * pantalla, lejos del pulgar, y encima el teclado virtual lo empuja fuera de
 * cuadro al enfocar un campo.
 *
 * El velo entra sólo con opacidad y el panel además con dos por ciento de
 * escala. Basta: un modal que crece desde la nada llama la atención sobre la
 * animación en vez de sobre lo que hay que decidir.
 */
export function Modal({
  abierto, alCerrar, titulo, descripcion, children, pie, ancho = 460,
}: {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
  /** La fila de acciones. La principal va a la derecha, que es donde se busca. */
  pie?: React.ReactNode;
  ancho?: number;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const cerrar = useCallback(() => alCerrar(), [alCerrar]);
  useCierreExterno(panel, abierto, cerrar);
  useTrampaFoco(panel, abierto);
  useSinScroll(abierto);

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={RAPIDO}
          className="fixed inset-0 z-[200] flex items-end justify-center bg-tinta-950/45
                     backdrop-blur-[2px] sm:items-center sm:p-6"
        >
          <motion.div
            ref={panel}
            role="dialog" aria-modal="true"
            aria-label={titulo}
            aria-describedby={descripcion ? "modal-desc" : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={MEDIO}
            style={{ maxWidth: ancho }}
            className="w-full overflow-hidden rounded-t-[16px] border border-trazo-fino
                       bg-hueso-alto shadow-flota outline-none sm:rounded-[14px]"
          >
            <header className="flex items-start gap-4 px-5 pb-3 pt-5">
              <div className="min-w-0 flex-1">
                <h2 className="text-[16.5px] font-medio leading-snug text-tinta-950">{titulo}</h2>
                {descripcion && (
                  <p id="modal-desc" className="mt-1 text-[13.5px] leading-snug text-tinta-500">
                    {descripcion}
                  </p>
                )}
              </div>
              <BotonIcono rotulo="Cerrar" talla="sm" onClick={cerrar} className="-mr-1 -mt-1">
                <X className="h-4 w-4" />
              </BotonIcono>
            </header>

            <div className="max-h-[min(66vh,560px)] overflow-y-auto px-5 pb-5">{children}</div>

            {pie && (
              <footer className="flex items-center justify-end gap-2 border-t border-trazo-fino
                                 bg-hueso px-5 py-3.5">
                {pie}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * El cajón lateral.
 *
 * El mismo contrato que el diálogo pero entrando desde un borde: es lo que
 * corresponde a algo que acompaña al trabajo en vez de interrumpirlo —la
 * navegación en el teléfono, el copiloto— y por eso no lleva título obligatorio
 * ni pie de acciones.
 */
export function Cajon({
  abierto, alCerrar, lado = "derecha", ancho = 380, rotulo, children,
}: {
  abierto: boolean;
  alCerrar: () => void;
  lado?: "izquierda" | "derecha";
  ancho?: number;
  rotulo: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const cerrar = useCallback(() => alCerrar(), [alCerrar]);
  useCierreExterno(panel, abierto, cerrar);
  useTrampaFoco(panel, abierto);
  useSinScroll(abierto);
  const desde = lado === "derecha" ? ancho : -ancho;

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={RAPIDO}
          className="fixed inset-0 z-[200] bg-tinta-950/40 backdrop-blur-[2px]"
        >
          <motion.aside
            ref={panel}
            role="dialog" aria-modal="true" aria-label={rotulo}
            tabIndex={-1}
            initial={{ x: desde }} animate={{ x: 0 }} exit={{ x: desde }}
            /* Rígido y muy amortiguado: el muelle blando que había tardaba unos
               600 ms en sacar el panel de cuadro, y un cajón que se cierra a
               esa velocidad se lee como retraso y no como respuesta. Sin rebote,
               porque un panel de trabajo que oscila al llegar no es gracioso a
               la vigésima vez. */
            transition={{ type: "spring", stiffness: 560, damping: 46, mass: 0.9 }}
            style={{ width: ancho, maxWidth: "88vw" }}
            className={cx(
              "absolute inset-y-0 flex flex-col bg-hueso-alto shadow-flota outline-none",
              lado === "derecha" ? "right-0 border-l" : "left-0 border-r",
              "border-trazo-fino",
            )}
          >
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
