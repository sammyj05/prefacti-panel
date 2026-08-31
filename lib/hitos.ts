import { EDIFICIOS, type Edificio } from "./data";
import { HOY } from "./equipo";

/**
 * El cronograma de una promoción.
 *
 * Estaba escrito dos veces —en la pantalla de Hitos y en la aplicación de
 * móvil— y las dos partían de la misma línea:
 *
 *     const inicio = new Date(2024, i * 2, 1);
 *
 * Un ancla fija en 2024 y un desfase por posición en la lista. Eso tenía dos
 * problemas, y los dos se veían en pantalla.
 *
 * El primero es que envejece. El «hoy» del panel está en agosto de 2026, así
 * que todos los hitos de las dos promociones quedaban por detrás y la pantalla
 * abría diciendo «10 hitos por detrás de su fecha»: no describía la cartera,
 * describía la distancia entre el ancla y el calendario.
 *
 * El segundo es que se contradecía con el resto del producto. La promoción trae
 * sus fechas —cuándo empieza la preventa, cuándo arranca la obra y cuánto dura—
 * y de ellas sale el flujo de caja que se enseña en el simulador y en los
 * gráficos. El calendario iba por su cuenta: decía que la obra empezó en
 * octubre de 2024 mientras el modelo la descuenta desde septiembre de 2026.
 *
 * Aquí los hitos salen de esas mismas fechas, así que las dos pantallas cuentan
 * lo mismo y el cronograma se mueve cuando se mueve el estudio.
 */
export type EstadoHito = "cumplido" | "previsto" | "atrasado";
export type Hito = { n: string; d: Date; estado: EstadoHito };

export const NOMBRES_HITO = [
  "Compra del terreno", "Anteproyecto", "Permiso de construcción", "Inicio de obra",
  "Inicio de preventa", "Obra gruesa", "Permiso de ocupación", "Cierre de ventas",
] as const;

/* Los hitos ya cubiertos por la etapa en la que está la promoción se dan por
   cumplidos aunque la fecha aún no haya llegado; los que la etapa deja atrás y
   la fecha también, están atrasados. Es la misma regla que usaría cualquiera
   leyendo la ficha: el estado manda sobre el calendario. */
const ETAPA_ALCANCE: Record<string, number> = {
  "En estudio": 1, Aprobado: 3, Activo: 5, Finalizado: 8, Archivado: 8,
};

/* `new Date("2026-09-01")` se interpreta como medianoche UTC, que en Panamá es
   el 31 de agosto: un hito entero de diferencia por una zona horaria. Partido a
   mano cae siempre en el día que dice la cadena. */
function fecha(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

function masMeses(d: Date, meses: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + meses);
  return r;
}

/**
 * Los ocho hitos de una promoción, con su estado.
 *
 * El ancla es el inicio de obra, que es la fecha alrededor de la cual se ordena
 * una promoción: antes van el terreno, el anteproyecto y el permiso; después la
 * obra gruesa, la ocupación y el cierre de ventas, repartidos sobre el periodo
 * de construcción que trae el estudio. El inicio de preventa no se estima —es
 * un dato del estudio— y por eso puede caer antes o después del arranque de
 * obra, que es justo lo que distingue una promoción que vende sobre plano de
 * una que vende terminada.
 */
export function hitosDe(e: Edificio, hoy: Date = HOY): Hito[] {
  const c = e.detalle?.comercial ?? null;
  const obra = fecha(c?.inicioConstruccion);
  const preventa = fecha(c?.fechaPreventa);
  const meses = Number(c?.periodoConstruccion) || 24;

  /* Sin fecha de obra no hay de dónde colgar el cronograma. Se toma la
     preventa, y si tampoco está, el «hoy» del panel: una promoción sin fechas
     sale con el calendario por delante, que es lo que es. */
  const cero = obra ?? preventa ?? hoy;

  const cuando: Date[] = [
    masMeses(cero, -18),                        // compra del terreno
    masMeses(cero, -12),                        // anteproyecto
    masMeses(cero, -2),                         // permiso de construcción
    cero,                                       // inicio de obra
    preventa ?? masMeses(cero, -3),             // inicio de preventa
    masMeses(cero, Math.round(meses * 0.6)),    // obra gruesa
    masMeses(cero, meses),                      // permiso de ocupación
    masMeses(cero, meses + 6),                  // cierre de ventas
  ];

  const alcance = ETAPA_ALCANCE[e.etapa] ?? 0;
  return NOMBRES_HITO.map((n, k) => {
    const d = cuando[k];
    const cubierto = k < alcance;
    const vencido = +d < +hoy;
    return { n, d, estado: cubierto ? "cumplido" : vencido ? "atrasado" : "previsto" };
  });
}

/** La cartera entera con su cronograma, en el orden en que llega. */
export const CRONOGRAMA = EDIFICIOS.map(e => ({ e, h: hitosDe(e) }));
