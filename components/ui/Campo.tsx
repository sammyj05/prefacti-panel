"use client";

import { forwardRef, useId } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cx } from "@/lib/ui";

/**
 * Los controles de formulario.
 *
 * `Campo` es el envoltorio —rótulo, ayuda y error— y `Entrada`, `Lista` y
 * `Area` son los tres controles. Van separados porque el envoltorio es lo que
 * de verdad estaba mal: los formularios del panel llevaban el rótulo como un
 * `<span>` suelto encima del `<input>`, sin `htmlFor`, de modo que pulsar sobre
 * «Nombre» no enfocaba nada y un lector de pantalla anunciaba el campo sin
 * nombre.
 *
 * El identificador lo genera `useId`, no quien llama. Un identificador escrito a
 * mano se repite en cuanto el mismo formulario sale dos veces en una pantalla —
 * y entonces el rótulo del segundo enfoca el campo del primero.
 *
 * El error nunca sustituye a la ayuda: la reemplaza en pantalla pero se anuncia
 * en `aria-describedby` junto a ella, porque quien acaba de fallar el formato
 * necesita las dos cosas —qué pasó y cuál era la regla.
 */

export function Campo({
  rotulo, ayuda, error, requerido, children, className, id: idFuera,
}: {
  rotulo: string;
  ayuda?: string;
  error?: string;
  requerido?: boolean;
  className?: string;
  id?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}) {
  const auto = useId();
  const id = idFuera ?? auto;
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;
  const descrito = [idError, idAyuda].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("min-w-0", className)}>
      {/* Se marca lo opcional, no lo obligatorio.
          Un asterisco rojo en cada campo de un formulario donde casi todo es
          obligatorio no informa de nada —si todos lo llevan, ninguno lo dice— y
          además mete el color de alarma en una pantalla donde aún no ha fallado
          nada. Marcando la excepción, la etiqueta aparece dos veces en lugar de
          seis y significa algo cada vez. */}
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-1.5">
        <span className="text-[13px] font-medio text-tinta-900">{rotulo}</span>
        {!requerido && <span className="text-[12px] font-libro text-tinta-400">opcional</span>}
      </label>

      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": descrito })}

      {error ? (
        <p id={idError} role="alert"
           className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug text-riesgo">
          <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : ayuda ? (
        <p id={idAyuda} className="mt-1.5 text-[12.5px] leading-snug text-tinta-500">{ayuda}</p>
      ) : null}
    </div>
  );
}

/* El dibujo común a los tres controles. El foco marca el canto y añade un aro
   muy diluido: sólo el aro se lee como halo de plantilla, y sólo el canto no se
   ve sobre fondo claro. */
const CONTROL =
  "w-full rounded-[8px] border bg-hueso-alto text-[14px] text-tinta-950 " +
  "outline-none transition-[border-color,box-shadow,background-color] duration-150 " +
  "placeholder:text-tinta-400 " +
  "hover:border-trazo-grueso " +
  "focus:border-cian-500 focus:ring-[3px] focus:ring-cian-500/18 " +
  "disabled:cursor-not-allowed disabled:bg-hueso-mesa disabled:text-tinta-400 " +
  "aria-[invalid=true]:border-riesgo aria-[invalid=true]:focus:ring-riesgo/18";

export const Entrada = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Entrada({ className, ...resto }, ref) {
    return <input ref={ref} className={cx(CONTROL, "h-9 border-trazo-medio px-3", className)} {...resto} />;
  });

export const Area = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Area({ className, rows = 3, ...resto }, ref) {
    return (
      <textarea ref={ref} rows={rows}
        className={cx(CONTROL, "resize-y border-trazo-medio px-3 py-2 leading-relaxed", className)}
        {...resto} />
    );
  });

/**
 * El desplegable nativo.
 *
 * Nativo a propósito: en el móvil abre la rueda del sistema, que es infinitamente
 * mejor que cualquier lista que se pueda dibujar, y responde al teclado sin una
 * línea de código. Lo único que se le quita es la flecha del navegador —que
 * cambia de dibujo en cada uno— y se pone la de la casa.
 */
export const Lista = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Lista({ className, children, ...resto }, ref) {
    return (
      <span className="relative block">
        <select ref={ref}
          className={cx(CONTROL, "h-9 appearance-none border-trazo-medio pl-3 pr-9", className)}
          {...resto}>
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-400"
          aria-hidden />
      </span>
    );
  });

/**
 * La casilla.
 *
 * El control nativo se queda debajo, invisible pero presente: es lo que da el
 * foco, la barra espaciadora y el anuncio correcto al lector de pantalla. Lo que
 * se ve es el cuadro dibujado al lado, que sigue su estado con `peer-checked`.
 */
export function Casilla({
  marcada, alCambiar, rotulo, detalle, deshabilitada,
}: {
  marcada: boolean;
  alCambiar: (v: boolean) => void;
  rotulo: string;
  detalle?: string;
  deshabilitada?: boolean;
}) {
  return (
    <label className={cx(
      "flex cursor-pointer items-start gap-3 rounded-[8px] px-2.5 py-2 transition-colors",
      deshabilitada ? "cursor-not-allowed opacity-45" : "hover:bg-hueso-mesa",
    )}>
      <input
        type="checkbox" checked={marcada} disabled={deshabilitada}
        onChange={e => alCambiar(e.target.checked)}
        className="peer sr-only"
      />
      {/* La marca se apunta con un selector hijo —`peer-checked:[&>svg]`— y no
          con `peer-checked` a secas sobre el `<svg>`: la variante de Tailwind
          compila a hermano general (`~`), y el dibujo no es hermano del control
          sino nieto, así que la regla no llegaría a alcanzarlo. */}
      <span
        aria-hidden
        className="mt-[1px] grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[5px]
                   border border-trazo-medio transition-colors
                   peer-checked:border-transparent peer-checked:bg-minio-600
                   peer-checked:[&>svg]:opacity-100
                   peer-focus-visible:outline peer-focus-visible:outline-2
                   peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cian-500"
      >
        <svg viewBox="0 0 12 12" className="h-3 w-3 text-white opacity-0 transition-opacity"
             fill="none" stroke="currentColor" strokeWidth="2.2"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.2 4.8 8.5 9.5 3.5" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medio text-tinta-950">{rotulo}</span>
        {detalle && <span className="mt-0.5 block text-[12.5px] leading-snug text-tinta-500">{detalle}</span>}
      </span>
    </label>
  );
}
