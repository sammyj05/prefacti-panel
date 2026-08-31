"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";

/* La misma curva que el resto del sitio. */
const SUAVE = [0.16, 1, 0.3, 1] as const;
import { SlidersHorizontal, ArrowUpRight, ArrowDownRight, ArrowRight, LayoutGrid } from "lucide-react";
import { EDIFICIOS, TOTALES, type Edificio } from "@/lib/data";
import { ALERTAS } from "@/lib/alertas";
import { UMBRALES } from "@/lib/equipo";
import { moneyC, pct } from "@/lib/format";
import { CarteraTablero } from "@/components/CarteraTablero";
import { Pagina } from "@/components/Pagina";
import { SelectorMetricas } from "@/components/SelectorMetricas";
import { useMetricasCartera, CARTERA_MAXIMO } from "@/lib/metricasCartera";
import { Boton, Pestanas } from "@/components/ui";

/**
 * Cartera.
 *
 * Dos cosas la separan de una maqueta.
 *
 * La primera es que las cifras dicen algo además de su propio valor. Cuatro
 * números grandes sin referencia no se pueden juzgar: `30,7 %` de margen sólo
 * significa algo al lado del 15 % que exige el comité. Cada cifra lleva ahora
 * su renglón de contexto, y el margen lleva además la distancia al umbral.
 *
 * La segunda son las vistas guardadas. Nadie que trabaje con una cartera larga
 * abre la lista completa cada mañana: abre «las que van mal» o «las que están en
 * obra». Son las tres preguntas reales que se le hacen a esta pantalla, y
 * estaban a tres filtros de distancia cada una.
 *
 * Se va la fila de etapas que había entre el panel y las vistas. Enseñaba las
 * mismas etapas con su cuenta y filtraba lo mismo, de modo que la pantalla tenía
 * dos hileras de botones seguidas para hacer un solo trabajo, con «Activas» y
 * «En estudio» repetidas literalmente en las dos. El filtro completo por etapa
 * sigue estando donde corresponde —en la barra del tablero, junto al buscador—
 * y aquí quedan sólo las vistas, que es lo que no se puede armar con un
 * desplegable.
 */

const EN_RIESGO = new Set(
  ALERTAS.filter(a => a.sev === "critica").map(a => a.proyecto));

const VISTAS = [
  { k: "todo", t: "Toda la cartera", f: null },
  { k: "riesgo", t: "En riesgo", f: (e: Edificio) => EN_RIESGO.has(e.nombre) },
  { k: "activo", t: "Activas", f: (e: Edificio) => e.etapa === "Activo" },
  { k: "estudio", t: "En estudio", f: (e: Edificio) => e.etapa === "En estudio" },
] as const;

