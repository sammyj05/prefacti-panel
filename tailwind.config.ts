import type { Config } from "tailwindcss";

/**
 * Prefacti — juego de plantas.
 *
 * El sistema anterior era el de un panel de administración cualquiera: fondo
 * azul pálido, barra roja arriba, tarjetas blancas con sombra. Correcto y de
 * nadie. Éste parte de dónde se usa la herramienta: sobre la mesa, junto a un
 * juego de planos. De ahí vienen las tres decisiones que lo sostienen.
 *
 * 1. Papel cálido, no blanco de pantalla. `hueso` es el fondo de trabajo;
 *    `mesa` el tono más oscuro sobre el que se apoyan las piezas.
 * 2. Jerarquía por grosor de línea, no por sombra. Un plano no lleva sombras
 *    paralaje: lleva filetes de tres pesos. Por eso `trazo` tiene tres pasos y
 *    las sombras casi han desaparecido.
 * 3. Un solo acento. `minio` es el rojo de plomada y marca de obra — se usa
 *    poco y siempre significa algo. El resto del color es semántico: sólo
 *    aparece para decir si un número va bien o mal.
 */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  /* El tema se marca con `.oscuro` en el `<html>`. Casi no hace falta el
     prefijo `dark:` —el color sale de variables— pero queda disponible para
     lo que dependa del tema y no sea color: una imagen, un mezclado. */
  darkMode: ["class", ".oscuro"],
  theme: {
    extend: {
      colors: {
        /* Ni un valor de color vive aquí: todos están en `globals.css`, en dos
           bloques —`:root` y `.oscuro`— y esto sólo les pone nombre. Es lo que
           permite que el tema cambie con una clase en el `<html>` sin que las
           pantallas lleven una sola clase condicional.

           `rgb(var(--x) / <alpha-value>)` es lo que mantiene vivos los
           modificadores de opacidad: `text-tinta-500/70` sustituye el alfa en
           el sitio correcto. Los tonos que ya nacen con alfa —filetes,
           vidrios— van como color completo y no admiten modificador. */
        hueso:  {
          DEFAULT: "rgb(var(--hueso) / <alpha-value>)",
          alto:    "rgb(var(--hueso-alto) / <alpha-value>)",
          bajo:    "rgb(var(--hueso-bajo) / <alpha-value>)",
          mesa:    "rgb(var(--hueso-mesa) / <alpha-value>)",
        },
        tinta:  {
          950: "rgb(var(--tinta-950) / <alpha-value>)",
          900: "rgb(var(--tinta-900) / <alpha-value>)",
          700: "rgb(var(--tinta-700) / <alpha-value>)",
          500: "rgb(var(--tinta-500) / <alpha-value>)",
          400: "rgb(var(--tinta-400) / <alpha-value>)",
          300: "rgb(var(--tinta-300) / <alpha-value>)",
        },
        trazo:  { fino: "var(--trazo-fino)", medio: "var(--trazo-medio)", grueso: "var(--trazo-grueso)" },
        /* Los cuatro vidrios, de hundido a saliente. Sustituyen a los
           `bg-white/[.04]` sueltos, que sólo funcionaban en oscuro. */
        vidrio: {
          hondo:   "var(--vidrio-hondo)",
          DEFAULT: "var(--vidrio)",
          alto:    "var(--vidrio-alto)",
          tope:    "var(--vidrio-tope)",
        },
        minio:  {
          700: "rgb(var(--minio-700) / <alpha-value>)",
          600: "rgb(var(--minio-600) / <alpha-value>)",
          500: "rgb(var(--minio-500) / <alpha-value>)",
          100: "rgb(var(--minio-100) / <alpha-value>)",
        },
        cian:   {
          900: "rgb(var(--cian-900) / <alpha-value>)",
          700: "rgb(var(--cian-700) / <alpha-value>)",
          500: "rgb(var(--cian-500) / <alpha-value>)",
          100: "rgb(var(--cian-100) / <alpha-value>)",
        },
        viable: "rgb(var(--viable) / <alpha-value>)",
        tenso:  "rgb(var(--tenso) / <alpha-value>)",
        riesgo: "rgb(var(--riesgo) / <alpha-value>)",
        // Seis ranuras de serie, validadas contra daltonismo. No se reasignan.
        serie:  { 1:"#5FA0C4", 2:"#D9663C", 3:"#6FA88A", 4:"#C0A166", 5:"#A886B8", 6:"#7E97A3" },

        /* ---- Puente con los nombres antiguos ----------------------------
         * Las ocho páginas están escritas contra `paper`, `ink`, `navy`,
         * `brick`… Si esos nombres desaparecen, Tailwind deja de emitir esas
         * clases y las pantallas se quedan sin estilo, no «con el estilo
         * viejo». Así que en vez de borrarlos se reapuntan a las plantas
         * nuevas: el panel entero cambia de tono sin tocar su marcado, y lo
         * que se vaya rehaciendo pasa a los nombres de arriba.
         * Cuando no quede ningún uso, este bloque se cae entero.            */
        paper: {
          DEFAULT: "rgb(var(--hueso) / <alpha-value>)",
          raised:  "rgb(var(--hueso-alto) / <alpha-value>)",
          sunk:    "rgb(var(--hueso-bajo) / <alpha-value>)",
        },
        ink:   {
          900: "rgb(var(--tinta-950) / <alpha-value>)",
          700: "rgb(var(--tinta-700) / <alpha-value>)",
          500: "rgb(var(--tinta-500) / <alpha-value>)",
          400: "rgb(var(--tinta-400) / <alpha-value>)",
          300: "rgb(var(--tinta-300) / <alpha-value>)",
        },
        line:  { DEFAULT: "var(--trazo-fino)", strong: "var(--trazo-medio)" },
        navy:  {
          950: "rgb(var(--tinta-950) / <alpha-value>)",
          900: "rgb(var(--tinta-900) / <alpha-value>)",
          800: "rgb(var(--cian-700) / <alpha-value>)",
          700: "rgb(var(--cian-500) / <alpha-value>)",
          600: "rgb(var(--cian-500) / <alpha-value>)",
          500: "rgb(var(--cian-500) / <alpha-value>)",
          200: "rgb(var(--cian-500) / 0.28)",
          100: "rgb(var(--cian-500) / 0.18)",
          50:  "rgb(var(--cian-500) / 0.08)",
        },
        brick: {
          800: "rgb(var(--minio-700) / <alpha-value>)",
          700: "rgb(var(--minio-700) / <alpha-value>)",
          600: "rgb(var(--minio-600) / <alpha-value>)",
          500: "rgb(var(--minio-500) / <alpha-value>)",
          100: "rgb(var(--minio-100) / <alpha-value>)",
        },
        ember: {
          600: "rgb(var(--minio-600) / <alpha-value>)",
          500: "rgb(var(--minio-500) / <alpha-value>)",
          400: "rgb(var(--minio-500) / <alpha-value>)",
        },
        good:  "rgb(var(--viable) / <alpha-value>)",
        warn:  "rgb(var(--tenso) / <alpha-value>)",
        bad:   "rgb(var(--riesgo) / <alpha-value>)",
      },
      fontFamily: {
        /* Fraunces vuelve al titular.
           Instrument Serif es elegante y tiene un problema para lo que se le
           pide aquí: sólo trae un peso, el regular, así que un titular grande
           salía necesariamente fino. Fraunces es variable hasta 900 y lleva un
           eje óptico —`opsz`— con el que el dibujo se engorda al crecer, que es
           justo lo que hace un tipo de rótulo de verdad. El corte que hay en
           `public/fonts` trae sólo los dos ejes útiles —`opsz` y `wght`—, sin
           los de fantasía que en su día la descartaron. */
        /* La familia también es elegible: `--fuente-display` y `--fuente-sans`
           las declara `globals` una vez por juego —neutra, documento, editorial
           y grotesca— y aquí sólo se les pone nombre, igual que con el color.
           El recambio va en grotesca porque la de casa lo es: si la variable
           faltara, un serif de sistema cambiaría el registro de la página
           entera en vez de sostenerlo. */
        display: ["var(--fuente-display)", "Anton", "Space Grotesk", "system-ui", "sans-serif"],
        /* Instrument Serif se queda para el detalle en cursiva. */
        serifita: ["Instrument Serif", "Georgia", "serif"],
        /* Instrument Sans: la compañera de la Instrument Serif del titular, así
           que rótulo y cuerpo vienen por fin del mismo dibujo. Es variable
           (400–700), con lo que los pesos intermedios se siguen pidiendo tal
           cual. Inter queda de recambio — era correcta, pero neutra hasta el
           punto de no tener voz. */
        sans: ["var(--fuente-sans)", "Plus Jakarta Sans", "Geist", "system-ui", "sans-serif"],
        /* La mono también sigue al eje de letra: Geist Mono acompaña a Geist —
           mismo dibujo, mismo ancho de trazo— y Roboto Mono se queda para los
           otros dos juegos. Una mono fija junto a tres familias distintas es lo
           que hacía que las etiquetas de plano cantaran en dos de los tres. */
        mono: ["var(--fuente-mono)", "Geist Mono", "IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        /* Grotesca suiza, sólo para la portada Wild: Archivo tiene demasiado
           carácter para un rótulo que se quiere neutro y de rejilla. */
        swiss: ["Inter", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
      },
      fontSize: {
        /* Escala de Mercury: 55 px arriba (su `7xl`), 32 y 21 en los pasos
           intermedios, cuerpo en 14 con interlínea 1.5. El cambio de fondo no
           es el tamaño sino el interletraje: Mercury compone a cero, sin el
           apretado de titular que llevábamos. Una grotesca neutra en cuerpo
           grande no lo necesita, y a cero respira como su portada. */
        titular: ["clamp(2.5rem, 5vw, 3.75rem)", { lineHeight: "1.06", letterSpacing: "0em" }],
        rotulo:  ["2.25rem", { lineHeight: "1.22", letterSpacing: "0em" }],
        sub:     ["1.5rem", { lineHeight: "1.35", letterSpacing: "0em" }],
        /* 15 px. Sobre fondo oscuro el texto pesa ópticamente menos que sobre
           papel — el mismo cuerpo se lee más fino — así que la escala entera
           sube un escalón para compensar. */
        cuerpo:  ["15px", { lineHeight: "1.55" }],
        /* Anotación: versalitas espaciadas, como la rotulación de un plano.
           Se queda en mono espaciado — es la única marca de plano que sobrevive
           al cambio de registro, y es la que separa una leyenda de un dato. */
        nota:    ["11.5px", { lineHeight: "1.3", letterSpacing: "0.09em" }],
        // Puente: la escala vieja, reapuntada a la nueva.
        "display-lg": ["clamp(2.5rem, 5vw, 3.75rem)", { lineHeight: "1.06", letterSpacing: "0em" }],
        "display":    ["2.25rem", { lineHeight: "1.22", letterSpacing: "0em" }],
        "display-sm": ["1.5rem", { lineHeight: "1.35", letterSpacing: "0em" }],
      },
      fontWeight: {
        /* Los tres pesos suben un escalón entero.
           Los anteriores —420/480/530— venían de Mercury, que compone sobre
           beige y a cuerpos grandes; aquí la interfaz es densa y con mucha
           cifra, y a 13–15 px ese rango se leía deslavado. Subidos, el rótulo
           de interfaz por fin pesa más que el dato que rotula. */
        libro: "460",
        medio: "560",
        rotulo: "640",
      },
      boxShadow: {
        /* La escala de Linear, que es de tres pasos y muy suave: la sombra no
           dibuja el borde de la pieza, la despega del fondo. Sustituye al
           filete de un pixel que teníamos, que era lo que hacía que todo se
           leyera como una casilla dentro de otra. */
        pieza: "0 1px 4px -1px rgba(0,0,0,.09)",
        media: "0 3px 12px rgba(0,0,0,.09)",
        flota: "0 7px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06)",
        // Puente.
        card:  "0 1px 4px -1px rgba(0,0,0,.09)",
        raise: "0 3px 12px rgba(0,0,0,.09)",
        pop:   "0 7px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06)",
        inset: "inset 0 1px 0 rgba(255,255,255,.6)",
      },
      /* Radios de Linear: 8 / 12 / 16 / 24, y pastilla para todo lo que se
         pulsa. Su `--app-radius` es 12 px y las piezas grandes suben a 16 y
         24; el salto desde los 8 px anteriores es lo que quita la sensación de
         cuadrícula sin que nada llegue a parecer un juguete. */
      /* Los cuatro radios dejan de ser fijos. Cada uno apunta a una variable
         que `globals` declara tres veces —redondeado, suave y recto— para que
         el canto de la interfaz entera sea una preferencia y no una decisión
         cerrada: hay quien lee el radio generoso como papel recortado y quien
         lo lee como juguete, y no se puede acertar con los dos a la vez. */
      borderRadius: {
        control: "var(--radio-control)", // campos, botones cuadrados
        pieza:   "var(--radio-pieza)",   // la pieza estándar
        caja:    "var(--radio-caja)",    // lo que agrupa piezas
        hueco:   "var(--radio-hueco)",   // bloques de portada
        xl2:     "var(--radio-caja)",
      },
      letterSpacing: { nota: "0.11em" },
    },
  },
  plugins: [],
} satisfies Config;
