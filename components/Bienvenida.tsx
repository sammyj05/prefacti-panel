import Link from "next/link";
import {
  ArrowRight, Building2, Calculator, GanttChart, LineChart, Ruler, Wallet,
} from "lucide-react";
import { Pagina } from "@/components/Pagina";

/**
 * La primera pantalla de una empresa recién abierta.
 *
 * Un panel vacío no se lee como «todavía no hay nada»: se lee como que algo ha
 * fallado. Y el vacío de una herramienta de factibilidad es especialmente
 * confuso, porque lo que se espera es una cartera con cifras y lo que hay es
 * papel en blanco.
 *
 * Así que en lugar del consolidado —que sin promociones sería una fila de
 * ceros— se cuenta el orden de trabajo: qué se hace primero, qué sale de cada
 * paso y dónde vive cada cosa en el panel. Es la misma secuencia que la portada
 * pública explica en cinco pasos, sólo que aquí ya se está dentro y cada paso
 * apunta a la pantalla que le toca.
 *
 * Y termina donde tiene que empezar el trabajo: el botón lleva al alta de la
 * primera promoción. Estuvo un rato sin él —no se podía crear todavía— y una
 * guía que explica cinco pasos y no deja dar el primero es media guía.
 */

const PASOS = [
  {
    ic: Building2,
    t: "Crea la promoción",
    d: "Torre o conjunto de casas. Le pones nombre, ubicación y en qué etapa está; el resto se ajusta después.",
  },
  {
    ic: Ruler,
    t: "Carga el cuadro de áreas",
    d: "Unidades por tipología con su superficie y su precio por m². De aquí sale el ingreso, así que es lo primero que hay que tener.",
  },
  {
    ic: Calculator,
    t: "Importa el presupuesto",
    d: "Capítulos y partidas con medición y precio unitario, más indirectos y terreno. Con esto el resultado ya se calcula solo.",
  },
  {
    ic: Wallet,
    t: "Programa la caja",
    d: "Reparte los desembolsos por actividad sobre el plazo de obra. Es lo que convierte una cuenta estática en un flujo con su interés.",
  },
  {
    ic: LineChart,
    t: "Simula y decide",
    d: "Mueve precio, coste y terreno, compara versiones y mira margen, VAN, TIR y el pico de caja contra tus umbrales.",
  },
];

const DONDE = [
  ["Proyectos", "La cartera y la ficha de cada promoción, con su desglose, presupuesto, unidades y caja."],
  ["Simulador", "Los deslizadores. Cada cifra se recalcula contra el caso base."],
  ["Gráficos", "La cartera comparada: utilidad, margen, VAN y superficie, promoción a promoción."],
  ["Hitos", "El cronograma. Lo que ya pasó de fecha sale en rojo."],
  ["Alertas", "Lo que incumple tus umbrales, recalculado con el modelo."],
  ["Recursos", "Planos, contratos y estudios, por promoción."],
  ["Configuración", "Los umbrales del comité, el equipo y sus permisos, y la ayuda."],
];

export function Bienvenida({ empresa }: { empresa: string | null }) {
  return (
    <div className="max-w-[70rem]">
      <Pagina
        icono={GanttChart}
        titulo={empresa ? `${empresa} está lista` : "Tu empresa está lista"}
        bajada="Todavía no hay promociones. Así es el orden de trabajo."
      />

      {/* Los cinco pasos, en lista numerada y no en rejilla: el orden es la
          información. Sin cuadro de áreas no hay ingreso, y sin presupuesto el
          margen no significa nada. */}
      <section className="seccion overflow-hidden rounded-caja">
        {PASOS.map((p, i) => (
          <div key={p.t}
               className="grid gap-2 border-b border-trazo-fino px-6 py-5 last:border-0
                          sm:grid-cols-[auto_minmax(0,22rem)_minmax(0,1fr)] sm:items-baseline sm:gap-6">
            <span className="nota tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <span className="flex items-center gap-2.5 text-[15.5px] font-medio text-tinta-950">
              <p.ic className="h-4 w-4 shrink-0 text-minio-600" aria-hidden />
              {p.t}
            </span>
            <span className="text-[13.5px] leading-relaxed text-tinta-500">{p.d}</span>
          </div>
        ))}
      </section>

      <section className="seccion mt-5 overflow-hidden rounded-caja">
        <header className="border-b border-trazo-fino px-6 py-4">
          <h2 className="text-[15.5px] font-medio text-tinta-950">Dónde está cada cosa</h2>
        </header>
        {DONDE.map(([k, d]) => (
          <div key={k}
               className="grid gap-1 border-b border-trazo-fino px-6 py-3.5 last:border-0
                          sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
            <span className="text-[14px] font-medio text-tinta-950">{k}</span>
            <span className="text-[13.5px] leading-relaxed text-tinta-500">{d}</span>
          </div>
        ))}
      </section>

      <section className="seccion mt-5 rounded-caja px-6 py-5">
        <h2 className="text-[15px] font-medio text-tinta-950">Empieza por el paso 01</h2>
        <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-tinta-500">
          Crea la promoción con lo mínimo —nombre, tipo y dónde está— y el
          estudio se carga después desde su ficha. Nace en ceros: sin unidades
          ni presupuesto no hay ingreso ni coste, y eso es lo que tiene que
          decir hasta que cargues el primero.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link
            href="/proyectos/nuevo"
            className="inline-flex h-10 items-center gap-1.5 rounded-control bg-minio-600
                       px-4 text-[14px] font-medio text-white transition-opacity hover:opacity-90"
          >
            Crear la primera promoción
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link
            href="/configuracion"
            className="text-[13.5px] text-tinta-500 underline-offset-2 hover:text-tinta-900
                       hover:underline"
          >
            o revisa los umbrales del comité
          </Link>
        </div>
      </section>
    </div>
  );
}
