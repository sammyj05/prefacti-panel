import * as THREE from "three";

/**
 * El atlas de fachadas y el material que lo lee por instancia.
 *
 * El problema que resuelve: la ciudad tiene diez mil edificios y hasta ahora
 * cada torre se llevaba su material y sus dos texturas clonadas. Eso son diez
 * mil materiales, veinte mil texturas y diez mil llamadas de dibujo — y con
 * eso no hay tarjeta que aguante.
 *
 * Aquí las fachadas van todas a una sola textura de 2048² repartida en una
 * rejilla de cuatro por cuatro. Cada edificio guarda en un atributo de
 * instancia qué casilla le toca, cuántas plantas tiene y su tinte. El sombreado
 * compone la coordenada final: la casilla decide el dibujo, las plantas deciden
 * cuántas veces se repite en vertical y el ancho cuántas en horizontal. Con eso
 * la ciudad entera cabe en tres llamadas de dibujo y ninguna torre se parece a
 * su vecina.
 */

/* Alto de planta en metros: lo que se usa para repartir filas de ventanas. */
export const ALTO_PLANTA = 3.2;

/* La rejilla del atlas y el lado de cada casilla en píxeles. */
const REJILLA = 4;
const LADO = 512;
const CASILLAS = REJILLA * REJILLA;

/** Índices de casilla con significado propio. */
export const CASILLA = {
  /* Ocho de fachada: cuatro de oficina acristalada y cuatro residenciales. */
  oficina: [0, 1, 2, 3],
  residencial: [4, 5, 6, 7],
  retícula: [8, 9, 10, 11],
  colonial: [12, 13],
  /* Y dos de azotea, que es lo que ve el dron desde arriba. */
  azoteaAlta: 14,
  azoteaBaja: 15,
} as const;

/** Generador reproducible: la ciudad tiene que salir igual en cada carga. */
function azarDe(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mezcla = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = (d: number) =>
    Math.round((((pa >> d) & 255) * (1 - t) + ((pb >> d) & 255) * t));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
};

/* Cada casilla de fachada trae su paleta: muro, vidrio apagado y con qué
   frecuencia hay una ventana encendida. */
type Receta = {
  muro: string; vidrio: string; encendido: number;
  trama: "vidrio" | "balcon" | "reticula" | "colonial";
};

const RECETAS: Receta[] = [
  /* 0-3 · oficina acristalada */
  { muro: "#8fb4d6", vidrio: "#24405c", encendido: 0.30, trama: "vidrio" },
  { muro: "#7cc9b7", vidrio: "#1d5048", encendido: 0.26, trama: "vidrio" },
  { muro: "#a8b4bd", vidrio: "#2b3844", encendido: 0.22, trama: "vidrio" },
  { muro: "#c8b596", vidrio: "#3a3222", encendido: 0.28, trama: "vidrio" },
  /* 4-7 · residencial con balcón corrido */
  { muro: "#efe8d8", vidrio: "#2b3a4e", encendido: 0.24, trama: "balcon" },
  { muro: "#e2d8c8", vidrio: "#243244", encendido: 0.26, trama: "balcon" },
  { muro: "#d8d3c6", vidrio: "#2e3c50", encendido: 0.22, trama: "balcon" },
  { muro: "#c9b4a2", vidrio: "#2e3c50", encendido: 0.25, trama: "balcon" },
  /* 8-11 · retícula de ventana */
  { muro: "#e9e2d2", vidrio: "#2e3c50", encendido: 0.23, trama: "reticula" },
  { muro: "#b7a795", vidrio: "#2a3648", encendido: 0.21, trama: "reticula" },
  { muro: "#9aa4ae", vidrio: "#1f2d3f", encendido: 0.25, trama: "reticula" },
  { muro: "#cfc7b6", vidrio: "#26344a", encendido: 0.20, trama: "reticula" },
  /* 12-13 · el Casco: muro de cal, ventana alta y balcón de hierro */
  { muro: "#f0e4cc", vidrio: "#4a3a2a", encendido: 0.30, trama: "colonial" },
  { muro: "#dcc9ae", vidrio: "#40342a", encendido: 0.28, trama: "colonial" },
];

