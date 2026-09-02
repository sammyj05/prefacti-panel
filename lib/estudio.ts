import type { Edificio } from "./data";

/**
 * De lo que guarda la base a lo que pinta la ficha.
 *
 * La versión guarda el estudio tal como lo maneja el producto: el presupuesto
 * como árbol de fases y subfases, el cuadro de áreas como niveles con unidades
 * dentro, y el flujo como actividades con su reparto mensual. La ficha lo
 * quiere aplanado: capítulos con partidas, una lista de unidades, y la curva de
 * caja ya sumada por mes.
 *
 * Estas tres funciones son las mismas que usa `scripts/generar-cartera.mjs`
 * para escribir la cartera de demostración. Se repiten aquí —y no se importan
 * de allá— porque aquel guion se ejecuta a mano contra el repositorio del
 * producto y no forma parte de la aplicación. Si el aplanado cambiara, cambia
 * en los dos sitios; son cuarenta líneas y la alternativa era que la ficha de
 * la base enseñara algo distinto que la de la demostración.
 */

const redondear = (n: unknown, d = 0) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  const f = 10 ** d;
  return Math.round(x * f) / f;
};

type Fase = {
  nombre?: string; tipo?: string; monto?: number;
  cantidad?: number; unidad?: string; precioUnitario?: number;
  subfases?: Fase[];
};

/** Aplana el árbol de fases del presupuesto y calcula el monto de cada hoja. */
function aplanarPresupuesto(presupuesto: { fases?: Fase[] } | null | undefined) {
  const fases = presupuesto?.fases ?? [];
  const salida = [];
  for (const f of fases) {
    const partidas = (f.subfases ?? []).map(sf => ({
      nombre: sf.nombre ?? "",
      cantidad: redondear(sf.cantidad, 2),
      unidad: sf.unidad || "",
      precioUnitario: redondear(sf.precioUnitario, 2),
      /* El monto no viene calculado en el dato: es cantidad por precio, que es
         como lo compone la aplicación al pintarlo. */
      monto: redondear((sf.cantidad || 0) * (sf.precioUnitario || 0)),
    }));
    /* Un capítulo puede medirse él mismo en vez de desglosarse: los de
       albañilería, electricidad o fontanería van a tanto el metro sobre el área
       construida, sin partidas debajo. Sumando sólo las partidas salían en
       cero, que es justo lo contrario de lo que valen. */
    const propio = (f.cantidad || 0) * (f.precioUnitario || 0);
    const monto = partidas.length
      ? partidas.reduce((a, x) => a + x.monto, 0)
      : propio || (f.monto || 0);
    salida.push({
      nombre: f.nombre ?? "",
      tipo: f.tipo || "directo",
      monto: redondear(monto),
      /* Y si se mide en bloque, esa medición es su única partida: así el precio
         unitario no se pierde. */
      partidas: partidas.length || !propio ? partidas : [{
        nombre: f.nombre ?? "",
        cantidad: redondear(f.cantidad, 2),
        unidad: f.unidad || "",
        precioUnitario: redondear(f.precioUnitario, 2),
        monto: redondear(propio),
      }],
    });
  }
  return salida;
}

type Cuadro = {
  tipologias?: { id?: string; nombre?: string; m2?: number; precioM2?: number }[];
  niveles?: { nombre?: string; unidades?: {
    codigo?: string; tipologiaId?: string; m2?: number; estado?: string; fechaVenta?: string;
  }[] }[];
};

