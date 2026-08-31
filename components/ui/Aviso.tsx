"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { cx, MEDIO } from "@/lib/ui";

/**
 * Los avisos.
 *
 * El panel no daba ninguna respuesta a nada. Crear una empresa, cambiar el
 * estilo, guardar una preferencia: la acción ocurría y la pantalla no decía
 * nada, así que no había forma de distinguir «hecho» de «no ha llegado a pasar».
 *
 * Tres reglas, y son las tres que suelen romperse:
 *
 * 1. El acierto se va solo; el fallo se queda. Un «guardado» que hay que cerrar
 *    a mano es trabajo añadido por algo que salió bien. Un error que se va solo
 *    a los cuatro segundos es un error que nadie llegó a leer.
 * 2. El aviso no es el sitio donde poner lo importante. Es confirmación de algo
 *    que ya se ve en la pantalla, no el único rastro de que ocurrió.
 * 3. Se apilan hasta tres. A partir de ahí el más viejo se cae: una columna de
 *    ocho tarjetas tapa media pantalla y ninguna se lee.
 *
 * Abajo a la derecha y no arriba en medio: arriba está la banda —que es fija— y
 * un aviso encima de la navegación tapa justo lo que se acaba de usar.
 */

type Tono = "bien" | "mal" | "info";
type Aviso = { id: number; tono: Tono; texto: string; detalle?: string };

const Contexto = createContext<{
  bien: (t: string, d?: string) => void;
  mal: (t: string, d?: string) => void;
  info: (t: string, d?: string) => void;
} | null>(null);

/** El gancho. Fuera del proveedor no rompe: traga el aviso y sigue. */
export function useAviso() {
  const ctx = useContext(Contexto);
  /* Un componente que avisa no debería reventar por estar montado en una
     pantalla sin proveedor —la portada, por ejemplo, que no lleva chasis. */
  return ctx ?? { bien: () => {}, mal: () => {}, info: () => {} };
}

const ICONO = { bien: Check, mal: AlertTriangle, info: Info };
const COLOR: Record<Tono, string> = {
  bien: "text-minio-600",
  mal: "text-riesgo",
  info: "text-tinta-500",
};

export function ProveedorAvisos({ children }: { children: React.ReactNode }) {
  const [lista, setLista] = useState<Aviso[]>([]);
  const siguiente = useRef(1);

  const quitar = useCallback((id: number) => {
    setLista(p => p.filter(a => a.id !== id));
  }, []);

  const anadir = useCallback((tono: Tono, texto: string, detalle?: string) => {
    const id = siguiente.current++;
    setLista(p => [...p, { id, tono, texto, detalle }].slice(-3));
    /* Sólo lo que salió bien se retira solo. Lo que falló espera a que alguien
       lo lea y lo cierre. */
    if (tono !== "mal") setTimeout(() => quitar(id), 4200);
  }, [quitar]);

  const api = useMemo(() => ({
    bien: (t: string, d?: string) => anadir("bien", t, d),
    mal: (t: string, d?: string) => anadir("mal", t, d),
    info: (t: string, d?: string) => anadir("info", t, d),
  }), [anadir]);

  return (
    <Contexto.Provider value={api}>
      {children}
      {/* `polite` y no `assertive`: una confirmación no debe cortar a un lector
          de pantalla en mitad de otra frase. */}
      {/* Por encima del botón del copiloto, que vive en la misma esquina: un
          aviso que aparece justo sobre el único botón flotante de la pantalla
          lo tapa durante los cuatro segundos que dura. */}
      <div aria-live="polite" aria-atomic="false"
           className="pointer-events-none fixed bottom-[4.75rem] right-4 z-[400] flex
                      w-[min(360px,calc(100vw-2rem))] flex-col gap-2 sm:right-6">
        <AnimatePresence initial={false}>
          {lista.map(a => {
            const Ic = ICONO[a.tono];
            return (
              <motion.div
                key={a.id} layout
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 16, scale: 0.97 }}
                transition={MEDIO}
                className="pointer-events-auto flex items-start gap-3 rounded-[10px] border
                           border-trazo-fino bg-hueso-alto px-3.5 py-3 shadow-flota"
              >
                <Ic className={cx("mt-[1px] h-[16px] w-[16px] shrink-0", COLOR[a.tono])} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medio leading-snug text-tinta-950">{a.texto}</p>
                  {a.detalle && (
                    <p className="mt-0.5 text-[12.5px] leading-snug text-tinta-500">{a.detalle}</p>
                  )}
                </div>
                <button onClick={() => quitar(a.id)} aria-label="Cerrar aviso"
                  className="-mr-1 -mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[6px]
                             text-tinta-400 transition hover:bg-hueso-mesa hover:text-tinta-950">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Contexto.Provider>
  );
}