/** Pinta una casilla de fachada: cuatro plantas con su losa de forjado. */
function pintarFachada(g: CanvasRenderingContext2D, r: Receta, semilla: number) {
  const az = azarDe(semilla);
  const ENCENDIDAS = ["#ffdca6", "#ffc98a", "#ffbb72", "#fff3d8"];
  const cielo = mezcla(r.vidrio, "#8fa8bd", 0.5);
  const PLANTAS = 4;
  const fh = LADO / PLANTAS;

  g.fillStyle = r.muro;
  g.fillRect(0, 0, LADO, LADO);
  /* Veladuras verticales: el muro real nunca es un color plano. */
  for (let i = 0; i < 40; i++) {
    g.fillStyle = az() < 0.5 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.055)";
    g.fillRect(Math.floor(az() * LADO), 0, 2 + Math.floor(az() * 7), LADO);
  }

  /* Una ventana: encendida en ámbar, o vidrio que devuelve cielo arriba y
     penumbra hacia el forjado. */
  const ventana = (x: number, y: number, w: number, h: number) => {
    if (az() < r.encendido) {
      g.fillStyle = ENCENDIDAS[Math.floor(az() * ENCENDIDAS.length)];
      g.fillRect(x, y, w, h);
    } else {
      const gr = g.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, cielo);
      gr.addColorStop(0.55, r.vidrio);
      gr.addColorStop(1, mezcla(r.vidrio, "#000000", 0.4));
      g.fillStyle = gr;
      g.fillRect(x, y, w, h);
    }
    if (w > 22) {
      g.fillStyle = "rgba(8,12,18,0.42)";
      g.fillRect(x + Math.floor(w / 2), y, 2, h);
    }
    g.strokeStyle = "rgba(0,0,0,0.34)";
    g.lineWidth = 2;
    g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  };

  /* El canto del forjado con su sombra: es lo que da escala de planta. */
  const losa = (y: number) => {
    g.fillStyle = mezcla(r.muro, "#ffffff", 0.18);
    g.fillRect(0, y, LADO, 7);
    g.fillStyle = "rgba(0,0,0,0.2)";
    g.fillRect(0, y + 7, LADO, 5);
  };

  for (let f = 0; f < PLANTAS; f++) {
    const y = f * fh;
    if (r.trama === "vidrio") {
      /* Muro cortina: panel a panel, con los montantes encima. */
      const cols = 8, cw = LADO / cols;
      for (let c = 0; c < cols; c++) ventana(c * cw + 2, y + 4, cw - 4, fh - 8);
      g.fillStyle = "rgba(6,12,16,0.5)";
      for (let c = 0; c <= cols; c++) g.fillRect(c * cw, y, 2, fh);
      g.fillStyle = "rgba(6,12,16,0.6)";
      g.fillRect(0, y, LADO, 4);
    } else if (r.trama === "balcon") {
      const cols = 4, cw = LADO / cols;
      for (let c = 0; c < cols; c++) ventana(c * cw + 8, y + 12, cw - 16, fh - 44);
      /* La losa volada del balcón, su sombra y la barandilla. */
      g.fillStyle = mezcla(r.muro, "#ffffff", 0.36);
      g.fillRect(0, y + fh - 30, LADO, 12);
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.fillRect(0, y + fh - 18, LADO, 8);
      g.fillStyle = "rgba(255,255,255,0.24)";
      for (let bx = 4; bx < LADO; bx += 12) g.fillRect(bx, y + fh - 42, 2, 12);
    } else if (r.trama === "colonial") {
      const cols = 3, cw = LADO / cols;
      losa(y);
      for (let c = 0; c < cols; c++) {
        const x = c * cw + cw * 0.28;
        ventana(x, y + 22, cw * 0.44, fh - 52);
        /* El balcón de hierro del Casco, volado sobre la calle. */
        g.fillStyle = "rgba(40,34,28,0.7)";
        g.fillRect(x - 8, y + fh - 34, cw * 0.44 + 16, 4);
        for (let bx = 0; bx < cw * 0.44 + 16; bx += 8)
          g.fillRect(x - 8 + bx, y + fh - 46, 2, 14);
      }
    } else {
      const cols = 6, cw = LADO / cols;
      losa(y);
      for (let c = 0; c < cols; c++) ventana(c * cw + 8, y + 20, cw - 16, fh - 36);
    }
  }
}

