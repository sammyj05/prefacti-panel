"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Edificio } from "@/lib/data";
import { money, num, pct, m2 } from "@/lib/format";
import { Pestanas } from "@/components/ui";

/**
 * El interior de una promoción.
 *
 * La ficha enseñaba la volumetría y seis indicadores; todo lo que hay debajo de
 * esos seis números —las partidas de obra con su precio unitario, las unidades
 * una a una con su estado de venta, el reparto de la caja mes a mes, los
 * modelos de vivienda— vivía en el dato y no llegaba a ninguna pantalla. Aquí
 * está, en el mismo orden en que se construye un estudio: de dónde sale el
 * ingreso, de dónde sale el coste, cuándo entra y sale el dinero, y qué se
 * vende.
 *
 * Las pestañas se montan en un solo componente y no en cinco páginas porque son
 * el mismo objeto mirado por cinco lados: quien está comparando el presupuesto
 * con lo vendido no quiere navegar, quiere alternar.
 */

const SUAVE = [0.16, 1, 0.3, 1] as const;

/* El color de cada estado comercial. La rampa va de lo cerrado a lo abierto,
   así que la barra de ocupación se lee sin leyenda. */
const TONO_ESTADO: Record<string, string> = {
  vendido: "var(--etapa-preventa)",
  reservado: "var(--etapa-obra)",
  separado: "var(--etapa-permisos)",
  disponible: "var(--trazo-medio)",
};
const NOMBRE_ESTADO: Record<string, string> = {
  vendido: "Vendidas", reservado: "Reservadas",
  separado: "Separadas", disponible: "Disponibles",
};

/* --------------------------------------------------------------- apoyo */

