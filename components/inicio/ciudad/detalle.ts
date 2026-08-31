import * as THREE from "three";
import type { Panama, Via } from "./datos";

/**
 * Lo que convierte un plano extruido en una ciudad: marcas de carril, farolas,
 * tráfico, arbolado tropical y el paseo de la Cinta Costera.
 *
 * Todo va instanciado. Son decenas de miles de piezas —cada raya de la
 * calzada es una— y la única forma de que quepan en el presupuesto de dibujo
 * es que cada familia sea una sola llamada.
 */

export type Trafico = {
  malla: THREE.InstancedMesh;
  coches: { via: [number, number][]; t: number; vel: number; dir: 1 | -1; carril: number }[];
};

export type Detalle = {
  objetos: THREE.Object3D[];
  trafico: Trafico | null;
  /* Lo que nace con el scroll: cada familia con su momento. */
  animado: { obj: THREE.Object3D; nace: number }[];
};

const rng = (semilla: number) => {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* Ancho de calzada por jerarquía, en metros. */
const ANCHO = [24, 18, 13, 10, 7.5];

/** Área de un polígono cerrado, para descartar los degenerados. */
function area(pts: [number, number][]) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
    a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return Math.abs(a / 2);
}

/** Punto dentro de polígono, por cruces de rayo. */
function dentro(pts: [number, number][], px: number, pz: number) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > pz) !== (zj > pz) &&
        px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

/* ------------------------------------------------------------- vegetación
   Tres especies, que es lo que hace que un parque no sea una alfombra de
   esferas: la palma real de tronco alto y penacho, la cocotera inclinada con
   los cocos, y el árbol de copa ancha de los parques de Panamá. */

function geoPalmaReal() {
  const partes: THREE.BufferGeometry[] = [];
  const tronco = new THREE.CylinderGeometry(0.22, 0.4, 11, 7)
    .translate(0, 5.5, 0);
  partes.push(tronco);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const caida = 0.55 + (i % 3) * 0.2;
    const hoja = new THREE.ConeGeometry(0.62, 5.2, 4)
      .rotateX(Math.PI / 2)
      .translate(0, 0, 2.6);
    hoja.rotateX(caida);
    hoja.rotateY(a);
    hoja.translate(0, 11, 0);
    partes.push(hoja);
  }
  return fusionar(partes)!;
}

function geoCocotera() {
  const partes: THREE.BufferGeometry[] = [];
  /* El tronco inclinado, en tres tramos que se van tumbando. */
  let x = 0, y = 0, inc = 0;
  for (let i = 0; i < 3; i++) {
    inc += 0.13;
    const largo = 3.2;
    const t = new THREE.CylinderGeometry(0.24 - i * 0.04, 0.3 - i * 0.04, largo, 6)
      .translate(0, largo / 2, 0);
    t.rotateZ(inc);
    t.translate(x, y, 0);
    partes.push(t);
    x += Math.sin(inc) * largo;
    y += Math.cos(inc) * largo;
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const hoja = new THREE.ConeGeometry(0.5, 4.4, 4)
      .rotateX(Math.PI / 2)
      .translate(0, 0, 2.2);
    hoja.rotateX(0.7);
    hoja.rotateY(a);
    hoja.translate(x, y, 0);
    partes.push(hoja);
  }
  return fusionar(partes)!;
}

function geoCopaAncha() {
  const partes: THREE.BufferGeometry[] = [];
  partes.push(new THREE.CylinderGeometry(0.3, 0.5, 4.2, 6).translate(0, 2.1, 0));
  /* Tres masas de follaje desiguales: una esfera sola lee como chupete. */
  const masas: [number, number, number, number][] = [
    [0, 5.6, 0, 3.1], [1.6, 4.8, 0.7, 2.2], [-1.4, 5.0, -0.9, 2.0],
  ];
  for (const [mx, my, mz, r] of masas)
    partes.push(new THREE.IcosahedronGeometry(r, 1).translate(mx, my, mz));
  return fusionar(partes)!;
}

