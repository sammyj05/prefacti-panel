import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EDIFICIOS } from "@/lib/data";
import { PillNav } from "@/components/wild/PillNav";
import { HeroVolumen } from "@/components/volumen3d/HeroVolumen";
import { FondoTorres, Escena } from "@/components/volumen3d/FondoTorres";
import { Volumen } from "@/components/inicio/Volumen";
import { Bento } from "@/components/inicio/Bento";
import { Modulos } from "@/components/inicio/Modulos";
import { Escala } from "@/components/inicio/Escala";
import { Revelar, Titular, Desfile, Iman } from "@/components/anim/Revelar";
import { BarraProgreso, Fijado } from "@/components/anim/Scroll";

/**
 * Portada de volumen.
 *
 * Es la portada de píxeles con el mismo esqueleto, las mismas secciones y los
 * mismos textos. Lo único que cambia es de qué está hecho el fondo: allí una
 * trama de 4.608 celdas que se derrumba entre siete figuras, aquí una manzana
 * de seis promociones que se levanta forjado a forjado, con la cota y la huella
 * reales de cada una.
 *
 * Se mantiene igual a propósito. Son dos apuestas para lo mismo, y compararlas
 * sólo tiene sentido si lo único distinto entre las dos es aquello que se está
 * comparando.
 */
export const metadata = {
  title: "Prefacti — Volumen",
  description:
    "La misma portada, construida con edificios en vez de píxeles: seis promociones " +
    "que se levantan forjado a forjado conforme se baja.",
};

/* Tres volumetrías de escala muy distinta —una torre de cuarenta y cuatro
   plantas, una de veintiséis y un bloque de siete— para que el conmutador
   enseñe que la forma sale del dato y no de un modelo dibujado aparte. */
const MODELOS = ["BAL-11", "SFR-07", "CAS-18"]
  .map(id => EDIFICIOS.find(e => e.id === id))
  .filter(Boolean) as typeof EDIFICIOS;

const DESFILE = [
  "Volumetría", "Superficie vendible", "Coste de obra", "Margen",
  "VAN", "TIR", "Exposición de caja", "Hitos", "Escenarios",
];

const PASOS = [
  { n: "01", t: "Creas el proyecto",
    d: "Torre o casas. Cargas los datos de entrada o importas el presupuesto de obra." },
  { n: "02", t: "Simulas escenarios",
    d: "Mueves precio, coste y terreno, y publicas las versiones que quieras comparar." },
  { n: "03", t: "Exportas y decides",
    d: "Margen, utilidad, VAN y caja, en Excel y PDF listos para el comité." },
];

