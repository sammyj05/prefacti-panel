"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutGrid, Map, FlaskConical, BarChart3, CalendarDays, FolderOpen,
  Bell, Settings, Search, LogOut, Sparkles, Menu as MenuIcono, X,
} from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import { TemaToggle } from "./TemaToggle";
import { CopilotSidebar } from "./CopilotSidebar";
import { MenuEstilo } from "./SelectorEstilo";
import { SelectorEmpresa } from "./SelectorEmpresa";
import { ALERTAS } from "@/lib/alertas";
import { Cajon, Pista } from "@/components/ui";
import { cx, LENTO, MUELLE } from "@/lib/ui";

/**
 * Los siete destinos.
 *
 * El tono ya no tiñe la pastilla —ahora es papel hundido— sino el icono, que es
 * lo justo para que la sección se reconozca sin que la banda se lea como una
 * botonera de colores.
 */
const NAV = [
  { h: "/proyectos", t: "Proyectos", ic: LayoutGrid, c: "var(--aurora-2)" },
  { h: "/mapa", t: "Mapa", ic: Map, c: "var(--aurora-3)" },
  { h: "/simulador", t: "Simulador", ic: FlaskConical, c: "var(--aurora-4)" },
  { h: "/graficos", t: "Gráficos", ic: BarChart3, c: "var(--aurora-2)" },
  { h: "/hitos", t: "Hitos", ic: CalendarDays, c: "var(--aurora-3)" },
  { h: "/recursos", t: "Recursos", ic: FolderOpen, c: "var(--aurora-4)" },
  { h: "/alertas", t: "Alertas", ic: Bell, n: ALERTAS.length, c: "var(--aurora-1)" },
];

/**
 * Chasis del panel.
 *
 * No hay raíl lateral. Ocupaba 248 px fijos de una pantalla cuyo contenido —una
 * cartera de dieciocho fichas, un mapa, un simulador de dos columnas— es todo
 * ancho, y los gastaba en repetir en cada pantalla una lista de siete enlaces
 * que nadie mira dos veces. En horizontal esos mismos siete caben en la banda
 * superior y devuelven la pantalla entera al trabajo.
 *
 * La banda es papel: superficie casi del color del fondo, un filete de un píxel
 * y el texto en tinta, con el acento reservado para lo que de verdad manda —la
 * pestaña en la que estás. Es lo que hacen las aplicaciones financieras que se
 * miran ocho horas seguidas, y la razón por la que aquí no hay una franja de
 * color cruzando la pantalla.
 *
 * En el teléfono, cajón.
 *
 * La versión anterior metía los siete destinos en una fila con desplazamiento
 * horizontal. Es la solución que se toma cuando no se diseña el móvil: los
 * cuatro últimos quedan fuera de cuadro sin nada que lo indique, y descubrir
 * que existen exige arrastrar una fila que no parece arrastrable. El cajón los
 * enseña los siete de una vez, a tamaño de dedo, con la empresa activa arriba —
 * que en la banda estrecha había desaparecido del todo.
 */
