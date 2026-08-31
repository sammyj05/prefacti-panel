"use client";

import { motion } from "framer-motion";
import { SUAVE } from "@/components/inicio/moderna/piezas";

/**
 * La marca de la primera pantalla, montándose.
 *
 * Dos tiempos, y el orden es lo que la hace legible como construcción:
 *
 *   1 · llegan las letras, una detrás de otra, subiendo desde debajo;
 *   2 · cuando ya están todas, la palabra gana canto: el relieve crece de cero
 *       a su fondo entero.
 *
 * Al revés no funciona. Con el canto puesto desde el principio, lo que se ve es
 * un bloque de tres dimensiones al que le van apareciendo trozos; con el canto
 * al final, se ve una palabra que primero se escribe y después se levanta del
 * papel, que es lo que se quiere contar.
 *
 * Las letras no llevan recorte propio a propósito. Un `overflow-hidden` por
 * letra —el truco de cortina que usa el titular de sección— cortaría el canto
 * de cada una contra la siguiente, porque el relieve sale hacia la derecha y se
 * mete en el hueco de la letra de al lado. Subiendo con opacidad no hay nada
 * que recortar.
 *
 * El espacio no se anima: se pinta y ya. Animar un carácter sin dibujo no se ve
 * y desordena el reparto de tiempos.
 */

const LETRAS = "Prefacti".split("");

/* Lo que tarda la última letra en llegar, para que el canto empiece justo
   después y no encima. */
const PASO = 0.055;
const LETRA = 0.5;
const FIN = PASO * (LETRAS.length - 1) + LETRA;

export function MarcaAnimada({ className }: { className?: string }) {
  return (
    <motion.h1
      className={className}
      /* El canto arranca en cero y sube al final. `--pf-canto` está registrada
         con `@property` en `globals`, así que el navegador la interpola en vez
         de saltar de un valor al otro. */
      initial={{ "--pf-canto": 0 } as never}
      animate={{ "--pf-canto": 1 } as never}
      transition={{ duration: 0.55, delay: FIN - 0.1, ease: SUAVE }}
      aria-label="Prefacti"
    >
      {LETRAS.map((l, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block"
          initial={{ opacity: 0, y: "0.32em" }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: LETRA, delay: i * PASO, ease: SUAVE }}
        >
          {l}
        </motion.span>
      ))}
    </motion.h1>
  );
}
