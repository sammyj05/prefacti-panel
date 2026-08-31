"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  AnimatePresence, MotionConfig, motion, useMotionValueEvent, useScroll,
} from "framer-motion";
import {
  ArrowRight, ArrowUpRight, Gauge, Layers, Menu, Ruler, Search, X,
} from "lucide-react";
import {
  FichaPortada, GraficoBrecha, Guias, MarcaCota, MiniCaja, MiniHitos, MiniMapa,
  MiniSimulador, OSCURO, Paralaje, Pregunta, Pulso, Revelar, SUAVE, Tecla,
  Trama, useAtajos, useSeccionActiva,
} from "./moderna/piezas";
import { Vitrina } from "./moderna/Vitrina";
import { MarcaAnimada } from "@/components/MarcaAnimada";
import { TemaToggle } from "@/components/TemaToggle";
import { EDIFICIOS, estadoDe } from "@/lib/data";
import { moneyC, num, pct } from "@/lib/format";
import { useCierreExterno } from "@/lib/ui";

/**
 * La portada.
 *
 * El registro es el de una hoja de dibujo: papel cálido, retícula milimetrada,
 * líneas maestras punteadas con sus escuadras, rótulo en serif y el cuerpo de
 * apoyo en mono. No es un capricho de estilo — es de lo que va el producto. Una
 * herramienta que convierte unos datos de entrada en una factibilidad vive entre
 * planos, cotas y normas de suelo, y una portada compuesta como una hoja de proyecto
 * lo dice antes de que nadie lea una palabra. El azul del acento deja de sonar
 * a botón de aplicación y suena a tinta de plano, que es lo que es.
 *
 * Lo que se corrigió de la versión anterior:
 *
 * El visual era una ficha con tres cifras inventadas sobre una lámina, puesta a
 * la mitad del tamaño del rótulo. Ahora es la pantalla de cartera de verdad, a
 * todo el ancho y debajo del texto. La ficha interactiva no se tira: baja a la
 * sección del simulador, que es de lo que habla.
 *
 * «Crear cuenta» y «entra a la demo» arrancaban en la misma línea de base, así
 * que pesaban lo mismo pese a que uno era pastilla y el otro texto. Ahora son
 * dos botones de verdad con distinto tono, y cada uno enseña su atajo.
 *
 * Y la franja de cifras decía «2 promociones en cartera» como si fuera
 * tracción. La sustituye la banda de tres columnas con lo que la herramienta
 * hace, y más abajo, lo que un estudio produce contado desde el dato.
 */

const CAPACIDADES = [
  {
    t: "Mapa", d: "Cada promoción sobre el plano, con su ubicación y la etapa en la que está.",
    v: <MiniMapa />, h: "/mapa",
  },
  {
    t: "Simulador", d: "Mueve precio, coste y terreno con deslizadores y mira cómo cambia cada cifra al instante.",
    v: <MiniSimulador />, h: "/simulador",
  },
  {
    t: "Gráficos", d: "Margen, utilidad, VAN y curva de caja, sin montar una hoja nueva cada vez.",
    v: <MiniCaja />, h: "/graficos",
  },
  {
    t: "Hitos", d: "Cronograma con dependencias: permisos, obra y entregas. Lo que se retrasa mueve la caja.",
    v: <MiniHitos />, h: "/hitos",
  },
];

/* La banda de tres que va justo bajo el titular: lo que la herramienta es, en
   una línea cada cosa. Van en mono, como la cota de un plano. */
const PILARES = [
  {
    ic: Ruler, t: "Medido",
    d: "Ingresos, costes directos e indirectos, absorción y margen, desde tus datos de entrada.",
  },
  {
    ic: Gauge, t: "Financiado",
    d: "Desembolsos por actividad sobre el cronograma, con el interés bancario calculado.",
  },
  {
    ic: Layers, t: "Comparable",
    d: "Versiones publicadas y proyectos lado a lado, con las mismas reglas para todos.",
  },
];

const PREGUNTAS = [
  {
    p: "¿Qué necesito para empezar un estudio?",
    r: "Tus datos de entrada, y si ya tienes el presupuesto de obra en Excel, mejor: se importa. Creas el proyecto —torre o casas—, cargas lo que tengas y el Master Finanzas calcula ingresos, costes y margen al instante. Lo que falte se deja en estimación y se ajusta después.",
  },
  {
    p: "¿Sustituye a mi hoja de cálculo?",
    r: "Sustituye a montarla desde cero cada vez. Las reglas —cómo se reparte el coste, cómo se descuenta la caja, cómo se calcula el VAN— ya están escritas y son las mismas en toda la cartera, así que dos promociones se pueden comparar de verdad. Lo que la hoja hace bien, que es tocar un número y ver qué pasa, sigue estando.",
  },
  {
    p: "¿Puedo comparar escenarios?",
    r: "Sí. Publicas versiones que ya no cambian, con su hipótesis y su resultado, y el comparador las pone una al lado de otra —o dos proyectos enteros. Es lo que convierte «creo que sale» en «sale con estos números y no con estos otros».",
  },
  {
    p: "¿Los datos son míos?",
    r: "Tuyos. Cada empresa va aislada de las demás, con sus roles y su bitácora, y cualquier estudio se exporta a Excel o PDF en cualquier momento, con sus hipótesis y su resultado.",
  },
  {
    p: "¿Cuánto cuesta?",
    r: "Nada durante la beta: acceso completo a todas las herramientas, sin tarjeta de crédito. Es la fase en la que estamos.",
  },
];

