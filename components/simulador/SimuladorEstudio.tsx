"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RotateCcw, FlaskConical, Settings2, X } from "lucide-react";
import { Pagina } from "@/components/Pagina";
import { Boton, Lista, Modal, Casilla, Marbete } from "@/components/ui";
import { calcularFactibilidad, formatCurrency, formatPercent, formatNumber } from "@/lib/motor/calculations.js";
import { aplicarOverrides, referenciasSimulador, VARS_INICIALES } from "@/lib/motor/simuladorVariables.js";
import { calcularMetricasRetorno, hayFlujoConfigurado } from "@/lib/motor/metricasRetorno.js";
import { ETIQUETA_VAR, RANGO_VAR, SECCIONES_SIM } from "@/lib/simuladorUi";
import { leerBorrador, type DatosEstudio } from "@/lib/estudioLocal";
import { Tornado } from "./Tornado";
import { Escenarios } from "./Escenarios";

/**
 * El simulador de escenarios, con el motor de verdad.
 *
 * La versión anterior estimaba con un modelo aproximado —un 72 % de obra, un
 * resto fijo— porque no tenía el estudio debajo. Ahora lo tiene: cada
 * deslizador pasa por `aplicarOverrides` y el resultado sale de
 * `calcularFactibilidad`, exactamente el mismo camino que recorre el producto.
 * Diez variables, la tabla completa de indicadores, el tornado de sensibilidad
 * y los escenarios guardados: todo consume el catálogo único del motor, así
 * que no puede divergir de lo que diría la herramienta de origen.
 */

type Vars = Record<string, number | string>;

export type ProyectoSimulable = {
  id: string;
  nombre: string;
  tipo: "torre" | "casas";
  datos: DatosEstudio;
};

const KPI_CLAVE = "prefacti:sim:kpis";
const KPI_DEFAULT = ["utilidad", "margen", "totalIngresos", "ctVendible"];

type Indicador = {
  grupo: string;
  key: string;
  label: string;
  format: (v: number) => string;
};

/* La tabla comparativa del producto, indicador a indicador y en su orden. */
const COMPARATIVAS: Indicador[] = [
  { grupo: "Ingresos y costos", key: "descuentos", label: "Descuentos", format: formatCurrency },
  { grupo: "Ingresos y costos", key: "totalIngresos", label: "Ingresos totales", format: formatCurrency },
  { grupo: "Ingresos y costos", key: "costosDirectos", label: "Costos directos", format: formatCurrency },
  { grupo: "Ingresos y costos", key: "costosIndirectos", label: "Costos indirectos", format: formatCurrency },
  { grupo: "Ingresos y costos", key: "costoTotal", label: "Costo total", format: formatCurrency },
  { grupo: "Rentabilidad", key: "utilidad", label: "Utilidad", format: formatCurrency },
  { grupo: "Rentabilidad", key: "margen", label: "Margen", format: formatPercent },
  { grupo: "Precios", key: "precioListaM2", label: "Precio lista m²", format: formatCurrency },
  { grupo: "Precios", key: "descuentoM2", label: "Descuento por m²", format: formatCurrency },
  { grupo: "Precios", key: "precioNetoM2", label: "Precio neto m²", format: formatCurrency },
  { grupo: "Precios", key: "precioNetoUnidad", label: "Precio neto unidad", format: formatCurrency },
  { grupo: "Costos por m²", key: "ctConstruccion", label: "Costo m² construcción", format: formatCurrency },
  { grupo: "Costos por m²", key: "ctVendible", label: "Costo m² vendible", format: formatCurrency },
];

