"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HAY_SUPABASE, clienteNavegador } from "@/lib/supabase/cliente";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { TemaToggle } from "@/components/TemaToggle";
import { FormularioEmpresa } from "@/components/SelectorEmpresa";
import { useEmpresas } from "@/lib/empresas";
import { Boton, Campo, Entrada, useAviso } from "@/components/ui";
import { MUELLE } from "@/lib/ui";
import { inicioGuardado } from "@/lib/preferencias";

/**
 * Entrada.
 *
 * No hay autenticación detrás: es la pantalla, no el sistema. El envío espera
 * 700 ms y pasa al panel, que es lo que hace falta para poder ver y ajustar el
 * estado de carga; el día que haya sesión de verdad, lo único que cambia es el
 * cuerpo de `entrar`.
 *
 * El fondo ya no es la aurora difusa: era una mancha de color que podía estar
 * delante de cualquier producto. Ahora es lo que mira un promotor todo el día
 * —el papel cuadriculado del plano— con la retícula fina de un metro dentro de
 * la gruesa de cinco, dos ejes marcados y viñeta para hundir los bordes. La
 * profundidad sale de tres capas a distinta escala y opacidad, no de un
 * desenfoque.
 *
 * Y la ficha es recta: rectángulo con canto de 4 px, borde firme y sombra de
 * papel sobre mesa. Cada zona —cabecera, campos, alternativas, pie— va separada
 * por una línea, así se lee como una ficha de expediente y no como una tarjeta
 * flotante más.
 */
