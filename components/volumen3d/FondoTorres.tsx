"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, SoftShadows, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import {
  useScroll, useTransform, useSpring, useMotionValueEvent, motion, AnimatePresence,
  type MotionValue,
} from "framer-motion";
import { EDIFICIOS } from "@/lib/data";

/**
 * La manzana, de arriba abajo de la portada.
 *
 * Es la trama de píxeles de la otra portada hecha con edificios de verdad.
 * Misma estructura y mismo papel: una capa fija detrás de la página que el
 * desplazamiento recorre entera, y siete tramos con nombre en la esquina.
 *
 * Lo que cambia es el material. Allí eran celdas que se apagaban y encendían
 * para dibujar figuras; aquí son forjados con la cota y la huella reales de las
 * promociones de la cartera, que se colocan uno a uno.
 *
 * El recorrido cuenta lo mismo que el otro y en el mismo orden:
 *
 *   1 · el solar        el terreno vacío, con su parcelario
 *   2 · la primera      una promoción se levanta, forjado a forjado
 *   3 · la manzana      las demás aparecen alrededor
 *   4 · la altura       la cámara sube y se ve el perfil completo
 *   5 · la planta       se mira a plomo: las huellas sobre el suelo
 *   6 · el conjunto     vuelta al ojo de calle, con todo en pie
 *   7 · el vecindario   la cámara se retira y aparece el contexto
 *
 * Todo se dibuja con dos `InstancedMesh` —forjados y contexto— porque una
 * manzana pasa de las quinientas piezas, y quinientas mallas con sombra propia
 * son quinientas llamadas de dibujo por cuadro.
 */

const RECORRIDO = [
  { t: "El solar" },
  { t: "La primera" },
  { t: "La manzana" },
  { t: "La altura" },
  { t: "La planta" },
  { t: "El conjunto" },
  { t: "El vecindario" },
];

/* La cartera entera, repartida en una manzana.

   Iba escrita como seis claves a mano —«BAL-11», «PPA-03»…— de la cartera
   inventada que había antes. Esa cartera ya no existe: la de ahora son las
   promociones de verdad, con otras claves, así que las seis búsquedas
   devolvían `undefined`, el elenco quedaba vacío y `Math.max()` sin argumentos
   devolvía `-Infinity`. De ahí salían las posiciones en `NaN` y el aviso de
   three.js sobre el radio de la esfera envolvente. Tomando la cartera tal cual
   no hay claves que mantener al día. */
const ELENCO = EDIFICIOS;

/**
 * Un elemento de la obra.
 *
 * Tres tipos, y no es decoración: son los tres elementos que hacen que a media
 * distancia una torre se lea como arquitectura y no como una pila de cajas.
 *
 *   forjado  el canto de la losa, que asoma un poco de la fachada
 *   vidrio   el antepecho entre forjado y forjado, más estrecho y más oscuro
 *   corona   el remate: la última planta se estira y se estrecha
 *
 * El vidrio es el que hace casi todo el trabajo. Sin él, la separación entre
 * plantas es un hueco de aire y la torre se ve como un peine; con él, la
 * fachada es continua y los forjados son las líneas horizontales que la marcan,
 * que es exactamente cómo se ve un edificio moderno desde la calle.
 */
type Tipo = "forjado" | "vidrio" | "corona" | "montante";

type Losa = {
  x: number; y: number; z: number;
  ancho: number; fondo: number; alto: number;
  tipo: Tipo;
  /** Orden global de colocación, de 0 a 1. */
  turno: number;
};

const CANTO = 0.55;     // el canto de forjado que asoma
const VUELO = 1.6;      // cuánto sobresale el forjado del vidrio, en metros

/**
 * La manzana entera resuelta a forjados.
 *
 * Se colocan sobre una retícula de hasta tres columnas, separadas por la suma
 * de sus radios más una calle. El turno de cada forjado mezcla dos cosas:
 * de qué edificio es —las promociones entran en orden— y a qué altura está,
 * porque dentro de un edificio se construye de abajo arriba.
 */
type Cuerpo = {
  x: number; z: number; y0: number; h: number;
  ancho: number; fondo: number; turno: number;
};

