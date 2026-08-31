/**
 * Hornea la geografía real de la ciudad de Panamá a un JSON compacto.
 *
 * Consulta Overpass una vez, recorta a la bahía —del Casco Viejo a Punta
 * Pacífica—, proyecta latitud/longitud a metros locales y escribe
 * `public/panama.json`. La escena 3D lee ese archivo; no consulta Overpass en
 * ejecución, que tarda segundos y se cae a menudo.
 *
 * La huella de cada edificio no se guarda como polígono sino como su caja
 * envolvente orientada —centro, ancho, fondo, giro y plantas—: seis números
 * que entran directos en la matriz de una `InstancedMesh`. Los polígonos
 * completos se reservan para el Casco y los hitos, que son los que se modelan
 * a mano.
 *
 *   node scripts/hornear-osm.mjs
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const SALIDA = join(RAIZ, "public", "panama.json");

/* El recorte: del Casco Viejo (suroeste) a Punta Pacífica y Obarrio
   (noreste), con Cerro Ancón dentro. Unos 6,6 × 6,7 km. */
const SUR = 8.940, OESTE = -79.560, NORTE = 9.000, ESTE = -79.495;

/* El origen del mundo local: el centro de la bahía frente a Avenida Balboa.
   Todo se mide en metros desde aquí. */
const LAT0 = (SUR + NORTE) / 2, LON0 = (OESTE + ESTE) / 2;
const M_POR_GRADO_LAT = 110_574;
const M_POR_GRADO_LON = 111_320 * Math.cos((LAT0 * Math.PI) / 180);

/** Latitud/longitud a metros locales. +x al este, +z al sur (mano de three). */
function aLocal(lat, lon) {
  return [(lon - LON0) * M_POR_GRADO_LON, -(lat - LAT0) * M_POR_GRADO_LAT];
}

const ESPEJOS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

/* Overpass rechaza con 406 al agente por defecto de Node: quiere uno que
   identifique a quién llama, como pide su política de uso. */
const AGENTE = "prefacti-hornear-osm/1.0 (portada 3D; contacto sam@prefacti.com)";

const CACHE = join(AQUI, ".cache-osm");

/* Las respuestas crudas se guardan en disco: afinar el horneado no puede
   costar otra consulta a Overpass, que es lento y de uso compartido. Borra
   `scripts/.cache-osm` para volver a bajar el dato. */
async function overpass(consulta) {
  const clave = createHash("sha1").update(consulta).digest("hex").slice(0, 12);
  const archivo = join(CACHE, `${clave}.json`);
  if (existsSync(archivo)) {
    const el = JSON.parse(readFileSync(archivo, "utf8"));
    console.log(`  en caché · ${el.length} elementos`);
    return el;
  }
  let ultimo;
  for (const url of ESPEJOS) {
    for (let intento = 0; intento < 2; intento++) {
      try {
        process.stdout.write(`  consultando ${new URL(url).host}… `);
        const r = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": AGENTE,
            "Accept": "application/json",
          },
          body: "data=" + encodeURIComponent(consulta),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        console.log(`${j.elements.length} elementos`);
        mkdirSync(CACHE, { recursive: true });
        writeFileSync(archivo, JSON.stringify(j.elements));
        return j.elements;
      } catch (e) {
        ultimo = e;
        console.log(`falló (${e.message})`);
        await new Promise(res => setTimeout(res, 3000));
      }
    }
  }
  throw ultimo;
}

const BBOX = `${SUR},${OESTE},${NORTE},${ESTE}`;

/* -------------------------------------------------------------- geometría */

/**
 * La caja envolvente orientada de una huella: se prueban giros cada 3° y se
 * queda el que da menos área. Es lo que convierte un polígono cualquiera en
 * los seis números que necesita una instancia.
 */
