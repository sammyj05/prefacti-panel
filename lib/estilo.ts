/**
 * Los estilos que puede elegir quien usa la aplicación.
 *
 * No son cuatro filtros de color: cada uno redefine el juego entero de plantas
 * en `app/estilos.css` —papel, tinta, filetes, vidrios, acento, semántica,
 * etapas— porque en este sistema el color no es una capa por encima, es de
 * donde sale todo lo demás.
 *
 * El nombre y la descripción de cada uno dicen de dónde viene, no cómo se ve.
 * «Azul frío» no ayuda a decidir; «el de prefacti.com» sí.
 */
export type Estilo = "plano" | "ladrillo" | "cobalto" | "espresso" | "monocromo";

export const ESTILOS: {
  k: Estilo; t: string; d: string;
  /** Las tres muestras del botón: papel, acento y tinta. */
  m: [string, string, string];
}[] = [
  { k: "plano", t: "Plano", d: "El de la casa. Papel de dibujo cálido y azul de plomada.",
    m: ["#F7F5F1", "#1F5FD6", "#191713"] },
  { k: "cobalto", t: "Cobalto", d: "Azul y celeste sobre blanco frío de pantalla.",
    m: ["#FAFBFD", "#1056C8", "#080C16"] },
  { k: "ladrillo", t: "Ladrillo", d: "El rojo de plomada de prefacti.com, sobre gris de plano.",
    m: ["#F2F4F9", "#A6211A", "#101622"] },
  { k: "espresso", t: "Espresso", d: "Papel crema y tinta de café, con acento terracota.",
    m: ["#FAF6EE", "#C6641A", "#2C1F17"] },
  { k: "monocromo", t: "Monocromo", d: "Sin color salvo el rojo de riesgo. Todo en valor.",
    m: ["#FAFAF9", "#3A3A38", "#090F05"] },
];

/* Papel de dibujo y azul de plomada: es el registro del producto, y el mismo
   que la portada. El blanco frío de pantalla pasa a ser una opción más. */
export const ESTILO_POR_DEFECTO: Estilo = "plano";
export const CLAVE_ESTILO = "pf-estilo";

/** Aplica el estilo al documento y lo recuerda. */
export function ponerEstilo(e: Estilo) {
  document.documentElement.dataset.estilo = e;
  try { localStorage.setItem(CLAVE_ESTILO, e); } catch {}
}

/** El estilo guardado, o el de la casa. */
export function estiloGuardado(): Estilo {
  try {
    const v = localStorage.getItem(CLAVE_ESTILO);
    if (ESTILOS.some(x => x.k === v)) return v as Estilo;
  } catch {}
  return ESTILO_POR_DEFECTO;
}


/* --------------------------------------------------------------------------
   Los tres ejes de forma.

   Mismo mecanismo que el color: un atributo en el `<html>`, un juego de
   variables por valor y nada de clases condicionales en las pantallas. Se
   guardan por separado porque son decisiones independientes — hay quien quiere
   canto vivo con la letra de siempre, y quien quiere lo contrario.
   -------------------------------------------------------------------------- */

/** Un eje: su atributo, su clave de memoria y sus tres opciones. */
export type Eje = {
  attr: string;
  clave: string;
  porDefecto: string;
  rotulo: string;
  ayuda: string;
  opciones: { k: string; t: string; d: string }[];
};

export const EJES: Eje[] = [
  {
    attr: "canto", clave: "pf-canto", porDefecto: "redondo",
    rotulo: "Canto",
    ayuda: "El radio de las esquinas, de la pieza al campo de texto.",
    opciones: [
      { k: "redondo", t: "Redondeado",
        d: "El de la casa. A veinte píxeles la pieza se lee como papel recortado." },
      { k: "suave", t: "Suave",
        d: "Radio corto. Menos gesto, más densidad — el registro de una herramienta." },
      { k: "recto", t: "Recto",
        d: "Canto vivo. La interfaz se lee como una hoja de expediente." },
    ],
  },
  {
    attr: "lamina", clave: "pf-lamina", porDefecto: "elevado",
    rotulo: "Superficie",
    ayuda: "Cómo se despega una pieza del papel que tiene detrás.",
    opciones: [
      { k: "elevado", t: "Elevada",
        d: "Sombra difusa y canto de luz. Las piezas flotan sobre el fondo." },
      { k: "plano", t: "Plana",
        d: "Sin sombras. Manda el filete — con treinta piezas en pantalla, las sombras ensucian." },
      { k: "contorno", t: "Contorno",
        d: "Sin sombra y con el filete al doble. La jerarquía la lleva la línea, como en un plano." },
    ],
  },
  {
    attr: "letra", clave: "pf-letra", porDefecto: "neutra",
    rotulo: "Letra",
    ayuda: "La familia del rótulo, la del cuerpo y la de la cota.",
    opciones: [
      /* La clave sigue diciendo «neutra» porque es lo que hay guardado en el
         navegador de quien ya eligió; el rótulo y la descripción sí cuentan lo
         que hace hoy. */
      { k: "neutra", t: "Plano",
        d: "Anton de rótulo sobre Plus Jakarta Sans, con Geist Mono en la cota. Cartel arriba, cuerpo legible abajo." },
      { k: "cartel", t: "Cartel",
        d: "Space Grotesk de rótulo, algo menos densa que la condensada, sobre la misma sans y la misma mono." },
      { k: "documento", t: "Documento",
        d: "IBM Plex en sus tres voces: serif de rótulo, sans de cuerpo y mono de cota. La letra del oficio." },
      { k: "editorial", t: "Editorial",
        d: "Fraunces de rótulo sobre Instrument Sans. Con más carácter." },
      { k: "grotesca", t: "Grotesca",
        d: "Archivo de rótulo sobre Inter. Carácter de cartel arriba, neutro abajo." },
    ],
  },
];

/** Aplica el valor de un eje al documento y lo recuerda. */
export function ponerEje(eje: Eje, valor: string) {
  document.documentElement.dataset[eje.attr] = valor;
  try { localStorage.setItem(eje.clave, valor); } catch {}
}

/** El valor guardado de un eje, o el de la casa. */
export function ejeGuardado(eje: Eje): string {
  try {
    const v = localStorage.getItem(eje.clave);
    if (eje.opciones.some(o => o.k === v)) return v as string;
  } catch {}
  return eje.porDefecto;
}
