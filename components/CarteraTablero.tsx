"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, LayoutGrid, Rows3, SearchX, X } from "lucide-react";
import { EDIFICIOS, ETAPAS, estadoDe, ETAPA_NEON, tinte } from "@/lib/data";
import { moneyC, num, pct } from "@/lib/format";
import { ProjectCard } from "@/components/ProjectCard";
import { SelectorMetricas } from "@/components/SelectorMetricas";
import { useMetricas } from "@/lib/metricas";
/* Los dos desplegables van en `<select>` desnudo y no en la primitiva `Lista`:
   aquí están cosidos dentro de la misma pieza que el buscador, compartiendo su
   filete y su aro de foco, y el control completo traería el suyo propio. */
import { Boton, Tabla, useOrden, Vacio, type Columna } from "@/components/ui";
import { cx } from "@/lib/ui";

type Fila = (typeof EDIFICIOS)[number];

/**
 * Tablero de cartera: filtros y rejilla.
 *
 * Vivía dentro de `/proyectos`. Sale a componente porque la portada terminó
 * llevando el mismo tablero al pie —la idea del encargo es que se baje del
 * rótulo editorial a la herramienta sin cambiar de página— y dos copias del
 * mismo filtrado se habrían separado a la primera corrección.
 *
 * El estado se queda dentro: nadie de fuera necesita saber por qué etapa está
 * filtrando la rejilla, y subirlo obligaría a las dos páginas a declararlo.
 *
 * La ordenación se fue del desplegable a la propia cabecera de la tabla. Un
 * control de orden a un metro de la columna que ordena obliga a mirar a otro
 * sitio para cambiar algo que se decide mirando los números; en la cabecera, la
 * flecha dice además en qué sentido está. El desplegable se queda sólo para la
 * vista de tarjetas, que no tiene cabeceras donde poner nada.
 */

const ORDEN = {
  reciente: (a: Fila, b: Fila) => b.gba - a.gba,
  margen:   (a: Fila, b: Fila) => b.margen - a.margen,
  utilidad: (a: Fila, b: Fila) => b.utilidad - a.utilidad,
  nombre:   (a: Fila, b: Fila) => a.nombre.localeCompare(b.nombre, "es"),
} as const;

const NOMBRE_ORDEN: Record<keyof typeof ORDEN, string> = {
  utilidad: "mayor utilidad",
  margen: "mayor margen",
  reciente: "mayor superficie",
  nombre: "nombre",
};