function Rejilla({ filas }: { filas: [string, string][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
      {filas.map(([k, v]) => (
        /* `min-w-0` en el rótulo y `shrink-0` en la cifra. Una casilla de flex
           trae de serie `min-width: auto`, así que el rótulo no bajaba de su
           ancho mínimo y era la cifra —lo único que no se puede partir ni
           recortar— la que se salía por la derecha y quedaba cortada por el
           canto de la sección. Puesto a cero, el que parte es el rótulo, que es
           el que puede permitírselo. */
        <div key={k} className="flex items-baseline justify-between gap-4
                                border-b border-trazo-fino py-2.5">
          <dt className="min-w-0 text-[13.5px] leading-snug text-tinta-500">{k}</dt>
          <dd className="shrink-0 text-[14px] font-medio tabular-nums text-tinta-950">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-10 text-center text-[14px] text-tinta-400">{children}</p>
  );
}

/* ---------------------------------------------------------- presupuesto */

function Presupuesto({ e }: { e: Edificio }) {
  const capitulos = e.detalle.presupuesto;
  const total = capitulos.reduce((a, c) => a + c.monto, 0);
  const [abierto, setAbierto] = useState<string | null>(capitulos[0]?.nombre ?? null);

  if (!capitulos.length) return <Vacio>Esta promoción no tiene presupuesto cargado.</Vacio>;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-[13.5px] text-tinta-500">
          {capitulos.length} capítulos ·{" "}
          {num(capitulos.reduce((a, c) => a + c.partidas.length, 0))} partidas
        </span>
        <span className="text-[15px] font-medio tabular-nums text-tinta-950">
          {money(total)}
        </span>
      </div>

      <div className="overflow-hidden rounded-pieza border border-trazo-fino">
        {capitulos.map((c, i) => {
          const on = abierto === c.nombre;
          const peso = total > 0 ? c.monto / total : 0;
          return (
            <div key={c.nombre} className={i ? "border-t border-trazo-fino" : ""}>
              <button
                onClick={() => setAbierto(on ? null : c.nombre)}
                aria-expanded={on}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition
                           hover:bg-hueso-mesa"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medio text-tinta-950">
                    {c.nombre}
                  </span>
                  {/* La barra de peso: qué parte de la obra es este capítulo. */}
                  <span className="mt-1.5 block h-[3px] w-full max-w-[280px] rounded-full bg-hueso-mesa">
                    <span className="block h-full rounded-full bg-minio-600"
                          style={{ width: `${peso * 100}%` }} />
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[14px] font-medio tabular-nums text-tinta-950">
                    {money(c.monto)}
                  </span>
                  <span className="block text-[12px] tabular-nums text-tinta-400">
                    {pct(peso, 1)}
                  </span>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {on && c.partidas.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: SUAVE }}
                    className="overflow-hidden"
                  >
                    <table className="w-full border-t border-trazo-fino bg-hueso-mesa text-[13.5px]">
                      <thead>
                        <tr className="text-tinta-400">
                          <th className="px-4 py-2 text-left font-libro">Partida</th>
                          <th className="px-3 py-2 text-right font-libro">Cantidad</th>
                          <th className="px-3 py-2 text-left font-libro">Ud.</th>
                          <th className="px-3 py-2 text-right font-libro">Precio</th>
                          <th className="px-4 py-2 text-right font-libro">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.partidas.map(p => (
                          <tr key={p.nombre} className="border-t border-trazo-fino">
                            <td className="px-4 py-2 text-tinta-900">{p.nombre}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-tinta-700">
                              {num(p.cantidad)}
                            </td>
                            <td className="px-3 py-2 text-tinta-400">{p.unidad}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-tinta-700">
                              {money(p.precioUnitario)}
                            </td>
                            <td className="px-4 py-2 text-right font-medio tabular-nums text-tinta-950">
                              {money(p.monto)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- unidades */

function Unidades({ e }: { e: Edificio }) {
  const areas = e.detalle.areas;
  const [filtro, setFiltro] = useState<string>("");

  const visibles = useMemo(
    () => (areas?.unidades ?? []).filter(u => !filtro || u.estado === filtro),
    [areas, filtro]);

  if (!areas || !areas.unidades.length)
    return <Vacio>Esta promoción no tiene cuadro de áreas.</Vacio>;

  const total = areas.unidades.length;
  const orden = ["vendido", "reservado", "separado", "disponible"];

  return (
    <div>
      {/* La barra de ocupación: el estado comercial de la torre entera en una
          sola línea, que es como se mira un cuadro de áreas de verdad. */}
      <div className="flex h-2.5 overflow-hidden rounded-full">
        {orden.filter(k => areas.porEstado[k]).map(k => (
          <motion.span
            key={k}
            initial={{ width: 0 }}
            animate={{ width: `${(areas.porEstado[k] / total) * 100}%` }}
            transition={{ duration: 0.8, ease: SUAVE }}
            style={{ background: TONO_ESTADO[k] ?? "var(--trazo-medio)" }}
            title={`${NOMBRE_ESTADO[k] ?? k}: ${areas.porEstado[k]}`}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1">
        <button
          onClick={() => setFiltro("")}
          className={`rounded-full px-3 py-1.5 text-[13.5px] transition
            ${!filtro ? "bg-hueso-mesa font-medio text-tinta-950" : "text-tinta-500 hover:text-tinta-950"}`}>
          Todas <span className="tabular-nums text-tinta-400">{total}</span>
        </button>
        {orden.filter(k => areas.porEstado[k]).map(k => (
          <button
            key={k}
            onClick={() => setFiltro(filtro === k ? "" : k)}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[13.5px] transition
              ${filtro === k ? "bg-hueso-mesa font-medio text-tinta-950" : "text-tinta-500 hover:text-tinta-950"}`}>
            <span className="h-[7px] w-[7px] rounded-full"
                  style={{ background: TONO_ESTADO[k] ?? "var(--trazo-medio)" }} />
            {NOMBRE_ESTADO[k] ?? k}
            <span className="tabular-nums text-tinta-400">{areas.porEstado[k]}</span>
          </button>
        ))}
      </div>

      {/* Las tipologías, antes de la lista: es lo que explica los metros. */}
      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        {areas.tipologias.map(t => (
          <div key={t.id} className="rounded-pieza border border-trazo-fino p-3.5">
            <div className="text-[13.5px] font-medio text-tinta-950">{t.nombre}</div>
            <div className="mt-1 flex items-baseline gap-2 text-[13px] text-tinta-500">
              <span className="tabular-nums">{m2(t.m2)}</span>
              <span className="text-tinta-300">·</span>
              <span className="tabular-nums">{money(t.precioM2)}/m²</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 max-h-[420px] overflow-auto rounded-pieza border border-trazo-fino">
        <table className="w-full text-[13.5px]">
          <thead className="sticky top-0 bg-hueso-alto">
            <tr className="text-tinta-400">
              <th className="px-4 py-2.5 text-left font-libro">Unidad</th>
              <th className="px-3 py-2.5 text-left font-libro">Nivel</th>
              <th className="px-3 py-2.5 text-left font-libro">Tipología</th>
              <th className="px-3 py-2.5 text-right font-libro">m²</th>
              <th className="px-4 py-2.5 text-left font-libro">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map(u => (
              <tr key={u.nivel + u.codigo} className="border-t border-trazo-fino">
                <td className="px-4 py-2 font-medio text-tinta-950">{u.codigo}</td>
                <td className="px-3 py-2 text-tinta-700">{u.nivel}</td>
                <td className="px-3 py-2 text-tinta-700">{u.tipologia}</td>
                <td className="px-3 py-2 text-right tabular-nums text-tinta-700">{num(u.m2)}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center gap-1.5 text-tinta-700">
                    <span className="h-[7px] w-[7px] rounded-full"
                          style={{ background: TONO_ESTADO[u.estado] ?? "var(--trazo-medio)" }} />
                    {NOMBRE_ESTADO[u.estado]?.replace(/s$/, "") ?? u.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- caja */

function Flujo({ e }: { e: Edificio }) {
  const f = e.detalle.flujo;
  const r = e.detalle.retorno;
  if (!f) return <Vacio>Esta promoción no tiene cronograma de caja.</Vacio>;

  const tope = Math.max(...f.porMes, 1);
  const acumulado = r?.acumulado ?? [];
  const minAc = Math.min(0, ...acumulado);
  const maxAc = Math.max(0, ...acumulado);
  const rango = maxAc - minAc || 1;

  return (
    <div>
      {r && (
        <Rejilla filas={[
          ["VAN", money(r.van)],
          ["TIR anual", r.tirAnual != null ? pct(r.tirAnual) : "n/d"],
          ["Tasa de descuento", pct(r.tasaDescuento)],
          ["Capital propio máximo", money(r.capitalPropioMax)],
          ["Mes del pico de capital", r.mesCapitalPropioMax != null ? `Mes ${r.mesCapitalPropioMax}` : "n/d"],
          ["Recuperación", r.paybackSimple != null ? `Mes ${r.paybackSimple}` : "n/d"],
          ["Múltiplo sobre capital", r.multiploCapital != null ? `${r.multiploCapital.toFixed(2)}×` : "n/d"],
          ["Horizonte", `${r.horizonte} meses`],
        ]} />
      )}

      {/* El acumulado: lo hondo que llega la caja antes de recuperarse. Es la
          curva que decide cuánto capital hay que poner y cuándo. */}
      {acumulado.length > 0 && (
        <div className="mt-8">
          <span className="nota">Caja acumulada</span>
          <div className="mt-3 flex h-[140px] items-stretch gap-[2px]">
            {acumulado.map((v, i) => {
              const arriba = v >= 0;
              const alto = (Math.abs(v) / rango) * 100;
              const cero = (maxAc / rango) * 100;
              return (
                <span key={i} className="relative flex-1" title={`Mes ${i}: ${money(v)}`}>
                  <motion.span
                    className="absolute left-0 w-full rounded-[1px]"
                    initial={{ height: 0 }}
                    animate={{ height: `${alto}%` }}
                    transition={{ duration: 0.5, delay: i * 0.012, ease: SUAVE }}
                    style={{
                      bottom: arriba ? `${100 - cero}%` : undefined,
                      top: arriba ? undefined : `${cero}%`,
                      background: arriba ? "var(--etapa-obra)" : "rgb(var(--riesgo))",
                    }}
                  />
                </span>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[11.5px] tabular-nums text-tinta-400">
            <span>Mes 0</span><span>Mes {acumulado.length - 1}</span>
          </div>
        </div>
      )}

      <div className="mt-8">
        <span className="nota">Actividades del cronograma</span>
        <div className="mt-3 overflow-hidden rounded-pieza border border-trazo-fino">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-tinta-400">
                <th className="px-4 py-2.5 text-left font-libro">Actividad</th>
                <th className="px-3 py-2.5 text-right font-libro">Monto</th>
                <th className="px-4 py-2.5 text-left font-libro">Reparto en {f.horizonte} meses</th>
              </tr>
            </thead>
            <tbody>
              {f.actividades.map(a => (
                <tr key={a.nombre} className="border-t border-trazo-fino">
                  <td className="max-w-[240px] truncate px-4 py-2.5 text-tinta-900">{a.nombre}</td>
                  <td className="px-3 py-2.5 text-right font-medio tabular-nums text-tinta-950">
                    {money(a.total)}
                  </td>
                  <td className="px-4 py-2.5">
                    {/* El reparto, mes a mes: la opacidad dice cuánto cae en
                        cada uno sin necesidad de una segunda tabla. */}
                    <span className="flex h-4 gap-[1px]">
                      {a.dist.map((d, i) => (
                        <span key={i} className="flex-1 rounded-[1px]"
                              style={{
                                background: "var(--etapa-obra)",
                                opacity: d > 0 ? 0.25 + Math.min(d * 3, 0.75) : 0.06,
                              }} />
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <span className="nota">Egreso de obra por mes</span>
        <div className="mt-3 flex h-[100px] items-end gap-[3px]">
          {f.porMes.map((v, i) => (
            <motion.span key={i} className="flex-1 rounded-t-[2px] bg-minio-600"
              initial={{ height: 0 }}
              animate={{ height: `${(v / tope) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.015, ease: SUAVE }}
              title={`Mes ${i}: ${money(v)}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------- modelos, etapas, mix */

function Programa({ e }: { e: Edificio }) {
  const { modelos, etapas } = e.detalle;
  if (!modelos.length && !etapas.length)
    return <Vacio>Esta promoción no tiene modelos ni etapas: es una torre única.</Vacio>;

  return (
    <div className="grid gap-8">
      {modelos.length > 0 && (
        <div>
          <span className="nota">Modelos de vivienda</span>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {modelos.map(mo => (
              <div key={mo.nombre} className="rounded-pieza border border-trazo-fino p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-medio text-tinta-950">{mo.nombre}</span>
                  <span className="text-[13px] tabular-nums text-tinta-500">
                    {num(mo.viviendas)} uds.
                  </span>
                </div>
                <dl className="mt-3 grid gap-1.5 text-[13px]">
                  {([
                    ["Construcción", m2(mo.m2Construccion)],
                    ["Lote", m2(mo.m2Lote)],
                    ["Precio", money(mo.precioUnidad)],
                  ] as const).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-tinta-500">{k}</dt>
                      <dd className="font-medio tabular-nums text-tinta-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}

      {etapas.length > 0 && (
        <div>
          <span className="nota">Etapas de obra</span>
          <div className="mt-3 overflow-hidden rounded-pieza border border-trazo-fino">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-tinta-400">
                  <th className="px-4 py-2.5 text-left font-libro">Etapa</th>
                  <th className="px-3 py-2.5 text-right font-libro">Viviendas</th>
                  <th className="px-3 py-2.5 text-right font-libro">Construcción</th>
                  <th className="px-3 py-2.5 text-right font-libro">Indirectos</th>
                  <th className="px-3 py-2.5 text-right font-libro">Infraestructura</th>
                  <th className="px-4 py-2.5 text-right font-libro">Terreno</th>
                </tr>
              </thead>
              <tbody>
                {etapas.map(et => (
                  <tr key={et.nombre} className="border-t border-trazo-fino">
                    <td className="px-4 py-2.5 font-medio text-tinta-950">{et.nombre}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-tinta-700">
                      {num(et.viviendas)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-tinta-700">
                      {money(et.costoConstruccion)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-tinta-700">
                      {money(et.costoIndirecto)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-tinta-700">
                      {money(et.infraestructura)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-tinta-700">
                      {et.terreno > 0 ? money(et.terreno) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- desglose */

function Desglose({ e }: { e: Edificio }) {
  const r = e.detalle.resultado;
  const c = e.detalle.comercial;
  const p = e.detalle.params;

  const ingresos = ([
    ["Apartamentos / viviendas", money(r.ingresosApt)],
    ["Locales", money(r.ingresosLocales)],
    ["Estacionamientos", money(r.ingresosEstac)],
    ["Depósitos", money(r.ingresosDepositos)],
    ["Descuentos", `−${money(Math.abs(r.descuentos))}`],
    ["Precio de lista / m²", money(r.precioListaM2)],
    ["Precio neto / m²", money(r.precioNetoM2)],
  ] as [string, string][]).filter(([, v]) => v !== "$0" && v !== "−$0");

  const costes = ([
    ["Costos directos", money(r.costosDirectos)],
    ["Costos indirectos", money(r.costosIndirectos)],
    ["Terreno", money(r.terreno)],
    ["Imprevistos", money(r.imprevistos)],
    ["Comisiones", money(r.comisiones)],
    ["Publicidad", money(r.publicidad)],
    ["Gastos de administración", money(r.gastosAdmin)],
    ["Impuestos sobre ventas", money(r.impuestosVentas)],
    ["Interés bancario", money(r.interes)],
    ["Costo total / m² vendible", money(r.ctVendible)],
    ["Costo de construcción / m²", money(r.ctConstruccion)],
  ] as [string, string][]).filter(([, v]) => v !== "$0");

  return (
    <div className="grid gap-8">
      <div>
        <span className="nota">Ingresos</span>
        <div className="mt-3"><Rejilla filas={ingresos} /></div>
      </div>
      <div>
        <span className="nota">Costos</span>
        <div className="mt-3"><Rejilla filas={costes} /></div>
      </div>
      {c && (
        <div>
          <span className="nota">Hipótesis comercial</span>
          <div className="mt-3">
            <Rejilla filas={([
              ["Inicio de preventa", String(c.fechaPreventa ?? "—")],
              ["Unidades vendidas", num(Number(c.unidadesVendidas ?? 0))],
              ["m² vendidos", m2(Number(c.m2Vendidos ?? 0))],
              ["Total vendido", money(Number(c.totalVendido ?? 0))],
              ["Inicio de construcción", String(c.inicioConstruccion ?? "—")],
              ["Periodo de construcción", `${Number(c.periodoConstruccion ?? 0)} meses`],
              ...(c.ritmoObjetivo != null
                ? [["Ritmo objetivo", `${Number(c.ritmoObjetivo)} uds./mes`] as [string, string]]
                : []),
            ] as [string, string][]).filter(([, v]) => v !== "—" && v !== "0")} />
          </div>
        </div>
      )}
      {p && (
        <div>
          <span className="nota">Parámetros del estudio</span>
          <div className="mt-3">
            <Rejilla filas={Object.entries(p).map(([k, v]) => [
              ({
                descuento: "Descuento comercial", imprevistos: "Imprevistos",
                gastosAdmin: "Gastos de administración", comisiones: "Comisiones",
                publicidad: "Publicidad", impuestoTerreno: "Impuesto de terreno",
                impuestosVentas: "Impuestos sobre ventas",
              } as Record<string, string>)[k] ?? k,
              pct(Number(v), 1),
            ] as [string, string])} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- el marco */

export function DetalleProyecto({ e }: { e: Edificio }) {
  const pestanas = useMemo(() => {
    const t: { k: string; t: string; n?: number; c: React.ReactNode }[] = [
      { k: "desglose", t: "Desglose", c: <Desglose e={e} /> },
      {
        k: "presupuesto", t: "Presupuesto",
        n: e.detalle.presupuesto.reduce((a, c) => a + c.partidas.length, 0),
        c: <Presupuesto e={e} />,
      },
    ];
    if (e.detalle.areas?.unidades.length)
      t.push({ k: "unidades", t: "Unidades", n: e.detalle.areas.unidades.length, c: <Unidades e={e} /> });
    if (e.detalle.modelos.length || e.detalle.etapas.length)
      t.push({ k: "programa", t: "Programa", c: <Programa e={e} /> });
    if (e.detalle.flujo)
      t.push({ k: "flujo", t: "Caja", n: e.detalle.flujo.actividades.length, c: <Flujo e={e} /> });
    return t;
  }, [e]);

  const [activa, setActiva] = useState(pestanas[0].k);
  const actual = pestanas.find(p => p.k === activa) ?? pestanas[0];

  return (
    <section className="mt-6 overflow-hidden rounded-caja border border-trazo-fino bg-hueso-alto">
      {/* El filete que viaja lo pone ahora la primitiva: es lo que dice de dónde
          vienes al cambiar de pestaña, y lo hace sin mover nada más. Con ella
          llegan además las flechas del teclado, que aquí faltaban. */}
      <Pestanas
        id="detalle"
        className="px-4"
        activa={activa}
        alElegir={setActiva}
        pestanas={pestanas.map(p => ({ k: p.k, t: p.t, n: p.n }))}
      />

      <div className="p-5 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activa}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: SUAVE }}
          >
            {actual.c}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
