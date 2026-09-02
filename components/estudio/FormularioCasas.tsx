"use client";

import { Plus, Trash2 } from "lucide-react";
import { Boton } from "@/components/ui";
import { itemVacioCasas } from "@/lib/motor/calculations.js";
import {
  cantEnEtapa, precioPromedioM2, quitarModeloDeReparto, resumenUnidades,
  sincronizarUnidades, unidadesModelo,
} from "@/lib/motor/casasEtapas.js";
import { totalesVentasModelos } from "@/lib/motor/comercialModelos.js";
import type { DatosEstudio } from "@/lib/estudioLocal";
import type { Resultado } from "./useEstudio";
import { CampoFecha, CampoNum, CampoTexto, TituloGrupo } from "./campos";
import { ParametrosPct } from "./ParametrosPct";

/**
 * El formulario de casas: precio global, modelos, etapas con su reparto de
 * unidades por modelo, hipótesis comercial por modelo y parámetros. Las reglas
 * de entrelazado —precio por m² ↔ precio por vivienda, unidades derivadas del
 * reparto— son las del producto, llamando a los mismos módulos del motor.
 */

const num = (v: unknown) => {
  const x = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(x) ? 0 : x;
};

type Item = { nombre?: string; reparto?: Record<number, number> } & Record<string, unknown>;

const CAMPOS_MODELO: [string, string][] = [
  ["m2LoteViv", "m² lote / vivienda"],
  ["m2ConstViv", "m² construcción / vivienda"],
  ["precioUnidad", "Precio de lista / vivienda"],
];

const COSTOS_ETAPA: [string, string][] = [
  ["costoConstTipo", "Costo de construcción"],
  ["costoIndTipo", "Costos indirectos"],
  ["imprevistos", "Imprevistos (vacío = usar %)"],
  ["infraOriginario", "Infraestructura PH originario"],
  ["infraVida", "Infraestructura"],
  ["valorTerreno", "Valor del terreno"],
  ["interesBancario", "Interés bancario"],
  ["descuentoViv", "Descuento · viviendas (monto)"],
];

