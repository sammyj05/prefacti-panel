"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/ui";

/**
 * Los controles de captura del estudio.
 *
 * No usan `Campo` de la caja de primitivas a propósito: aquel envoltorio marca
 * lo opcional y da aire de formulario suelto, y esto es una hoja de cálculo
 * con cuarenta casillas donde cada píxel vertical cuenta. Mismo dibujo de
 * control —canto, foco, aro— en talla compacta.
 *
 * El valor viaja como lo guarda el producto (número o cadena vacía) y el campo
 * edita un texto local mientras tiene el foco: formatear debajo de los dedos
 * mueve el cursor y hace imposible teclear «1250000».
 */

export function CampoNum({
  rotulo, valor, alCambiar, sufijo, deshabilitado, entero, ayuda,
}: {
  rotulo: string;
  valor: number | string | null | undefined;
  alCambiar: (v: string) => void;
  sufijo?: string;
  deshabilitado?: boolean;
  entero?: boolean;
  ayuda?: string;
}) {
  const externo = valor == null ? "" : String(valor);
  const [texto, setTexto] = useState(externo);
  const [conFoco, setConFoco] = useState(false);
  useEffect(() => { if (!conFoco) setTexto(externo); }, [externo, conFoco]);

  return (
    <label className="block min-w-0">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[12px] font-medio text-tinta-700" title={rotulo}>
          {rotulo}
        </span>
        {sufijo && <span className="shrink-0 font-mono text-[10.5px] text-tinta-400">{sufijo}</span>}
      </span>
      <input
        type="text"
        inputMode={entero ? "numeric" : "decimal"}
        value={texto}
        disabled={deshabilitado}
        onFocus={() => setConFoco(true)}
        onBlur={() => setConFoco(false)}
        onChange={ev => {
          const t = ev.target.value;
          setTexto(t);
          alCambiar(t);
        }}
        className={cx(
          "h-8 w-full rounded-[7px] border border-trazo-medio bg-hueso-alto px-2.5",
          "text-right text-[13.5px] tabular-nums text-tinta-950 outline-none",
          "transition-[border-color,box-shadow] duration-150",
          "hover:border-trazo-grueso focus:border-cian-500 focus:ring-[3px] focus:ring-cian-500/18",
          "disabled:cursor-not-allowed disabled:bg-hueso-mesa disabled:text-tinta-400",
        )}
      />
      {ayuda && <span className="mt-1 block text-[11px] leading-snug text-tinta-400">{ayuda}</span>}
    </label>
  );
}

export function CampoFecha({
  rotulo, valor, alCambiar, deshabilitado,
}: {
  rotulo: string;
  valor: string | null | undefined;
  alCambiar: (v: string) => void;
  deshabilitado?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block truncate text-[12px] font-medio text-tinta-700" title={rotulo}>
        {rotulo}
      </span>
      <input
        type="date"
        value={valor ?? ""}
        disabled={deshabilitado}
        onChange={ev => alCambiar(ev.target.value)}
        className={cx(
          "h-8 w-full rounded-[7px] border border-trazo-medio bg-hueso-alto px-2.5",
          "text-[13px] tabular-nums text-tinta-950 outline-none",
          "transition-[border-color,box-shadow] duration-150",
          "hover:border-trazo-grueso focus:border-cian-500 focus:ring-[3px] focus:ring-cian-500/18",
          "disabled:cursor-not-allowed disabled:bg-hueso-mesa disabled:text-tinta-400",
        )}
      />
    </label>
  );
}

export function CampoTexto({
  rotulo, valor, alCambiar, deshabilitado, marcador,
}: {
  rotulo: string;
  valor: string | null | undefined;
  alCambiar: (v: string) => void;
  deshabilitado?: boolean;
  marcador?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block truncate text-[12px] font-medio text-tinta-700" title={rotulo}>
        {rotulo}
      </span>
      <input
        type="text"
        value={valor ?? ""}
        placeholder={marcador}
        disabled={deshabilitado}
        onChange={ev => alCambiar(ev.target.value)}
        className={cx(
          "h-8 w-full rounded-[7px] border border-trazo-medio bg-hueso-alto px-2.5",
          "text-[13.5px] text-tinta-950 outline-none placeholder:text-tinta-400",
          "transition-[border-color,box-shadow] duration-150",
          "hover:border-trazo-grueso focus:border-cian-500 focus:ring-[3px] focus:ring-cian-500/18",
          "disabled:cursor-not-allowed disabled:bg-hueso-mesa disabled:text-tinta-400",
        )}
      />
    </label>
  );
}

/** El rótulo de grupo de un formulario del estudio. */
export function TituloGrupo({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-trazo-fino pb-1.5">
      <h4 className="nota">{children}</h4>
      {extra}
    </div>
  );
}
