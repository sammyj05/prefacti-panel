/**
 * Genera `lib/portfolio.json` a partir de los datos reales de Prefacti.
 *
 * Hasta aquí la cartera era inventada: dieciocho promociones con nombres de
 * la bahía y cifras que cuadraban entre sí pero no venían de ningún sitio.
 * Esto lee el proyecto real —`src/lib/demoSeed.json` del repositorio de
 * Prefacti— y lo pasa por su propio motor de cálculo, de modo que cada número
 * de este panel es el mismo que sale en la herramienta de verdad. Si el motor
 * cambia, se vuelve a correr y el panel cambia con él.
 *
 * El zip viene sin `node_modules` y escrito para un empaquetador —imports sin
 * extensión, alias `@/`, algún módulo que arrastra React sin usarlo—, así que
 * el enlace se resuelve con un gancho de carga en vez de montar el proyecto.
 *
 *   node scripts/generar-cartera.mjs [ruta-al-repo-de-prefacti]
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join, resolve as rutaAbsoluta } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(AQUI, "..", "lib", "portfolio.json");

const ORIGEN = rutaAbsoluta(
  process.argv[2] ??
  "/private/tmp/claude-501/-Users-sammyjoe/78e1c770-f296-4f4f-b7fb-c392f0cd95f5/scratchpad/zipreal");

if (!existsSync(join(ORIGEN, "src/lib/demoSeed.json"))) {
  console.error(`No encuentro los datos en ${ORIGEN}.`);
  console.error("Pasa la ruta al repositorio de Prefacti como argumento.");
  process.exit(1);
}

/* -------------------------------------------------------- el gancho de carga */

const GANCHO = `
import { existsSync } from "node:fs";
const RAIZ = ${JSON.stringify(join(ORIGEN, "src") + "/")};
/* React entra por un módulo de ganchos que el motor de flujo importa pero no
   usa para calcular: se sustituye por un doble vacío. */
const REACT_FALSO =
  "data:text/javascript,export const useState=()=>[];export const useMemo=(f)=>f&&f();" +
  "export const useCallback=(f)=>f;export const useEffect=()=>{};export const useRef=()=>({current:null});" +
  "export default {};";
const conExtension = ruta => {
  for (const ext of ["", ".js", ".jsx", "/index.js", "/index.jsx"])
    if (existsSync(ruta + ext)) return ruta + ext;
  return null;
};
export function resolve(especificador, contexto, siguiente) {
  if (especificador === "react" || especificador === "react-dom")
    return { url: REACT_FALSO, shortCircuit: true };
  if (especificador.startsWith("@/")) {
    const r = conExtension(RAIZ + especificador.slice(2));
    if (r) return siguiente("file://" + r, contexto);
  }
  if (especificador.startsWith(".") && contexto.parentURL?.startsWith("file:")) {
    const r = conExtension(new URL(especificador, contexto.parentURL).pathname);
    if (r) return siguiente("file://" + r, contexto);
  }
  return siguiente(especificador, contexto);
}
`;
register("data:text/javascript," + encodeURIComponent(GANCHO), pathToFileURL("./"));

const { calcularFactibilidad } = await import(join(ORIGEN, "src/lib/calculations.js"));
const { calcularMetricasRetorno } = await import(join(ORIGEN, "src/lib/metricasRetorno.js"));

const semilla = JSON.parse(readFileSync(join(ORIGEN, "src/lib/demoSeed.json"), "utf8"));

/* ------------------------------------------------------------------ apoyo */

const redondear = (n, d = 0) => {
  const f = 10 ** d;
  return Math.round((Number(n) || 0) * f) / f;
};

/**
 * La volumetría de la ficha en tres dimensiones.
 *
 * No es dato: es la lectura de los que hay. Una torre se dibuja como un prisma
 * de la superficie de su planta tipo y tantas plantas como niveles tenga; una
 * promoción de casas, como las manzanas de cada etapa. Se deriva aquí y no se
 * inventa, así que cambiar las plantas del proyecto cambia el bloque.
 */