export function CarteraTablero({
  etapaFija = "",
  onEtapa,
  conTabla = true,
  previo,
}: {
  /** Etapa impuesta desde fuera (la franja de etapas del consolidado). */
  etapaFija?: string;
  onEtapa?: (e: string) => void;
  /** La portada no ofrece la vista de tabla: allí sobra. */
  conTabla?: boolean;
  /** Vista guardada: se aplica antes que la búsqueda y la etapa. */
  previo?: (e: Fila) => boolean;
}) {
  const [q, setQ] = useState("");
  const [etapaLocal, setEtapaLocal] = useState("");
  const [orden, setOrden] = useState<keyof typeof ORDEN>("utilidad");
  const [vista, setVista] = useState<"tarjetas" | "tabla">("tarjetas");
  const { claves, alternar, restablecer } = useMetricas();

  const etapa = onEtapa ? etapaFija : etapaLocal;
  const setEtapa = onEtapa ?? setEtapaLocal;

  const lista = useMemo(() => {
    const s = q.toLowerCase().trim();
    return EDIFICIOS
      .filter(e => (!previo || previo(e)) && (!etapa || e.etapa === etapa) &&
        (!s || `${e.nombre} ${e.id} ${e.distrito} ${e.tipo}`.toLowerCase().includes(s)))
      .sort(ORDEN[orden]);
  }, [q, etapa, orden, previo]);

  const columnas = useMemo<Columna<Fila>[]>(() => [
    {
      k: "nombre", t: "Proyecto", valor: e => e.nombre,
      celda: e => (
        <Link href={`/proyectos/${e.id}`}
          className="flex items-center gap-2.5 font-medio text-tinta-900 transition
                     hover:text-tinta-950 hover:underline underline-offset-4">
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color }} />
          {e.nombre}
        </Link>
      ),
    },
    { k: "distrito", t: "Ubicación", valor: e => e.distrito,
      celda: e => <span className="text-tinta-700">{e.distrito}</span> },
    {
      k: "etapa", t: "Estado", valor: e => e.etapa,
      celda: e => (
        <span className="marbete" style={{
          borderColor: tinte(ETAPA_NEON[e.etapa], 33),
          background: tinte(ETAPA_NEON[e.etapa], 8),
          color: ETAPA_NEON[e.etapa],
        }}>{e.etapa}</span>
      ),
    },
    { k: "gba", t: "m² constr.", fin: true, valor: e => e.gba, celda: e => num(e.gba) },
    { k: "gla", t: "m² venta", fin: true, valor: e => e.gla, celda: e => num(e.gla) },
    { k: "uds", t: "Uds", fin: true, valor: e => e.unidades, celda: e => num(e.unidades) },
    /* Las tres columnas de dinero van compactas y no al céntimo.
       `$27,484,740.00` son quince caracteres para decir veintisiete millones, y
       repetidos en tres columnas empujan el margen —que es la conclusión— fuera
       de cuadro. Aquí la tabla sirve para comparar promociones entre sí, y para
       eso sobran los seis últimos dígitos; el importe exacto está en la ficha. */
    { k: "ventas", t: "Ingresos", fin: true, valor: e => e.ventas, celda: e => moneyC(e.ventas) },
    { k: "costo", t: "Costo", fin: true, valor: e => e.costo,
      celda: e => <span className="text-tinta-500">{moneyC(e.costo)}</span> },
    { k: "utilidad", t: "Utilidad", fin: true, valor: e => e.utilidad, celda: e => moneyC(e.utilidad) },
    {
      k: "margen", t: "Margen", fin: true, valor: e => e.margen,
      celda: e => (
        <span className="font-medio" style={{ color: estadoDe(e.margen).c }}>{pct(e.margen)}</span>
      ),
    },
  ], []);

  const tabla = useOrden(lista, columnas, "utilidad");
  const filtrado = Boolean(q || etapa);
  const limpiar = () => { setQ(""); setEtapa(""); };

  return (
    <div className="space-y-5">
      {/* La barra de herramientas.
          Tenía siete controles al mismo peso —buscar, dos desplegables, dos
          vistas, métricas, crear y comparar— y en esa fila nada destacaba: para
          encontrar el que se busca hay que leerlos todos. Ahora manda uno solo a
          la derecha, «Nuevo proyecto», que es la única acción que crea algo; lo
          demás es filtro, y el filtro va agrupado a la izquierda en una sola
          pieza con sus separadores. Comparar se fue a la ficha de gráficos, que
          es donde se compara. */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* El grupo de filtro ocupa la fila entera hasta `lg`.
            Compartiendo línea con los tres controles de la derecha, a 768 px la
            caja de búsqueda se quedaba en cuarenta píxeles —cabía una letra— y
            era el control más usado de la pantalla. Con la fila para él solo,
            los botones bajan a la siguiente y el buscador recupera su ancho. */}
        <div className="flex w-full min-w-0 items-center overflow-hidden rounded-[9px]
                        border border-trazo-medio bg-hueso-alto lg:w-auto lg:flex-1
                        focus-within:border-cian-500 focus-within:ring-[3px] focus-within:ring-cian-500/18">
          <div className="relative min-w-[120px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4
                               -translate-y-1/2 text-tinta-400" aria-hidden />
            <input value={q} onChange={e => setQ(e.target.value)}
              type="search" aria-label="Buscar promoción"
              placeholder="Buscar promoción…"
              className="h-9 w-full bg-transparent pl-10 pr-3 text-[14px] text-tinta-950
                         outline-none placeholder:text-tinta-400" />
          </div>
          <span aria-hidden className="h-5 w-px bg-trazo-fino" />
          <select value={etapa} onChange={e => setEtapa(e.target.value)}
            aria-label="Filtrar por estado"
            className="h-9 bg-transparent px-3 text-[13.5px] text-tinta-700 outline-none">
            <option value="">Todos los estados</option>
            {ETAPAS.map(s => <option key={s.etapa} value={s.etapa}>{s.etapa}</option>)}
          </select>
          {/* El orden vive en la cabecera de la tabla; en tarjetas no hay
              cabecera, así que aquí sigue haciendo falta. */}
          {vista === "tarjetas" && (
            <>
              <span aria-hidden className="h-5 w-px bg-trazo-fino" />
              <select value={orden} onChange={e => setOrden(e.target.value as keyof typeof ORDEN)}
                aria-label="Ordenar por"
                className="h-9 bg-transparent px-3 text-[13.5px] text-tinta-700 outline-none">
                {(Object.keys(NOMBRE_ORDEN) as (keyof typeof ORDEN)[]).map(k => (
                  <option key={k} value={k}>{NOMBRE_ORDEN[k]}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {conTabla && (
          <div role="group" aria-label="Vista"
               className="flex rounded-[9px] border border-trazo-medio bg-hueso-alto p-0.5">
            {([["tarjetas", LayoutGrid, "Tarjetas"], ["tabla", Rows3, "Tabla"]] as const).map(([v, Ic, t]) => (
              <button key={v} onClick={() => setVista(v)}
                aria-label={t} aria-pressed={vista === v}
                className={cx(
                  "grid h-8 w-8 place-items-center rounded-[6px] transition",
                  vista === v ? "bg-hueso-mesa text-tinta-950"
                              : "text-tinta-400 hover:text-tinta-950",
                )}>
                <Ic className="h-[16px] w-[16px]" aria-hidden />
              </button>
            ))}
          </div>
        )}

        <SelectorMetricas claves={claves} alternar={alternar} restablecer={restablecer}
                          boton="Cifras de la ficha" />

        {/* Era un botón sin destino: la única acción que crea algo y no creaba
            nada. Ahora lleva al alta. */}
        <Boton href="/proyectos/nuevo" tono="solido">
          <Plus className="h-4 w-4" /> Nuevo proyecto
        </Boton>
      </div>

      {/* Cuántos se están viendo. Sin este renglón, un filtro activo y una
          cartera corta se ven igual, y nadie sabe si falta algo o no hay más. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-[13px] text-tinta-400" aria-live="polite">
          {lista.length} {lista.length === 1 ? "proyecto" : "proyectos"}
          {filtrado && ` de ${EDIFICIOS.length}`}
          {vista === "tarjetas" && ` · ordenados por ${NOMBRE_ORDEN[orden]}`}
        </p>
        {filtrado && (
          <button onClick={limpiar}
            className="flex items-center gap-1 rounded-full bg-hueso-mesa px-2.5 py-1
                       text-[12.5px] text-tinta-700 transition hover:text-tinta-950">
            <X className="h-3 w-3" aria-hidden /> Quitar filtros
          </button>
        )}
      </div>

      {lista.length === 0 ? (
        <Vacio
          icono={SearchX}
          titulo="Ningún proyecto coincide"
          detalle={q
            ? `Nada en la cartera responde a «${q}». Prueba con el código de proyecto o el distrito.`
            : "Ese estado no tiene promociones ahora mismo."}
          accion={<Boton onClick={limpiar}>Quitar filtros</Boton>}
        />
      ) : vista === "tarjetas" || !conTabla ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((e, i) => <ProjectCard key={e.id} e={e} i={i} metricas={claves} />)}
        </div>
      ) : (
        <Tabla
          filas={tabla.filas}
          columnas={columnas}
          clave={tabla.clave}
          desc={tabla.desc}
          pulsar={tabla.pulsar}
          claveFila={e => e.id}
          alto="min(70vh, 720px)"
        />
      )}
    </div>
  );
}
