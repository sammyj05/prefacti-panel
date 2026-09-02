"use client";

import { Plus, Trash2 } from "lucide-react";
import { Boton } from "@/components/ui";
import { formatCurrency } from "@/lib/motor/calculations.js";
import { entrelazarPrecioTorre } from "@/lib/motor/torrePrecios.js";
import {
  agregarIngresoExtra, actualizarIngresoExtra, eliminarIngresoExtra, getIngresosExtras,
} from "@/lib/motor/ingresosExtras.js";
import type { DatosEstudio } from "@/lib/estudioLocal";
import type { Resultado } from "./useEstudio";
import { CampoFecha, CampoNum, CampoTexto, TituloGrupo } from "./campos";
import { ParametrosPct } from "./ParametrosPct";

/**
 * El formulario de una torre: los mismos grupos y campos del Master del
 * producto, con su regla de entrelazado —el precio de lista por m² y la venta
 * total de apartamentos se recalculan el uno al otro— tal cual la trae el
 * motor (`torrePrecios.js`).
 */

const num = (v: unknown) => {
  const x = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(x) ? 0 : x;
};

type Grupo = { titulo: string; campos: [string, string, string][] };

const GRUPOS: Grupo[] = [
  {
    titulo: "Datos de proyecto",
    campos: [
      ["areaConstruccion", "Área de construcción", "m²"],
      ["cantApartamentos", "Cantidad de apartamentos", "un"],
      ["areaVentaApt", "Área de ventas · apartamentos", "m²"],
      ["areaVentaLocales", "Área de ventas · locales", "m²"],
    ],
  },
  {
    titulo: "Ventas",
    campos: [
      ["precioListaM2", "Precio de lista por m²", "$"],
      ["ventaTotalApt", "Venta de apartamentos", "$"],
      ["pctDescuento", "% de descuento (ej. 0.02)", ""],
      ["ingresosLocales", "Locales comerciales", "$"],
      ["ingresosDepositos", "Bienes anejos · depósitos", "$"],
      ["ingresosEstac", "Bienes anejos · estacionamientos", "$"],
    ],
  },
  {
    titulo: "Hipótesis financieras",
    campos: [
      ["costoConstruccion", "Costo de construcción", "$"],
      ["costosPromotora", "Costos indirectos (promotora)", "$"],
      ["imprevistos", "Imprevistos (monto; vacío = usar %)", "$"],
      ["valorTerreno", "Valor del terreno", "$"],
      ["interesBancario", "Interés bancario", "$"],
      ["apartamentoModelo", "Apartamento modelo", "$"],
      ["cuotaMantenimiento", "Cuota de mantenimiento", "$"],
      ["garantias", "Garantías", "$"],
    ],
  },
  {
    titulo: "Hipótesis comercial · vendido",
    campos: [
      ["fechaPreventa", "Fecha de preventa", "fecha"],
      ["unidadesVendidas", "Unidades vendidas", "un"],
      ["m2Vendidos", "m² vendidos", "m²"],
      ["ventaApartamentos", "Apartamentos (separados + vendidos)", "$"],
      ["ventaEstacVend", "Bienes anejos · estacionamientos", "$"],
      ["ventaDepositosVend", "Bienes anejos · depósitos", "$"],
      ["ventaLocalesVend", "Locales comerciales", "$"],
    ],
  },
  {
    titulo: "Construcción y absorción",
    campos: [
      ["inicioConstruccion", "Inicio de construcción", "fecha"],
      ["permisoOcupacion", "Permiso de ocupación", "fecha"],
      ["periodoConstruccion", "Periodo de construcción", "meses"],
    ],
  },
];

export function FormularioTorre({
  datos, alCambiar, resultado,
}: {
  datos: DatosEstudio;
  alCambiar: (d: DatosEstudio, opciones?: { suave?: boolean }) => void;
  resultado: Resultado | null;
}) {
  const i = (datos.inputs ?? {}) as Record<string, number | string>;
  const extras = getIngresosExtras(datos, "torre") as { id: string; nombre: string; valor: number }[];

  const campo = (k: string, v: string) => {
    alCambiar({ ...datos, inputs: entrelazarPrecioTorre(i, k, v) }, { suave: true });
  };

  return (
    <div className="space-y-6">
      {GRUPOS.map(g => (
        <div key={g.titulo}>
          <TituloGrupo>{g.titulo}</TituloGrupo>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-3">
            {g.campos.map(([k, rotulo, unidad]) =>
              unidad === "fecha" ? (
                <CampoFecha key={k} rotulo={rotulo} valor={String(i[k] ?? "")}
                  alCambiar={v => campo(k, v)} />
              ) : (
                <CampoNum key={k} rotulo={rotulo} sufijo={unidad || undefined}
                  valor={i[k] as number | string} entero={unidad === "un"}
                  alCambiar={v => campo(k, v)} />
              ),
            )}
          </div>
        </div>
      ))}

      {/* Ingresos adicionales: líneas con valor manual que suman al total. */}
      <div>
        <TituloGrupo
          extra={
            <Boton talla="sm" tono="fantasma"
              onClick={() => alCambiar(agregarIngresoExtra(datos, "torre") as DatosEstudio)}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Agregar
            </Boton>
          }
        >
          Ingresos adicionales
        </TituloGrupo>
        {extras.length === 0 ? (
          <p className="text-[12.5px] text-tinta-400">
            Sin líneas adicionales: el ingreso sale de apartamentos, locales y anejos.
          </p>
        ) : (
          <div className="grid gap-2">
            {extras.map(x => (
              <div key={x.id} className="grid grid-cols-[minmax(0,1fr)_150px_36px] items-end gap-2">
                <CampoTexto rotulo="Concepto" valor={x.nombre}
                  alCambiar={v => alCambiar(actualizarIngresoExtra(datos, "torre", x.id, { nombre: v }) as DatosEstudio, { suave: true })} />
                <CampoNum rotulo="Valor" sufijo="$" valor={x.valor}
                  alCambiar={v => alCambiar(actualizarIngresoExtra(datos, "torre", x.id, { valor: num(v) }) as DatosEstudio, { suave: true })} />
                <button
                  onClick={() => alCambiar(eliminarIngresoExtra(datos, "torre", x.id) as DatosEstudio)}
                  title="Eliminar ingreso"
                  className="grid h-8 w-8 place-items-center rounded-[7px] text-tinta-400 hover:bg-riesgo/10 hover:text-riesgo">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ParametrosPct
        datos={datos}
        alCambiar={alCambiar}
        baseCostos={num(resultado?.costosDirectos) - num(i.valorTerreno)}
        baseIngresos={num(resultado?.totalIngresos)}
        notaBase="Base de gastos administrativos: costos directos menos el terreno."
      />

      <p className="text-[12px] leading-relaxed text-tinta-400">
        La venta de apartamentos y el precio de lista por m² van entrelazados: al editar
        uno se recalcula el otro sobre el área de ventas. Total capturado ahora:{" "}
        <span className="font-medio tabular-nums text-tinta-700">
          {formatCurrency(num(i.precioListaM2) * num(i.areaVentaApt))}
        </span>.
      </p>
    </div>
  );
}