/* Lo que devuelve un estudio, contado desde el estudio de verdad. */
const MUESTRA = EDIFICIOS[0];

/**
 * La cuenta de resultados de la promoción de muestra.
 *
 * Sale del resultado que devuelve el motor, no de una lista escrita a mano: si
 * el cálculo cambia, la portada cambia con él. El orden es el de una cuenta —
 * ingresos, menos costes, igual a utilidad— y los descuentos y el coste van con
 * su signo, que es como se leen en una hoja de verdad.
 */
const R = MUESTRA.detalle.resultado;
const BALANCE: {
  t: string; v: string; fuerte?: boolean; regla?: boolean; sangria?: boolean; tono?: string;
}[] = [
  { t: "Venta de unidades", v: moneyC(R.ingresosApt), sangria: true },
  { t: "Locales y estacionamientos", v: moneyC(R.ingresosLocales + R.ingresosEstac), sangria: true },
  { t: "Descuentos comerciales", v: `−${moneyC(Math.abs(R.descuentos))}`, sangria: true },
  { t: "Ingresos totales", v: moneyC(MUESTRA.ventas), fuerte: true, regla: true },

  { t: "Costos directos de obra", v: `−${moneyC(R.costosDirectos)}`, sangria: true },
  { t: "Costos indirectos", v: `−${moneyC(R.costosIndirectos)}`, sangria: true },
  { t: "Terreno", v: `−${moneyC(R.terreno)}`, sangria: true },
  { t: "Comisiones y publicidad", v: `−${moneyC(R.comisiones + R.publicidad)}`, sangria: true },
  { t: "Costo total", v: `−${moneyC(MUESTRA.costo)}`, fuerte: true, regla: true },

  { t: "Utilidad neta", v: moneyC(MUESTRA.utilidad), fuerte: true, regla: true },
];
/* Las cuatro cifras de la banda. Nombre corto arriba y de dónde sale debajo:
   una cifra sin procedencia es una cifra de escaparate, y ésta es la sección
   donde más fácil sería inventarlas. */
const PRODUCE = [
  {
    n: MUESTRA.detalle.presupuesto.reduce((a, c) => a + c.partidas.length, 0),
    t: "Partidas de obra",
    d: "Cada una con su medición, su unidad y su precio unitario.",
  },
  {
    n: MUESTRA.detalle.areas?.unidades.length ?? MUESTRA.unidades,
    t: "Unidades dimensionadas",
    d: "Una a una, con superficie, tipo y precio de salida.",
  },
  {
    n: num(MUESTRA.gba),
    t: "m² de construcción",
    d: "Repartidos entre vendible y común según la eficiencia del proyecto.",
  },
  {
    n: MUESTRA.detalle.flujo?.actividades.length ?? 0,
    t: "Actividades de caja",
    d: "El cobro y el pago mes a mes, hasta la entrega de la última llave.",
  },
];

/**
 * Los cinco pasos de un estudio.
 *
 * Es el orden real en el que se construye una factibilidad, y por eso va como
 * lista numerada y no como rejilla de tarjetas: el orden es la información. Sin
 * cuadro de áreas no hay ingreso, y sin presupuesto el margen no significa
 * nada.
 */
const PASOS = [
  {
    t: "El proyecto",
    d: "Creas el proyecto —torre o conjunto de casas— y eres su propietario. Los datos de entrada son tuyos y la empresa va aislada del resto.",
  },
  {
    t: "El cuadro de áreas",
    d: "Unidades por tipología, con importación desde Excel, precio por m² y los totales que alimentan la factibilidad.",
  },
  {
    t: "El presupuesto",
    d: "Importas el presupuesto de obra —directos, indirectos y terreno— y el Master Finanzas calcula ingresos, costes y margen al instante.",
  },
  {
    t: "El flujo de caja",
    d: "Programas los desembolsos por actividad sobre el cronograma y sale el interés bancario calculado, no estimado a ojo.",
  },
  {
    t: "La decisión",
    d: "Simulas escenarios con los deslizadores, comparas versiones publicadas y exportas a Excel y PDF para el comité.",
  },
];

/** La columna maestra. Todo se alinea contra ella, y las guías la hacen ver. */
const COLUMNA = "mx-auto w-full max-w-[1140px] px-5 sm:px-8";

/* Los tres destinos de la banda, y el ancla de la sección que marca cada uno. */
const NAVEGACION = [
  ["Producto", "producto"],
  ["Cómo se usa", "uso"],
  ["Preguntas", "preguntas"],
] as const;

const SECCIONES = NAVEGACION.map(([, id]) => id);

/* Las teclas que la banda enseña, y a dónde llevan. Fuera del componente para
   que el objeto no cambie de identidad en cada pintado y el oyente no se
   vuelva a colgar del documento sesenta veces por segundo. */
const ATAJOS = { d: "/proyectos", e: "/entrar" };