/** El cuadro de áreas: tipologías y unidades con su estado comercial. */
function aplanarAreas(cuadro: Cuadro | null | undefined) {
  if (!cuadro) return null;
  const tipologias = (cuadro.tipologias ?? []).map(t => ({
    id: t.id ?? "", nombre: t.nombre ?? "",
    m2: redondear(t.m2, 2),
    precioM2: redondear(t.precioM2, 2),
  }));
  const unidades = [];
  for (const n of cuadro.niveles ?? []) {
    for (const u of n.unidades ?? []) {
      unidades.push({
        nivel: n.nombre ?? "",
        codigo: u.codigo ?? "",
        tipologia: tipologias.find(t => t.id === u.tipologiaId)?.nombre ?? "",
        m2: redondear(u.m2, 2),
        estado: u.estado ?? "",
        fechaVenta: u.fechaVenta || null,
      });
    }
  }
  /* El recuento por estado es lo primero que se mira de un cuadro de áreas. */
  const porEstado: Record<string, number> = {};
  for (const u of unidades) porEstado[u.estado] = (porEstado[u.estado] ?? 0) + 1;
  return { tipologias, unidades, porEstado, niveles: (cuadro.niveles ?? []).length };
}

/** El cronograma de caja: cada actividad con su reparto mensual. */
function aplanarFlujo(datos: Record<string, unknown>) {
  const acts = (datos.flujoActividades ?? []) as { nombre?: string; total?: number; dist?: number[] }[];
  if (!acts.length) return null;
  const horizonte = Math.max(...acts.map(a => (a.dist ?? []).length), 0);
  const actividades = acts.map(a => ({
    nombre: a.nombre ?? "",
    total: redondear(a.total),
    /* El reparto va en porcentaje del total de la actividad, mes a mes. */
    dist: (a.dist ?? []).map(x => redondear(x, 4)),
  }));
  /* Y el egreso agregado de la obra por mes, que es la curva que se dibuja. */
  const porMes = Array.from({ length: horizonte }, (_, m) =>
    redondear(actividades.reduce((a, x) => a + x.total * (x.dist[m] ?? 0), 0)));
  return { horizonte, actividades, porMes, params: (datos.flujoParams ?? null) as never };
}

/**
 * La promoción entera, lista para la ficha.
 *
 * El color no sale del dato: se reparte por la posición en la cartera, igual
 * que en la de demostración, para que dos promociones nunca compartan tinte y
 * ninguna cambie de color al filtrar o reordenar.
 */
export function edificioDesdeDatos(
  p: { id: string; nombre: string; tipo: string; estado: string; ubicacion: string | null },
  datos: Record<string, unknown> | null,
  indice = 0,
): Edificio {
  const d = datos ?? {};
  const c = (d.cabecera ?? {}) as Record<string, number | null>;
  const tinte = `color-mix(in srgb, rgb(var(--tinta-950)) ${100 - (indice % 6) * 16}%, rgb(var(--minio-600)))`;

  return {
    id: p.id,
    nombre: p.nombre,
    distrito: p.ubicacion ?? "",
    tipo: p.tipo === "casas" ? "Casas" : "Torre residencial",
    etapa: p.estado,
    floors: Number(c.floors ?? 0),
    alturaM: Number(c.alturaM ?? 0),
    gba: Number(c.gba ?? 0),
    gla: Number(c.gla ?? 0),
    unidades: Number(c.unidades ?? 0),
    ventas: Number(c.ventas ?? 0),
    costo: Number(c.costo ?? 0),
    utilidad: Number(c.utilidad ?? 0),
    margen: Number(c.margen ?? 0),
    roi: Number(c.roi ?? 0),
    tir: c.tir == null ? null : Number(c.tir),
    van: Number(c.van ?? 0),
    exposicion: Number(c.exposicion ?? 0),
    color: tinte,
    colorHex: "#1056c8",
    massing: (d.massing ?? []) as never,
    detalle: {
      datos: (datos ?? null) as never,
      params: (d.params ?? null) as never,
      inputs: (d.inputs ?? null) as never,
      chequeos: (d.chequeos ?? null) as never,
      presupuesto: aplanarPresupuesto(d.presupuesto as { fases?: Fase[] }),
      presupuestos: [],
      areas: aplanarAreas(d.cuadroAreas as Cuadro),
      flujo: aplanarFlujo(d),
      modelos: (d.modelos ?? []) as never,
      etapas: (d.etapas ?? []) as never,
      comercial: (d.comercial ?? null) as never,
      resultado: (d.resultado ?? {}) as never,
      retorno: (d.retorno ?? null) as never,
    },
  } as Edificio;
}
