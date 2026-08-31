import { BITACORA, EDIFICIOS } from "./data";

/**
 * El equipo y el reloj.
 *
 * Un panel sin gente ni fechas se lee como una maqueta: dieciocho fichas con
 * las mismas cinco cifras cada una y nada que diga quién las tocó ni cuándo.
 * Lo que distingue una herramienta en uso de una captura de pantalla es
 * precisamente eso — que las filas no son intercambiables.
 *
 * Los cuatro nombres no se inventan aquí: salen de la bitácora del modelo, que
 * ya los traía. Lo único que se añade es el reparto de responsables, y se hace
 * por el orden en que cada persona aparece en la bitácora para que un proyecto
 * que ya tiene actividad de alguien quede a nombre de esa persona.
 */

/** El «hoy» del panel. Fijo: es un modelo, y una fecha real haría que las
 *  mismas cifras contaran otra cosa cada día que se abre. */
export const HOY = new Date(2026, 7, 17);

/**
 * Los cuatro permisos, con el nombre que ya tienen en el producto.
 *
 * Son los mismos valores del enumerado `rol_miembro` de la base
 * (`supabase/migrations`), que a su vez sale de `EmpresaMiembro` en Base44. Se
 * escriben aquí para que la pantalla de Usuarios diga exactamente lo que la
 * base va a permitir, y no una aproximación amable que luego no case.
 */
export const ROLES = [
  { k: "admin", t: "Administrador",
    d: "Todo, incluido invitar gente, cambiar roles y tocar los umbrales." },
  { k: "editor", t: "Editor",
    d: "Crea y edita promociones, publica versiones y sube documentos." },
  { k: "analista", t: "Analista",
    d: "Simula escenarios y compara versiones, pero no publica ni edita el estudio." },
  { k: "visualizador", t: "Lector",
    d: "Ve la cartera y los informes. No cambia nada." },
] as const;

export type Rol = (typeof ROLES)[number]["k"];

/**
 * Quién es cada quien.
 *
 * `rol` es la función dentro de la promotora —de qué se ocupa— y `permiso` es
 * lo que la aplicación le deja hacer. No son lo mismo y confundirlos es lo que
 * lleva a que el de obra no pueda subir un plano: uno lo decide la empresa y el
 * otro la base.
 */
export type Persona = {
  u: string; n: string; rol: string;
  correo: string; permiso: Rol; propietario?: boolean;
};

export const EQUIPO: Persona[] = [
  { u: "SJ", n: "Sam Jaén", rol: "Propietario", correo: "sam@prefacti.com",
    permiso: "admin", propietario: true },
  { u: "MA", n: "Marcela Ayala", rol: "Factibilidad", correo: "marcela@prefacti.com",
    permiso: "editor" },
  { u: "RS", n: "Rodrigo Solís", rol: "Obra y permisos", correo: "rodrigo@prefacti.com",
    permiso: "editor" },
  { u: "JC", n: "Julia Castro", rol: "Comercial", correo: "julia@prefacti.com",
    permiso: "analista" },
  { u: "DN", n: "Diego Núñez", rol: "Financiación", correo: "diego@prefacti.com",
    permiso: "visualizador" },
];

/** El rótulo de un permiso, para pintarlo. */
export function nombreRol(k: Rol) {
  return ROLES.find(r => r.k === k)?.t ?? k;
}

const POR_INICIALES = new Map(EQUIPO.map(p => [p.u, p]));

/* Quién ha tocado cada proyecto, según la bitácora. */
const DE_BITACORA = new Map<string, string>();
for (const b of [...BITACORA].reverse()) DE_BITACORA.set(b.p, b.u);

/* Los que no aparecen en la bitácora se reparten entre los cuatro del equipo
   operativo —el propietario no lleva proyectos— por su posición en la cartera.
   Determinista: el mismo proyecto siempre cae en la misma persona. */
const OPERATIVOS = EQUIPO.filter(p => p.u !== "SJ");

export function responsableDe(id: string): Persona {
  const u = DE_BITACORA.get(id);
  if (u && POR_INICIALES.has(u)) return POR_INICIALES.get(u)!;
  const i = EDIFICIOS.findIndex(e => e.id === id);
  return OPERATIVOS[(i < 0 ? 0 : i) % OPERATIVOS.length];
}

/** El último apunte de bitácora de un proyecto, si lo hay. */
export function ultimoApunte(id: string) {
  return BITACORA.find(b => b.p === id);
}

/** `2026-08-11 09:42` → Date. La bitácora guarda hora local sin zona. */
export function fechaDe(ts: string) {
  const [f, h] = ts.split(" ");
  const [a, m, d] = f.split("-").map(Number);
  const [hh, mm] = h.split(":").map(Number);
  return new Date(a, m - 1, d, hh, mm);
}

const DIA = 86_400_000;

/**
 * Antigüedad en palabras, contra el «hoy» del panel.
 *
 * Corta en semanas y no sigue a meses: por encima de un mes la cifra exacta ya
 * no cambia ninguna decisión, y «hace 7 semanas» se compara peor que la fecha.
 */
export function hace(d: Date): string {
  const ms = +HOY - +d;
  const dias = Math.floor(ms / DIA);
  if (dias < 0) return "en el futuro";
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  const sem = Math.floor(dias / 7);
  if (sem < 5) return `hace ${sem} ${sem === 1 ? "semana" : "semanas"}`;
  return d.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
}

/* -------------------------------------------------------------------------- */

/**
 * Los umbrales del comité.
 *
 * Son los mismos tres números con los que `lib/alertas.ts` decide qué avisar.
 * Viven aquí para que la pantalla de configuración pueda enseñarlos como lo
 * que son —la política de inversión— en vez de repetirlos escritos a mano.
 */
export const UMBRALES = {
  margen: 0.15,
  tir: 0.20,
  exposicion: 30e6,
} as const;