function construirManzana() {
  const losas: Losa[] = [];
  /* Los cuerpos completos, para colgarles después los montantes: recomponerlos
     desde las losas obligaría a agrupar cuatrocientas piezas por posición. */
  const cuerpos: Cuerpo[] = [];
  let altoMax = 0;
  let radioMax = 0;

  const cajas = ELENCO.map(e => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, alto = 0;
    for (const c of e.massing) {
      for (const [x, z] of c.poly) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        z0 = Math.min(z0, z); z1 = Math.max(z1, z);
      }
      alto = Math.max(alto, c.y0 + c.h);
    }
    return { e, ancho: x1 - x0, fondo: z1 - z0, alto };
  });

  /* Sin promociones no hay manzana. Devolver la estructura vacía es lo que
     evita que `Math.max()` de la línea siguiente se quede sin argumentos. */
  if (!cajas.length) return { losas, cuerpos, altoMax: 0, radioMax: 0, paso: 0 };

  const paso = Math.max(...cajas.map(c => Math.max(c.ancho, c.fondo))) * 1.75;
  /* La retícula sale del número de promociones, no de un dos por tres fijo:
     con menos de seis, la mitad de las posiciones quedaban vacías y la manzana
     se descentraba hacia el hueco. */
  const cols = Math.min(3, cajas.length);
  const filas = Math.ceil(cajas.length / cols);

  cajas.forEach((caja, i) => {
    const col = i % cols, fila = Math.floor(i / cols);
    const ox = (col - (cols - 1) / 2) * paso;
    const oz = (fila - (filas - 1) / 2) * paso;

    const total = caja.e.massing.reduce((s, c) => s + Math.max(1, c.floors), 0);
    let puesta = 0;

    for (const cuerpo of caja.e.massing) {
      const xs = cuerpo.poly.map(p => p[0]);
      const zs = cuerpo.poly.map(p => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
      const ancho = Math.max(2, Math.max(...xs) - Math.min(...xs));
      const fondo = Math.max(2, Math.max(...zs) - Math.min(...zs));

      const n = Math.max(1, cuerpo.floors);
      const dy = cuerpo.h / n;
      const ultimoCuerpo = cuerpo === caja.e.massing[caja.e.massing.length - 1];

      for (let k = 0; k < n; k++) {
        /* El turno reparte la obra: cada promoción tiene su sexto del
           recorrido —su parte de él— y dentro sube de abajo arriba. */
        const turno = (i + puesta / total) / cajas.length;
        const yBase = cuerpo.y0 + dy * k;
        const remate = ultimoCuerpo && k === n - 1;

        /* El forjado: sobresale `VUELO` por cada lado. */
        losas.push({
          x: ox + cx, y: yBase + CANTO / 2, z: oz + cz,
          ancho: ancho + VUELO, fondo: fondo + VUELO, alto: CANTO,
          tipo: "forjado", turno,
        });

        /* El antepecho de vidrio entre este forjado y el siguiente. Se mete
           hacia dentro, así que el canto del forjado le hace sombra: es la
           franja horizontal que dibuja las plantas a media distancia. */
        const hueco = Math.max(0.4, dy - CANTO);
        losas.push({
          x: ox + cx, y: yBase + CANTO + hueco / 2, z: oz + cz,
          ancho, fondo, alto: hueco,
          tipo: remate ? "corona" : "vidrio", turno,
        });

        puesta++;
      }

      cuerpos.push({
        x: ox + cx, z: oz + cz, y0: cuerpo.y0, h: cuerpo.h,
        ancho, fondo, turno: (i + 0.5 / total) / cajas.length,
      });
    }

    altoMax = Math.max(altoMax, caja.alto);
    radioMax = Math.max(radioMax, Math.hypot(ox, oz) + Math.max(caja.ancho, caja.fondo) / 2);
  });

  return { losas, cuerpos, altoMax, radioMax, paso };
}

const MANZANA = construirManzana();

