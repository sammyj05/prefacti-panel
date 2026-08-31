"use client";

import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { Download, FlaskConical, AlertTriangle } from "lucide-react";
import { EDIFICIOS, BITACORA, estadoDe, ETAPA_NEON, tinte, type Edificio } from "@/lib/data";
import { ALERTAS, SEV_TONO } from "@/lib/alertas";
import { responsableDe, fechaDe, hace, UMBRALES } from "@/lib/equipo";
import { money, moneyC, num, pct, m2 } from "@/lib/format";
import { Pagina, Avatar } from "@/components/Pagina";
import { DetalleProyecto } from "@/components/DetalleProyecto";
import { Boton, Esqueleto, Marbete } from "@/components/ui";

const Massing3D = dynamic(() => import("@/components/Massing3D").then(m => m.Massing3D), {
  ssr: false,
  /* El mismo esqueleto que el resto de la aplicación, no un `animate-pulse`
     suelto: la volumetría tarda porque arrastra el motor 3D, y ese hueco es el
     que más se mira mientras carga. */
  loading: () => <Esqueleto alto={380} className="rounded-none" />,
});

/**
 * Ficha de promoción.
 *
 * Tenía la volumetría y la tabla de cotas, que es lo que hace falta para
 * entender el edificio, y nada de lo que hace falta para trabajar con él: quién
 * lo lleva, qué se le ha hecho últimamente y qué avisos tiene abiertos. Los
 * tres datos ya existían en el modelo —la bitácora, el reparto de la cartera,
 * las alertas— y ninguno llegaba hasta aquí.
 *
 * La bitácora va entera y sin recortar. Es el registro de quién cambió qué
 * hipótesis: en una discusión sobre por qué un margen bajó tres puntos, es la
 * única pantalla que responde.
 */
/**
 * La ficha entera de una promoción.
 *
 * Acepta la promoción ya resuelta en vez de buscarla por identificador, para
 * que sirva igual a las dos carteras: la de demostración, que sale de
 * `lib/data`, y la de la base, que se arma desde el `datos` de la última
 * versión. Es la misma pantalla porque es el mismo objeto — sólo cambia de
 * dónde viene.
 *
 * Lo que sólo existe en la demostración —responsable, alertas y bitácora, que
 * van indexados por la clave vieja— se resuelve a vacío para las de la base en
 * lugar de romper. Cada bloque ya sabe no pintarse si no tiene nada.
 */
