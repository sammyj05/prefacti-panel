import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EDIFICIOS } from "@/lib/data";
import { PillNav } from "@/components/wild/PillNav";
import { Hero } from "@/components/inicio/Hero";
import { FondoMatriz, Escena } from "@/components/inicio/FondoMatriz";
import { Volumen } from "@/components/inicio/Volumen";
import { Bento } from "@/components/inicio/Bento";
import { Modulos } from "@/components/inicio/Modulos";
import { Escala } from "@/components/inicio/Escala";
import { Revelar, Titular, Desfile, Iman } from "@/components/anim/Revelar";
import { BarraProgreso, Fijado } from "@/components/anim/Scroll";
import { PortadaModerna } from "@/components/inicio/PortadaModerna";

/**
 * Portada pública.
 *
 * El desplazamiento es el material de la página, y cada tramo lo usa de otra
 * forma: la trama de píxeles se derrumba y se recompone en una manzana de
 * torres, los tres pasos se fijan y pasan por delante, los módulos cruzan en
 * horizontal, las cifras se cuentan solas. No es variedad por variedad — cada
 * cambio de eje marca que empieza otro argumento, que en una sola columna
 * haría el salto de página.
 *
 * La paleta ya no se decide aquí: quien usa la aplicación elige entre cuatro
 * en `lib/estilo.ts`, y la portada las hereda como cualquier otra pantalla.
 */
export const metadata = {
  /* El mismo par que sirve el producto: título de pestaña por un lado y la
     línea de marca para lo que se comparte, que es donde tiene que decir algo
     en vez de describirse. */
  title: "Prefacti — Factibilidad inmobiliaria",
  description:
    "Modela la factibilidad de torres y casas, importa presupuestos de obra, " +
    "simula escenarios y calcula el interés del flujo. Beta gratuita.",
  openGraph: {
    title: "Prefacti — El número antes del ladrillo",
    description:
      "Modela la factibilidad de torres y casas, importa presupuestos de obra, " +
      "simula escenarios y calcula el interés del flujo. Beta gratuita.",
    locale: "es_PA",
    siteName: "Prefacti",
  },
};

/* Las volumetrías de la cartera, para que el conmutador enseñe que la forma
   sale del dato y no de un modelo dibujado aparte.

   Eran tres claves a mano de la cartera inventada anterior, y ninguna de las
   tres existe ya: la lista salía vacía y `Volumen` —que se protege de eso
   devolviendo `null`— hacía desaparecer la sección entera sin decir nada. */
const MODELOS = EDIFICIOS;

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
  /* La instancia de la portada moderna (puerto 3003) arranca con
     `PORTADA=moderna` y sirve la ciudad en 3D en la raíz; el resto de
     instancias siguen sirviendo la portada clásica de píxeles. */
  if (process.env.PORTADA === "moderna") return <PortadaModerna />;
  return (
    <div className="relative min-h-screen bg-hueso">
      {/* La trama, por detrás de todo y de arriba abajo. */}
      <FondoMatriz />

      {/* Y todo el contenido por encima. Sin este envoltorio, cada sección con
          fondo propio taparía la trama en su tramo y la animación se leería a
          retazos. */}
      <div className="relative z-10">
      <BarraProgreso />
      <PillNav />

      {/* 1 — La intro y el titular. */}
      <Hero />

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