/**
 * Los montantes.
 *
 * Las varillas verticales que dividen la fachada, cada siete metros. Es el
 * detalle que más rendimiento da a esta distancia: los forjados ya dan las
 * horizontales, y sin nada que las cruce la torre se lee como una pila de
 * bandejas. Con los montantes, la fachada tiene retícula y el ojo la reconoce
 * como un muro cortina.
 *
 * Van por fuera del vidrio y por dentro del vuelo del forjado, así que quedan
 * en la sombra que el canto proyecta — que es exactamente donde están en un
 * edificio de verdad.
 */
const PASO_MONTANTE = 7;

function construirMontantes() {
  const barras: Losa[] = [];

  MANZANA.cuerpos.forEach(c => {
    const alto = c.h;
    /* Cuántos caben por cara, con al menos uno en cada esquina. */
    const nx = Math.max(2, Math.round(c.ancho / PASO_MONTANTE));
    const nz = Math.max(2, Math.round(c.fondo / PASO_MONTANTE));

    const poner = (x: number, z: number) => barras.push({
      x, z, y: c.y0 + alto / 2,
      ancho: 0.55, fondo: 0.55, alto,
      tipo: "montante", turno: c.turno,
    });

    for (let i = 0; i <= nx; i++) {
      const x = c.x - c.ancho / 2 + (c.ancho / nx) * i;
      poner(x, c.z - c.fondo / 2);
      poner(x, c.z + c.fondo / 2);
    }
    for (let i = 1; i < nz; i++) {
      const z = c.z - c.fondo / 2 + (c.fondo / nz) * i;
      poner(c.x - c.ancho / 2, z);
      poner(c.x + c.ancho / 2, z);
    }
  });

  return barras;
}

const MONTANTES = construirMontantes();

/**
 * La ciudad.
 *
 * Antes esto eran cuarenta y seis cajas repartidas por ángulo y distancia sobre
 * un disco gris. Con eso el suelo era una bandeja y los bloques, piedras
 * encima: nada decía «ciudad», porque faltaba lo único que la hace una — la
 * retícula. Una ciudad no es un conjunto de edificios, es un conjunto de
 * manzanas separadas por calles.
 *
 * Ahora es una retícula de nueve por nueve celdas del mismo paso con el que se
 * reparten las seis promociones, y cada celda es una cosa:
 *
 *   manzana  de una a tres piezas dentro, con su acera, altura decreciente
 *            hacia fuera
 *   parque   césped con árboles
 *   agua     todo lo que cae al otro lado del malecón
 *   obra     las celdas centrales, reservadas a la cartera
 *
 * Y se levanta por anillos: la ciudad se construye de dentro afuera conforme se
 * baja, detrás de las promociones. El último tramo del recorrido —«el
 * vecindario»— es literalmente el barrio terminándose.
 */

type Pieza = {
  x: number; z: number; ancho: number; fondo: number; alto: number;
  /** 0 en el centro, 1 en el borde: gobierna cuándo se levanta. */
  anillo: number;
};

type Arbol = { x: number; z: number; alto: number; copa: number };

const REJILLA = 4;            // celdas a cada lado del centro
const CALLE = 16;             // ancho de calle, en metros
const ACERA = 5;
const FILA_AGUA = 2;          // más allá de esta fila, bahía

