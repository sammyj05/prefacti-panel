"use client";

import { motion } from "framer-motion";
import { EDIFICIOS, TOTALES, estadoDe, ETAPA_NEON, tinte } from "@/lib/data";
import { moneyC, num, pct } from "@/lib/format";
import { OSCURO, SUAVE } from "./piezas";

/**
 * La vitrina: el producto como ilustración del titular.
 *
 * El pliego pide que el visual del titular sea el producto. La primera versión
 * era una tabla limpia con las cifras reales, y eso ya era mejor que la
 * abstracción anterior — pero seguía sin parecerse a la aplicación. Una tabla
 * sola no es una pantalla: le faltaba lo que un promotor reconoce de un
 * vistazo, que es la banda con la empresa, los filtros, los anillos de margen y
 * la densidad de una herramienta que se usa de verdad.
 *
 * Lo que hay aquí es la pantalla de cartera entera, a escala, montada con los
 * mismos datos que sirve el motor de cálculo. Si mañana entra una promoción, la
 * portada lo dice sola.
 *
 * No va dentro de un marco de navegador falso. Un cromo de barra de direcciones
 * con tres círculos de colores no aporta información y sí resta espacio a la
 * única parte que se mira. Va como recorte limpio, con su filete y una sombra
 * larga.
 *
 * Tampoco lleva velo por abajo. Se probó —degradado que funde la última fila,
 * para insinuar que la lista sigue— y con dos promociones en cartera lo que
 * insinuaba era otra cosa: la segunda quedaba medio borrada y parecía
 * deshabilitada. Un velo de continuación sólo funciona cuando de verdad hay más
 * detrás; con la lista entera a la vista, corta datos.
 *
 * Y no es una captura: es marcado. Responde al tema, escala con el ancho y se
 * lee a cualquier tamaño. Una imagen a la mitad de resolución en la primera
 * pantalla es lo que hace que un producto parezca viejo.
 */

const NAV = ["Proyectos", "Mapa", "Simulador", "Gráficos", "Hitos", "Alertas"];