export function Cartera() {
  const [etapa, setEtapa] = useState("");
  const [vista, setVista] = useState<(typeof VISTAS)[number]["k"]>("todo");
  const cifras = useMetricasCartera();

  const filtro = VISTAS.find(v => v.k === vista)?.f ?? null;
  /* Estable entre renderizados: el tablero lo tiene en las dependencias de su
     `useMemo`, y una función nueva en cada render lo invalidaría siempre. */
  const previo = useCallback(
    (e: Edificio) => (filtro ? filtro(e) : true),
    [filtro]);

  const bajoUmbral = EDIFICIOS.filter(e => e.margen < UMBRALES.margen).length;


  return (
    <div>
      <Pagina
        icono={LayoutGrid}
        titulo="Consolidado"
        bajada={
          bajoUmbral > 0
            ? `${bajoUmbral} de ${EDIFICIOS.length} promociones por debajo del ${pct(UMBRALES.margen, 0)} de margen que exige el comité.`
            : `Las ${EDIFICIOS.length} promociones superan el umbral del comité.`
        }
        acciones={
          <Boton href="/configuracion"><SlidersHorizontal className="h-4 w-4" /> Configurar</Boton>
        }
      >
        {/* ------------------------------------------------------ el consolidado
            La losa oscura con su bloque de color asomando por detrás se va.
            Era el gesto más llamativo de la pantalla y el que peor envejecía:
            un rectángulo de tinta a sangre, con la cifra a cinco rem y una
            caja azul desplazada catorce píxeles, se lee como una plantilla —no
            como el resumen de una cartera.

            Lo que queda es lo que hacen los paneles financieros que se miran
            todos los días: superficie de papel, filete de un píxel, la cifra
            principal grande a la izquierda y las de apoyo en columnas
            separadas por filetes verticales. El peso lo pone la tipografía y
            no el color, así que la pantalla soporta mirarla ocho horas. */}
        {/* Se permite partir la fila. El rótulo en versalitas espaciadas y el
            botón de cifras suman más de 288 px, así que en un teléfono de 320
            empujaban la página. Partidos, cada uno ocupa su línea. */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <span className="nota">Consolidado de cartera</span>
          <SelectorMetricas
            claves={cifras.claves}
            alternar={cifras.alternar}
            restablecer={cifras.restablecer}
            catalogo={cifras.todas.map(m => ({ k: m.k, t: m.t, d: m.pie }))}
            maximo={CARTERA_MAXIMO}
            rotulo="Cifras del panel"
            boton="Cifras del panel"
            ayuda={`La primera elegida va en grande. Hasta ${CARTERA_MAXIMO}.`}
          />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .5, ease: SUAVE }}
          className="mt-4 overflow-hidden rounded-[14px] border border-trazo-fino bg-hueso-alto"
        >
          {/* La mitad derecha del panel estaba vacía, con el botón flotando en
              medio de ella. Ahora la ocupa el reparto del ingreso: una sola
              barra que dice de dónde sale la conclusión de la cartera —cuánto
              del ingreso se lo lleva la obra y cuánto queda como utilidad—, que
              es la pregunta siguiente a la cifra grande y no estaba contestada
              en ninguna pantalla.

              No es un gráfico más: es la misma cifra descompuesta, así que no
              añade una idea nueva, la explica. */}
          <div className="grid gap-8 p-6 sm:p-7 lg:grid-cols-[minmax(0,auto)_minmax(0,1fr)] lg:items-end lg:gap-14 md:p-8">
            <div className="min-w-0">
              <span className="nota">{cifras.elegidas[0]?.t}</span>
              <div className="cifra mt-3 text-[clamp(2.4rem,5vw,3.6rem)] leading-[0.95] text-tinta-950">
                {cifras.elegidas[0]?.v}
              </div>
              <p className="mt-2.5 text-[14px] text-tinta-500">{cifras.elegidas[0]?.pie}</p>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="nota">Reparto del ingreso</span>
                <span className="text-[12.5px] text-tinta-500">
                  {pct(1 - TOTALES.margen, 0)} coste · {pct(TOTALES.margen, 0)} utilidad
                </span>
              </div>

              <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-hueso-mesa">
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: `${(1 - TOTALES.margen) * 100}%` }}
                  transition={{ duration: .8, delay: .15, ease: SUAVE }}
                  className="block h-full bg-tinta-950"
                />
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: `${TOTALES.margen * 100}%` }}
                  transition={{ duration: .8, delay: .35, ease: SUAVE }}
                  className="block h-full bg-minio-600"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                {([
                  ["bg-tinta-950", "Costo total", moneyC(TOTALES.costo)],
                  ["bg-minio-600", "Utilidad", moneyC(TOTALES.utilidad)],
                ] as const).map(([color, t, v]) => (
                  <span key={t} className="flex items-baseline gap-2 text-[13px]">
                    <span aria-hidden className={`h-2 w-2 shrink-0 translate-y-[-1px] rounded-full ${color}`} />
                    <span className="text-tinta-500">{t}</span>
                    <span className="font-medio tabular-nums text-tinta-950">{v}</span>
                  </span>
                ))}
                <Boton href="/simulador" talla="sm" className="ml-auto group">
                  Simular
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Boton>
              </div>
            </div>
          </div>

          {cifras.elegidas.length > 1 && (
            <div className="grid grid-cols-1 border-t border-trazo-fino
                            sm:grid-cols-3 sm:divide-x sm:divide-[var(--trazo-fino)]">
              {cifras.elegidas.slice(1).map((c, i) => (
                <motion.div key={c.k}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: .08 + i * .06, duration: .4, ease: SUAVE }}
                  className="border-t border-trazo-fino p-6 first:border-t-0 sm:border-t-0">
                  <div className="nota">{c.t}</div>
                  <div className="cifra mt-2 text-[clamp(1.5rem,2.4vw,1.95rem)] leading-none text-tinta-950">
                    {c.v}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[12.5px] text-tinta-500">
                    {c.tono === "bien" && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-minio-600" />}
                    {c.tono === "mal" && <ArrowDownRight className="h-3.5 w-3.5 shrink-0 text-riesgo" />}
                    <span className="truncate">{c.pie}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

      </Pagina>

      {/* Vistas guardadas: las tres preguntas que se le hacen a esta pantalla.
          Pasan a la primitiva, así que se mueven con el mismo muelle que la
          banda y el detalle de proyecto —antes cada uno llevaba el suyo— y
          responden a las flechas del teclado. */}
      <Pestanas
        id="vistas"
        forma="pastilla"
        className="mb-6"
        activa={vista}
        alElegir={k => setVista(k as (typeof VISTAS)[number]["k"])}
        pestanas={VISTAS.map(v => ({
          k: v.k,
          t: v.t,
          n: v.f ? EDIFICIOS.filter(v.f).length : EDIFICIOS.length,
        }))}
      />

      <CarteraTablero etapaFija={etapa} onEtapa={setEtapa} previo={previo} />
    </div>
  );
}
