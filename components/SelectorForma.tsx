"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { EJES, ejeGuardado, ponerEje, type Eje } from "@/lib/estilo";

/**
 * Elegir la forma: canto, superficie y letra.
 *
 * Cada opción se enseña con una maqueta en miniatura que ya lleva puesto lo
 * que va a cambiar —una pieza con su radio, su sombra y su tipo— y no con su
 * nombre a secas. Un nombre no deja decidir; una muestra del tamaño de una
 * uña, sí. Es la misma decisión que se tomó con el selector de color, por la
 * misma razón.
 *
 * El estado se lee en `useEffect` y no en el primer renderizado: el servidor no
 * tiene `localStorage`, y pintar el marcado ya seleccionado daría desajuste de
 * hidratación. Hasta que monte no sale ninguna marcada, lo que dura un
 * fotograma y no se ve — el atributo del `<html>` ya lo puso el guion de la
 * cabecera antes del primer pintado.
 */

/* La maqueta: una pieza con dos renglones y un botón, compuesta con los
   valores que la opción va a imponer. Se dibuja con estilo en línea, no con
   las plantas del sistema, porque tiene que enseñar un valor distinto del que
   está activo en ese momento. */
function Maqueta({ eje, valor }: { eje: Eje; valor: string }) {
  const radio =
    eje.attr === "canto"
      ? { redondo: 11, suave: 5, recto: 2 }[valor] ?? 11
      : 9;
  const sombra =
    eje.attr === "lamina"
      ? {
          elevado: "0 1px 2px rgb(var(--tinta-950) / .06), 0 8px 18px -10px rgb(var(--tinta-950) / .22)",
          plano: "none",
          contorno: "none",
        }[valor] ?? "none"
      : "0 1px 2px rgb(var(--tinta-950) / .06)";
  const filete =
    eje.attr === "lamina" && valor === "contorno"
      ? "1.5px solid var(--trazo-grueso)"
      : "1px solid var(--trazo-fino)";
  const familia =
    eje.attr === "letra"
      ? { editorial: "Fraunces, serif", neutra: "Inter, sans-serif", grotesca: "Archivo, sans-serif" }[valor]
      : "var(--fuente-display), serif";

  return (
    <span
      aria-hidden
      className="grid h-[46px] w-[62px] shrink-0 place-items-center overflow-hidden"
      style={{
        borderRadius: radio, border: filete, boxShadow: sombra,
        background: "rgb(var(--hueso-alto))",
      }}
    >
      <span className="flex flex-col items-center gap-[3px]">
        <span className="leading-none text-tinta-950"
              style={{ fontFamily: familia, fontSize: 15, fontWeight: 600 }}>
          Aa
        </span>
        <span className="h-[2px] w-6 rounded-full bg-trazo-medio" />
        <span className="h-[2px] w-4 rounded-full bg-trazo-fino" />
      </span>
    </span>
  );
}

function EjeSelector({ eje }: { eje: Eje }) {
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => { setSel(ejeGuardado(eje)); }, [eje]);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[14.5px] font-medio text-tinta-950">{eje.rotulo}</span>
        <span className="text-[12.5px] text-tinta-400">{eje.ayuda}</span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {eje.opciones.map(o => {
          const on = sel === o.k;
          return (
            <button
              key={o.k}
              onClick={() => { setSel(o.k); ponerEje(eje, o.k); }}
              aria-pressed={on}
              className={`relative flex items-start gap-3 rounded-pieza border p-3 text-left transition
                ${on ? "border-transparent bg-hueso-mesa" : "border-trazo-fino hover:bg-hueso-mesa"}`}
            >
              {on && (
                <motion.span
                  layoutId={`forma-${eje.attr}`}
                  transition={{ type: "spring", stiffness: 460, damping: 36 }}
                  className="pointer-events-none absolute inset-0 rounded-pieza
                             ring-2 ring-inset ring-minio-600"
                />
              )}
              <Maqueta eje={eje} valor={o.k} />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[13.5px] font-medio text-tinta-950">
                  {o.t}
                  {on && <Check className="h-3.5 w-3.5 shrink-0 text-minio-600" />}
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-tinta-500">
                  {o.d}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SelectorForma() {
  return (
    <div className="grid gap-7">
      {EJES.map(e => <EjeSelector key={e.attr} eje={e} />)}
    </div>
  );
}
