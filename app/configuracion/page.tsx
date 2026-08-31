"use client";

import { useState } from "react";
import {
  Building2, Check, HelpCircle, LogOut, Mail, Settings, ShieldCheck,
} from "lucide-react";
import { EQUIPO, ROLES, UMBRALES, nombreRol, responsableDe } from "@/lib/equipo";
import { BITACORA } from "@/lib/data";
import { nombreIndustria, useEmpresas } from "@/lib/empresas";
import { EDIFICIOS } from "@/lib/data";
import { pct, moneyC } from "@/lib/format";
import { Pagina, Avatar } from "@/components/Pagina";
import { SelectorEstilo } from "@/components/SelectorEstilo";
import { SelectorForma } from "@/components/SelectorForma";
import { DENSIDADES, INICIOS, usePreferencias } from "@/lib/preferencias";
import { Boton, Marbete, Pestanas, Vacio } from "@/components/ui";
import { useRouter } from "next/navigation";
import { HAY_SUPABASE, clienteNavegador } from "@/lib/supabase/cliente";

/**
 * Configuración.
 *
 * Eran cuatro preferencias de presentación —densidad, moneda, decimales— y
 * nada más. Ninguna cambia una decisión; todas juntas dicen que la aplicación
 * no tiene reglas propias.
 *
 * Las reglas sí existen, y estaban escondidas en `lib/alertas.ts`: el 15 % de
 * margen, el 20 % de TIR y los 30 M de exposición con los que se decide qué se
 * avisa. Enseñarlas aquí, con el número de promociones que cada una marca hoy,
 * convierte esta pantalla en la política de inversión de la cartera en vez de
 * un cajón de ajustes.
 *
 * Los umbrales se muestran, no se editan: cambiarlos cambiaría el modelo, y el
 * modelo no tiene servidor donde guardarse. Un control que promete guardar y no
 * guarda es peor que un dato en firme.
 */

/* Siete caras, en el orden en que se necesitan: primero quién eres, luego de
   qué empresa, luego quién más entra, y sólo después lo que la aplicación
   decide y cómo se ve. La ayuda va al final porque se busca, no se recorre. */
const CARAS = [
  { k: "cuenta", t: "Cuenta" },
  { k: "empresa", t: "Empresa" },
  { k: "usuarios", t: "Usuarios" },
  { k: "reglas", t: "Reglas" },
  { k: "apariencia", t: "Apariencia" },
  { k: "actividad", t: "Actividad" },
  { k: "ayuda", t: "Ayuda" },
] as const;

/* Quien está usando la aplicación. Sale del equipo mientras no haya sesión de
   verdad; cuando la haya, sale de `perfil` y de `empresa_miembro`. */
const YO = EQUIPO[0];

/* Los atajos que la aplicación escucha de verdad. Enseñar uno que no existe es
   peor que no enseñar ninguno: el que lo prueba deja de fiarse del resto. */
const ATAJOS = [
  ["⌘K", "Abrir el buscador de la cartera"],
  ["⌘J", "Abrir el asistente"],
  ["D", "Ir a la cartera, desde la portada"],
  ["E", "Ir a la entrada, desde la portada"],
  ["Esc", "Cerrar el panel o el menú abierto"],
];

/* Qué significa cada cifra. Es la mitad de las preguntas que recibe una
   herramienta de factibilidad, y la respuesta no cambia nunca. */
const GLOSARIO = [
  ["Margen", "Utilidad sobre ingresos. Lo que queda de cada dólar vendido."],
  ["VAN", "Valor actual neto: la caja futura traída a hoy con la tasa de descuento."],
  ["TIR", "La tasa a la que el VAN sería cero. El retorno repartido en el tiempo."],
  ["Exposición", "El pico de caja negativa. Cuánto capital hay que tener puesto a la vez."],
  ["Recuperación", "El mes en que la caja acumulada vuelve a cero."],
  ["Múltiplo", "Cuántas veces se recupera el capital propio máximo."],
  ["GLA / GBA", "Superficie vendible sobre superficie construida. La eficiencia del proyecto."],
];

