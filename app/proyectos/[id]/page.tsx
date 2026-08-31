import { notFound } from "next/navigation";
import { estudioPorId } from "@/lib/cartera";
import { DetalleDemo } from "@/components/DetalleDemo";
import { EDIFICIOS } from "@/lib/data";

/**
 * La ficha de una promoción.
 *
 * Reparte entre las dos carteras y las dos acaban en la misma pantalla: la de
 * demostración se busca por clave en `lib/data`, y la de la base se arma desde
 * el `datos` de su última versión. `DetalleDemo` recibe la promoción ya
 * resuelta, así que enseña lo mismo para las dos —desglose, presupuesto con sus
 * partidas, cuadro de áreas y caja mes a mes— y no un resumen para unas y la
 * ficha entera para otras.
 *
 * El reparto va en el servidor porque la lectura de la base necesita la sesión
 * de quien pregunta, y esta página lleva `"use client"` desde siempre en su
 * cuerpo: por eso el cuerpo vive en `DetalleDemo` y aquí sólo queda decidir.
 */
export default async function Proyecto({ params }: { params: { id: string } }) {
  if (EDIFICIOS.some(e => e.id === params.id)) return <DetalleDemo id={params.id} />;

  const e = await estudioPorId(params.id);
  if (!e) notFound();
  return <DetalleDemo edificio={e} />;
}