function volumetriaTorre(niveles, areaPlanta) {
  const lado = Math.sqrt(Math.max(areaPlanta, 120));
  const w = redondear(lado * 1.25, 1), d = redondear(lado * 0.8, 1);
  return [{
    poly: [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]],
    y0: 0, h: redondear(niveles * 3.2, 1), floors: niveles,
  }];
}

function volumetriaCasas(etapas) {
  /* Cada etapa, una manzana en fila. La huella sale de sus viviendas. */
  let x = 0;
  return etapas.map(e => {
    const w = redondear(Math.sqrt(e.cantViviendas) * 9, 1);
    const d = redondear(w * 0.62, 1);
    const bloque = {
      poly: [[x, 0], [x + w, 0], [x + w, d], [x, d]] ,
      y0: 0, h: 6.4, floors: 2,
    };
    x += w + 12;
    return bloque;
  });
}

/* ------------------------------------------------------- el detalle real
   Lo que la ficha de proyecto necesita para enseñar la promoción entera y no
   sólo su resumen: el presupuesto de obra con sus partidas y precios unitarios,
   el cuadro de áreas unidad a unidad con su estado de venta, el cronograma de
   caja mes a mes, y —en casas— los modelos y las etapas. Es el mismo dato que
   maneja la aplicación de verdad; aquí sólo se aplana. */

/** Aplana el árbol de fases del presupuesto y calcula el monto de cada hoja. */
function aplanarPresupuesto(presupuesto) {
  const fases = presupuesto?.fases ?? [];
  const salida = [];
  for (const f of fases) {
    const partidas = (f.subfases ?? []).map(sf => ({
      nombre: sf.nombre,
      cantidad: redondear(sf.cantidad, 2),
      unidad: sf.unidad || "",
      precioUnitario: redondear(sf.precioUnitario, 2),
      /* El monto no viene calculado en el dato: es cantidad por precio, que es
         como lo compone la aplicación al pintarlo. */
      monto: redondear((sf.cantidad || 0) * (sf.precioUnitario || 0)),
    }));
    /* Un capítulo puede medirse él mismo en vez de desglosarse: los de
       albañilería, electricidad o fontanería van a tanto el metro sobre el
       área construida, sin partidas debajo. Sumando sólo las partidas
       salían en cero, que es justo lo contrario de lo que valen. */
    const propio = (f.cantidad || 0) * (f.precioUnitario || 0);
    const monto = partidas.length
      ? partidas.reduce((a, x) => a + x.monto, 0)
      : propio || (f.monto || 0);
    salida.push({
      nombre: f.nombre,
      tipo: f.tipo || "directo",
      monto: redondear(monto),
      /* Y si se mide en bloque, esa medición es su única partida: así el
         precio unitario no se pierde. */
      partidas: partidas.length || !propio ? partidas : [{
        nombre: f.nombre,
        cantidad: redondear(f.cantidad, 2),
        unidad: f.unidad || "",
        precioUnitario: redondear(f.precioUnitario, 2),
        monto: redondear(propio),
      }],
    });
  }
  return salida;
}

/** El cuadro de áreas: tipologías y unidades con su estado comercial. */
function aplanarAreas(cuadro) {
  if (!cuadro) return null;
  const tipologias = (cuadro.tipologias ?? []).map(t => ({
    id: t.id, nombre: t.nombre,
    m2: redondear(t.m2, 2),
    precioM2: redondear(t.precioM2, 2),
  }));
  const unidades = [];
  for (const n of cuadro.niveles ?? []) {
    for (const u of n.unidades ?? []) {
      unidades.push({
        nivel: n.nombre,
        codigo: u.codigo,
        tipologia: tipologias.find(t => t.id === u.tipologiaId)?.nombre ?? "",
        m2: redondear(u.m2, 2),
        estado: u.estado,
        fechaVenta: u.fechaVenta || null,
      });
    }
  }
  /* El recuento por estado es lo primero que se mira de un cuadro de áreas. */
  const porEstado = {};
  for (const u of unidades) porEstado[u.estado] = (porEstado[u.estado] ?? 0) + 1;
  return { tipologias, unidades, porEstado, niveles: (cuadro.niveles ?? []).length };
}

