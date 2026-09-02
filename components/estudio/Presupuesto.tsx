"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown, ArrowUp, ChevronRight, CornerDownRight, IndentDecrease,
  IndentIncrease, Plus, Trash2,
} from "lucide-react";
import { Boton, Lista } from "@/components/ui";
import {
  calcularResumenPresupuesto, contarLineas, esCalculada, fasesParaFlujo,
  hijosDe, insertarDespues, indentarNodo, desindentarNodo, mapNodo,
  montoNodo, moverEntreHermanos, nodoVacio, nuevoId, quitarNodo,
} from "@/lib/motor/presupuestoBase.js";
import { formatCurrency } from "@/lib/motor/calculations.js";
import type { DatosEstudio } from "@/lib/estudioLocal";

/**
 * El presupuesto base: un árbol de fases de hasta tres niveles con las reglas
 * de una hoja de cálculo —si una línea tiene hijos, su monto es la suma; si
 * tiene cantidad y precio, es el producto; si no, vale lo capturado—. Todas
 * las operaciones estructurales (indentar, mover, clonar) son las del motor.
 *
 * Un proyecto puede tener varios presupuestos (escenarios de obra); el activo
 * es el que se compara, se aplica al Master y se siembra en el flujo.
 */

type Fase = {
  id: string; nombre: string; tipo?: string;
  cantidad?: number | string; unidad?: string; precioUnitario?: number | string;
  monto?: number | string; subfases?: Fase[];
};
type Presupuesto = {
  id: string; nombre: string; modo?: string;
  modeloIndex?: number | null; campo?: string;
  fases: Fase[];
};

const num = (v: unknown) => {
  const x = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(x) ? 0 : x;
};

