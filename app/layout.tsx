import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { empresaDeLaSesion } from "@/lib/cartera";
import { ProveedorAvisos } from "@/components/ui";

export const metadata: Metadata = {
  title: "Prefacti · Cartera",
  description: "Factibilidad inmobiliaria",
};

/**
 * El tema y el estilo, antes del primer pintado.
 *
 * Va como guion en línea y bloqueante a propósito: si esperara a que React
 * hidrate, quien tenga el tema oscuro guardado vería un fogonazo blanco de
 * varios cientos de milisegundos. Lee la preferencia guardada y, si no hay,
 * la del sistema. Envuelto en `try` porque `localStorage` lanza en modo
 * privado de algunos navegadores, y ahí es mejor un tema por defecto que una
 * página en blanco.
 *
 * Lo mismo vale para el estilo: sin el atributo puesto antes del primer
 * pintado, quien tenga elegido el espresso vería medio segundo de ladrillo.
 * La lista de nombres se repite aquí a mano —no puede importar `lib/estilo`,
 * es una cadena que se inyecta en el `<head>`— y por eso el sitio donde se
 * añada un quinto estilo son estos dos.
 */
const GUION_TEMA = `
try {
  var t = localStorage.getItem("tema");
  var oscuro = t ? t === "oscuro" : matchMedia("(prefers-color-scheme: dark)").matches;
  if (oscuro) document.documentElement.classList.add("oscuro");
  var d = document.documentElement.dataset;
  var e = localStorage.getItem("pf-estilo");
  d.estilo = ["plano","cobalto","ladrillo","espresso","monocromo"].indexOf(e) >= 0 ? e : "plano";
  /* Los tres ejes de forma, por el mismo motivo que el color: puestos después
     del primer pintado, la interfaz aparece con el canto y la letra de la casa
     y salta al elegido a la vista de todos. */
  var ejes = [
    ["pf-canto",  "canto",  ["redondo","suave","recto"]],
    ["pf-lamina", "lamina", ["elevado","plano","contorno"]],
    ["pf-letra",  "letra",  ["neutra","cartel","documento","editorial","grotesca"]]
  ];
  for (var i = 0; i < ejes.length; i++) {
    var v = localStorage.getItem(ejes[i][0]);
    d[ejes[i][1]] = ejes[i][2].indexOf(v) >= 0 ? v : ejes[i][2][0];
  }
  /* La densidad va en el mismo saco y por el mismo motivo: puesta después del
     primer pintado, la tabla aparece con la fila alta y salta a la corta a la
     vista de todos. Vive en otra clave porque va junto a la vista de inicio. */
  var pref = JSON.parse(localStorage.getItem("pf-preferencias") || "{}");
  d.densidad = pref.densidad === "compacta" ? "compacta" : "comoda";
} catch (e) {
  document.documentElement.dataset.estilo = "plano";
}
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* La empresa de la sesión se lee aquí, una vez por petición, y baja al chasis
     como propiedad. Leerla dentro del chasis obligaría a que fuese componente
     de servidor, y el chasis es justo lo contrario: menú, atajos de teclado y
     cajón, todo con estado. */
  const empresaSesion = await empresaDeLaSesion();

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: GUION_TEMA }} />
      </head>
      {/* Los avisos envuelven al chasis y no al revés: la portada y la entrada
          no llevan chasis —`AppShell` se aparta en esas rutas— y aun así tienen
          que poder confirmar que una empresa se ha creado. */}
      <body>
        <ProveedorAvisos>
          <AppShell empresaSesion={empresaSesion}>{children}</AppShell>
        </ProveedorAvisos>
      </body>
    </html>
  );
}
