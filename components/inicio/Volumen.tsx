"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import type { Edificio } from "@/lib/data";
import { moneyC, num, pct, m2 } from "@/lib/format";
import { SUAVE } from "@/components/anim/Scroll";
import { CampoPixeles } from "@/components/inicio/CampoPixeles";

const Massing3D = dynamic(() => import("@/components/Massing3D").then(m => m.Massing3D), {
  ssr: false,
  loading: () => (
    <div className="grid h-[440px] place-items-center bg-vidrio-hondo">
      <span className="nota text-tinta-400">Cargando volumetría</span>
    </div>
  ),
});

/**
 * La volumetría, en la portada.
 *
 * Es la única pieza tridimensional de verdad de toda la página, y no está para
 * decorar: es lo que la herramienta hace. Un visitante puede arrastrarla y
 * girarla antes de haber creado una cuenta, que convence más que cualquier
 * frase sobre modelado.
 *
 * El volumen sale de los mismos números que las cifras de al lado —superficie,
 * plantas, retranqueos— y no de un modelo aparte. Ése es el argumento entero de
 * Prefacti, y aquí se puede comprobar en vez de leerlo.
 *
 * Van tres promociones y no una. Un solo modelo enseña que hay volumetría;
 * tres —una torre de cuarenta y cuatro plantas, una de veintiséis y un bloque
 * de siete— enseñan que la volumetría sale del dato, porque al cambiar de
 * pestaña cambian a la vez la forma y las ocho cifras de al lado. Con un solo
 * ejemplo eso hay que creérselo; con tres, se comprueba.
 *
 * Un único lienzo para las tres. Tres `Canvas` de WebGL a la vez en la portada
 * son tres contextos de GPU compitiendo por el mismo cuadro, y dos de ellos
 * estarían siempre fuera de la vista.
 */
export function Volumen({ opciones }: { opciones: Edificio[] }) {
  const [i, setI] = useState(0);
  /* Sin promociones no hay sección. Devolver `null` en vez de dejar que
     `opciones[0]` sea `undefined`: mientras la portada pasaba de una
     volumetría a tres, una lista vacía tiraba la página entera con un 500. */
  if (opciones.length === 0) return null;
  const e = opciones[i] ?? opciones[0];

  const DATOS = [
    ["Plantas", num(e.floors)],
    ["Altura", `${e.alturaM} m`],
    ["m² construcción", m2(e.gba)],
    ["m² vendibles", m2(e.gla)],
    ["Eficiencia", pct(e.gla / e.gba)],
    ["Unidades", num(e.unidades)],
    ["Ingresos", moneyC(e.ventas)],
    ["Margen", pct(e.margen)],
  ] as const;

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] lg:gap-16">
      <div className="caja-tras">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.9, ease: SUAVE }}
        className="lamina overflow-hidden rounded-hueco"
      >
        {/* Tres capas en la misma escena: el campo de píxeles al fondo, el
            edificio en medio con el lienzo transparente, y unas pocas celdas
            por delante. Antes el modelo flotaba sobre un gris liso y se leía
            como una imagen pegada; ahora la trama de la página entra dentro de
            la pieza y sale por encima del edificio. */}
        <div className="relative">
          <CampoPixeles
            cols={56} filas={30} semilla={e.floors} densidad={0.2}
            className="absolute inset-0"
          />
          <div className="relative">
            <Massing3D e={e} transparente altura={440} />
          </div>
          <CampoPixeles
            cols={56} filas={30} semilla={e.floors + 17} densidad={0.05} gravedad={0.2}
            delante
            className="absolute inset-0"
          />
        </div>

        <p className="relative border-t border-trazo-fino px-6 py-4 text-[12.5px] text-tinta-400">
          Arrastra para girar · rueda para acercar
        </p>
      </motion.div>
      </div>

      <div className="flex flex-col justify-center">
        {/* El conmutador. Va arriba de la ficha y no bajo el modelo porque lo
            que se elige no es una vista del mismo edificio: son tres edificios
            distintos, y eso manda sobre todo lo que hay debajo. */}
        <div className="mb-8 flex flex-wrap gap-1">
          {opciones.map((o, k) => (
            <button
              key={o.id}
              onClick={() => setI(k)}
              className={`relative rounded-full px-4 py-2 text-[13.5px] transition
                ${k === i ? "font-medio text-tinta-950" : "text-tinta-500 hover:text-tinta-950"}`}
            >
              {k === i && (
                <motion.span layoutId="volumen-activo"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="lamina absolute inset-0 -z-10 rounded-full" />
              )}
              {o.floors} plantas
            </button>
          ))}
        </div>

        <span className="nota">{e.distrito} · {e.etapa}</span>
        <AnimatePresence mode="wait">
          <motion.h3
            key={e.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: SUAVE }}
            className="mt-5 font-display text-[clamp(2rem,3.4vw,3rem)] leading-[1.04] text-tinta-950"
          >
            {e.nombre}
          </motion.h3>
        </AnimatePresence>
        <p className="mt-5 max-w-[26rem] text-[16px] leading-relaxed text-tinta-700">
          El volumen sale de las mismas cifras que la ficha. No hay dos modelos.
        </p>

        <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-trazo-fino pt-8">
          {/* `n` y no `i`: `i` es la pestaña elegida y está en el ámbito de
              fuera. Sombrearla aquí funcionaba y se leía como un error. */}
          {DATOS.map(([k, v], n) => (
            <motion.div
              key={`${e.id}-${k}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: n * 0.03, ease: SUAVE }}
            >
              <dt className="nota text-[9.5px]">{k}</dt>
              <dd className="cifra mt-1.5 text-[25px] text-tinta-950">{v}</dd>
            </motion.div>
          ))}
        </dl>

        <p className="mt-8 text-[12.5px] text-tinta-400">
          Cartera Aravena — datos de demostración
        </p>
      </div>
    </div>
  );
}