/** Azotea: grava, juntas, y equipos de clima vistos en planta. */
function pintarAzotea(g: CanvasRenderingContext2D, alta: boolean, semilla: number) {
  const az = azarDe(semilla);
  g.fillStyle = alta ? "#8e9298" : "#b4ada0";
  g.fillRect(0, 0, LADO, LADO);
  /* Grano de grava. */
  for (let i = 0; i < 900; i++) {
    g.fillStyle = az() < 0.5 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)";
    g.fillRect(az() * LADO, az() * LADO, 3 + az() * 8, 3 + az() * 8);
  }
  /* Las juntas de la impermeabilización. */
  g.fillStyle = "rgba(0,0,0,0.1)";
  for (let y = 0; y < LADO; y += 64) g.fillRect(0, y, LADO, 2);
  /* El peto perimetral. */
  g.strokeStyle = alta ? "#c8ccd2" : "#cfc7b6";
  g.lineWidth = 14;
  g.strokeRect(7, 7, LADO - 14, LADO - 14);
  /* Y los equipos: climatizadoras, tanque y casetón de escalera. */
  const n = alta ? 7 : 4;
  for (let i = 0; i < n; i++) {
    const w = 34 + az() * 60, h = 28 + az() * 50;
    const x = 40 + az() * (LADO - 120), y = 40 + az() * (LADO - 120);
    g.fillStyle = "#767b83";
    g.fillRect(x, y, w, h);
    g.fillStyle = "rgba(255,255,255,0.16)";
    g.fillRect(x, y, w, 6);
    g.fillStyle = "rgba(0,0,0,0.3)";
    g.fillRect(x + 4, y + h, w, 7);
  }
  if (alta) {
    /* Los helipuertos de las torres altas. */
    g.strokeStyle = "#e8e4da"; g.lineWidth = 8;
    g.beginPath(); g.arc(LADO * 0.72, LADO * 0.3, 58, 0, Math.PI * 2); g.stroke();
    g.font = "bold 74px Helvetica, Arial"; g.fillStyle = "#e8e4da";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("H", LADO * 0.72, LADO * 0.3);
  }
}

