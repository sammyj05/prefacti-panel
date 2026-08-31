"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutGrid, Bell, FlaskConical, CalendarDays, Search, X, ChevronRight,
  AlertTriangle, Check, Clock, RotateCcw, TrendingUp,
} from "lucide-react";
import { EDIFICIOS, TOTALES, ETAPAS, ETAPA_NEON, estadoDe, tinte, BITACORA } from "@/lib/data";
import { ALERTAS, SEV_TONO, type Alerta } from "@/lib/alertas";
import { CRONOGRAMA } from "@/lib/hitos";
import { UMBRALES, responsableDe, ultimoApunte, fechaDe, hace } from "@/lib/equipo";
import { moneyC, num, pct, m2 } from "@/lib/format";
import { Anillo } from "@/components/Anillo";
import { Avatar } from "@/components/Pagina";
import { PortadaMovil } from "@/components/movil/Portada";

/**
 * Prefacti en un teléfono.
 *
 * No es el panel encogido, y ésa es toda la decisión. Tres cosas cambian de
 * sitio porque en una pantalla de 390 px cambian de naturaleza:
 *
 *   · La navegación baja. Siete pestañas arriba, a 844 px de alto, quedan a la
 *     distancia justa a la que no llega el pulgar. Abajo quedan cuatro, que es
 *     lo que cabe sin apretar el objetivo por debajo de los 44 px.
 *   · Las fichas se vuelven filas. Una tarjeta con anillo, dos marbetes y seis
 *     cifras mide media pantalla: tres promociones por vista y dieciocho a
 *     cuatro barridos. En fila entran seis, con el margen igual de grande.
 *   · El detalle entra por abajo, como hoja. Navegar a otra pantalla pierde el
 *     sitio de la lista; una hoja se cierra y la lista sigue donde estaba.
 *
 * Todo el estado vive aquí, en una sola pantalla con pestañas, y no en rutas.
 * En un teléfono el gesto de volver es el del sistema, y siete rutas
 * intermedias lo convierten en siete toques para salir.
 */

type Pestana = "cartera" | "alertas" | "simulador" | "hitos";

/* El «hoy» es el del panel. Aquí había otro, un día más tarde, así que el
   mismo hito podía salir a tiempo en el escritorio y atrasado en el móvil. */

const VISTAS = [
  { k: "todo", t: "Todas" },
  { k: "riesgo", t: "En riesgo" },
  { k: "activo", t: "Activas" },
  { k: "estudio", t: "En estudio" },
] as const;

const EN_RIESGO = new Set(ALERTAS.filter(a => a.sev === "critica").map(a => a.proyecto));