function construirCiudad() {
  const paso = MANZANA.paso;
  const bloques: Pieza[] = [];
  const aceras: Pieza[] = [];
  const cesped: Pieza[] = [];
  const arboles: Arbol[] = [];

  const ruido = (i: number) => {
    const v = Math.sin(i * 91.7 + 47.3) * 43758.5453;
    return v - Math.floor(v);
  };

  /* Las celdas que ocupa la cartera, para no construirles encima. */
  const ocupadas = new Set<string>();
  MANZANA.cuerpos.forEach(c => {
    ocupadas.add(`${Math.round(c.x / paso)},${Math.round(c.z / paso)}`);
  });

  let semilla = 0;
  for (let cx = -REJILLA; cx <= REJILLA; cx++) {
    for (let cz = -REJILLA; cz <= REJILLA; cz++) {
      if (ocupadas.has(`${cx},${cz}`)) continue;
      if (cz > FILA_AGUA) continue;

      const ox = cx * paso;
      const oz = cz * paso;
      const anillo = Math.min(1, Math.hypot(cx, cz) / (REJILLA * 1.414));
      const lado = paso - CALLE;
      const r = ruido(semilla++);

      /* Una de cada cinco celdas es parque, y ninguna de las que rodean a la
         cartera: el verde tiene que verse, pero no partir la manzana. */
      if (r > 0.8 && Math.abs(cx) + Math.abs(cz) > 1) {
        cesped.push({ x: ox, z: oz, ancho: lado, fondo: lado, alto: 0.3, anillo });
        const n = 7 + Math.floor(ruido(semilla++) * 6);
        for (let k = 0; k < n; k++) {
          arboles.push({
            x: ox + (ruido(semilla + k * 3) - 0.5) * lado * 0.86,
            z: oz + (ruido(semilla + k * 3 + 1) - 0.5) * lado * 0.86,
            alto: 9 + ruido(semilla + k * 3 + 2) * 9,
            copa: 4.5 + ruido(semilla + k * 7) * 3,
          });
        }
        semilla += n * 3;
        continue;
      }

      aceras.push({ x: ox, z: oz, ancho: lado, fondo: lado, alto: 0.35, anillo });

      const piezas = 1 + Math.floor(ruido(semilla++) * 3);
      const util = lado - ACERA * 2;
      for (let k = 0; k < piezas; k++) {
        const an = util * (0.34 + ruido(semilla++) * 0.42);
        const fo = util * (0.34 + ruido(semilla++) * 0.42);
        /* La altura decae hacia fuera: la cartera tiene que seguir mandando el
           perfil, y una torre de cuarenta plantas en el borde se la comería. */
        const base = 14 + ruido(semilla++) * 62;
        bloques.push({
          x: ox + (ruido(semilla++) - 0.5) * (util - an),
          z: oz + (ruido(semilla++) - 0.5) * (util - fo),
          ancho: an, fondo: fo,
          alto: base * (1.1 - anillo * 0.62),
          anillo,
        });
      }
    }
  }

  return { bloques, aceras, cesped, arboles, paso };
}

const CIUDAD = construirCiudad();

/**
 * Un grupo de la obra: todas las piezas de un mismo material.
 *
 * Van en tres mallas y no en una porque el hormigón del forjado, el vidrio del
 * antepecho y el remate son tres materiales distintos, y una `InstancedMesh`
 * sólo lleva uno. Tres llamadas de dibujo para cuatrocientas piezas sigue
 * siendo el reparto correcto.
 */
function Grupo({
  piezas, avance, children, sombra = true,
}: {
  piezas: Losa[];
  avance: MotionValue<number>;
  children: React.ReactNode;
  sombra?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const malla = ref.current;
    if (!malla) return;
    /* La obra ocupa del 6 % al 62 % del recorrido; el resto es cámara. */
    const t = Math.max(0, Math.min(1, avance.get()));
    const frente = (t - 0.06) / 0.56;

    for (let i = 0; i < piezas.length; i++) {
      const l = piezas[i];
      /* Cada planta tarda un 4 % del recorrido en asentarse. */
      const p = Math.max(0, Math.min(1, (frente - l.turno) / 0.04));
      const s = p * p * (3 - 2 * p);

      dummy.position.set(l.x, l.y - (1 - s) * 26, l.z);
      dummy.rotation.y = (1 - s) * 0.5;
      /* Sólo se encoge en planta: escalar también la altura haría que el
         forjado y su antepecho se separaran mientras entran. */
      const k = 0.3 + s * 0.7;
      dummy.scale.set(l.ancho * k, l.alto, l.fondo * k);
      dummy.updateMatrix();
      malla.setMatrixAt(i, dummy.matrix);
    }
    malla.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, Math.max(1, piezas.length)]}
      castShadow={sombra}
      receiveShadow={sombra}
    >
      <boxGeometry args={[1, 1, 1]} />
      {children}
    </instancedMesh>
  );
}

