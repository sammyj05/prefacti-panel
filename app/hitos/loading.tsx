import { CargandoPantalla } from "@/components/ui/Cargando";

/** El calendario: una línea por promoción y la lista de lo que viene. */
export default function Cargando() {
  return <CargandoPantalla acciones={1} forma="bloque" filas={7} />;
}
