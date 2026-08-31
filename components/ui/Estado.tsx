"use client";

import { cx } from "@/lib/ui";

/**
 * Los estados: cargando, vacío y roto.
 *
 * Las tres pantallas que nadie diseña y todo el mundo ve. El panel no tenía
 * ninguna: mientras cargaban los datos no había nada, un filtro sin resultados
 * dejaba la rejilla en blanco —que se lee como aplicación rota— y un fallo no
 * tenía dónde salir.
 */

/* --------------------------------------------------------------------------
   Esqueleto.

   Un rectángulo del tamaño exacto de lo que va a llegar. Lo que importa no es
   el brillo que lo recorre sino la medida: si el hueco no mide lo mismo que el
   contenido, la página salta al llegar los datos, y ese salto molesta más que
   la espera que el esqueleto venía a disimular.

   El brillo va en `background-position`, que se resuelve sin recalcular
   distribución. Y desaparece con `prefers-reduced-motion`, donde queda el
   rectángulo quieto — que sigue diciendo lo mismo.
   -------------------------------------------------------------------------- */
export function Esqueleto({
  className, alto, ancho, redondo,
}: { className?: string; alto?: number | string; ancho?: number | string; redondo?: boolean }) {
  return (
    <span
      aria-hidden
      style={{ height: alto, width: ancho }}
      className={cx("esqueleto block", redondo ? "rounded-full" : "rounded-[6px]", className)}
    />
  );
}

/** Varias líneas de texto en carga. La última sale corta, como un párrafo real. */
export function EsqueletoTexto({ lineas = 3, className }: { lineas?: number; className?: string }) {
  return (
    <span className={cx("block space-y-2", className)} aria-hidden>
      {Array.from({ length: lineas }, (_, i) => (
        <Esqueleto key={i} alto={11} ancho={i === lineas - 1 ? "62%" : "100%"} />
      ))}
    </span>
  );
}

/** La ficha de la cartera, en carga: anillo, nombre, dos renglones y dos cifras. */
export function EsqueletoFicha() {
  return (
    <div className="rounded-caja border border-trazo-fino bg-hueso-alto p-5">
      <div className="flex items-start gap-4">
        <Esqueleto alto={44} ancho={44} redondo />
        <div className="min-w-0 flex-1 space-y-2">
          <Esqueleto alto={13} ancho="58%" />
          <Esqueleto alto={11} ancho="38%" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-trazo-fino pt-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="space-y-2">
            <Esqueleto alto={9} ancho="70%" />
            <Esqueleto alto={16} ancho="85%" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Filas de tabla en carga, con la misma altura que las de verdad. */
export function EsqueletoTabla({ filas = 6, columnas = 5 }: { filas?: number; columnas?: number }) {
  return (
    <div className="overflow-hidden rounded-pieza border border-trazo-fino">
      {Array.from({ length: filas }, (_, f) => (
        <div key={f}
          className="flex items-center gap-6 border-b border-trazo-fino px-4 last:border-b-0"
          style={{ height: 48 }}>
          {Array.from({ length: columnas }, (_, c) => (
            <Esqueleto key={c} alto={11} className={c === 0 ? "flex-[2]" : "flex-1"} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Estado vacío.

   Icono pequeño, un título corto, una línea y la salida. Nada de ilustración:
   un dibujo grande en el hueco de una lista vacía ocupa el sitio de la
   explicación y no dice ninguna de las dos cosas que hacen falta —por qué está
   vacío y qué hacer ahora.

   La distinción que importa es entre «no hay nada todavía» y «tu filtro no
   encuentra nada»: en el primer caso la salida es crear algo, y en el segundo,
   quitar el filtro. Ofrecer «crear» a quien acaba de filtrar mal es mandarle
   por el camino contrario.
   -------------------------------------------------------------------------- */
export function Vacio({
  icono: Icono, titulo, detalle, accion, compacto,
}: {
  icono?: React.ComponentType<{ className?: string }>;
  titulo: string;
  detalle?: string;
  accion?: React.ReactNode;
  compacto?: boolean;
}) {
  return (
    <div className={cx(
      "flex flex-col items-center justify-center rounded-caja border border-dashed",
      "border-trazo-medio bg-hueso-alto/40 text-center",
      compacto ? "px-5 py-10" : "px-6 py-16",
    )}>
      {Icono && (
        <span className="mb-3.5 grid h-9 w-9 place-items-center rounded-[9px]
                         bg-hueso-mesa text-tinta-400">
          <Icono className="h-[18px] w-[18px]" aria-hidden />
        </span>
      )}
      <h3 className="text-[15px] font-medio text-tinta-950">{titulo}</h3>
      {detalle && <p className="mt-1.5 max-w-[42ch] text-[13.5px] leading-relaxed text-tinta-500">{detalle}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Error.

   Mismo esqueleto que el vacío y distinta lectura: aquí hubo un fallo, no una
   ausencia. Dice qué pasó en lenguaje llano y ofrece reintentar, porque un
   error sin salida obliga a recargar la página entera y perder el sitio.

   El detalle técnico va debajo, en mono y apagado. Sirve para pegarlo en un
   parte de incidencia; no es lo que hay que leer primero.
   -------------------------------------------------------------------------- */
export function Roto({
  titulo = "No se pudo cargar", detalle, tecnico, alReintentar,
}: {
  titulo?: string;
  detalle?: string;
  tecnico?: string;
  alReintentar?: () => void;
}) {
  return (
    <div role="alert"
      className="flex flex-col items-center rounded-caja border border-riesgo/25
                 bg-riesgo/[.04] px-6 py-12 text-center">
      <span className="mb-3.5 grid h-9 w-9 place-items-center rounded-[9px] bg-riesgo/12 text-riesgo">
        <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor"
             strokeWidth="1.7" strokeLinecap="round" aria-hidden>
          <path d="M10 6.2v4.6M10 13.9h.01" />
          <circle cx="10" cy="10" r="7.4" />
        </svg>
      </span>
      <h3 className="text-[15px] font-medio text-tinta-950">{titulo}</h3>
      {detalle && <p className="mt-1.5 max-w-[46ch] text-[13.5px] leading-relaxed text-tinta-500">{detalle}</p>}
      {alReintentar && (
        <button onClick={alReintentar}
          className="mt-5 h-9 rounded-[9px] border border-trazo-medio bg-hueso-alto px-4
                     text-[14px] font-medio text-tinta-900 transition hover:bg-hueso-mesa">
          Reintentar
        </button>
      )}
      {tecnico && (
        <code className="mt-4 max-w-full overflow-x-auto whitespace-pre-wrap break-words
                         font-mono text-[11.5px] text-tinta-400">
          {tecnico}
        </code>
      )}
    </div>
  );
}
