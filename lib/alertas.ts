import { EDIFICIOS } from "./data";

export type Alerta = {
  id: string; sev: "critica" | "alta" | "media" | "info";
  titulo: string; detalle: string; proyecto: string; cifra: string;
};

/**
 * Alertas derivadas de las cifras, no escritas a mano: si el modelo cambia,
 * la lista cambia. Determinista y sin red.
 */
function build(): Alerta[] {
  const a: Alerta[] = [];
  const push = (sev: Alerta["sev"], titulo: string, detalle: string, p: string, cifra: string) =>
    a.push({ id: `${p}-${a.length}`, sev, titulo, detalle, proyecto: p, cifra });

  for (const e of EDIFICIOS) {
    if (e.margen < 0.15)
      push("critica", "Margen bajo el umbral de inversión",
        "No absorbe una desviación de obra del 5 %.", e.nombre, `margen ${(e.margen * 100).toFixed(1)} %`);
    if (e.exposicion > 30e6)
      push("alta", "Exposición de capital elevada",
        "El pico de caja negativa exige que la deuda entre a tiempo.", e.nombre,
        `$${(e.exposicion / 1e6).toFixed(1)}M`);
    if (e.tir !== null && e.tir < 0.2 && e.margen >= 0.15)
      push("media", "TIR por debajo del objetivo de cartera",
        "Rentable, pero por debajo del 20 % que exige el comité.", e.nombre,
        `TIR ${(e.tir * 100).toFixed(1)} %`);
  }
  const orden = { critica: 0, alta: 1, media: 2, info: 3 };
  return a.sort((x, y) => orden[x.sev] - orden[y.sev]).slice(0, 12);
}

export const ALERTAS = build();
export const SEV_TONO: Record<Alerta["sev"], string> = {
  critica: "#C42B21", alta: "#D9491F", media: "#B7791F", info: "#24589B",
};