export function AppMovil() {
  /* Se entra por la portada, como en un teléfono de verdad: la aplicación no
     es lo primero que se ve, es lo que se abre. */
  const [dentro, setDentro] = useState(false);
  const [pestana, setPestana] = useState<Pestana>("cartera");
  const [abierta, setAbierta] = useState<string | null>(null);

  const proyecto = abierta ? EDIFICIOS.find(e => e.id === abierta) ?? null : null;

  if (!dentro) return <PortadaMovil onEntrar={() => setDentro(true)} />;

  return (
    <div className="relative flex min-h-full flex-col bg-hueso">
      <Cabecera />

      <main className="flex-1 pb-[92px]">
        {pestana === "cartera" && <Cartera onAbrir={setAbierta} />}
        {pestana === "alertas" && <Alertas onAbrir={setAbierta} />}
        {pestana === "simulador" && <Simulador />}
        {pestana === "hitos" && <Hitos onAbrir={setAbierta} />}
      </main>

      <Pestanas activa={pestana} onCambio={setPestana} />

      <AnimatePresence>
        {proyecto && <Hoja e={proyecto} onCerrar={() => setAbierta(null)} />}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------------------------------------------- cabecera */

function Cabecera() {
  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-5 pb-3"
      style={{
        /* Hueco para la isla del aparato y para la barra de estado real. */
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 46px)",
        background: "linear-gradient(178deg, rgb(var(--minio-600)), rgb(var(--minio-700)))",
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="marca text-[18px] leading-none">Prefacti</p>
        <p className="mt-1 text-[12.5px] text-white/70">Cartera Aravena</p>
      </div>
      <button aria-label="Buscar"
        className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white
                   ring-1 ring-inset ring-white/20">
        <Search className="h-[18px] w-[18px]" />
      </button>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-[13px]
                       font-medio text-minio-700">SJ</span>
    </header>
  );
}

/* ----------------------------------------------------------------- pestañas */

const TABS: { k: Pestana; t: string; ic: typeof LayoutGrid; n?: number }[] = [
  { k: "cartera", t: "Cartera", ic: LayoutGrid },
  { k: "alertas", t: "Alertas", ic: Bell, n: ALERTAS.length },
  { k: "simulador", t: "Simular", ic: FlaskConical },
  { k: "hitos", t: "Hitos", ic: CalendarDays },
];

function Pestanas({ activa, onCambio }: { activa: Pestana; onCambio: (p: Pestana) => void }) {
  return (
    <nav
      className="absolute inset-x-0 bottom-0 z-40 flex items-stretch border-t border-trazo-fino
                 bg-hueso-alto/92 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {TABS.map(t => {
        const on = activa === t.k;
        return (
          <button
            key={t.k}
            onClick={() => onCambio(t.k)}
            aria-current={on ? "page" : undefined}
            /* 44 px de alto mínimo por objetivo: por debajo, el pulgar falla. */
            className="relative flex flex-1 flex-col items-center gap-1 py-2.5 pt-3"
          >
            <span className="relative">
              <t.ic className="h-[21px] w-[21px]"
                    style={{ color: on ? "rgb(var(--minio-600))" : "rgb(var(--tinta-400))" }} />
              {t.n ? (
                <span className="absolute -right-2 -top-1 grid h-[15px] min-w-[15px] place-items-center
                                 rounded-full bg-minio-600 px-1 text-[9.5px] font-medio text-white">
                  {t.n}
                </span>
              ) : null}
            </span>
            <span className="text-[10.5px]"
                  style={{ color: on ? "rgb(var(--minio-600))" : "rgb(var(--tinta-400))",
                           fontWeight: on ? 560 : 460 }}>
              {t.t}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ cartera */

function Cartera({ onAbrir }: { onAbrir: (id: string) => void }) {
  const [vista, setVista] = useState<(typeof VISTAS)[number]["k"]>("todo");

  const lista = useMemo(() => {
    const f = {
      todo: () => true,
      riesgo: (e: (typeof EDIFICIOS)[number]) => EN_RIESGO.has(e.nombre),
      activo: (e: (typeof EDIFICIOS)[number]) => e.etapa === "Activo",
      estudio: (e: (typeof EDIFICIOS)[number]) => e.etapa === "En estudio",
    }[vista];
    return EDIFICIOS.filter(f).sort((a, b) => b.utilidad - a.utilidad);
  }, [vista]);

  const bajoUmbral = EDIFICIOS.filter(e => e.margen < UMBRALES.margen).length;

  return (
    <div>
      {/* El panel. En un teléfono no caben cuatro cifras del mismo tamaño: una
          manda y tres la acompañan a la mitad de cuerpo. */}
      <section className="panel-oscuro mx-4 mt-4 rounded-caja p-6">
        <span className="nota rotulo-claro">Ingresos de cartera</span>
        <div className="cifra mt-3 text-[42px] leading-none">{moneyC(TOTALES.ventas)}</div>
        <p className="mt-2 text-[13px] rotulo-claro">
          {num(TOTALES.uds)} unidades en {EDIFICIOS.length} promociones
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t filete-claro pt-4">
          {[["Utilidad", moneyC(TOTALES.utilidad)],
            ["Margen", pct(TOTALES.margen)],
            ["VAN", moneyC(TOTALES.van)]].map(([k, v]) => (
            <div key={k}>
              <div className="nota rotulo-claro text-[9px]">{k}</div>
              <div className="cifra mt-1.5 text-[19px] leading-none">{v}</div>
            </div>
          ))}
        </div>
      </section>

      <p className="mx-4 mt-4 flex items-center gap-2 text-[13px] text-tinta-500">
        <TrendingUp className="h-4 w-4 shrink-0 text-viable" />
        {bajoUmbral} de {EDIFICIOS.length} bajo el {pct(UMBRALES.margen, 0)} del comité
      </p>

      {/* Vistas guardadas. En tira horizontal: cuatro pastillas no caben a lo
          ancho de 390 px sin partir palabra. */}
      <div className="sin-barra mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {VISTAS.map(v => {
          const on = vista === v.k;
          return (
            <button key={v.k} onClick={() => setVista(v.k)}
              className={`shrink-0 rounded-full px-4 py-2 text-[13.5px] transition
                ${on ? "bg-tinta-950 font-medio text-hueso" : "bg-vidrio-hondo text-tinta-700"}`}>
              {v.t}
            </button>
          );
        })}
      </div>

      <p className="mx-4 mt-4 text-[12.5px] text-tinta-400">
        {lista.length} {lista.length === 1 ? "promoción" : "promociones"}
      </p>

      <ul className="mt-2 px-4 pb-6">
        {lista.map((e, i) => {
          const st = estadoDe(e.margen);
          const avisos = ALERTAS.filter(a => a.proyecto === e.nombre).length;
          return (
            <motion.li
              key={e.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.3 }}
              className={i ? "border-t border-trazo-fino" : ""}
            >
              <button onClick={() => onAbrir(e.id)}
                className="flex w-full items-center gap-4 py-4 text-left active:opacity-60">
                <Anillo v={e.margen} color={st.c} tam={54} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[16px] font-medio text-tinta-950">{e.nombre}</span>
                    {avisos > 0 && (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-riesgo" />
                    )}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-[13px] text-tinta-500">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: ETAPA_NEON[e.etapa] }} />
                    <span className="truncate">{e.etapa} · {e.distrito}</span>
                  </span>
                  <span className="mt-1.5 block text-[13px] tabular-nums text-tinta-400">
                    {moneyC(e.ventas)} · {num(e.unidades)} uds
                  </span>
                </span>
                <ChevronRight className="h-[18px] w-[18px] shrink-0 text-tinta-300" />
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ alertas */

function Alertas({ onAbrir }: { onAbrir: (id: string) => void }) {
  const [estados, setEstados] = useState<Record<string, "abierta" | "resuelta" | "pospuesta">>({});
  const estado = (id: string) => estados[id] ?? "abierta";
  const abiertas = ALERTAS.filter(a => estado(a.id) === "abierta");

  return (
    <div className="px-4 py-5">
      <h2 className="font-display text-[26px] leading-none text-tinta-950">Alertas</h2>
      <p className="mt-2.5 text-[14px] text-tinta-500">
        {abiertas.length === 0
          ? "Nada abierto. Todo dentro de los umbrales."
          : `${abiertas.length} abiertas, derivadas de las cifras.`}
      </p>

      <ul className="mt-5 space-y-3">
        {ALERTAS.map(a => {
          const e = EDIFICIOS.find(x => x.nombre === a.proyecto);
          const est = estado(a.id);
          const tono = SEV_TONO[a.sev];
          return (
            <li key={a.id}
              className="lamina rounded-caja p-4"
              style={{ opacity: est === "abierta" ? 1 : 0.55 }}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-pieza"
                      style={{ background: tinte(tono, 14) }}>
                  <AlertTriangle className="h-4 w-4" style={{ color: tono }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medio leading-snug text-tinta-950">{a.titulo}</p>
                  <p className="mt-1 text-[13px] leading-snug text-tinta-500">{a.detalle}</p>
                  <p className="mt-2 text-[13px] font-medio tabular-nums" style={{ color: tono }}>
                    {a.cifra}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-trazo-fino pt-3">
                {e && (
                  <button onClick={() => onAbrir(e.id)}
                    className="flex-1 truncate rounded-full bg-vidrio-hondo px-3 py-2 text-left
                               text-[13px] text-tinta-700 active:opacity-60">
                    {a.proyecto}
                  </button>
                )}
                {est === "abierta" ? (
                  <>
                    <button aria-label="Posponer"
                      onClick={() => setEstados(p => ({ ...p, [a.id]: "pospuesta" }))}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full
                                 bg-vidrio-hondo text-tinta-500 active:opacity-60">
                      <Clock className="h-4 w-4" />
                    </button>
                    <button aria-label="Resolver"
                      onClick={() => setEstados(p => ({ ...p, [a.id]: "resuelta" }))}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full
                                 bg-tinta-950 text-hueso active:opacity-60">
                      <Check className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button aria-label="Reabrir"
                    onClick={() => setEstados(p => ({ ...p, [a.id]: "abierta" }))}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full
                               bg-vidrio-hondo text-tinta-700 active:opacity-60">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- simulador */

const PREAJUSTES = [
  { t: "Base", v: { precio: 1, obra: 1 } },
  { t: "Conservador", v: { precio: 0.92, obra: 1.08 } },
  { t: "Obra +15 %", v: { precio: 1, obra: 1.15 } },
  { t: "Precio +10 %", v: { precio: 1.1, obra: 1 } },
] as const;

function Simulador() {
  const [id, setId] = useState(EDIFICIOS[0].id);
  const [f, setF] = useState({ precio: 1, obra: 1 });
  const base = EDIFICIOS.find(e => e.id === id)!;

  const r = useMemo(() => {
    const ventas = base.ventas * f.precio;
    const costo = base.costo * 0.72 * f.obra + base.costo * 0.28;
    const utilidad = ventas - costo;
    return { ventas, costo, utilidad, margen: ventas ? utilidad / ventas : 0 };
  }, [base, f]);

  const st = estadoDe(r.margen);
  const bajo = r.margen < UMBRALES.margen;
  const ESCALA = 0.45;

  return (
    <div className="px-4 py-5">
      <h2 className="font-display text-[26px] leading-none text-tinta-950">Simulador</h2>

      <select value={id} onChange={e => setId(e.target.value)}
        className="campo mt-4 w-full rounded-full">
        {EDIFICIOS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
      </select>

      <section className="lamina mt-4 rounded-caja p-5">
        <span className="nota">Utilidad simulada</span>
        <div className="cifra mt-3 text-[38px] leading-none" style={{ color: st.c }}>
          {moneyC(r.utilidad)}
        </div>
        <p className="mt-2 text-[13px] text-tinta-400">
          base {moneyC(base.utilidad)} ·{" "}
          <span style={{ color: r.utilidad >= base.utilidad ? "rgb(var(--viable))" : "rgb(var(--riesgo))" }}>
            {r.utilidad >= base.utilidad ? "+" : "−"}{moneyC(Math.abs(r.utilidad - base.utilidad))}
          </span>
        </p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-tinta-500">Margen</span>
            <span className="font-medio tabular-nums" style={{ color: st.c }}>{pct(r.margen)}</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-vidrio-hondo">
            <motion.div
              animate={{ width: `${Math.max(0, Math.min(1, r.margen / ESCALA)) * 100}%` }}
              transition={{ type: "spring", stiffness: 180, damping: 26 }}
              className="h-full rounded-full" style={{ background: st.c }} />
          </div>
          <div className="relative mt-1 h-4">
            <span className="absolute -translate-x-1/2 text-[10.5px] text-tinta-400"
                  style={{ left: `${(UMBRALES.margen / ESCALA) * 100}%` }}>
              ▲ {pct(UMBRALES.margen, 0)}
            </span>
          </div>
        </div>

        {bajo && (
          <p className="mt-4 rounded-pieza p-3 text-[13px] leading-snug text-tinta-900"
             style={{ background: tinte("rgb(var(--riesgo))", 10) }}>
            Por debajo del {pct(UMBRALES.margen, 0)} que exige el comité.
          </p>
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {PREAJUSTES.map(p => {
          const on = p.v.precio === f.precio && p.v.obra === f.obra;
          return (
            <button key={p.t} onClick={() => setF({ ...p.v })}
              className={`rounded-pieza px-3 py-3 text-[13.5px] font-medio transition
                ${on ? "bg-tinta-950 text-hueso" : "bg-vidrio-hondo text-tinta-900"}`}>
              {p.t}
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-6">
        {([["Precio de venta", "precio"], ["Costo de obra", "obra"]] as const).map(([t, k]) => (
          <div key={k}>
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] text-tinta-700">{t}</span>
              <span className="text-[15px] font-medio tabular-nums text-tinta-950">
                {f[k] > 1 ? "+" : ""}{((f[k] - 1) * 100).toFixed(0)} %
              </span>
            </div>
            {/* Alto de 28 px en el control: el pulgar no acierta un riel de 4. */}
            <input type="range" min={0.8} max={1.2} step={0.01} value={f[k]}
              onChange={e => setF(p => ({ ...p, [k]: parseFloat(e.target.value) }))}
              className="mt-3 h-7 w-full accent-[rgb(var(--minio-600))]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- hitos */

const FECHA = new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", year: "numeric" });

function Hitos({ onAbrir }: { onAbrir: (id: string) => void }) {
  const pendientes = useMemo(() => {
    /* El mismo cronograma que la pantalla de escritorio. Estaba calculado otra
       vez aquí, con su propia ancla en 2024, y las dos pantallas contaban
       calendarios distintos de la misma promoción. */
    return CRONOGRAMA
      .flatMap(({ e, h }) => h
        .filter(x => x.estado !== "cumplido")
        .map(x => ({ n: x.n, d: x.d, tarde: x.estado === "atrasado", e })))
      .sort((a, b) => +a.d - +b.d);
  }, []);

  const tarde = pendientes.filter(x => x.tarde);

  return (
    <div className="px-4 py-5">
      <h2 className="font-display text-[26px] leading-none text-tinta-950">Hitos</h2>
      <p className="mt-2.5 text-[14px] text-tinta-500">
        {tarde.length} por detrás de su fecha.
      </p>

      <ul className="mt-5">
        {pendientes.slice(0, 18).map((x, i) => (
          <li key={`${x.e.id}-${x.n}-${i}`} className={i ? "border-t border-trazo-fino" : ""}>
            <button onClick={() => onAbrir(x.e.id)}
              className="flex w-full items-center gap-3 py-3.5 text-left active:opacity-60">
              <span className="w-[52px] shrink-0">
                <span className="block text-[11px] uppercase tracking-wider text-tinta-400">
                  {x.d.toLocaleDateString("es", { month: "short" })}
                </span>
                <span className="cifra block text-[20px] leading-none text-tinta-950">
                  {x.d.getDate()}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] text-tinta-950">{x.n}</span>
                <span className="mt-0.5 block truncate text-[13px] text-tinta-500">{x.e.nombre}</span>
              </span>
              <span className="shrink-0 text-[12px] font-medio"
                    style={{ color: x.tarde ? "rgb(var(--riesgo))" : "rgb(var(--tinta-400))" }}>
                {x.tarde ? "Atrasado" : "Previsto"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------------- hoja */

/**
 * La hoja de detalle.
 *
 * Entra desde abajo y se cierra con el asa o con el velo. No navega: la lista
 * de detrás no se ha movido, así que cerrar devuelve el sitio exacto — que en
 * una lista de dieciocho es la diferencia entre consultar dos fichas y perder
 * el hilo en la segunda.
 */
function Hoja({ e, onCerrar }: { e: (typeof EDIFICIOS)[number]; onCerrar: () => void }) {
  const st = estadoDe(e.margen);
  const avisos = ALERTAS.filter(a => a.proyecto === e.nombre);
  const quien = responsableDe(e.id);
  const apuntes = BITACORA.filter(b => b.p === e.id);

  const KPI = [
    ["Ingresos", moneyC(e.ventas)], ["Costo", moneyC(e.costo)],
    ["Utilidad", moneyC(e.utilidad)], ["ROI", pct(e.roi)],
    ["VAN", moneyC(e.van)], ["Exposición", moneyC(e.exposicion)],
    ["m² construcción", m2(e.gba)], ["m² vendibles", m2(e.gla)],
  ] as const;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onCerrar}
        className="absolute inset-0 z-40 bg-tinta-950/45"
      />
      <motion.section
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => { if (info.offset.y > 120) onCerrar(); }}
        className="absolute inset-x-0 bottom-0 z-50 max-h-[88%] overflow-y-auto rounded-t-[1.75rem]
                   bg-hueso-alto"
        style={{ boxShadow: "var(--sombra-3d-viva)" }}
      >
        {/* El asa. Arrastrar hacia abajo cierra: es el gesto que la gente
            prueba primero, y sin él la hoja obliga a apuntar al aspa. */}
        <div className="sticky top-0 z-10 bg-hueso-alto pt-2.5">
          <div className="mx-auto h-1 w-10 rounded-full bg-trazo-medio" />
          <div className="flex items-start gap-3 px-5 pb-4 pt-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[26px] leading-tight text-tinta-950">
                {e.nombre}
              </p>
              <p className="mt-1 text-[13.5px] text-tinta-500">
                {e.distrito} · {e.floors} plantas · {num(e.unidades)} uds
              </p>
            </div>
            <button onClick={onCerrar} aria-label="Cerrar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-vidrio-hondo
                         text-tinta-500 active:opacity-60">
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-10">
          <div className="flex items-center gap-5 rounded-caja bg-vidrio-hondo p-5">
            <Anillo v={e.margen} color={st.c} tam={86} />
            <div className="min-w-0">
              <span className="marbete" style={{ borderColor: "transparent",
                background: tinte(st.c, 12), color: st.c }}>{st.t}</span>
              <p className="mt-2.5 text-[13.5px] leading-snug text-tinta-500">
                Margen sobre ingresos, contra el {pct(UMBRALES.margen, 0)} del comité.
              </p>
            </div>
          </div>

          {avisos.map(a => (
            <div key={a.id} className="mt-3 flex items-start gap-3 rounded-caja p-4"
                 style={{ background: tinte(SEV_TONO[a.sev], 10) }}>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"
                             style={{ color: SEV_TONO[a.sev] }} />
              <div className="min-w-0">
                <p className="text-[14px] font-medio text-tinta-950">{a.titulo}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-tinta-500">{a.detalle}</p>
              </div>
            </div>
          ))}

          <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5">
            {KPI.map(([k, v]) => (
              <div key={k}>
                <div className="nota text-[9.5px]">{k}</div>
                <div className="cifra mt-1.5 text-[21px] text-tinta-950">{v}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2.5 border-t border-trazo-fino pt-4">
            <Avatar u={quien.u} n={quien.n} tam={28} />
            <span className="text-[13.5px] text-tinta-700">{quien.n}</span>
            {ultimoApunte(e.id) && (
              <span className="ml-auto text-[12.5px] text-tinta-400">
                {hace(fechaDe(ultimoApunte(e.id)!.ts))}
              </span>
            )}
          </div>

          {apuntes.length > 0 && (
            <ol className="mt-4 space-y-3">
              {apuntes.map(b => (
                <li key={b.ts + b.a} className="rounded-pieza bg-vidrio-hondo p-3.5">
                  <p className="text-[13.5px] text-tinta-950">
                    <span className="font-medio">{b.n}</span> · {b.a.toLowerCase()}
                  </p>
                  <p className="mt-1 font-mono text-[11.5px] text-tinta-500">{b.d}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </motion.section>
    </>
  );
}
