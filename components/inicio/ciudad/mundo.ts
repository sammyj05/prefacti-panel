import * as THREE from "three";
import {
  ALTO_PLANTA, CASILLA, construirAtlas, materialAtlas, materialSombraAtlas,
} from "./atlas";
import { construirVolumen, type Marca } from "./volumen";
import { construirDetalle, moverTrafico, type Trafico } from "./detalle";
import { HITOS_PROPIOS, type Hito, type Panama } from "./datos";

/**
 * La ciudad de Panamá levantada sobre el dato real de OpenStreetMap.
 *
 * Todo está en metros: una planta mide 3,2 y el JW Marriott sube sus setenta
 * de verdad. La bahía cruza siete kilómetros de lado a lado, así que la niebla,
 * las sombras y el plano lejano de la cámara están calibrados a esa escala y
 * no a la maqueta que había antes.
 *
 * Las diez mil huellas de OSM no son diez mil mallas: van en tres mallas
 * instanciadas —vidrio, hormigón y el Casco— que comparten un único atlas de
 * fachadas. Solo las seis torres que se reconocen por su silueta llevan
 * geometría propia.
 */

/* Caja unidad con la base en y=0, que es como se escala un edificio. */
const CAJA = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

export type Animables = {
  /* Los edificios crecen en el sombreado: basta con mover un uniforme. */
  materiales: THREE.Material[];
  instancias: {
    malla: THREE.InstancedMesh;
    piezas: { m: THREE.Matrix4; nace: number }[];
  }[];
  mallas: { obj: THREE.Object3D; nace: number; fin: THREE.Vector3 }[];
};