function cajaOrientada(pts) {
  let mejor = null;
  for (let g = 0; g < 90; g += 3) {
    const a = (g * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const [x, z] of pts) {
      const u = x * cos + z * sin, v = -x * sin + z * cos;
      if (u < minU) minU = u; if (u > maxU) maxU = u;
      if (v < minV) minV = v; if (v > maxV) maxV = v;
    }
    const w = maxU - minU, d = maxV - minV;
    const area = w * d;
    if (!mejor || area < mejor.area) {
      const cu = (minU + maxU) / 2, cv = (minV + maxV) / 2;
      mejor = {
        area, w, d, giro: a,
        x: cu * cos - cv * sin,
        z: cu * sin + cv * cos,
      };
    }
  }
  return mejor;
}

/**
 * Simplifica una polilínea quedándose con los puntos que se salen de la
 * recta más de `tol` metros (Douglas-Peucker).
 *
 * Un anillo cerrado hay que partirlo antes: como su primer punto coincide con
 * el último, la recta base mide cero, todas las distancias salen cero y el
 * polígono entero se reduce a dos puntos. Se corta por la mitad y se simplifica
 * cada arco por separado.
 */
function simplificar(pts, tol) {
  if (pts.length < 3) return pts;
  const [xa, za] = pts[0], [xb, zb] = pts[pts.length - 1];
  if (Math.hypot(xa - xb, za - zb) < 0.5 && pts.length > 4) {
    const medio = Math.floor(pts.length / 2);
    return [
      ...simplificar(pts.slice(0, medio + 1), tol).slice(0, -1),
      ...simplificar(pts.slice(medio), tol),
    ];
  }
  const [x0, z0] = pts[0], [x1, z1] = pts[pts.length - 1];
  const dx = x1 - x0, dz = z1 - z0;
  const largo = Math.hypot(dx, dz) || 1e-9;
  let peor = 0, iPeor = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, z] = pts[i];
    const dist = Math.abs((x - x0) * dz - (z - z0) * dx) / largo;
    if (dist > peor) { peor = dist; iPeor = i; }
  }
  if (peor <= tol) return [pts[0], pts[pts.length - 1]];
  return [
    ...simplificar(pts.slice(0, iPeor + 1), tol).slice(0, -1),
    ...simplificar(pts.slice(iPeor), tol),
  ];
}

/** Reconstruye la geometría de un `way` de Overpass en metros locales. */
const puntos = el =>
  (el.geometry ?? []).map(g => aLocal(g.lat, g.lon)).map(([x, z]) => [
    Math.round(x * 10) / 10, Math.round(z * 10) / 10,
  ]);

/* Cuántas plantas tiene: primero lo que diga OSM, si no por la altura, y si
   tampoco, por el tamaño de la huella (una nave grande no es una torre). */
function plantas(tags, area) {
  const n = parseInt(tags["building:levels"] ?? tags["levels"] ?? "", 10);
  if (Number.isFinite(n) && n > 0 && n < 120) return n;
  const alt = parseFloat(tags.height ?? tags["building:height"] ?? "");
  if (Number.isFinite(alt) && alt > 0) return Math.max(1, Math.round(alt / 3.2));
  if (area > 4000) return 1;
  if (area > 900) return 2;
  return 3;
}

/* ------------------------------------------------------------------ zonas
   Los seis barrios, situados por sus hitos reales en metros locales —no por
   latitud a ojo—: el Casco en su península, el corredor de Avenida Balboa
   donde están Yoo y BICSA, Paitilla en la punta de The Point, Pacífica
   alrededor del JW Marriott, Obarrio en el F&F y Marbella tierra adentro.
   La zona decide la curva de alturas y el material de cada huella. */
const ZONAS = [
  { id: "casco",    x: -850, z: 2120, r: 620 },
  { id: "balboa",   x:  150, z: -650, r: 780 },
  { id: "paitilla", x: 1120, z: -300, r: 560 },
  { id: "pacifica", x: 2230, z: -600, r: 660 },
  { id: "obarrio",  x: 1080, z: -1500, r: 600 },
  { id: "marbella", x:  150, z: -1500, r: 760 },
];

