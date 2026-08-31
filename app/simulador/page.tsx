"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RotateCcw, AlertTriangle, FlaskConical } from "lucide-react";
import { EDIFICIOS, estadoDe, tinte } from "@/lib/data";
import { UMBRALES } from "@/lib/equipo";
import { moneyC, num, pct } from "@/lib/format";
import { Pagina } from "@/components/Pagina";
import { Boton, Lista } from "@/components/ui";

/**
 * Simulador de escenarios.
 *
 * Dos cambios lo separan de la versión anterior, y los dos salen de mirar cómo
 * se usaría de verdad.
 *
 * Los preajustes. Nadie arrastra tres deslizadores a ciegas: se prueban dos o
 * tres escenarios con nombre —el conservador, el de obra desviada, el de precio
 * al alza— y se compara. La bitácora del modelo ya registra a Julia Castro
 * creando el escenario «Conservador» con precio −8 % y obra +8 %; ese es
 * literalmente el primer preajuste.
 *
 * El umbral. Un margen simulado sin nada al lado no dice si el escenario es
 * aceptable. Con el 15 % del comité marcado en la barra, mover el precio hasta
 * cruzar la línea es el gesto de toda la pantalla.
 */

function simular(base: (typeof EDIFICIOS)[number], f: { precio: number; obra: number; efic: number }) {
  const gla = base.gba * (base.gla / base.gba) * f.efic;
  const ventas = base.ventas * (gla / base.gla) * f.precio;
  const hard = (base.costo * 0.72) * f.obra;
  const resto = base.costo * 0.28;
  const costo = hard + resto;
  const utilidad = ventas - costo;
  return { gla, ventas, costo, utilidad, margen: ventas > 0 ? utilidad / ventas : 0,
           roi: costo > 0 ? utilidad / costo : 0, unidades: Math.round(gla / (base.gla / base.unidades)) };
}

const PREAJUSTES = [
  { t: "Caso base", d: "Sin cambios", v: { precio: 1, obra: 1, efic: 1 } },
  { t: "Conservador", d: "Precio −8 %, obra +8 %", v: { precio: 0.92, obra: 1.08, efic: 1 } },
  { t: "Obra desviada", d: "Obra +15 %", v: { precio: 1, obra: 1.15, efic: 1 } },
  { t: "Mercado al alza", d: "Precio +10 %", v: { precio: 1.10, obra: 1, efic: 1 } },
] as const;