/** Construye el atlas completo. Se genera una vez por carga. */
export function construirAtlas(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = REJILLA * LADO;
  const g = c.getContext("2d")!;
  for (let i = 0; i < CASILLAS; i++) {
    const cx = (i % REJILLA) * LADO, cy = Math.floor(i / REJILLA) * LADO;
    g.save();
    g.translate(cx, cy);
    g.beginPath();
    g.rect(0, 0, LADO, LADO);
    g.clip();
    if (i === CASILLA.azoteaAlta) pintarAzotea(g, true, 900 + i);
    else if (i === CASILLA.azoteaBaja) pintarAzotea(g, false, 900 + i);
    else pintarFachada(g, RECETAS[i] ?? RECETAS[0], 100 + i * 37);
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/* ------------------------------------------------------- el material */

export type MaterialAtlas = THREE.MeshStandardMaterial & {
  userData: { atlas: THREE.CanvasTexture };
};

/**
 * Material que lee el atlas por instancia.
 *
 * Tres atributos de instancia mandan sobre el resultado: `aCasilla` dice qué
 * casilla de fachada y cuál de azotea usar, `aTrama` cuántas veces repetir el
 * dibujo en horizontal y en vertical —de ahí salen las filas de ventanas
 * proporcionales a las plantas de verdad—, y `aTinte` da el color propio para
 * que dos torres con la misma casilla no salgan gemelas.
 *
 * La cara superior se distingue por la normal: si apunta al cielo, la
 * coordenada se compone contra la casilla de azotea en vez de la de fachada.
 */
export function materialAtlas(atlas: THREE.CanvasTexture, opciones: {
  rugosidad?: number; metalico?: number; reflejo?: number;
} = {}) {
  const mat = new THREE.MeshStandardMaterial({
    map: atlas,
    roughness: opciones.rugosidad ?? 0.62,
    metalness: opciones.metalico ?? 0.14,
    emissive: 0xffffff,
    emissiveMap: atlas,
    emissiveIntensity: 0.85,
  });
  mat.envMapIntensity = opciones.reflejo ?? 0.7;

  mat.onBeforeCompile = shader => {
    shader.uniforms.uProgreso = { value: 1 };
    mat.userData.uniformes = shader.uniforms;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        attribute vec2 aCasilla;
        attribute vec2 aTrama;
        attribute vec3 aTinte;
        attribute float aNace;
        attribute float aBase;
        attribute float aArriba;
        uniform float uProgreso;
        varying vec2 vCasilla;
        varying vec2 vTrama;
        varying vec3 vTinte;
        varying float vArriba;`,
      )
      .replace(
        "#include <uv_vertex>",
        /* glsl */ `#include <uv_vertex>
        vCasilla = aCasilla;
        vTrama = aTrama;
        vTinte = aTinte;
        /* Qué cara es —fachada o azotea— viene marcado por vértice, no
           deducido de la normal: en la malla fusionada la normal no siempre
           llega como uno espera, y azoteas y fachadas se intercambiaban. */
        vArriba = aArriba;`,
      )
      /* La ciudad se levanta aquí. Cada vértice sabe cuándo nace su edificio
         y desde qué cota arranca, así que crecer es mover la coordenada
         vertical hacia su cota final. Antes esto costaba reescribir diez mil
         matrices por fotograma en el procesador; ahora no cuesta nada. */
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
        float crecido = clamp((uProgreso - aNace) / 0.22, 0.0, 1.0);
        crecido = 1.0 - pow(1.0 - crecido, 3.0);
        transformed.y = aBase + (transformed.y - aBase) * crecido;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        varying vec2 vCasilla;
        varying vec2 vTrama;
        varying vec3 vTinte;
        varying float vArriba;

        /* Compone la coordenada del atlas: elige casilla —fachada o azotea—,
           repite el dibujo dentro de ella y deja un margen de medio texel
           para que el filtrado no arrastre el color de la casilla vecina. */
        vec2 uvAtlas(vec2 uv) {
          float casilla = mix(vCasilla.x, vCasilla.y, vArriba);
          vec2 rep = mix(vTrama, vec2(1.0), vArriba);
          vec2 dentro = fract(uv * rep);
          /* La fila va contada desde abajo. Un lienzo se sube volteado en
             vertical, así que la fila 0 del dibujo acaba arriba del todo de la
             textura; sin invertirla aquí, cada casilla leía la de su fila
             espejo — las azoteas salían con muro cortina y las fachadas con
             el muro de cal del Casco. */
          vec2 celda = vec2(
            mod(casilla, ${REJILLA}.0),
            ${REJILLA - 1}.0 - floor(casilla / ${REJILLA}.0));
          float borde = 1.5 / ${REJILLA * LADO}.0;
          dentro = clamp(dentro, borde * ${REJILLA}.0, 1.0 - borde * ${REJILLA}.0);
          return (celda + dentro) / ${REJILLA}.0;
        }`,
      )
      /* El muestreo con derivadas explícitas: `fract` rompe el cálculo
         automático de nivel de detalle y sin esto aparece una costura negra
         en cada repetición del dibujo. */
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        {
          float casilla = mix(vCasilla.x, vCasilla.y, vArriba);
          vec2 rep = mix(vTrama, vec2(1.0), vArriba);
          vec2 dx = dFdx(vMapUv * rep) / ${REJILLA}.0;
          vec2 dy = dFdy(vMapUv * rep) / ${REJILLA}.0;
          vec4 texel = textureGrad(map, uvAtlas(vMapUv), dx, dy);
          diffuseColor *= vec4(texel.rgb * vTinte, texel.a);
        }`,
      )
      /* La azotea no es muro cortina. Compartiendo material con la fachada
         heredaba su metalicidad, y las cubiertas de las torres de vidrio
         devolvían el cielo como espejos de agua. */
      .replace(
        "#include <metalnessmap_fragment>",
        /* glsl */ `#include <metalnessmap_fragment>
        metalnessFactor *= mix(1.0, 0.1, vArriba);
        roughnessFactor = mix(roughnessFactor, 0.92, vArriba);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `
        {
          vec2 rep = mix(vTrama, vec2(1.0), vArriba);
          vec2 dx = dFdx(vEmissiveMapUv * rep) / ${REJILLA}.0;
          vec2 dy = dFdy(vEmissiveMapUv * rep) / ${REJILLA}.0;
          vec4 em = textureGrad(emissiveMap, uvAtlas(vEmissiveMapUv), dx, dy);
          /* Solo arde lo que ya es cálido y claro: las ventanas encendidas
             del dibujo, no la pared entera. */
          float calor = clamp((em.r - em.b) * 2.4, 0.0, 1.0)
                      * smoothstep(0.45, 0.85, em.r);
          totalEmissiveRadiance *= em.rgb * calor;
        }`,
      );
  };
  /* Las variantes del sombreado se cachean por clave: sin esto three no sabe
     que dos materiales con el mismo `onBeforeCompile` comparten programa. */
  mat.customProgramCacheKey = () => "atlas-ciudad";
  return mat;
}

