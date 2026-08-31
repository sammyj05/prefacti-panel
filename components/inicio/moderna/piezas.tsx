"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  animate, motion, useInView, useMotionValue, useReducedMotion, useScroll,
  useTransform, type MotionValue,
} from "framer-motion";

/**
 * Las piezas de la portada moderna.
 *
 * El registro es el de una herramienta de infraestructura: fondo casi negro,
 * un solo acento eléctrico, tipografía grande y el dato como protagonista. Lo
 * que mueve la página no es decoración —ni partículas ni degradados que
 * respiran— sino gráficos que se dibujan al entrar en cuadro. Cada animación
 * cuenta algo: la curva que se separa, la capa que se apila, la cifra que
 * cuenta hasta su valor.
 *
 * Todo comparte la misma curva de tiempo que el resto del sitio, para que la
 * portada y el panel se muevan igual.
 */

export const SUAVE = [0.16, 1, 0.3, 1] as const;

/**
 * La paleta de la portada.
 *
 * No son colores sino punteros: cada uno apunta a una variable que `globals`
 * declara dos veces, en claro y en oscuro. Antes eran hexadecimales fijos y la
 * página salía negra tuviera el sitio el tema que tuviera — el interruptor no
 * la tocaba. Puestas como `var()` funcionan igual en un `style` y en un
 * atributo de dibujo, así que el cambio de tema no toca ni un componente.
 */
export const OSCURO = {
  fondo: "var(--p-fondo)",
  lamina: "var(--p-lamina)",
  laminaAlta: "var(--p-lamina-alta)",
  borde: "var(--p-borde)",
  bordeVivo: "var(--p-borde-vivo)",
  texto: "var(--p-texto)",
  suave: "var(--p-suave)",
  tenue: "var(--p-tenue)",
  acento: "var(--p-acento)",
  acentoTenue: "var(--p-acento-tenue)",
  cian: "var(--p-cian)",
  halo: "var(--p-halo)",
  velo: "var(--p-velo)",
  sombra: "var(--p-sombra)",
  reja: "var(--p-reja)",
  rejaMayor: "var(--p-reja-mayor)",
  guia: "var(--p-guia)",
};

/* --------------------------------------------------------------- la tecla */

/**
 * El atajo de teclado, dentro del propio botón.
 *
 * Es un gesto de producto para gente que trabaja con teclado: enseñar la tecla
 * en el sitio donde se pulsaría con el ratón enseña que existe la otra vía sin
 * tener que explicarla en ningún sitio. Va dentro del botón y no al lado,
 * porque al lado se lee como una etiqueta y dentro se lee como parte del
 * control.
 *
 * Se esconde en pantallas táctiles: un recuadro con una letra en un teléfono no
 * dice nada, no hay teclado que pulsar.
 */
export function Tecla({ children, claro }: { children: React.ReactNode; claro?: boolean }) {
  return (
    <kbd
      aria-hidden
      className="ml-1 hidden h-[19px] min-w-[19px] shrink-0 place-items-center rounded-[4px]
                 px-1 font-mono text-[10.5px] font-medium leading-none sm:grid"
      style={claro
        ? { background: "rgba(255,255,255,.18)", color: "inherit" }
        : { background: OSCURO.acentoTenue, color: OSCURO.tenue,
            boxShadow: `inset 0 0 0 1px ${OSCURO.borde}` }}
    >
      {children}
    </kbd>
  );
}

/* ---------------------------------------------------------------- atajos */

/**
 * Los atajos de la banda.
 *
 * Las teclas que la banda enseña —`D` y `E`— eran dibujo: el `<kbd>` estaba
 * puesto y no había nada escuchando, así que la portada prometía un atajo y no
 * pasaba nada al pulsarlo. Enseñar una tecla que no hace nada es peor que no
 * enseñarla, porque el que la prueba deja de fiarse del resto.
 *
 * Tres guardas, y las tres hacen falta:
 *
 * — Con modificador, no. `⌘D` es «añadir a marcadores» y `⌃E` mueve el cursor
 *   al final de la línea; robarlos por una letra suelta es peor negocio.
 * — Escribiendo, no. Si el foco está en un campo o en algo editable, la letra
 *   es texto y no orden.
 * — Repetición mantenida, no: una tecla apretada dispara docenas de eventos y
 *   la navegación se encola.
 */
export function useAtajos(mapa: Record<string, string>) {
  const router = useRouter();

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const d = e.target as HTMLElement | null;
      if (d?.isContentEditable) return;
      if (d && /^(INPUT|TEXTAREA|SELECT)$/.test(d.tagName)) return;
      const destino = mapa[e.key.toLowerCase()];
      if (!destino) return;
      e.preventDefault();
      router.push(destino);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [mapa, router]);
}

/* ------------------------------------------------------- sección en curso */