export default function Simulador() {
  const [id, setId] = useState(EDIFICIOS[0].id);
  const [f, setF] = useState({ precio: 1, obra: 1, efic: 1 });

  const base = EDIFICIOS.find(e => e.id === id)!;
  const r = useMemo(() => simular(base, f), [base, f]);
  const st = estadoDe(r.margen);
  const d = (a: number, b: number) => (b === 0 ? 0 : a / b - 1);
  const tocado = f.precio !== 1 || f.obra !== 1 || f.efic !== 1;
  const bajoUmbral = r.margen < UMBRALES.margen;

  const CTRL = [
    ["Precio de venta", "precio"],
    ["Costo de obra", "obra"],
    ["Eficiencia (GLA/GBA)", "efic"],
  ] as const;

  /* Los importes van compactos, no al céntimo.
     `$27,484,740.00` son quince caracteres para decir veintisiete millones y
     medio, repetidos en dos columnas —simulado y base— que existen justo para
     compararse de un vistazo. Al céntimo hay que leer las dos enteras y contar
     dígitos para ver cuál es mayor, que es lo contrario de lo que pide una
     tabla de sensibilidad. La cifra exacta sigue en la ficha del proyecto. */
  const FILAS = [
    ["m² venta", num(r.gla), num(base.gla), d(r.gla, base.gla), false],
    ["Unidades", num(r.unidades), num(base.unidades), d(r.unidades, base.unidades), false],
    ["Ingresos", moneyC(r.ventas), moneyC(base.ventas), d(r.ventas, base.ventas), false],
    ["Costo", moneyC(r.costo), moneyC(base.costo), d(r.costo, base.costo), false],
    ["Utilidad", moneyC(r.utilidad), moneyC(base.utilidad), d(r.utilidad, base.utilidad), false],
    ["Margen", pct(r.margen), pct(base.margen), r.margen - base.margen, true],
    ["ROI", pct(r.roi), pct(base.roi), r.roi - base.roi, true],
  ] as const;

  /* La barra de margen llega hasta el 45 %, la misma escala que el anillo de la
     cartera, para que un margen se lea igual aquí que allí. */
  const ESCALA = 0.45;

  return (
    <div>
      <Pagina
        icono={FlaskConical}
        titulo="Simulador"
        bajada="Mueve una variable y el resultado se recalcula contra el caso base."
        acciones={
          <>
            <Lista value={id} onChange={e => setId(e.target.value)}
                   aria-label="Promoción a simular" className="w-[200px]">
              {EDIFICIOS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </Lista>
            <Boton disabled={!tocado} onClick={() => setF({ precio: 1, obra: 1, efic: 1 })}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Caso base
            </Boton>
          </>
        }
      />

      {/* `min-w-0` en las dos columnas: una casilla de rejilla no baja de su
          ancho mínimo de contenido, y la tabla de sensibilidad de la derecha
          tiene un mínimo de 482 px. En un teléfono de 375 eso empujaba la
          página entera —banda incluida— ciento veinte píxeles a la derecha. Con
          el mínimo a cero manda la columna, y la tabla se desplaza dentro de su
          propio marco, que es donde debe hacerlo. */}
      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="seccion h-fit min-w-0 rounded-caja p-5 sm:p-6">
          <h3 className="nota">Escenarios</h3>
          {/* Uno por fila, no dos por fila.
              En dos columnas, «Precio −8 %, obra +8 %» se partía en tres
              renglones dentro de una caja de ciento sesenta píxeles y las
              cuatro tarjetas salían de altura distinta. En columna cabe entero
              en una línea, el nombre queda a la izquierda y la hipótesis a la
              derecha, y las cuatro se comparan leyendo hacia abajo — que es lo
              que se hace con una lista de escenarios. */}
          <div className="mt-3.5 grid gap-1.5">
            {PREAJUSTES.map(p => {
              const on = p.v.precio === f.precio && p.v.obra === f.obra && p.v.efic === f.efic;
              return (
                <button key={p.t} onClick={() => setF({ ...p.v })}
                  aria-pressed={on}
                  className={`flex items-baseline justify-between gap-3 rounded-[9px] border
                              px-3 py-2.5 text-left transition
                    ${on ? "border-transparent bg-tinta-950 text-hueso"
                         : "border-trazo-fino bg-hueso text-tinta-900 hover:border-trazo-medio hover:bg-hueso-mesa"}`}>
                  <span className="shrink-0 text-[13.5px] font-medio">{p.t}</span>
                  <span className={`min-w-0 text-right text-[11.5px] leading-snug
                                    ${on ? "opacity-70" : "text-tinta-500"}`}>
                    {p.d}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-7 space-y-6 border-t border-trazo-fino pt-6">
            {CTRL.map(([label, k]) => {
              const val = f[k];
              /* No `id` a secas: en este ámbito ya existe el de la promoción
                 elegida, y una sombra sobre un identificador de estado es un
                 fallo esperando a que alguien mueva dos líneas de sitio. */
              const idCtrl = `ctrl-${k}`;
              return (
                /* El deslizador lleva rótulo de verdad y anuncia su valor.
                   Era un `<input type="range">` desnudo: sin `id` ni `htmlFor`,
                   con el nombre del control en un `<span>` al lado, así que un
                   lector de pantalla lo anunciaba como «control deslizante» a
                   secas y sin decir en qué porcentaje estaba. */
                <div key={k}>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor={idCtrl} className="text-[13.5px] text-tinta-700">{label}</label>
                    <span className="text-[14px] font-medio tabular-nums text-tinta-950">
                      {val > 1 ? "+" : ""}{((val - 1) * 100).toFixed(0)} %
                    </span>
                  </div>
                  <input
                    id={idCtrl} type="range" min={0.8} max={1.2} step={0.01} value={val}
                    aria-valuetext={`${((val - 1) * 100).toFixed(0)} por ciento sobre el caso base`}
                    onChange={e => setF(p => ({ ...p, [k]: parseFloat(e.target.value) }))}
                    className="mt-2.5 w-full accent-[rgb(var(--tinta-950))]" />
                  <div className="mt-0.5 flex justify-between font-mono text-[10px] text-tinta-400">
                    <span>−20 %</span><span>base</span><span>+20 %</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="min-w-0 space-y-5">
          <motion.section layout className="seccion rounded-caja p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="nota">Utilidad simulada</div>
                <div className="cifra mt-3 text-[clamp(2.6rem,4.6vw,3.8rem)] leading-none" style={{ color: st.c }}>
                  {moneyC(r.utilidad)}
                </div>
                <div className="mt-2.5 text-[13px] text-tinta-400">
                  base {moneyC(base.utilidad)} ·{" "}
                  <span style={{ color: r.utilidad >= base.utilidad ? "rgb(var(--viable))" : "rgb(var(--riesgo))" }}>
                    {r.utilidad >= base.utilidad ? "+" : "−"}{moneyC(Math.abs(r.utilidad - base.utilidad))}
                  </span>
                </div>
              </div>

              <div className="min-w-[240px] flex-1">
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="text-tinta-500">Margen</span>
                  <span className="font-medio tabular-nums" style={{ color: st.c }}>{pct(r.margen)}</span>
                </div>
                {/* La barra con el umbral marcado: cruzar la línea es el gesto
                    que responde a la única pregunta de la pantalla. */}
                {/* El umbral se marca dentro de la barra, no debajo.
                    Iba como un triangulito de diez píxeles y medio en una fila
                    propia: el punto de referencia de la pantalla entera —el
                    quince por ciento del comité— dibujado más pequeño que
                    cualquier otra cosa y separado de la barra que tiene que
                    cortar. Ahora es un listón que la cruza, y la barra puede
                    quedarse a un lado o pasar de largo, que es lo que se viene
                    a mirar. */}
                <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-hueso-mesa">
                  <motion.div
                    animate={{ width: `${Math.max(0, Math.min(1, r.margen / ESCALA)) * 100}%` }}
                    transition={{ type: "spring", stiffness: 180, damping: 26 }}
                    className="h-full rounded-full" style={{ background: st.c }} />
                  <span aria-hidden
                    className="absolute inset-y-0 w-[2px] bg-tinta-950"
                    style={{ left: `${(UMBRALES.margen / ESCALA) * 100}%` }} />
                </div>
                <div className="relative mt-1.5 h-4">
                  <span className="absolute -translate-x-1/2 whitespace-nowrap text-[11px] text-tinta-500"
                        style={{ left: `${(UMBRALES.margen / ESCALA) * 100}%` }}>
                    umbral {pct(UMBRALES.margen, 0)}
                  </span>
                </div>
              </div>
            </div>

            {bajoUmbral && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-start gap-3 rounded-[10px] p-4"
                style={{ background: tinte("rgb(var(--riesgo))", 10) }}>
                <AlertTriangle className="mt-0.5 h-[17px] w-[17px] shrink-0 text-riesgo" />
                <p className="text-[13.5px] text-tinta-900">
                  Con este escenario, <b className="font-medio">{base.nombre}</b> queda por debajo del{" "}
                  {pct(UMBRALES.margen, 0)} de margen que exige el comité. No absorbería una desviación
                  de obra del 5 %.
                </p>
              </motion.div>
            )}
          </motion.section>

          {/* `overflow-x-auto` y no `overflow-hidden`: con el segundo, en una
              pantalla estrecha las columnas de la derecha —«Base» y «Δ», que
              son las que dan sentido a la simulación— quedaban cortadas por el
              canto sin nada que indicara que estaban ahí. */}
          <section className="seccion overflow-x-auto rounded-caja">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="border-b border-trazo-fino">
                  {["Métrica", "Simulado", "Base", "Δ"].map((c, i) => (
                    <th key={c} className={`nota px-5 py-3 ${i ? "text-right" : "text-left"}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FILAS.map(([k, sim, bas, delta, esPuntos]) => {
                  const nulo = Math.abs(delta) < 1e-9;
                  return (
                    <tr key={k} className="border-b border-trazo-fino last:border-0">
                      <td className="px-5 py-3 text-[14px] text-tinta-700">{k}</td>
                      <td className="px-5 py-3 text-right text-[14.5px] font-medio tabular-nums text-tinta-950">{sim}</td>
                      <td className="px-5 py-3 text-right text-[14px] tabular-nums text-tinta-400">{bas}</td>
                      <td className="px-5 py-3 text-right text-[14px] font-medio tabular-nums"
                        style={{ color: nulo ? "rgb(var(--tinta-400))"
                                             : delta > 0 ? "rgb(var(--viable))" : "rgb(var(--riesgo))" }}>
                        {nulo ? "—"
                          : (delta > 0 ? "+" : "") + (delta * 100).toFixed(1) + (esPuntos ? " pp" : " %")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <p className="text-[12.5px] text-tinta-400">
            El escenario no se guarda.{" "}
            <Link href={`/proyectos/${base.id}`}
              className="underline decoration-trazo-medio underline-offset-4 hover:text-tinta-900">
              Abrir la ficha de {base.nombre}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