export function PortadaModerna() {
  const { scrollY, scrollYProgress } = useScroll();
  const [abierta, setAbierta] = useState<number | null>(0);

  /* La banda se posa en cuanto la página se mueve: recoge dos píxeles de alto,
     estrena filete y separa lo que pasa por debajo. Arriba del todo no hace
     falta ninguna de las tres cosas, y sin filete la primera pantalla se lee de
     un tirón en vez de empezar con una raya. */
  const [posada, setPosada] = useState(false);
  useMotionValueEvent(scrollY, "change", v => setPosada(v > 8));

  const activa = useSeccionActiva(SECCIONES);
  useAtajos(ATAJOS);

  /* En estrecho no cabe la navegación, y hasta ahora eso quería decir que las
     tres secciones no existían: la banda se quedaba en marca, interruptor y
     «Entrar». El menú las devuelve, y con ellas el enlace a la demo. */
  const [menu, setMenu] = useState(false);
  const cajaMenu = useRef<HTMLDivElement>(null);
  useCierreExterno(cajaMenu, menu, () => setMenu(false));

  return (
    /* `reducedMotion="user"` anula los valores de transformación de toda la
       portada cuando el sistema pide menos movimiento, sin que ningún
       componente tenga que decidirlo durante el render — que es lo que rompía
       la rehidratación. La opacidad se conserva: lo que molesta es el viaje. */
    <MotionConfig reducedMotion="user">
    <div className="relative min-h-screen" style={{ background: OSCURO.fondo, color: OSCURO.texto }}>
      <Trama progreso={scrollYProgress} />

      {/* ------------------------------------------------------------ banda */}
      <header className="sticky top-0 z-40 backdrop-blur-xl transition-colors duration-300"
              style={{
                /* El filete sólo cuando hay algo pasando por debajo. Puesto
                   siempre, la primera pantalla empieza con una raya que no
                   separa nada. */
                borderBottom: `1px solid ${posada ? OSCURO.borde : "transparent"}`,
                background: OSCURO.velo,
              }}>
        <div className={`${COLUMNA} flex items-center gap-3 transition-[height] duration-300 sm:gap-4`}
             style={{ height: posada ? 54 : 62 }}>
          {/* La marca de la banda es la misma placa de la primera pantalla, a
              quince píxeles. Al ir todo en `em`, el bloque encoge con la letra
              y mantiene la proporción: la marca pequeña y la grande son la
              misma pieza, que es lo que hace que se reconozca al desplazarse. */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="marca text-[17px] sm:text-[18px]">Prefacti</span>
            {/* La versión, en cápsula. Alineada a la base contra un rótulo de
                veintidós píxeles se leía caída; centrada y con su contorno pasa
                de descuido a etiqueta. */}
            <span className="hidden rounded-[5px] border px-1.5 py-[3px] font-mono text-[9.5px]
                             uppercase leading-none tracking-[0.14em] sm:inline-block"
                  style={{ borderColor: OSCURO.borde, color: OSCURO.tenue }}>v2</span>
          </Link>

          {/* El filete separa la marca de la navegación. Sin él son seis
              palabras seguidas y la primera resulta ser el nombre del sitio. */}
          <span aria-hidden className="mx-1 hidden h-4 w-px shrink-0 sm:block"
                style={{ background: OSCURO.borde }} />

          <nav aria-label="Portada" className="hidden h-full items-stretch sm:flex">
            {NAVEGACION.map(([t, id]) => {
              const viva = activa === id;
              return (
                <a key={id} href={`#${id}`}
                   aria-current={viva ? "true" : undefined}
                   className="enlace-portada relative flex items-center px-3.5 text-[14px] transition-colors"
                   style={{ color: viva ? OSCURO.texto : OSCURO.suave }}>
                  {t}
                  {/* Una sola marca para los tres: con `layoutId`, framer la
                      desliza de un enlace al siguiente en vez de apagarla aquí
                      y encenderla allá, y ese viaje es lo que dice que son
                      posiciones de una misma página y no tres destinos. */}
                  {viva && (
                    <motion.span layoutId="banda-viva" aria-hidden
                                 className="absolute inset-x-3 bottom-0 h-[2px] rounded-full"
                                 style={{ background: OSCURO.acento }}
                                 transition={{ duration: 0.34, ease: SUAVE }} />
                  )}
                </a>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <TemaToggle className="tema-portada h-9 w-9 rounded-[8px]" />
            {/* `aria-keyshortcuts` dice por lector de pantalla lo mismo que el
                `<kbd>` dice a la vista. Hasta ahora ninguno de los dos era
                cierto: no había nada escuchando la tecla. */}
            <Link href="/proyectos" aria-keyshortcuts="d"
                  className="hidden h-9 items-center rounded-[8px] border px-3 text-[13.5px] font-medio
                             transition-colors sm:flex"
                  style={{ borderColor: OSCURO.borde, color: OSCURO.suave }}>
              Ver la demo <Tecla>D</Tecla>
            </Link>
            <Link href="/entrar" aria-keyshortcuts="e"
                  className="flex h-9 items-center rounded-[8px] px-3.5 text-[13.5px] font-medio
                             transition-opacity hover:opacity-90"
                  style={{ background: OSCURO.acento, color: "#fff" }}>
              Entrar <Tecla claro>E</Tecla>
            </Link>

            <div ref={cajaMenu} className="relative sm:hidden">
              <button type="button" onClick={() => setMenu(v => !v)}
                      aria-expanded={menu} aria-controls="menu-portada"
                      aria-label={menu ? "Cerrar el menú" : "Abrir el menú"}
                      className="flex h-9 w-9 items-center justify-center rounded-[8px] border
                                 transition-colors"
                      style={{ borderColor: OSCURO.borde, color: OSCURO.suave }}>
                {menu ? <X className="h-[17px] w-[17px]" aria-hidden />
                      : <Menu className="h-[17px] w-[17px]" aria-hidden />}
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div id="menu-portada"
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.22, ease: SUAVE }}
                              className="absolute right-0 top-[calc(100%+10px)] w-[min(80vw,15rem)]
                                         rounded-[12px] border p-1.5"
                              style={{ borderColor: OSCURO.borde, background: OSCURO.lamina,
                                       boxShadow: "var(--sombra-media)" }}>
                    {NAVEGACION.map(([t, id]) => (
                      <a key={id} href={`#${id}`} onClick={() => setMenu(false)}
                         aria-current={activa === id ? "true" : undefined}
                         className="flex items-center justify-between rounded-[8px] px-3 py-2.5 text-[14.5px]"
                         style={{ color: activa === id ? OSCURO.texto : OSCURO.suave }}>
                        {t}
                        {activa === id && (
                          <span aria-hidden className="h-1.5 w-1.5 rounded-full"
                                style={{ background: OSCURO.acento }} />
                        )}
                      </a>
                    ))}
                    <span aria-hidden className="my-1.5 block h-px"
                          style={{ background: OSCURO.borde }} />
                    <Link href="/proyectos" onClick={() => setMenu(false)}
                          className="flex items-center justify-between rounded-[8px] px-3 py-2.5 text-[14.5px]"
                          style={{ color: OSCURO.suave }}>
                      Ver la demo
                      <ArrowRight className="h-[15px] w-[15px] shrink-0" aria-hidden />
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* ---------------------------------------------------------- titular */}
        <section className={`${COLUMNA} relative pb-14 pt-12 md:pt-16`}>
          <Guias />
          <div className="mx-auto max-w-[44rem] text-center">
            {/* El estado del producto, en cápsula sobre el rótulo.
                Era un cintillo a todo el ancho con su propio filete, o sea la
                forma de un aviso de sistema: lo primero que se veía de la
                página era una barra de notificación. En cápsula y dentro de la
                columna deja de anunciarse y pasa a hacer lo que hace esta pieza
                en un sitio de producto — decir que hay algo abierto y que se
                entra por ahí. El punto late porque «abierta» es un estado y no
                una etiqueta. */}
            <Revelar retraso={0.04}>
              <Link href="/proyectos"
                    className="group mx-auto mb-9 inline-flex items-center gap-2.5 rounded-full border
                               py-1.5 pl-1.5 pr-3.5 text-[12.5px] transition-colors"
                    style={{ borderColor: OSCURO.borde, background: OSCURO.laminaAlta,
                             color: OSCURO.suave }}>
                <span className="flex items-center gap-1.5 rounded-full px-2 py-1 font-mono text-[9.5px]
                                 uppercase leading-none tracking-[0.14em]"
                      style={{ background: OSCURO.acentoTenue, color: OSCURO.acento }}>
                  <Pulso color={OSCURO.acento} />
                  Abierta
                </span>
                {/* En estrecho se cae la coletilla. Con el texto entero la
                    cápsula ocupaba el ancho de la columna y partía en dos
                    renglones, que es justo lo que una cápsula no puede hacer:
                    deja de leerse como una etiqueta y pasa a ser un párrafo con
                    borde redondeado. */}
                <span className="whitespace-nowrap">
                  Cartera de demostración<span className="hidden sm:inline">, sin registro</span>
                </span>
                <ArrowRight className="h-[13px] w-[13px] shrink-0 transition-transform
                                       group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </Revelar>

            {/* La primera pantalla dice el nombre y nada más.
                Iba el eslogan a cuerpo de titular y la marca sólo en la banda,
                a veintidós píxeles: la portada empezaba explicándose antes de
                presentarse. Con la condensada, una sola palabra llena el ancho
                de la columna y hace de marca; el eslogan baja al renglón de
                debajo, que es donde una frase se lee. */}
            {/* La marca se monta: llegan las letras y después la palabra gana
                canto. Va en su propio componente porque es lo único de la
                página que se anima al cargar y no al asomar — es lo primero
                que se ve, así que no puede esperar a entrar en cuadro. */}
            <MarcaAnimada className="marca text-[clamp(3rem,10.5vw,7.5rem)]" />

            {/* El filete azul iba aquí, debajo de la palabra, para darle suelo
                cuando el rótulo era una letra suelta con relieve. Con la marca
                en placa sobra: el bloque ya tiene su canto inferior, y una raya
                pegada al borde de un rectángulo se lee como un subrayado mal
                puesto. Lo que hacía de separación lo hace ahora el aire. */}

            <Revelar retraso={0.75}>
              <p className="mx-auto mt-6 max-w-[26ch] text-[clamp(1.15rem,2.4vw,1.6rem)]
                            font-medio leading-[1.25] tracking-[-0.01em]"
                 style={{ color: OSCURO.texto }}>
                El número <span style={{ color: OSCURO.acento }}>antes del ladrillo.</span>
              </p>
            </Revelar>

            {/* Aquí iba el párrafo de qué hace la herramienta. Fuera: sobre la
                marca a cuerpo de cartel, tres renglones de texto corrido la
                convertían en el encabezado de un artículo. Lo que hace se
                cuenta entero dos pantallas más abajo —la banda de tres, los
                cinco pasos y las cuatro tarjetas— y ahí sí hay sitio para
                leerlo. */}

            <Revelar retraso={0.9}>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link href="/entrar"
                      className="flex h-11 items-center gap-1.5 rounded-[9px] px-5 text-[14.5px] font-medio
                                 transition-opacity hover:opacity-90"
                      style={{ background: OSCURO.acento, color: "#fff" }}>
                  Crear cuenta <Tecla claro>C</Tecla>
                </Link>
                {/* «Entrar a la demo» estaba aquí, al lado. Sobraba: la cápsula
                    de encima de la marca lleva a la misma cartera y lo dice
                    mejor —«abierta, sin registro»—, así que eran dos puertas a
                    un metro una de otra, y con dos llamadas del mismo tamaño la
                    primera pantalla no decía cuál era la principal. La tecla D
                    sigue funcionando y la banda sigue teniendo su botón. */}
              </div>
            </Revelar>

            <Revelar retraso={1}>
              <p className="mt-5 flex items-center justify-center gap-2 text-[13px]"
                 style={{ color: OSCURO.tenue }}>
                <Search className="h-3 w-3 shrink-0" aria-hidden />
                Beta gratuita, sin tarjeta. Nada que instalar.
              </p>
            </Revelar>
          </div>
        </section>

        {/* ------------------------------------------------------------ pilares
            La banda de tres. Es lo que la herramienta es, en una línea cada
            cosa, separadas por filete vertical como las columnas de un cajetín
            de plano. */}
        <section style={{ borderBlock: `1px solid ${OSCURO.borde}`, background: OSCURO.lamina }}>
          <div className={`${COLUMNA} relative`}>
            <Guias />
            <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0"
                 style={{ borderColor: OSCURO.borde }}>
              {PILARES.map((p, i) => (
                <Revelar key={p.t} retraso={i * 0.1}
                         className={`py-6 ${i === 0 ? "sm:pr-8" : i === 1 ? "sm:px-8" : "sm:pl-8"}`}>
                  <h2 className="flex items-center gap-2 text-[14.5px] font-medio">
                    <p.ic className="h-[15px] w-[15px] shrink-0" style={{ color: OSCURO.acento }} aria-hidden />
                    {p.t}
                  </h2>
                  <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: OSCURO.suave }}>
                    {p.d}
                  </p>
                </Revelar>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- vitrina
            El producto, a todo el ancho de la columna maestra. */}
        <section className={`${COLUMNA} relative pb-16 pt-12 md:pb-24 md:pt-14`}>
          <Guias />
          {/* La vitrina deriva mientras la página la cruza: es la única pieza
              que enseña producto, y moverla a otra velocidad la separa del
              papel sin necesidad de sombra ni de marco. */}
          <Paralaje><Revelar y={26}><Vitrina /></Revelar></Paralaje>
        </section>

        {/* ------------------------------------------------------------ balance
            La cuenta de resultados de la promoción de muestra, compuesta como
            se compone una: rótulo a la izquierda, importe a la derecha, filete
            entre líneas, los subtotales con regla doble y el resultado abajo
            con su porcentaje.

            Es la sección que más dice de qué va el producto y la que menos
            explicación necesita: quien trabaja con esto reconoce la forma antes
            de leer una cifra. Y las cifras son las de verdad — salen del motor
            de cálculo, no de un ejemplo escrito a mano.

            Los importes van con `tnum`: en una columna de cuentas los dígitos
            tienen que caer unos sobre otros, o la columna deja de poder leerse
            de arriba abajo, que es para lo que existe. */}
        <section style={{ borderBlock: `1px solid ${OSCURO.borde}` }}>
          <div className={`${COLUMNA} relative py-16 md:py-20`}>
            <Guias />
            <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
              <div className="min-w-0">
                <Revelar><Cota>La cuenta</Cota></Revelar>
                <Revelar mascara retraso={0.08}>
                  <h2 className="portada-rotulo mt-4 max-w-[15ch] text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.1]">
                    De los datos al resultado
                  </h2>
                </Revelar>
                <Revelar retraso={0.14}>
                  <p className="mt-5 max-w-[52ch] text-[14px] leading-relaxed"
                     style={{ color: OSCURO.suave }}>
                    Cada línea sale del estudio, no de una plantilla: los
                    ingresos del cuadro de áreas, los costes del presupuesto por
                    partidas y los indirectos de los porcentajes que fijes.
                    Ésta es {MUESTRA.nombre}, {MUESTRA.distrito}.
                  </p>
                </Revelar>
                <Revelar retraso={0.2}>
                  <Link href={`/proyectos/${MUESTRA.id}`}
                        className="enlace-portada mt-7 inline-flex items-center gap-1.5 text-[14px] font-medio"
                        style={{ color: OSCURO.acento }}>
                    Abrir el estudio completo
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Revelar>
              </div>

              <Revelar retraso={0.1} y={18} className="min-w-0">
                <div className="overflow-hidden rounded-[12px]"
                     style={{ background: OSCURO.laminaAlta, border: `1px solid ${OSCURO.borde}`,
                              boxShadow: OSCURO.sombra }}>
                  <div className="flex items-baseline justify-between gap-4 border-b px-5 py-3 sm:px-6"
                       style={{ borderColor: OSCURO.borde }}>
                    <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em]"
                          style={{ color: OSCURO.tenue }}>
                      Cuenta de resultados
                    </span>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.12em]"
                          style={{ color: OSCURO.tenue }}>USD</span>
                  </div>

                  <dl className="px-5 py-2 sm:px-6">
                    {BALANCE.map(l => (
                      <div key={l.t}
                        className={`flex items-baseline justify-between gap-6 py-2
                          ${l.regla ? "border-t" : ""} ${l.fuerte ? "font-medio" : ""}`}
                        style={l.regla ? { borderColor: OSCURO.bordeVivo } : undefined}>
                        <dt className={`min-w-0 text-[13.5px] ${l.sangria ? "pl-4" : ""}`}
                            style={{ color: l.fuerte ? OSCURO.texto : OSCURO.suave }}>
                          {l.t}
                        </dt>
                        <dd className="shrink-0 tabular-nums text-[13.5px]"
                            style={{ color: l.tono ?? (l.fuerte ? OSCURO.texto : OSCURO.suave) }}>
                          {l.v}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {/* El resultado, separado por regla doble como en un balance
                      de verdad: es lo único que se busca al abrir la hoja. */}
                  <div className="flex items-baseline justify-between gap-6 px-5 py-4 sm:px-6"
                       style={{ borderTop: `3px double ${OSCURO.bordeVivo}`,
                                background: OSCURO.lamina }}>
                    <span className="text-[14px] font-medio" style={{ color: OSCURO.texto }}>
                      Margen sobre ingresos
                    </span>
                    <span className="cifra text-[22px] leading-none"
                          style={{ color: estadoDe(MUESTRA.margen).c }}>
                      {pct(MUESTRA.margen)}
                    </span>
                  </div>
                </div>
              </Revelar>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ cifras
            Cuatro columnas: la cifra grande arriba, su nombre debajo y una
            línea que dice de dónde sale. Es la forma que tiene una portada de
            producto de enseñar magnitud sin recurrir a testimonios inventados —
            y aquí las cuatro salen del estudio de muestra, así que se pueden
            comprobar abriéndolo. */}
        <section style={{ borderBottom: `1px solid ${OSCURO.borde}` }}>
          <div className={`${COLUMNA} relative py-14 md:py-16`}>
            <Guias />
            <Revelar><Cota>Lo que hay debajo de la cifra</Cota></Revelar>
            <div className="mt-9 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {PRODUCE.map((c, i) => (
                <Revelar key={c.t} retraso={i * 0.1}>
                  <div className="cifra text-[clamp(2rem,3.4vw,2.6rem)] leading-none"
                       style={{ color: OSCURO.texto }}>
                    {c.n}
                  </div>
                  <div className="mt-3 text-[14px] font-medio" style={{ color: OSCURO.texto }}>
                    {c.t}
                  </div>
                  <p className="mt-1.5 max-w-[32ch] text-[12.5px] leading-relaxed"
                     style={{ color: OSCURO.tenue }}>
                    {c.d}
                  </p>
                </Revelar>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- manifiesto
            Un párrafo grande y centrado, sin lámina ni caja. Es el único sitio
            de la página donde se habla en primera persona, y funciona porque
            está solo: metido dentro de una tarjeta, con un icono al lado y tres
            hermanos igual de grandes, sería una tarjeta más. */}
        <section style={{ borderBottom: `1px solid ${OSCURO.borde}` }}>
          <div className={`${COLUMNA} relative py-20 md:py-28`}>
            <Guias />
            <Revelar>
              <p className="mx-auto max-w-[46rem] text-center text-[clamp(1.15rem,2.2vw,1.6rem)]
                            leading-[1.55]" style={{ color: OSCURO.texto }}>
                Un estudio de viabilidad no se equivoca en la suma. Se equivoca
                en la hipótesis, y para cuando se nota ya hay permiso pedido.
                Prefacti pone las hipótesis delante, con sus reglas escritas y
                las mismas para toda la cartera, para que la conversación pase
                de <span style={{ color: OSCURO.tenue }}>«creo que sale»</span> a{" "}
                <span style={{ color: OSCURO.acento }}>«sale con estos números
                y no con estos otros»</span>.
              </p>
            </Revelar>
          </div>
        </section>

        {/* --------------------------------------------------------- principios
            La lista de filas: regla a la izquierda, nombre a un lado y qué
            significa al otro, separadas por filete. Es la forma más densa que
            hay de contar cinco cosas —cabe una pantalla— y la que mejor aguanta
            leerse en diagonal, porque los cinco nombres quedan en columna. */}
        <section style={{ borderBottom: `1px solid ${OSCURO.borde}` }}>
          <div className={`${COLUMNA} relative py-16 md:py-20`}>
            <Guias />
            <Revelar><Cota>Cómo se hace un estudio</Cota></Revelar>
            <Revelar mascara retraso={0.06}>
              <h2 className="portada-rotulo mt-4 max-w-[20ch] text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.1]">
                Cinco pasos, en este orden
              </h2>
            </Revelar>

            <div className="mt-12" style={{ borderTop: `1px solid ${OSCURO.borde}` }}>
              {PASOS.map((p, i) => (
                <Revelar key={p.t} retraso={Math.min(i * 0.07, 0.3)}>
                  <div className="grid gap-2 py-6 sm:grid-cols-[minmax(0,.42fr)_minmax(0,.58fr)] sm:gap-10"
                       style={{ borderBottom: `1px solid ${OSCURO.borde}` }}>
                    <div className="flex items-baseline gap-3.5">
                      <span className="mt-[3px] flex" style={{ opacity: .55 }}>
                        <MarcaCota color={OSCURO.acento} />
                      </span>
                      <span className="font-mono text-[11px] tabular-nums" style={{ color: OSCURO.tenue }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-[17px] font-medio" style={{ color: OSCURO.texto }}>{p.t}</h3>
                    </div>
                    <p className="max-w-[62ch] text-[14px] leading-relaxed sm:pt-1"
                       style={{ color: OSCURO.suave }}>
                      {p.d}
                    </p>
                  </div>
                </Revelar>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ brecha */}
        <section className={`${COLUMNA} relative py-16 md:py-24`}>
          <Guias />
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="min-w-0">
              <Revelar><Cota>El problema</Cota></Revelar>
              <Revelar mascara retraso={0.08}>
                <h2 className="portada-rotulo mt-4 text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.1]">
                  Lo que cuesta enterarse tarde
                </h2>
              </Revelar>
              <Revelar retraso={0.14}>
                <p className="mt-5 max-w-[54ch] text-[14px] leading-relaxed"
                   style={{ color: OSCURO.suave }}>
                  Un error de hipótesis en la mesa cuesta una tarde. El mismo
                  error con el permiso pedido cuesta un proyecto entero. Cada
                  fase que pasa multiplica lo que vale corregir.
                </p>
              </Revelar>
              <Revelar retraso={0.2}>
                <div className="mt-8 flex flex-col gap-3">
                  {([
                    [OSCURO.acento, "Decidido sobre la marcha"],
                    [OSCURO.cian, "Decidido con números desde el día uno"],
                  ] as const).map(([color, t]) => (
                    <div key={t} className="flex items-center gap-2.5 font-mono text-[12px]"
                         style={{ color: OSCURO.suave }}>
                      <span aria-hidden className="h-[3px] w-6 shrink-0 rounded-full"
                            style={{ background: color }} />
                      {t}
                    </div>
                  ))}
                </div>
              </Revelar>
            </div>

            <Revelar retraso={0.1} y={18} className="min-w-0">
              <div className="rounded-[12px] p-5 sm:p-6"
                   style={{ background: OSCURO.laminaAlta, border: `1px solid ${OSCURO.borde}`,
                            boxShadow: OSCURO.sombra }}>
                <div className="mb-5 flex items-center justify-between gap-4 font-mono text-[9.5px] uppercase tracking-[0.14em]"
                     style={{ color: OSCURO.tenue }}>
                  <span>Coste de corregir</span>
                  <span>Fase del proyecto</span>
                </div>
                <GraficoBrecha />
                <div className="mt-4 flex justify-between font-mono text-[9.5px] uppercase tracking-[0.12em]"
                     style={{ color: OSCURO.tenue }}>
                  {/* Las cuatro fases con el nombre del trámite que existe en
                      Panamá, que es donde está la cartera. */}
                  <span>Terreno</span><span>Proyecto</span><span>Permiso</span><span>Obra</span>
                </div>
              </div>
            </Revelar>
          </div>
        </section>

        {/* ------------------------------------------------------- el simulador */}
        <section id="uso" style={{ borderTop: `1px solid ${OSCURO.borde}`, background: OSCURO.lamina }}>
          <div className={`${COLUMNA} relative py-16 md:py-24`}>
            <Guias />
            <div className="grid items-center gap-12 lg:grid-cols-[.95fr_1.05fr] lg:gap-20">
              <div className="min-w-0">
                <Revelar><Cota>Cómo se usa</Cota></Revelar>
                <Revelar mascara retraso={0.08}>
                  <h2 className="portada-rotulo mt-4 max-w-[16ch] text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.1]">
                    Mueve una hipótesis y mira qué pasa
                  </h2>
                </Revelar>
                <Revelar retraso={0.14}>
                  <p className="mt-5 max-w-[54ch] text-[14px] leading-relaxed"
                     style={{ color: OSCURO.suave }}>
                    El precio de venta es la hipótesis que más manda y la que
                    menos se sabe. Muévela: el ingreso cambia, el coste no, y el
                    margen te dice a partir de qué precio la promoción deja de
                    sostenerse. Es la ficha de {MUESTRA.nombre}, con sus cifras.
                  </p>
                </Revelar>
                <Revelar retraso={0.2}>
                  <Link href="/simulador"
                        className="enlace-portada mt-7 inline-flex items-center gap-1.5 text-[14px] font-medio"
                        style={{ color: OSCURO.acento }}>
                    Abrir el simulador completo
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Revelar>
              </div>
              <Revelar retraso={0.12} y={20} className="min-w-0">
                <FichaPortada proyecto={MUESTRA} />
              </Revelar>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- capacidades */}
        <section id="producto" style={{ borderTop: `1px solid ${OSCURO.borde}` }}>
          <div className={`${COLUMNA} relative py-16 md:py-24`}>
            <Guias />
            <Revelar><Cota>El producto</Cota></Revelar>
            <Revelar mascara retraso={0.08}>
              <h2 className="portada-rotulo mt-4 max-w-[18ch] text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.1]">
                Lo que hay dentro
              </h2>
            </Revelar>

            <div className="mt-12 grid gap-3 sm:grid-cols-2">
              {CAPACIDADES.map((c, i) => (
                <Revelar key={c.t} retraso={i * 0.1} y={16}>
                  <Link href={c.h}
                        className="ficha-portada group flex h-full flex-col justify-between rounded-[12px] p-5 sm:p-6"
                        style={{ background: OSCURO.laminaAlta, border: `1px solid ${OSCURO.borde}` }}>
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-[17px] font-medio">{c.t}</h3>
                        <ArrowUpRight
                          className="h-[17px] w-[17px] shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          style={{ color: OSCURO.tenue }} aria-hidden />
                      </div>
                      <p className="mt-3 max-w-[46ch] text-[13.5px] leading-relaxed"
                         style={{ color: OSCURO.suave }}>
                        {c.d}
                      </p>
                    </div>
                    <div className="mt-8">{c.v}</div>
                  </Link>
                </Revelar>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- preguntas */}
        <section id="preguntas" style={{ borderTop: `1px solid ${OSCURO.borde}`, background: OSCURO.lamina }}>
          <div className={`${COLUMNA} relative py-16 md:py-24`}>
            <Guias />
            <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
              <div>
                <Revelar><Cota>Preguntas</Cota></Revelar>
                <Revelar mascara retraso={0.08}>
                  <h2 className="portada-rotulo mt-4 text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.1]">
                    Lo que suelen preguntar
                  </h2>
                </Revelar>
              </div>
              <Revelar retraso={0.1}>
                <div style={{ borderBottom: `1px solid ${OSCURO.borde}` }}>
                  {PREGUNTAS.map((q, i) => (
                    <Pregunta key={q.p} p={q.p} r={q.r} abierta={abierta === i}
                              alPulsar={() => setAbierta(abierta === i ? null : i)} />
                  ))}
                </div>
              </Revelar>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- el cierre
            Bloque de acento a sangre, con su propia retícula por encima.
            Es el único sitio de la página donde el color ocupa una superficie
            grande, y funciona precisamente porque es el único: después de
            catorce pantallas de papel, un bloque saturado dice «aquí se acaba»
            sin necesidad de escribirlo. */}
        <section className="relative overflow-hidden" style={{ background: OSCURO.acento }}>
          <div aria-hidden className="pointer-events-none absolute inset-0"
               style={{
                 backgroundImage: `
                   linear-gradient(rgba(255,255,255,.10) 1px, transparent 1px),
                   linear-gradient(90deg, rgba(255,255,255,.10) 1px, transparent 1px)`,
                 backgroundSize: "64px 64px",
                 maskImage: "radial-gradient(120% 100% at 50% 0%, #000 10%, transparent 78%)",
                 WebkitMaskImage: "radial-gradient(120% 100% at 50% 0%, #000 10%, transparent 78%)",
               }} />
          <div className={`${COLUMNA} relative py-24 text-center md:py-28`}>
            <Revelar mascara>
              <h2 className="portada-rotulo mx-auto max-w-[16ch] text-[clamp(2.2rem,4.8vw,3.6rem)] leading-[1.06]"
                  style={{ color: "#fff" }}>
                Empieza por el número, no por el ladrillo.
              </h2>
            </Revelar>
            <Revelar retraso={0.1}>
              <p className="mx-auto mt-6 max-w-[52ch] text-[14px] leading-relaxed"
                 style={{ color: "rgba(255,255,255,.72)" }}>
                Entra a la cartera de demostración y trastea. No hace falta
                tarjeta ni instalar nada.
              </p>
            </Revelar>
            <Revelar retraso={0.18}>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link href="/entrar"
                      className="flex h-11 items-center gap-1.5 rounded-[9px] px-5 text-[14.5px] font-medio
                                 transition-opacity hover:opacity-90"
                      style={{ background: "#fff", color: OSCURO.acento }}>
                  Crear cuenta
                  <kbd aria-hidden className="ml-1 hidden h-[19px] min-w-[19px] place-items-center
                                              rounded-[4px] px-1 font-mono text-[10.5px] leading-none sm:grid"
                       style={{ background: "rgba(31,95,214,.12)" }}>C</kbd>
                </Link>
                <Link href="/proyectos"
                      className="flex h-11 items-center gap-1.5 rounded-[9px] border px-5 text-[14.5px] font-medio
                                 transition-colors hover:bg-white/10"
                      style={{ borderColor: "rgba(255,255,255,.34)", color: "#fff" }}>
                  Entrar a la demo <Tecla claro>D</Tecla>
                </Link>
              </div>
            </Revelar>
          </div>
        </section>
      </main>

      {/* --------------------------------------------------------------- pie */}
      <footer style={{ borderTop: `1px solid ${OSCURO.borde}` }}>
        <div className={`${COLUMNA} relative flex flex-col items-center justify-between gap-4 py-8 sm:flex-row`}>
          <Guias marcas={false} />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em]"
                style={{ color: OSCURO.tenue }}>
            Prefacti · Factibilidad inmobiliaria
          </span>
          <div className="flex items-center gap-6 text-[13.5px]" style={{ color: OSCURO.tenue }}>
            <Link href="/proyectos" className="enlace-portada transition-colors">Demo</Link>
            <Link href="/entrar" className="enlace-portada transition-colors">Entrar</Link>
          </div>
        </div>
      </footer>

      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left"
        style={{ background: OSCURO.acento, scaleX: scrollYProgress }}
        transition={{ ease: SUAVE }}
      />
    </div>
    </MotionConfig>
  );
}

/**
 * La cota de sección.
 *
 * El rótulo pequeño que precede a cada titular, con su regla vertical delante.
 *
 * El filete era horizontal y quedaba a la altura del texto, así que se leía
 * como un guion largo. Vertical y a la izquierda hace otra cosa: marca dónde
 * arranca el bloque, y al repetirse en todas las secciones construye una
 * columna de referencia que recorre la página. Es lo que hace que ocho
 * secciones distintas se lean como un solo documento.
 */
function Cota({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.16em]"
          style={{ color: OSCURO.tenue }}>
      {/* El filete se dibuja al entrar en cuadro en vez de estar ya puesto: es
          la señal de que empieza otro argumento, y se repite en las ocho
          secciones para que al desplazarse la página tenga latido propio. */}
      <MarcaCota color={OSCURO.acento} />
      {children}
    </span>
  );
}
