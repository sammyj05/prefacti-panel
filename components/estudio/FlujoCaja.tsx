"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Sprout, Trash2 } from "lucide-react";
import { Boton, Casilla, Lista } from "@/components/ui";
import {
  calcularFlujoCaja, calcularSaldoCaja, horizonteDesdePlazo, impactoInteres,
  obraDelMaster, reconciliarConMaster, reescalarActividades, repartirUniforme,
  resumenTrimestral, sembrarActividades, sumaPct, PRESETS_CURVA,
} from "@/lib/motor/flujoCaja.js";
import { derivarParamsGuardados } from "@/lib/motor/useFlujoParams.js";
import { formatCurrency, formatPercent } from "@/lib/motor/calculations.js";
import type { DatosEstudio } from "@/lib/estudioLocal";
import type { Resultado } from "./useEstudio";
import { CampoNum, TituloGrupo } from "./campos";
import { SensibilidadFlujo } from "./SensibilidadFlujo";
import { QuiebreFlujo } from "./QuiebreFlujo";
import { RetornoPanel } from "./RetornoPanel";

/**
 * El flujo de caja del estudio: el cronograma de desembolsos, el interés de
 * construcción y todo lo que se deriva de él. La aritmética es la del Excel de
 * origen, validada al centavo (`lib/motor/flujoCaja.js`); esta pantalla sólo
 * captura y enseña.
 *
 * Dos capas que no se confunden: la EXPOSICIÓN (obra acumulada menos cobrado,
 * sobre la que corre el interés) y el SALDO DE CAJA (todo lo que entra menos
 * todo lo que sale). El gráfico las pinta juntas porque se leen juntas, pero
 * cada una sale de su función del motor.
 */

type Actividad = { id?: string; nombre: string; total: number | string; dist?: number[] };
type Params = Record<string, number | string | boolean | null>;

const num = (v: unknown) => {
  const x = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(x) ? 0 : x;
};