function zonaDe(x, z) {
  let mejor = "resto", mejorD = Infinity;
  for (const zo of ZONAS) {
    const d = Math.hypot(zo.x - x, zo.z - z);
    /* Normalizado por radio: si dos zonas solapan gana aquella en cuyo
       corazón cae el punto, no la de centro más cercano. */
    const rel = d / zo.r;
    if (rel < 1 && rel < mejorD) { mejorD = rel; mejor = zo.id; }
  }
  return mejor;
}

/* --------------------------------------------------------------- horneado */

console.log(`Recorte ${BBOX}`);
console.log(`Origen ${LAT0.toFixed(4)}, ${LON0.toFixed(4)}`);

console.log("\n1/4 · edificios");
const edificios = await overpass(`
  [out:json][timeout:180];
  way["building"](${BBOX});
  out geom;
`);

console.log("2/4 · viales");
const viales = await overpass(`
  [out:json][timeout:120];
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified)$"](${BBOX});
  out geom;
`);

console.log("3/4 · costa y agua");
const agua = await overpass(`
  [out:json][timeout:120];
  (
    way["natural"="coastline"](${BBOX});
    way["natural"="water"](${BBOX});
  );
  out geom;
`);

console.log("4/4 · parques y verde");
const verde = await overpass(`
  [out:json][timeout:120];
  way["leisure"~"^(park|pitch|garden)$"](${BBOX});
  way["landuse"~"^(grass|forest|recreation_ground)$"](${BBOX});
  out geom;
`);

/* -- edificios a cajas orientadas ---------------------------------------- */
const cajas = [];
const conteoZona = {};
for (const el of edificios) {
  const pts = puntos(el);
  if (pts.length < 4) continue;
  const c = cajaOrientada(pts);
  /* Fuera los cobertizos: menos de 40 m² no aporta nada y multiplica el
     archivo por tres. */
  if (!c || c.area < 40 || c.w > 400 || c.d > 400) continue;
  const zona = zonaDe(c.x, c.z);
  const n = plantas(el.tags ?? {}, c.area);
  conteoZona[zona] = (conteoZona[zona] ?? 0) + 1;

  /* La huella de verdad, simplificada a metro y medio y en coordenadas
     relativas al centro. Es lo que permite que la escena extruya una planta
     en L o en curva en vez de la caja que la envuelve — y un edificio con su
     forma real deja de leerse como un bloque de juguete. Se guarda relativa y
     redondeada al decímetro para que el archivo no se dispare. */
  let anillo = simplificar(pts, 1.5);
  /* El último punto repite el primero: sobra para un polígono. */
  if (anillo.length > 3 && Math.hypot(
      anillo[0][0] - anillo[anillo.length - 1][0],
      anillo[0][1] - anillo[anillo.length - 1][1]) < 0.5) anillo = anillo.slice(0, -1);
  /* Y si tiene demasiados lados, se recorta: por encima de dieciséis no
     aporta silueta y sí vértices. */
  if (anillo.length > 16) {
    const paso = anillo.length / 16;
    anillo = Array.from({ length: 16 }, (_, i) => anillo[Math.floor(i * paso)]);
  }
  const huella = anillo.length >= 3
    ? anillo.flatMap(([px, pz]) => [
        Math.round((px - c.x) * 10) / 10,
        Math.round((pz - c.z) * 10) / 10,
      ])
    : null;

  cajas.push([
    Math.round(c.x * 10) / 10,
    Math.round(c.z * 10) / 10,
    Math.round(c.w * 10) / 10,
    Math.round(c.d * 10) / 10,
    Math.round((c.giro * 180) / Math.PI),
    n,
    zona,
    huella,
  ]);
}

/* -- hitos ----------------------------------------------------------------
   Los edificios con nombre y los de más de veinte plantas: son los que la
   escena modela con geometría propia en vez de extruir una caja. Se guarda
   también el contorno simplificado, que es lo que da la silueta. */
