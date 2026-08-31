#!/usr/bin/env node
/**
 * Da de alta a una persona y la mete en una empresa.
 *
 *   node scripts/alta-usuario.mjs correo@ejemplo.com «contraseña» [rol]
 *
 * El rol es uno de admin | editor | analista | visualizador, y por defecto
 * `admin`. Si la empresa no tiene todavía propietario, quien entra primero lo
 * es — porque una empresa sin propietario es una empresa que nadie puede
 * administrar.
 *
 * Crea la cuenta con el correo ya confirmado. Es lo correcto para la primera
 * persona y para las que se dan de alta a mano: el correo de confirmación
 * existe para probar que quien se registra controla ese buzón, y aquí eso lo
 * está afirmando quien administra el proyecto desde su propia máquina.
 *
 * Es idempotente: si la cuenta ya existe, no la duplica ni le cambia la
 * contraseña; sólo se asegura de que esté dentro de la empresa.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [correo, clave, rol = "admin"] = process.argv.slice(2);

if (!correo || !clave) {
  console.error("Uso: node scripts/alta-usuario.mjs correo@ejemplo.com «contraseña» [rol]");
  process.exit(1);
}
if (!["admin", "editor", "analista", "visualizador"].includes(rol)) {
  console.error(`Rol desconocido: ${rol}`);
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").map(l => l.trim())
    .filter(l => l && !l.startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });

const salir = m => { console.error(m); process.exit(1); };

/* 1 — la cuenta. */
let usuarioId;
const { data: alta, error: errAlta } = await sb.auth.admin.createUser({
  email: correo, password: clave, email_confirm: true,
});

if (errAlta) {
  /* Ya existía: se busca en vez de reventar. Rehacer el alta de alguien que ya
     entra le cambiaría la contraseña sin avisarle. */
  if (!/already been registered|already exists/i.test(errAlta.message))
    salir(`No pude crear la cuenta: ${errAlta.message}`);

  const { data: lista } = await sb.auth.admin.listUsers({ perPage: 200 });
  const ya = lista?.users.find(u => u.email?.toLowerCase() === correo.toLowerCase());
  if (!ya) salir("La cuenta existe pero no la encuentro. Revísalo en el panel.");
  usuarioId = ya.id;
  console.log(`  cuenta ya estaba · ${correo}`);
} else {
  usuarioId = alta.user.id;
  console.log(`  cuenta creada · ${correo}`);
}

/* 2 — la empresa. La primera de la lista si sólo hay una. */
const { data: empresas, error: errEmp } = await sb
  .from("empresa").select("id, nombre").order("creada_en").limit(2);
if (errEmp) salir(`No pude leer las empresas: ${errEmp.message}`);
if (!empresas?.length) salir("No hay ninguna empresa. Ejecuta antes `sembrar-supabase.mjs`.");
if (empresas.length > 1)
  console.log("  aviso · hay más de una empresa; uso la primera:", empresas[0].nombre);
const empresa = empresas[0];

/* 3 — dentro, con su rol. Propietario sólo si la empresa aún no tiene uno. */
const { data: duenos } = await sb
  .from("empresa_miembro").select("id").eq("empresa_id", empresa.id).eq("is_owner", true);

const { error: errMiembro } = await sb.from("empresa_miembro").upsert({
  empresa_id: empresa.id,
  usuario_id: usuarioId,
  usuario_email: correo,
  rol,
  is_owner: !duenos?.length,
  activo: true,
}, { onConflict: "empresa_id,usuario_email" });
if (errMiembro) salir(`No pude meterle en la empresa: ${errMiembro.message}`);

/* 4 — y con esa empresa abierta al entrar. El disparador ya creó el perfil. */
const { error: errPerfil } = await sb.from("perfil").upsert({
  usuario_id: usuarioId, empresa_activa_id: empresa.id,
}, { onConflict: "usuario_id" });
if (errPerfil) salir(`No pude fijar la empresa activa: ${errPerfil.message}`);

console.log(`  dentro de · ${empresa.nombre} · ${rol}${duenos?.length ? "" : " · propietario"}`);
console.log("\nYa puedes entrar en /entrar con ese correo y esa contraseña.");
