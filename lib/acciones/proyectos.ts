"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteServidor, quienPregunta } from "@/lib/supabase/servidor";
/* El motor es JavaScript sin tipos y se copia tal cual del producto: ver
   `lib/motor/LEEME.md`. `allowJs` está puesto en el tsconfig, así que entra sin
   fricción; lo que devuelve se trata como `any` a propósito, porque tipar aquí
   una forma que se mantiene allá sería inventarse un contrato. */
import { calcularFactibilidad, defaultDatosTorre, defaultDatosCasas } from "@/lib/motor/calculations.js";
import { calcularMetricasRetorno } from "@/lib/motor/metricasRetorno.js";
import PLANTILLAS from "@/lib/motor/plantillas.json";

/**
 * Crear una promoción.
 *
 * Escribe dos filas y las dos hacen falta: la promoción y su primera versión.
 * Una promoción sin versión no tiene estudio, así que la ficha se abriría
 * vacía y sin forma de arreglarlo desde la interfaz.
 *
 * El estudio arranca del mismo molde que usa el producto —`defaultDatosTorre`
 * y `defaultDatosCasas` del motor— y se calcula con el motor de verdad, el
 * mismo que generó la cartera de demostración. Sale en ceros, y eso es lo
 * correcto: una promoción recién creada no tiene unidades ni presupuesto, así
 * que no tiene ingreso ni coste. Inventar cifras de arranque sería peor —se
 * pareceria a un estudio y no lo es.
 *
 * La versión nace **sin publicar**. Publicada quiere decir «esto ya no cambia
 * y se puede comparar contra otra», y un molde vacío no es eso.
 */
export async function crearProyecto(formulario: FormData) {
  const yo = await quienPregunta();
  if (!yo?.empresaActiva) redirect("/entrar");

  /* El rol se comprueba aquí además de en la base. RLS es lo que de verdad lo
     impide —una acción de servidor se puede llamar sin pasar por la pantalla—
     pero fallar aquí da un mensaje que se entiende, y no un error de política. */
  if (yo.rol !== "admin" && yo.rol !== "editor") {
    return { error: "Tu permiso no deja crear promociones. Pídeselo a un administrador." };
  }

  const nombre = String(formulario.get("nombre") ?? "").trim();
  const tipo = String(formulario.get("tipo") ?? "torre");
  const estado = String(formulario.get("estado") ?? "En estudio");
  const ubicacion = String(formulario.get("ubicacion") ?? "").trim() || null;

  if (nombre.length < 2) return { error: "Escribe el nombre de la promoción." };
  if (tipo !== "torre" && tipo !== "casas") return { error: "El tipo no es válido." };

  const sb = await clienteServidor();

  const { data: proyecto, error } = await sb
    .from("proyecto")
    .insert({ empresa_id: yo.empresaActiva, nombre, tipo, estado, ubicacion, creado_por: yo.id })
    .select("id")
    .single();

  if (error) return { error: `No pude crear la promoción: ${error.message}` };

  /* De dónde arranca el estudio.
     En blanco es honesto pero inútil: una promoción sin cuadro de áreas ni
     presupuesto sale en ceros y no hay nada que mirar, así que lo primero que
     hace falta —y lo que más cuesta— es tener por dónde empezar. La plantilla
     es el estudio real que trae el producto para cada tipo: capítulos y
     partidas con su medición, tipologías con su precio por m², actividades de
     obra con su reparto y los parámetros de financiación. Se copia entero y se
     edita encima, que es como se hace una factibilidad de verdad. */
  const desde = String(formulario.get("desde") ?? "plantilla");
  const plantilla = (PLANTILLAS as Record<string, { datos: unknown }>)[tipo]?.datos;

  const inputs = desde === "blanco" || !plantilla
    ? (tipo === "torre" ? defaultDatosTorre() : defaultDatosCasas())
    : structuredClone(plantilla);

  const resultado = calcularFactibilidad(inputs, tipo);
  /* Y con el resultado, el retorno: VAN, TIR, recuperación y capital propio
     máximo salen del flujo, no de la cuenta, así que van en su propia pasada. */
  const retornoBruto = calcularMetricasRetorno({
    datos: inputs, resultado, tipo,
    params: (inputs as { flujoParams?: unknown }).flujoParams,
  }) as unknown as { metricas?: Record<string, number | string | null> };
  /* `metricas` trae también `tirMotivo`, que es texto: por eso el registro
     admite cadenas y las cifras se leen una a una más abajo. */
  const m = (retornoBruto?.metricas ?? {}) as Record<string, number | null>;

  /* La misma forma que guarda la siembra, para que la lectura sea una sola.
     Las colecciones van vacías en vez de ausentes: `null` y «todavía nada» se
     confunden al leer, y las pantallas ya saben pintar una lista vacía. */
  const i = inputs as Record<string, unknown>;
  const r = resultado as Record<string, number>;
  const ventas = Math.round(r.totalIngresos ?? 0);
  const costo = Math.round(r.costoTotal ?? 0);
  const utilidad = Math.round(r.utilidad ?? 0);

  const areas = i.cuadroAreas as { niveles?: unknown[] } | undefined;
  const ent = i.inputs as Record<string, number> | undefined;
  const plantas = areas?.niveles?.length ?? 0;

  const datos = {
    ...(i as object),
    resultado,
    retorno: m,
    /* Las cifras de cabecera, que son las que pintan la tarjeta de cartera y la
       ficha. Se guardan calculadas para no tener que abrir el árbol entero cada
       vez que se lista la cartera. */
    cabecera: {
      floors: plantas,
      alturaM: Math.round(plantas * 3.2 * 10) / 10,
      gba: Math.round(ent?.areaConstruccion ?? 0),
      gla: Math.round((ent?.areaVentaApt ?? 0) + (ent?.areaVentaLocales ?? 0)),
      unidades: ent?.cantApartamentos ?? 0,
      ventas, costo, utilidad,
      margen: ventas > 0 ? Math.round((utilidad / ventas) * 1e4) / 1e4 : 0,
      roi: costo > 0 ? Math.round((utilidad / costo) * 1e4) / 1e4 : 0,
      tir: m.tirAnual ?? null,
      van: Math.round(m.van ?? 0),
      exposicion: Math.round(m.capitalPropioMax ?? 0),
    },
    massing: [],
  };

  const { error: errV } = await sb.from("version").insert({
    proyecto_id: proyecto.id,
    empresa_id: yo.empresaActiva,
    datos,
    notas: desde === "blanco"
      ? "Estudio nuevo, sin datos cargados."
      : `Partido de la plantilla de ${tipo === "torre" ? "torre" : "casas"}. Las cifras son de arranque: se editan.`,
    editado_por: yo.email,
    publicada: false,
  });

  if (errV) {
    /* La promoción quedó creada y su estudio no. Se deshace en vez de dejar una
       fila que la ficha no sabe abrir. */
    await sb.from("proyecto").delete().eq("id", proyecto.id);
    return { error: `No pude crear el estudio: ${errV.message}` };
  }

  await sb.from("bitacora").insert({
    empresa_id: yo.empresaActiva,
    proyecto_id: proyecto.id,
    usuario: yo.email,
    rol: yo.rol,
    accion: "Creó la promoción",
    detalle: nombre,
  });

  revalidatePath("/proyectos");
  redirect("/proyectos");
}