/** El cronograma de caja: cada actividad con su reparto mensual. */
function aplanarFlujo(datos) {
  const acts = datos.flujoActividades ?? [];
  if (!acts.length) return null;
  const horizonte = Math.max(...acts.map(a => (a.dist ?? []).length), 0);
  const actividades = acts.map(a => ({
    nombre: a.nombre,
    total: redondear(a.total),
    /* El reparto va en porcentaje del total de la actividad, mes a mes. */
    dist: (a.dist ?? []).map(x => redondear(x, 4)),
  }));
  /* Y el egreso agregado de la obra por mes, que es la curva que se dibuja. */
  const porMes = Array.from({ length: horizonte }, (_, m) =>
    redondear(actividades.reduce((a, x) => a + x.total * (x.dist[m] ?? 0), 0)));
  return { horizonte, actividades, porMes, params: datos.flujoParams ?? null };
}

/* ------------------------------------------------------------- el traspaso */

const PROYECTOS = [
  {
    clave: "torre",
    distrito: "Costa del Este",
    /* La superficie de planta tipo sale del área de construcción entre los
       niveles que tiene dibujados el cuadro de áreas. */
    volumetria: d => volumetriaTorre(
      d.cuadroAreas?.niveles?.length ?? 20,
      (d.inputs?.areaConstruccion ?? 0) / (d.cuadroAreas?.niveles?.length || 20)),
    plantas: d => d.cuadroAreas?.niveles?.length ?? 0,
    unidades: d => d.inputs?.cantApartamentos ?? 0,
    gba: d => d.inputs?.areaConstruccion ?? 0,
    gla: d => (d.inputs?.areaVentaApt ?? 0) + (d.inputs?.areaVentaLocales ?? 0),
  },
  {
    clave: "casas",
    distrito: "Chiriquí",
    /* El nombre se fija aquí y no se toma de la semilla: venía sin tilde
       —«Altos de Chiriqui»— mientras el distrito de la línea de abajo sí la
       llevaba, así que la misma palabra salía de las dos formas en la misma
       ficha. Es un topónimo: se escribe de una manera. */
    nombre: "Altos de Chiriquí",
    volumetria: d => volumetriaCasas(d.etapas ?? []),
    /* En una promoción de casas «plantas» no significa nada: se informa el
       número de etapas, que es lo que ordena la obra. */
    plantas: d => d.etapas?.length ?? 0,
    unidades: d => (d.etapas ?? []).reduce((a, e) => a + (e.cantViviendas || 0), 0),
    gba: d => (d.modelos ?? []).reduce(
      (a, m) => a + (m.m2ConstViv || 0) * (m.cantViviendas || 0), 0),
    gla: d => (d.modelos ?? []).reduce(
      (a, m) => a + (m.m2ConstViv || 0) * (m.cantViviendas || 0), 0),
  },
];

const edificios = [];
const bitacora = [];

