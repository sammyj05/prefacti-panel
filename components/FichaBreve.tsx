import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import type { ProyectoBreve } from "@/lib/cartera";
import { moneyC, num, pct } from "@/lib/format";
import { Pagina } from "@/components/Pagina";
import { Marbete } from "@/components/ui";

/**
 * La ficha de una promoción de la base.
 *
 * Es la mitad de la ficha, y lo dice. La completa —desglose, presupuesto,
 * unidades, caja— está construida sobre la cartera fija que se importa al
 * cargar el módulo, así que traerla a datos de verdad es un trabajo aparte y no
 * un remiendo.
 *
 * Lo que sí hace es no mentir y no romperse: enseña lo que la promoción tiene
 * —nombre, estado, dónde está y las cifras de su última versión— y cuando no
 * tiene estudio cargado lo dice con las mismas palabras que la cartera. Una
 * tarjeta en la que se pulsa y devuelve un 404 es peor que una ficha corta.
 */
export function FichaBreve({ p }: { p: ProyectoBreve }) {
  const hayEstudio = p.cifras.ventas > 0;

  const CIFRAS = [
    ["Ingresos", moneyC(p.cifras.ventas)],
    ["Costo", moneyC(p.cifras.costo)],
    ["Utilidad", moneyC(p.cifras.utilidad)],
    ["Margen", pct(p.cifras.margen, 1)],
    ["ROI", pct(p.cifras.roi, 1)],
    ["VAN", moneyC(p.cifras.van)],
    ["TIR", p.cifras.tir === null ? "n/d" : pct(p.cifras.tir, 1)],
    ["Exposición máxima", moneyC(p.cifras.exposicion)],
  ] as const;

  const FICHA = [
    ["Ubicación", p.ubicacion ?? "—"],
    ["Tipología", p.tipo === "torre" ? "Torre residencial" : "Casas"],
    ["Estado", p.estado],
    ["Unidades", p.cifras.unidades ? num(p.cifras.unidades) : "—"],
    ["Superficie construida", p.cifras.gba ? `${num(p.cifras.gba)} m²` : "—"],
    ["Superficie vendible", p.cifras.gla ? `${num(p.cifras.gla)} m²` : "—"],
  ] as const;

  return (
    <div className="max-w-[76rem]">
      <Link href="/proyectos"
            className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] text-tinta-500
                       underline-offset-2 hover:text-tinta-900 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Cartera
      </Link>

      <Pagina
        icono={Building2}
        titulo={p.nombre}
        bajada={[p.ubicacion, p.tipo === "torre" ? "Torre residencial" : "Casas"]
          .filter(Boolean).join(" · ")}
        acciones={
          <span className="flex items-center gap-2">
            <Marbete>{p.estado}</Marbete>
            {!p.publicada && <Marbete tono="aviso">Borrador</Marbete>}
          </span>
        }
      />

      {hayEstudio ? (
        <section className="seccion grid overflow-hidden rounded-caja
                            divide-y divide-trazo-fino sm:grid-cols-2 sm:divide-x
                            lg:grid-cols-4">
          {CIFRAS.map(([k, v]) => (
            <div key={k} className="px-6 py-5">
              <div className="nota">{k}</div>
              <div className="cifra mt-1.5 text-[20px] leading-none">{v}</div>
            </div>
          ))}
        </section>
      ) : (
        <section className="seccion rounded-caja px-6 py-6">
          <h2 className="text-[15px] font-medio text-tinta-950">Sin estudio cargado</h2>
          <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-tinta-500">
            La promoción está creada pero todavía no tiene cuadro de áreas ni
            presupuesto, así que no hay ingreso ni coste que calcular. Cargar el
            estudio desde aquí es lo siguiente que llega.
          </p>
        </section>
      )}

      <section className="seccion mt-5 overflow-hidden rounded-caja">
        <header className="border-b border-trazo-fino px-6 py-4">
          <h2 className="text-[15.5px] font-medio text-tinta-950">Ficha técnica</h2>
        </header>
        {FICHA.map(([k, v]) => (
          <div key={k}
               className="grid gap-1 border-b border-trazo-fino px-6 py-3.5 last:border-0
                          sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-6">
            <span className="text-[13.5px] text-tinta-500">{k}</span>
            <span className="text-[14px] tabular-nums text-tinta-950">{v}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
