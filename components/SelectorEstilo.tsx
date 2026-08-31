"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Palette } from "lucide-react";
import { ESTILOS, estiloGuardado, ponerEstilo, type Estilo } from "@/lib/estilo";
import { Menu } from "@/components/ui";

/**
 * Elegir el estilo.
 *
 * Cada opción se enseña con lo que va a cambiar —papel, acento y tinta, en tres
 * franjas— y no con su nombre a secas. Un nombre de color no deja decidir; tres
 * muestras del tamaño de una uña, sí.
 *
 * El estado se lee en `useEffect` y no en el primer renderizado a propósito: el
 * servidor no tiene `localStorage`, así que pintar el marcado ya seleccionado
 * daría desajuste de hidratación. Hasta que monte, ninguna opción sale marcada
 * — que dura un fotograma y no se ve, porque el atributo del `<html>` ya lo
 * puso el guion del `<head>` antes del primer pintado.
 */
export function SelectorEstilo({ compacto = false }: { compacto?: boolean }) {
  const [sel, setSel] = useState<Estilo | null>(null);

  useEffect(() => { setSel(estiloGuardado()); }, []);

  function elegir(e: Estilo) {
    setSel(e);
    ponerEstilo(e);
  }

  return (
    <div className={compacto ? "grid gap-1" : "grid gap-3 sm:grid-cols-2"}>
      {ESTILOS.map(e => {
        const on = sel === e.k;
        return (
          <button
            key={e.k}
            onClick={() => elegir(e.k)}
            aria-pressed={on}
            /* Dentro del desplegable la opción elegida no lleva cristal: un
               panel translúcido con desenfoque dentro de otro panel se lee como
               una lámina despegada, y aquí sólo hace falta señalar cuál está
               puesta. El aro que viaja hace ese trabajo entero. */
            className={`group relative flex items-center gap-3.5 rounded-[9px] text-left transition
                        ${compacto ? "px-2.5 py-2" : "rounded-pieza px-4 py-3.5"}
              ${on ? "bg-hueso-mesa" : "hover:bg-hueso-mesa/60"}`}
          >
            {on && (
              <motion.span
                layoutId="estilo-activo"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="pointer-events-none absolute inset-0 rounded-[9px]
                           ring-2 ring-inset ring-minio-600"
              />
            )}

            {/* Las tres franjas: papel, acento, tinta. */}
            <span className={`flex shrink-0 overflow-hidden rounded-control
                              ring-1 ring-inset ring-trazo-medio
                              ${compacto ? "h-7 w-7" : "h-10 w-10 rounded-pieza"}`}>
              {e.m.map(c => (
                <span key={c} className="h-full flex-1" style={{ background: c }} />
              ))}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[14.5px] font-medio text-tinta-950">
                {e.t}
                {on && <Check className="h-3.5 w-3.5 text-minio-600" />}
              </span>
              {!compacto && (
                <span className="mt-0.5 block text-[13px] leading-snug text-tinta-500">{e.d}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * El selector, en un desplegable.
 *
 * Vive en la banda superior porque enterrado en Configuración no lo encuentra
 * nadie: cuatro paletas hechas y ninguna forma de dar con ellas es lo mismo que
 * no tenerlas. Aquí está a un clic desde cualquier pantalla, y como el cambio
 * es inmediato se puede comparar sin salir de lo que se estaba mirando.
 */
export function MenuEstilo({ claro = false }: { claro?: boolean }) {
  return (
    <Menu
      rotulo="Estilo"
      ancho={268}
      lado="derecha"
      disparador={({ alternar, aria }) => (
        <button
          onClick={alternar}
          aria-label="Estilo"
          {...aria}
          className={`grid h-9 w-9 place-items-center rounded-[8px] transition
            ${claro ? "text-white/75 hover:bg-white/15 hover:text-white"
                    : "text-tinta-400 hover:bg-hueso-mesa hover:text-tinta-950"}`}
        >
          <Palette className="h-[17px] w-[17px]" aria-hidden />
        </button>
      )}
    >
      {() => (
        <div className="p-2">
          <p className="nota mb-1.5 px-1.5 text-tinta-400">Estilo</p>
          <SelectorEstilo compacto />
        </div>
      )}
    </Menu>
  );
}