for (const cfg of PROYECTOS) {
  const p = semilla[cfg.clave];
  if (!p) continue;
  const datos = p.datos;
  const r = calcularFactibilidad(datos, p.proyecto.tipo);
  const flujo = calcularMetricasRetorno({
    datos, resultado: r, tipo: p.proyecto.tipo, params: datos.flujoParams,
  });
  const m = flujo.metricas ?? {};

  const costo = redondear(r.costoTotal);
  const ventas = redondear(r.totalIngresos);
  const utilidad = redondear(r.utilidad);

  edificios.push({
    id: cfg.clave,
    nombre: cfg.nombre ?? p.proyecto.nombre,
    distrito: cfg.distrito,
    tipo: p.proyecto.tipo === "torre" ? "Torre residencial" : "Casas",
    etapa: p.proyecto.estado,
    floors: cfg.plantas(datos),
    alturaM: redondear(cfg.plantas(datos) * 3.2, 1),
    gba: redondear(cfg.gba(datos)),
    gla: redondear(cfg.gla(datos)),
    unidades: cfg.unidades(datos),
    ventas, costo, utilidad,
    margen: redondear(r.margen, 4),
    roi: costo > 0 ? redondear(utilidad / costo, 4) : 0,
    /* La TIR sólo existe si el flujo está configurado; sin él va a nulo, que
       es distinto de cero y así se enseña. */
    tir: m.tirAnual != null ? redondear(m.tirAnual, 4) : null,
    van: m.van != null ? redondear(m.van) : 0,
    /* La exposición es el capital propio máximo: lo más hondo que llega el
       acumulado antes de recuperarse. */
    exposicion: redondear(m.capitalPropioMax ?? 0),
    massing: cfg.volumetria(datos),

    /* Todo lo que la aplicación de verdad tiene dentro del proyecto. */
    detalle: {
      params: datos.params ?? null,
      inputs: datos.inputs ?? null,
      chequeos: datos.chequeos ?? null,
      presupuesto: aplanarPresupuesto(datos.presupuesto),
      presupuestos: (datos.presupuestos ?? []).map(pr => ({
        id: pr.id, nombre: pr.nombre, modo: pr.modo,
        fases: aplanarPresupuesto(pr),
      })),
      areas: aplanarAreas(datos.cuadroAreas),
      flujo: aplanarFlujo(datos),
      /* Sólo en casas: los modelos de vivienda y el reparto por etapas. */
      modelos: (datos.modelos ?? []).map(mo => ({
        nombre: mo.nombre,
        m2Construccion: redondear(mo.m2ConstViv, 2),
        m2Lote: redondear(mo.m2LoteViv, 2),
        precioUnidad: redondear(mo.precioUnidad),
        viviendas: mo.cantViviendas ?? 0,
      })),
      etapas: (datos.etapas ?? []).map(et => ({
        nombre: et.nombre,
        viviendas: et.cantViviendas ?? 0,
        costoConstruccion: redondear(et.costoConstTipo),
        costoIndirecto: redondear(et.costoIndTipo),
        infraestructura: redondear((et.infraOriginario ?? 0) + (et.infraVida ?? 0)),
        terreno: redondear(et.valorTerreno),
        interes: redondear(et.interesBancario),
      })),
      comercial: datos.comercial ?? (datos.inputs ? {
        fechaPreventa: datos.inputs.fechaPreventa ?? null,
        unidadesVendidas: datos.inputs.unidadesVendidas ?? 0,
        m2Vendidos: datos.inputs.m2Vendidos ?? 0,
        totalVendido: redondear(datos.inputs.ventaApartamentos ?? 0),
        inicioConstruccion: datos.inputs.inicioConstruccion ?? null,
        periodoConstruccion: datos.inputs.periodoConstruccion ?? 0,
      } : null),
      /* Y el desglose de coste e ingreso que devuelve el motor. */
      resultado: {
        ingresosApt: redondear(r.ingresosApt ?? 0),
        ingresosLocales: redondear(r.ingresosLocales ?? 0),
        ingresosEstac: redondear(r.ingresosEstac ?? 0),
        ingresosDepositos: redondear(r.ingresosDepositos ?? 0),
        descuentos: redondear(r.descuentos ?? 0),
        costosDirectos: redondear(r.costosDirectos ?? 0),
        costosIndirectos: redondear(r.costosIndirectos ?? 0),
        terreno: redondear(r.terreno ?? 0),
        imprevistos: redondear(r.imprevistos ?? 0),
        comisiones: redondear(r.comisiones ?? 0),
        publicidad: redondear(r.publicidad ?? 0),
        gastosAdmin: redondear(r.gastosAdmin ?? 0),
        impuestosVentas: redondear(r.impuestosVentas ?? 0),
        interes: redondear(r.interes ?? 0),
        precioListaM2: redondear(r.precioListaM2, 2),
        precioNetoM2: redondear(r.precioNetoM2, 2),
        ctVendible: redondear(r.ctVendible, 2),
        ctConstruccion: redondear(r.ctConstruccion, 2),
      },
      retorno: flujo.metricas ? {
        van: redondear(flujo.metricas.van),
        tirAnual: flujo.metricas.tirAnual != null ? redondear(flujo.metricas.tirAnual, 4) : null,
        tasaDescuento: redondear(flujo.metricas.tasaDescuento, 4),
        paybackSimple: flujo.metricas.paybackSimple,
        paybackDescontado: flujo.metricas.paybackDescontado,
        capitalPropioMax: redondear(flujo.metricas.capitalPropioMax ?? 0),
        mesCapitalPropioMax: flujo.metricas.mesCapitalPropioMax,
        multiploCapital: flujo.metricas.multiploCapital != null
          ? redondear(flujo.metricas.multiploCapital, 3) : null,
        horizonte: flujo.horizonte,
        acumulado: (flujo.acumulado ?? []).map(x => redondear(x)),
      } : null,
    },
  });
}

