"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, animate, type Variants } from "framer-motion";

/**
 * Primitivas de animación de la portada.
 *
 * Están juntas en un módulo porque comparten la misma curva y el mismo criterio
 * de disparo: todo entra al 30 % de visibilidad, una sola vez, con la curva de
 * salida rápida que usa el resto del panel — `[0.16, 1, 0.3, 1]`. Repetir esos
 * tres valores en cada sección era garantía de que a la tercera corrección una
 * sección animara distinto que las demás sin que nadie supiera por qué.
 *
 * Ninguna anima opacidad desde 0 sobre texto largo: un párrafo que aparece
 * entero se lee como parpadeo. Los bloques de texto suben; sólo los rótulos y
 * las cifras se atenúan.
 */

export const SUAVE = [0.16, 1, 0.3, 1] as const;

/* -------------------------------------------------------------------------- */

/** Sube un bloque al entrar en pantalla. `retraso` escalona hermanos. */
export function Revelar({
  children,
  retraso = 0,
  y = 22,
  className = "",
}: {
  children: React.ReactNode;
  retraso?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay: retraso, ease: SUAVE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */

const PALABRA: Variants = {
  quieto: { y: "112%" },
  entra: { y: "0%" },
};

/**
 * Titular que entra palabra por palabra desde debajo de su propia línea.
 *
 * Cada palabra va en un contenedor con `overflow: hidden`, así que no se
 * atenúa: sale de detrás del borde de la línea, que es lo que hace que el
 * movimiento se lea como tipografía y no como una diapositiva.
 *
 * El `padding-bottom` del envoltorio no es un ajuste fino: los descendentes de
 * la *g* y la *p* del serif de titular caen por debajo de la caja de línea y
 * `overflow: hidden` los cortaba en seco.
 */
export function Titular({
  texto,
  className = "",
  retraso = 0,
  como: Como = "h2",
}: {
  texto: string;
  className?: string;
  retraso?: number;
  como?: "h1" | "h2" | "h3";
}) {
  return (
    <Como className={className}>
      <motion.span
        initial="quieto"
        whileInView="entra"
        viewport={{ once: true, amount: 0.4 }}
        transition={{ staggerChildren: 0.055, delayChildren: retraso }}
        className="inline"
      >
        {texto.split(" ").map((p, i) => (
          <span
            key={`${p}-${i}`}
            className="inline-block overflow-hidden pb-[0.14em] align-bottom"
          >
            <motion.span
              variants={PALABRA}
              transition={{ duration: 0.85, ease: SUAVE }}
              className="inline-block"
            >
              {p}
              {" "}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Como>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Cifra que cuenta hasta su valor al entrar en pantalla.
 *
 * El formateo se inyecta porque las cifras de la cartera no comparten formato:
 * unas son dinero compacto, otras porcentaje, otras conteo. El componente sólo
 * sabe interpolar; qué significa el número es de quien lo pide.
 *
 * Escribe en el nodo por `ref` en vez de con estado: son varias cifras a la vez
 * durante casi un segundo, y cada fotograma de cada una sería un renderizado.
 */
export function Cifra({
  a,
  formato,
  duracion = 1.4,
  retraso = 0,
  className = "",
}: {
  a: number;
  formato: (n: number) => string;
  duracion?: number;
  retraso?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const enVista = useInView(ref, { once: true, amount: 0.6 });
  const mv = useMotionValue(0);

  useEffect(() => {
    if (!enVista) return;
    const nodo = ref.current;
    if (!nodo) return;

    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (quieto) {
      nodo.textContent = formato(a);
      return;
    }

    const parar = mv.on("change", v => { nodo.textContent = formato(v); });
    const ctrl = animate(mv, a, { duration: duracion, delay: retraso, ease: SUAVE });
    return () => { parar(); ctrl.stop(); };
  }, [enVista, a, formato, duracion, retraso, mv]);

  /* El valor final va en el marcado para que exista sin JavaScript y para que
     el ancho de la caja no salte cuando el contador arranque desde cero. */
  return <span ref={ref} className={className}>{formato(0)}</span>;
}

/* -------------------------------------------------------------------------- */

/**
 * Desfile horizontal continuo.
 *
 * La lista se pinta dos veces y la tira se desplaza exactamente la mitad de su
 * ancho: al terminar el ciclo, la segunda copia está donde arrancó la primera y
 * el salto es invisible. Va en CSS —no en `framer-motion`— porque es una
 * animación perpetua: en el hilo compositor no cuesta nada, y en JavaScript
 * costaría un fotograma por cada uno mientras la página esté abierta.
 */
export function Desfile({
  piezas,
  segundos = 42,
}: {
  piezas: string[];
  segundos?: number;
}) {
  const doble = [...piezas, ...piezas];
  return (
    <div className="relative overflow-hidden py-5">
      <div
        className="desfile flex w-max items-center gap-10"
        style={{ animationDuration: `${segundos}s` }}
      >
        {doble.map((p, i) => (
          <span key={i} className="flex shrink-0 items-center gap-10">
            {/* En `tinta-400` sobre la lámina oscura del tema oscuro esto era
                gris sobre gris. La tira es un rótulo, no una nota al pie. */}
            <span className="whitespace-nowrap font-display text-[clamp(1.4rem,2.6vw,2.2rem)]
                             text-tinta-700">
              {p}
            </span>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-minio-500/60" />
          </span>
        ))}
      </div>
      {/* Los extremos se disuelven, o la tira aparece y desaparece de golpe
          contra el borde. En el color de la lámina y no en el del papel: vive
          dentro de un panel opaco, y contra `hueso` se veían dos bandas más
          claras justo en los bordes. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-24
                                  bg-gradient-to-r from-hueso-alto to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-24
                                  bg-gradient-to-l from-hueso-alto to-transparent" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Botón que se inclina hacia el puntero.
 *
 * El desplazamiento está topado a 6 px: lo justo para que el botón parezca
 * responder al puntero antes de que llegue. Más que eso y el objetivo se
 * escapa del cursor, que es exactamente lo contrario de lo que se busca.
 */
export function Iman({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [d, setD] = useState({ x: 0, y: 0 });

  return (
    <motion.span
      ref={ref}
      onPointerMove={e => {
        const c = ref.current?.getBoundingClientRect();
        if (!c) return;
        setD({
          x: Math.max(-6, Math.min(6, (e.clientX - (c.left + c.width / 2)) * 0.22)),
          y: Math.max(-6, Math.min(6, (e.clientY - (c.top + c.height / 2)) * 0.3)),
        });
      }}
      onPointerLeave={() => setD({ x: 0, y: 0 })}
      animate={{ x: d.x, y: d.y }}
      transition={{ type: "spring", stiffness: 260, damping: 18, mass: 0.4 }}
      className={`inline-flex ${className}`}
    >
      {children}
    </motion.span>
  );
}
