"use client";

import { AlertTriangle, Check, Info } from "lucide-react";
import { Lista } from "@/components/ui";
import { configChequeos, conConfigChequeos, ejecutarChequeos } from "@/lib/motor/chequeos.js";
import { paisesDisponibles, TARGETS } from "@/lib/motor/presupuestoModelo.js";
import type { DatosEstudio } from "@/lib/estudioLocal";
import type { Resultado } from "./useEstudio";

/**
 * Chequeos de coherencia: revisan el conjunto y avisan. Nunca bloquean, nunca
 * corrigen solos y nunca inventan un dato para poder opinar — si falta el
 * insumo de un chequeo, ese chequeo no corre. Los textos son los del producto.
 */

const TEXTOS: Record<string, { tit: string; det: (p: Record<string, string | number>) => string; }> = {
  ratio: {
    tit: "Ratio de eficiencia fuera de rango",
    det: p => `El ratio es ${p.valor} % y lo típico está entre ${p.min} % y ${p.max} %. Revisa las áreas de construcción y vendible.`,
  },
  areaMayor: {
    tit: "Área vendible mayor que la construida",
    det: p => `Vendible ${p.venta} m² contra ${p.construccion} m² de construcción. Casi siempre es un error de captura.`,
  },
  costoM2: {
    tit: "Costo por m² fuera del rango de referencia",
    det: p => `El costo directo es $${p.valor} por m² y el rango del segmento es $${p.min}–$${p.max}. Revisa el presupuesto o cambia la referencia.`,
  },
  margenNegativo: {
    tit: "Margen negativo",
    det: p => `El margen es ${p.valor} %. El proyecto no cubre su costo con los precios capturados.`,
  },
  margenAlto: {
    tit: "Margen inusualmente alto",
    det: p => `El margen es ${p.valor} %. Por encima de 45 % suele faltar un costo, no sobrar rentabilidad.`,
  },
  interesCero: {
    tit: "Interés en cero con plazo largo",
    det: p => `El plazo de obra es de ${p.plazo} meses y el interés capturado es cero. Si hay financiamiento, falta cargarlo.`,
  },
  precioBajoCosto: {
    tit: "Precio de venta por debajo del costo",
    det: p => `Precio $${p.precio} por m² vendible contra un costo de $${p.costo}. Revisa precios o costos.`,
  },
  unidades: {
    tit: "Unidades descuadradas",
    det: p => `El cuadro tiene ${p.cuadro} unidades y la factibilidad ${p.factibilidad}. Los dos números deberían coincidir.`,
  },
};

const HOJA: Record<string, string> = {
  master: "el Master", presupuesto: "Presupuesto", flujo: "Flujo de caja", areas: "el cuadro de áreas",
};

export function Chequeos({
  datos, resultado, tipo, alCambiar, alIr,
}: {
  datos: DatosEstudio;
  resultado: Resultado | null;
  tipo: "torre" | "casas";
  alCambiar: (d: DatosEstudio) => void;
  alIr?: (hoja: string) => void;
}) {
  const avisos = ejecutarChequeos({ datos, resultado, tipo, estado: undefined }) as
    { id: string; nivel: string; p: Record<string, string | number>; ir: string }[];
  const cfg = configChequeos(datos) as { pais: string; target: string };
  const paises = paisesDisponibles() as { codigo: string; nombre: string }[];
  const targets = TARGETS as { clave: string; nombre: string }[];

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h4 className="nota">Chequeos de coherencia</h4>
        <span className="text-[11.5px] tabular-nums text-tinta-400">
          {avisos.length === 0 ? "todo en rango" : `${avisos.length} para revisar`}
        </span>
      </div>

      {avisos.length === 0 ? (
        <p className="flex items-start gap-2 rounded-[9px] bg-viable/8 px-3 py-2.5 text-[12.5px] text-tinta-700">
          <Check className="mt-[1px] h-3.5 w-3.5 shrink-0 text-viable" aria-hidden />
          Sin observaciones: todo dentro de los rangos de referencia.
        </p>
      ) : (
        <div className="grid gap-1.5">
          {avisos.map(a => {
            const t = TEXTOS[a.id];
            const Icono = a.nivel === "aviso" ? Info : AlertTriangle;
            return (
              <div key={a.id}
                className="flex items-start gap-2.5 rounded-[9px] border border-trazo-fino px-3 py-2.5">
                <Icono className="mt-[2px] h-3.5 w-3.5 shrink-0"
                  style={{ color: a.nivel === "aviso" ? "rgb(var(--cian-700))" : "rgb(var(--tenso))" }}
                  aria-hidden />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medio leading-snug text-tinta-950">
                    {t?.tit ?? a.id}
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-tinta-500">
                    {t ? t.det(a.p) : ""}
                    {alIr && a.ir !== "master" && (
                      <>
                        {" "}
                        <button onClick={() => alIr(a.ir)}
                          className="underline decoration-trazo-medio underline-offset-2 hover:text-tinta-900">
                          Revisar en {HOJA[a.ir] ?? a.ir}
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* La referencia de costo país/segmento del chequeo de costo por m². */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medio text-tinta-500">País de referencia</span>
          <Lista value={cfg.pais} className="h-8 text-[13px]"
            onChange={ev => alCambiar(conConfigChequeos(datos, { pais: ev.target.value }) as DatosEstudio)}>
            {paises.map(p => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
          </Lista>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medio text-tinta-500">Segmento</span>
          <Lista value={cfg.target} className="h-8 text-[13px]"
            onChange={ev => alCambiar(conConfigChequeos(datos, { target: ev.target.value }) as DatosEstudio)}>
            {targets.map(t => <option key={t.clave} value={t.clave}>{t.nombre}</option>)}
          </Lista>
        </label>
      </div>
    </div>
  );
}