function Obra({ avance }: { avance: MotionValue<number> }) {
  const { forjados, vidrios, coronas } = useMemo(() => ({
    forjados: MANZANA.losas.filter(l => l.tipo === "forjado"),
    vidrios: MANZANA.losas.filter(l => l.tipo === "vidrio"),
    coronas: MANZANA.losas.filter(l => l.tipo === "corona"),
  }), []);

  return (
    <>
      {/* Hormigón visto: claro, mate y con una pizca de tinte frío para que no
          cante contra el papel de la página. */}
      <Grupo piezas={forjados} avance={avance}>
        <meshStandardMaterial color="#EDF0F5" roughness={0.78} metalness={0.05} />
      </Grupo>

      {/* Vidrio: oscuro, liso y con reflejo. Es lo que separa una torre moderna
          de un bloque de hormigón — y lo que hace que el `Environment` del
          entorno se note, porque es la única superficie que lo devuelve. */}
      <Grupo piezas={vidrios} avance={avance} sombra={false}>
        <meshStandardMaterial
          color="#4C5E78"
          roughness={0.12}
          metalness={0.72}
          envMapIntensity={1.5}
        />
      </Grupo>

      {/* El remate, en el acento: la última planta de cada torre. Es un detalle
          de cuatro píxeles a esta distancia y es el que hace que las seis se
          distingan de un vistazo. */}
      <Grupo piezas={coronas} avance={avance}>
        <meshStandardMaterial color="#1056C8" roughness={0.45} metalness={0.25} />
      </Grupo>

      {/* Los montantes. Aluminio anodizado: claro, algo metálico y bastante
          liso, para que cojan la luz de canto y dibujen la retícula. */}
      <Grupo piezas={MONTANTES} avance={avance} sombra={false}>
        <meshStandardMaterial color="#C6CEDA" roughness={0.34} metalness={0.55} envMapIntensity={1.1} />
      </Grupo>
    </>
  );
}

/**
 * Un montón de cajas planas, instanciadas y sin animación: aceras y césped.
 * No suben — están desde el principio, porque el suelo de una ciudad no se
 * construye, ya estaba.
 */
function Suelos({ piezas, color, y }: { piezas: Pieza[]; color: string; y: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const puesto = useRef(false);

  /* Se colocan una vez y no vuelven a tocarse. Va en `useFrame` y no en
     `useMemo` porque la malla no existe hasta el primer cuadro: un `useMemo`
     aquí corre con la referencia todavía en nulo y no coloca nada. */
  useFrame(() => {
    const malla = ref.current;
    if (!malla || puesto.current) return;
    piezas.forEach((p, i) => {
      dummy.position.set(p.x, y, p.z);
      dummy.scale.set(p.ancho, p.alto, p.fondo);
      dummy.updateMatrix();
      malla.setMatrixAt(i, dummy.matrix);
    });
    malla.instanceMatrix.needsUpdate = true;
    puesto.current = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, piezas.length)]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={1} metalness={0} />
    </instancedMesh>
  );
}

/**
 * La ciudad que se levanta por anillos.
 *
 * Del 40 % al 92 % del recorrido, y de dentro afuera: cuando las promociones ya
 * están montadas, el barrio sigue creciendo a su alrededor. Es lo que hace que
 * la última pantalla no sea la misma imagen quieta que la penúltima.
 */