export default function Configuracion() {
  /* Tres caras en vez de seis bloques apilados.
     Seis secciones seguidas son una pantalla de dos mil píxeles donde para
     cambiar el canto de las piezas hay que pasar por delante de los umbrales
     del comité y de las cinco personas del equipo. Las tres categorías son las
     que de verdad separan: lo que decide la aplicación, cómo se ve, y quién
     entra. */
  const [cara, setCara] = useState<(typeof CARAS)[number]["k"]>("cuenta");
  const pref = usePreferencias();
  /* La empresa activa, la misma que enseña la banda de arriba. Estaba escrita
     como `EMPRESAS_BASE[0]` en un sitio y `[1]` en otro, así que Usuarios decía
     «Prefacti Development» mientras el conmutador decía «Cartera Aravena». */
  const { activa: empresa } = useEmpresas();
  const router = useRouter();

  const REGLAS = [
    {
      t: "Margen mínimo",
      d: "Por debajo, la promoción no absorbe una desviación de obra del 5 %.",
      v: pct(UMBRALES.margen, 0),
      n: EDIFICIOS.filter(e => e.margen < UMBRALES.margen).length,
      sev: "crítica",
    },
    {
      t: "TIR objetivo",
      d: "Rentable por debajo, pero fuera del objetivo que exige el comité.",
      v: pct(UMBRALES.tir, 0),
      n: EDIFICIOS.filter(e => e.tir !== null && e.tir < UMBRALES.tir && e.margen >= UMBRALES.margen).length,
      sev: "media",
    },
    {
      t: "Exposición máxima",
      d: "Pico de caja negativa que obliga a que la deuda entre a tiempo.",
      v: moneyC(UMBRALES.exposicion),
      n: EDIFICIOS.filter(e => e.exposicion > UMBRALES.exposicion).length,
      sev: "alta",
    },
  ];

  /* El bloque sube de 62 a 76 rem. A 62 terminaba a dos tercios de un monitor y
     el tercio de la derecha se quedaba vacío, que no se lee como medida de
     lectura sino como una pantalla a medio maquetar: aquí las filas son rótulo
     a la izquierda y valor a la derecha, no párrafos, así que el argumento del
     ancho cómodo de lectura no aplica. */
  return (
    <div className="max-w-[76rem]">
      <Pagina icono={Settings}
        titulo="Configuración" bajada="Las preferencias se guardan en este navegador." />

      <Pestanas
        id="config"
        className="-mt-2 mb-7"
        activa={cara}
        alElegir={k => setCara(k as (typeof CARAS)[number]["k"])}
        pestanas={CARAS.map(c => ({ k: c.k, t: c.t }))}
      />

      {cara === "cuenta" && (
      <div className="space-y-5">
      <section className="seccion overflow-hidden rounded-caja">
        <header className="border-b border-trazo-fino px-6 py-4">
          <h2 className="text-[15.5px] font-medio text-tinta-950">Tu cuenta</h2>
          <p className="mt-1 text-[13.5px] text-tinta-500">
            Quién eres dentro de la aplicación y con qué permiso entras.
          </p>
        </header>
        <div className="flex flex-wrap items-center gap-4 border-b border-trazo-fino px-6 py-5">
          <Avatar u={YO.u} n={YO.n} tam={46} />
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-medio text-tinta-950">{YO.n}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[13.5px] text-tinta-500">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {YO.correo}
            </div>
          </div>
          <span className="nota">{nombreRol(YO.permiso)}</span>
        </div>
        {([
          ["Función en la empresa", YO.rol],
          ["Empresa activa", empresa.nombre],
          ["Permiso", nombreRol(YO.permiso)],
        ] as const).map(([k, v]) => (
          <div key={k}
               className="grid gap-1 border-b border-trazo-fino px-6 py-3.5 last:border-0
                          sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
            <span className="text-[13.5px] text-tinta-500">{k}</span>
            <span className="text-[14px] text-tinta-950">{v}</span>
          </div>
        ))}
      </section>

      <section className="seccion overflow-hidden rounded-caja">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <h2 className="text-[15px] font-medio text-tinta-950">Sesión</h2>
            {/* Se dice lo que hay, no lo que gustaría: sin servidor detrás,
                cerrar sesión no cierra nada, y un botón que promete y no cumple
                es peor que la frase que lo explica. */}
            <p className="mt-1 text-[13.5px] text-tinta-500">
              {HAY_SUPABASE
                ? "Cierra la sesión en este navegador. Habrá que volver a entrar."
                : "Todavía no hay sesión de verdad: la cartera es de demostración y vive en este navegador."}
            </p>
          </div>
          {/* El botón sólo existe cuando hay a quién cerrarle la sesión. Un
              «Salir» que no saca de ningún sitio es de las cosas que hacen que
              alguien deje de fiarse del resto de la pantalla. */}
          {HAY_SUPABASE ? (
            <Boton
              onClick={async () => {
                await clienteNavegador().auth.signOut();
                router.refresh();
                router.push("/entrar");
              }}
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Salir
            </Boton>
          ) : (
            <span className="flex items-center gap-2 rounded-control border border-trazo-fino
                             px-3 py-2 text-[13.5px] text-tinta-400">
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Salir
            </span>
          )}
        </div>
      </section>
      </div>
      )}

      {cara === "empresa" && (
      <section className="seccion overflow-hidden rounded-caja">
        <header className="border-b border-trazo-fino px-6 py-4">
          <h2 className="flex items-center gap-2 text-[15.5px] font-medio text-tinta-950">
            <Building2 className="h-4 w-4 text-tinta-400" aria-hidden />
            {empresa.nombre}
          </h2>
          <p className="mt-1 text-[13.5px] text-tinta-500">
            La empresa en la que estás trabajando. Cada empresa va aislada de las
            demás: su cartera, su equipo y su bitácora.
          </p>
        </header>
        {([
          ["Industria", nombreIndustria(empresa.industria)],
          ["Ciudad", empresa.ciudad ?? "—"],
          ["País", "Panamá"],
          ["Moneda", "USD"],
          ["Promociones", `${EDIFICIOS.length}`],
          ["Personas con acceso", `${EQUIPO.length}`],
        ] as const).map(([k, v]) => (
          <div key={k}
               className="grid gap-1 border-b border-trazo-fino px-6 py-3.5 last:border-0
                          sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
            <span className="text-[13.5px] text-tinta-500">{k}</span>
            <span className="text-[14px] tabular-nums text-tinta-950">{v}</span>
          </div>
        ))}
        <p className="border-t border-trazo-fino px-6 py-3 text-[12.5px] text-tinta-400">
          De sólo lectura: editar los datos de la empresa necesita servidor.
        </p>
      </section>
      )}

      {cara === "actividad" && (
      <section className="seccion overflow-hidden rounded-caja">
        <header className="border-b border-trazo-fino px-6 py-4">
          <h2 className="text-[15.5px] font-medio text-tinta-950">Actividad</h2>
          <p className="mt-1 text-[13.5px] text-tinta-500">
            Quién ha tocado qué y cuándo, en toda la empresa.
          </p>
        </header>
        {BITACORA.length === 0 ? (
          <div className="px-6 py-8">
            {/* Vacío de verdad, no un vacío de relleno: la cartera de
                demostración se genera de una vez y nadie la ha editado, así que
                no hay nada que contar. Se llenará sola en cuanto haya base. */}
            <Vacio
              titulo="Sin actividad registrada"
              detalle="Se anota sola en cuanto alguien crea una promoción, publica una versión o sube un documento."
            />
          </div>
        ) : (
          BITACORA.slice(0, 30).map((b, i) => (
            <div key={i} className="flex items-baseline gap-4 border-b border-trazo-fino
                                    px-6 py-3.5 last:border-0">
              <span className="text-[14px] text-tinta-950">{b.a}</span>
              <span className="ml-auto nota shrink-0">{b.u}</span>
            </div>
          ))
        )}
      </section>
      )}

      {cara === "ayuda" && (
      <div className="space-y-5">
      <section className="seccion overflow-hidden rounded-caja">
        <header className="border-b border-trazo-fino px-6 py-4">
          <h2 className="flex items-center gap-2 text-[15.5px] font-medio text-tinta-950">
            <HelpCircle className="h-4 w-4 text-tinta-400" aria-hidden />
            Atajos de teclado
          </h2>
        </header>
        {ATAJOS.map(([k, d]) => (
          <div key={k}
               className="flex items-center gap-4 border-b border-trazo-fino px-6 py-3
                          last:border-0">
            <kbd className="grid h-6 min-w-[1.75rem] place-items-center rounded-control
                            border border-trazo-fino px-1.5 font-mono text-[11.5px]
                            text-tinta-600">{k}</kbd>
            <span className="text-[13.5px] text-tinta-500">{d}</span>
          </div>
        ))}
      </section>

      <section className="seccion overflow-hidden rounded-caja">
        <header className="border-b border-trazo-fino px-6 py-4">
          <h2 className="text-[15.5px] font-medio text-tinta-950">Qué significa cada cifra</h2>
          <p className="mt-1 text-[13.5px] text-tinta-500">
            Las mismas definiciones que usa el cálculo, no una aproximación.
          </p>
        </header>
        {GLOSARIO.map(([k, d]) => (
          <div key={k}
               className="grid gap-1 border-b border-trazo-fino px-6 py-3.5 last:border-0
                          sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
            <span className="text-[14px] font-medio text-tinta-950">{k}</span>
            <span className="text-[13.5px] leading-relaxed text-tinta-500">{d}</span>
          </div>
        ))}
      </section>
      </div>
      )}

      {cara === "reglas" && (
      <div className="space-y-5">
      {/* 1 — Las reglas. Es lo que de verdad configura la aplicación. */}
      <section className="seccion overflow-hidden rounded-caja">
        <header className="border-b border-trazo-fino px-6 py-4">
          <h2 className="text-[15.5px] font-medio text-tinta-950">Umbrales del comité</h2>
          <p className="mt-1 text-[13.5px] text-tinta-500">
            Con estos tres números decide la aplicación qué avisar.
          </p>
        </header>

        {REGLAS.map(r => (
          <div key={r.t}
            className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-trazo-fino
                       px-6 py-5 last:border-0">
            <div className="min-w-[220px] flex-1">
              <h3 className="text-[14.5px] font-medio text-tinta-950">{r.t}</h3>
              <p className="mt-1 text-[13.5px] text-tinta-500">{r.d}</p>
            </div>
            <span className="cifra text-[28px] text-tinta-950">{r.v}</span>
            <span className="w-[190px] shrink-0 text-right text-[13px] text-tinta-400">
              {r.n === 0
                ? "ninguna promoción la incumple"
                : `${r.n} ${r.n === 1 ? "promoción" : "promociones"} · alerta ${r.sev}`}
            </span>
          </div>
        ))}

        <p className="border-t border-trazo-fino px-6 py-4 text-[12.5px] text-tinta-400">
          De sólo lectura: cambiarlos cambiaría el modelo, y no hay servidor donde guardarlo.
        </p>
      </section>

      <section className="seccion rounded-caja px-5 py-5 sm:px-6">
        <h3 className="text-[14.5px] font-medio text-tinta-950">Sobre los colores de los datos</h3>
        <p className="mt-2 max-w-[74ch] text-[13.5px] leading-relaxed text-tinta-500">
          El color de cada promoción es fijo y sigue a la promoción, no a su posición en la lista.
          El orden de las seis ranuras está validado contra las tres formas de daltonismo y contra
          el contraste del fondo, así que filtrar o reordenar nunca repinta un proyecto que el
          lector ya aprendió a reconocer.
        </p>
      </section>
      </div>
      )}

      {cara === "usuarios" && (
      <div className="space-y-5">
      <section className="seccion overflow-hidden rounded-caja">
        <header className="border-b border-trazo-fino px-6 py-4">
          <h2 className="text-[15.5px] font-medio text-tinta-950">Quién entra</h2>
          <p className="mt-1 text-[13.5px] text-tinta-500">
            {EQUIPO.length} personas en {empresa.nombre}. Cada una con su
            permiso y con lo que lleva de la cartera.
          </p>
        </header>
        {EQUIPO.map(p => {
          const suyos = EDIFICIOS.filter(e => responsableDe(e.id).u === p.u).length;
          return (
            <div key={p.u}
                 className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-trazo-fino
                            px-6 py-4 last:border-0">
              <Avatar u={p.u} n={p.n} tam={34} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14.5px] font-medio text-tinta-950">{p.n}</span>
                  {/* El propietario se marca porque es el único que no se puede
                      quitar: sin él la empresa se queda sin administrador. */}
                  {p.propietario && <Marbete tono="bien">Propietario</Marbete>}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-tinta-500">
                  <Mail className="h-3 w-3 shrink-0" aria-hidden />
                  {p.correo} · {p.rol}
                </div>
              </div>
              <span className="nota shrink-0">{nombreRol(p.permiso)}</span>
              <span className="shrink-0 text-[13px] text-tinta-400">
                {suyos === 0 ? "toda la cartera" : `${suyos} ${suyos === 1 ? "promoción" : "promociones"}`}
              </span>
            </div>
          );
        })}
        <p className="border-t border-trazo-fino px-6 py-3 text-[12.5px] text-tinta-400">
          Invitar y cambiar permisos necesita servidor. Llega con la base de datos.
        </p>
      </section>

      {/* Qué puede hacer cada permiso. Es la pregunta que sigue a «¿le doy
          editor?» y no estaba escrita en ninguna parte. */}
      <section className="seccion overflow-hidden rounded-caja">
        <header className="border-b border-trazo-fino px-6 py-4">
          <h2 className="flex items-center gap-2 text-[15.5px] font-medio text-tinta-950">
            <ShieldCheck className="h-4 w-4 text-tinta-400" aria-hidden />
            Qué puede hacer cada permiso
          </h2>
        </header>
        {ROLES.map(r => (
          <div key={r.k}
               className="grid gap-1 border-b border-trazo-fino px-6 py-3.5 last:border-0
                          sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
            <span className="text-[14px] font-medio text-tinta-950">{r.t}</span>
            <span className="text-[13.5px] leading-relaxed text-tinta-500">{r.d}</span>
          </div>
        ))}
      </section>
      </div>
      )}

      {cara === "apariencia" && (
      <div className="space-y-5">
      {/* 3 — El estilo. Es lo primero que alguien quiere tocar y estaba
             cerrado: cuatro paletas hechas y ninguna forma de elegirlas. */}
      <section className="seccion overflow-hidden rounded-caja">
        <header className="border-b border-trazo-fino px-6 py-4">
          <h2 className="text-[15.5px] font-medio text-tinta-950">Estilo</h2>
          <p className="mt-1 text-[13.5px] text-tinta-500">
            Cambia el juego de color entero, no sólo el acento. Se aplica al instante
            y se recuerda en este navegador.
          </p>
        </header>
        <div className="px-6 py-5">
          <SelectorEstilo />
        </div>
      </section>

      {/* 3 bis — La forma. Tres ejes independientes: el canto de las piezas,
          cómo se despegan del papel y con qué letra está compuesto todo. Van
          aparte del color porque son decisiones que no se toman juntas: hay
          quien quiere canto vivo con la letra de siempre, y al revés. */}
      <section className="seccion overflow-hidden rounded-caja">
        <header className="border-b border-trazo-fino px-6 py-4">
          <h2 className="text-[15.5px] font-medio text-tinta-950">Forma</h2>
          <p className="mt-1 text-[13.5px] text-tinta-500">
            El canto, la superficie y la letra. Cada muestra ya lleva puesto lo
            que va a cambiar; se aplica al instante y se recuerda en este
            navegador.
          </p>
        </header>
        <div className="px-6 py-5">
          <SelectorForma />
        </div>
      </section>

      {/* 4 — Presentación.
          Quedan dos de las cuatro que había. Las otras dos —moneda y
          decimales— se guardaban y no las leía nadie: cuatro interruptores que
          se marcaban y no cambiaban una sola cosa de la aplicación. Éstas dos
          sí: la densidad va como atributo del `<html>` y baja la altura de fila
          de todas las tablas, y la vista de inicio es a dónde llevan la entrada
          y los enlaces de demostración de la portada. */}
      <section className="seccion overflow-hidden rounded-caja">
        <header className="border-b border-trazo-fino px-6 py-4">
          <h2 className="text-[15.5px] font-medio text-tinta-950">Presentación</h2>
          <p className="mt-1 text-[13.5px] text-tinta-500">
            Se aplican al instante y se recuerdan en este navegador.
          </p>
        </header>

        <FilaOpcion titulo="Densidad" detalle="Altura de fila en tablas y listas.">
          {DENSIDADES.map(d => (
            <Opcion key={d.k} on={pref.densidad === d.k} onClick={() => pref.poner("densidad", d.k)}>
              {d.t}
            </Opcion>
          ))}
        </FilaOpcion>

        <FilaOpcion titulo="Vista de inicio" detalle="A dónde llevan «Entrar» y los enlaces de demostración.">
          {INICIOS.map(i => (
            <Opcion key={i.k} on={pref.inicio === i.k} onClick={() => pref.poner("inicio", i.k)}>
              {i.t}
            </Opcion>
          ))}
        </FilaOpcion>
      </section>
      </div>
      )}
    </div>
  );
}

/** Una fila de preferencia: rótulo y explicación a la izquierda, opciones a la derecha. */
function FilaOpcion({ titulo, detalle, children }: {
  titulo: string; detalle: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-trazo-fino px-6 py-4 last:border-0">
      <div className="min-w-[200px] flex-1">
        <h3 className="text-[14.5px] font-medio text-tinta-950">{titulo}</h3>
        <p className="mt-0.5 text-[13px] text-tinta-500">{detalle}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Opcion({ on, onClick, children }: {
  on: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13.5px] transition
        ${on ? "bg-tinta-950 font-medio text-hueso"
             : "bg-hueso-mesa text-tinta-700 hover:text-tinta-950"}`}>
      {on && <Check className="h-3.5 w-3.5" aria-hidden />}{children}
    </button>
  );
}