export type Mundo = {
  grupo: THREE.Group;
  animables: Animables;
  trafico: Trafico | null;
  /* La cota del suelo urbano, para lo que se apoya sobre él. */
  suelo: number;
  /* Lo que la cámara necesita saber para encuadrar sin entrar en un edificio. */
  alturaEn: (x: number, z: number) => number;
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

/* ---------------------------------------------------------------- zonas
   Cada barrio manda sobre el material y sobre cuándo nace con el scroll. */
const CARACTER: Record<string, {
  clase: "vidrio" | "hormigon" | "casco";
  nace: [number, number];
}> = {
  pacifica: { clase: "vidrio",   nace: [0.50, 0.78] },
  paitilla: { clase: "vidrio",   nace: [0.42, 0.70] },
  balboa:   { clase: "vidrio",   nace: [0.34, 0.66] },
  obarrio:  { clase: "hormigon", nace: [0.30, 0.60] },
  marbella: { clase: "hormigon", nace: [0.24, 0.56] },
  casco:    { clase: "casco",    nace: [0.06, 0.22] },
  resto:    { clase: "hormigon", nace: [0.10, 0.50] },
};

export function construirMundo(d: Panama): Mundo {
  const grupo = new THREE.Group();
  const azar = rng(90210);
  const animables: Animables = { materiales: [], instancias: [], mallas: [] };

  const alNacer = (obj: THREE.Object3D, nace: number, fin: THREE.Vector3) => {
    animables.mallas.push({ obj, nace, fin });
  };

  const atlas = construirAtlas();

  /* ------------------------------------------------------------- el mar
     Un plano de siete kilómetros con oleaje en las normales. El color va por
     profundidad: turquesa en la orilla, azul hondo mar adentro. */
  const cOla = document.createElement("canvas");
  cOla.width = cOla.height = 256;
  {
    const g = cOla.getContext("2d")!;
    const az = rng(31415);
    g.fillStyle = "rgb(128,128,255)";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1100; i++) {
      const r = 4 + az() * 12;
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, `rgba(${128 + (az() * 44 - 22) | 0},${128 + (az() * 44 - 22) | 0},255,0.34)`);
      gr.addColorStop(1, "rgba(128,128,255,0)");
      g.save();
      g.translate(az() * 256, az() * 256);
      g.fillStyle = gr;
      g.fillRect(-r, -r, r * 2, r * 2);
      g.restore();
    }
  }
  const olas = new THREE.CanvasTexture(cOla);
  olas.wrapS = olas.wrapT = THREE.RepeatWrapping;
  olas.repeat.set(160, 160);
  const matMar = new THREE.MeshStandardMaterial({
    color: 0x1f5b84, roughness: 0.16, metalness: 0.85,
    normalMap: olas, normalScale: new THREE.Vector2(0.45, 0.45),
  });
  matMar.envMapIntensity = 1.4;
  const mar = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), matMar);
  mar.rotation.x = -Math.PI / 2;
  mar.position.y = 0.9;
  grupo.add(mar);

  /* --------------------------------------------------------- el terreno
     Se dibuja el agua en todas partes y la tierra encima, recortada de la
     costa real. Al revés —agua como polígono sobre tierra— no funciona: para
     tapar la bahía entera el polígono tiene que extenderse kilómetros mar
     adentro, y al hacerlo sobre una costa con penínsulas de quinientos metros
     el contorno se cruza consigo mismo y la triangulación acaba cubriendo la
     ciudad. La tierra, en cambio, se cierra por el interior, lejos de los
     entrantes, y sale limpia. */
  const enBahia = ([x, z]: [number, number]) =>
    x > -1600 && x < 3800 && z > -3200 && z < 2700;
  const esCerrado = (c: [number, number][]) => Math.hypot(
    c[0][0] - c[c.length - 1][0], c[0][1] - c[c.length - 1][1]) < 60;

  /* Los tramos abiertos son la línea de costa continental. */
  const frente = d.costas.filter(c =>
    c.length >= 15 && !esCerrado(c) && c.filter(enBahia).length > c.length * 0.5);

  /* Y los cerrados son tierra suelta, no huecos: Punta Pacífica es terreno
     ganado al mar y OSM la traza como anillos de costa cerrados, igual que los
     islotes de la bahía. Descartándolos —que es lo que se hacía— el barrio
     entero del JW Marriott amanecía bajo el agua. */
  const islas = d.costas.filter(c => c.length >= 6 && esCerrado(c));

  let cadena: [number, number][] = [];
  if (frente.length) {
    /* La bahía se recorre de poniente a levante, del Casco a Punta Pacífica.
       Los tramos vienen partidos y desordenados, con huecos de hasta un
       kilómetro donde OSM corta por una península. */
    let arranque = 0;
    frente.forEach((c, i) => {
      if (c[0][0] < frente[arranque][0][0]) arranque = i;
    });
    const usados = new Set([arranque]);
    cadena = [...frente[arranque]];
    for (let paso = 1; paso < frente.length; paso++) {
      const fin = cadena[cadena.length - 1];
      let mejor = -1, mejorD = 3000, alReves = false;
      frente.forEach((c, i) => {
        if (usados.has(i)) return;
        const dIni = Math.hypot(c[0][0] - fin[0], c[0][1] - fin[1]);
        const dFin = Math.hypot(
          c[c.length - 1][0] - fin[0], c[c.length - 1][1] - fin[1]);
        if (dIni < mejorD) { mejorD = dIni; mejor = i; alReves = false; }
        if (dFin < mejorD) { mejorD = dFin; mejor = i; alReves = true; }
      });
      if (mejor < 0) break;
      usados.add(mejor);
      cadena = cadena.concat(
        alReves ? [...frente[mejor]].reverse() : frente[mejor]);
    }
  }

  /* Doble cara: el giro de estos polígonos lo decide el orden en que OSM
     trazó la costa, y con giro horario las caras acaban mirando al suelo
     tras tumbar el plano. La ciudad entera aparecía entonces sobre el mar,
     porque lo único que quedaba visible entre los edificios era el agua. */
  const matTierra = new THREE.MeshStandardMaterial({
    color: 0x74766b, roughness: 0.97, side: THREE.DoubleSide,
  });

  if (cadena.length > 20) {
    /* Se prolongan los dos extremos hasta bien fuera del recorte siguiendo su
       propia dirección: así el cierre por el interior es un rectángulo que no
       toca ningún entrante de la costa. */
    const prolongar = (a: [number, number], b: [number, number]) => {
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const l = Math.hypot(dx, dz) || 1;
      return [b[0] + (dx / l) * 9000, b[1] + (dz / l) * 9000] as [number, number];
    };
    const cabo = prolongar(cadena[1], cadena[0]);
    const rabo = prolongar(cadena[cadena.length - 2], cadena[cadena.length - 1]);

    const forma = new THREE.Shape();
    forma.moveTo(cabo[0], cabo[1]);
    for (const [x, z] of cadena) forma.lineTo(x, z);
    forma.lineTo(rabo[0], rabo[1]);
    /* Y de vuelta por tierra adentro: al norte, al oeste y al sur. */
    forma.lineTo(rabo[0], -10000);
    forma.lineTo(-10000, -10000);
    forma.lineTo(-10000, cabo[1]);
    forma.closePath();
    /* Tumbar con giro negativo invierte la Z: un punto (x, z) de la forma
       acaba en (x, 0, −z) y el polígono sale reflejado —la tierra donde va el
       mar—. Con giro positivo la coordenada se conserva; la cara queda mirando
       abajo, y por eso el material va a doble cara. */
    const geoTierra = new THREE.ShapeGeometry(forma);
    geoTierra.rotateX(Math.PI / 2);
    const tierra = new THREE.Mesh(geoTierra, matTierra);
    tierra.position.y = 1.05;
    tierra.receiveShadow = true;
    grupo.add(tierra);
  } else {
    /* Sin costa utilizable, una losa de tierra y a seguir. */
    const tierra = new THREE.Mesh(new THREE.PlaneGeometry(11000, 11000), matTierra);
    tierra.rotation.x = -Math.PI / 2;
    tierra.position.y = 1.05;
    tierra.receiveShadow = true;
    grupo.add(tierra);
  }

  for (const isla of islas) {
    const forma = new THREE.Shape();
    forma.moveTo(isla[0][0], isla[0][1]);
    for (const [x, z] of isla.slice(1)) forma.lineTo(x, z);
    forma.closePath();
    try {
      const geo = new THREE.ShapeGeometry(forma);
      geo.rotateX(Math.PI / 2);
      const m = new THREE.Mesh(geo, matTierra);
      m.position.y = 1.06;
      m.receiveShadow = true;
      grupo.add(m);
    } catch { /* anillo degenerado: se descarta */ }
  }

  /* ------------------------------------------------------------- viales
     Cada jerarquía con su ancho real: autopista veinticuatro metros,
     calle de barrio ocho. Van en una sola malla fusionada por rango. */
  const ANCHO = [24, 18, 13, 10, 7.5];
  const matVia = new THREE.MeshStandardMaterial({ color: 0x33343a, roughness: 0.93 });
  const matAcera = new THREE.MeshStandardMaterial({ color: 0x8a8880, roughness: 0.95 });
  const cintas: THREE.BufferGeometry[] = [];
  const aceras: THREE.BufferGeometry[] = [];
  for (const via of d.vias) {
    const w = ANCHO[via.r] ?? 7.5;
    for (let i = 0; i < via.p.length - 1; i++) {
      const [x0, z0] = via.p[i], [x1, z1] = via.p[i + 1];
      const dx = x1 - x0, dz = z1 - z0;
      const largo = Math.hypot(dx, dz);
      if (largo < 1) continue;
      const g = new THREE.PlaneGeometry(largo, w);
      g.rotateX(-Math.PI / 2);
      g.rotateY(-Math.atan2(dz, dx));
      g.translate((x0 + x1) / 2, 1.30, (z0 + z1) / 2);
      cintas.push(g);
      /* Acera solo en las vías con jerarquía: en las de barrio multiplica
         la geometría sin que se note desde el aire. */
      if (via.r <= 2) {
        const ga = new THREE.PlaneGeometry(largo, w + 5);
        ga.rotateX(-Math.PI / 2);
        ga.rotateY(-Math.atan2(dz, dx));
        ga.translate((x0 + x1) / 2, 1.22, (z0 + z1) / 2);
        aceras.push(ga);
      }
    }
  }
  const fusionar = (gs: THREE.BufferGeometry[]) => {
    if (!gs.length) return null;
    /* Fusión a mano: `mergeGeometries` vive en los ejemplos de three y no
       merece la importación para tres atributos. */
    let nVert = 0, nIdx = 0;
    for (const g of gs) {
      nVert += g.attributes.position.count;
      nIdx += g.index ? g.index.count : 0;
    }
    const pos = new Float32Array(nVert * 3);
    const nor = new Float32Array(nVert * 3);
    const idx = new Uint32Array(nIdx);
    let vo = 0, io = 0;
    for (const g of gs) {
      const p = g.attributes.position.array as ArrayLike<number>;
      const n = g.attributes.normal.array as ArrayLike<number>;
      pos.set(p, vo * 3);
      nor.set(n, vo * 3);
      const gi = g.index!.array;
      for (let k = 0; k < gi.length; k++) idx[io + k] = gi[k] + vo;
      vo += g.attributes.position.count;
      io += gi.length;
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    return out;
  };
  const geoAceras = fusionar(aceras);
  if (geoAceras) {
    const m = new THREE.Mesh(geoAceras, matAcera);
    m.receiveShadow = true;
    grupo.add(m);
  }
  const geoVias = fusionar(cintas);
  if (geoVias) {
    const m = new THREE.Mesh(geoVias, matVia);
    m.receiveShadow = true;
    grupo.add(m);
  }

  /* ------------------------------------------------------------ parques */
  const matVerde = new THREE.MeshStandardMaterial({
    color: 0x4c6b3c, roughness: 1, side: THREE.DoubleSide,
  });
  const geosVerde: THREE.BufferGeometry[] = [];
  for (const p of d.parques) {
    if (p.length < 4) continue;
    const forma = new THREE.Shape();
    forma.moveTo(p[0][0], p[0][1]);
    for (const [x, z] of p.slice(1)) forma.lineTo(x, z);
    forma.closePath();
    try {
      const g = new THREE.ShapeGeometry(forma);
      g.rotateX(Math.PI / 2);
      g.translate(0, 1.18, 0);
      geosVerde.push(g);
    } catch { /* polígono degenerado: se descarta */ }
  }
  const geoVerde = fusionar(geosVerde);
  if (geoVerde) {
    const m = new THREE.Mesh(geoVerde, matVerde);
    m.receiveShadow = true;
    grupo.add(m);
  }

  /* -------------------------------------------------------- edificios
     Tres mallas instanciadas, un solo atlas. Cada instancia lleva su casilla
     de fachada, su repetición de trama y su tinte. */
  const nombresHito = new Set(
    d.hitos.filter(h => HITOS_PROPIOS.has(h.n)).map(h => `${h.x},${h.z}`));

  const porClase: Record<string, typeof d.edificios> = {
    vidrio: [], hormigon: [], casco: [],
  };
  for (const e of d.edificios) {
    if (nombresHito.has(`${e[0]},${e[1]}`)) continue;
    const car = CARACTER[e[6]] ?? CARACTER.resto;
    /* Las torres de más de veinte plantas van siempre a vidrio, esté donde
       esté: en Panamá una torre alta es muro cortina, no hormigón visto. */
    const clase = e[5] >= 20 ? "vidrio" : car.clase;
    porClase[clase].push(e);
  }

  const AJUSTE = {
    vidrio:   { rugosidad: 0.16, metalico: 0.72, reflejo: 1.25, casillas: CASILLA.oficina },
    hormigon: { rugosidad: 0.66, metalico: 0.08, reflejo: 0.55, casillas: [...CASILLA.residencial, ...CASILLA.retícula] },
    casco:    { rugosidad: 0.82, metalico: 0.03, reflejo: 0.4,  casillas: CASILLA.colonial },
  } as const;

  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const P = new THREE.Vector3();
  const S = new THREE.Vector3();
  const C = new THREE.Color();

  /* Para que la cámara sepa qué hay debajo: rejilla de 100 m con la altura
     máxima construida en cada celda. */
  const REJA = 100;
  const alturas = new Map<number, number>();
  const clave = (x: number, z: number) =>
    (Math.round(x / REJA) + 512) * 1024 + (Math.round(z / REJA) + 512);
  const anotar = (x: number, z: number, h: number) => {
    const k = clave(x, z);
    if ((alturas.get(k) ?? 0) < h) alturas.set(k, h);
  };

  /* Teselado. Los edificios no van uno por malla —serían diez mil llamadas—
     ni todos en una sola: con un único objeto three no puede descartar nada,
     y a 35° de ángulo, donde nueve de cada diez quedan fuera de cuadro, se
     procesarían igual. Partidos en teselas de un kilómetro, cada una tiene su
     envolvente y el descarte por cono de visión hace su trabajo. */
  const TESELA = 1000;
  const claveTesela = (x: number, z: number) =>
    `${Math.floor(x / TESELA)}|${Math.floor(z / TESELA)}`;
  const SUELO = 1.34;

  for (const [clase, lista] of Object.entries(porClase)) {
    if (!lista.length) continue;
    const aj = AJUSTE[clase as keyof typeof AJUSTE];

    const teselas = new Map<string, typeof lista>();
    for (const e of lista) {
      const k = claveTesela(e[0], e[1]);
      const t = teselas.get(k);
      if (t) t.push(e); else teselas.set(k, [e]);
    }

    /* Un material por clase, compartido por todas sus teselas: el atlas y el
       programa son los mismos. Y su gemelo para el pase de sombras, que
       necesita el mismo crecimiento o proyectaría la torre entera desde el
       primer fotograma. */
    const mat = materialAtlas(atlas, aj);
    const matSombra = materialSombraAtlas();
    animables.materiales.push(mat, matSombra);

    /* Qué casilla, qué tinte y cuándo nace cada edificio. */
    const marcar = (e: typeof lista[number]): Marca => {
      const [x, z, w, d0, , plantas, zona] = e;
      const car = CARACTER[zona] ?? CARACTER.resto;
      const [n0, n1] = car.nace;
      const r = azar();
      /* El skyline real es blanco, crema y gris claro, con el azulado de los
         muros cortina; con un solo sesgo cálido la ciudad entera salía del
         mismo tostado. */
      if (clase === "vidrio") {
        C.setHSL(r < 0.5 ? 0.56 + azar() * 0.05 : 0.44 + azar() * 0.05,
          0.12 + azar() * 0.14, 0.72 + azar() * 0.16);
      } else if (r < 0.45) {
        C.setHSL(0.11, 0.03 + azar() * 0.05, 0.88 + azar() * 0.1);
      } else if (r < 0.78) {
        C.setHSL(0.09 + azar() * 0.03, 0.1 + azar() * 0.1, 0.78 + azar() * 0.1);
      } else {
        C.setHSL(azar() < 0.75 ? 0.58 : 0.045,
          azar() < 0.75 ? 0.03 : 0.18, 0.7 + azar() * 0.14);
      }
      anotar(x, z, Math.max(3.4, plantas * ALTO_PLANTA));
      void w; void d0;
      return {
        casillaFachada: aj.casillas[Math.floor(azar() * aj.casillas.length)],
        casillaAzotea: plantas >= 12 ? CASILLA.azoteaAlta : CASILLA.azoteaBaja,
        tinte: [C.r, C.g, C.b],
        nace: n0 + azar() * (n1 - n0),
        base: SUELO,
      };
    };

    for (const grupoTesela of teselas.values()) {
      const vol = construirVolumen(grupoTesela, SUELO, marcar);
      if (!vol.cuenta) continue;
      const malla = new THREE.Mesh(vol.geometria, mat);
      malla.customDepthMaterial = matSombra;
      /* Solo lo alto proyecta sombra. El caserío de dos plantas multiplica
         por diez el coste del pase de sombras y no se le ve ninguna. */
      malla.castShadow = grupoTesela.some(e => e[5] >= 8);
      malla.receiveShadow = true;
      grupo.add(malla);
    }
  }

  /* ---------------------------------------------------------- los hitos */
  const matVidrioHito = (color: number, teal = false) => {
    const m = new THREE.MeshStandardMaterial({
      color, roughness: 0.1, metalness: 0.82,
      emissive: teal ? 0x0e4d3a : 0x16283a, emissiveIntensity: 0.32,
    });
    m.envMapIntensity = 1.5;
    return m;
  };
  const matAzotea = new THREE.MeshStandardMaterial({ color: 0x8a8e94, roughness: 0.9 });

  const porNombre = new Map(d.hitos.map(h => [h.n, h]));
  const construirHito = (h: Hito, hacer: (alto: number) => THREE.Object3D) => {
    const alto = h.p * ALTO_PLANTA;
    const obj = hacer(alto);
    obj.position.set(h.x, 1.34, h.z);
    obj.rotation.y = (h.g * Math.PI) / 180;
    grupo.add(obj);
    const car = CARACTER[h.zona] ?? CARACTER.resto;
    alNacer(obj, car.nace[0] + 0.06, new THREE.Vector3(1, 1, 1));
    anotar(h.x, h.z, alto);
    return obj;
  };

  /* F&F Tower — el Tornillo: plantas cuadradas girando en hélice, cada una
     con su losa volada. */
  const ff = porNombre.get("F&F Tower");
  if (ff) construirHito(ff, alto => {
    const g = new THREE.Group();
    const vidrio = matVidrioHito(0x2aa588, true);
    const losa = new THREE.MeshStandardMaterial({ color: 0xa8e0cc, roughness: 0.4, metalness: 0.3 });
    const lado = Math.max(ff.w, ff.d) * 0.92;
    const pisos = Math.max(24, ff.p - 4);
    const hPiso = alto / (pisos + 3);
    const base = new THREE.Mesh(CAJA, vidrio);
    base.scale.set(lado * 1.14, hPiso * 3, lado * 1.14);
    base.castShadow = true;
    g.add(base);
    for (let i = 0; i < pisos; i++) {
      const p = new THREE.Group();
      const cuerpo = new THREE.Mesh(CAJA, vidrio);
      cuerpo.scale.set(lado, hPiso * 0.82, lado);
      cuerpo.castShadow = true;
      const canto = new THREE.Mesh(CAJA, losa);
      canto.scale.set(lado * 1.14, hPiso * 0.2, lado * 1.14);
      canto.position.y = hPiso * 0.82;
      p.add(cuerpo, canto);
      p.position.y = hPiso * 3 + i * hPiso;
      p.rotation.y = i * 0.115;
      g.add(p);
    }
    const aguja = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 26, 8),
      new THREE.MeshStandardMaterial({ color: 0xe4eae8, roughness: 0.3, metalness: 0.5 }));
    aguja.position.y = alto + 13;
    g.add(aguja);
    return g;
  });

  /* JW Marriott — la vela: media elipse de vidrio oscuro con la espalda
     plana y el copete redondeado. */
  const jw = porNombre.get("JW Marriott Panama");
  if (jw) construirHito(jw, alto => {
    const g = new THREE.Group();
    const vidrio = matVidrioHito(0x8fa8c4);
    /* La huella de OSM son 94 × 115 m: eso es la parcela con su podio, no el
       fuste. La torre sale de una fracción de ella —si no, la vela se
       ensancha hasta parecer un hongo— y el podio se modela aparte. */
    const anchoTorre = jw.w * 0.46;
    const fondoTorre = jw.d * 0.30;
    const podio = new THREE.Mesh(CAJA, new THREE.MeshStandardMaterial({
      color: 0xcfd6dd, roughness: 0.5, metalness: 0.2,
    }));
    podio.scale.set(jw.w * 0.86, 26, jw.d * 0.7);
    podio.castShadow = true;
    podio.receiveShadow = true;
    g.add(podio);
    /* La proa: media elipse de vidrio con la espalda plana. */
    const proa = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 1, 32, 1, false, 0, Math.PI)
        .translate(0, 0.5, 0),
      vidrio);
    proa.scale.set(anchoTorre, alto, fondoTorre);
    proa.castShadow = true;
    g.add(proa);
    const espalda = new THREE.Mesh(CAJA, vidrio);
    espalda.scale.set(anchoTorre * 1.9, alto, fondoTorre * 0.42);
    espalda.position.z = -fondoTorre * 0.2;
    espalda.castShadow = true;
    g.add(espalda);
    /* El remate: media cúpula rebajada del ancho justo de la proa. */
    const copete = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 10, 0, Math.PI, 0, Math.PI / 2), vidrio);
    copete.scale.set(anchoTorre, fondoTorre * 0.26, fondoTorre);
    copete.position.y = alto;
    g.add(copete);
    return g;
  });

  /* The Point — el cilindro blanco de Paitilla. */
  const point = porNombre.get("PH The Point");
  if (point) construirHito(point, alto => {
    const r = Math.max(point.w, point.d) * 0.46;
    const g = new THREE.Group();
    const fuste = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.86, r, 1, 36, 1).translate(0, 0.5, 0),
      new THREE.MeshStandardMaterial({
        color: 0xece7dc, roughness: 0.44, metalness: 0.18,
      }));
    fuste.scale.y = alto;
    fuste.castShadow = true;
    g.add(fuste);
    /* Los anillos de forjado que le dan la escala de planta. */
    const anillo = new THREE.TorusGeometry(1, 0.035, 6, 32).rotateX(Math.PI / 2);
    const matAnillo = new THREE.MeshStandardMaterial({ color: 0xb9b2a4, roughness: 0.6 });
    const anillos = new THREE.InstancedMesh(anillo, matAnillo, point.p);
    for (let i = 0; i < point.p; i++) {
      const t = i / point.p;
      const rr = r * (1 - t * 0.14) * 1.03;
      M.compose(
        P.set(0, (i + 0.9) * ALTO_PLANTA, 0),
        Q.identity(),
        S.set(rr, 1, rr));
      anillos.setMatrixAt(i, M);
    }
    anillos.frustumCulled = false;
    g.add(anillos);
    const tapa = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r * 0.86, 2, 36), matAzotea);
    tapa.position.y = alto;
    g.add(tapa);
    return g;
  });

  /* BICSA — la financiera escalonada de vidrio azul. */
  const bicsa = porNombre.get("BICSA");
  if (bicsa) construirHito(bicsa, alto => {
    const g = new THREE.Group();
    const vidrio = matVidrioHito(0x6f93b8);
    [[1, 0.62], [0.78, 0.84], [0.56, 1]].forEach(([k, hk]) => {
      const t = new THREE.Mesh(CAJA, vidrio);
      t.scale.set(bicsa.w * k, alto * hk, bicsa.d * k);
      t.castShadow = true;
      g.add(t);
    });
    return g;
  });

  /* Yoo Panama — la más alta de Avenida Balboa: losa esbelta con corona. */
  const yoo = porNombre.get("Yoo Panama");
  if (yoo) construirHito(yoo, alto => {
    const g = new THREE.Group();
    const vidrio = matVidrioHito(0xa8bcd0);
    const cuerpo = new THREE.Mesh(CAJA, vidrio);
    cuerpo.scale.set(yoo.w * 0.9, alto, yoo.d * 0.86);
    cuerpo.castShadow = true;
    g.add(cuerpo);
    const corona = new THREE.Mesh(CAJA, matAzotea);
    corona.scale.set(yoo.w * 0.5, 14, yoo.d * 0.5);
    corona.position.y = alto;
    g.add(corona);
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.9, 30, 6).translate(0, 15, 0),
      new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.6 }));
    ant.position.y = alto + 14;
    g.add(ant);
    return g;
  });

  /* Torre Global Bank — fuste con corona piramidal y aguja. */
  const gb = porNombre.get("Torre Global Bank");
  if (gb) construirHito(gb, alto => {
    const g = new THREE.Group();
    const vidrio = matVidrioHito(0x9db4c8);
    const fuste = new THREE.Mesh(CAJA, vidrio);
    fuste.scale.set(gb.w * 0.92, alto, gb.d * 0.92);
    fuste.castShadow = true;
    g.add(fuste);
    const cor = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(gb.w, gb.d) * 0.46, 18, 4),
      new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 0.5 }));
    cor.position.y = alto + 9;
    cor.rotation.y = Math.PI / 4;
    g.add(cor);
    return g;
  });

  /* Rellena huecos de la rejilla de alturas: la cámara consulta puntos que
     pueden caer entre celdas construidas. */
  const alturaEn = (x: number, z: number) => {
    let max = 0;
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const h = alturas.get(clave(x + dx * REJA, z + dz * REJA));
        if (h && h > max) max = h;
      }
    return max;
  };

  /* --------------------------------------------------- el detalle urbano */
  const detalle = construirDetalle(d, SUELO);
  for (const o of detalle.objetos) grupo.add(o);
  for (const a of detalle.animado)
    animables.mallas.push({ obj: a.obj, nace: a.nace, fin: new THREE.Vector3(1, 1, 1) });

  return { grupo, animables, alturaEn, trafico: detalle.trafico, suelo: SUELO };
}

