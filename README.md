# Prefacti · panel

Rediseño del panel de factibilidad inmobiliaria de [Prefacti](https://prefacti.com),
en Next.js 14 con App Router. Portada pública, panel de cartera, ficha de
promoción con su estudio completo, y autenticación real contra Supabase.

## Arrancar

```bash
npm install
npm run dev:moderna     # http://localhost:3003
```

Hay una carpeta de compilación por proceso —está en `next.config.mjs` y explica
por qué—, así que **usa los guiones y no `next dev` a pelo**:

| guion | puerto | para qué |
|---|---|---|
| `npm run dev` | 3000 | la portada clásica |
| `npm run dev:moderna` | 3003 | la portada actual y el panel |
| `npm run dev:movil` | 3001 | la vista de teléfono |
| `npm run dev:volumen` | 3002 | la portada con volumetría 3D |
| `npm run build` | — | compila en `.next-build` |

Si dos procesos escriben en la misma carpeta se pisan el manifiesto: el síntoma
es que todo `/_next/static/*` empieza a devolver 404 y la página llega sin hoja
de estilo ni JavaScript.

## Sin base de datos funciona igual

Sin `.env.local`, la aplicación va con la cartera de demostración que vive en
`lib/portfolio.json` y todo es de lectura. Es el modo en el que se puede tocar
la interfaz sin montar nada.

## Con base de datos

Copia `.env.local.example` a `.env.local` y rellena los tres valores desde el
panel de Supabase (*Project Settings → API*). En cuanto existan:

- el panel exige sesión (`middleware.ts`),
- la cartera y las fichas salen de la base y no del JSON,
- se pueden crear promociones.

Para montar un proyecto desde cero:

1. Pega en el editor SQL de Supabase, en orden, los ficheros de
   `supabase/migrations/`.
2. `node scripts/sembrar-supabase.mjs` — sube la cartera de demostración.
3. `node scripts/alta-usuario.mjs correo@ejemplo.com «contraseña» admin`.

## Cómo está organizado

```
app/                rutas. `page.tsx` decide; el cuerpo con estado vive en components/
components/         interfaz. `ui/` son las primitivas: Boton, Campo, Menu, Pestanas…
lib/
  data.ts           la cartera de demostración, desde lib/portfolio.json
  cartera.ts        la cartera de verdad, leída de Supabase con la sesión
  estudio.ts        traduce lo que guarda la base a lo que pinta la ficha
  motor/            COPIA LITERAL del motor de cálculo del producto — no se edita aquí
  metricas*.ts      qué cifras se pueden elegir en tarjetas y consolidado
  supabase/         clientes de navegador y de servidor
scripts/            guiones que se ejecutan a mano, nunca desde la aplicación
supabase/migrations esquema y políticas RLS
```

### Dos reglas que no son opcionales

1. **`lib/motor/` no se toca.** Es la copia del motor que define qué es el
   margen, cómo se reparte el coste y cómo se descuenta la caja. Dos copias
   divergentes son dos aplicaciones que dan números distintos para el mismo
   estudio. Si hay que cambiar el cálculo, se cambia en el producto y se vuelve
   a copiar. Está explicado en `lib/motor/LEEME.md`.

2. **Quién ve qué lo decide RLS, no la interfaz.** Cada fila lleva su
   `empresa_id` y las políticas de `supabase/migrations` son las que impiden que
   alguien lea la cartera de otra empresa. El código de pantalla nunca es la
   última defensa.

## Convenciones

- Todo en castellano: nombres, comentarios y textos de interfaz.
- Los comentarios explican **por qué**, no qué. Si algo tiene una forma rara,
  suele haber un comentario contando qué se rompía antes.
- Las decisiones de tipografía, color y forma viven en `app/globals.css` como
  variables; Tailwind sólo les pone nombre en `tailwind.config.ts`.
