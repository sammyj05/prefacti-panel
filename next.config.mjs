/**
 * @type {import('next').NextConfig}
 *
 * `distDir` sale de una variable de entorno porque el proyecto se sirve en tres
 * puertos a la vez —escritorio, móvil y volumen— y `next dev` escribe su caché
 * en `.next`. Tres procesos sobre la misma carpeta se pisan el manifiesto: el
 * síntoma es un `TypeError: Cannot read properties of undefined (reading
 * 'entryCSSFiles')` y rutas sueltas devolviendo 404 sin motivo aparente.
 *
 * Con una carpeta por proceso cada uno tiene su caché y no se estorban.
 *
 * `next build` también lleva la suya, y por el mismo motivo: si construye en
 * `.next` mientras un `next dev` está sirviendo desde ahí, la construcción le
 * borra los trozos al servidor de desarrollo y todo `/_next/static/*` empieza a
 * devolver 404. La página llega entera en HTML pero sin hoja de estilo ni
 * JavaScript, así que se ve el texto en blanco y negro y nada responde.
 *
 * Por eso las carpetas están escritas en los guiones de `package.json` y no se
 * pasan a mano: acordarse de una variable de entorno cada vez no es un plan.
 */
export default {
  reactStrictMode: true,
  transpilePackages: ['three'],
  distDir: process.env.NEXT_DIST_DIR || '.next',
};
