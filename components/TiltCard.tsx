"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";

/**
 * Inclinación 3D con luz dinámica.
 *
 * Cómo funciona, en tres pasos:
 *  1. Se guarda la posición del puntero dentro de la tarjeta como dos
 *     MotionValue normalizados a −0.5…0.5 (`px`, `py`).
 *  2. `useSpring` los amortigua para que el giro persiga al cursor con
 *     inercia en vez de pegarse a él — es lo que separa un tilt caro de uno
 *     barato.
 *  3. `useTransform` los mapea a `rotateX`/`rotateY` y, en paralelo, mueve el
 *     centro de un `radial-gradient` que hace de reflejo especular.
 *
 * El contenedor lleva `perspective`; la tarjeta, `transform-style: preserve-3d`,
 * para que las capas internas con `translateZ` floten de verdad.
 * Si el sistema pide menos movimiento, se desactiva entero.
 */
export function TiltCard({
  children, className = "", intensity = 8, glare = true,
}: { children: ReactNode; className?: string; intensity?: number; glare?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 260, damping: 26, mass: 0.5 });
  const sy = useSpring(py, { stiffness: 260, damping: 26, mass: 0.5 });

  const rotateY = useTransform(sx, [-0.5, 0.5], [-intensity, intensity]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [intensity, -intensity]);
  const glareX = useTransform(sx, [-0.5, 0.5], ["16%", "84%"]);
  const glareY = useTransform(sy, [-0.5, 0.5], ["10%", "90%"]);
  const glareBg = useTransform(
    [glareX, glareY],
    ([x, y]) => `radial-gradient(320px circle at ${x} ${y}, rgba(255,255,255,.13), transparent 62%)`
  );

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() { px.set(0); py.set(0); }

  /**
   * Con movimiento reducido se apaga el efecto, no el marcado.
   *
   * Antes esta rama devolvía un árbol distinto —un `<div>` pelado en lugar del
   * contenedor con perspectiva—, y eso rompía la hidratación: en el servidor
   * `useReducedMotion` no tiene a quién preguntar y responde que no, así que
   * React pintaba el árbol completo y en el navegador se encontraba el corto.
   * La consola decía «Hydration failed» y la rejilla de fichas se volvía a
   * construir entera en el cliente, que es justo el coste que quien pide menos
   * movimiento suele estar intentando evitar.
   *
   * De ahí el `montado`: el primer renderizado del navegador tiene que ser
   * idéntico al del servidor —misma estructura, mismos atributos, mismo estilo
   * en línea— y la preferencia sólo puede aplicarse a partir del segundo. No
   * bastaba con igualar la estructura: un `style` distinto también es un
   * desajuste, así que la decisión entera se retrasa un renderizado.
   *
   * Lo que se quita entonces es el giro, la escala al pasar y el reflejo. El
   * efecto muere; el marcado se queda.
   */
  const quieto = montado && reduce;

  return (
    <div style={{ perspective: quieto ? undefined : 900 }} className="[&>*]:h-full h-full">
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={quieto ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={quieto ? undefined : { scale: 1.012 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className={`relative ${className}`}
      >
        {children}
        {glare && (
          <motion.div
            aria-hidden
            style={quieto ? undefined : { background: glareBg }}
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0
                       transition-opacity duration-200 [.group:hover_&]:opacity-100"
          />
        )}
      </motion.div>
    </div>
  );
}