export function DetalleDemo({ id, edificio }: { id?: string; edificio?: Edificio }) {
  const e = edificio ?? EDIFICIOS.find(x => x.id === id);
  if (!e) notFound();

  const deLaDemo = EDIFICIOS.some(x => x.id === e.id);
  const st = estadoDe(e.margen);
  const quien = responsableDe(deLaDemo ? e.id : "");
  const avisos = deLaDemo ? ALERTAS.filter(a => a.proyecto === e.nombre) : [];
  const apuntes = deLaDemo ? BITACORA.filter(b => b.p === e.id) : [];

  const KPI = [
    ["Utilidad neta", money(e.utilidad), st.c],
    ["Margen", pct(e.margen), st.c],
    ["ROI", pct(e.roi), undefined],
    ["TIR", e.tir === null ? "n/d" : pct(e.tir),
      e.tir !== null && e.tir < UMBRALES.tir ? "rgb(var(--tenso))" : undefined],
    ["VAN al 12 %", moneyC(e.van), undefined],
    ["Exposición máxima", moneyC(e.exposicion),
      e.exposicion > UMBRALES.exposicion ? "rgb(var(--tenso))" : undefined],
  ] as const;

  const FICHA = [
    /* «Ubicación» y no «Distrito». En Panamá el distrito es una división
       concreta —provincia, distrito, corregimiento— y de las dos promociones
       ninguna trae eso: Costa del Este es un barrio del distrito de Panamá y
       Chiriquí es una provincia entera. Llamarlo distrito da por buena una
       precisión que el dato no tiene. */
    ["Ubicación", e.distrito], ["Tipología", e.tipo], ["Estado", e.etapa],
    ["Plantas", String(e.floors)], ["Altura", `≈ ${e.alturaM} m`],
    ["m² construcción (GBA)", m2(e.gba)], ["m² venta (GLA)", m2(e.gla)],
    ["Área común", m2(e.gba - e.gla)], ["Ratio de eficiencia", pct(e.gla / e.gba)],
    ["Unidades", num(e.unidades)], ["Precio / m² vendible", money(e.ventas / e.gla)],
    ["Costo / m² vendible", money(e.costo / e.gla)],
  ] as const;

  return (
    <div>
      <Pagina
        migas={[{ t: "Cartera", h: "/proyectos" }, { t: e.nombre, h: `/proyectos/${e.id}` }]}
        titulo={
          <span className="flex min-w-0 items-center gap-3">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: e.color }} />
            <span className="truncate">{e.nombre}</span>
          </span>
        }
        /* Los dos marbetes bajan del hueco de acciones al renglón de estado.
           Ahí arriba había cuatro piezas seguidas —dos etiquetas y dos
           botones— con el mismo aire y a la misma altura, y en un teléfono se
           mezclaban en dos filas donde no se distinguía qué se podía pulsar. El
           estado no es una acción: va donde está el resto de lo que describe la
           promoción. Arriba quedan dos botones, y sólo uno es el principal. */
        bajada={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-2">
              <Marbete punto style={{ background: tinte(ETAPA_NEON[e.etapa], 12),
                                      borderColor: "transparent", color: ETAPA_NEON[e.etapa] }}>
                {e.etapa}
              </Marbete>
              <Marbete tono={st.t === "Viable" ? "bien" : st.t === "Marginal" ? "aviso" : "mal"} punto>
                {st.t}
              </Marbete>
            </span>
            {/* Iba delante `e.id` —la clave interna, «torre» o «casas»— entre el
                estado y el distrito. No es un dato de la promoción, es cómo la
                llama el fichero, y quien lee la ficha no tiene por qué saber
                que existe. El nombre ya está en el titular de arriba. */}
            <span>{e.distrito} · {e.tipo} · {e.floors} plantas</span>
            <span className="flex items-center gap-2">
              <Avatar u={quien.u} n={quien.n} tam={22} /> {quien.n}
            </span>
            {apuntes[0] && (
              <span className="text-tinta-400">Última edición {hace(fechaDe(apuntes[0].ts))}</span>
            )}
          </span>
        }
        acciones={
          <>
            <Boton href="/simulador" tono="solido">
              <FlaskConical className="h-4 w-4" aria-hidden /> Simular
            </Boton>
            <Boton><Download className="h-4 w-4" aria-hidden /> Exportar</Boton>
          </>
        }
      />

      {avisos.length > 0 && (
        <div className="mb-5 space-y-2">
          {avisos.map(a => (
            <div key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-caja px-5 py-3.5"
              style={{ background: tinte(SEV_TONO[a.sev], 10) }}>
              <AlertTriangle className="h-[17px] w-[17px] shrink-0" style={{ color: SEV_TONO[a.sev] }} />
              <span className="text-[14px] font-medio text-tinta-950">{a.titulo}</span>
              <span className="text-[13.5px] text-tinta-500">{a.detalle}</span>
              <span className="ml-auto text-[13.5px] font-medio tabular-nums"
                    style={{ color: SEV_TONO[a.sev] }}>{a.cifra}</span>
            </div>
          ))}
        </div>
      )}

      {/* Dos columnas ya en el teléfono. Apiladas de una en una, las seis cifras
          ocupaban seis pantallas antes de llegar al desglose, y son justo las
          que hay que poder comparar de un vistazo: utilidad contra margen,
          TIR contra VAN. En pareja caben las seis en una pantalla y media. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {KPI.map(([k, v, c], i) => (
          <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * .04 }}
            className="seccion min-w-0 rounded-caja px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="nota truncate text-[9.5px]">{k}</div>
            {/* La cifra escala con el ancho en vez de partirse. A 26 px fijos,
                una utilidad de ocho millones al céntimo no cabía en media
                columna de teléfono y se salía de la tarjeta. */}
            <div className="cifra mt-2 text-[clamp(1.05rem,3.6vw,1.625rem)] leading-tight"
                 style={c ? { color: c } : undefined}>{v}</div>
          </motion.div>
        ))}
      </div>

      {/* Todo lo que la promoción tiene dentro: presupuesto, unidades,
          programa y caja. Va justo debajo de los indicadores porque es lo que
          los explica — hasta ahora el margen se enseñaba sin decir de qué
          partidas salía. */}
      <DetalleProyecto e={e} />

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="seccion overflow-hidden rounded-caja">
          <header className="flex items-baseline justify-between gap-3 border-b border-trazo-fino px-6 py-4">
            <h3 className="text-[15.5px] font-medio text-tinta-950">Volumetría</h3>
            <span className="text-[12.5px] text-tinta-400">arrastra para girar · rueda para acercar</span>
          </header>
          <Massing3D e={e} />
          <p className="border-t border-trazo-fino px-6 py-4 text-[12.5px] leading-relaxed text-tinta-500">
            <b className="font-medio text-tinta-900">Volumetría indicativa.</b> Las cotas son verosímiles
            y sirven para leer la forma y la relación entre podio, torre y retranqueos — no provienen de
            un levantamiento ni de planos aprobados.
          </p>
        </section>

        <div className="space-y-5">
          <section className="seccion overflow-hidden rounded-caja">
            <header className="border-b border-trazo-fino px-6 py-4">
              <h3 className="text-[15.5px] font-medio text-tinta-950">Ficha técnica</h3>
            </header>
            <dl>
              {FICHA.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 border-b
                                        border-trazo-fino px-6 py-2.5 last:border-0">
                  <dt className="text-[13.5px] text-tinta-500">{k}</dt>
                  <dd className="text-[13.5px] font-medio tabular-nums text-tinta-950">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="seccion overflow-hidden rounded-caja">
            <header className="border-b border-trazo-fino px-6 py-4">
              <h3 className="text-[15.5px] font-medio text-tinta-950">Bitácora</h3>
            </header>
            {apuntes.length === 0 ? (
              <p className="px-6 py-6 text-[13.5px] text-tinta-400">
                Sin cambios registrados desde que se creó la promoción.
              </p>
            ) : (
              <ol>
                {apuntes.map(b => (
                  <li key={b.ts + b.a}
                      className="flex gap-3.5 border-b border-trazo-fino px-6 py-4 last:border-0">
                    <Avatar u={b.u} n={b.n} tam={28} />
                    <div className="min-w-0">
                      <p className="text-[13.5px] text-tinta-950">
                        <span className="font-medio">{b.n}</span> · {b.a.toLowerCase()}
                      </p>
                      <p className="mt-0.5 font-mono text-[12px] text-tinta-500">{b.d}</p>
                      <p className="mt-1 text-[12px] text-tinta-400">{hace(fechaDe(b.ts))}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
