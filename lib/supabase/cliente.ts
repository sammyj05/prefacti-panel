"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * El cliente del navegador.
 *
 * Se crea uno por llamada y no un singleton de módulo a propósito: el cliente
 * guarda la sesión, y un singleton creado durante el renderizado del servidor
 * se quedaría con la sesión de quien pintó esa página. En el navegador la
 * creación es barata —no abre conexión, sólo guarda dos cadenas— así que no hay
 * nada que ahorrar cacheándolo.
 *
 * Las dos variables llevan `NEXT_PUBLIC_` porque viajan al navegador, y eso es
 * correcto: la `anon key` está pensada para ser pública. Lo que impide que
 * alguien con esa clave lea la cartera de otra empresa no es el secreto de la
 * clave, es RLS.
 */
export function clienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** Si no hay proyecto configurado, la aplicación sigue con la cartera local. */
export const HAY_SUPABASE = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