/* Las etapas del panel son los estados reales de la entidad `Proyecto`, no una
   lista inventada: Activo, En estudio, Aprobado, Finalizado y Archivado. Sólo
   se listan las que tienen algo. */
const ORDEN_ESTADO = ["En estudio", "Activo", "Aprobado", "Finalizado", "Archivado"];
const porEstado = new Map();
for (const e of edificios) {
  const a = porEstado.get(e.etapa) ?? { etapa: e.etapa, n: 0, valor: 0 };
  a.n += 1;
  a.valor += e.ventas;
  porEstado.set(e.etapa, a);
}
const etapas = ORDEN_ESTADO
  .filter(k => porEstado.has(k))
  .map(k => porEstado.get(k));

const suma = f => redondear(edificios.reduce((a, e) => a + f(e), 0));
const totales = {
  ventas: suma(e => e.ventas),
  costo: suma(e => e.costo),
  utilidad: suma(e => e.utilidad),
  gba: suma(e => e.gba),
  uds: suma(e => e.unidades),
  van: suma(e => e.van),
  exp: suma(e => e.exposicion),
  margen: 0,
  activos: edificios.length,
};
totales.margen = totales.ventas > 0
  ? redondear(totales.utilidad / totales.ventas, 4) : 0;

const salida = { edificios, etapas, totales, bitacora };
writeFileSync(SALIDA, JSON.stringify(salida, null, 1));

console.log(`✓ ${SALIDA}`);
for (const e of edificios) {
  console.log(`  ${e.nombre.padEnd(20)} ${e.etapa.padEnd(12)} ` +
    `${e.unidades} uds · ingresos ${e.ventas.toLocaleString("es-ES")} · ` +
    `margen ${(e.margen * 100).toFixed(1)} % · ` +
    `TIR ${e.tir != null ? (e.tir * 100).toFixed(1) + " %" : "n/d"}`);
}
for (const e of edificios) {
  const d = e.detalle;
  console.log(`  ${e.nombre}: ${d.presupuesto.length} capítulos de obra, ` +
    `${d.presupuesto.reduce((a, f) => a + f.partidas.length, 0)} partidas, ` +
    `${d.areas ? d.areas.unidades.length + " unidades" : d.modelos.length + " modelos"}, ` +
    `${d.flujo ? d.flujo.actividades.length + " actividades de caja" : "sin flujo"}`);
}
console.log(`  ${edificios.length} promociones · ` +
  `${totales.uds} unidades · margen conjunto ${(totales.margen * 100).toFixed(1)} %`);