/** Fusión de geometrías sin depender de los ejemplos de three. */
function fusionar(gs: THREE.BufferGeometry[]) {
  if (!gs.length) return null;
  const conIndice = gs.map(g => (g.index ? g : g.toNonIndexed()));
  let nVert = 0;
  for (const g of conIndice) nVert += g.attributes.position.count;
  const pos = new Float32Array(nVert * 3);
  const nor = new Float32Array(nVert * 3);
  const idx: number[] = [];
  let vo = 0;
  for (const g of conIndice) {
    pos.set(g.attributes.position.array as ArrayLike<number>, vo * 3);
    nor.set(g.attributes.normal.array as ArrayLike<number>, vo * 3);
    if (g.index) for (let k = 0; k < g.index.count; k++) idx.push(g.index.array[k] + vo);
    else for (let k = 0; k < g.attributes.position.count; k++) idx.push(k + vo);
    vo += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setIndex(idx);
  gs.forEach(g => g.dispose());
  return out;
}

/* --------------------------------------------------------------------- */

export function construirDetalle(d: Panama, suelo: number): Detalle {
  const azar = rng(777333);
  const objetos: THREE.Object3D[] = [];
  const animado: { obj: THREE.Object3D; nace: number }[] = [];

  const M = new THREE.Matrix4();
  const P = new THREE.Vector3();
  const Q = new THREE.Quaternion();
  const S = new THREE.Vector3();
  const EJE_Y = new THREE.Vector3(0, 1, 0);
  const C = new THREE.Color();

  const principales = d.vias.filter(v => v.r <= 2);

  /* ------------------------------------------------- marcas de carril
     Raya discontinua en el eje de las vías con jerarquía. Es el detalle que
     hace que una cinta de asfalto se lea como calzada. */
  {
    const rayas: { x: number; z: number; giro: number; largo: number }[] = [];
    for (const via of principales) {
      for (let i = 0; i < via.p.length - 1; i++) {
        const [x0, z0] = via.p[i], [x1, z1] = via.p[i + 1];
        const dx = x1 - x0, dz = z1 - z0;
        const largo = Math.hypot(dx, dz);
        if (largo < 6) continue;
        const giro = -Math.atan2(dz, dx);
        const paso = 11;
        for (let s = 4; s < largo - 4; s += paso) {
          const t = s / largo;
          rayas.push({
            x: x0 + dx * t, z: z0 + dz * t, giro, largo: 4.5,
          });
        }
      }
    }
    if (rayas.length) {
      const malla = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(1, 0.32).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({
          color: 0xd8d2c0, roughness: 0.8,
          emissive: 0x6a6252, emissiveIntensity: 0.3,
        }),
        rayas.length,
      );
      rayas.forEach((r, i) => {
        M.compose(P.set(r.x, suelo + 0.05, r.z),
          Q.setFromAxisAngle(EJE_Y, r.giro), S.set(r.largo, 1, 1));
        malla.setMatrixAt(i, M);
      });
      malla.computeBoundingSphere();
      objetos.push(malla);
      animado.push({ obj: malla, nace: 0.05 });
    }
  }

  /* ------------------------------------------------------------ farolas
     Báculo curvo con la luminaria encendida, cada cuarenta metros por las
     vías principales y alternando de acera. */
  {
    const puntos: { x: number; z: number; giro: number; lado: number }[] = [];
    for (const via of principales) {
      const w = ANCHO[via.r] ?? 10;
      let lado = 1;
      for (let i = 0; i < via.p.length - 1; i++) {
        const [x0, z0] = via.p[i], [x1, z1] = via.p[i + 1];
        const dx = x1 - x0, dz = z1 - z0;
        const largo = Math.hypot(dx, dz);
        if (largo < 8) continue;
        const nx = -dz / largo, nz = dx / largo;
        for (let s = 0; s < largo; s += 42) {
          const t = s / largo;
          puntos.push({
            x: x0 + dx * t + nx * (w / 2 + 1.6) * lado,
            z: z0 + dz * t + nz * (w / 2 + 1.6) * lado,
            giro: -Math.atan2(dz, dx),
            lado,
          });
          lado = -lado as 1 | -1;
        }
      }
    }
    if (puntos.length) {
      const partes: THREE.BufferGeometry[] = [
        new THREE.CylinderGeometry(0.09, 0.15, 9, 6).translate(0, 4.5, 0),
        new THREE.CylinderGeometry(0.08, 0.08, 2.4, 5)
          .rotateZ(Math.PI / 2).translate(1.2, 8.9, 0),
      ];
      const brazo = fusionar(partes)!;
      const malla = new THREE.InstancedMesh(
        brazo,
        new THREE.MeshStandardMaterial({ color: 0x4a4d54, roughness: 0.6, metalness: 0.4 }),
        puntos.length,
      );
      const cabezas = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1.5, 0.28, 0.7),
        new THREE.MeshStandardMaterial({
          color: 0x2b2e34, emissive: 0xffd9a0, emissiveIntensity: 2.4, roughness: 0.4,
        }),
        puntos.length,
      );
      puntos.forEach((f, i) => {
        Q.setFromAxisAngle(EJE_Y, f.giro + (f.lado > 0 ? Math.PI : 0));
        M.compose(P.set(f.x, suelo, f.z), Q, S.set(1, 1, 1));
        malla.setMatrixAt(i, M);
        /* La luminaria, al extremo del báculo. */
        const ang = f.giro + (f.lado > 0 ? Math.PI : 0);
        M.compose(
          P.set(f.x + Math.cos(ang) * 2.2, suelo + 8.75, f.z - Math.sin(ang) * 2.2),
          Q, S.set(1, 1, 1));
        cabezas.setMatrixAt(i, M);
      });
      malla.computeBoundingSphere();
      cabezas.computeBoundingSphere();
      objetos.push(malla, cabezas);
      animado.push({ obj: malla, nace: 0.12 }, { obj: cabezas, nace: 0.12 });
    }
  }

  /* ------------------------------------------------------------ tráfico
     Coches recorriendo las vías principales, cada uno con su carril y su
     velocidad. Se mueven en bucle sobre la polilínea de su calle. */
  let trafico: Trafico | null = null;
  {
    const largas = principales
      .filter(v => v.p.length > 3)
      .sort((a, b) => b.p.length - a.p.length)
      .slice(0, 90);
    const coches: Trafico["coches"] = [];
    for (const via of largas) {
      const w = ANCHO[via.r] ?? 10;
      const n = Math.min(9, Math.max(2, Math.floor(via.p.length / 3)));
      for (let i = 0; i < n; i++) {
        coches.push({
          via: via.p,
          t: azar(),
          vel: 0.008 + azar() * 0.014,
          dir: azar() < 0.5 ? 1 : -1,
          carril: (azar() < 0.5 ? -1 : 1) * (w * 0.22 + azar() * 1.5),
        });
      }
    }
    if (coches.length) {
      const malla = new THREE.InstancedMesh(
        new THREE.BoxGeometry(4.4, 1.5, 1.9).translate(0, 0.75, 0),
        new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.45 }),
        coches.length,
      );
      const PINTURA = [0xe9e7e1, 0x2f3a4c, 0x9aa0a6, 0x8f2f28, 0x1d1f24, 0xc9c2b4];
      coches.forEach((_, i) =>
        malla.setColorAt(i, C.setHex(PINTURA[Math.floor(azar() * PINTURA.length)])));
      malla.frustumCulled = false;
      objetos.push(malla);
      trafico = { malla, coches };
    }
  }

  /* ------------------------------------------ la Cinta Costera y su paseo
     La franja de parque entre Avenida Balboa y el agua: césped, el paseo
     peatonal claro y palmeras en fila. */
  const cinta = d.vias.filter(v => /cinta costera|avenida balboa/i.test(v.n));
  {
    const franjas: THREE.BufferGeometry[] = [];
    const paseos: THREE.BufferGeometry[] = [];
    for (const via of cinta) {
      for (let i = 0; i < via.p.length - 1; i++) {
        const [x0, z0] = via.p[i], [x1, z1] = via.p[i + 1];
        const dx = x1 - x0, dz = z1 - z0;
        const largo = Math.hypot(dx, dz);
        if (largo < 4) continue;
        const giro = -Math.atan2(dz, dx);
        const nx = -dz / largo, nz = dx / largo;
        const cesped = new THREE.PlaneGeometry(largo, 46).rotateX(Math.PI / 2);
        cesped.rotateY(giro);
        cesped.translate((x0 + x1) / 2 + nx * 34, suelo + 0.02, (z0 + z1) / 2 + nz * 34);
        franjas.push(cesped);
        const paseo = new THREE.PlaneGeometry(largo, 7).rotateX(Math.PI / 2);
        paseo.rotateY(giro);
        paseo.translate((x0 + x1) / 2 + nx * 48, suelo + 0.06, (z0 + z1) / 2 + nz * 48);
        paseos.push(paseo);
      }
    }
    const gCesped = fusionar(franjas);
    if (gCesped) {
      const m = new THREE.Mesh(gCesped, new THREE.MeshStandardMaterial({
        color: 0x4f7340, roughness: 1, side: THREE.DoubleSide,
      }));
      m.receiveShadow = true;
      objetos.push(m);
      animado.push({ obj: m, nace: 0.16 });
    }
    const gPaseo = fusionar(paseos);
    if (gPaseo) {
      const m = new THREE.Mesh(gPaseo, new THREE.MeshStandardMaterial({
        color: 0xbdb2a0, roughness: 0.9, side: THREE.DoubleSide,
      }));
      m.receiveShadow = true;
      objetos.push(m);
      animado.push({ obj: m, nace: 0.18 });
    }
  }

  /* ----------------------------------------------------------- arbolado
     Palmeras en la Cinta y en el frente marítimo, copa ancha en los
     parques y algún árbol suelto en las manzanas. */
  {
    const ESPECIES = [
      { geo: geoPalmaReal(), color: 0x4e7a3e, escala: [0.8, 1.25] },
      { geo: geoCocotera(), color: 0x58814a, escala: [0.85, 1.3] },
      { geo: geoCopaAncha(), color: 0x3f6b33, escala: [0.9, 1.5] },
    ];
    const puestos: { esp: number; x: number; z: number; s: number; giro: number }[] = [];

    /* En fila por el paseo de la Cinta: palma real y cocotera alternas. */
    for (const via of cinta) {
      for (let i = 0; i < via.p.length - 1; i++) {
        const [x0, z0] = via.p[i], [x1, z1] = via.p[i + 1];
        const dx = x1 - x0, dz = z1 - z0;
        const largo = Math.hypot(dx, dz);
        if (largo < 6) continue;
        const nx = -dz / largo, nz = dx / largo;
        for (let s = 0; s < largo; s += 17) {
          const t = s / largo;
          const fuera = 40 + azar() * 16;
          puestos.push({
            esp: azar() < 0.6 ? 0 : 1,
            x: x0 + dx * t + nx * fuera,
            z: z0 + dz * t + nz * fuera,
            s: 0.85 + azar() * 0.4,
            giro: azar() * Math.PI * 2,
          });
        }
      }
    }

    /* Y repartidos por los parques, según su tamaño. */
    for (const p of d.parques) {
      if (p.length < 4) continue;
      const a = area(p);
      if (a < 400) continue;
      const xs = p.map(q => q[0]), zs = p.map(q => q[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs);
      const z0 = Math.min(...zs), z1 = Math.max(...zs);
      const cuantos = Math.min(40, Math.round(a / 320));
      for (let i = 0, intento = 0; i < cuantos && intento < cuantos * 8; intento++) {
        const px = x0 + azar() * (x1 - x0);
        const pz = z0 + azar() * (z1 - z0);
        if (!dentro(p, px, pz)) continue;
        puestos.push({
          esp: azar() < 0.68 ? 2 : azar() < 0.6 ? 0 : 1,
          x: px, z: pz,
          s: 0.8 + azar() * 0.6,
          giro: azar() * Math.PI * 2,
        });
        i++;
      }
    }

    const porEspecie: number[][] = [[], [], []];
    puestos.forEach((p, i) => porEspecie[p.esp].push(i));
    ESPECIES.forEach((esp, e) => {
      const idx = porEspecie[e];
      if (!idx.length) { esp.geo.dispose(); return; }
      const malla = new THREE.InstancedMesh(
        esp.geo,
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 }),
        idx.length,
      );
      idx.forEach((k, i) => {
        const p = puestos[k];
        M.compose(P.set(p.x, suelo, p.z),
          Q.setFromAxisAngle(EJE_Y, p.giro),
          S.set(p.s, p.s * (0.9 + azar() * 0.3), p.s));
        malla.setMatrixAt(i, M);
        /* Tinte por ejemplar: el verde de un parque nunca es uno solo. */
        C.setHex(esp.color).offsetHSL(
          (azar() - 0.5) * 0.05, (azar() - 0.5) * 0.14, (azar() - 0.5) * 0.16);
        malla.setColorAt(i, C);
      });
      malla.castShadow = true;
      malla.computeBoundingSphere();
      objetos.push(malla);
      animado.push({ obj: malla, nace: 0.1 + e * 0.03 });
    });
  }

  return { objetos, trafico, animado };
}

