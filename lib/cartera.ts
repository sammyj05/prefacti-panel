import { clienteServidor, quienPregunta } from "./supabase/servidor";
import { HAY_SUPABASE_SERVIDOR } from "./supabase/hay";
import { edificioDesdeDatos } from "./estudio";
import type { Edificio } from "./data";

/**
 * La cartera de la empresa que está abierta, leída de la base.
 *
 * Vive aparte de `lib/data` a propósito. Aquélla exporta la cartera de
 * demostración de forma síncrona y la importan casi todas las pantallas en el
 * momento en que se cargan; ésta se lee por petición, en el servidor y con la
 * sesión de quien pregunta, que es la única forma de que RLS pueda hacer su
 * trabajo.
 *
 * De momento sólo se usa para lo que hace falta hoy: saber si la empresa tiene
 * promociones o no. Es lo que decide entre enseñar el panel o la bienvenida, y
 * es también el primer trozo del camino que va de la cartera fija a la de
 * verdad.
 */

/** Las cifras de cabecera del estudio, las que pinta una tarjeta de cartera. */
export type Cabecera = {
  unidades: number; ventas: number; costo: number; utilidad: number;
  margen: number; roi: number; tir: number | null; van: number;
  exposicion: number; gba: number; gla: number; floors: number;
};

const CABECERA_VACIA: Cabecera = {
  unidades: 0, ventas: 0, costo: 0, utilidad: 0, margen: 0, roi: 0,
  tir: null, van: 0, exposicion: 0, gba: 0, gla: 0, floors: 0,
};

/** Lo mínimo para listar y decidir. El estudio completo va en `datos`. */
export type ProyectoBreve = {
  id: string;
  nombre: string;
  tipo: "torre" | "casas";
  estado: string;
  ubicacion: string | null;
  /** De la última versión. En ceros mientras no se haya cargado nada. */
  cifras: Cabecera;
  /** Si la última versión está publicada. Sin publicar, el estudio es borrador. */
  publicada: boolean;
};

export type EstadoCartera =
  /* Sin proyecto de Supabase configurado: la aplicación va con la cartera de
     demostración, como antes. */
  | { modo: "demostracion" }
  /* Con sesión y con promociones dentro. */
  | { modo: "cartera"; proyectos: ProyectoBreve[] }
  /* Con sesión y la empresa recién abierta: no hay nada que enseñar todavía. */
  | { modo: "vacia"; empresa: string | null };

export async function estadoCartera(): Promise<EstadoCartera> {
  if (!HAY_SUPABASE_SERVIDOR) return { modo: "demostracion" };

  const yo = await quienPregunta();
  /* Sin sesión no se llega aquí —el middleware desvía a la entrada— pero si
     llegara, lo honesto es la demostración y no una pantalla vacía que parece
     que se han perdido los datos. */
  if (!yo) return { modo: "demostracion" };

  const sb = await clienteServidor();
  /* Las versiones vienen con la promoción en una sola consulta. Traerlas aparte
     serían dos viajes y un emparejado a mano; así lo hace la base, que es donde
     está el índice. */
  const { data, error } = await sb
    .from("proyecto")
    .select("id, nombre, tipo, estado, ubicacion, version (datos, publicada, creada_en)")
    .order("creado_en");

  /* Un fallo de lectura no puede parecerse a una cartera vacía: lo primero se
     arregla mirando la base y lo segundo creando una promoción, y confundirlos
     manda a quien lo sufre en la dirección contraria. */
  if (error) throw new Error(`No pude leer la cartera: ${error.message}`);

  if (!data?.length) {
    const nombre = yo.empresas.find(m => m.empresa_id === yo.empresaActiva);
    return {
      modo: "vacia",
      empresa: (nombre?.empresa as { nombre?: string } | undefined)?.nombre ?? null,
    };
  }

  type Fila = {
    id: string; nombre: string; tipo: "torre" | "casas"; estado: string;
    ubicacion: string | null;
    version: { datos: { cabecera?: Partial<Cabecera> } | null; publicada: boolean; creada_en: string }[];
  };

  const proyectos: ProyectoBreve[] = (data as unknown as Fila[]).map(f => {
    /* La última por fecha. Se ordena aquí y no en la consulta porque PostgREST
       no ordena la tabla incrustada sin un `order` por relación, y son dos o
       tres versiones por promoción: no compensa la complicación. */
    const ultima = [...(f.version ?? [])]
      .sort((a, b) => b.creada_en.localeCompare(a.creada_en))[0];

    return {
      id: f.id, nombre: f.nombre, tipo: f.tipo, estado: f.estado, ubicacion: f.ubicacion,
      cifras: { ...CABECERA_VACIA, ...(ultima?.datos?.cabecera ?? {}) },
      publicada: Boolean(ultima?.publicada),
    };
  });

  return { modo: "cartera", proyectos };
}

