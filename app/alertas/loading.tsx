import { CargandoPantalla } from "@/components/ui/Cargando";

/** La bandeja de alertas: filtro por severidad y una fila por aviso. */
export default function Cargando() {
  return <CargandoPantalla acciones={1} forma="bloque" filas={6} />;
}