export function Vitrina() {
  const cartera = EDIFICIOS.slice(0, 3);

  return (
    <div
      className="relative overflow-hidden rounded-[14px]"
      style={{
        background: OSCURO.lamina,
        border: `1px solid ${OSCURO.borde}`,
        boxShadow: OSCURO.sombra,
      }}
    >
      {/* ------------------------------------------------------------- banda */}
      <div className="flex items-center gap-3 border-b px-3.5 py-2.5 sm:px-4"
           style={{ borderColor: OSCURO.borde, background: OSCURO.laminaAlta }}>
        <span className="marca text-[13px] leading-none">Prefacti</span>
        <span className="h-3 w-px shrink-0" style={{ background: OSCURO.borde }} />
        {/* La pastilla de empresa, con su galón: es lo primero que se reconoce
            de la banda real. */}
        <span className="flex items-center gap-1.5 rounded-[7px] border px-2 py-1 text-[11.5px]"
              style={{ borderColor: OSCURO.borde, color: OSCURO.suave }}>
          <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]"
                style={{ background: OSCURO.tenue, opacity: .5 }} />
          Cartera Aravena
        </span>
        <span className="ml-1 hidden items-center gap-4 text-[11.5px] md:flex">
          {NAV.map((t, i) => (
            <span key={t} className="relative whitespace-nowrap"
                  style={{ color: i === 0 ? OSCURO.texto : OSCURO.tenue,
                           fontWeight: i === 0 ? 560 : 400 }}>
              {t}
              {i === 0 && (
                <span aria-hidden className="absolute -inset-x-2 -inset-y-1 -z-10 rounded-[6px]"
                      style={{ background: OSCURO.acentoTenue }} />
              )}
            </span>
          ))}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <span key={i} aria-hidden className="h-5 w-5 rounded-[5px]"
                  style={{ background: OSCURO.borde }} />
          ))}
        </span>
      </div>

      {/* -------------------------------------------------------- consolidado */}
      <div className="px-4 pb-5 pt-5 sm:grid sm:grid-cols-[1.25fr_1fr_1fr_1fr] sm:items-end sm:gap-6 sm:px-6 sm:pb-6">
        <div>
          <Rotulo>Ingresos totales</Rotulo>
          <div className="cifra mt-2 text-[clamp(1.85rem,4vw,2.5rem)] leading-none"
               style={{ color: OSCURO.texto }}>
            {moneyC(TOTALES.ventas)}
          </div>
          <p className="mt-1.5 text-[12px]" style={{ color: OSCURO.tenue }}>
            {num(TOTALES.uds)} unidades en {TOTALES.activos} promociones
          </p>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4 sm:contents">
          {([
            ["Costo total", moneyC(TOTALES.costo), null],
            ["Utilidad", moneyC(TOTALES.utilidad), null],
            ["Margen", pct(TOTALES.margen), estadoDe(TOTALES.margen).c],
          ] as const).map(([t, v, color]) => (
            <div key={t} className="min-w-0 sm:border-l sm:pl-6" style={{ borderColor: OSCURO.borde }}>
              <Rotulo>{t}</Rotulo>
              <div className="cifra mt-1.5 text-[18px] leading-none"
                   style={{ color: color ?? OSCURO.texto }}>
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------- filtros
          La fila de herramientas de la cartera. Es media pantalla de la
          aplicación real y es lo que hace que esto se lea como una herramienta
          en uso en lugar de como un cuadro de cifras. */}
      <div className="flex items-center gap-2 border-y px-4 py-2.5 sm:px-6"
           style={{ borderColor: OSCURO.borde }}>
        <span className="flex h-7 flex-1 items-center gap-2 rounded-[7px] border px-2.5 text-[11.5px]"
              style={{ borderColor: OSCURO.borde, color: OSCURO.tenue }}>
          <svg viewBox="0 0 14 14" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor"
               strokeWidth="1.6" aria-hidden>
            <circle cx="6" cy="6" r="4.2" /><path d="M9.2 9.2 12.5 12.5" strokeLinecap="round" />
          </svg>
          Buscar promoción…
        </span>
        <span className="hidden h-7 items-center rounded-[7px] border px-2.5 text-[11.5px] sm:flex"
              style={{ borderColor: OSCURO.borde, color: OSCURO.suave }}>
          Todos los estados
        </span>
        <span className="flex h-7 items-center rounded-[7px] px-2.5 text-[11.5px] font-medio"
              style={{ background: OSCURO.texto, color: OSCURO.fondo }}>
          + Nuevo proyecto
        </span>
      </div>

      {/* ------------------------------------------------------------- tabla */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-[12.5px]">
          <thead>
            <tr>
              {(["Promoción", "Ubicación", "Uds", "Ingresos", "Utilidad", "Margen"]).map((c, i) => (
                <th key={c} scope="col"
                    className={`whitespace-nowrap px-4 py-2 font-mono text-[9.5px] font-semibold
                                uppercase tracking-[0.12em] sm:px-6 ${i ? "text-right" : "text-left"}`}
                    style={{ color: OSCURO.tenue }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cartera.map((e, i) => {
              const st = estadoDe(e.margen);
              return (
                <motion.tr
                  key={e.id}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.5, delay: 0.15 + i * 0.08, ease: SUAVE }}
                  className="border-t"
                  style={{ borderColor: OSCURO.borde }}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 sm:px-6">
                    <span className="flex items-center gap-2.5">
                      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: e.color }} />
                      <span className="font-medio" style={{ color: OSCURO.texto }}>{e.nombre}</span>
                      <span className="hidden rounded-full px-2 py-[1px] text-[10.5px] font-medio sm:inline"
                            style={{ background: tinte(ETAPA_NEON[e.etapa], 12),
                                     color: ETAPA_NEON[e.etapa] }}>
                        {e.etapa}
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right sm:px-6"
                      style={{ color: OSCURO.suave }}>{e.distrito}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums sm:px-6"
                      style={{ color: OSCURO.suave }}>{num(e.unidades)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums sm:px-6"
                      style={{ color: OSCURO.texto }}>{moneyC(e.ventas)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums sm:px-6"
                      style={{ color: OSCURO.texto }}>{moneyC(e.utilidad)}</td>
                  {/* El margen no es un número más: lleva su barra, como en la
                      pantalla real. Es la conclusión de la fila. */}
                  <td className="whitespace-nowrap px-4 py-2.5 sm:px-6">
                    <span className="flex items-center justify-end gap-2.5">
                      <span aria-hidden
                            className="hidden h-1 w-14 overflow-hidden rounded-full sm:block"
                            style={{ background: OSCURO.borde }}>
                        <motion.span className="block h-full rounded-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${Math.min(1, e.margen / 0.45) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: SUAVE }}
                          style={{ background: st.c }} />
                      </span>
                      <span className="font-medio tabular-nums" style={{ color: st.c }}>
                        {pct(e.margen)}
                      </span>
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}

/** El rótulo de plano. Aquí y sólo aquí: es la marca que trae el panel. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: OSCURO.tenue }}>
      {children}
    </span>
  );
}
