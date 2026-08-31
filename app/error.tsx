"use client";

import { useEffect } from "react";
import { Roto } from "@/components/ui";

/**
 * El fallo, en pantalla.
 *
 * Sin este fichero, cualquier excepción durante el renderizado deja la pantalla
 * en blanco en producción — sin explicación y sin salida, con la única opción de
 * recargar y perder el sitio.
 *
 * `reset` es lo que lo separa de una página de error de las de siempre: vuelve a
 * montar el árbol que falló sin recargar el documento, así que un fallo pasajero
 * —una respuesta que llegó a medias— se arregla desde el propio aviso.
 *
 * El detalle técnico va debajo y apagado. `digest` es lo que Next deja en su
 * lugar cuando el fallo ocurre en el servidor: el mensaje real no se manda al
 * navegador a propósito, así que ese identificador es lo único con lo que
 * después se puede encontrar la traza en el registro.
 */
export default function Error({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="mx-auto max-w-[560px] py-16">
      <Roto
        titulo="Algo ha fallado en esta pantalla"
        detalle="No se ha perdido nada: los datos están donde estaban. Vuelve a intentarlo y, si sigue igual, avísanos con el código de abajo."
        tecnico={error.digest ?? error.message}
        alReintentar={reset}
      />
    </div>
  );
}
