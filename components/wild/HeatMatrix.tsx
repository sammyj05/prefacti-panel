"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";

/**
 * Matriz de píxeles.
 *
 * Dos figuras y un derrumbe entre ellas. Arriba del todo, la trama dibuja
 * PREFACTI; conforme se baja, las celdas se sueltan desde la fila de arriba y
 * van cayendo hasta recomponerse en una silueta de torres con sus ventanas.
 * Es la única imagen que hacía falta en la portada de una herramienta de
 * factibilidad: la palabra se convierte en lo que la palabra sirve para
 * decidir.
 *
 * No hay física. Cada celda tiene un umbral propio que crece con la fila y con
 * un ruido fijo, y cambia de figura cuando el avance del desplazamiento lo
 * supera. Como los umbrales de arriba son más bajos, el cambio barre de arriba
 * abajo y se lee como material que cae y se apila — con la ventaja de que va y
 * viene con la rueda, cosa que una simulación no haría sin guardar estado.
 *
 * La interacción no pasa por estado de React. Son 4.608 celdas; un `setState`
 * por movimiento del ratón reconciliaría el árbol entero a 60 fps. El bucle
 * escribe `style.backgroundColor` directamente y sólo sobre las celdas que
 * cambian de tramo, así que un fotograma en reposo no toca el DOM.
 */

const COLS = 96;
const ROWS = 48;
const N = COLS * ROWS;

const LETRA_COLOR = "var(--matriz-letra)";
const AURA = "var(--matriz-aura)";
const CAMPO = "var(--matriz-campo)";
const GRANO = "var(--matriz-grano)";
const NADA = "transparent";