/**
 * El material del pase de sombras.
 *
 * Sin él la sombra se proyecta siempre a la altura final: una torre a medio
 * construir dejaba en el suelo la sombra de la torre entera, y el efecto de
 * obra se venía abajo. Lleva el mismo desplazamiento vertical que el material
 * de color, y nada más.
 */
export function materialSombraAtlas() {
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  mat.onBeforeCompile = shader => {
    shader.uniforms.uProgreso = { value: 1 };
    mat.userData.uniformes = shader.uniforms;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", /* glsl */ `#include <common>
        attribute float aNace;
        attribute float aBase;
        uniform float uProgreso;`)
      .replace("#include <begin_vertex>", /* glsl */ `#include <begin_vertex>
        float crecido = clamp((uProgreso - aNace) / 0.22, 0.0, 1.0);
        crecido = 1.0 - pow(1.0 - crecido, 3.0);
        transformed.y = aBase + (transformed.y - aBase) * crecido;`);
  };
  mat.customProgramCacheKey = () => "atlas-ciudad-sombra";
  return mat;
}

/**
 * Prepara los atributos de instancia de una malla instanciada.
 * Devuelve los arrays para irlos rellenando edificio a edificio.
 */
export function atributosInstancia(n: number) {
  const casilla = new Float32Array(n * 2);
  const trama = new Float32Array(n * 2);
  const tinte = new Float32Array(n * 3);
  return {
    casilla, trama, tinte,
    montar(malla: THREE.InstancedMesh) {
      malla.geometry.setAttribute(
        "aCasilla", new THREE.InstancedBufferAttribute(casilla, 2));
      malla.geometry.setAttribute(
        "aTrama", new THREE.InstancedBufferAttribute(trama, 2));
      malla.geometry.setAttribute(
        "aTinte", new THREE.InstancedBufferAttribute(tinte, 3));
    },
  };
}