/* ------------------------------------------------------- la construcción */

const suavizar = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - (1 - t) ** 3);
const M_TMP = new THREE.Matrix4();
const P_TMP = new THREE.Vector3();
const Q_TMP = new THREE.Quaternion();
const S_TMP = new THREE.Vector3();

/**
 * Levanta la ciudad según el avance del scroll.
 *
 * Cada pieza tiene su momento de nacer y crece desde el suelo en un tercio de
 * scroll. Sobre las instancias se recompone la matriz escalando solo en
 * vertical, que es lo que hace que un edificio suba en vez de inflarse.
 */
export { moverTrafico };

export function aplicarProgreso(a: Animables, p: number) {
  /* Los edificios: un número por material y la tarjeta hace el resto. */
  for (const mat of a.materiales) {
    const u = (mat.userData as { uniformes?: { uProgreso?: { value: number } } }).uniformes;
    if (u?.uProgreso) u.uProgreso.value = p;
  }
  for (const inst of a.instancias) {
    inst.piezas.forEach((pieza, i) => {
      const g = suavizar((p - pieza.nace) / 0.22);
      pieza.m.decompose(P_TMP, Q_TMP, S_TMP);
      if (g < 0.004) {
        /* Aún sin nacer: se colapsa entero. Escalando solo en vertical
           quedaba una placa aplastada, visible desde el aire como un
           parche de suelo con ventanas. */
        M_TMP.compose(P_TMP, Q_TMP, S_TMP.set(0, 0, 0));
      } else {
        M_TMP.compose(P_TMP, Q_TMP, S_TMP.setY(S_TMP.y * g));
      }
      inst.malla.setMatrixAt(i, M_TMP);
    });
    inst.malla.instanceMatrix.needsUpdate = true;
  }
  for (const m of a.mallas) {
    const g = suavizar((p - m.nace) / 0.22);
    m.obj.visible = g > 0.004;
    m.obj.scale.set(m.fin.x, Math.max(m.fin.y * g, 0.0001), m.fin.z);
  }
}
