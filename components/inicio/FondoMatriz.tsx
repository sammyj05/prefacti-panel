"use client";

import { useState } from "react";
import { useScroll, useTransform, useMotionValueEvent, motion, AnimatePresence } from "framer-motion";
import { HeatMatrix, type Figura } from "@/components/wild/HeatMatrix";

/**
 * La trama, de arriba abajo de la portada.
 *
 * No es un fondo. Es el hilo de la página: siete figuras que se derrumban unas
 * en otras conforme se baja, y el contenido pasa por delante en paneles opacos
 * que la dejan ver por los lados y entre sección y sección.
 *
 * La diferencia importa. Como fondo atenuado al 34 % era papel pintado: se veía
 * que había algo moviéndose y no se distinguía qué. A plena intensidad, con el
 * texto encima de piezas opacas y huecos entre ellas donde no hay nada, se
 * puede seguir el montaje — que es lo único que justifica tener 4.608 celdas
 * recalculándose.
 *
 * El recorrido cuenta un proyecto entero: el nombre, la manzana donde cae, la
 * torre que sale de la edificabilidad, su planta, la retícula que las relaciona,
 * el reparto de márgenes de la cartera y, al final, la curva de caja. Cada
 * figura es una pregunta más avanzada que la anterior.
 */

const RECORRIDO: { k: Figura; t: string }[] = [
  { k: "palabra", t: "Prefacti" },
  { k: "manzana", t: "La manzana" },
  { k: "torre", t: "La volumetría" },
  { k: "planta", t: "La planta" },
  { k: "red", t: "Las relaciones" },
  { k: "barras", t: "Los márgenes" },
  { k: "curva", t: "El flujo de caja" },
];

const FIGURAS = RECORRIDO.map(r => r.k);

export function FondoMatriz() {
  const { scrollYProgress } = useScroll();
  const [paso, setPaso] = useState(0);

  /* El reparto no es lineal. La primera frontera —la palabra cayendo en la
     manzana— cabe en el 12 % de arriba, o sea en la primera pantalla: el
     edificio es lo primero que hay que ver y con un reparto plano no llegaba
     hasta un séptimo de la página. Las seis restantes se reparten el resto. */
  const tramos = RECORRIDO.length - 1;
  const avance = useTransform(
    scrollYProgress,
    [0, 0.12, 0.88],
    [0, 1 / tramos, 1],
    { clamp: true });

  /* Plena intensidad en la primera pantalla, que no lleva texto ninguno, y 42 %
     a partir de ahí.

     Al reescribir este componente para las siete figuras se quedó sin control
     de opacidad y la trama se pintaba al 100 % de arriba abajo: sobre eso, el
     texto que no estuviera en una lámina no se leía —y en oscuro, con la trama
     en salmón sobre casi negro, tampoco el que sí lo estaba, porque el mosaico
     se colaba por los cantos.

     No es volver al fondo atenuado que hubo antes. Entonces era el 34 % sobre
     una página sin huecos, así que la trama sólo asomaba por debajo de bloques
     de texto y no se distinguía qué dibujaba. Ahora hay siete tramos de 55 a
     70 vh sin nada delante: ahí se ve entera. */
  const opacidad = useTransform(
    scrollYProgress, [0, 0.11, 0.17, 0.9, 1], [1, 1, 0.42, 0.42, 0.22]);

  /* El rótulo sigue a la figura que está montada, no a la que se está
     montando: se cambia pasado el medio de cada frontera. */
  useMotionValueEvent(avance, "change", v => {
    const p = Math.min(RECORRIDO.length - 1, Math.round(v * tramos));
    if (p !== paso) setPaso(p);
  });

  return (
    <>
      <motion.div
        aria-hidden
        style={{ opacity: opacidad, contain: "strict", willChange: "opacity" }}
        className="fixed inset-0 z-0"
      >
        <HeatMatrix alto="h-full" avance={avance} figuras={FIGURAS} />
      </motion.div>

      {/* El rótulo de lo que se está formando. Va fijo abajo a la izquierda,
          fuera del flujo del contenido, porque nombra la capa de atrás y no la
          sección que se esté leyendo. */}
      <div className="pointer-events-none fixed bottom-6 left-6 z-20 hidden items-baseline gap-3
                      rounded-full bg-hueso/85 px-4 py-2 backdrop-blur-sm md:flex">
        <span className="nota tabular-nums text-tinta-400">
          {String(paso + 1).padStart(2, "0")}/{String(RECORRIDO.length).padStart(2, "0")}
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={paso}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="font-display text-[19px] leading-none text-tinta-950"
          >
            {RECORRIDO[paso].t}
          </motion.span>
        </AnimatePresence>
      </div>
    </>
  );
}

/**
 * Un hueco donde sólo se ve la trama.
 *
 * Entre panel y panel hace falta aire de verdad, no un margen: es donde el
 * derrumbe se ve entero. Sin estos huecos, las figuras cambiarían siempre
 * detrás de un bloque de texto y no se vería ninguna terminar.
 */
export function Escena({ alto = "h-[70vh]" }: { alto?: string }) {
  return <div aria-hidden className={alto} />;
}