export function AppShell({ children, empresaSesion }: {
  children: React.ReactNode;
  /** La empresa de la sesión, si hay base. La calcula el `layout`. */
  empresaSesion?: { nombre: string } | null;
}) {
  const path = usePathname();
  const [paleta, setPaleta] = useState(false);
  const [copiloto, setCopiloto] = useState(false);
  const [cajon, setCajon] = useState(false);
  const [desplazado, setDesplazado] = useState(false);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); setCopiloto(v => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaleta(true); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  useEffect(() => {
    const on = () => setDesplazado(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  /* Navegar cierra el cajón. Sin esto se queda abierto sobre la pantalla nueva
     y hay que cerrarlo a mano cada vez, que es el fallo más común de un cajón
     de móvil. */
  useEffect(() => { setCajon(false); }, [path]);

  const cerrarCajon = useCallback(() => setCajon(false), []);

  /* Las portadas, la entrada y la versión de móvil no llevan chasis: son otra
     cosa, con su propia composición. Una banda de siete pestañas antes de
     entrar no tiene sentido, y en un teléfono la navegación va abajo. */
  if (path === "/" || path === "/wild" || path === "/clasico" || path === "/entrar" ||
      path.startsWith("/movil") || path.startsWith("/volumen"))
    return <>{children}</>;

  const activo = (h: string) => path === h || path.startsWith(h + "/");
  const seccion = NAV.find(n => activo(n.h));
  /* El tono de la sección en la que se está. Configuración no está en la fila,
     así que cae al azul de marca en vez de dejar la banda sin color. */
  const tono = seccion?.c ?? "var(--aurora-1)";

  return (
    <div className="min-h-screen">
      {/* El salto al contenido. Es el primer elemento del orden de tabulación y
          sólo se ve al recibir foco: sin él, quien navega con teclado recorre
          los siete destinos en cada pantalla antes de llegar a lo que venía a
          leer. */}
      <a href="#principal"
         className="sr-only rounded-[8px] bg-tinta-950 px-4 py-2 text-[14px] font-medio text-hueso
                    focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[600]">
        Saltar al contenido
      </a>

      <header
        className="sticky top-0 z-40 backdrop-blur-xl"
        style={{
          background: "rgb(var(--hueso-alto) / .82)",
          borderBottom: "1px solid var(--trazo-fino)",
          /* La sombra sólo aparece cuando hay contenido por debajo: en reposo la
             banda es parte del papel, no una pieza encima. */
          boxShadow: desplazado ? "0 1px 16px -8px rgb(var(--tinta-950) / .22)" : "none",
          transition: "box-shadow .3s ease",
        }}
      >
        <div className="mx-auto flex h-[58px] max-w-[1460px] items-center gap-3 px-4 md:gap-4 md:px-8">
          {/* El disparador del cajón, hasta 1360 px.
              Estaba en `lg`, y ahí no caben: a 1024 px la banda con los siete
              destinos, la empresa, el buscador y los cuatro iconos medía 1311
              px, de modo que la página entera —todas las rutas del panel—
              arrastraba doscientos ochenta y siete píxeles de desplazamiento
              horizontal, con la banda cortada por la derecha. En un portátil de
              1280 seguían faltando ciento catorce.

              El corte no es `xl` sino un valor medido: a 1280 exactos las siete
              pestañas caben por los pelos y «Alertas» queda a medias, que es
              peor que no enseñarlas. A partir de 1360 entran holgadas. Un punto
              de ruptura redondo que no corresponde a nada es lo que produjo el
              problema en primer lugar. */}
          <button
            onClick={() => setCajon(true)}
            aria-label="Abrir el menú"
            aria-expanded={cajon}
            className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-[9px] text-tinta-700
                       transition hover:bg-hueso-mesa hover:text-tinta-950 min-[1360px]:hidden"
          >
            <MenuIcono className="h-[19px] w-[19px]" />
          </button>

          <Link href="/" className="flex shrink-0 items-baseline gap-2">
            <span className="marca text-[20px] leading-none">Prefacti</span>
            <span className="nota hidden text-tinta-400 sm:inline">v2</span>
          </Link>

          <span aria-hidden className="hidden h-4 w-px shrink-0 bg-trazo-fino lg:block" />

          {/* La empresa activa. En Prefacti una cuenta trabaja sobre varias, y
              desde aquí se salta entre ellas o se abre una nueva. En estrecho
              vive dentro del cajón, no desaparece. */}
          <div className="hidden lg:block"><SelectorEmpresa sesion={empresaSesion} /></div>

          {/* `min-w-0` y desplazamiento propio: es la red de seguridad. Las
              pestañas son `shrink-0` —un rótulo partido en dos líneas dentro de
              una banda de 58 px no es una pestaña— así que sin esto la fila no
              puede encoger y lo que cede es la página. Con esto, en el peor
              caso la fila se desplaza dentro de sí misma y la banda nunca
              empuja al documento. */}
          <nav aria-label="Secciones"
               className="sin-barra ml-1 hidden min-w-0 flex-1 items-center gap-0.5
                          overflow-x-auto min-[1360px]:flex">
            {NAV.map(n => (
              <Link
                key={n.h}
                href={n.h}
                aria-current={activo(n.h) ? "page" : undefined}
                className={cx(
                  "relative flex shrink-0 items-center gap-2 rounded-[8px] px-2.5 py-1.5",
                  "text-[14px] transition-colors",
                  activo(n.h) ? "font-medio text-tinta-950"
                              : "font-libro text-tinta-500 hover:text-tinta-950",
                )}
              >
                {activo(n.h) && (
                  <motion.span
                    layoutId="banda-activa"
                    transition={MUELLE}
                    className="absolute inset-0 -z-10 rounded-[8px]"
                    style={{
                      background: "rgb(var(--hueso-mesa) / .9)",
                      boxShadow: "inset 0 0 0 1px var(--trazo-fino)",
                    }}
                  />
                )}
                <n.ic className={cx("h-[15px] w-[15px]", !activo(n.h) && "opacity-70")}
                      style={activo(n.h) ? { color: n.c } : undefined} aria-hidden />
                <span className="whitespace-nowrap">{n.t}</span>
                {n.n && (
                  <span className={cx(
                    "grid h-[17px] min-w-[17px] place-items-center rounded-full px-1",
                    "text-[10.5px] font-medio tabular-nums",
                    activo(n.h) ? "bg-minio-600 text-white" : "bg-hueso-mesa text-tinta-500",
                  )}>
                    {n.n}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
            <button
              onClick={() => setPaleta(true)}
              aria-label="Buscar"
              className="flex h-9 items-center gap-2 rounded-[8px] border border-trazo-fino
                         bg-hueso px-2.5 text-[13px] text-tinta-500 transition
                         hover:border-trazo-medio hover:text-tinta-900"
            >
              <Search className="h-[15px] w-[15px]" aria-hidden />
              <kbd className="hidden font-mono text-[11px] lg:inline">⌘K</kbd>
            </button>

            <div className="hidden items-center gap-1 sm:flex">
              <MenuEstilo />
              <TemaToggle className="h-9 w-9 rounded-[8px] text-tinta-400 hover:bg-hueso-mesa hover:text-tinta-950" />
              <Pista texto="Configuración" lado="abajo">
                <Link
                  href="/configuracion"
                  aria-label="Configuración"
                  aria-current={activo("/configuracion") ? "page" : undefined}
                  className={cx(
                    "grid h-9 w-9 place-items-center rounded-[8px] transition",
                    activo("/configuracion")
                      ? "bg-hueso-mesa text-tinta-950"
                      : "text-tinta-400 hover:bg-hueso-mesa hover:text-tinta-950",
                  )}
                >
                  <Settings className="h-[16px] w-[16px]" aria-hidden />
                </Link>
              </Pista>
            </div>

            {/* El nombre de quien ha entrado, sólo a partir de 1536 px. Es el
                dato menos urgente de la banda —quien la mira ya sabe quién es—
                y era el que se llevaba ciento veinte píxeles justo donde
                faltaban. */}
            <span aria-hidden className="mx-1.5 hidden h-4 w-px bg-trazo-fino 2xl:block" />

            <span className="hidden leading-tight 2xl:block">
              <span className="block text-[13px] font-medio text-tinta-950">Sam Jaén</span>
              <span className="block text-[11.5px] text-tinta-400">Propietario</span>
            </span>

            <Pista texto="Salir" lado="abajo" className="ml-1 hidden sm:inline-flex">
              <Link
                href="/"
                aria-label="Salir"
                className="grid h-9 w-9 place-items-center rounded-[8px] text-tinta-400
                           transition hover:bg-hueso-mesa hover:text-tinta-950"
              >
                <LogOut className="h-[15px] w-[15px]" aria-hidden />
              </Link>
            </Pista>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- cajón
          Entra desde la izquierda, que es de donde salió el botón. Un panel que
          aparece por el lado contrario al que se ha pulsado rompe la relación
          entre el gesto y lo que ocurre. */}
      <Cajon abierto={cajon} alCerrar={cerrarCajon} lado="izquierda" ancho={300} rotulo="Menú">
        <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-trazo-fino px-4">
          <span className="marca text-[18px] leading-none">Prefacti</span>
          <button onClick={cerrarCajon} aria-label="Cerrar el menú"
            className="-mr-1 grid h-10 w-10 place-items-center rounded-[9px] text-tinta-500
                       transition hover:bg-hueso-mesa hover:text-tinta-950">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="border-b border-trazo-fino p-3">
          <SelectorEmpresa ancho="lleno" sesion={empresaSesion} />
        </div>

        <nav aria-label="Secciones" className="flex-1 overflow-y-auto p-2">
          {NAV.map(n => (
            <Link
              key={n.h}
              href={n.h}
              aria-current={activo(n.h) ? "page" : undefined}
              className={cx(
                /* 44 px de alto: es la medida con la que un pulgar no falla. */
                "flex h-11 items-center gap-3 rounded-[9px] px-3 text-[15px] transition-colors",
                activo(n.h) ? "bg-hueso-mesa font-medio text-tinta-950"
                            : "font-libro text-tinta-700 hover:bg-hueso-mesa hover:text-tinta-950",
              )}
            >
              <n.ic className="h-[18px] w-[18px] shrink-0"
                    style={activo(n.h) ? { color: n.c } : undefined} aria-hidden />
              <span className="flex-1">{n.t}</span>
              {n.n && (
                <span className={cx(
                  "grid h-[19px] min-w-[19px] place-items-center rounded-full px-1.5",
                  "text-[11px] font-medio tabular-nums",
                  activo(n.h) ? "bg-minio-600 text-white" : "bg-hueso-mesa text-tinta-500",
                )}>
                  {n.n}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="shrink-0 border-t border-trazo-fino p-2">
          <Link href="/configuracion"
            className={cx(
              "flex h-11 items-center gap-3 rounded-[9px] px-3 text-[15px] transition-colors",
              activo("/configuracion") ? "bg-hueso-mesa font-medio text-tinta-950"
                                       : "font-libro text-tinta-700 hover:bg-hueso-mesa",
            )}>
            <Settings className="h-[18px] w-[18px] shrink-0" aria-hidden /> Configuración
          </Link>
          <div className="mt-1 flex items-center gap-2 px-3 pb-1 pt-2">
            <span className="flex-1 leading-tight">
              <span className="block text-[13.5px] font-medio text-tinta-950">Sam Jaén</span>
              <span className="block text-[12px] text-tinta-400">Propietario</span>
            </span>
            <TemaToggle className="h-9 w-9 rounded-[8px] text-tinta-400 hover:bg-hueso-mesa hover:text-tinta-950" />
            <Link href="/" aria-label="Salir"
              className="grid h-9 w-9 place-items-center rounded-[8px] text-tinta-400
                         transition hover:bg-hueso-mesa hover:text-tinta-950">
              <LogOut className="h-[16px] w-[16px]" aria-hidden />
            </Link>
          </div>
        </div>
      </Cajon>

      <motion.main
        id="principal"
        key={path}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={LENTO}
        className="mx-auto max-w-[1460px] px-4 pb-28 pt-8 md:px-8 md:pt-10"
      >
        {children}
      </motion.main>

      <motion.button
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: .3, duration: .4 }}
        whileHover={{ y: -1 }} whileTap={{ y: 0 }}
        onClick={() => setCopiloto(true)}
        className="fixed bottom-6 right-6 z-30 flex h-11 items-center gap-2 rounded-full
                   bg-tinta-950 px-5 text-[14px] font-medio text-hueso shadow-flota
                   transition hover:opacity-90"
      >
        <Sparkles className="h-[16px] w-[16px] text-minio-500" aria-hidden />
        <span className="hidden sm:inline">Asistente</span>
        <kbd className="hidden rounded-[4px] bg-hueso/15 px-1.5 py-0.5 text-[10px] sm:inline">⌘J</kbd>
      </motion.button>

      <CommandPalette open={paleta} onOpenChange={setPaleta} onOpenCopilot={() => { setPaleta(false); setCopiloto(true); }} />
      <CopilotSidebar open={copiloto} onOpenChange={setCopiloto} />
    </div>
  );
}