/**
 * Qué sección se está mirando.
 *
 * La banda tenía tres enlaces del mismo color de principio a fin, así que a
 * mitad de página no decía dónde estabas — que es la mitad del trabajo de una
 * navegación fija. Devuelve el `id` de la última sección cuya parte alta ya ha
 * pasado por debajo de la banda.
 *
 * El margen superior de la ventana de observación es la altura de la banda con
 * algo de holgura, y el inferior deja sólo una franja viva en el tercio alto de
 * la pantalla: sin eso, con dos secciones a la vez en cuadro —y las hay— la
 * marca saltaría adelante y atrás mientras se desplaza.
 *
 * Vuelve a `null` arriba del todo: en la primera pantalla no hay sección en
 * curso, y marcar «Producto» antes de llegar sería mentir.
 */
export function useSeccionActiva(ids: string[]) {
  const [activa, setActiva] = useState<string | null>(null);

  useEffect(() => {
    const nodos = ids
      .map(id => document.getElementById(id))
      .filter((n): n is HTMLElement => !!n);
    if (!nodos.length) return;

    const visibles = new Set<string>();
    const obs = new IntersectionObserver(
      entradas => {
        for (const e of entradas) {
          if (e.isIntersecting) visibles.add(e.target.id);
          else visibles.delete(e.target.id);
        }
        /* La última en orden de página, no la primera que informa: las entradas
           llegan en el orden en que cambian, no en el del documento. */
        const enCurso = ids.filter(id => visibles.has(id)).pop() ?? null;
        setActiva(enCurso);
      },
      { rootMargin: "-72px 0px -68% 0px" },
    );
    nodos.forEach(n => obs.observe(n));
    return () => obs.disconnect();
  }, [ids]);

  return activa;
}

/**
 * El punto que late.
 *
 * Dos círculos: uno fijo y otro que crece y se apaga por detrás. Es la señal de
 * «esto está vivo ahora mismo» —la misma que usa un piloto de estado— y aquí
 * distingue un estado de una etiqueta: «abierta» es algo que puede dejar de ser
 * cierto, y un punto quieto no lo diría.
 *
 * El aro va detrás y sin ocupar sitio, así que la cápsula no crece ni baila al
 * animarse. Y va en `MotionConfig`, de modo que quien pide menos movimiento se
 * queda con el punto quieto y con la misma cápsula.
 */
export function Pulso({ color }: { color: string }) {
  return (
    <span aria-hidden className="relative flex h-1.5 w-1.5 shrink-0">
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: color }}
        initial={{ scale: 1, opacity: 0.55 }}
        animate={{ scale: 2.6, opacity: 0 }}
        transition={{ duration: 1.9, ease: "easeOut", repeat: Infinity, repeatDelay: 0.5 }}
      />
      <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: color }} />
    </span>
  );
}

/* ---------------------------------------------------------------- llamada */

/**
 * La llamada a la acción de la portada.
 *
 * Estaba escrita dos veces —titular y cierre— con la misma sarta de nueve
 * clases y el mismo `style` en línea, y con la altura distinta en cada copia:
 * once píxeles arriba y doce abajo. Es el tipo de diferencia que nadie ve en
 * una captura y que hace que una página parezca montada por dos manos.
 *
 * No usa la primitiva `Boton` del panel a propósito. Aquella saca su color de
 * la paleta de la herramienta —tinta sobre hueso— y aquí manda la de la
 * portada, que es otra: forzarla obligaría a pasarle el color por fuera en cada
 * uso, que es exactamente el problema que se venía a quitar.
 */