export function PresupuestoPanel({
  datos, alCambiar, alAplicarAlMaster, alSembrarFlujo, tipo,
}: {
  datos: DatosEstudio;
  alCambiar: (d: DatosEstudio, opciones?: { suave?: boolean }) => void;
  alAplicarAlMaster: (total: number, destino: { modeloIndex?: number | null; campo?: string }) => void;
  alSembrarFlujo: (partidas: { nombre: string; total: number }[]) => void;
  tipo: "torre" | "casas";
}) {
  const presupuestos = useMemo<Presupuesto[]>(() => {
    const lista = (datos.presupuestos ?? []) as Presupuesto[];
    if (lista.length) return lista;
    /* Estudios viejos: un solo presupuesto en `datos.presupuesto`. */
    const legado = datos.presupuesto as { fases?: Fase[] } | undefined;
    return [{ id: "pre_1", nombre: "Presupuesto de obra", modo: "total", fases: legado?.fases ?? [] }];
  }, [datos]);

  const activoId = (datos.presupuestoActivoId as string) || presupuestos[0]?.id;
  const activo = presupuestos.find(prs => prs.id === activoId) ?? presupuestos[0];
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set());

  const resumen = calcularResumenPresupuesto(activo?.fases ?? []) as {
    directoTotal: number; indirectoTotal: number; totalPresupuesto: number;
  };

  const escribir = (fases: Fase[], opciones?: { suave?: boolean }) => {
    const lista = presupuestos.map(prs => prs.id === activo.id ? { ...prs, fases } : prs);
    alCambiar({
      ...datos,
      presupuestos: lista,
      presupuestoActivoId: activo.id,
      /* El espejo plano que leen la ficha y la cartera. */
      presupuesto: { modo: activo.modo ?? "total", fases },
    }, opciones);
  };

  const editar = (id: string, campo: string, v: string) => {
    escribir(mapNodo(activo.fases, id, (n: Fase) => ({ ...n, [campo]: v })) as Fase[], { suave: true });
  };

  const alternar = (id: string) => {
    setAbiertas(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const operar = (fn: (fases: Fase[]) => Fase[] | null) => {
    const out = fn(activo.fases);
    if (out) escribir(out);
  };

  const agregarPresupuesto = () => {
    const nuevo: Presupuesto = {
      id: nuevoId("pre"), nombre: `Presupuesto ${presupuestos.length + 1}`,
      modo: "total", fases: [],
    };
    alCambiar({
      ...datos,
      presupuestos: [...presupuestos, nuevo],
      presupuestoActivoId: nuevo.id,
      presupuesto: { modo: "total", fases: [] },
    });
  };

  const duplicarPresupuesto = () => {
    const copia: Presupuesto = {
      ...activo,
      id: nuevoId("pre"),
      nombre: `${activo.nombre} (copia)`,
      fases: JSON.parse(JSON.stringify(activo.fases)),
    };
    alCambiar({
      ...datos,
      presupuestos: [...presupuestos, copia],
      presupuestoActivoId: copia.id,
      presupuesto: { modo: copia.modo ?? "total", fases: copia.fases },
    });
  };

  const eliminarPresupuesto = () => {
    if (presupuestos.length <= 1) return;
    const lista = presupuestos.filter(prs => prs.id !== activo.id);
    alCambiar({
      ...datos,
      presupuestos: lista,
      presupuestoActivoId: lista[0].id,
      presupuesto: { modo: lista[0].modo ?? "total", fases: lista[0].fases },
    });
  };

  const cambiarActivo = (id: string) => {
    const sig = presupuestos.find(prs => prs.id === id);
    if (!sig) return;
    alCambiar({
      ...datos,
      presupuestoActivoId: id,
      presupuesto: { modo: sig.modo ?? "total", fases: sig.fases },
    });
  };

  /* ------------------------------------------------------------- una fila */
  const Fila = ({ nodo, nivel }: { nodo: Fase; nivel: number }) => {
    const hijos = hijosDe(nodo) as Fase[];
    const monto = montoNodo(nodo) as number;
    const calculada = esCalculada(nodo);
    const abierta = abiertas.has(nodo.id) || nivel === 1;
    const peso = resumen.totalPresupuesto > 0 ? monto / resumen.totalPresupuesto : 0;

    const celda = "h-7 rounded-[6px] border border-transparent bg-transparent px-1.5 text-[12.5px] " +
      "tabular-nums text-tinta-950 outline-none hover:border-trazo-medio " +
      "focus:border-cian-500 focus:bg-hueso-alto";

    return (
      <>
        <tr className={nivel === 1 ? "border-t border-trazo-fino bg-hueso-mesa/50" : "border-t border-trazo-fino"}>
          <td className="py-1 pl-2 pr-1" style={{ paddingLeft: `${(nivel - 1) * 22 + 8}px` }}>
            <div className="flex items-center gap-1">
              {hijos.length > 0 && nivel > 1 ? (
                <button onClick={() => alternar(nodo.id)} aria-label="Desplegar"
                  className="grid h-5 w-5 shrink-0 place-items-center rounded text-tinta-400 hover:text-tinta-950">
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${abierta ? "rotate-90" : ""}`} aria-hidden />
                </button>
              ) : nivel > 1 ? (
                <CornerDownRight className="h-3 w-3 shrink-0 text-tinta-300" aria-hidden />
              ) : null}
              <input
                value={nodo.nombre}
                onChange={ev => editar(nodo.id, "nombre", ev.target.value)}
                placeholder="Nombre de la línea"
                className={`${celda} w-full min-w-[140px] text-left ${nivel === 1 ? "font-medio" : ""}`}
                aria-label="Nombre de la línea"
              />
            </div>
            {nivel === 1 && peso > 0 && (
              <span className="ml-2 mt-1 block h-[3px] max-w-[220px] rounded-full bg-hueso-mesa">
                <span className="block h-full rounded-full bg-minio-600" style={{ width: `${peso * 100}%` }} />
              </span>
            )}
          </td>
          <td className="px-1 py-1">
            {nivel === 1 && (
              <button
                onClick={() => editar(nodo.id, "tipo", nodo.tipo === "indirecto" ? "directo" : "indirecto")}
                title="Alternar directo / indirecto"
                className={`rounded-full px-2 py-0.5 text-[10.5px] font-medio uppercase tracking-wide transition
                  ${nodo.tipo === "indirecto" ? "bg-cian-100 text-cian-900" : "bg-minio-100 text-minio-700"}`}>
                {nodo.tipo === "indirecto" ? "Indirecto" : "Directo"}
              </button>
            )}
          </td>
          <td className="px-1 py-1 text-right">
            <input value={String(nodo.cantidad ?? "")} inputMode="decimal"
              onChange={ev => editar(nodo.id, "cantidad", ev.target.value)}
              className={`${celda} w-[76px] text-right`} aria-label="Cantidad" />
          </td>
          <td className="px-1 py-1">
            <input value={String(nodo.unidad ?? "")}
              onChange={ev => editar(nodo.id, "unidad", ev.target.value)}
              className={`${celda} w-[52px] text-center`} aria-label="Unidad" />
          </td>
          <td className="px-1 py-1 text-right">
            <input value={String(nodo.precioUnitario ?? "")} inputMode="decimal"
              onChange={ev => editar(nodo.id, "precioUnitario", ev.target.value)}
              className={`${celda} w-[92px] text-right`} aria-label="Precio unitario" />
          </td>
          <td className="px-1 py-1 text-right">
            {hijos.length > 0 || calculada ? (
              <span className={`px-1.5 text-[12.5px] font-medio tabular-nums ${nivel === 1 ? "text-tinta-950" : "text-tinta-700"}`}
                title={hijos.length ? "Suma de sus líneas" : "Cantidad × precio unitario"}>
                {formatCurrency(monto)}
              </span>
            ) : (
              <input value={String(nodo.monto ?? "")} inputMode="decimal"
                onChange={ev => editar(nodo.id, "monto", ev.target.value)}
                className={`${celda} w-[104px] text-right font-medio`} aria-label="Monto manual" />
            )}
          </td>
          <td className="px-1 py-1 text-right text-[11px] tabular-nums text-tinta-400">
            {peso > 0 ? `${(peso * 100).toFixed(1)} %` : ""}
          </td>
          <td className="py-1 pl-1 pr-2">
            <div className="flex items-center justify-end gap-0.5 opacity-40 transition hover:opacity-100">
              {nivel < 3 && (
                <BotonFila rotulo="Agregar línea hija"
                  onClick={() => {
                    operar(f => mapNodo(f, nodo.id, (n: Fase) => ({
                      ...n, subfases: [...hijosDe(n), nodoVacio(nivel + 1)],
                    })) as Fase[]);
                    setAbiertas(prev => new Set(prev).add(nodo.id));
                  }}>
                  <Plus className="h-3 w-3" aria-hidden />
                </BotonFila>
              )}
              <BotonFila rotulo="Subir" onClick={() => operar(f => moverEntreHermanos(f, nodo.id, -1) as Fase[] | null)}>
                <ArrowUp className="h-3 w-3" aria-hidden />
              </BotonFila>
              <BotonFila rotulo="Bajar" onClick={() => operar(f => moverEntreHermanos(f, nodo.id, 1) as Fase[] | null)}>
                <ArrowDown className="h-3 w-3" aria-hidden />
              </BotonFila>
              <BotonFila rotulo="Indentar" onClick={() => operar(f => indentarNodo(f, nodo.id) as Fase[] | null)}>
                <IndentIncrease className="h-3 w-3" aria-hidden />
              </BotonFila>
              <BotonFila rotulo="Desindentar" onClick={() => operar(f => desindentarNodo(f, nodo.id) as Fase[] | null)}>
                <IndentDecrease className="h-3 w-3" aria-hidden />
              </BotonFila>
              <BotonFila rotulo="Eliminar" peligro onClick={() => operar(f => quitarNodo(f, nodo.id) as Fase[])}>
                <Trash2 className="h-3 w-3" aria-hidden />
              </BotonFila>
            </div>
          </td>
        </tr>
        {abierta && hijos.map(h => <Fila key={h.id} nodo={h} nivel={nivel + 1} />)}
        {nivel === 1 && abierta && hijos.length === 0 && null}
      </>
    );
  };

  const partidasFlujo = fasesParaFlujo(activo?.fases ?? []) as { nombre: string; total: number }[];

  return (
    <div>
      {/* La cabecera del presupuesto activo. */}
      <div className="flex flex-wrap items-center gap-2">
        <Lista value={activo?.id ?? ""} onChange={ev => cambiarActivo(ev.target.value)}
          aria-label="Presupuesto activo" className="w-[230px]">
          {presupuestos.map(prs => (
            <option key={prs.id} value={prs.id}>{prs.nombre}</option>
          ))}
        </Lista>
        <input
          value={activo?.nombre ?? ""}
          onChange={ev => {
            const lista = presupuestos.map(prs => prs.id === activo.id ? { ...prs, nombre: ev.target.value } : prs);
            alCambiar({ ...datos, presupuestos: lista }, { suave: true });
          }}
          aria-label="Nombre del presupuesto"
          className="h-9 w-[190px] rounded-[8px] border border-trazo-medio bg-hueso-alto px-3 text-[13.5px]
                     text-tinta-950 outline-none hover:border-trazo-grueso focus:border-cian-500"
        />
        <Boton talla="sm" onClick={agregarPresupuesto}><Plus className="h-3.5 w-3.5" aria-hidden /> Nuevo</Boton>
        <Boton talla="sm" onClick={duplicarPresupuesto}>Duplicar</Boton>
        {presupuestos.length > 1 && (
          <Boton talla="sm" tono="peligro" onClick={eliminarPresupuesto}>Eliminar</Boton>
        )}
        <span className="ml-auto text-[12.5px] tabular-nums text-tinta-500">
          {contarLineas(activo?.fases ?? [])} líneas
        </span>
      </div>

      {/* Los tres totales, siempre a la vista. */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {([
          ["Costo directo", resumen.directoTotal, "text-tinta-950"],
          ["Costo indirecto", resumen.indirectoTotal, "text-tinta-950"],
          ["Total del presupuesto", resumen.totalPresupuesto, "text-minio-700"],
        ] as const).map(([r, v, c]) => (
          <div key={r} className="rounded-[10px] border border-trazo-fino p-3">
            <div className="nota">{r}</div>
            <div className={`mt-1.5 text-[19px] font-medio tabular-nums ${c}`}>{formatCurrency(v)}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-[10px] border border-trazo-fino">
        <table className="w-full min-w-[860px] text-[13px]">
          <thead>
            <tr className="text-tinta-400">
              <th className="px-2 py-2 text-left font-libro">Fase / partida</th>
              <th className="px-1 py-2 text-left font-libro">Tipo</th>
              <th className="px-1 py-2 text-right font-libro">Cantidad</th>
              <th className="px-1 py-2 text-left font-libro">Ud.</th>
              <th className="px-1 py-2 text-right font-libro">P. unitario</th>
              <th className="px-1 py-2 text-right font-libro">Monto</th>
              <th className="px-1 py-2 text-right font-libro">Incid.</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {(activo?.fases ?? []).map(f => <Fila key={f.id} nodo={f} nivel={1} />)}
            {(activo?.fases ?? []).length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[13.5px] text-tinta-400">
                Este presupuesto está vacío: agrega la primera fase.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Boton talla="sm" onClick={() => escribir([...(activo?.fases ?? []), nodoVacio(1) as Fase])}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Agregar fase
        </Boton>
        <span className="mx-1 h-5 w-px bg-trazo-fino" aria-hidden />
        <Boton talla="sm" tono="solido"
          disabled={resumen.totalPresupuesto <= 0}
          onClick={() => alAplicarAlMaster(resumen.totalPresupuesto, {
            modeloIndex: activo?.modeloIndex, campo: activo?.campo,
          })}>
          Aplicar total al Master
        </Boton>
        <Boton talla="sm" disabled={partidasFlujo.length === 0}
          onClick={() => alSembrarFlujo(partidasFlujo)}>
          Sembrar el flujo desde las fases
        </Boton>
        <span className="text-[11.5px] leading-snug text-tinta-400">
          {tipo === "torre"
            ? "El total va a «Costo de construcción»; el flujo recibe una actividad por fase."
            : "En casas el total se reparte entre modelos según su peso de costo."}
        </span>
      </div>
    </div>
  );
}

function BotonFila({
  rotulo, onClick, children, peligro,
}: {
  rotulo: string; onClick: () => void; children: React.ReactNode; peligro?: boolean;
}) {
  return (
    <button onClick={onClick} title={rotulo} aria-label={rotulo}
      className={`grid h-6 w-6 place-items-center rounded-[5px] text-tinta-400 transition
        ${peligro ? "hover:bg-riesgo/10 hover:text-riesgo" : "hover:bg-hueso-mesa hover:text-tinta-950"}`}>
      {children}
    </button>
  );
}
