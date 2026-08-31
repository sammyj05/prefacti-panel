import * as THREE from "three";
import { ALTO_PLANTA } from "./atlas";
import type { Edificio } from "./datos";

/**
 * Los volúmenes de los edificios, extruidos de su huella real.
 *
 * Hasta aquí cada edificio era la caja que envolvía su parcela, y por eso la
 * ciudad se leía como un montón de bloques: en Panamá las plantas son en L,
 * en cuña, curvas o con el chaflán de la esquina, y esa silueta es la mitad de
 * lo que hace que un edificio parezca un edificio. Aquí se extruye el
 * polígono que OSM tiene dibujado, lado a lado.
 *
 * Y no todo sube recto: por encima de veinticinco plantas la torre retranquea
 * —el cuerpo alto encoge sobre una base más ancha—, que es la forma real de
 * las torres de la bahía y lo que rompe el prisma puro.
 *
 * Todo se fusiona por tesela en una sola malla. La construcción con el scroll
 * ya no reescribe matrices —diez mil por fotograma— sino que viaja en un
 * atributo por vértice y la resuelve el sombreado: cada vértice sabe cuándo
 * nace su edificio y desde qué cota tiene que crecer.
 */

export type Volumen = {
  geometria: THREE.BufferGeometry;
  /* Cuántos edificios entraron, para poder informar. */
  cuenta: number;
};

/** Área con signo: decide el sentido de giro del anillo. */
function areaConSigno(ring: number[]) {
  let a = 0;
  for (let i = 0, n = ring.length / 2; i < n; i++) {
    const j = (i + 1) % n;
    a += ring[i * 2] * ring[j * 2 + 1] - ring[j * 2] * ring[i * 2 + 1];
  }
  return a / 2;
}

/** Encoge un anillo hacia su centro, para el retranqueo del cuerpo alto. */
function encoger(ring: number[], k: number) {
  const n = ring.length / 2;
  let cx = 0, cz = 0;
  for (let i = 0; i < n; i++) { cx += ring[i * 2]; cz += ring[i * 2 + 1]; }
  cx /= n; cz /= n;
  const out = new Array<number>(ring.length);
  for (let i = 0; i < n; i++) {
    out[i * 2] = cx + (ring[i * 2] - cx) * k;
    out[i * 2 + 1] = cz + (ring[i * 2 + 1] - cz) * k;
  }
  return out;
}

type Acumulador = {
  pos: number[]; nor: number[]; uv: number[];
  casilla: number[]; trama: number[]; tinte: number[];
  nace: number[]; base: number[]; arriba: number[];
  idx: number[];
};

const nuevoAcumulador = (): Acumulador => ({
  pos: [], nor: [], uv: [], casilla: [], trama: [], tinte: [],
  nace: [], base: [], arriba: [], idx: [],
});

/** Datos que acompañan a cada edificio y se repiten en todos sus vértices. */
type Marca = {
  casillaFachada: number;
  casillaAzotea: number;
  tinte: [number, number, number];
  nace: number;
  base: number;
};

/** Añade un vértice con toda su carga. */
function vertice(
  a: Acumulador, x: number, y: number, z: number,
  nx: number, ny: number, nz: number, u: number, v: number, m: Marca,
  arriba: 0 | 1,
) {
  a.pos.push(x, y, z);
  a.nor.push(nx, ny, nz);
  a.uv.push(u, v);
  a.casilla.push(m.casillaFachada, m.casillaAzotea);
  /* La trama va ya resuelta en la coordenada: el sombreado repite una vez. */
  a.trama.push(1, 1);
  a.tinte.push(m.tinte[0], m.tinte[1], m.tinte[2]);
  a.nace.push(m.nace);
  a.base.push(m.base);
  a.arriba.push(arriba);
}

/**
 * Extruye un anillo entre dos cotas: los paños laterales, con la coordenada
 * de textura repartida por el perímetro y por la altura, de modo que la
 * ventana mida lo mismo en toda la ciudad.
 */