export function FormularioCasas({
  datos, alCambiar, resultado,
}: {
  datos: DatosEstudio;
  alCambiar: (d: DatosEstudio, opciones?: { suave?: boolean }) => void;
  resultado: Resultado | null;
}) {
  const modelos = (datos.modelos ?? []) as Item[];
  const etapas = (datos.etapas ?? []) as Item[];
  const comercial = (datos.comercial ?? {}) as Record<string, unknown>;
  const porModelo = (comercial.porModelo ?? []) as { unidadesVendidas?: number; totalVendido?: number }[];
  const resumen = resumenUnidades(datos);

  const setLista = (campo: "modelos" | "etapas", lista: Item[], sincronizar = false) => {
    const patch = { ...datos, [campo]: lista };
    alCambiar(sincronizar ? (sincronizarUnidades(patch) as DatosEstudio) : patch, { suave: true });
  };

  const setModelo = (idx: number, k: string, v: string) => {
    let lista = modelos.map((m, mi) => (mi === idx ? { ...m, [k]: v } : m));
    /* Precio por m² ↔ precio por vivienda: la regla del producto. */
    if (k === "m2ConstViv") {
      const pm2 = num(datos.precioListaM2);
      if (pm2 > 0) lista = lista.map((m, mi) => (mi === idx
        ? { ...m, precioUnidad: +(pm2 * num(v)).toFixed(2) } : m));
    }
    const patch: DatosEstudio = { ...datos, modelos: lista };
    if (k === "precioUnidad" || k === "m2ConstViv") {
      const prom = precioPromedioM2(patch, lista);
      if (prom > 0) patch.precioListaM2 = prom;
    }
    alCambiar(patch, { suave: true });
  };

  const setPrecioM2 = (v: string) => {
    const pm2 = num(v);
    const lista = modelos.map(m => (num(m.m2ConstViv) > 0
      ? { ...m, precioUnidad: +(pm2 * num(m.m2ConstViv)).toFixed(2) }
      : m));
    alCambiar({ ...datos, precioListaM2: v, modelos: lista }, { suave: true });
  };

  const setReparto = (etapaIdx: number, modeloIdx: number, v: string) => {
    const lista = etapas.map((e, ei) => (ei === etapaIdx
      ? { ...e, reparto: { ...(e.reparto ?? {}), [modeloIdx]: num(v) } }
      : e));
    const patch = sincronizarUnidades({ ...datos, etapas: lista }) as DatosEstudio;
    const prom = precioPromedioM2(patch, modelos);
    if (prom > 0) patch.precioListaM2 = prom;
    alCambiar(patch, { suave: true });
  };

  const setVentaModelo = (idx: number, k: "unidadesVendidas" | "totalVendido", v: string) => {
    const lista = modelos.map((_, mi) => ({ ...(porModelo[mi] ?? {}) }));
    lista[idx] = { ...lista[idx], [k]: num(v) };
    const tot = totalesVentasModelos(modelos, lista);
    alCambiar({ ...datos, comercial: { ...comercial, porModelo: lista, ...tot } }, { suave: true });
  };

  return (
    <div className="space-y-7">
      <div>
        <TituloGrupo>Precio de venta del proyecto</TituloGrupo>
        <div className="grid grid-cols-2 gap-3 md:max-w-[440px]">
          <CampoNum rotulo="Precio de lista por m²" sufijo="$"
            valor={datos.precioListaM2 as number | string}
            alCambiar={setPrecioM2} />
          <CampoNum rotulo="% de descuento (ej. 0.02)"
            valor={datos.pctDescuento as number | string}
            alCambiar={v => alCambiar({ ...datos, pctDescuento: v }, { suave: true })} />
        </div>
        <p className="mt-2 text-[11.5px] text-tinta-400">
          El precio por m² es global del proyecto: el precio final de venta es lista menos descuento.
        </p>
      </div>

      <div>
        <TituloGrupo
          extra={
            <Boton talla="sm" tono="fantasma"
              onClick={() => setLista("modelos", [...modelos, itemVacioCasas(`Modelo ${modelos.length + 1}`) as Item], true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Agregar modelo
            </Boton>
          }
        >
          Modelos de casa
        </TituloGrupo>
        <p className="mb-3 text-[12px] leading-snug text-tinta-500">
          Los modelos definen los m² y el precio por vivienda; sus unidades se derivan del
          reparto hecho en las etapas, así que nunca pueden superar el total de casas.
        </p>
        <div className="space-y-3">
          {modelos.map((m, mi) => (
            <div key={mi} className="rounded-[10px] border border-trazo-fino p-3.5">
              <div className="mb-3 flex items-end gap-3">
                <div className="max-w-[240px] flex-1">
                  <CampoTexto rotulo="Nombre" valor={String(m.nombre ?? "")} marcador={`Modelo ${mi + 1}`}
                    alCambiar={v => setModelo(mi, "nombre", v)} />
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[11px] text-tinta-400">Unidades (según etapas)</div>
                  <div className="text-[16px] font-medio tabular-nums text-tinta-950">
                    {unidadesModelo(datos, mi)}
                  </div>
                </div>
                {modelos.length > 1 && (
                  <button
                    onClick={() => {
                      let patch: DatosEstudio = { ...datos, modelos: modelos.filter((_, i2) => i2 !== mi) };
                      patch = quitarModeloDeReparto(patch, mi) as DatosEstudio;
                      alCambiar(sincronizarUnidades(patch) as DatosEstudio);
                    }}
                    title="Eliminar modelo"
                    className="grid h-8 w-8 place-items-center rounded-[7px] text-tinta-400 hover:bg-riesgo/10 hover:text-riesgo">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {CAMPOS_MODELO.map(([k, rotulo]) => (
                  <CampoNum key={k} rotulo={rotulo} sufijo={k === "precioUnidad" ? "$" : "m²"}
                    valor={m[k] as number | string}
                    alCambiar={v => setModelo(mi, k, v)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <TituloGrupo
          extra={
            <Boton talla="sm" tono="fantasma"
              onClick={() => setLista("etapas", [...etapas, itemVacioCasas(`Etapa ${etapas.length + 1}`) as Item], true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Agregar etapa
            </Boton>
          }
        >
          Etapas
        </TituloGrupo>
        <p className="mb-3 text-[12px] leading-snug text-tinta-500">
          Aquí nace la factibilidad: los costos de cada etapa y cuántas casas de cada modelo
          la componen. El terreno y la infraestructura se cargan donde ocurren, no se prorratean.
        </p>
        <div className="space-y-3">
          {etapas.map((e, ei) => (
            <div key={ei} className="rounded-[10px] border border-trazo-fino p-3.5">
              <div className="mb-3 flex items-end gap-3">
                <div className="max-w-[240px] flex-1">
                  <CampoTexto rotulo="Nombre" valor={String(e.nombre ?? "")} marcador={`Etapa ${ei + 1}`}
                    alCambiar={v => setLista("etapas", etapas.map((x, i2) => i2 === ei ? { ...x, nombre: v } : x))} />
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[11px] text-tinta-400">Unidades de la etapa</div>
                  <div className="text-[16px] font-medio tabular-nums text-tinta-950">
                    {modelos.reduce((a, _m, idx) => a + cantEnEtapa(e, idx), 0)}
                  </div>
                </div>
                <button
                  onClick={() => setLista("etapas", etapas.filter((_, i2) => i2 !== ei), true)}
                  title="Eliminar etapa"
                  className="grid h-8 w-8 place-items-center rounded-[7px] text-tinta-400 hover:bg-riesgo/10 hover:text-riesgo">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>

              <div className="mb-3">
                <div className="mb-1.5 text-[12px] font-medio text-tinta-700">
                  Unidades por modelo en esta etapa
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {modelos.map((m, idx) => (
                    <CampoNum key={idx} rotulo={String(m.nombre || `Modelo ${idx + 1}`)} sufijo="un" entero
                      valor={cantEnEtapa(e, idx)}
                      alCambiar={v => setReparto(ei, idx, v)} />
                  ))}
                </div>
              </div>

              <div className="mb-1.5 text-[12px] font-medio text-tinta-700">Costos de la etapa</div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {COSTOS_ETAPA.map(([k, rotulo]) => (
                  <CampoNum key={k} rotulo={rotulo} sufijo="$"
                    valor={e[k] as number | string}
                    alCambiar={v => setLista("etapas", etapas.map((x, i2) => i2 === ei ? { ...x, [k]: v } : x))} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-[9px] bg-hueso-mesa px-3.5 py-2.5 text-[12.5px]">
          <span className="font-medio text-tinta-900">
            Casas en etapas: <span className="tabular-nums">{resumen.totalEtapas}</span>
          </span>
          <span className="font-medio text-tinta-900">
            Repartidas en modelos: <span className="tabular-nums">{resumen.totalModelos}</span>
          </span>
          {!resumen.cuadra && (
            <span className="text-riesgo">Hay etapas con unidades sin repartir entre los modelos.</span>
          )}
        </div>
      </div>

      <div>
        <TituloGrupo>Hipótesis comercial</TituloGrupo>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <CampoFecha rotulo="Fecha de preventa" valor={String(comercial.fechaPreventa ?? "")}
            alCambiar={v => alCambiar({ ...datos, comercial: { ...comercial, fechaPreventa: v } }, { suave: true })} />
          <CampoNum rotulo="Ritmo mensual objetivo" sufijo="un/mes"
            valor={comercial.ritmoObjetivo as number}
            alCambiar={v => alCambiar({ ...datos, comercial: { ...comercial, ritmoObjetivo: num(v) } }, { suave: true })} />
          <CampoFecha rotulo="Inicio de construcción" valor={String(comercial.inicioConstruccion ?? "")}
            alCambiar={v => alCambiar({ ...datos, comercial: { ...comercial, inicioConstruccion: v } }, { suave: true })} />
          <CampoNum rotulo="Periodo de construcción" sufijo="meses"
            valor={comercial.periodoConstruccion as number}
            alCambiar={v => alCambiar({ ...datos, comercial: { ...comercial, periodoConstruccion: num(v) } }, { suave: true })} />
        </div>
        <p className="mb-2 mt-4 text-[12px] leading-snug text-tinta-500">
          Lo vendido se captura por modelo: los totales del proyecto son la suma de estas filas.
        </p>
        <div className="overflow-hidden rounded-[10px] border border-trazo-fino">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-tinta-400">
                <th className="px-3 py-2 text-left font-libro">Modelo</th>
                <th className="px-3 py-2 text-right font-libro">Unidades vendidas</th>
                <th className="px-3 py-2 text-right font-libro">Monto vendido</th>
              </tr>
            </thead>
            <tbody>
              {modelos.map((m, mi) => (
                <tr key={mi} className="border-t border-trazo-fino">
                  <td className="px-3 py-1.5 text-tinta-900">{String(m.nombre || `Modelo ${mi + 1}`)}</td>
                  {(["unidadesVendidas", "totalVendido"] as const).map(k => (
                    <td key={k} className="px-3 py-1.5 text-right">
                      <input
                        type="text" inputMode="decimal"
                        value={String(porModelo[mi]?.[k] ?? "")}
                        onChange={ev => setVentaModelo(mi, k, ev.target.value)}
                        className="h-7 w-[120px] rounded-[6px] border border-transparent bg-transparent px-2
                                   text-right text-[13px] tabular-nums text-tinta-950 outline-none
                                   hover:border-trazo-medio focus:border-cian-500 focus:bg-hueso-alto"
                        aria-label={`${k === "unidadesVendidas" ? "Unidades vendidas" : "Monto vendido"} de ${m.nombre || `Modelo ${mi + 1}`}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ParametrosPct
        datos={datos}
        alCambiar={alCambiar}
        baseCostos={num(resultado?.costoConst) + num(resultado?.costoInd) + num(resultado?.imprevistos)}
        baseIngresos={num(resultado?.totalIngresos)}
        notaBase="Base de gastos administrativos: construcción más indirectos más imprevistos (excluye terreno e infraestructura)."
      />
    </div>
  );
}
