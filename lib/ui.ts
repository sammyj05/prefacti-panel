"use client";

import { useEffect, useRef } from "react";

/**
 * Las constantes del sistema y los tres ganchos que todo control comparte.
 *
 * Estaban repartidas por veinte ficheros: la curva de easing declarada seis
 * veces, el cierre al pulsar fuera escrito cuatro, y ningún modal con trampa de
 * foco. Un producto se reconoce por que todos sus menús se cierran igual, y eso
 * sólo pasa si se cierran con el mismo código.
 */

/* --------------------------------------------------------------------------
   Movimiento.

   Dos curvas y tres duraciones, y nada más. La primera es la de salida suave
   que usa el sitio entero —arranca rápido y frena largo, que es como se mueve
   algo con masa—; la segunda es el muelle de los indicadores que viajan.

   Las duraciones son cortas a propósito. Una interfaz de trabajo se toca cien
   veces al día: a 400 ms cada apertura, el movimiento deja de leerse como
   respuesta y empieza a leerse como espera.
   -------------------------------------------------------------------------- */
export const SUAVE = [0.16, 1, 0.3, 1] as const;
export const MUELLE = { type: "spring", stiffness: 460, damping: 38 } as const;

export const RAPIDO = { duration: 0.18, ease: SUAVE } as const;
export const MEDIO = { duration: 0.28, ease: SUAVE } as const;
export const LENTO = { duration: 0.45, ease: SUAVE } as const;

/** La entrada de un panel flotante: baja seis píxeles y se asienta. */
export const ENTRA_PANEL = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: RAPIDO,
} as const;

/** La entrada de una sección al aparecer: sólo opacidad y doce píxeles. */
export const ENTRA_SECCION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: LENTO,
} as const;

/** Junta clases descartando lo falso. Sustituye a los ternarios encadenados. */
export function cx(...partes: (string | false | null | undefined)[]) {
  return partes.filter(Boolean).join(" ");
}

/**
 * Cerrar al pulsar fuera y con la tecla de escape.
 *
 * Las dos cosas van juntas porque separadas no sirven: un menú que sólo se
 * cierra volviendo a pulsar su propio botón obliga a apuntar dos veces al mismo
 * sitio, y uno sin escape deja atrapado a quien navega con teclado.
 *
 * Escucha `mousedown` y no `click`. Con `click`, un menú cuyo contenido se
 * reordena al pulsar —marcar una casilla, por ejemplo— se cierra solo: entre el
 * `mousedown` y el `click` el elemento que había bajo el cursor ha cambiado, y
 * el destino del evento ya no está dentro del panel.
 */
export function useCierreExterno(
  ref: React.RefObject<HTMLElement | null>,
  activo: boolean,
  alCerrar: () => void,
) {
  useEffect(() => {
    if (!activo) return;
    const fuera = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) alCerrar();
    };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") alCerrar(); };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("touchstart", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("touchstart", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [activo, alCerrar, ref]);
}

/* Todo lo que puede recibir foco dentro de un contenedor, en orden de tabulador. */
const ENFOCABLES = [
  "a[href]", "button:not([disabled])", "input:not([disabled])",
  "select:not([disabled])", "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Trampa de foco.
 *
 * Mientras un diálogo está abierto, el tabulador tiene que dar la vuelta dentro
 * de él. Sin esto el foco se escapa al contenido de detrás —que además está
 * tapado por el velo— y quien navega con teclado se queda pulsando tabulador
 * sobre elementos que no puede ver.
 *
 * Al cerrarse devuelve el foco a donde estaba. Es la mitad que casi siempre
 * falta: abrir y cerrar un diálogo no debería costar la posición en la página.
 */
export function useTrampaFoco(
  ref: React.RefObject<HTMLElement | null>,
  activo: boolean,
) {
  const previo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!activo) return;
    previo.current = document.activeElement as HTMLElement | null;

    const caja = ref.current;
    /* El primer enfocable, o el propio contenedor si no hay ninguno: un
       diálogo cuyo foco sigue fuera no responde al escape. */
    const primero = caja?.querySelector<HTMLElement>(ENFOCABLES);
    (primero ?? caja)?.focus?.();

    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !caja) return;
      const lista = Array.from(caja.querySelectorAll<HTMLElement>(ENFOCABLES))
        .filter(el => el.offsetParent !== null || el === document.activeElement);
      if (!lista.length) { e.preventDefault(); return; }
      const uno = lista[0], fin = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === uno) { e.preventDefault(); fin.focus(); }
      else if (!e.shiftKey && document.activeElement === fin) { e.preventDefault(); uno.focus(); }
    };
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("keydown", tecla);
      previo.current?.focus?.();
    };
  }, [activo, ref]);
}

/**
 * Bloquear el desplazamiento del fondo.
 *
 * Se compensa el ancho de la barra con relleno a la derecha. Sin esa
 * compensación la página entera da un salto lateral al abrir cualquier diálogo,
 * que es el detalle que más delata a una interfaz sin repasar.
 */
export function useSinScroll(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const { overflow, paddingRight } = document.body.style;
    const hueco = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (hueco > 0) document.body.style.paddingRight = `${hueco}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [activo]);
}