function Ciudad({ avance }: { avance: MotionValue<number> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { bloques } = CIUDAD;

  useFrame(() => {
    const malla = ref.current;
    if (!malla) return;
    const t = Math.max(0, Math.min(1, avance.get()));
    const frente = (t - 0.40) / 0.52;

    for (let i = 0; i < bloques.length; i++) {
      const b = bloques[i];
      /* Cada anillo tarda un 22 % del recorrido en subir, así que los anillos
         se solapan y el crecimiento se lee continuo. */
      const p = Math.max(0, Math.min(1, (frente - b.anillo * 0.78) / 0.22));
      const s = p * p * (3 - 2 * p);
      const alto = Math.max(0.1, b.alto * s);

      dummy.position.set(b.x, alto / 2, b.z);
      dummy.scale.set(b.ancho, alto, b.fondo);
      dummy.updateMatrix();
      malla.setMatrixAt(i, dummy.matrix);
    }
    malla.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, bloques.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      {/* Un punto de reflejo, no más: el barrio va detrás. Completamente mate
          se veía de cartón y le quitaba realismo a la manzana que sí importa. */}
      <meshStandardMaterial color="#C4CDDB" roughness={0.6} metalness={0.16} envMapIntensity={0.7} />
    </instancedMesh>
  );
}

/**
 * Los árboles.
 *
 * Dos instancias: tronco y copa. Es lo mínimo que se lee como árbol a esta
 * distancia, y lo máximo que se puede permitir un fondo — un modelo con hojas
 * multiplicaría por cien la geometría de algo que ocupa doce píxeles.
 *
 * Crecen con su parque, con un desfase por índice, así que el verde también se
 * planta en vez de aparecer.
 */
function Arboles({ avance }: { avance: MotionValue<number> }) {
  const troncos = useRef<THREE.InstancedMesh>(null);
  const copas = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { arboles } = CIUDAD;

  useFrame(() => {
    const a = troncos.current, b = copas.current;
    if (!a || !b) return;
    const t = Math.max(0, Math.min(1, avance.get()));
    const frente = (t - 0.44) / 0.5;

    arboles.forEach((ar, i) => {
      const p = Math.max(0, Math.min(1, (frente - (i / arboles.length) * 0.7) / 0.18));
      const s = p * p * (3 - 2 * p);

      dummy.position.set(ar.x, (ar.alto * s) / 2, ar.z);
      dummy.scale.set(0.7, Math.max(0.05, ar.alto * s), 0.7);
      dummy.updateMatrix();
      a.setMatrixAt(i, dummy.matrix);

      dummy.position.set(ar.x, ar.alto * s * 0.82, ar.z);
      const c = ar.copa * s;
      dummy.scale.set(Math.max(0.05, c), Math.max(0.05, c * 1.15), Math.max(0.05, c));
      dummy.rotation.set(0, i * 1.3, 0);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      dummy.rotation.set(0, 0, 0);
    });

    a.instanceMatrix.needsUpdate = true;
    b.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={troncos} args={[undefined, undefined, arboles.length]} castShadow>
        <cylinderGeometry args={[0.5, 0.7, 1, 6]} />
        <meshStandardMaterial color="#6E5C48" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={copas} args={[undefined, undefined, arboles.length]} castShadow>
        {/* Icosaedro de un subdivisión: redondo de lejos y barato de cerca. */}
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#6E9463" roughness={0.94} flatShading />
      </instancedMesh>
    </>
  );
}

/**
 * La cámara recorre los siete tramos.
 *
 * Cada tramo tiene su altura, su distancia y su giro, y entre ellos se
 * interpola. El tramo de la planta mira a plomo desde arriba —es la única vista
 * cenital— y el del vecindario se retira hasta que la manzana cabe con holgura.
 */
const CAMARA = [
  { d: 2.6, y: 0.55, giro: 0.0 },   // el solar
  { d: 1.9, y: 0.42, giro: 0.5 },   // la primera
  { d: 2.5, y: 0.50, giro: 1.1 },   // la manzana
  { d: 2.2, y: 0.95, giro: 1.7 },   // la altura
  { d: 1.9, y: 2.60, giro: 2.2 },   // la planta, a plomo
  { d: 2.4, y: 0.34, giro: 2.9 },   // el conjunto, a ojo de calle
  { d: 4.2, y: 1.05, giro: 3.6 },   // el vecindario
];

function Camara({ avance }: { avance: MotionValue<number> }) {
  const escala = Math.max(MANZANA.altoMax, MANZANA.radioMax * 0.9);

  useFrame(({ camera, clock }) => {
    const t = Math.max(0, Math.min(1, avance.get()));
    const bruto = t * (CAMARA.length - 1);
    const i = Math.min(CAMARA.length - 2, Math.floor(bruto));
    const u = bruto - i;
    /* Suavizado en cada tramo: sin él, la cámara cambia de rumbo de golpe en
       cada frontera y el movimiento se lee como un corte de montaje. */
    const s = u * u * (3 - 2 * u);
    const mez = (a: number, b: number) => a + (b - a) * s;

    const a = CAMARA[i], b = CAMARA[i + 1];
    const d = mez(a.d, b.d) * escala;
    const y = mez(a.y, b.y) * escala;
    /* Una deriva lentísima encima, para que en reposo no parezca una foto. */
    const giro = mez(a.giro, b.giro) + clock.elapsedTime * 0.012;

    /* Suelo mínimo para la cámara: en el tramo de ojo de calle, `y` bajaba a
       0,34 de la escala y con la manzana ancha eso la metía por debajo del
       asfalto en la mitad de la vuelta. */
    camera.position.set(Math.sin(giro) * d, Math.max(escala * 0.12, y), Math.cos(giro) * d);
    camera.lookAt(0, escala * 0.22, 0);
  });

  return null;
}

/**
 * El terreno.
 *
 * Tres piezas y ninguna decorativa: el asfalto donde van las calles, la bahía —
 * Ciudad de Panamá es costera y las promociones de la cartera miran al agua— y
 * las plataformas de acera y césped, que son las que dan a cada manzana su
 * borde y evitan que los bloques parezcan clavados en el suelo.
 *
 * Las calles no se dibujan: son el asfalto que queda a la vista entre acera y
 * acera. Pintar rayas encima de un plano que ya está partido en manzanas es
 * dibujar dos veces lo mismo.
 */
function Terreno() {
  const R = MANZANA.paso * (REJILLA + 1.6);

  return (
    <group>
      {/* El asfalto. Oscuro, para que la acera y el césped destaquen sobre él:
          en gris claro, la retícula desaparecía y volvía a ser una bandeja. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[R * 2.4, R * 2.4]} />
        <meshStandardMaterial color="#9AA4B4" roughness={0.94} metalness={0.03} />
      </mesh>

      {/* La bahía. Casi lisa y metálica: es lo único de la escena que devuelve
          el cielo entero, y por eso se lee como agua sin necesidad de moverla. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.9, MANZANA.paso * (FILA_AGUA + 0.5) + R * 0.9]}
      >
        <planeGeometry args={[R * 3, R * 1.8]} />
        <meshStandardMaterial
          color="#3E6E96" roughness={0.06} metalness={0.9} envMapIntensity={1.8} />
      </mesh>

      {/* El malecón: la línea donde la ciudad se acaba. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.25, MANZANA.paso * (FILA_AGUA + 0.5)]}
      >
        <planeGeometry args={[R * 2.4, 5]} />
        <meshStandardMaterial color="#D6DCE6" roughness={1} />
      </mesh>

      <Suelos piezas={CIUDAD.aceras} color="#C6CEDA" y={0.17} />
      <Suelos piezas={CIUDAD.cesped} color="#7E9A72" y={0.15} />
    </group>
  );
}

/* -------------------------------------------------------------------------- */

export function FondoTorres() {
  const { scrollYProgress } = useScroll();
  const [paso, setPaso] = useState(0);

  /* Mismo reparto que la trama de píxeles: el primer tramo cabe en el 12 % de
     arriba —la primera promoción tiene que levantarse en la primera pantalla—
     y los seis restantes se reparten el resto. */
  const tramos = RECORRIDO.length - 1;
  const crudo = useTransform(scrollYProgress, [0, 0.12, 0.88], [0, 1 / tramos, 1], { clamp: true });
  const avance = useSpring(crudo, { stiffness: 80, damping: 26, mass: 0.5 });

  /* Plena intensidad en la primera pantalla, que no lleva texto, y 42 % después:
     el resto de la página son láminas opacas con huecos entre ellas, y ahí es
     donde la obra se ve entera. */
  const opacidad = useTransform(
    scrollYProgress, [0, 0.11, 0.17, 0.9, 1], [1, 1, 0.45, 0.45, 0.24]);

  useMotionValueEvent(avance, "change", v => {
    const p = Math.min(RECORRIDO.length - 1, Math.round(v * tramos));
    if (p !== paso) setPaso(p);
  });

  const escala = Math.max(MANZANA.altoMax, MANZANA.radioMax * 0.9);

  return (
    <>
      <motion.div
        aria-hidden
        style={{ opacity: opacidad, contain: "strict", willChange: "opacity" }}
        className="fixed inset-0 z-0"
      >
        <Canvas
          shadows
          dpr={[1, 1.6]}
          gl={{ antialias: true, alpha: true }}
          camera={{ fov: 34, near: escala * 0.02, far: escala * 24 }}
        >
          <Camara avance={avance} />
          <SoftShadows size={20} samples={9} focus={0.85} />

          <hemisphereLight args={["#DCE7F7", "#C2BCB2", 1.1]} />
          <directionalLight
            position={[escala * 1.1, escala * 2.1, escala * 0.9]}
            intensity={2.3}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-escala * 2}
            shadow-camera-right={escala * 2}
            shadow-camera-top={escala * 2}
            shadow-camera-bottom={-escala}
            shadow-camera-far={escala * 7}
          />
          <directionalLight
            position={[-escala, escala * 0.7, -escala * 0.8]}
            intensity={0.38} color="#C6D6EA"
          />
          {/* El entorno, montado a mano.
              `preset="city"` descarga un HDR de `raw.githack.com`: una demo que
              corre en localhost no debería depender de un CDN para que el
              vidrio refleje algo, y sin red los antepechos salían planos sin
              que nada lo dijera. Cuatro `Lightformer` dan un estudio de
              exteriores —cielo arriba, sol de canto, dos rellenos laterales— y
              no salen del navegador. */}
          <Environment resolution={256} frames={1}>
            {/* Cielo: la banda ancha de arriba, que es la que llena el vidrio
                de gris azulado y le da la horizontal. */}
            <Lightformer form="rect" intensity={1.6} color="#DCE7F7"
              position={[0, escala * 3, 0]} rotation={[Math.PI / 2, 0, 0]}
              scale={[escala * 8, escala * 8, 1]} />
            {/* Sol: pequeño, fuerte y de canto. Es el reflejo puntual que hace
                que una fachada de vidrio parezca vidrio y no pizarra. */}
            <Lightformer form="rect" intensity={5} color="#FFF6E8"
              position={[escala * 2.4, escala * 1.6, escala * 1.4]}
              rotation={[0, -Math.PI / 4, 0]} scale={[escala, escala * 1.6, 1]} />
            {/* Dos rellenos fríos en los flancos, para que las caras en sombra
                no se vayan a negro. */}
            <Lightformer form="rect" intensity={0.9} color="#9FB4CE"
              position={[-escala * 2.6, escala * 0.9, 0]}
              rotation={[0, Math.PI / 2, 0]} scale={[escala * 3, escala * 2, 1]} />
            <Lightformer form="rect" intensity={0.7} color="#B7C6D8"
              position={[0, escala * 0.7, -escala * 2.6]}
              scale={[escala * 3, escala * 2, 1]} />
          </Environment>

          <Obra avance={avance} />
          <Ciudad avance={avance} />
          <Arboles avance={avance} />

          <Terreno />
          <ContactShadows
            position={[0, 0.06, 0]}
            opacity={0.36}
            scale={MANZANA.radioMax * 3}
            blur={2.6}
            far={escala}
            resolution={1024}
          />
        </Canvas>
      </motion.div>

      {/* El rótulo de lo que se está formando, igual que en la otra portada. */}
      <div className="pointer-events-none fixed bottom-6 left-6 z-20 hidden items-baseline gap-3
                      rounded-full bg-hueso/85 px-4 py-2 backdrop-blur-sm md:flex">
        <span className="nota tabular-nums text-tinta-400">
          {String(paso + 1).padStart(2, "0")}/{String(RECORRIDO.length).padStart(2, "0")}
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={paso}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="font-display text-[19px] leading-none text-tinta-950"
          >
            {RECORRIDO[paso].t}
          </motion.span>
        </AnimatePresence>
      </div>
    </>
  );
}

/** El hueco donde sólo se ve la obra. Mismo papel que en la otra portada. */
export function Escena({ alto = "h-[70vh]" }: { alto?: string }) {
  return <div aria-hidden className={alto} />;
}
