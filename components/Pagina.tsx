import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Cabecera de pantalla.
 *
 * Cada página tenía la suya: unas con `text-display`, otras con `text-rotulo`,
 * unas con bajada y otras sin ella, y los botones a distinta altura. Es el
 * detalle que más delata a una interfaz que no ha pasado por manos de nadie —
 * en un producto real la cabecera es una sola pieza porque la escribió una
 * persona una vez.
 *
 * La bajada es opcional y debe ser una línea. Si hace falta un párrafo para
 * explicar la pantalla, el problema está en la pantalla.
 */
export function Pagina({
  titulo,
  bajada,
  migas,
  acciones,
  icono: Icono,
  children,
}: {
  titulo: React.ReactNode;
  bajada?: React.ReactNode;
  /** Ruta de vuelta, para las pantallas de detalle. */
  migas?: { t: string; h: string }[];
  acciones?: React.ReactNode;
  /** Marca de sección, en su recuadro teñido — como en prefacti.com. */
  icono?: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-9">
      {migas && migas.length > 0 && (
        <nav className="mb-3 flex items-center gap-1 text-[13px] text-tinta-400">
          {migas.map((m, i) => (
            <span key={m.h} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              <Link href={m.h} className="transition hover:text-tinta-950">{m.t}</Link>
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-start gap-4">
          {/* El recuadro de sección. Es pequeño y hace un trabajo grande: da al
              titular un punto de apoyo a la izquierda, de modo que la cabecera
              arranca en algo y no en el borde de la pantalla. */}
          {Icono && (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-pieza
                             bg-minio-100 ring-1 ring-inset ring-minio-500/15">
              <Icono className="h-[21px] w-[21px] text-minio-600" />
            </span>
          )}
          <div className="min-w-0">
            {/* El titular escala con el ancho. A 36 px fijos ocupaba media
                pantalla de un teléfono y empujaba la bajada por debajo del
                pliegue; el mismo rótulo que manda en un monitor no puede pesar
                igual en 375 px. */}
            <h1 className="font-display text-[clamp(1.75rem,1.25rem+2.2vw,2.25rem)]
                           leading-[1.1] text-tinta-950">
              {titulo}
            </h1>
            {bajada && (
              <p className="mt-2.5 max-w-[60ch] text-[14.5px] leading-relaxed text-tinta-500">
                {bajada}
              </p>
            )}
          </div>
        </div>
        {/* `min-w-0` para que lo que quepa dentro pueda encoger o desplazarse
            —una fila de pestañas, un desplegable largo— en vez de empujar la
            cabecera y con ella la página. */}
        {acciones && (
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2.5">{acciones}</div>
        )}
      </div>

      {children}
    </header>
  );
}

/**
 * Avatar de iniciales.
 *
 * Sin foto: no hay fotos, y un círculo gris con la silueta de una persona
 * ocupa lo mismo y dice menos que dos letras.
 */
export function Avatar({
  u,
  n,
  tam = 26,
}: {
  u: string;
  n?: string;
  tam?: number;
}) {
  return (
    <span
      title={n}
      className="grid shrink-0 place-items-center rounded-full bg-hueso-mesa font-medio
                 text-tinta-700 ring-1 ring-inset ring-trazo-fino"
      style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.42) }}
    >
      {u}
    </span>
  );
}

/**
 * El estado vacío se fue a las primitivas.
 *
 * Aquí tenía un título en serif a cuerpo de rótulo y una lámina de cristal: dos
 * decisiones de portada en el hueco de una lista que no ha devuelto nada, que es
 * el sitio donde menos hace falta llamar la atención. Se reexporta desde su sitio
 * nuevo para que las páginas que ya lo importaban de aquí sigan funcionando.
 */
export { Vacio } from "@/components/ui";
