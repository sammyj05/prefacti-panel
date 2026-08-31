"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cx } from "@/lib/ui";

/**
 * El botón.
 *
 * Había cuatro maneras de escribir un botón en el panel: la clase `.boton` de
 * `globals`, la clase puente `.btn`, y dos variantes largas en línea que se
 * copiaban de pantalla en pantalla —«h-11 rounded-[10px] bg-tinta-950 px-5
 * text-[14.5px]»— con la altura y el cuerpo distintos en cada copia. El
 * resultado se ve en cualquier captura: dos botones contiguos con un píxel de
 * diferencia de alto.
 *
 * Cinco tonos y tres alturas, y nada más. La regla que importa no es cuántos
 * hay sino que en una pantalla sólo uno sea `solido`: si todo pesa igual, no
 * hay acción principal.
 *
 *   solido    la acción de la pantalla. Uno por región.
 *   contorno  la alternativa: mismo peso visual, menos voz.
 *   fantasma  lo terciario. Sin fondo hasta que se pasa por encima.
 *   peligro   lo que destruye. Rojo sólo aquí.
 *   marca     el ladrillo de Prefacti, para lo que además vende.
 *
 * Con `href` sale un enlace y no un botón. No es cosmético: navegar tiene que
 * poder abrirse en otra pestaña, y un `<button onClick={router.push}>` no
 * responde ni al clic central ni al menú contextual.
 */

type Tono = "solido" | "contorno" | "fantasma" | "peligro" | "marca";
type Talla = "sm" | "md" | "lg";

const TONOS: Record<Tono, string> = {
  solido:
    "bg-tinta-950 text-hueso border-transparent hover:bg-tinta-900 " +
    "active:bg-tinta-950",
  contorno:
    "bg-hueso-alto text-tinta-900 border-trazo-medio hover:bg-hueso-mesa " +
    "hover:border-trazo-grueso hover:text-tinta-950",
  fantasma:
    "bg-transparent text-tinta-500 border-transparent hover:bg-hueso-mesa " +
    "hover:text-tinta-950",
  peligro:
    "bg-transparent text-riesgo border-riesgo/35 hover:bg-riesgo/10 " +
    "hover:border-riesgo/60",
  marca:
    "bg-minio-600 text-white border-transparent hover:bg-minio-500 " +
    "active:bg-minio-600",
};

/* Las tres alturas. La de en medio es la de la casa; `lg` es la de los 44 px
   del pliego de accesibilidad y es la que va en todo lo que se toca con el
   pulgar — el cajón de móvil, las hojas y los formularios sueltos. Un objetivo
   de 32 px con el dedo se falla una de cada cinco veces, así que la regla no es
   «engordar todos los botones» sino usar `lg` donde se tocan. */
const TALLAS: Record<Talla, string> = {
  sm: "h-8 px-2.5 text-[13px] gap-1.5 rounded-[8px]",
  md: "h-9 px-3.5 text-[14px] gap-2 rounded-[9px]",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-[10px]",
};

const BASE =
  "relative inline-flex select-none items-center justify-center whitespace-nowrap " +
  "border font-medio transition-[background-color,border-color,color,opacity] " +
  "duration-150 disabled:pointer-events-none disabled:opacity-45";

type Props = {
  tono?: Tono;
  talla?: Talla;
  /** Ocupa todo el ancho disponible. Para formularios y hojas de móvil. */
  ancho?: boolean;
  /** Sustituye el contenido por el giro y desactiva el control. */
  cargando?: boolean;
  href?: string;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">;

export const Boton = forwardRef<HTMLButtonElement, Props>(function Boton(
  { tono = "contorno", talla = "md", ancho, cargando, href, className, children, ...resto },
  ref,
) {
  const clases = cx(BASE, TONOS[tono], TALLAS[talla], ancho && "w-full", className);

  if (href) {
    return (
      <Link href={href} className={clases} aria-disabled={resto.disabled || undefined}>
        {children}
      </Link>
    );
  }

  return (
    <button ref={ref} className={clases} disabled={resto.disabled || cargando} {...resto}>
      {/* El contenido no se quita: se hace invisible. Si desapareciera, el botón
          encogería al ancho del giro y la fila entera se recompondría — que es
          justo el salto que una espera no debe provocar. */}
      <span className={cx("inline-flex items-center gap-[inherit]", cargando && "invisible")}>
        {children}
      </span>
      {cargando && (
        <Loader2 className="absolute h-4 w-4 animate-spin" aria-hidden />
      )}
      {cargando && <span className="sr-only">Cargando</span>}
    </button>
  );
});

/**
 * El botón de sólo icono.
 *
 * Es cuadrado y lleva siempre `aria-label`: sin rótulo visible, el nombre
 * accesible es lo único que tiene un lector de pantalla, y un botón anunciado
 * como «botón» a secas no se puede usar.
 */
export const BotonIcono = forwardRef<
  HTMLButtonElement,
  Omit<Props, "children" | "ancho"> & { rotulo: string; children: React.ReactNode }
>(function BotonIcono(
  { tono = "fantasma", talla = "md", rotulo, className, children, ...resto },
  ref,
) {
  const cuadro = { sm: "h-8 w-8 rounded-[8px]", md: "h-9 w-9 rounded-[9px]", lg: "h-11 w-11 rounded-[10px]" }[talla];
  return (
    <button
      ref={ref}
      aria-label={rotulo}
      title={rotulo}
      className={cx(BASE, TONOS[tono], cuadro, "px-0", className)}
      {...resto}
    >
      {children}
    </button>
  );
});
