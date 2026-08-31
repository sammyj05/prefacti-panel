#!/usr/bin/env node
/**
 * Siembra la cartera en Supabase.
 *
 *   node scripts/sembrar-supabase.mjs
 *
 * Lee `.env.local`, comprueba que el esquema está aplicado y sube la cartera
 * que hoy vive en `lib/portfolio.json`: una empresa, sus promociones y, por
 * cada una, una versión publicada con el estudio entero dentro de `datos`.
 *
 * Va con la clave de servicio y no con la anónima a propósito: sembrar es
 * escribir filas de una empresa a la que todavía no pertenece nadie, y RLS —que
 * es justo lo que tiene que impedir eso— lo bloquearía. La clave de servicio se
 * salta RLS, por eso este guion se ejecuta a mano desde la máquina de quien
 * administra y nunca desde la aplicación.
 *
 * Es idempotente: vuelve a ejecutarse sin duplicar. Busca la empresa por nombre
 * y las promociones por (empresa, nombre); lo que ya está, se actualiza.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ entorno */

function leerEnv(ruta = ".env.local") {
  let texto;
  try {
    texto = readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8");
  } catch {
    salir(
      `No encuentro ${ruta}.`,
      "Copia `.env.local.example` a `.env.local` y rellena los tres valores.",
    );
  }
  const env = {};
  for (const linea of texto.split("\n")) {
    const l = linea.trim();
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("=");
    if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  }
  return env;
}

function salir(...lineas) {
  for (const l of lineas) console.error(l);
  process.exit(1);
}

const env = leerEnv();
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL;
const CLAVE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_SB || !CLAVE) {
  salir(
    "Faltan valores en `.env.local`.",
    "Hacen falta NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.",
    "Están en el panel de Supabase, en Project Settings → API.",
  );
}

const sb = createClient(URL_SB, CLAVE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* --------------------------------------------------------------- la cartera */

const cartera = JSON.parse(
  readFileSync(new URL("../lib/portfolio.json", import.meta.url), "utf8"),
);

const EMPRESA = {
  nombre: "Cartera Aravena",
  industria: "desarrollo_inmobiliario",
  ciudad: "Ciudad de Panamá",
  pais: "PA",
};

/* Cómo se llama en la base cada estado de la cartera. Son los mismos valores
   del enumerado `estado_proyecto`, y si alguno no casara la inserción fallaría
   con un error de tipo — que es exactamente lo que se quiere: mejor que reviente
   aquí a que entre un estado que ninguna pantalla sabe pintar. */
const ESTADOS = new Set(["En estudio", "Aprobado", "Activo", "Finalizado", "Archivado"]);

async function main() {
  console.log(`→ ${URL_SB}`);

  /* 1 — ¿está el esquema? Se pregunta por una tabla concreta en vez de fiarse:
         el error de PostgREST cuando falta la tabla es claro y ahorra media
         hora de «no sé por qué no inserta». */
  const { error: falta } = await sb.from("empresa").select("id").limit(1);
  if (falta) {
    salir(
      `\nEl esquema no está aplicado: ${falta.message}`,
      "",
      "Abre el editor SQL de tu proyecto y pega entero el fichero:",
      "  supabase/migrations/20260828000000_esquema_inicial.sql",
      "",
      "Luego vuelve a ejecutar este guion.",
    );
  }

  /* 2 — la empresa. */
  let { data: empresa } = await sb
    .from("empresa").select("id, nombre").eq("nombre", EMPRESA.nombre).maybeSingle();

  if (!empresa) {
    const { data, error } = await sb
      .from("empresa").insert(EMPRESA).select("id, nombre").single();
    if (error) salir(`No pude crear la empresa: ${error.message}`);
    empresa = data;
    console.log(`  empresa creada · ${empresa.nombre}`);
  } else {
    console.log(`  empresa ya estaba · ${empresa.nombre}`);
  }

  /* 3 — las promociones, con su estudio dentro de una versión publicada. */
  let nuevas = 0, actualizadas = 0;

  for (const e of cartera.edificios) {
    if (!ESTADOS.has(e.etapa)) {
      salir(`La promoción «${e.nombre}» trae un estado que la base no conoce: ${e.etapa}`);
    }

    const fila = {
      empresa_id: empresa.id,
      nombre: e.nombre,
      tipo: e.tipo === "Casas" ? "casas" : "torre",
      estado: e.etapa,
      ubicacion: e.distrito,
    };

    const { data: existe } = await sb
      .from("proyecto").select("id")
      .eq("empresa_id", empresa.id).eq("nombre", e.nombre).maybeSingle();

    let proyectoId;
    if (existe) {
      const { error } = await sb.from("proyecto").update(fila).eq("id", existe.id);
      if (error) salir(`No pude actualizar «${e.nombre}»: ${error.message}`);
      proyectoId = existe.id;
      actualizadas++;
    } else {
      const { data, error } = await sb
        .from("proyecto").insert(fila).select("id").single();
      if (error) salir(`No pude crear «${e.nombre}»: ${error.message}`);
      proyectoId = data.id;
      nuevas++;
    }

    /* El estudio entero va como está: cuadro de áreas, presupuesto por
       partidas, flujo mes a mes, resultado y retorno. Es el mismo árbol que
       lee la aplicación hoy, así que no hay conversión que pueda perder nada.
       Se guardan también las cifras de cabecera —las que pinta la tarjeta de
       cartera— para no tener que abrir el jsonb entero sólo para listar. */
    const datos = {
      ...e.detalle,
      cabecera: {
        floors: e.floors, alturaM: e.alturaM, gba: e.gba, gla: e.gla,
        unidades: e.unidades, ventas: e.ventas, costo: e.costo,
        utilidad: e.utilidad, margen: e.margen, roi: e.roi, tir: e.tir,
        van: e.van, exposicion: e.exposicion,
      },
      massing: e.massing,
    };

    const { data: yaHay } = await sb
      .from("version").select("id")
      .eq("proyecto_id", proyectoId).eq("publicada", true)
      .order("creada_en", { ascending: false }).limit(1).maybeSingle();

    const version = {
      proyecto_id: proyectoId,
      empresa_id: empresa.id,
      fecha: new Date().toISOString().slice(0, 10),
      notas: "Carga inicial desde la cartera de demostración.",
      datos,
      editado_por: "siembra",
      publicada: true,
    };

    const { error: errV } = yaHay
      ? await sb.from("version").update(version).eq("id", yaHay.id)
      : await sb.from("version").insert(version);
    if (errV) salir(`No pude guardar la versión de «${e.nombre}»: ${errV.message}`);

    console.log(`  ${existe ? "actualizada" : "creada    "} · ${e.nombre}`);
  }

  console.log(`\n${nuevas} promociones nuevas, ${actualizadas} actualizadas.`);
  console.log("\nSiguiente paso: crea tu usuario en la aplicación y date de alta");
  console.log("en la empresa. Desde el editor SQL de Supabase:\n");
  console.log("  insert into empresa_miembro (empresa_id, usuario_id, usuario_email, rol, is_owner)");
  console.log(`  select '${empresa.id}', id, email, 'admin', true from auth.users where email = 'TU@CORREO';`);
  console.log("\n  update perfil set empresa_activa_id = '" + empresa.id + "'");
  console.log("   where usuario_id = (select id from auth.users where email = 'TU@CORREO');");
}

main().catch(e => salir(`\nSe cayó: ${e.message}`));