/** Ruido determinista en [0,1). Misma entrada, misma salida, en ambos lados. */
function ruido(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* --------------------------------------------------------------------------
   Figura 1 — la palabra.
   Cada letra es una rejilla de 5×7 y las ocho ocupan 94 de las 96 columnas.
   -------------------------------------------------------------------------- */
const ALFABETO: Record<string, string[]> = {
  P: ["1111 ", "1   1", "1   1", "1111 ", "1    ", "1    ", "1    "],
  R: ["1111 ", "1   1", "1   1", "1111 ", "1 1  ", "1  1 ", "1   1"],
  E: ["11111", "1    ", "1    ", "1111 ", "1    ", "1    ", "11111"],
  F: ["11111", "1    ", "1    ", "1111 ", "1    ", "1    ", "1    "],
  A: ["  1  ", " 1 1 ", "1   1", "1   1", "11111", "1   1", "1   1"],
  C: [" 1111", "1    ", "1    ", "1    ", "1    ", "1    ", " 1111"],
  T: ["11111", "  1  ", "  1  ", "  1  ", "  1  ", "  1  ", "  1  "],
  I: ["11111", "  1  ", "  1  ", "  1  ", "  1  ", "  1  ", "11111"],
};

const PALABRA = "PREFACTI";
const ESCALA = 2;
const LETRA_ANCHO = 5 * ESCALA;
const LETRA_ALTO = 7 * ESCALA;
const HUECO = 1 * ESCALA;
const PALABRA_ANCHO = PALABRA.length * (LETRA_ANCHO + HUECO) - HUECO;
const COL0 = Math.floor((COLS - PALABRA_ANCHO) / 2);
const FIL0 = Math.floor((ROWS - LETRA_ALTO) / 2);

function enPalabra(c: number, f: number) {
  if (f < FIL0 || f >= FIL0 + LETRA_ALTO) return false;
  const dc = c - COL0;
  if (dc < 0 || dc >= PALABRA_ANCHO) return false;
  const paso = LETRA_ANCHO + HUECO;
  const col = dc % paso;
  if (col >= LETRA_ANCHO) return false;
  const letra = ALFABETO[PALABRA[Math.floor(dc / paso)]];
  return letra[Math.floor((f - FIL0) / ESCALA)][Math.floor(col / ESCALA)] === "1";
}

/* --------------------------------------------------------------------------
   Figura 2 — la manzana.

   Ocho torres apoyadas en la última fila, de anchos y alturas distintos. Las
   proporciones no son decorativas: salen del mismo rango que la cartera —de
   siete a cuarenta y cuatro plantas— así que la silueta es la de una manzana
   de Panamá y no la de un skyline genérico.

   Las ventanas son el hueco de cada dos filas y cada tres columnas, que es lo
   que hace que a esta escala se lea «edificio» y no «barra». La planta baja se
   deja maciza, como en la calle.
   -------------------------------------------------------------------------- */
const TORRES: [number, number][] = [
  /* [ancho, plantas] — la altura en celdas es plantas × 0.8, topada al alto. */
  [9, 18], [7, 30], [11, 44], [8, 24], [12, 38], [7, 15], [10, 33], [9, 21],
];

const SUELO = ROWS - 1;
/** 0 = fuera, 1 = macizo, 2 = ventana. */
const EDIFICIO = new Uint8Array(N);
{
  const anchoTotal = TORRES.reduce((s, [a]) => s + a, 0) + (TORRES.length - 1);
  let c0 = Math.floor((COLS - anchoTotal) / 2);
  for (const [ancho, plantas] of TORRES) {
    const alto = Math.min(ROWS - 6, Math.round(plantas * 0.8));
    const techo = SUELO - alto;
    for (let c = c0; c < c0 + ancho; c++) {
      for (let f = techo; f <= SUELO; f++) {
        const dentro = c > c0 && c < c0 + ancho - 1;
        const ventana = dentro && f > techo + 1 && f < SUELO - 1 &&
                        (f - techo) % 2 === 0 && (c - c0) % 3 !== 0;
        EDIFICIO[f * COLS + c] = ventana ? 2 : 1;
      }
    }
    /* Una antena en las dos más altas: es lo que da escala al conjunto. */
    if (plantas >= 38) {
      const cm = c0 + (ancho >> 1);
      for (let f = techo - 4; f < techo; f++) EDIFICIO[f * COLS + cm] = 1;
    }
    c0 += ancho + 1;
  }
}

const LETRA: Uint8Array = new Uint8Array(N);
for (let i = 0; i < N; i++) LETRA[i] = enPalabra(i % COLS, Math.floor(i / COLS)) ? 1 : 0;

/* --------------------------------------------------------------------------
   Figura 3 — una torre sola, con su podio y sus retranqueos.

   Es la manzana entera resuelta en un solo edificio: lo que la herramienta
   modela cuando se abre una promoción. Tres cuerpos —podio, fuste y remate—
   porque es la volumetría que sale de aplicar una edificabilidad a un solar, y
   la misma que dibuja el modelo tridimensional de más abajo en la portada.
   -------------------------------------------------------------------------- */
const TORRE = new Uint8Array(N);
{
  const cuerpos: [number, number, number][] = [
    /* [semiancho, fila superior, fila inferior] */
    [22, ROWS - 9, SUELO],       // podio
    [13, 9, ROWS - 10],          // fuste
    [8, 4, 8],                   // remate
  ];
  const cm = COLS >> 1;
  for (const [semi, f0, f1] of cuerpos) {
    for (let f = f0; f <= f1; f++) {
      for (let c = cm - semi; c <= cm + semi; c++) {
        const borde = c === cm - semi || c === cm + semi || f === f0;
        const ventana = !borde && (f - f0) % 2 === 0 && (c - cm) % 3 !== 0;
        TORRE[f * COLS + c] = ventana ? 2 : 1;
      }
    }
  }
  /* La grúa: dos trazos que dicen «en obra» sin dibujar una grúa entera. */
  for (let f = 2; f < ROWS - 12; f++) TORRE[f * COLS + (cm + 26)] = 1;
  for (let c = cm + 8; c <= cm + 34; c++) TORRE[2 * COLS + c] = 1;
}

/* --------------------------------------------------------------------------
   Figura 4 — la planta.

   El mismo edificio visto desde arriba: contorno, núcleo de comunicaciones en
   el centro y la retícula de pilares. Es el paso que va del volumen a la
   superficie vendible, que es donde vive el margen.
   -------------------------------------------------------------------------- */
const PLANTA = new Uint8Array(N);
{
  const c0 = 24, c1 = COLS - 25, f0 = 8, f1 = ROWS - 9;
  for (let f = f0; f <= f1; f++) {
    for (let c = c0; c <= c1; c++) {
      const contorno = f === f0 || f === f1 || c === c0 || c === c1;
      const nucleo = c > (COLS >> 1) - 6 && c < (COLS >> 1) + 6 &&
                     f > (ROWS >> 1) - 4 && f < (ROWS >> 1) + 4;
      const pilar = (c - c0) % 8 === 0 && (f - f0) % 5 === 0;
      if (contorno || nucleo) PLANTA[f * COLS + c] = 1;
      else if (pilar) PLANTA[f * COLS + c] = 2;
    }
  }
}

/* --------------------------------------------------------------------------
   Figura 5 — la retícula.

   Nodos en malla y los enlaces entre vecinos. Es la figura más abstracta de
   las siete y la que hace de bisagra: entre el edificio y la gráfica hay que
   pasar por algo que no sea ninguno de los dos, o el cambio se lee como que
   una cosa se ha roto y ha salido otra.

   Los enlaces se caen a partir de cierta distancia al centro, así que la malla
   se deshilacha por los bordes en vez de terminar en un rectángulo.
   -------------------------------------------------------------------------- */
const RED = new Uint8Array(N);
{
  const PASO_C = 8, PASO_F = 5;
  const cm = (COLS - 1) / 2, fm = (ROWS - 1) / 2;
  const dentro = (c: number, f: number) =>
    Math.hypot((c - cm) / cm, (f - fm) / fm) < 0.92 - ruido(c * 31 + f) * 0.18;

  for (let f = 3; f < ROWS - 3; f += PASO_F) {
    for (let c = 4; c < COLS - 4; c += PASO_C) {
      if (!dentro(c, f)) continue;
      /* El nodo: una cruz de cinco celdas. Un punto suelto a esta escala
         desaparece entre el polvo del campo. */
      RED[f * COLS + c] = 1;
      RED[f * COLS + c - 1] = 1;
      RED[f * COLS + c + 1] = 1;
      RED[(f - 1) * COLS + c] = 1;
      RED[(f + 1) * COLS + c] = 1;

      /* Enlace al vecino de la derecha y al de abajo, en el tono de acento. */
      if (dentro(c + PASO_C, f))
        for (let x = c + 2; x < c + PASO_C - 1; x++)
          if (!RED[f * COLS + x]) RED[f * COLS + x] = 2;
      if (dentro(c, f + PASO_F))
        for (let y = f + 2; y < f + PASO_F - 1; y++)
          if (!RED[y * COLS + c]) RED[y * COLS + c] = 2;
    }
  }
}

/* --------------------------------------------------------------------------
   Figura 6 — la gráfica de barras.

   Dieciocho barras, una por promoción, con su eje y su listón de referencia.
   Las alturas siguen el reparto de márgenes de la cartera —bajo, medio, alto—
   así que el perfil es el de la pantalla de gráficos y no una serie inventada.
   -------------------------------------------------------------------------- */
const BARRAS = new Uint8Array(N);
{
  const ALTURAS = [39, 39, 38, 33, 33, 32, 32, 31, 27, 26, 26, 24, 23, 23, 22, 21, 17, 13];
  const ancho = 4, hueco = 1;
  const total = ALTURAS.length * (ancho + hueco) - hueco;
  const c0 = Math.floor((COLS - total) / 2);
  const base = ROWS - 5;

  for (let b = 0; b < ALTURAS.length; b++) {
    const alto = Math.round((ALTURAS[b] / 44) * (base - 6));
    const x = c0 + b * (ancho + hueco);
    for (let c = x; c < x + ancho; c++)
      for (let f = base - alto; f < base; f++) BARRAS[f * COLS + c] = 1;
  }
  /* El eje y el listón: sin ellos, dieciocho columnas se leen como una ciudad
     otra vez, que es justo de lo que se venía. */
  for (let c = c0 - 3; c < c0 + total + 3; c++) BARRAS[base * COLS + c] = 1;
  const ref = base - Math.round((26 / 44) * (base - 6));
  for (let c = c0 - 3; c < c0 + total + 3; c += 2) BARRAS[ref * COLS + c] = 2;
}

/* --------------------------------------------------------------------------
   Figura 7 — la curva de caja.

   La ese del flujo acumulado: baja mientras se compra suelo y se construye,
   cruza el cero cuando la preventa cubre lo invertido, y sube hasta el cierre.
   Es la última figura del recorrido porque es la última pregunta que se le
   hace a una promoción: cuándo devuelve el dinero.
   -------------------------------------------------------------------------- */
const CURVA = new Uint8Array(N);
{
  const c0 = 12, c1 = COLS - 13;
  const cero = Math.round(ROWS * 0.52);

  /* Eje de tiempo, a trazos. */
  for (let c = c0; c <= c1; c += 2) CURVA[cero * COLS + c] = 2;

  let anterior = cero;
  for (let c = c0; c <= c1; c++) {
    const u = (c - c0) / (c1 - c0);
    /* Valle al 30 % del recorrido y cruce del cero al 62 %: una ese, no una
       campana. La constante 3.4 es lo que le da la pendiente del tramo de
       ventas. */
    const v = -Math.sin(u * Math.PI) * (1 - u) * 3.4 + (u ** 2.2) * 2.6;
    const f = Math.max(2, Math.min(ROWS - 3, Math.round(cero - v * (ROWS * 0.17))));

    /* El área entre la curva y el cero, en el tono de acento. Sin ella la
       figura eran 121 celdas sueltas —la más rala de las siete con diferencia—
       y el paso desde las barras se leía como que la trama se había apagado.
       Rellena, la caja negativa y la positiva se ven como dos masas, que es
       además lo que dice el dato. */
    const [ay, by] = f < cero ? [f, cero] : [cero, f];
    for (let y = ay; y <= by; y++) if (!CURVA[y * COLS + c]) CURVA[y * COLS + c] = 2;

    /* Se rellena entre un punto y el siguiente para que la línea no se corte
       donde la pendiente es fuerte. */
    const [a, b] = f < anterior ? [f, anterior] : [anterior, f];
    for (let y = a; y <= b; y++) CURVA[y * COLS + c] = 1;
    anterior = f;
  }
  /* Marcas de mes en el eje, cada ocho columnas. */
  for (let c = c0; c <= c1; c += 8) {
    CURVA[(cero + 1) * COLS + c] = 1;
    CURVA[(cero + 2) * COLS + c] = 1;
  }
}

/* Las siete figuras, en el orden en que se recorren. */
const FIGURAS: Record<string, Uint8Array> = {
  palabra: LETRA, manzana: EDIFICIO, torre: TORRE, planta: PLANTA,
  red: RED, barras: BARRAS, curva: CURVA,
};
export type Figura = keyof typeof FIGURAS;

/**
 * Umbral de caída de cada celda.
 *
 * Crece con la fila —arriba se suelta antes— y lleva un tercio de ruido para
 * que el frente no baje como una regla. El rango se queda en [0, 0.86] y no
 * llega a 1: si la última celda cambiara justo al final del recorrido, la
 * figura nunca se vería terminada.
 */
const UMBRAL = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const f = Math.floor(i / COLS);
  UMBRAL[i] = Math.min(0.86, (f / ROWS) * 0.6 + ruido(i + 7777) * 0.34);
}