/**
 * El nombre de la empresa abierta, para la banda.
 *
 * Devuelve `null` cuando no hay base o no hay sesión, y en ese caso el
 * conmutador sigue funcionando con la lista local, como hasta ahora.
 */
export async function empresaDeLaSesion(): Promise<{ nombre: string } | null> {
  if (!HAY_SUPABASE_SERVIDOR) return null;
  const yo = await quienPregunta();
  if (!yo?.empresaActiva) return null;
  const m = yo.empresas.find(x => x.empresa_id === yo.empresaActiva);
  const nombre = (m?.empresa as { nombre?: string } | undefined)?.nombre;
  return nombre ? { nombre } : null;
}

/**
 * La promoción entera, lista para la ficha completa.
 *
 * Devuelve el `Edificio` armado desde el `datos` de la última versión, que es
 * lo que la ficha de siempre sabe pintar: desglose, presupuesto con partidas,
 * cuadro de áreas unidad a unidad y caja mes a mes. Antes esto devolvía sólo
 * las cifras de cabecera y la ficha de una promoción de la base se quedaba en
 * un resumen — se veía el margen y no había forma de llegar al presupuesto que
 * lo produce, que es justo para lo que existe la herramienta.
 */
export async function estudioPorId(id: string): Promise<Edificio | null> {
  if (!HAY_SUPABASE_SERVIDOR) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const sb = await clienteServidor();
  const { data } = await sb
    .from("proyecto")
    .select("id, nombre, tipo, estado, ubicacion, creado_en, version (datos, publicada, creada_en)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const f = data as unknown as {
    id: string; nombre: string; tipo: string; estado: string; ubicacion: string | null;
    version: { datos: Record<string, unknown> | null; creada_en: string }[];
  };
  const ultima = [...(f.version ?? [])].sort((a, b) => b.creada_en.localeCompare(a.creada_en))[0];

  return edificioDesdeDatos(
    { id: f.id, nombre: f.nombre, tipo: f.tipo, estado: f.estado, ubicacion: f.ubicacion },
    ultima?.datos ?? null,
  );
}

/** Una promoción de la base, con las cifras de su última versión. */
export async function proyectoPorId(id: string): Promise<ProyectoBreve | null> {
  if (!HAY_SUPABASE_SERVIDOR) return null;
  /* Los identificadores de la cartera de demostración son palabras —«torre»,
     «casas»— y los de la base son UUID. Preguntar por una palabra haría que
     Postgres se quejara del tipo, así que se descarta antes. */
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const sb = await clienteServidor();
  const { data } = await sb
    .from("proyecto")
    .select("id, nombre, tipo, estado, ubicacion, version (datos, publicada, creada_en)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const f = data as unknown as {
    id: string; nombre: string; tipo: "torre" | "casas"; estado: string;
    ubicacion: string | null;
    version: { datos: { cabecera?: Partial<Cabecera> } | null; publicada: boolean; creada_en: string }[];
  };
  const ultima = [...(f.version ?? [])].sort((a, b) => b.creada_en.localeCompare(a.creada_en))[0];

  return {
    id: f.id, nombre: f.nombre, tipo: f.tipo, estado: f.estado, ubicacion: f.ubicacion,
    cifras: { ...CABECERA_VACIA, ...(ultima?.datos?.cabecera ?? {}) },
    publicada: Boolean(ultima?.publicada),
  };
}