export default function Portada() {
  return (
    <div className="relative min-h-screen bg-hueso">
      {/* La manzana en obra, por detrás de todo y de arriba abajo. */}
      <FondoTorres />

      {/* Y todo el contenido por encima. Sin este envoltorio, cada sección con
          fondo propio taparía la trama en su tramo y la animación se leería a
          retazos. */}
      <div className="relative z-10">
      <BarraProgreso />
      <PillNav />

      {/* 1 — La intro y el titular. */}
      <HeroVolumen />

      {/* 2 — Respiro entre la marca y el primer argumento. */}
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <div className="lamina overflow-hidden rounded-hueco">
          <Desfile piezas={DESFILE} />
        </div>
      </div>

      <Escena />

      {/* 3 — Cómo se usa. La columna izquierda se queda; los pasos pasan. */}
      <section id="producto" className="scroll-mt-0">
        <Fijado
          rotulo="Cómo se usa"
          titulo="Tres pasos, una sola pantalla."
          pasos={PASOS}
        />
      </section>

      <Escena />

      {/* 4 — Lo tridimensional, que además es el producto. */}
      <section className="mx-auto max-w-[1320px] px-4 md:px-8">
        <div className="lamina rounded-hueco px-6 py-16 md:px-12 md:py-20">
          <div className="mb-16 max-w-[36rem]">
            <Revelar>
              <span className="nota">Así se ve dentro</span>
            </Revelar>
            <Titular
              texto="El edificio y sus cifras, a la vez."
              retraso={0.1}
              className="mt-5 font-display text-[clamp(2.4rem,4.6vw,3.8rem)] leading-[1.03] text-tinta-950"
            />
          </div>
          <Volumen opciones={MODELOS} />
        </div>
      </section>

      <Escena alto="h-[55vh]" />

      {/* 5 — La escala, en cuatro cifras que se cuentan solas. */}
      <section className="mx-auto max-w-[1320px] px-4 md:px-8">
        <div className="lamina rounded-hueco px-6 py-14 md:px-12 md:py-16">
          <Escala />
        </div>
      </section>

      <Escena />

      {/* 6 — Los módulos, cruzando en horizontal. */}
      <section id="modulos">
        <div className="mx-auto max-w-[1320px] px-4 md:px-8">
          <div className="lamina max-w-[40rem] rounded-hueco px-6 py-12 md:px-10">
            <Revelar>
              <span className="nota">Qué trae</span>
            </Revelar>
            <Titular
              texto="Una aplicación, no seis hojas de cálculo."
              retraso={0.1}
              className="mt-5 font-display text-[clamp(2.4rem,4.6vw,3.8rem)] leading-[1.03] text-tinta-950"
            />
          </div>
        </div>
        <Modulos />
      </section>

      <Escena alto="h-[55vh]" />

      {/* 7 — La cartera de ejemplo, con permiso para curiosear. */}
      <section className="mx-auto max-w-[1320px] px-4 md:px-8">
        <div className="lamina rounded-hueco px-6 py-16 md:px-12 md:py-20">
          <div className="mx-auto max-w-[36rem] text-center">
            <Revelar>
              <span className="nota">Cartera de demostración</span>
            </Revelar>
            <Titular
              texto="Toda tu cartera, en un vistazo."
              retraso={0.1}
              className="mt-5 font-display text-[clamp(2.4rem,4.6vw,3.8rem)] leading-[1.03] text-tinta-950"
            />
            <Revelar retraso={0.18}>
              <p className="mt-6 text-tinta-700">
                Dieciocho promociones abiertas en Panamá. Entra y trastea.
              </p>
            </Revelar>
          </div>

          <div className="mt-16">
            <Bento />
          </div>
        </div>
      </section>

      <Escena />

      {/* 8 — Cierre. */}
      <section className="mx-auto max-w-[1320px] px-4 md:px-8">
        <div className="lamina rounded-hueco px-6 py-24 md:px-12 md:py-32">
          <div className="mx-auto max-w-[46rem] text-center">
            <Titular
              texto="Antes de comprometer capital en obra."
              className="font-display text-[clamp(2.8rem,7vw,5.4rem)] leading-[1.0] text-tinta-950"
            />
            <Revelar retraso={0.25}>
              <div className="mt-12 flex flex-wrap justify-center gap-3">
                <Iman>
                  <Link
                    href="/entrar"
                    className="group flex items-center gap-2 rounded-full bg-tinta-950 px-8 py-4
                               text-[15px] font-medio text-hueso transition hover:bg-tinta-900"
                  >
                    Crear cuenta
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Iman>
                <Iman>
                  <Link href="/entrar"
                        className="lamina rounded-full px-8 py-4 text-[15px] font-medio text-tinta-950">
                    Entrar
                  </Link>
                </Iman>
              </div>
            </Revelar>
          </div>
        </div>
      </section>

      <footer className="mt-24 border-t border-trazo-fino bg-hueso/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4
                        px-4 py-8 md:px-8">
          <span className="nota text-tinta-400">Prefacti v2 · Panamá</span>
          <div className="flex flex-wrap gap-x-7 gap-y-2">
            <Link href="/proyectos" className="nota text-tinta-400 transition hover:text-tinta-950">Cartera</Link>
            <Link href="/recursos" className="nota text-tinta-400 transition hover:text-tinta-950">Recursos</Link>
            <Link href="/entrar" className="nota text-tinta-400 transition hover:text-tinta-950">Entrar</Link>
            <Link href="/clasico" className="nota text-tinta-400 transition hover:text-tinta-950">Portada clásica</Link>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
