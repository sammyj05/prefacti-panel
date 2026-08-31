/**
 * ¿Hay proyecto de Supabase configurado?
 *
 * Vive en su propio módulo y no junto a los clientes porque lo pregunta código
 * de servidor y código de navegador, y el de navegador lleva `"use client"`:
 * importar aquélla desde un componente de servidor arrastra la directiva y
 * Next se queja. Es una comprobación de dos variables, así que duplicarla
 * costaría menos que este comentario, pero entonces habría dos sitios donde
 * cambiar el nombre de una variable de entorno.
 */
export const HAY_SUPABASE_SERVIDOR = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