export function LlamadaPortada({ href, children, secundario }: {
  href: string;
  children: React.ReactNode;
  /** El segundo camino: enlace de texto, debajo y en cuerpo menor. */
  secundario?: { href: string; t: string };
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <a href={href}
         className="group flex h-12 items-center gap-2 rounded-full px-7 text-[15.5px] font-medio transition-opacity hover:opacity-90"
         style={{ background: OSCURO.acento, color: "#fff" }}>
        {children}
        <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
             fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
             strokeLinejoin="round" aria-hidden>
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </a>
      {secundario && (
        <a href={secundario.href} className="enlace-portada text-[14px] transition-colors"
           style={{ color: OSCURO.tenue }}>
          {secundario.t} →
        </a>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- titular */

/**
 * El titular, línea a línea.
 *
 * Cada línea entra desde debajo de su propia máscara, no desde la nada: es el
 * gesto de una cortina que sube, y a cuerpos grandes se lee mucho mejor que
 * un desvanecido. El `overflow-hidden` del envoltorio es lo que recorta, así
 * que la línea aparece por su base como si estuviera ya ahí detrás.
 */
export function TitularLineas({ lineas, className, acentoEn, holgura }: {
  lineas: string[];
  className?: string;
  /** Qué línea va en el color de marca. El resto, en tinta. */
  acentoEn?: number;
  /**
   * Sitio de sobra dentro del recorte, para un rótulo con relieve.
   *
   * El `overflow-hidden` que hace de cortina recorta por los cuatro lados, así
   * que un canto que sale hacia abajo y a la derecha se corta en seco. Con la
   * holgura el recorte crece por los tres lados que hacen falta y el margen
   * negativo lo devuelve a su sitio: la caja visible no se mueve —el rótulo
   * sigue centrado donde estaba— y el canto tiene dónde caer.
   */
  holgura?: boolean;
}) {
  const recorte = holgura
    ? "block overflow-hidden -mx-[0.24em] px-[0.24em] pb-[0.26em]"
    : "block overflow-hidden pb-[0.06em]";
  return (
    <h1 className={className}>
      {lineas.map((l, i) => (
        <span key={l} className={recorte}>
          <motion.span
            className={i === acentoEn ? "acento block" : "block"}
            initial={{ y: "108%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.95, delay: 0.12 + i * 0.11, ease: SUAVE }}
          >
            {l}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

/* ---------------------------------------------------------------- revelar */

/**
 * Entrada al asomar en cuadro.
 *
 * Una sola vez: un elemento que reaparece cada vez que se cruza convierte la
 * página en un parpadeo. El viaje son veinte píxeles — los doce de antes se
 * quedaban por debajo del umbral en que un movimiento se percibe como
 * movimiento, así que la página se leía quieta aunque técnicamente no lo
 * estuviera. Veinte se ven llegar y siguen sin parecer un carrusel.
 *
 * Con `mascara` el bloque entra desde debajo de su propio recorte en vez de
 * desvanecerse: es el gesto de una cortina que sube, y a cuerpo de titular se
 * lee mucho mejor que la opacidad. El relleno inferior está por los trazos
 * descendentes — sin él, el recorte le corta la cola a la «p» y a la «g».
 *
 * Quien tenga el sistema en «reducir movimiento» recibe la misma página sin
 * viaje: aparece y ya está.
 */
export function Revelar({ children, retraso = 0, y = 20, mascara, className }: {
  children: React.ReactNode; retraso?: number; y?: number;
  mascara?: boolean; className?: string;
}) {
  /* Quien pide menos movimiento no recibe otro árbol sino el mismo sin viaje:
     de eso se encarga el `MotionConfig` de la portada, que anula los valores de
     transformación. Decidirlo aquí —con un `useReducedMotion` que en el
     servidor vale `false` y en el cliente puede valer `true`— cambiaba el
     marcado entre uno y otro, y React rehidrataba en falso toda la página. */
  if (mascara) {
    return (
      /* Quien mira el cuadro es el envoltorio, no el rótulo. Con el disparador
         puesto en la pieza de dentro no llegaba a dispararse nunca: empieza
         desplazada un ciento cuatro por ciento, o sea justo fuera del recorte
         de su padre, y un elemento recortado del todo no interseca con nada.
         El rótulo se quedaba escondido para siempre. El envoltorio no se
         mueve, así que sí se ve entrar, y de él cuelga la variante. */
      <motion.div
        className={`overflow-hidden pb-[0.09em] ${className ?? ""}`}
        initial="fuera"
        whileInView="dentro"
        viewport={{ once: true, margin: "-30px" }}
      >
        <motion.div
          variants={{ fuera: { y: "104%" }, dentro: { y: 0 } }}
          transition={{ duration: 0.9, delay: retraso, ease: SUAVE }}
        >
          {children}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      /* El margen baja de ochenta píxeles a treinta.
         A ochenta hay una franja de ochenta píxeles en la que un rótulo ya está
         en pantalla y sigue a opacidad cero: parando el desplazamiento justo
         ahí —cosa que pasa— la sección se ve en blanco y parece rota. A treinta
         la entrada arranca en cuanto el elemento asoma de verdad. */
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.78, delay: retraso, ease: SUAVE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * La marca que abre una sección.
 *
 * El filete vertical de la cota, dibujándose de abajo arriba al entrar en
 * cuadro. Es el único gesto que se repite en las ocho secciones, y ése es el
 * trabajo que hace: al desplazarse, cada vez que aparece una marca creciendo
 * el lector sabe que empieza otro argumento — sin que ninguna sección tenga
 * que anunciarlo por escrito.
 *
 * Crece desde la base porque la columna de referencia que forman todas las
 * cotas se lee de arriba abajo: naciendo por abajo, cada marca parece
 * engancharse a la anterior.
 */
export function MarcaCota({ color }: { color: string }) {
  return (
    <motion.span
      aria-hidden
      className="h-3.5 w-[2px] shrink-0 origin-bottom rounded-full"
      style={{ background: color }}
      initial={{ scaleY: 0 }}
      whileInView={{ scaleY: 1 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.5, delay: 0.1, ease: SUAVE }}
    />
  );
}

/**
 * Deriva vertical ligada al desplazamiento.
 *
 * El bloque se mueve algo menos que la página mientras la cruza, así que gana
 * profundidad sin despegarse: entra unos píxeles por debajo de su sitio y sale
 * unos píxeles por encima. El recorrido es corto a propósito —dieciocho
 * píxeles de punta a punta— porque lo que se busca es que la vitrina se sienta
 * a otra distancia que el papel, no que flote.
 *
 * `offset` mide desde que el bloque asoma por abajo hasta que se va por
 * arriba, de modo que el recorrido se reparte por toda la travesía y no se
 * agota en el primer tercio.
 */
export function Paralaje({ children, recorrido = 18, className }: {
  children: React.ReactNode; recorrido?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  /* La preferencia se consulta después del primer pintado. Leerla durante el
     render daría un valor en el servidor y otro en el cliente, y el `style` del
     bloque saldría distinto en cada sitio: React lo cuenta como marcado que no
     casa y rehidrata la página entera. */
  const [quieto, setQuieto] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const leer = () => setQuieto(mq.matches);
    leer();
    mq.addEventListener("change", leer);
    return () => mq.removeEventListener("change", leer);
  }, []);
  const y = useTransform(scrollYProgress, [0, 1],
    quieto ? [0, 0] : [recorrido, -recorrido]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

/* --------------------------------------------------------------- contador */

/**
 * Cifra que cuenta hasta su valor al entrar en cuadro.
 *
 * El formato se aplica en cada fotograma, no al final: si no, el número crece
 * sin separador de millar y da un salto de anchura al terminar.
 */
export function Contador({ hasta, decimales = 0, sufijo = "", prefijo = "" }: {
  hasta: number; decimales?: number; sufijo?: string; prefijo?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const enCuadro = useInView(ref, { once: true, margin: "-60px" });
  const valor = useMotionValue(0);
  const texto = useTransform(valor, v =>
    prefijo + v.toLocaleString("es-ES", {
      minimumFractionDigits: decimales, maximumFractionDigits: decimales,
      /* Forzado: en español no se agrupan por defecto los números de cuatro
         cifras, y «1997» se lee como un año en vez de como un recuento. */
      useGrouping: "always",
    }) + sufijo);

  useEffect(() => {
    if (!enCuadro) return;
    const control = animate(valor, hasta, { duration: 1.4, ease: SUAVE });
    return () => control.stop();
  }, [enCuadro, hasta, valor]);

  return <motion.span ref={ref}>{texto}</motion.span>;
}

/* ------------------------------------------------------------ la brecha */

/* Cuánto cuesta corregir, según cuándo te enteras. Los dos trazados son el
   mismo solar: uno decidido con números desde el principio y otro decidido
   sobre la marcha. */
const CURVA_TARDE = "M 8 148 C 90 146, 160 138, 214 118 C 268 98, 312 58, 360 14";
const CURVA_PRONTO = "M 8 148 C 90 147, 170 145, 240 141 C 300 138, 340 134, 360 131";

/**
 * El gráfico de la brecha.
 *
 * Dos curvas que arrancan juntas y se separan, con el área entre ellas
 * sombreada: eso es lo que cuesta enterarse tarde. Se dibujan al entrar en
 * cuadro, la de arriba más despacio, para que la separación se lea como algo
 * que ocurre y no como algo que ya estaba.
 */
export function GraficoBrecha() {
  const ref = useRef<SVGSVGElement>(null);
  const enCuadro = useInView(ref, { once: true, margin: "-100px" });

  return (
    <svg ref={ref} viewBox="0 0 380 170" className="w-full" role="img"
         aria-label="Coste de corregir según el momento en que se detecta">
      <defs>
        <linearGradient id="brecha" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={OSCURO.acento} stopOpacity=".24" />
          <stop offset="100%" stopColor={OSCURO.acento} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* La retícula del fondo, muy tenue. */}
      {[26, 56, 86, 116, 146].map(y => (
        <line key={y} x1="8" x2="368" y1={y} y2={y}
              stroke={OSCURO.borde} strokeWidth="1" />
      ))}

      {/* El área entre las dos curvas: la brecha en sí. */}
      <motion.path
        d={`${CURVA_TARDE} L 360 131 C 340 134, 300 138, 240 141 C 170 145, 90 147, 8 148 Z`}
        fill="url(#brecha)"
        initial={{ opacity: 0 }}
        animate={enCuadro ? { opacity: 1 } : {}}
        transition={{ duration: 0.9, delay: 1.1, ease: SUAVE }}
      />

      <motion.path
        d={CURVA_PRONTO} fill="none" stroke={OSCURO.cian} strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={enCuadro ? { pathLength: 1 } : {}}
        transition={{ duration: 1.1, ease: SUAVE }}
      />
      <motion.path
        d={CURVA_TARDE} fill="none" stroke={OSCURO.acento} strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={enCuadro ? { pathLength: 1 } : {}}
        transition={{ duration: 1.5, delay: 0.15, ease: SUAVE }}
      />

      {/* Los dos remates, cuando la curva ya ha llegado. */}
      {([[360, 14, OSCURO.acento, 1.5], [360, 131, OSCURO.cian, 1.1]] as const).map(
        ([cx, cy, color, tarda]) => (
          <motion.circle
            key={cy} cx={cx} cy={cy} r="4" fill={color}
            initial={{ scale: 0, opacity: 0 }}
            animate={enCuadro ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: tarda, ease: SUAVE }}
          />
        ))}
    </svg>
  );
}

/* ------------------------------------------------------------- diagrama */

const CAPAS = [
  { t: "El cuadro de áreas", d: "Unidades, tipologías, precio por m²" },
  { t: "El presupuesto", d: "Directos, indirectos, terreno" },
  { t: "El flujo", d: "Desembolsos, cronograma, interés" },
  { t: "La decisión", d: "Margen, VAN, TIR, caja" },
];

/**
 * Las cuatro capas, apiladas.
 *
 * Se montan de abajo arriba y con retraso escalonado, que es el orden en que
 * se construye una factibilidad: sin solar no hay volumetría, y sin volumetría
 * los números no significan nada. La de arriba lleva el acento porque es la
 * única que el promotor firma.
 */
export function Diagrama() {
  return (
    <div className="flex flex-col-reverse gap-2.5">
      {CAPAS.map((c, i) => {
        const ultima = i === CAPAS.length - 1;
        return (
          <motion.div
            key={c.t}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.65, delay: i * 0.13, ease: SUAVE }}
            className="flex items-center justify-between gap-4 rounded-[10px] px-5 py-4"
            style={{
              /* Cada capa se estrecha hacia arriba: la pila se lee como una
                 pirámide sin dibujar sus lados. El solar es el más ancho
                 porque es el que sostiene; con la decisión abajo, la figura
                 decía lo contrario de lo que cuenta la sección. */
              marginInline: `${i * 11}px`,
              background: ultima
                ? `linear-gradient(180deg, ${OSCURO.acentoTenue}, transparent)`
                : OSCURO.lamina,
              border: `1px solid ${ultima ? OSCURO.acento : OSCURO.borde}`,
            }}
          >
            <div>
              <div className="text-[15px] font-medio"
                   style={{ color: ultima ? OSCURO.texto : OSCURO.texto }}>
                {c.t}
              </div>
              <div className="mt-0.5 text-[13px]" style={{ color: OSCURO.suave }}>
                {c.d}
              </div>
            </div>
            <span className="font-mono text-[11px] tabular-nums"
                  style={{ color: ultima ? OSCURO.acento : OSCURO.tenue }}>
              {String(i + 1).padStart(2, "0")}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------- mini gráficos
   Cada tarjeta de capacidad lleva el suyo. Son pequeños y esquemáticos: no
   pretenden ser la pantalla real, sino decir de un vistazo qué hace. */

/** Mapa: parcelas que se encienden una tras otra. */
export function MiniMapa() {
  const celdas = Array.from({ length: 32 }, (_, i) => i);
  const vivas = new Set([5, 6, 13, 14, 17, 21, 22, 26]);
  return (
    <div className="grid max-w-[232px] grid-cols-8 gap-1.5">
      {celdas.map(i => (
        <motion.div
          key={i}
          className="aspect-square rounded-[3px]"
          initial={{ opacity: 0.18 }}
          whileInView={{ opacity: vivas.has(i) ? 1 : 0.18 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 + i * 0.025, ease: SUAVE }}
          style={{
            background: vivas.has(i) ? OSCURO.acento : OSCURO.borde,
          }}
        />
      ))}
    </div>
  );
}

/** Simulador: tres escenarios que crecen a distinta altura. */
export function MiniSimulador() {
  const barras = [0.42, 0.74, 0.58, 0.9, 0.66];
  return (
    <div className="flex h-[84px] max-w-[232px] items-end gap-2">
      {barras.map((h, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t-[3px]"
          initial={{ height: "8%" }}
          whileInView={{ height: `${h * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 + i * 0.09, ease: SUAVE }}
          style={{
            background: i === 3 ? OSCURO.acento : OSCURO.bordeVivo,
          }}
        />
      ))}
    </div>
  );
}

/** Gráficos: una curva de caja que cruza el cero. */
export function MiniCaja() {
  const ref = useRef<SVGSVGElement>(null);
  const enCuadro = useInView(ref, { once: true });
  return (
    <svg ref={ref} viewBox="0 0 160 76" className="h-[84px] w-full max-w-[232px]"
         preserveAspectRatio="xMinYMid meet">
      <line x1="0" x2="160" y1="52" y2="52" stroke={OSCURO.borde} strokeWidth="1" />
      <motion.path
        d="M 4 20 C 30 26, 48 44, 72 56 C 96 68, 124 46, 156 12"
        fill="none" stroke={OSCURO.cian} strokeWidth="2" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={enCuadro ? { pathLength: 1 } : {}}
        transition={{ duration: 1.2, delay: 0.3, ease: SUAVE }}
      />
    </svg>
  );
}

/** Hitos: una línea de tiempo con sus jalones. */
export function MiniHitos() {
  return (
    <div className="relative flex h-[84px] max-w-[232px] items-center">
      <div className="absolute inset-x-0 h-px" style={{ background: OSCURO.borde }} />
      <motion.div
        className="absolute left-0 h-px"
        initial={{ width: "0%" }}
        whileInView={{ width: "62%" }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, delay: 0.3, ease: SUAVE }}
        style={{ background: OSCURO.acento }}
      />
      {[0, 0.31, 0.62, 0.85].map((p, i) => (
        <motion.span
          key={p}
          className="absolute h-2.5 w-2.5 rounded-full"
          style={{
            left: `calc(${p * 100}% - 5px)`,
            background: p <= 0.62 ? OSCURO.acento : OSCURO.lamina,
            border: `1.5px solid ${p <= 0.62 ? OSCURO.acento : OSCURO.bordeVivo}`,
          }}
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 + i * 0.16, ease: SUAVE }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- preguntas */

/**
 * Una pregunta del desplegable.
 *
 * Se anima la altura, no la opacidad: plegar sin mover la altura deja un hueco
 * y la lista salta. `height: auto` en `animate` lo mide framer-motion solo.
 */
export function Pregunta({ p, r, abierta, alPulsar }: {
  p: string; r: string; abierta: boolean; alPulsar: () => void;
}) {
  return (
    <div style={{ borderTop: `1px solid ${OSCURO.borde}` }}>
      <button
        onClick={alPulsar}
        aria-expanded={abierta}
        /* `gap-4` y `min-w-0` en la pregunta. Con veinticuatro píxeles de hueco
           y el texto sin permiso para partirse, la fila medía cinco píxeles más
           que la columna en un teléfono y arrastraba la página entera. */
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors"
        style={{ color: abierta ? OSCURO.texto : OSCURO.suave }}
      >
        <span className="min-w-0 text-[15.5px] font-medio leading-snug sm:text-[16.5px]">{p}</span>
        <motion.span
          animate={{ rotate: abierta ? 45 : 0 }}
          transition={{ duration: 0.35, ease: SUAVE }}
          className="grid h-6 w-6 shrink-0 place-items-center text-[18px] leading-none"
          style={{ color: abierta ? OSCURO.acento : OSCURO.tenue }}
        >
          +
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: abierta ? "auto" : 0, opacity: abierta ? 1 : 0 }}
        transition={{ duration: 0.4, ease: SUAVE }}
        className="overflow-hidden"
      >
        <p className="max-w-[62ch] pb-6 text-[15px] leading-relaxed"
           style={{ color: OSCURO.suave }}>
          {r}
        </p>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------ el fondo */

/* Las dos máscaras del fondo.

   Una cuadrícula que llega hasta debajo del titular no es textura, es ruido: a
   cuerpo de cartel las líneas cruzan las contraformas de las letras y el texto
   deja de tener suelo. Cada retícula se abre en el centro y vuelve hacia los
   cantos, de modo que la hoja de dibujo se reconoce por los bordes —que es
   donde se mira una hoja— y el rótulo se compone sobre papel limpio.

   La gruesa se abre más que la fina: sus líneas pesan tres veces más, así que
   con el mismo hueco seguirían pasando por encima de la primera pantalla. */
const HUECO_FINO = "radial-gradient(105% 70% at 50% 22%, transparent 10%, #000 46%)";
const HUECO_GRUESO = "radial-gradient(112% 78% at 50% 20%, transparent 18%, #000 56%)";

/* Y la página entera se apaga hacia abajo: la trama es de la portada, no del
   pie, y en las secciones de texto sólo estorba. */
const DESVANECIDO = "linear-gradient(180deg, #000 0%, #000 46%, transparent 88%)";

/**
 * La trama del fondo.
 *
 * Papel de dibujo en dos pesos, con un halo del acento detrás del titular.
 *
 * Estaba escrita a dos pasos —ocho píxeles dentro de sesenta y cuatro— pero con
 * el mismo color y el mismo grosor en los cuatro degradados, así que la
 * cuadrícula gruesa no se distinguía de la fina y el conjunto salía como una
 * malla uniforme de canto a canto. Separadas de verdad hacen dos cosas
 * distintas: la fina de ocho píxeles es grano, y la gruesa de noventa y seis es
 * la cuadrícula que se reconoce como hoja de proyecto.
 *
 * Las dos se desplazan con la página a distinta velocidad. La gruesa va más
 * lenta, y esa diferencia es lo que le da fondo al papel: con las dos a la
 * misma velocidad se leen como una sola imagen pegada detrás.
 */
export function Trama({ progreso }: { progreso?: MotionValue<number> }) {
  /* El valor de reserva se crea siempre y se descarta si llega uno de fuera.
     Estaba escrito como `progreso ?? useMotionValue(0)`, que llama al gancho
     sólo cuando falta la propiedad: un gancho condicional, y de los que no
     avisan hasta que alguien monta el componente de las dos maneras. */
  const propio = useMotionValue(0);
  const avance = progreso ?? propio;
  const yFino = useTransform(avance, [0, 1], [0, -96]);
  const yGrueso = useTransform(avance, [0, 1], [0, -48]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden"
         style={{ maskImage: DESVANECIDO, WebkitMaskImage: DESVANECIDO }}>
      {/* El grano. */}
      <motion.div
        className="absolute inset-0"
        style={{
          y: yFino,
          backgroundImage: `
            linear-gradient(${OSCURO.reja} 1px, transparent 1px),
            linear-gradient(90deg, ${OSCURO.reja} 1px, transparent 1px)`,
          backgroundSize: "8px 8px",
          maskImage: HUECO_FINO,
          WebkitMaskImage: HUECO_FINO,
        }}
      />
      {/* La cuadrícula. */}
      <motion.div
        className="absolute inset-0"
        style={{
          y: yGrueso,
          backgroundImage: `
            linear-gradient(${OSCURO.rejaMayor} 1px, transparent 1px),
            linear-gradient(90deg, ${OSCURO.rejaMayor} 1px, transparent 1px)`,
          backgroundSize: "96px 96px",
          maskImage: HUECO_GRUESO,
          WebkitMaskImage: HUECO_GRUESO,
        }}
      />
      {/* La luz de arriba. Cose la banda con el papel: sin ella el velo de la
          banda corta en seco contra la trama y se ve la juntura. */}
      <div className="absolute inset-x-0 top-0 h-[22rem]"
           style={{ background: `linear-gradient(180deg, ${OSCURO.laminaAlta}, transparent)` }} />
      <div
        className="absolute left-1/2 top-[-20rem] h-[40rem] w-[70rem] -translate-x-1/2"
        style={{ background: `radial-gradient(closest-side, ${OSCURO.halo}, transparent)` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------- las guías */

/**
 * Las líneas maestras del plano.
 *
 * Dos verticales punteadas en los cantos de la columna, con marcas de escuadra
 * donde se cruzan con el filete de una sección. Es lo que un plano lleva y una
 * página web normalmente no: la cota que dice dónde está el margen y por qué
 * todo se alinea ahí.
 *
 * No es adorno gratuito. La página entera se compone contra una columna de
 * 1180 px, y esas dos líneas la hacen visible: con ellas, que el titular, la
 * banda de capacidades y la vitrina empiecen en el mismo sitio se lee como una
 * decisión en lugar de como una casualidad.
 *
 * Van dentro de un contenedor posicionado, no fijas: tienen que recorrer la
 * sección a la que pertenecen, no la ventana.
 */
export function Guias({ marcas = true }: { marcas?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {(["left-0", "right-0"] as const).map(lado => (
        <span key={lado} className={`absolute inset-y-0 ${lado} w-px`}
              style={{
                backgroundImage: `repeating-linear-gradient(180deg, ${OSCURO.guia} 0 4px, transparent 4px 10px)`,
              }} />
      ))}
      {marcas && (["left-0 top-0", "right-0 top-0", "left-0 bottom-0", "right-0 bottom-0"] as const)
        .map(pos => (
          <span key={pos}
            className={`absolute h-[7px] w-[7px] -translate-x-1/2 rotate-45 ${pos}`}
            style={{
              /* La escuadra se centra en el cruce: media altura arriba y media
                 abajo, o el rombo cuelga de la línea en vez de marcarla. */
              marginTop: pos.includes("top") ? "-3.5px" : undefined,
              marginBottom: pos.includes("bottom") ? "-3.5px" : undefined,
              border: `1px solid ${OSCURO.guia}`,
              background: OSCURO.fondo,
            }} />
        ))}
    </div>
  );
}

/* ------------------------------------------------- el visual de portada */

/**
 * La ficha de factibilidad del titular.
 *
 * Es el gesto que hace Antimetal con su gráfico: en lugar de una captura de
 * pantalla, el dato en limpio. Aquí es la conclusión de un estudio —margen,
 * VAN, TIR— con la barra de sensibilidad moviéndose sola, que es lo que hace
 * la herramienta cuando cambias una hipótesis.
 */
export function FichaPortada({ proyecto }: {
  proyecto: {
    nombre: string; distrito: string; unidades: number; gla: number;
    ventas: number; costo: number; margen: number; van: number;
    tir: number | null;
  };
}) {
  const [hipotesis, setHipotesis] = useState(62);
  const [manual, setManual] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const enCuadro = useInView(ref, { margin: "-40px" });
  const quieto = useReducedMotion();

  /**
   * La barra se mueve sola hasta que alguien la toca: enseña que el número es
   * vivo sin pedir que nadie interactúe.
   *
   * Tres cosas la paran, y ninguna estaba: que la toquen, que la ficha salga de
   * cuadro y que el sistema pida menos movimiento. Antes era un `setInterval`
   * de cuarenta milisegundos que seguía repintando la ficha con la página a
   * cuatro pantallas de distancia y con la pestaña de fondo —veinticinco
   * renderizados por segundo para siempre— y que ignoraba la preferencia de
   * accesibilidad.
   *
   * Va con `requestAnimationFrame` y no con temporizador: el navegador lo
   * suspende solo al pasar a otra pestaña, y el paso se calcula por tiempo
   * transcurrido, así que la oscilación dura lo mismo en una pantalla de 60 Hz
   * que en una de 120.
   */
  useEffect(() => {
    if (manual || quieto || !enCuadro) return;
    let cuadro = 0;
    let anterior = 0;
    let t = 0;
    const paso = (ahora: number) => {
      if (anterior) t += (ahora - anterior) / 1000;
      anterior = ahora;
      setHipotesis(62 + Math.sin(t * 0.9) * 16);
      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [manual, quieto, enCuadro]);

  /* Los tres indicadores salen de la promoción de verdad y se recalculan como
     en el simulador: mover el precio de venta mueve el ingreso, y el margen es
     lo que queda después del coste, que no se mueve. La hipótesis de partida
     —62— es el precio del estudio; por debajo baja el ingreso y por encima
     sube, igual que allí. */
  const factor = hipotesis / 62;
  const ingreso = proyecto.ventas * factor;
  const utilidad = ingreso - proyecto.costo;
  const margen = ingreso > 0 ? (utilidad / ingreso) * 100 : 0;
  const van = (proyecto.van / 1e6) * factor;
  const tir = (proyecto.tir ?? 0) * 100 * factor;
  /* El umbral del comité: quince por ciento de margen. */
  const sano = margen >= 15;
  const precioM2 = proyecto.gla > 0 ? (ingreso / proyecto.gla) : 0;

  return (
    <div
      ref={ref}
      className="rounded-[14px] p-5 backdrop-blur-xl sm:p-6"
      style={{
        background: `linear-gradient(165deg, ${OSCURO.laminaAlta}, ${OSCURO.lamina})`,
        border: `1px solid ${OSCURO.borde}`,
        boxShadow: OSCURO.sombra,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em]"
              style={{ color: OSCURO.tenue }}>
          {proyecto.nombre} · {proyecto.distrito}
        </span>
        <span
          className="rounded-full px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors"
          style={{
            background: sano ? OSCURO.acentoTenue : "rgb(var(--riesgo) / .14)",
            color: sano ? OSCURO.acento : "rgb(var(--riesgo))",
          }}
        >
          {sano ? "Viable" : "Tenso"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        {([
          ["Margen", `${margen.toFixed(1)}%`],
          ["VAN", `${van.toFixed(2)} M$`],
          ["TIR", `${tir.toFixed(1)}%`],
        ] as const).map(([rotulo, valor]) => (
          <div key={rotulo}>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em]"
                 style={{ color: OSCURO.tenue }}>
              {rotulo}
            </div>
            <div className="mt-1 text-[22px] font-medio tabular-nums"
                 style={{ color: OSCURO.texto }}>
              {valor}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em]"
                style={{ color: OSCURO.tenue }}>
            Precio de venta
          </span>
          <span className="font-mono text-[11px] tabular-nums" style={{ color: OSCURO.suave }}>
            {Math.round(precioM2).toLocaleString("es-ES")} $/m²
          </span>
        </div>
        <input
          type="range" min={20} max={100} value={hipotesis}
          onChange={e => { setManual(true); setHipotesis(Number(e.target.value)); }}
          aria-label="Precio de venta"
          className="deslizador mt-2.5 w-full"
          style={{
            /* El relleno del recorrido se pinta con el propio fondo del
               control, en función del valor. */
            background: `linear-gradient(90deg, ${OSCURO.acento} ${(hipotesis - 20) / 0.8}%, ${OSCURO.borde} ${(hipotesis - 20) / 0.8}%)`,
          }}
        />
      </div>
    </div>
  );
}