export default function Entrar() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  /* La entrada tiene dos caras: quien ya tiene cuenta entra, y quien no la
     tiene abre su empresa. Son la misma pantalla porque son la misma decisión
     —empezar a trabajar— y separarlas en dos páginas obliga a elegir antes de
     saber cuál toca. */
  const [modo, setModo] = useState<"entrar" | "empresa">("entrar");
  const { crear } = useEmpresas();
  const aviso = useAviso();

  /**
   * Entrar es cambiar de sitio, no cargar una pantalla más.
   *
   * El telón sube y tapa la página entera antes de navegar. No es adorno: la
   * portada y el panel son dos composiciones distintas —una a pantalla completa
   * con la matriz, la otra una banda de navegación sobre fondo de trabajo— y
   * pasar de una a otra en seco se lee como un fallo de pintado. Tapando, el
   * cambio ocurre a oscuras y lo que aparece al levantarse ya es otro sitio.
   *
   * Los 820 ms son el telón (520) más un respiro; el `push` va después para que
   * nadie vea el panel a medio montar por debajo.
   */
  /* A dónde se entra lo decide la preferencia de Configuración. Era siempre
     `/proyectos` con un control en Configuración que decía elegirlo y no lo
     elegía. */
  /**
   * Entrar de verdad si hay base, y como antes si no la hay.
   *
   * Mientras no haya proyecto configurado, la entrada sigue siendo el paso a la
   * cartera de demostración —que es lo que permitió traer esto por partes—. En
   * cuanto hay proyecto, la misma pantalla entra contra Supabase sin cambiar ni
   * un campo: los dos que ya había, correo y contraseña, son exactamente los
   * que pide `signInWithPassword`.
   */
  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    const destino = inicioGuardado();

    if (!HAY_SUPABASE) {
      setTimeout(() => router.push(destino), 820);
      return;
    }

    const sb = clienteNavegador();
    const { error } = await sb.auth.signInWithPassword({
      email: correo, password: clave,
    });

    if (error) {
      setCargando(false);
      /* El mensaje de Supabase llega en inglés y dice «Invalid login
         credentials» para los dos casos —correo que no existe y contraseña
         mala— a propósito, para no confirmar qué correos hay dados de alta. Se
         traduce manteniendo esa ambigüedad. */
      aviso.mal(
        "No pudimos entrar",
        /invalid login credentials/i.test(error.message)
          ? "El correo o la contraseña no son correctos."
          : error.message,
      );
      return;
    }

    /* `refresh()` antes de navegar: la sesión acaba de escribirse en cookies y
       sin refrescar, el servidor pinta la página siguiente con la sesión vieja
       —o sea vacía— y el middleware la devuelve aquí. */
    router.refresh();
    setTimeout(() => router.push(destino), 820);
  }

  /**
   * Abrir empresa: alta de la persona y de la empresa, en ese orden.
   *
   * Las dos cosas o ninguna. `crear_empresa` es una función de la base que crea
   * la empresa, mete a quien la crea dentro como administrador y propietario, y
   * se la deja como empresa activa — porque una empresa sin miembros no la ve
   * nadie, ni siquiera quien la acaba de crear.
   */
  async function abrirEmpresa(datos: { nombre: string; industria: string }) {
    if (!HAY_SUPABASE) {
      const e = crear(datos as Parameters<typeof crear>[0]);
      aviso.bien(`${e.nombre} creada`, "Entrando con ella como empresa activa.");
      setCargando(true);
      setTimeout(() => router.push(inicioGuardado()), 820);
      return;
    }

    if (!correo || clave.length < 8) {
      aviso.mal("Falta la cuenta",
        "Pon tu correo y una contraseña de ocho caracteres o más.");
      return;
    }

    setCargando(true);
    const sb = clienteNavegador();

    /* El nombre de la empresa viaja en los metadatos del alta, y la crea el
       disparador de la base. Estaba partido en dos llamadas —`signUp` y después
       `crear_empresa()`— y eso sólo funciona si `signUp` deja sesión abierta.
       No la deja cuando el proyecto pide confirmar el correo, que es el ajuste
       por defecto: la cuenta se creaba, la empresa no, y quien confirmaba
       entraba sin pertenecer a ninguna. */
    const { data, error: errAlta } = await sb.auth.signUp({
      email: correo,
      password: clave,
      options: { data: { empresa: datos.nombre, industria: datos.industria } },
    });

    if (errAlta) {
      setCargando(false);
      aviso.mal("No pudimos crear la cuenta", errAlta.message);
      return;
    }

    /* Sin sesión hay confirmación de correo por medio. La empresa ya está
       creada igualmente, así que lo único que falta es que abra el enlace. */
    if (!data.session) {
      setCargando(false);
      aviso.bien("Revisa tu correo",
        `${datos.nombre} está creada. Te hemos enviado un enlace para confirmar la cuenta.`);
      setModo("entrar");
      return;
    }

    aviso.bien(`${datos.nombre} creada`, "Entrando con ella como empresa activa.");
    router.refresh();
    setTimeout(() => router.push(inicioGuardado()), 820);
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-hueso-bajo px-4 py-10">
      {/* ---------------------------------------------------------- el papel
          Tres retículas encajadas: la fina de un metro, la gruesa de cinco y
          los dos ejes maestros. Es lo que da fondo con profundidad sin recurrir
          a un degradado de colores. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgb(var(--tinta-950) / .06) 1px, transparent 1px),
            linear-gradient(90deg, rgb(var(--tinta-950) / .06) 1px, transparent 1px),
            linear-gradient(rgb(var(--tinta-950) / .12) 1px, transparent 1px),
            linear-gradient(90deg, rgb(var(--tinta-950) / .12) 1px, transparent 1px)`,
          backgroundSize: "28px 28px, 28px 28px, 140px 140px, 140px 140px",
        }}
      />
      {/* Los dos ejes maestros del plano, con su cota. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px md:block"
        style={{ background: "rgb(var(--minio-600) / .16)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[27%] hidden h-px md:block"
        style={{ background: "rgb(var(--minio-600) / .12)" }}
      />
      {/* La viñeta: hunde los cantos y levanta el centro, que es donde está la
          ficha. Sin ella la cuadrícula se lee plana hasta el borde. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(105% 78% at 50% 44%, transparent 18%, rgb(var(--tinta-950) / .16) 100%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .45, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[460px]"
      >
        <div className="relative">
        {/* La cota de la ficha: las cuatro marcas de escuadra que la sitúan
            sobre el plano, como una pieza acotada. Van sobre la ficha, no
            sobre el pie: una escuadra cruzando un enlace no acota nada. */}
        {[
          "-left-2 -top-2 border-l border-t",
          "-right-2 -top-2 border-r border-t",
          "-bottom-2 -left-2 border-b border-l",
          "-bottom-2 -right-2 border-b border-r",
        ].map(c => (
          <span
            key={c}
            aria-hidden
            className={`absolute h-3.5 w-3.5 ${c}`}
            style={{ borderColor: "rgb(var(--minio-600) / .45)" }}
          />
        ))}

        <div
          className="relative border border-trazo-medio bg-hueso-alto"
          style={{ boxShadow: "0 1px 0 rgb(var(--tinta-950) / .04), 0 24px 56px -26px rgb(var(--tinta-950) / .35)" }}
        >
          {/* -- cabecera: marca, referencia y tema ------------------------ */}
          <div className="flex items-center justify-between border-b border-trazo-fino px-6 py-4">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="marca text-[20px] leading-none">Prefacti</span>
              <span className="nota text-tinta-400">v2</span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="nota hidden text-tinta-400 sm:inline">Panamá</span>
              <TemaToggle className="-mr-1.5" />
            </div>
          </div>

          {/* -- las dos caras ----------------------------------------------
              No usan la primitiva `Pestanas`: aquí las dos ocupan media ficha
              cada una y su filete llega de canto a canto, que es lo que hace
              que se lean como las dos caras de un mismo impreso y no como una
              fila de solapas. Lo que sí comparten con ella es el muelle, que es
              lo que estaba distinto en cada sitio. */}
          <div role="tablist" aria-label="Cómo entrar" className="flex border-b border-trazo-fino">
            {([["entrar", "Entrar"], ["empresa", "Crear empresa"]] as const).map(([k, t]) => (
              <button
                key={k}
                role="tab"
                aria-selected={modo === k}
                tabIndex={modo === k ? 0 : -1}
                onClick={() => setModo(k)}
                className={`relative flex-1 py-3 text-[14px] transition-colors
                  ${modo === k ? "font-medio text-tinta-950" : "text-tinta-500 hover:text-tinta-950"}`}
              >
                {t}
                {modo === k && (
                  <motion.span
                    layoutId="cara-entrada"
                    transition={MUELLE}
                    className="absolute inset-x-6 -bottom-px h-[2px] bg-tinta-950" />
                )}
              </button>
            ))}
          </div>

          {modo === "empresa" ? (
            <div className="px-6 pb-6 pt-6">
              <h1 className="text-[19px] font-medio leading-tight text-tinta-950">
                Abre tu empresa
              </h1>
              <p className="mt-1 text-[13.5px] text-tinta-500">
                Cada empresa tiene su cartera, sus miembros y sus permisos.
                Puedes crear más desde el panel.
              </p>
              {/* Con base detrás hay que dar de alta también a la persona: la
                  empresa cuelga de quien la crea. Sin base, estos dos campos no
                  pintan nada y no se enseñan. */}
              {HAY_SUPABASE && (
                <div className="mt-5 space-y-4">
                  <Campo rotulo="Correo" requerido>
                    {p => (
                      <Entrada
                        type="email" required autoComplete="email"
                        value={correo} onChange={e => setCorreo(e.target.value)}
                        placeholder="sam@prefacti.com"
                        className="h-11 text-[15px]"
                        {...p}
                      />
                    )}
                  </Campo>
                  <Campo rotulo="Contraseña" requerido
                         ayuda="Ocho caracteres o más.">
                    {p => (
                      <Entrada
                        type="password" required autoComplete="new-password"
                        value={clave} onChange={e => setClave(e.target.value)}
                        placeholder="••••••••"
                        className="h-11 text-[15px]"
                        {...p}
                      />
                    )}
                  </Campo>
                </div>
              )}

              <div className="mt-5">
                <FormularioEmpresa
                  compacto={false}
                  alCrear={datos => { void abrirEmpresa(datos as { nombre: string; industria: string }); }}
                />
              </div>
            </div>
          ) : (
          <div className="px-6 pb-6 pt-6">
            <h1 className="text-[19px] font-medio leading-tight text-tinta-950">
              Entrar al panel
            </h1>
            <p className="mt-1 text-[13.5px] text-tinta-500">
              Continúa con la empresa en la que estabas trabajando.
            </p>

            {/* Los rótulos van con `htmlFor` de verdad, que es lo que aporta la
                primitiva. Antes eran un `<span>` encima del campo: pulsar sobre
                «Correo» no enfocaba nada y un lector de pantalla anunciaba los
                dos campos sin nombre. */}
            <form onSubmit={entrar} className="mt-6 space-y-4">
              <Campo rotulo="Correo" requerido>
                {p => (
                  <Entrada
                    type="email" required autoFocus autoComplete="email"
                    value={correo} onChange={e => setCorreo(e.target.value)}
                    placeholder="sam@prefacti.com"
                    className="h-11 text-[15px]"
                    {...p}
                  />
                )}
              </Campo>

              <div>
                <Campo rotulo="Contraseña" requerido>
                  {p => (
                    <Entrada
                      type="password" required autoComplete="current-password"
                      value={clave} onChange={e => setClave(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 text-[15px]"
                      {...p}
                    />
                  )}
                </Campo>
                <Link
                  href="/proyectos"
                  className="mt-1.5 inline-block text-[12.5px] text-tinta-500
                             underline-offset-2 hover:text-tinta-900 hover:underline"
                >
                  ¿Olvidaste la contraseña?
                </Link>
              </div>

              <Boton type="submit" tono="solido" talla="lg" ancho cargando={cargando}>
                Entrar <ArrowRight className="h-4 w-4" aria-hidden />
              </Boton>
            </form>
          </div>
          )}

          {/* -- la alternativa, en su propia franja ----------------------- */}
          <div className="border-t border-trazo-fino bg-hueso-bajo px-6 py-4">
            <Boton type="button" talla="lg" ancho onClick={() => router.push(inicioGuardado())}>
              Continuar como invitado
            </Boton>
            <p className="mt-3 text-center text-[12.5px] text-tinta-500">
              Entras a la cartera de demostración, sin datos reales.
            </p>
          </div>
        </div>
        </div>

        {/* -- el pie, fuera de la ficha: metadatos del expediente --------- */}
        <div className="mt-4 flex items-center justify-between px-1">
          <span className="nota text-tinta-400">Prefacti · Factibilidad</span>
          <Link
            href="/proyectos"
            className="text-[13px] text-tinta-700 underline underline-offset-2 hover:text-tinta-950"
          >
            Pedir acceso
          </Link>
        </div>
      </motion.div>

      <AnimatePresence>
        {cargando && (
          <motion.div
            key="telon"
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            transition={{ duration: .52, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 grid place-items-center bg-tinta-950"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: .3, duration: .4 }}
              className="flex flex-col items-center gap-4"
            >
              {/* Sólo la marca. El rótulo que había debajo —«Abriendo la
                  cartera»— duraba medio segundo: nadie lee una frase que se va
                  antes de terminar de aparecer, y leerla no cambiaba nada. */}
              <span className="marca text-[26px] leading-none">Prefacti</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