/**
 * Campo en reposo de una figura.
 *
 * Los macizos van en tinta y las ventanas —o los pilares, según la figura— en
 * el acento. Alrededor queda el polvo: una dispersión muy rala que impide que
 * el resto del lienzo se lea como vacío entre una figura y la siguiente.
 *
 * La palabra lleva además su aura, que es lo que la disfraza de mancha térmica
 * hasta que alguien la mira con calma. Las otras tres no la necesitan: una
 * torre no tiene por qué esconderse.
 */
function campo(fig: Uint8Array, conAura: boolean) {
  return Array.from({ length: N }, (_, i) => {
    const v = fig[i];
    if (v === 1) return LETRA_COLOR;
    if (v === 2) return AURA;

    const c = i % COLS;
    const f = Math.floor(i / COLS);
    const n = ruido(i);

    if (conAura) {
      let cerca = 99;
      for (let df = -5; df <= 5 && cerca > 2; df++) {
        for (let dc = -5; dc <= 5; dc++) {
          const cc = c + dc, ff = f + df;
          if (cc < 0 || cc >= COLS || ff < 0 || ff >= ROWS) continue;
          if (fig[ff * COLS + cc]) cerca = Math.min(cerca, Math.max(Math.abs(dc), Math.abs(df)));
        }
      }
      if (cerca <= 2) return AURA;
      if (cerca <= 4 && n > 0.4) return AURA;
      if (cerca === 5 && n > 0.8) return AURA;
    }

    const dx = (c - (COLS - 1) / 2) / (COLS / 2);
    const dy = (f - (ROWS - 1) / 2) / (ROWS / 2);
    const d = Math.hypot(dx, dy * 0.92);
    if (d > 0.5 && n > 0.9) return CAMPO;
    if (d > 0.45 && n > 0.984) return GRANO;
    return NADA;
  });
}