export function SimuladorEstudio({ proyectos }: { proyectos: ProyectoSimulable[] }) {
  const [id, setId] = useState(proyectos[0]?.id ?? "");
  const [vars, setVars] = useState<Vars>({ ...VARS_INICIALES });
  const [configAbierta, setConfigAbierta] = useState(false);
  const [kpis, setKpis] = useState<string[]>(KPI_DEFAULT);
  /* El borrador local de la ficha, si existe: se simula sobre lo que se está
     trabajando, no sobre una copia que ya no es la de la pantalla de al lado. */
  const [borradores, setBorradores] = useState<Record<string, DatosEstudio>>({});

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KPI_CLAVE) ?? "null");
      if (Array.isArray(s) && s.length === 4) setKpis(s);
    } catch { /* la vista por defecto */ }
    const b: Record<string, DatosEstudio> = {};
    for (const p of proyectos) {
      const d = leerBorrador(p.id);
      if (d) b[p.id] = d;
    }
    setBorradores(b);
  }, [proyectos]);

  const proyecto = proyectos.find(p => p.id === id) ?? proyectos[0];
  const datos = (proyecto && (borradores[proyecto.id] ?? proyecto.datos)) || null;
  const conBorrador = !!(proyecto && borradores[proyecto.id]);

  /* El motor es JavaScript sin tipos (ver `lib/motor/LEEME.md`): su resultado
     se lee como un registro plano, que es exactamente lo que es. */
  type Resultado = Record<string, number>;
  const resultadoVigente = useMemo(
    () => (datos && proyecto
      ? (calcularFactibilidad(datos, proyecto.tipo) as unknown as Resultado)
      : null),
    [datos, proyecto],
  );
  const resultadoSimulado = useMemo(
    () => (datos && proyecto
      ? (calcularFactibilidad(aplicarOverrides(datos, proyecto.tipo, vars), proyecto.tipo) as unknown as Resultado)
      : null),
    [datos, proyecto, vars],
  );

  /* Retorno bajo el escenario: sólo si el proyecto tiene flujo configurado.
     Se recalcula el cronograma completo con los datos simulados — mismo motor,
     nunca una estimación aparte. */
  const retorno = useMemo(() => {
    if (!datos || !proyecto || !hayFlujoConfigurado(datos)) return null;
    const rBase = calcularMetricasRetorno({ datos, resultado: resultadoVigente, tipo: proyecto.tipo });
    const dSim = aplicarOverrides(datos, proyecto.tipo, vars);
    const rSim = calcularMetricasRetorno({ datos: dSim, resultado: resultadoSimulado, tipo: proyecto.tipo });
    if (!rBase.completo || !rSim.completo) return null;
    return { base: rBase.metricas, sim: rSim.metricas };
  }, [datos, proyecto, vars, resultadoVigente, resultadoSimulado]);

  const refs = useMemo(
    () => referenciasSimulador(datos, proyecto?.tipo, resultadoVigente),
    [datos, proyecto, resultadoVigente],
  );

  const tocado = Object.entries(vars).some(([k, v]) => v !== (VARS_INICIALES as Vars)[k] && v !== "" && v !== 0);
  const restablecer = () => setVars({ ...VARS_INICIALES });

  const guardarKpis = (lista: string[]) => {
    setKpis(lista);
    try { localStorage.setItem(KPI_CLAVE, JSON.stringify(lista)); } catch { /* en memoria */ }
    setConfigAbierta(false);
  };

  /* La diferencia entre vigente y simulado, con el color de su signo. El umbral
     de «sin cambio» depende de la métrica: media centésima de punto para las
     razones, medio centavo para la moneda. */
  const delta = (k: string, fmt: (v: number) => string) => {
    if (!resultadoVigente || !resultadoSimulado) return null;
    const v = Number(resultadoVigente[k] ?? 0);
    const s = Number(resultadoSimulado[k] ?? 0);
    const d = s - v;
    const esRatio = fmt === formatPercent;
    if (Math.abs(d) < (esRatio ? 0.00005 : 0.005)) return { texto: "sin cambio", color: "rgb(var(--tinta-400))" };
    const pctRel = v ? (d / Math.abs(v)) * 100 : 0;
    return {
      texto: `${d >= 0 ? "+" : ""}${fmt(d)} (${pctRel >= 0 ? "+" : ""}${pctRel.toFixed(1)}%)`,
      color: d >= 0 ? "rgb(var(--viable))" : "rgb(var(--riesgo))",
    };
  };

  const tarjetas = kpis
    .map(k => COMPARATIVAS.find(c => c.key === k))
    .filter(Boolean) as Indicador[];

  if (!proyecto || !datos) {
    return (
      <div>
        <Pagina icono={FlaskConical} titulo="Simulador"
          bajada="Mueve una variable y el resultado se recalcula con el motor de factibilidad." />
        <section className="seccion rounded-caja p-10 text-center text-[14px] text-tinta-400">
          No hay ninguna promoción con estudio cargado que simular.
        </section>
      </div>
    );
  }

  return (
    <div>
      <Pagina
        icono={FlaskConical}
        titulo="Simulador"
        bajada="Mueve una variable y el resultado se recalcula con el motor de factibilidad, contra la versión vigente."
        acciones={
          <>
            <Lista value={proyecto.id} onChange={e => { setId(e.target.value); restablecer(); }}
                   aria-label="Promoción a simular" className="w-[210px]">
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </Lista>
            <Boton onClick={() => setConfigAbierta(true)}>
              <Settings2 className="h-4 w-4" aria-hidden /> Indicadores
            </Boton>
            <Boton disabled={!tocado} onClick={restablecer}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Restablecer
            </Boton>
          </>
        }
      />

      {conBorrador && (
        <p className="mb-4 text-[12.5px] text-tinta-500">
          <Marbete tono="aviso">Borrador local</Marbete>{" "}
          Se simula sobre lo último que editaste en la ficha, no sobre la versión original.
        </p>
      )}

      {/* Los cuatro indicadores de cabecera, configurables. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetas.map(c => {
          const d = delta(c.key, c.format);
          return (
            <section key={c.key} className="seccion rounded-caja p-4">
              <div className="nota">{c.label}</div>
              <div className="cifra mt-2 text-[clamp(1.5rem,2.4vw,2rem)] leading-none text-tinta-950">
                {c.format(Number(resultadoSimulado?.[c.key] ?? 0))}
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2 text-[11.5px]">
                <span className="tabular-nums text-tinta-400">
                  vigente {c.format(Number(resultadoVigente?.[c.key] ?? 0))}
                </span>
                {d && <span className="font-medio tabular-nums" style={{ color: d.color }}>{d.texto}</span>}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Los controles: el catálogo único de variables del motor. */}
        <section className="seccion h-fit min-w-0 rounded-caja p-5 sm:p-6">
          {SECCIONES_SIM.map((s, si) => (
            <div key={s.titulo} className={si ? "mt-7 border-t border-trazo-fino pt-6" : ""}>
              <h3 className="nota">{s.titulo}</h3>
              <div className="mt-3.5 space-y-5">
                {s.vars.map(vId => {
                  const meta = RANGO_VAR[vId];
                  /* Las variables absolutas son las que en reposo valen «» —el
                     dato del proyecto manda—; las relativas parten de 0. */
                  const absoluta = (VARS_INICIALES as Vars)[vId] === "";
                  return absoluta ? (
                    <DeslizadorAbsoluto
                      key={vId}
                      rotulo={ETIQUETA_VAR[vId]}
                      valor={vars[vId] as number | ""}
                      referencia={Number((refs as Record<string, number>)[
                        ({ pctDescuento: "descuento", pctImprevistos: "imprevistos",
                           pctGastosAdmin: "gastosAdmin", pctComisiones: "comisiones",
                           pctPublicidad: "publicidad", pctImpuestosVentas: "impuestosVentas",
                         } as Record<string, string>)[vId] ?? ""] ?? 0)}
                      min={meta.min} max={meta.max} step={meta.step}
                      alCambiar={v => setVars({ ...vars, [vId]: v })}
                      alLimpiar={() => setVars({ ...vars, [vId]: "" })}
                    />
                  ) : (
                    <DeslizadorRelativo
                      key={vId}
                      rotulo={ETIQUETA_VAR[vId]}
                      valor={Number(vars[vId] ?? 0)}
                      min={meta.min} max={meta.max} step={meta.step}
                      alCambiar={v => setVars({ ...vars, [vId]: v })}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* La tabla completa: vigente contra simulado, indicador a indicador. */}
        <section className="seccion min-w-0 overflow-x-auto rounded-caja">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-trazo-fino">
                {["Indicador", "Vigente", "Simulado", "Δ"].map((c, i) => (
                  <th key={c} className={`nota px-5 py-3 ${i ? "text-right" : "text-left"}`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARATIVAS.map((m, i) => {
                const d = delta(m.key, m.format);
                const grupoNuevo = i === 0 || COMPARATIVAS[i - 1].grupo !== m.grupo;
                const resaltada = m.key === "utilidad" || m.key === "margen";
                return (
                  <Fragment key={m.key}>
                    {grupoNuevo && (
                      <tr>
                        <td colSpan={4} className="nota px-5 pb-1 pt-4">{m.grupo}</td>
                      </tr>
                    )}
                    <tr className={`border-b border-trazo-fino last:border-0 ${resaltada ? "bg-hueso-mesa/60" : ""}`}>
                      <td className={`px-5 py-2.5 text-[13.5px] ${resaltada ? "font-medio text-tinta-950" : "text-tinta-700"}`}>
                        {m.label}
                      </td>
                      <td className="px-5 py-2.5 text-right text-[13.5px] tabular-nums text-tinta-400">
                        {m.format(Number(resultadoVigente?.[m.key] ?? 0))}
                      </td>
                      <td className={`px-5 py-2.5 text-right text-[14px] tabular-nums ${resaltada ? "font-medio text-tinta-950" : "text-tinta-900"}`}>
                        {m.format(Number(resultadoSimulado?.[m.key] ?? 0))}
                      </td>
                      <td className="px-5 py-2.5 text-right text-[12.5px] font-medio tabular-nums"
                          style={{ color: d?.color }}>
                        {d?.texto ?? ""}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
              {retorno && (
                <>
                  <tr><td colSpan={4} className="nota px-5 pb-1 pt-4">Retorno · con el flujo de caja</td></tr>
                  {([
                    ["TIR anual", (m: Record<string, number | null>) => m.tirAnual, formatPercent],
                    ["VAN", (m: Record<string, number | null>) => m.van, formatCurrency],
                    ["Capital propio máximo", (m: Record<string, number | null>) => m.capitalPropioMax, formatCurrency],
                    ["Múltiplo sobre capital", (m: Record<string, number | null>) => m.multiploCapital,
                      (v: number) => formatNumber(v, 2) + "×"],
                  ] as const).map(([rotulo, get, fmt]) => {
                    const b = get(retorno.base as never);
                    const s = get(retorno.sim as never);
                    const dd = b != null && s != null ? s - b : null;
                    return (
                      <tr key={rotulo} className="border-b border-trazo-fino last:border-0">
                        <td className="px-5 py-2.5 text-[13.5px] text-tinta-700">{rotulo}</td>
                        <td className="px-5 py-2.5 text-right text-[13.5px] tabular-nums text-tinta-400">
                          {b == null ? "—" : fmt(b)}
                        </td>
                        <td className="px-5 py-2.5 text-right text-[14px] tabular-nums text-tinta-900">
                          {s == null ? "—" : fmt(s)}
                        </td>
                        <td className="px-5 py-2.5 text-right text-[12.5px] font-medio tabular-nums"
                            style={{ color: dd == null || Math.abs(dd) < 1e-9 ? "rgb(var(--tinta-400))"
                                       : dd > 0 ? "rgb(var(--viable))" : "rgb(var(--riesgo))" }}>
                          {dd == null ? "—" : Math.abs(dd) < 1e-9 ? "sin cambio" : (dd > 0 ? "+" : "") + fmt(dd)}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
          <p className="px-5 py-3 text-[12px] text-tinta-400">
            La simulación no modifica la versión guardada.{" "}
            <Link href={`/proyectos/${proyecto.id}`}
              className="underline decoration-trazo-medio underline-offset-4 hover:text-tinta-900">
              Abrir la ficha de {proyecto.nombre}
            </Link>
          </p>
        </section>
      </div>

      {/* Qué mueve el resultado, y qué escenarios quedan guardados. */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Tornado datos={datos} tipo={proyecto.tipo} resultadoBase={resultadoVigente} />
        <Escenarios
          proyectoId={proyecto.id}
          datos={datos}
          tipo={proyecto.tipo}
          vars={vars}
          margenVigente={Number(resultadoVigente?.margen ?? 0)}
          alAplicar={o => setVars({ ...VARS_INICIALES, ...(o || {}) })}
        />
      </div>

      <Modal
        abierto={configAbierta}
        alCerrar={() => setConfigAbierta(false)}
        titulo="Indicadores principales"
      >
        <ConfigKpis actuales={kpis} opciones={COMPARATIVAS} alGuardar={guardarKpis} />
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------ deslizadores */

function DeslizadorRelativo({
  rotulo, valor, min, max, step, alCambiar,
}: {
  rotulo: string; valor: number; min: number; max: number; step: number;
  alCambiar: (v: number) => void;
}) {
  const idCtrl = `sim-${rotulo.replace(/\W+/g, "-")}`;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={idCtrl} className="text-[13.5px] text-tinta-700">{rotulo}</label>
        <span className={`text-[14px] tabular-nums ${valor ? "font-medio text-tinta-950" : "text-tinta-400"}`}>
          {valor > 0 ? "+" : ""}{valor}%
        </span>
      </div>
      <input
        id={idCtrl} type="range" min={min} max={max} step={step} value={valor}
        aria-valuetext={`${valor} por ciento sobre el dato del proyecto`}
        onChange={e => alCambiar(Number(e.target.value))}
        className="mt-2 w-full accent-[rgb(var(--tinta-950))]"
      />
      <div className="mt-0.5 flex justify-between font-mono text-[10px] text-tinta-400">
        <span>{min}%</span><span>base</span><span>+{max}%</span>
      </div>
    </div>
  );
}

/**
 * Deslizador de valor absoluto: vacío = sin cambio (manda el dato del
 * proyecto, que se enseña como referencia). El aspa vuelve al estado neutro.
 */
function DeslizadorAbsoluto({
  rotulo, valor, referencia, min, max, step, alCambiar, alLimpiar,
}: {
  rotulo: string; valor: number | ""; referencia: number;
  min: number; max: number; step: number;
  alCambiar: (v: number) => void; alLimpiar: () => void;
}) {
  const efectivo = valor === "" ? referencia : Number(valor);
  const modificado = valor !== "";
  const idCtrl = `sim-${rotulo.replace(/\W+/g, "-")}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={idCtrl} className="min-w-0 text-[13.5px] text-tinta-700">{rotulo}</label>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className={`text-[14px] tabular-nums ${modificado ? "font-medio text-tinta-950" : "text-tinta-400"}`}>
            {efectivo.toFixed(1)}%
          </span>
          {modificado && (
            <button onClick={alLimpiar} title="Volver al dato del proyecto"
              className="grid h-4 w-4 place-items-center rounded-full text-tinta-400 hover:bg-hueso-mesa hover:text-tinta-950">
              <X className="h-3 w-3" aria-hidden />
            </button>
          )}
        </span>
      </div>
      <input
        id={idCtrl} type="range" min={min} max={max} step={step} value={efectivo}
        aria-valuetext={`${efectivo.toFixed(1)} por ciento efectivo`}
        onChange={e => alCambiar(Number(e.target.value))}
        className="mt-2 w-full accent-[rgb(var(--tinta-950))]"
      />
      <div className="mt-0.5 flex justify-between font-mono text-[10px] text-tinta-400">
        <span>{min}%</span>
        <span>{modificado ? `proyecto ${referencia.toFixed(1)}%` : "el del proyecto"}</span>
        <span>{max}%</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- KPI config */

function ConfigKpis({
  actuales, opciones, alGuardar,
}: {
  actuales: string[];
  opciones: Indicador[];
  alGuardar: (lista: string[]) => void;
}) {
  const [lista, setLista] = useState<string[]>(actuales);
  const alternar = (k: string, on: boolean) => {
    setLista(prev => on ? [...prev, k] : prev.filter(x => x !== k));
  };
  const completa = lista.length === 4;
  return (
    <div>
      <p className="text-[13px] text-tinta-500">
        Elige exactamente cuatro indicadores para la barra superior.
      </p>
      <div className="mt-3 grid max-h-[320px] grid-cols-1 gap-0.5 overflow-y-auto sm:grid-cols-2">
        {opciones.map(o => (
          <Casilla
            key={o.key}
            marcada={lista.includes(o.key)}
            deshabilitada={!lista.includes(o.key) && completa}
            alCambiar={v => alternar(o.key, v)}
            rotulo={o.label}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[12.5px] tabular-nums text-tinta-400">{lista.length} de 4</span>
        <Boton tono="solido" disabled={!completa} onClick={() => alGuardar(lista)}>
          Guardar
        </Boton>
      </div>
    </div>
  );
}