function paredes(
  a: Acumulador, ring: number[], cx: number, cz: number,
  y0: number, y1: number, m: Marca,
) {
  const n = ring.length / 2;
  /* Doce metros de fachada y cuatro plantas por repetición del dibujo. */
  const ANCHO_TRAMO = 12, ALTO_TRAMO = ALTO_PLANTA * 4;
  let recorrido = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = ring[i * 2], az = ring[i * 2 + 1];
    const bx = ring[j * 2], bz = ring[j * 2 + 1];
    const dx = bx - ax, dz = bz - az;
    const largo = Math.hypot(dx, dz);
    if (largo < 0.4) continue;
    /* La normal del paño, hacia afuera. */
    const nx = dz / largo, nz = -dx / largo;
    const u0 = recorrido / ANCHO_TRAMO;
    const u1 = (recorrido + largo) / ANCHO_TRAMO;
    recorrido += largo;
    const v0 = y0 / ALTO_TRAMO, v1 = y1 / ALTO_TRAMO;
    const base = a.pos.length / 3;
    vertice(a, cx + ax, y0, cz + az, nx, 0, nz, u0, v0, m, 0);
    vertice(a, cx + bx, y0, cz + bz, nx, 0, nz, u1, v0, m, 0);
    vertice(a, cx + bx, y1, cz + bz, nx, 0, nz, u1, v1, m, 0);
    vertice(a, cx + ax, y1, cz + az, nx, 0, nz, u0, v1, m, 0);
    a.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

/** La azotea: el anillo triangulado a su cota. */
function azotea(
  a: Acumulador, ring: number[], cx: number, cz: number, y: number, m: Marca,
) {
  const n = ring.length / 2;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) pts.push(new THREE.Vector2(ring[i * 2], ring[i * 2 + 1]));
  let caras: number[][];
  try {
    caras = THREE.ShapeUtils.triangulateShape(pts, []);
  } catch {
    return;
  }
  const base = a.pos.length / 3;
  /* Veinte metros por repetición: los equipos de la azotea a tamaño creíble. */
  for (const p of pts)
    vertice(a, cx + p.x, y, cz + p.y, 0, 1, 0, p.x / 20, p.y / 20, m, 1);
  for (const [i0, i1, i2] of caras) a.idx.push(base + i0, base + i2, base + i1);
}

/** Cierra el acumulador en una geometría lista para dibujar. */
function cerrar(a: Acumulador): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(a.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(a.nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(a.uv, 2));
  g.setAttribute("aCasilla", new THREE.Float32BufferAttribute(a.casilla, 2));
  g.setAttribute("aTrama", new THREE.Float32BufferAttribute(a.trama, 2));
  g.setAttribute("aTinte", new THREE.Float32BufferAttribute(a.tinte, 3));
  g.setAttribute("aNace", new THREE.Float32BufferAttribute(a.nace, 1));
  g.setAttribute("aBase", new THREE.Float32BufferAttribute(a.base, 1));
  g.setAttribute("aArriba", new THREE.Float32BufferAttribute(a.arriba, 1));
  g.setIndex(a.idx);
  g.computeBoundingSphere();
  return g;
}

/**
 * Construye el volumen de una tanda de edificios.
 * `marcar` decide, para cada uno, su casilla de atlas, su tinte y su momento.
 */
export function construirVolumen(
  lista: Edificio[], suelo: number,
  marcar: (e: Edificio) => Marca,
): Volumen {
  const a = nuevoAcumulador();
  let cuenta = 0;

  for (const e of lista) {
    const [x, z, w, d, giroG, plantas] = e;
    const huella = e[7] as number[] | null | undefined;
    const alto = Math.max(3.4, plantas * ALTO_PLANTA);
    const m = marcar(e);

    /* Sin huella utilizable se cae a la caja envolvente, que es lo que había
       antes: mejor un prisma que un hueco. */
    let ring: number[];
    if (huella && huella.length >= 6) {
      ring = huella.slice();
    } else {
      const c = Math.cos((giroG * Math.PI) / 180), sn = Math.sin((giroG * Math.PI) / 180);
      const hw = w / 2, hd = d / 2;
      ring = [];
      for (const [ux, uz] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]] as const)
        ring.push(ux * c - uz * sn, ux * sn + uz * c);
    }
    /* El sentido de giro decide hacia dónde miran las normales de los paños;
       se normaliza a antihorario para que todas apunten afuera. */
    if (areaConSigno(ring) < 0) {
      const inv: number[] = [];
      for (let i = ring.length / 2 - 1; i >= 0; i--) inv.push(ring[i * 2], ring[i * 2 + 1]);
      ring = inv;
    }

    /* Por encima de veinticinco plantas la torre retranquea: base ancha hasta
       un tercio de la altura y cuerpo encogido encima. Es la silueta real de
       la torre de la bahía, y lo que impide que todo sea un prisma. */
    const retranquea = plantas >= 25;
    if (retranquea) {
      const corte = suelo + alto * 0.3;
      paredes(a, ring, x, z, suelo, corte, m);
      const alto2 = encoger(ring, 0.78);
      /* La franja de azotea del podio, alrededor del cuerpo alto. */
      azotea(a, ring, x, z, corte, m);
      paredes(a, alto2, x, z, corte, suelo + alto, m);
      azotea(a, alto2, x, z, suelo + alto, m);
      /* Y el remate: un ático más estrecho en las de cuarenta para arriba. */
      if (plantas >= 40) {
        const remate = encoger(alto2, 0.62);
        paredes(a, remate, x, z, suelo + alto, suelo + alto + ALTO_PLANTA * 2, m);
        azotea(a, remate, x, z, suelo + alto + ALTO_PLANTA * 2, m);
      }
    } else {
      paredes(a, ring, x, z, suelo, suelo + alto, m);
      azotea(a, ring, x, z, suelo + alto, m);
    }
    cuenta++;
  }

  return { geometria: cerrar(a), cuenta };
}

export type { Marca };