const CAMPOS: Record<string, string[]> = Object.fromEntries(
  Object.entries(FIGURAS).map(([k, v]) => [k, campo(v, k === "palabra")]));

export function HeatMatrix({
  alto = "h-[60vh]",
  avance,
  figuras = ["palabra"],
}: {
  /** `alto` gobierna la altura: la portada la quiere a pantalla, `/wild` a 60vh. */
  alto?: string;
  /** Avance del desplazamiento, de 0 a 1, repartido entre todas las figuras. */
  avance?: MotionValue<number>;
  /**
   * Las figuras que recorre, en orden. Con una sola, la trama se queda quieta;
   * con varias, el avance se reparte en tramos iguales y en cada frontera las
   * celdas se sueltan y se recomponen en la siguiente.
   */
  figuras?: Figura[];
}) {
  const cajaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const caja = cajaRef.current;
    if (!caja) return;

    const celdas = Array.from(caja.children) as HTMLElement[];
    const calor = new Float32Array(N);
    /* Qué se pintó por última vez en cada celda: 0..2 son los tramos del
       pincel y los negativos codifican tramo y lado de la frontera. Sin esto
       se reescribirían las 4.608 cada fotograma. El valor inicial, 127, no lo
       produce nunca el cálculo, así que la primera vuelta pinta todo. */
    const pintado = new Int16Array(N).fill(127);
    let puntero = -1;
    let vivo = true;
    let rafId = 0;

    const tramoDe = (v: number) => (v > 0.62 ? 2 : v > 0.3 ? 1 : v > 0.07 ? 0 : -1);
    const colorDe = (t: number) => (t === 2 ? LETRA_COLOR : t === 1 ? AURA : CAMPO);

    const mover = (e: PointerEvent) => {
      const r = caja.getBoundingClientRect();
      const c = Math.floor(((e.clientX - r.left) / r.width) * COLS);
      const f = Math.floor(((e.clientY - r.top) / r.height) * ROWS);
      puntero = c >= 0 && c < COLS && f >= 0 && f < ROWS ? f * COLS + c : -1;
    };
    const salir = () => { puntero = -1; };

    /* El recorrido se parte en tantos tramos como fronteras haya. Dentro de
       cada tramo, `u` va de 0 a 1 y es lo que se compara con el umbral de cada
       celda; fuera, la trama se queda en la figura que toque. */
    const tramos = Math.max(1, figuras.length - 1);
    const campos = figuras.map(f => CAMPOS[f] ?? CAMPOS.palabra);
    const mapas = figuras.map(f => FIGURAS[f] ?? FIGURAS.palabra);

    /* Lo último que se recorrió, para poder no hacer nada.
       El bucle repasaba las 4.608 celdas en cada fotograma incluso en reposo:
       comparaba el estado calculado con el pintado y salía por `continue`, pero
       el recorrido y los 4.608 cálculos de `tramoDe` se pagaban igual, y con el
       lienzo de WebGL de la portada compartiendo cuadro eso era justo el tirón
       al desplazar. Ahora, si ni el avance ni el calor han cambiado, el
       fotograma cuesta tres comparaciones. */
    let ultimoU = -1;
    let ultimoTramo = -1;
    let calorVivo = false;

    const fotograma = () => {
      if (!vivo) return;
      const t = avance ? Math.max(0, Math.min(1, avance.get())) : 0;
      const bruto = t * tramos;
      const tramo = Math.min(tramos - 1, Math.floor(bruto));
      const u = bruto - tramo;
      const campoA = campos[tramo];
      const campoB = campos[tramo + 1] ?? campoA;
      const mapaA = mapas[tramo];
      const mapaB = mapas[tramo + 1] ?? mapaA;

      /* Nada que hacer: mismo tramo, mismo avance y sin calor pendiente. El
         umbral de 1/2000 es medio píxel de recorrido en una página de ocho
         pantallas — por debajo de eso ninguna celda puede cruzar su umbral. */
      if (puntero < 0 && !calorVivo && tramo === ultimoTramo && Math.abs(u - ultimoU) < 0.0005) {
        rafId = requestAnimationFrame(fotograma);
        return;
      }
      ultimoU = u;
      ultimoTramo = tramo;

      /* Inyección: pincel de radio 8 con caída cuadrática desde el puntero. */
      if (puntero >= 0) {
        const pc = puntero % COLS;
        const pf = Math.floor(puntero / COLS);
        for (let f = Math.max(0, pf - 8); f <= Math.min(ROWS - 1, pf + 8); f++) {
          for (let c = Math.max(0, pc - 8); c <= Math.min(COLS - 1, pc + 8); c++) {
            const d = Math.hypot(c - pc, (f - pf) * 1.6);
            if (d > 8) continue;
            const i = f * COLS + c;
            const empuje = mapaA[i] || mapaB[i] ? 0.5 : 0.34;
            calor[i] = Math.min(1, calor[i] + (1 - d / 8) ** 2 * empuje);
          }
        }
      }

      calorVivo = false;
      for (let i = 0; i < N; i++) {
        if (calor[i] > 0.001) { calor[i] *= 0.9; calorVivo = true; }
        else if (calor[i] !== 0) calor[i] = 0;

        const calorTramo = tramoDe(calor[i]);
        /* El calor manda sobre la figura: lo que toca el puntero se enciende
           sea cual sea la figura que la trama esté dibujando. */
        const pasada = u > UMBRAL[i];
        /* La clave de pintado lleva el tramo dentro: sin él, dos tramos
           distintos con la misma celda «ya caída» no repintarían al cambiar de
           figura, y la trama se quedaría con la de antes. */
        const estado = calorTramo >= 0
          ? calorTramo
          : -1 - (tramo * 2 + (pasada ? 1 : 0));
        if (estado === pintado[i]) continue;
        pintado[i] = estado;
        celdas[i].style.backgroundColor =
          calorTramo >= 0 ? colorDe(calorTramo)
          : pasada ? campoB[i]
          : campoA[i];
      }

      rafId = requestAnimationFrame(fotograma);
    };

    caja.addEventListener("pointermove", mover);
    caja.addEventListener("pointerleave", salir);
    rafId = requestAnimationFrame(fotograma);

    return () => {
      vivo = false;
      cancelAnimationFrame(rafId);
      caja.removeEventListener("pointermove", mover);
      caja.removeEventListener("pointerleave", salir);
    };
  }, [avance, figuras]);

  return (
    <div
      ref={cajaRef}
      aria-hidden
      className={`grid w-full cursor-crosshair select-none touch-none ${alto}`}
      style={{
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
      }}
    >
      {(CAMPOS[figuras[0]] ?? CAMPOS.palabra).map((c, i) => (
        <div key={i} style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}