/* ------------------------------------------------------- el tráfico vivo */

const M_T = new THREE.Matrix4();
const P_T = new THREE.Vector3();
const Q_T = new THREE.Quaternion();
const S_T = new THREE.Vector3(1, 1, 1);
const EJE = new THREE.Vector3(0, 1, 0);

/** Avanza los coches sobre su calle. */
export function moverTrafico(t: Trafico, tiempo: number, suelo: number) {
  t.coches.forEach((c, i) => {
    const via = c.via;
    let u = (c.t + tiempo * c.vel) % 1;
    if (c.dir === -1) u = 1 - u;
    /* Posición sobre la polilínea, tramo a tramo. */
    const bruto = u * (via.length - 1);
    const k = Math.min(via.length - 2, Math.floor(bruto));
    const f = bruto - k;
    const [x0, z0] = via[k], [x1, z1] = via[k + 1];
    const dx = x1 - x0, dz = z1 - z0;
    const largo = Math.hypot(dx, dz) || 1;
    const nx = -dz / largo, nz = dx / largo;
    M_T.compose(
      P_T.set(x0 + dx * f + nx * c.carril, suelo + 0.1, z0 + dz * f + nz * c.carril),
      Q_T.setFromAxisAngle(EJE, -Math.atan2(dz * c.dir, dx * c.dir)),
      S_T);
    t.malla.setMatrixAt(i, M_T);
  });
  t.malla.instanceMatrix.needsUpdate = true;
}
