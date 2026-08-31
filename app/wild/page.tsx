import Link from "next/link";
import { EDIFICIOS, TOTALES } from "@/lib/data";
import { moneyC, pct, num } from "@/lib/format";
import { HeatMatrix } from "@/components/wild/HeatMatrix";

/**
 * Portada Wild: la cartera leída como pieza de exposición, no como panel.
 *
 * Rompe a propósito con el sistema de `hueso`/`tinta`/`minio` del resto de la
 * aplicación — aquí es blanco puro, negro puro, filete de 1 px y esquina viva,
 * sin radio ni sombra. El único color fuera de la matriz es el azul de utilidad
 * y margen, que son las dos cifras que la página existe para señalar.
 *
 * Va sin el raíl lateral (ver la excepción en `AppShell`): una portada con
 * chasis de panel deja de ser portada.
 */
export const metadata = { title: "Prefacti, Engineered" };

const NAV = [
  ["Proyectos", "/proyectos"],
  ["Mapa", "/mapa"],
  ["Gráficos", "/graficos"],
  ["Panel", "/proyectos"],
] as const;

/* Los seis de mayor margen: la portada argumenta, no inventaría. */
const DESTACADOS = [...EDIFICIOS].sort((a, b) => b.margen - a.margen).slice(0, 6);

function Cifra({ rotulo, valor, azul = false }: { rotulo: string; valor: string; azul?: boolean }) {
  return (
    <div className="px-5 py-7 md:px-7 md:py-10">
      <div className="font-swiss text-[10.5px] font-medium uppercase tracking-[0.16em] text-black">
        {rotulo}
      </div>
      <div
        className={`mt-5 font-mono text-[clamp(1.75rem,4.2vw,3.25rem)] font-medium leading-none
                    tracking-tighter ${azul ? "text-blue-600" : "text-black"}`}
      >
        {valor}
      </div>
    </div>
  );
}

function Renglon({ k, v, azul = false }: { k: string; v: string; azul?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-black px-4 py-2">
      <span className="font-swiss text-[9.5px] font-medium uppercase tracking-[0.14em] text-black">
        {k}
      </span>
      <span className={`font-mono text-[12.5px] tabular-nums ${azul ? "text-blue-600" : "text-black"}`}>
        {v}
      </span>
    </div>
  );
}

export default function Wild() {
  return (
    <div className="min-h-screen bg-white font-swiss text-black">
      {/* 1 — Cabecera */}
      <header className="flex items-center justify-between border-b border-black px-5 py-3.5 md:px-8">
        <Link href="/" className="text-[13px] font-bold uppercase tracking-tighter">
          Prefacti
        </Link>
        <nav className="flex gap-5 md:gap-8">
          {NAV.map(([t, h]) => (
            <Link
              key={t}
              href={h}
              className="font-mono text-[10.5px] uppercase tracking-[0.14em] underline-offset-4 hover:underline"
            >
              {t}
            </Link>
          ))}
        </nav>
      </header>

      {/* 2 — Rótulo de portada */}
      <section className="grid grid-cols-1 gap-10 border-b border-black px-5 pb-16 pt-14 md:grid-cols-[1fr_260px] md:gap-16 md:px-8 md:pb-24 md:pt-20">
        <h1 className="text-[clamp(3rem,11.5vw,9rem)] font-bold uppercase leading-none tracking-tighter">
          Prefacti,
          <br />
          Engineered.
        </h1>
        <div className="self-start font-swiss text-[12.5px] font-medium uppercase leading-[1.9] tracking-[0.1em]">
          A real estate
          <br />
          &amp; technology
          <br />
          partner for
          <br />
          modern developers
        </div>
      </section>

      {/* 3 — Matriz interactiva */}
      <section className="border-b border-black">
        <HeatMatrix />
      </section>

      {/* 4 — Entradilla */}
      <section className="border-b border-black px-5 py-16 md:px-8 md:py-24">
        <h2 className="max-w-[24ch] text-[clamp(1.9rem,5.4vw,4rem)] font-bold leading-[0.98] tracking-tighter">
          A short point of view from us on project margins. But first, the data:
        </h2>
      </section>

      {/* 5 — Franja de indicadores */}
      <section className="grid grid-cols-1 divide-y divide-black border-b border-black sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0">
        <Cifra rotulo="Ingresos totales" valor={moneyC(TOTALES.ventas)} />
        <Cifra rotulo="Costo total" valor={moneyC(TOTALES.costo)} />
        <Cifra rotulo="Utilidad" valor={moneyC(TOTALES.utilidad)} azul />
        <Cifra rotulo="Margen" valor={pct(TOTALES.margen)} azul />
      </section>

      {/* 6 — Fichas de proyecto, leídas como albarán técnico */}
      <section className="px-5 py-16 md:px-8 md:py-20">
        <div className="mb-8 flex items-baseline justify-between border-b border-black pb-3">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.16em]">
            Cartera — {TOTALES.activos} activos
          </h3>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em]">
            Ordenado por margen
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {DESTACADOS.map((e) => (
            <Link
              key={e.id}
              href={`/proyectos/${e.id}`}
              className="block rounded-none border border-black bg-white transition hover:bg-black hover:text-white"
            >
              <div className="flex items-baseline justify-between gap-3 px-4 py-3">
                <span className="text-[15px] font-bold uppercase tracking-tighter">{e.nombre}</span>
                <span className="font-mono text-[10.5px] tracking-[0.1em]">{e.id}</span>
              </div>
              <Renglon k="Ubicación" v={e.distrito} />
              <Renglon k="Tipo" v={e.tipo} />
              <Renglon k="Etapa" v={e.etapa} />
              <Renglon k="Unidades" v={num(e.unidades)} />
              <Renglon k="m² constr." v={num(e.gba)} />
              <Renglon k="Ingresos" v={moneyC(e.ventas)} />
              <Renglon k="Costo" v={moneyC(e.costo)} />
              <Renglon k="Utilidad" v={moneyC(e.utilidad)} azul />
              <Renglon k="Margen" v={pct(e.margen)} azul />
              <Renglon k="ROI" v={pct(e.roi)} />
            </Link>
          ))}
        </div>
      </section>

      {/* 7 — Pie */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black px-5 py-5 md:px-8">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em]">
          Prefacti v2 — Cartera Aravena, Panamá
        </span>
        <Link
          href="/proyectos"
          className="rounded-none border border-black px-3.5 py-1.5 text-[11px] font-bold uppercase
                     tracking-[0.14em] transition hover:bg-black hover:text-white"
        >
          Entrar al panel
        </Link>
      </footer>
    </div>
  );
}