const hitos = [];
/* Los hitos salen del mismo dato de edificios: no hace falta otra consulta,
   los `tags` ya vienen con el nombre y las plantas. */
for (const el of edificios) {
  const tags = el.tags ?? {};
  const pts = puntos(el);
  if (pts.length < 4) continue;
  const c = cajaOrientada(pts);
  if (!c || c.area < 150) continue;
  const n = plantas(tags, c.area);
  /* Solo lo que se modela aparte: torres de veinte plantas para arriba. Un
     nombre en una tienda de dos plantas no es un hito, y meterlos todos
     triplicaba el archivo. */
  if (n < 20) continue;
  hitos.push({
    n: tags.name ?? "",
    p: n,
    x: Math.round(c.x * 10) / 10,
    z: Math.round(c.z * 10) / 10,
    w: Math.round(c.w * 10) / 10,
    d: Math.round(c.d * 10) / 10,
    g: Math.round((c.giro * 180) / Math.PI),
    zona: zonaDe(c.x, c.z),
    /* El contorno solo para las de cuarenta plantas o más: son las que
       llevan silueta propia; el resto se extruye de su caja. */
    ...(n >= 40 ? { c: simplificar(pts, 3) } : {}),
  });
}
hitos.sort((a, b) => b.p - a.p);

/* -- viales ---------------------------------------------------------------
   Cada vial guarda su jerarquía: el ancho de calzada y la acera salen de
   ella al construir la escena. */
const RANGO = {
  motorway: 0, trunk: 0, primary: 1, secondary: 2, tertiary: 3,
  residential: 4, unclassified: 4,
};
const vias = viales
  .map(el => {
    const pts = simplificar(puntos(el), 4);
    if (pts.length < 2) return null;
    return { r: RANGO[el.tags?.highway] ?? 4, p: pts, n: el.tags?.name ?? "" };
  })
  .filter(Boolean);

/* -- costa ---------------------------------------------------------------- */
const costas = agua
  .filter(el => el.tags?.natural === "coastline")
  .map(el => simplificar(puntos(el), 6))
  .filter(p => p.length > 1);

const lagos = agua
  .filter(el => el.tags?.natural === "water")
  .map(el => simplificar(puntos(el), 8))
  .filter(p => p.length > 3);

/* -- verde ---------------------------------------------------------------- */
/* Tolerancia fina: con 8 m los parques de manzana colapsaban a dos puntos y
   se perdían todos. Y se descartan los que quedan por debajo de 200 m². */
const areaPolig = pts => {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
    a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return Math.abs(a / 2);
};
const parques = verde
  .map(el => simplificar(puntos(el), 2.5))
  .filter(p => p.length > 3 && areaPolig(p) > 200);

const datos = {
  meta: {
    origen: [LAT0, LON0],
    recorte: [SUR, OESTE, NORTE, ESTE],
    metroPorGrado: [M_POR_GRADO_LAT, M_POR_GRADO_LON],
    horneado: new Date().toISOString().slice(0, 10),
    /* [x, z, ancho, fondo, giroGrados, plantas, zona] */
    formatoEdificio: "x,z,w,d,giro,plantas,zona,huella[]",
  },
  zonas: ZONAS,
  edificios: cajas,
  hitos,
  vias,
  costas,
  lagos,
  parques,
};

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, JSON.stringify(datos));

const kb = (JSON.stringify(datos).length / 1024).toFixed(0);
console.log(`\n✓ ${SALIDA}  (${kb} KB)`);
console.log(`  edificios ${cajas.length}`);
for (const [z, n] of Object.entries(conteoZona).sort((a, b) => b[1] - a[1]))
  console.log(`    ${z.padEnd(10)} ${n}`);
console.log(`  hitos ${hitos.length} (con nombre ${hitos.filter(h => h.n).length})`);
console.log(`  vías ${vias.length}  ·  costa ${costas.length}  ·  parques ${parques.length}`);