export function FlujoCajaPanel({
  datos, alCambiar, resultado, tipo, alAplicarInteres,
}: {
  datos: DatosEstudio;
  alCambiar: (d: DatosEstudio, opciones?: { suave?: boolean }) => void;
  resultado: Resultado | null;
  tipo: "torre" | "casas";
  alAplicarInteres: (interesTotal: number) => void;
}) {
  const params = useMemo(() => derivarParamsGuardados(datos) as Params, [datos]);
  const actividades = (datos.flujoActividades ?? []) as Actividad[];
  const obraMaster = num(obraDelMaster(datos, tipo, resultado));
  const ingresosMaster = num(resultado?.totalIngresos);
  const [verMontos, setVerMontos] = useState(false);
  const [reparto, setReparto] = useState<{ idx: number; desde: string; hasta: string } | null>(null);

  const flujo = useMemo(
    () => calcularFlujoCaja(actividades, { ...params, montoObra: obraMaster }, { ingresosMaster }) as {
      meses: { mes: number; egreso: number; ingreso: number; cierre: number; acumulado: number; baseInteres: number; interesMes: number }[];
      detalle: { nombre: string; total: number; residual: number; valida: boolean }[];
      modoEstandar: boolean; horizonte: number; horizonteObra: number;
      totalCostos: number; interesTotal: number; interesFinanciado: number;
      exposicionMaxima: number; mesExposicionMaxima: number;
      mesesSinObra: number; interesEnMesesSinObra: number;
      mesRepagoCompleto: number | null; interesCierre: number;
      actividadesInvalidas: string[];
    },
    [actividades, params, obraMaster, ingresosMaster],
  );

  const caja = useMemo(
    () => calcularSaldoCaja(flujo, { ...params, montoObra: obraMaster }, { ingresosMaster }) as {
      meses: { mes: number; saldo: number }[];
      saldoMinimo: number; mesSaldoMinimo: number; saldoFinal: number;
    } | null,
    [flujo, params, obraMaster, ingresosMaster],
  );

  const trimestres = useMemo(
    () => resumenTrimestral(flujo, caja) as {
      id: string; desde: number; hasta: number; egreso: number; ingreso: number;
      interes: number; exposicion: number; cierre: number; saldo: number | null;
    }[],
    [flujo, caja],
  );

  const reconciliacion = reconciliarConMaster(flujo.totalCostos, obraMaster) as {
    diferencia: number; pctDiferencia: number | null;
  };
  const impacto = impactoInteres(resultado, flujo.interesFinanciado) as {
    interesActual: number; delta: number; deltaMargenPp: number; margenNuevo: number;
  };

  const setParams = (patch: Params, opciones?: { suave?: boolean }) => {
    const p2 = { ...params, ...patch };
    if (patch.plazoObra != null) p2.horizonteMeses = horizonteDesdePlazo(num(patch.plazoObra));
    alCambiar({ ...datos, flujoParams: p2 }, opciones);
  };

  const setActividades = (lista: Actividad[], opciones?: { suave?: boolean }) => {
    alCambiar({ ...datos, flujoActividades: lista }, opciones);
  };

  const cambiarPlazo = (v: string) => {
    const nuevo = Math.max(1, Math.round(num(v)));
    if (!nuevo || nuevo === num(params.plazoObra)) return;
    /* El cronograma se reescala al nuevo plazo remuestreando por área: el mes 0
       se conserva y los totales no se mueven. */
    const lista = reescalarActividades(actividades, params.plazoObra, nuevo) as Actividad[];
    alCambiar({
      ...datos,
      flujoParams: { ...params, plazoObra: nuevo, horizonteMeses: horizonteDesdePlazo(nuevo) },
      flujoActividades: lista,
    });
  };

  const sembrarPlantilla = () => {
    const lista = sembrarActividades(obraMaster, tipo, params.plazoObra) as Actividad[];
    setActividades(lista);
  };

  const H = flujo.horizonte;
  const meses = Array.from({ length: H }, (_, m) => m);

  const editarCelda = (idx: number, mes: number, v: string) => {
    const lista = actividades.map((a, i) => {
      if (i !== idx) return a;
      const dist = Array.from({ length: H }, (_, m) => num(a.dist?.[m]));
      dist[mes] = num(v) / 100;
      return { ...a, dist };
    });
    setActividades(lista, { suave: true });
  };

  const aplicarReparto = () => {
    if (!reparto) return;
    const a = actividades[reparto.idx];
    if (!a) return;
    const dist = repartirUniforme(a.dist, num(reparto.desde), num(reparto.hasta), 1, H) as number[];
    setActividades(actividades.map((x, i) => (i === reparto.idx ? { ...x, dist } : x)));
    setReparto(null);
  };

  /* ------------------------------------------------------------ el gráfico */
  const Grafico = () => {
    const ancho = 940, alto = 210, margen = 26;
    const topeBarra = Math.max(1, ...flujo.meses.map(m => Math.max(m.egreso, m.ingreso + m.cierre)));
    const topeLinea = Math.max(1, flujo.exposicionMaxima, ...(caja?.meses ?? []).map(m => Math.abs(m.saldo)));
    const x = (m: number) => margen + (m / Math.max(1, H - 1)) * (ancho - margen * 2);
    const bw = Math.max(2, (ancho - margen * 2) / H - 2);
    const yBarra = (v: number) => (v / topeBarra) * (alto / 2 - 12);
    const yLinea = (v: number) => alto / 2 - (v / topeLinea) * (alto / 2 - 12);
    const linea = (serie: number[]) =>
      serie.map((v, m) => `${m ? "L" : "M"}${x(m).toFixed(1)},${yLinea(v).toFixed(1)}`).join(" ");

    return (
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${ancho} ${alto}`} className="min-w-[720px]" role="img"
             aria-label="Egresos, ingresos, exposición y saldo por mes">
          <line x1={margen} x2={ancho - margen} y1={alto / 2} y2={alto / 2}
                stroke="var(--trazo-medio)" strokeWidth="1" />
          {flujo.meses.map(m => (
            <g key={m.mes}>
              {/* Egresos hacia abajo, entradas hacia arriba: el mes se lee de un golpe. */}
              <rect x={x(m.mes) - bw / 2} y={alto / 2} width={bw} height={yBarra(m.egreso)}
                    fill="rgb(var(--minio-600) / .55)" />
              <rect x={x(m.mes) - bw / 2} y={alto / 2 - yBarra(m.ingreso + m.cierre)} width={bw}
                    height={yBarra(m.ingreso + m.cierre)} fill="rgb(var(--viable) / .5)" />
            </g>
          ))}
          <path d={linea(flujo.meses.map(m => m.baseInteres))} fill="none"
                stroke="rgb(var(--tinta-950))" strokeWidth="1.8" />
          {caja && (
            <path d={linea(caja.meses.map(m => m.saldo))} fill="none"
                  stroke="rgb(var(--cian-700))" strokeWidth="1.6" strokeDasharray="5 3" />
          )}
          <circle cx={x(flujo.mesExposicionMaxima)} cy={yLinea(flujo.exposicionMaxima)} r="3.5"
                  fill="rgb(var(--tinta-950))" />
          <text x={margen} y={alto - 4} className="fill-tinta-400 font-mono" fontSize="9">mes 0</text>
          <text x={ancho - margen} y={alto - 4} textAnchor="end" className="fill-tinta-400 font-mono" fontSize="9">
            mes {H - 1}
          </text>
        </svg>
        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-tinta-500">
          <span><span className="mr-1.5 inline-block h-2 w-2 rounded-[2px] bg-minio-600/60" />Egreso de obra</span>
          <span><span className="mr-1.5 inline-block h-2 w-2 rounded-[2px] bg-viable/50" />Entradas (preventa y cierre)</span>
          <span><span className="mr-1.5 inline-block h-[2px] w-4 translate-y-[-2px] bg-tinta-950" />Exposición bancaria</span>
          {caja && <span><span className="mr-1.5 inline-block h-[2px] w-4 translate-y-[-2px] border-b-2 border-dashed border-cian-700" />Saldo de caja</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Los cuatro números que responden «¿cuánto cuesta el dinero?». */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          ["Interés total", formatCurrency(flujo.interesTotal), null],
          ["Interés financiado", formatCurrency(flujo.interesFinanciado),
            `${formatPercent(num(params.pctFinanciamiento))} de la línea`],
          ["Exposición máxima", formatCurrency(flujo.exposicionMaxima),
            `en el mes ${flujo.mesExposicionMaxima}`],
          ["Repago completo", flujo.mesRepagoCompleto != null ? `mes ${flujo.mesRepagoCompleto}` : "—",
            flujo.interesCierre > 0 ? `escriturar cuesta ${formatCurrency(flujo.interesCierre)}` : null],
        ] as const).map(([r, v, d]) => (
          <div key={r} className="rounded-[10px] border border-trazo-fino p-3.5">
            <div className="nota">{r}</div>
            <div className="mt-1.5 text-[19px] font-medio tabular-nums text-tinta-950">{v}</div>
            {d && <div className="mt-0.5 text-[11.5px] tabular-nums text-tinta-400">{d}</div>}
          </div>
        ))}
      </div>

      {/* Aplicar el interés calculado al Master: una sola vía, explícita. */}
      <div className="flex flex-wrap items-center gap-3 rounded-[10px] bg-hueso-mesa px-4 py-3">
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-tinta-700">
          El Master captura {formatCurrency(impacto.interesActual)} de interés; el flujo calcula{" "}
          <b className="font-medio text-tinta-950">{formatCurrency(flujo.interesFinanciado)}</b>
          {Math.abs(impacto.delta) >= 0.5 && (
            <> ({impacto.delta > 0 ? "+" : "−"}{formatCurrency(Math.abs(impacto.delta))},{" "}
            {impacto.deltaMargenPp >= 0 ? "+" : "−"}{Math.abs(impacto.deltaMargenPp).toFixed(2)} pp de margen)</>
          )}.
        </p>
        <Boton talla="sm" tono="solido" disabled={Math.abs(impacto.delta) < 0.5}
          onClick={() => alAplicarInteres(Math.round(flujo.interesFinanciado))}>
          Usar este valor
        </Boton>
      </div>

      {flujo.mesesSinObra > 0 && !flujo.modoEstandar && (
        <p className="flex items-start gap-2.5 rounded-[10px] border border-tenso/30 bg-tenso/8 px-4 py-3 text-[13px] leading-snug text-tinta-900">
          <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0 text-tenso" aria-hidden />
          Hay {flujo.mesesSinObra} meses sin desembolso dentro del horizonte de obra: el cronograma
          no está escalado al plazo y el interés se infla {formatCurrency(flujo.interesEnMesesSinObra)}.
        </p>
      )}

      {/* Supuestos del financiamiento. */}
      <div>
        <TituloGrupo>Supuestos del financiamiento</TituloGrupo>
        <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-4">
          <CampoNum rotulo="Plazo de obra" sufijo="meses" entero
            valor={num(params.plazoObra)} alCambiar={cambiarPlazo} />
          <CampoNum rotulo="Tasa anual" sufijo="%"
            valor={+(num(params.tasaAnual) * 100).toFixed(3)}
            alCambiar={v => setParams({ tasaAnual: num(v) / 100 }, { suave: true })} />
          <CampoNum rotulo="Porcentaje financiado" sufijo="%"
            valor={+(num(params.pctFinanciamiento) * 100).toFixed(1)}
            alCambiar={v => setParams({ pctFinanciamiento: num(v) / 100 }, { suave: true })} />
          <CampoNum rotulo="Capital de inicio (preventa)" sufijo="$"
            valor={num(params.capitalInicioMonto)}
            alCambiar={v => setParams({ capitalInicioMonto: num(v) }, { suave: true })}
            ayuda="Cae en el mes 0 y reduce la exposición inicial." />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-[10px] border border-trazo-fino p-3.5">
            <Casilla
              marcada={!!params.ventasObraActivar}
              alCambiar={v => setParams({ ventasObraActivar: v })}
              rotulo="Ventas en obra"
              detalle="Abonos que entran mes a mes durante la construcción y bajan el saldo deudor."
            />
            {!!params.ventasObraActivar && (
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                <CampoNum rotulo="Ingreso total esperado" sufijo="$"
                  valor={num(params.ventasObraMontoTotal)}
                  alCambiar={v => setParams({ ventasObraMontoTotal: num(v) }, { suave: true })} />
                <CampoNum rotulo="% de abono" sufijo="%"
                  valor={+(num(params.ventasObraPctAbono) * 100).toFixed(1)}
                  alCambiar={v => setParams({ ventasObraPctAbono: num(v) / 100 }, { suave: true })} />
                <CampoNum rotulo="Mes de arranque" sufijo="mes" entero
                  valor={num(params.ventasObraMesInicio)}
                  alCambiar={v => setParams({ ventasObraMesInicio: num(v) }, { suave: true })} />
                <CampoNum rotulo="Meses de ventas" sufijo="meses" entero
                  valor={num(params.ventasObraMeses)}
                  alCambiar={v => setParams({ ventasObraMeses: num(v) }, { suave: true })} />
              </div>
            )}
          </div>

          <div className="rounded-[10px] border border-trazo-fino p-3.5">
            <Casilla
              marcada={params.cajaActivar !== false}
              alCambiar={v => setParams({ cajaActivar: v })}
              rotulo="Cierre de ventas (escrituración)"
              detalle="El desembolso hipotecario repaga la línea: atrasar el cierre cuesta interés real."
            />
            {params.cajaActivar !== false && (
              <div className="mt-2 grid grid-cols-3 gap-2.5">
                <CampoNum rotulo="Monto (0 = ingresos del Master)" sufijo="$"
                  valor={num(params.cajaMontoTotal)}
                  alCambiar={v => setParams({ cajaMontoTotal: num(v) }, { suave: true })} />
                <CampoNum rotulo="Mes de inicio (0 = fin de obra)" sufijo="mes" entero
                  valor={num(params.cajaMesInicio)}
                  alCambiar={v => setParams({ cajaMesInicio: num(v) }, { suave: true })} />
                <CampoNum rotulo="Meses de cierre" sufijo="meses" entero
                  valor={num(params.cajaMeses)}
                  alCambiar={v => setParams({ cajaMeses: num(v) }, { suave: true })} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* El gráfico de las dos capas. */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <TituloGrupo>Exposición y saldo, mes a mes</TituloGrupo>
          {caja && (
            <span className="text-[12px] tabular-nums text-tinta-500">
              saldo mínimo {formatCurrency(caja.saldoMinimo)} (mes {caja.mesSaldoMinimo}) ·
              saldo final {formatCurrency(caja.saldoFinal)}
            </span>
          )}
        </div>
        <Grafico />
      </div>

      {/* El cronograma editable. */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <TituloGrupo>Cronograma de desembolsos</TituloGrupo>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setVerMontos(v => !v)}
              className="rounded-full bg-hueso-mesa px-3 py-1 text-[12px] font-medio text-tinta-700 hover:text-tinta-950">
              Ver {verMontos ? "porcentajes" : "montos"}
            </button>
            <Boton talla="sm" onClick={sembrarPlantilla} title="Reparte el monto de obra del Master con la plantilla calibrada">
              <Sprout className="h-3.5 w-3.5" aria-hidden /> Sembrar plantilla
            </Boton>
            <Boton talla="sm" onClick={() => setActividades([
              ...actividades,
              { id: `act_${Date.now().toString(36)}`, nombre: "NUEVA ACTIVIDAD", total: 0, dist: new Array(H).fill(0) },
            ])}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Actividad
            </Boton>
          </div>
        </div>

        {flujo.modoEstandar ? (
          <div className="rounded-[10px] border border-trazo-fino p-4">
            <p className="text-[13px] leading-snug text-tinta-700">
              Sin cronograma cargado: el flujo usa la <b className="font-medio">curva estándar</b> escalada
              al plazo, sobre el monto de obra del Master ({formatCurrency(obraMaster)}).
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:max-w-[440px]">
              <label className="block">
                <span className="mb-1 block text-[12px] font-medio text-tinta-700">Forma de la curva</span>
                <Lista value={String(params.formaCurva ?? "equilibrada")} className="h-8 text-[13px]"
                  onChange={ev => setParams({ formaCurva: ev.target.value })}>
                  {Object.entries(PRESETS_CURVA as Record<string, { label: string }>).map(([k, p2]) => (
                    <option key={k} value={k}>{p2.label}</option>
                  ))}
                </Lista>
              </label>
              <CampoNum rotulo="% del mes 0 (previos)" sufijo="%"
                valor={+(num(params.pctMes0) * 100).toFixed(1)}
                alCambiar={v => setParams({ pctMes0: num(v) / 100 }, { suave: true })} />
            </div>
            <p className="mt-3 text-[12px] text-tinta-400">
              Siembra la plantilla para trabajar actividad por actividad.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-trazo-fino">
            <table className="w-max min-w-full text-[12px]">
              <thead>
                <tr className="text-tinta-400">
                  <th className="sticky left-0 z-10 bg-hueso-alto px-3 py-2 text-left font-libro">Actividad</th>
                  <th className="px-2 py-2 text-right font-libro">Total</th>
                  <th className="px-2 py-2 text-center font-libro">Σ%</th>
                  {meses.map(m => (
                    <th key={m} className="px-1 py-2 text-right font-mono text-[10px]">{m}</th>
                  ))}
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {actividades.map((a, idx) => {
                  const suma = num(sumaPct(a));
                  const valida = Math.abs(1 - suma) < 1e-6;
                  return (
                    <tr key={a.id ?? idx} className="border-t border-trazo-fino">
                      <td className="sticky left-0 z-10 bg-hueso-alto px-2 py-0.5">
                        <input value={a.nombre}
                          onChange={ev => setActividades(actividades.map((x, i) => i === idx ? { ...x, nombre: ev.target.value } : x), { suave: true })}
                          className="h-7 w-[190px] rounded-[6px] border border-transparent bg-transparent px-1.5
                                     text-[12px] font-medio text-tinta-950 outline-none
                                     hover:border-trazo-medio focus:border-cian-500 focus:bg-hueso-alto"
                          aria-label="Nombre de la actividad" />
                      </td>
                      <td className="px-1 py-0.5 text-right">
                        <input value={String(a.total ?? "")} inputMode="decimal"
                          onChange={ev => setActividades(actividades.map((x, i) => i === idx ? { ...x, total: ev.target.value } : x), { suave: true })}
                          className="h-7 w-[96px] rounded-[6px] border border-transparent bg-transparent px-1.5
                                     text-right text-[12px] tabular-nums text-tinta-950 outline-none
                                     hover:border-trazo-medio focus:border-cian-500 focus:bg-hueso-alto"
                          aria-label="Total de la actividad" />
                      </td>
                      <td className="px-1 py-0.5 text-center">
                        <span className={`inline-block rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums
                          ${valida ? "text-viable" : "bg-riesgo/10 text-riesgo"}`}
                          title={valida ? "La fila reparte el 100 %" : `Reparte ${(suma * 100).toFixed(2)} %`}>
                          {(suma * 100).toFixed(0)}%
                        </span>
                      </td>
                      {meses.map(m => {
                        const pct = num(a.dist?.[m]);
                        const monto = pct * num(a.total);
                        return (
                          <td key={m} className="px-0.5 py-0.5 text-right">
                            {verMontos ? (
                              <span className={`inline-block w-[64px] px-1 text-right font-mono text-[10.5px] tabular-nums
                                ${monto ? "text-tinta-700" : "text-tinta-300"}`}>
                                {monto ? Math.round(monto).toLocaleString("en-US") : "·"}
                              </span>
                            ) : (
                              <input
                                value={pct ? +(pct * 100).toFixed(2) : ""}
                                inputMode="decimal"
                                placeholder="·"
                                onChange={ev => editarCelda(idx, m, ev.target.value)}
                                className={`h-6 w-[46px] rounded-[4px] border border-transparent px-1 text-right
                                            font-mono text-[10.5px] tabular-nums outline-none
                                            hover:border-trazo-medio focus:border-cian-500 focus:bg-hueso-alto
                                            ${pct ? "bg-minio-100/60 text-tinta-950" : "bg-transparent text-tinta-300"}`}
                                aria-label={`${a.nombre}, mes ${m}, porcentaje`}
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="px-1 py-0.5">
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => setReparto({ idx, desde: "1", hasta: String(num(params.plazoObra)) })}
                            title="Repartir uniforme entre dos meses"
                            className="grid h-6 w-6 place-items-center rounded-[5px] text-tinta-400 hover:bg-hueso-mesa hover:text-tinta-950">
                            <span className="font-mono text-[10px]">⇢</span>
                          </button>
                          <button onClick={() => setActividades(actividades.filter((_, i) => i !== idx))}
                            title="Eliminar actividad"
                            className="grid h-6 w-6 place-items-center rounded-[5px] text-tinta-400 hover:bg-riesgo/10 hover:text-riesgo">
                            <Trash2 className="h-3 w-3" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* La fila del egreso agregado: la curva en números. */}
                <tr className="border-t-2 border-trazo-medio bg-hueso-mesa/60">
                  <td className="sticky left-0 z-10 bg-hueso-mesa px-3 py-1.5 text-[12px] font-medio text-tinta-950">
                    Egreso del mes
                  </td>
                  <td className="px-2 py-1.5 text-right font-medio tabular-nums text-tinta-950">
                    {formatCurrency(flujo.totalCostos)}
                  </td>
                  <td />
                  {meses.map(m => (
                    <td key={m} className="px-1 py-1.5 text-right font-mono text-[10px] tabular-nums text-tinta-700">
                      {flujo.meses[m]?.egreso ? Math.round(flujo.meses[m].egreso / 1000).toLocaleString("en-US") + "k" : "·"}
                    </td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {reparto && (
          <div className="mt-2 flex flex-wrap items-end gap-2 rounded-[10px] bg-hueso-mesa px-3.5 py-2.5">
            <span className="text-[12.5px] text-tinta-700">
              Repartir el 100 % de «{actividades[reparto.idx]?.nombre}» uniforme
            </span>
            <span className="w-[90px]">
              <CampoNum rotulo="Del mes" entero valor={reparto.desde}
                alCambiar={v => setReparto({ ...reparto, desde: v })} />
            </span>
            <span className="w-[90px]">
              <CampoNum rotulo="Al mes" entero valor={reparto.hasta}
                alCambiar={v => setReparto({ ...reparto, hasta: v })} />
            </span>
            <Boton talla="sm" tono="solido" onClick={aplicarReparto}>Repartir</Boton>
            <Boton talla="sm" tono="fantasma" onClick={() => setReparto(null)}>Cancelar</Boton>
          </div>
        )}

        {/* Reconciliación contra el Master: espejo de la fila 21 del Excel. */}
        <p className={`mt-2 text-[12.5px] tabular-nums ${Math.abs(reconciliacion.diferencia) < 1 ? "text-tinta-400" : "text-tenso"}`}>
          Cronograma {formatCurrency(flujo.totalCostos)} · obra del Master {formatCurrency(obraMaster)}
          {Math.abs(reconciliacion.diferencia) >= 1 && (
            <> · diferencia {formatCurrency(reconciliacion.diferencia)}
              {reconciliacion.pctDiferencia != null && ` (${(reconciliacion.pctDiferencia * 100).toFixed(1)} %)`}</>
          )}
        </p>
      </div>

      {/* El resumen por trimestre: lo que cabe legible en una página. */}
      <div>
        <TituloGrupo>Resumen trimestral</TituloGrupo>
        <div className="overflow-x-auto rounded-[10px] border border-trazo-fino">
          <table className="w-full min-w-[640px] text-[12.5px]">
            <thead>
              <tr className="text-tinta-400">
                {["Trimestre", "Egreso", "Entradas", "Cierre", "Interés", "Exposición", "Saldo"].map((c, i2) => (
                  <th key={c} className={`px-3 py-2 font-libro ${i2 ? "text-right" : "text-left"}`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trimestres.map(t => (
                <tr key={t.id} className="border-t border-trazo-fino">
                  <td className="px-3 py-1.5 text-tinta-700">{t.id} <span className="text-tinta-400">(m{t.desde}–{t.hasta})</span></td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-tinta-900">{formatCurrency(t.egreso)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-tinta-900">{formatCurrency(t.ingreso)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-tinta-900">{formatCurrency(t.cierre)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-tinta-900">{formatCurrency(t.interes)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-tinta-900">{formatCurrency(t.exposicion)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-tinta-900">
                    {t.saldo == null ? "—" : formatCurrency(t.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sensibilidad y puntos de quiebre, sobre el mismo motor. */}
      <SensibilidadFlujo actividades={actividades} params={{ ...params, montoObra: obraMaster }} />
      <QuiebreFlujo actividades={actividades} params={{ ...params, montoObra: obraMaster }} flujo={flujo} />

      {/* El retorno del inversionista: TIR, VAN, payback y la curva de capital. */}
      <RetornoPanel datos={datos} resultado={resultado} tipo={tipo} />
    </div>
  );
}
