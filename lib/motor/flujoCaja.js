// ============================================================
// Motor de FLUJO DE CAJA — Prefacti
//
// Metodología replicada del archivo de estimación del cliente
// (hoja FLUJO, corrida Luxor 26.07). Validado al centavo:
//   · Egreso mensual  → diferencia máxima $0.00 en 31 meses
//   · Interés total   → $3,229,512.63  (Excel B24)
//   · Interés × %fin. → $2,745,085.74  (Excel B27)
//
// LÓGICA (no cambiar sin revalidar contra el Excel de origen):
//   1. Cada ACTIVIDAD tiene un total y se reparte en TRAMOS.
//      Un tramo = {mesInicio, meses, pct} y reparte pct del total
//      de forma uniforme entre esos meses. Los tramos de una
//      actividad deben sumar 100% (equivale a la columna AI del Excel).
//   2. Egreso del mes = Σ (total_actividad × % del mes)   [SUMPRODUCT, fila 20]
//   3. Acumulado del mes = acumulado anterior + egreso     [fila 21]
//   4. Interés del mes = acumulado × tasaAnual / 12        [fila 24]
//   5. Interés a cargar al Master = Σ interés × %financiamiento [fila 27]
//
// El interés es SALIDA de este módulo, nunca entrada: el acumulado
// se construye solo con costos de obra. No hay circularidad.
// ============================================================

const n = (v) => {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const x = parseFloat(v);
  return isNaN(x) ? 0 : x;
};

const str = (v) => (v == null ? '' : String(v).trim());

export const PARAMS_FLUJO_DEFAULT = {
  modo: null,               // 'estandar' | 'actividades' | null = se infiere
  plazoObra: 30,            // meses de ejecución (Luxor = 30)
  horizonteMeses: 31,       // = plazoObra + 1 (el mes 0 es el desembolso inicial)
  // Modo estandar
  formaCurva: 'equilibrada',
  pctMes0: 0.05,
  montoObra: 0,             // se toma del Master
  // Financiamiento
  tasaAnual: 0.06,
  pctFinanciamiento: 0.85,
  // --- Capital de Inicio (Preventa) ---
  // Monto captado ANTES de iniciar la obra. Cae en el mes 0 y reduce
  // la exposición inicial del banco: es el capital con el que arrancas
  // sin necesidad de girar la línea bancaria.
  capitalInicioMonto: 0,
  // --- Flujo de Ventas en Obra (Durante construcción) ---
  // Abonos que entran mes a mes: cada venta genera su abono inicial en
  // el mes en que se firma, reduciendo el saldo deudor del banco.
  ventasObraActivar: false,
  ventasObraMontoTotal: 0,   // ingreso total esperado por ventas en obra
  ventasObraPctAbono: 0.10,  // % del precio que entra como abono
  ventasObraMesInicio: 1,    // mes en que arrancan las ventas
  ventasObraMeses: 24,       // meses de actividad de ventas
  // --- CIERRE DE VENTAS / ESCRITURACIÓN ---
  // Desembolsos hipotecarios al escriturar. En una línea interina la
  // escrituración ES el evento de repago: el banco libera la unidad y
  // cobra. Por eso el cierre SÍ amortiza la exposición y SÍ mueve el
  // interés — atrasar el cierre cuesta dinero real.
  // (Hasta 08/2026 esta serie vivía solo en calcularSaldoCaja y no
  // tocaba el interés: el modelo asumía "obra terminada = deuda pagada".)
  // ON por defecto desde 08/2026: dejarlo apagado equivale a afirmar que la
  // deuda se cancela el día que termina la obra, que es falso y subestima el
  // interés. Los proyectos ya guardados conservan su valor persistido; el
  // panel les muestra la subestimación con cifra y un botón para activarlo.
  cajaActivar: true,
  cajaMontoTotal: 0,        // 0 = usar los ingresos totales del Master
  cajaMesInicio: 0,         // 0 = al terminar la obra (mes = plazoObra)
  cajaMeses: 6,             // meses en que se escrituran los cierres
  // Escape hatch: en false el cierre vuelve a ser puramente informativo
  // (paridad con el Excel de origen). No lo usa la UI; existe para poder
  // reproducir corridas históricas.
  cajaAmortiza: true,
};

// El mes 0 es desembolso previo (no es mes de obra), por eso el
// horizonte es el plazo más uno. Luxor: 30 meses de obra → 31 columnas.
export function horizonteDesdePlazo(plazoObra) {
  return Math.max(1, Math.round(n(plazoObra))) + 1;
}

// Plazo de obra que el proyecto ya declara en el Master.
// OJO: en torres vive en `inputs`, en casas en `comercial`.
// Leerlo de un solo lado hace que casas caiga al default y el flujo
// se genere con un plazo que no es el del proyecto.
export function plazoDelMaster(datos) {
  const d = datos || {};
  const cands = [d.inputs && d.inputs.periodoConstruccion, d.comercial && d.comercial.periodoConstruccion];
  for (const c of cands) {
    if (n(c) > 0) return Math.round(n(c));
  }
  return 0;
}

// ---------- CURVA ESTANDAR ----------
// Alternativa al cronograma de 18 actividades: una sola curva de
// desembolso escalada al plazo. Calibrada contra la corrida Luxor:
// reproduce el interes con +0.7% a +2.5% de error entre 24 y 48 meses.
// No es exacta; es una estimacion defendible cuando no hay programacion.
export const PRESETS_CURVA = {
  equilibrada: { alfa: 1.40, beta: 1.35, labelKey: 'fc.curva.equilibrada', label: 'Equilibrada (referencia calibrada)' },
  adelantada: { alfa: 1.60, beta: 2.20, labelKey: 'fc.curva.adelantada', label: 'Adelantada (obra pesada al inicio)' },
  atrasada: { alfa: 2.20, beta: 1.60, labelKey: 'fc.curva.atrasada', label: 'Atrasada (acabados pesados al final)' },
  lineal: { alfa: 1, beta: 1, labelKey: 'fc.curva.lineal', label: 'Lineal (avance constante)' },
};

// % del costo de obra que se desembolsa antes de arrancar (mes 0).
// En Luxor fue 8.00%: administracion previa, apartamento modelo y
// movilizacion. Es el parametro que mas mueve el interes.
export const PCT_MES0_DEFAULT = 0.05;

export function curvaEstandarEgresos(plazoObra, montoObra, opts) {
  const plazo = Math.max(1, Math.round(n(plazoObra)));
  const total = n(montoObra);
  const o = opts || {};
  const preset = PRESETS_CURVA[o.forma] || PRESETS_CURVA.equilibrada;
  const al = n(preset.alfa) || 1;
  const be = n(preset.beta) || 1;
  const pct0 = Math.min(0.9, Math.max(0, o.pctMes0 == null ? PCT_MES0_DEFAULT : n(o.pctMes0)));

  const e = new Array(plazo + 1).fill(0);
  e[0] = total * pct0;
  const w = [];
  for (let i = 0; i < plazo; i++) {
    const t = (i + 0.5) / plazo;
    w.push(Math.pow(t, al - 1) * Math.pow(1 - t, be - 1));
  }
  const s = w.reduce((a, b) => a + b, 0) || 1;
  for (let i = 0; i < plazo; i++) e[i + 1] = total * (1 - pct0) * w[i] / s;
  return e;
}

// Plantilla de actividades tomada de la corrida Luxor 26.07.
// `peso` = participación de la actividad en el total de obra.
// Los tramos se guardan en posición RELATIVA al plazo de obra
// (fracciones calibradas sobre los 30 meses de Luxor), para que el
// cronograma se pueda escalar a proyectos de otra duración.
//   · mes0: true  → desembolso previo, siempre en el mes 0
//   · ini / dur   → fracción del plazo de obra
// Verificado: escalada a plazo=30 reproduce los 18 renglones de Luxor
// con mesInicio y duración idénticos.
export const PLANTILLA_TORRE = [
  { nombre: 'COSTOS DE ADMINISTRACION Y PREVIOS', peso: 0.041378, tramos: [{ mes0: true, pct: 0.25 }, { ini: 0 / 30, dur: 30 / 30, pct: 0.75 }] },
  { nombre: 'FUNDACIONES', peso: 0.046977, tramos: [{ ini: 0 / 30, dur: 6 / 30, pct: 1 }] },
  { nombre: 'ESTRUCTURA', peso: 0.276452, tramos: [{ ini: 4 / 30, dur: 13 / 30, pct: 1 }] },
  { nombre: 'ALBAÑILERÍA', peso: 0.106946, tramos: [{ ini: 8 / 30, dur: 14 / 30, pct: 1 }] },
  { nombre: 'ACABADOS', peso: 0.196982, tramos: [{ ini: 10 / 30, dur: 19 / 30, pct: 1 }] },
  { nombre: 'AREAS SOCIALES', peso: 0.021869, tramos: [{ ini: 24 / 30, dur: 5 / 30, pct: 1 }] },
  { nombre: 'ELECTRICIDAD', peso: 0.083526, tramos: [{ ini: 2 / 30, dur: 22 / 30, pct: 0.55 }, { ini: 24 / 30, dur: 6 / 30, pct: 0.45 }] },
  { nombre: 'PLOMERIA', peso: 0.081239, tramos: [{ ini: 2 / 30, dur: 22 / 30, pct: 0.55 }, { ini: 24 / 30, dur: 6 / 30, pct: 0.45 }] },
  { nombre: 'SISTEMAS ESPECIALES', peso: 0.029408, tramos: [{ ini: 2 / 30, dur: 22 / 30, pct: 0.55 }, { ini: 24 / 30, dur: 6 / 30, pct: 0.45 }] },
  { nombre: 'EXTERIORES', peso: 0.000742, tramos: [{ ini: 27 / 30, dur: 2 / 30, pct: 1 }] },
  { nombre: 'LIMPIEZA Y ABASTECIMIENTOS', peso: 0.009286, tramos: [{ ini: 8 / 30, dur: 18 / 30, pct: 0.8 * 18 / 22 }, { ini: 26 / 30, dur: 4 / 30, pct: 1 - 0.8 * 18 / 22 }] },
  { nombre: 'SEGURIDAD OCUPACIONAL Y BIOSEGURIDAD', peso: 0.003728, tramos: [{ ini: 8 / 30, dur: 22 / 30, pct: 1 }] },
  { nombre: 'MAQUINARIA Y EQUIPO', peso: 0.015147, tramos: [{ ini: 8 / 30, dur: 22 / 30, pct: 1 }] },
  { nombre: 'CIERRE DE APARTAMENTOS', peso: 0.002350, tramos: [{ ini: 26 / 30, dur: 4 / 30, pct: 1 }] },
  { nombre: 'APARTAMENTOS MODELOS', peso: 0.002510, tramos: [{ mes0: true, pct: 1 }] },
  { nombre: 'MISTER GYPSUM', peso: 0.010368, tramos: [{ ini: 27 / 30, dur: 2 / 30, pct: 1 }] },
  { nombre: 'DOTACIONES', peso: 0.003992, tramos: [{ ini: 28 / 30, dur: 2 / 30, pct: 1 }] },
  { nombre: 'OTROS', peso: 0.067101, tramos: [{ mes0: true, pct: 1 }] },
];

export const PLANTILLA_CASAS = [
  { nombre: 'COSTOS DE ADMINISTRACION Y PREVIOS', peso: 0.05, tramos: [{ mes0: true, pct: 0.25 }, { ini: 0, dur: 1, pct: 0.75 }] },
  { nombre: 'INFRAESTRUCTURA', peso: 0.20, tramos: [{ ini: 0, dur: 8 / 24, pct: 1 }] },
  { nombre: 'FUNDACIONES', peso: 0.08, tramos: [{ ini: 2 / 24, dur: 8 / 24, pct: 1 }] },
  { nombre: 'ESTRUCTURA Y ALBAÑILERÍA', peso: 0.32, tramos: [{ ini: 4 / 24, dur: 14 / 24, pct: 1 }] },
  { nombre: 'ACABADOS', peso: 0.22, tramos: [{ ini: 8 / 24, dur: 14 / 24, pct: 1 }] },
  { nombre: 'ELECTRICIDAD Y PLOMERIA', peso: 0.10, tramos: [{ ini: 5 / 24, dur: 16 / 24, pct: 1 }] },
  { nombre: 'AREAS SOCIALES Y EXTERIORES', peso: 0.03, tramos: [{ ini: 18 / 24, dur: 6 / 24, pct: 1 }] },
];

// Convierte un tramo relativo a meses absolutos para un plazo dado.
function tramoAbsoluto(t, plazo) {
  if (t.mes0) return { mesInicio: 0, meses: 1, pct: n(t.pct) };
  return {
    mesInicio: 1 + Math.round(n(t.ini) * plazo),
    meses: Math.max(1, Math.round(n(t.dur) * plazo)),
    pct: n(t.pct),
  };
}

// Vector mensual de porcentajes de una actividad (su fila en la cuadricula).
// Modelo principal: `dist` = arreglo de % por mes, editable celda a celda.
// Se mantiene el soporte de `tramos` para cronogramas guardados antes.
export function vectorActividad(actividad, horizonte) {
  const v = new Array(horizonte).fill(0);
  if (Array.isArray(actividad.dist)) {
    for (let i = 0; i < horizonte; i++) v[i] = n(actividad.dist[i]);
    return v;
  }
  (actividad.tramos || []).forEach((t) => {
    const meses = Math.max(1, Math.round(n(t.meses)));
    const inicio = Math.max(0, Math.round(n(t.mesInicio)));
    const porMes = n(t.pct) / meses;
    for (let k = 0; k < meses; k++) {
      const m = inicio + k;
      if (m < horizonte) v[m] += porMes;
    }
  });
  return v;
}

// Suma de porcentajes de una actividad. Debe dar 1 (columna de control).
export function sumaPct(actividad) {
  if (Array.isArray(actividad.dist)) {
    return actividad.dist.reduce((a, x) => a + n(x), 0);
  }
  return (actividad.tramos || []).reduce((a, t) => a + n(t.pct), 0);
}

// Reparte un porcentaje de forma uniforme entre dos meses (inclusive).
// Equivale al "arrastrar" de Excel.
// limpiar=true (por defecto) borra el resto del renglon, de modo que la fila
// queda sumando exactamente pctTotal y el flujo queda cuadrado de una vez.
export function repartirUniforme(dist, mesDesde, mesHasta, pctTotal, horizonte, limpiar = true) {
  const d = new Array(horizonte).fill(0);
  if (!limpiar) for (let i = 0; i < horizonte; i++) d[i] = n((dist || [])[i]);
  const a = Math.max(0, Math.min(horizonte - 1, Math.round(n(mesDesde))));
  const b = Math.max(a, Math.min(horizonte - 1, Math.round(n(mesHasta))));
  const porMes = n(pctTotal) / (b - a + 1);
  for (let i = a; i <= b; i++) d[i] = porMes;
  return d;
}

// Siembra una lista de actividades a partir de un monto global de obra
// y del plazo de ejecucion, ya expandida a distribucion mensual editable.
export function sembrarActividades(montoObra, tipo, plazoObra) {
  const plazo = Math.max(1, Math.round(n(plazoObra) || 30));
  const H = plazo + 1;
  const plantilla = tipo === 'casas' ? PLANTILLA_CASAS : PLANTILLA_TORRE;
  return plantilla.map((p, i) => {
    const base = { tramos: p.tramos.map((t) => tramoAbsoluto(t, plazo)) };
    return {
      id: `act_${i}`,
      nombre: p.nombre,
      total: Math.round(n(montoObra) * p.peso * 100) / 100,
      dist: vectorActividad(base, H),
    };
  });
}

// Reescala un cronograma existente de un plazo a otro remuestreando la
// distribucion mensual por area. El mes 0 (desembolso previo) se conserva.
export function reescalarActividades(actividades, plazoViejo, plazoNuevo) {
  const pv = Math.max(1, Math.round(n(plazoViejo)));
  const pn = Math.max(1, Math.round(n(plazoNuevo)));
  if (pv === pn) return actividades;
  const Hv = pv + 1;
  const Hn = pn + 1;
  return (actividades || []).map((a) => {
    const viejo = vectorActividad(a, Hv);
    const obra = viejo.slice(1);
    const nuevo = new Array(Hn).fill(0);
    nuevo[0] = viejo[0];
    for (let j = 0; j < pn; j++) {
      const desde = (j * pv) / pn;
      const hasta = ((j + 1) * pv) / pn;
      let acc = 0;
      for (let i = Math.floor(desde); i < Math.ceil(hasta) && i < pv; i++) {
        const sol = Math.min(hasta, i + 1) - Math.max(desde, i);
        if (sol > 0) acc += obra[i] * sol;
      }
      nuevo[j + 1] = acc;
    }
    const copia = { ...a, dist: nuevo };
    delete copia.tramos;
    return copia;
  });
}

// Escala el MONTO de cada actividad sin tocar su distribucion temporal.
// Es el gemelo de reescalarActividades: aquel mueve el tiempo, este el
// dinero. Factor 1 devuelve la misma referencia para no invalidar memos.
export function escalarActividades(actividades, factor) {
  const k = n(factor);
  if (!(k > 0) || Math.abs(k - 1) < 1e-12) return actividades;
  return (actividades || []).map((a) => ({ ...a, total: n(a.total) * k }));
}

// Siembra actividades a partir de un presupuesto importado por el cliente.
// Cada item { nombre, total } se reparte de forma uniforme entre el mes 1 y
// el plazo de obra, de modo que la suma del total cuadre y el usuario luego
// ajuste los tiempos con la herramienta "Repartir" o la cuadrícula.
export function sembrarDesdePresupuesto(items, plazoObra) {
  const plazo = Math.max(1, Math.round(n(plazoObra) || 30));
  const H = plazo + 1;
  return (items || [])
    .filter((it) => n(it.total) > 0 && str(it.nombre))
    .map((it, i) => {
      const base = { tramos: [{ mesInicio: 1, meses: plazo, pct: 1 }] };
      return {
        id: `imp_${i}_${Math.random().toString(36).slice(2, 7)}`,
        nombre: str(it.nombre).toUpperCase(),
        total: Math.round(n(it.total) * 100) / 100,
        dist: vectorActividad(base, H),
      };
    });
}

// Mes en que arranca la escrituración. 0 = automático: al terminar la
// obra. Se resuelve en un solo lugar porque lo consultan el motor de
// interés, la capa de caja y el eje de sensibilidad; si cada uno lo
// derivara por su cuenta se desincronizan al mover el plazo.
// PISO DURO (08/2026): no se escritura antes de terminar la obra. Sin el,
// un cajaMesInicio menor al plazo metia desembolsos hipotecarios mientras
// la obra seguia corriendo — amortizacion imposible (no hay permiso de
// ocupacion) que subestimaba el interes. Un mes de cierre anterior al fin
// de obra se interpreta ahora como "al terminar la obra".
export function finObraMes(params) {
  return Math.max(1, Math.round(n((params || {}).plazoObra)));
}

export function mesCierreEfectivo(params) {
  const p = params || {};
  const finObra = finObraMes(p);
  return n(p.cajaMesInicio) > 0
    ? Math.max(finObra, Math.round(n(p.cajaMesInicio)))
    : finObra;
}

// Ventana de escrituración (solo tiempos, sin montos). Se calcula antes
// que los ingresos porque de ella depende el horizonte del array.
function ventanaCierre(p) {
  const ini = mesCierreEfectivo(p);
  const meses = Math.max(1, Math.round(n(p.cajaMeses)));
  return { ini, meses, fin: ini + meses };
}

/**
 * Calcula el flujo de caja mensual y el interés de construcción.
 * @param {Array}  actividades  [{ nombre, total, tramos:[{mesInicio,meses,pct}] }]
 * @param {object} params       PARAMS_FLUJO_DEFAULT
 * @param {object} opts         { ingresosMaster } — dato derivado del Master,
 *                              no un parámetro editable. Va aparte para que
 *                              no se persista en la versión y quede rancio.
 */
export function calcularFlujoCaja(actividades, params, opts) {
  const p = { ...PARAMS_FLUJO_DEFAULT, ...(params || {}) };
  const o = opts || {};

  // DOS horizontes distintos, y la diferencia importa:
  //   HObra = hasta dónde llega el cronograma de desembolsos.
  //   H     = hasta dónde vive la DEUDA. La línea no se cancela cuando
  //           termina la obra, sino cuando se escritura.
  const HObra = Math.max(1, Math.round(n(p.horizonteMeses)));
  const vc = ventanaCierre(p);
  const brutoCierre = n(p.cajaMontoTotal) > 0 ? n(p.cajaMontoTotal) : n(o.ingresosMaster);
  // Solo se estira el horizonte si de verdad hay un repago que modelar.
  // Estirarlo sin amortización devengaría interés eterno sobre saldo pleno.
  const amortiza = !!p.cajaActivar && p.cajaAmortiza !== false && brutoCierre > 0;
  const H = amortiza ? Math.max(HObra, vc.fin) : HObra;
  // Si no viene `modo` explicito, se infiere: hay cronograma cargado ->
  // modo actividades. Esto evita que un proyecto ya guardado (que no
  // tiene el campo) se vaya silenciosamente a la curva estandar con
  // montoObra en cero.
  const hayActs = Array.isArray(actividades) && actividades.length > 0;
  const modoEstandar = p.modo ? p.modo === 'estandar' : !hayActs;
  const acts = modoEstandar ? [] : (hayActs ? actividades : []);

  const egresos = new Array(H).fill(0);

  if (modoEstandar) {
    // Una sola curva escalada al plazo. No requiere cronograma.
    const curva = curvaEstandarEgresos(p.plazoObra, p.montoObra, {
      forma: p.formaCurva, pctMes0: p.pctMes0,
    });
    curva.forEach((v, i) => { if (i < H) egresos[i] += v; });
  }

  const detalle = acts.map((a) => {
    const vec = vectorActividad(a, H);
    const total = n(a.total);
    const montos = vec.map((x) => x * total);
    montos.forEach((m, i) => { egresos[i] += m; });
    const suma = sumaPct(a);
    return {
      nombre: a.nombre,
      total,
      montos,
      sumaPct: suma,
      // Espejo de la columna AI del Excel: debe ser 0
      residual: 1 - suma,
      valida: Math.abs(1 - suma) < 1e-6,
    };
  });

  // --- Ingresos que reducen el saldo financiado ---
  // Dos fuentes, independientes:
  //   1. CAPITAL DE INICIO: monto captado en preventa (antes de la obra).
  //      Cae todo en el mes 0: es el capital con el que arrancas y reduce
  //      la exposición inicial del banco.
  //   2. FLUJO DE VENTAS EN OBRA: abonos que entran mes a mes durante la
  //      construcción. Cada venta genera su abono en el mes que se firma
  //      y reduce el saldo deudor de ese mes en adelante.
  // (Fallback a params viejos aplicarAbonos para proyectos guardados)
  const ingresos = new Array(H).fill(0);
  if (n(p.capitalInicioMonto) > 0) {
    ingresos[0] += n(p.capitalInicioMonto);
  }
  const ventasActivas = p.ventasObraActivar || (p.aplicarAbonos && n(p.ingresoTotalPreventa) > 0);
  if (ventasActivas) {
    const total = n(p.ventasObraMontoTotal) || n(p.ingresoTotalPreventa);
    const pctAb = n(p.ventasObraPctAbono) || n(p.pctAbonoInicial) || 0.10;
    const ini = Math.max(0, Math.round(n(p.ventasObraMesInicio) || n(p.mesInicioPreventa) || 0));
    const mesesV = Math.max(1, Math.round(n(p.ventasObraMeses) || n(p.mesesPreventa) || 1));
    if (total > 0) {
      const porMes = (total * pctAb) / mesesV;
      for (let k = 0; k < mesesV; k++) {
        const m = ini + k;
        if (m < H) ingresos[m] += porMes;
      }
    }
  }

  // --- CIERRE DE VENTAS: liberación por unidad al escriturar ---
  // Lo ya cobrado en obra (capital de inicio + abonos) no se vuelve a
  // cobrar al escriturar; si no se descuenta, el proyecto cobraría dos
  // veces la misma venta y la amortización saldría inflada.
  const yaCobrado = ingresos.reduce((a, x) => a + x, 0);
  const cierreTotal = Math.max(0, brutoCierre - yaCobrado);
  const cierre = new Array(H).fill(0);
  if (amortiza && cierreTotal > 0) {
    const porMesCierre = cierreTotal / vc.meses;
    for (let k = 0; k < vc.meses; k++) {
      const m = vc.ini + k;
      if (m < H) cierre[m] += porMesCierre;
    }
  }

  const tasaMes = n(p.tasaAnual) / 12;
  const meses = [];
  let acumulado = 0;
  let acumIngresos = 0;
  let interesTotal = 0;
  let mesRepagoCompleto = null;

  for (let m = 0; m < H; m++) {
    acumulado += egresos[m];
    // El cierre amortiza la línea igual que un abono, solo que después.
    // El piso en 0 hace que el excedente sobre la deuda no siga bajando
    // la base: ese sobrante es utilidad, no crédito negativo.
    acumIngresos += ingresos[m] + cierre[m];
    const baseInteres = Math.max(0, acumulado - acumIngresos);
    const interesMes = baseInteres * tasaMes;
    interesTotal += interesMes;
    if (mesRepagoCompleto === null && baseInteres <= 0.01 && m >= vc.ini) mesRepagoCompleto = m;
    meses.push({
      mes: m,
      egreso: egresos[m],
      ingreso: ingresos[m],
      cierre: cierre[m],
      acumulado,
      baseInteres,
      interesMes,
    });
  }

  const totalCostos = modoEstandar
    ? n(p.montoObra)
    : acts.reduce((a, x) => a + n(x.total), 0);
  const interesFinanciado = interesTotal * n(p.pctFinanciamiento);
  const pico = meses.reduce((mx, x) => (x.baseInteres > mx.baseInteres ? x : mx), meses[0] || { baseInteres: 0, mes: 0 });

  // Último mes con desembolso real. OJO con la distinción, porque son
  // dos cosas que se ven iguales en la tabla y significan lo contrario:
  //   · Meses muertos DENTRO del horizonte de obra = anomalía. El
  //     cronograma no fue reescalado al plazo y el interés se infla.
  //   · Meses DESPUÉS del horizonte de obra = período de escrituración.
  //     Es costo legítimo de tener la línea viva hasta el repago.
  // Medir el primero contra H (y no contra HObra) haría que la alerta
  // saltara en todo proyecto con cierre configurado.
  let ultimoMesConObra = 0;
  meses.forEach((x) => { if (x.egreso > 0.01) ultimoMesConObra = x.mes; });
  const mesesSinObra = Math.max(0, (HObra - 1) - ultimoMesConObra);
  const interesEnMesesSinObra = meses
    .filter((x) => x.mes > ultimoMesConObra && x.mes < HObra)
    .reduce((a, x) => a + x.interesMes, 0) * n(p.pctFinanciamiento);

  // Costo financiero del período de escrituración: lo que cuesta que la
  // línea siga viva desde que termina la obra hasta que se repaga.
  const mesesCierreDeuda = Math.max(0, H - HObra);
  const interesCierre = meses
    .filter((x) => x.mes >= HObra)
    .reduce((a, x) => a + x.interesMes, 0) * n(p.pctFinanciamiento);

  return {
    meses,
    detalle,
    modoEstandar,
    horizonte: H,
    horizonteObra: HObra,
    totalCostos,
    interesTotal,
    interesFinanciado,
    exposicionMaxima: pico.baseInteres,
    mesExposicionMaxima: pico.mes,
    ultimoMesConObra,
    mesesSinObra,
    interesEnMesesSinObra,
    // Cierre
    cierreAmortiza: amortiza,
    cierreTotal,
    cierreMesInicio: vc.ini,
    cierreMeses: vc.meses,
    yaCobradoEnObra: yaCobrado,
    mesRepagoCompleto,
    mesesCierreDeuda,
    interesCierre,
    actividadesInvalidas: detalle.filter((d) => !d.valida && d.total > 0).map((d) => d.nombre),
    params: p,
  };
}

// Reconciliación contra el Master (espejo de la fila 21 del Excel).
export function reconciliarConMaster(totalCostos, costoObraMaster) {
  const dif = n(totalCostos) - n(costoObraMaster);
  return {
    totalFlujo: n(totalCostos),
    totalMaster: n(costoObraMaster),
    diferencia: dif,
    pctDiferencia: n(costoObraMaster) ? dif / n(costoObraMaster) : null,
  };
}

// Impacto de aplicar el interés calculado al Master (sin aplicarlo).
export function impactoInteres(resultado, interesNuevo) {
  const r = resultado || {};
  const actual = n(r.interes);
  const ingresos = n(r.totalIngresos);
  const costoNuevo = n(r.costoTotal) - actual + n(interesNuevo);
  const utilidadNueva = ingresos - costoNuevo;
  const margenNuevo = ingresos ? utilidadNueva / ingresos : 0;
  return {
    interesActual: actual,
    interesNuevo: n(interesNuevo),
    delta: n(interesNuevo) - actual,
    deltaPct: actual ? (n(interesNuevo) - actual) / actual : null,
    margenActual: n(r.margen),
    margenNuevo,
    deltaMargenPp: (margenNuevo - n(r.margen)) * 100,
    utilidadNueva,
  };
}

// ============================================================
// SENSIBILIDAD · ESCENARIOS · PUNTOS DE QUIEBRE
//
// Todo lo de aquí abajo se AÑADE. No toca el motor validado contra
// el Excel de Luxor: cada corrida vuelve a llamar a calcularFlujoCaja
// con parámetros variados, así que no existe una segunda copia de la
// lógica que pueda desincronizarse.
//
// Convención: los params que entran aquí ya deben traer montoObra
// resuelto (el del Master). Si se re-inyectara adentro, el eje de
// "monto de obra" no podría variar.
// Misma convención para cajaMontoTotal: el llamador lo resuelve contra
// los ingresos del Master ANTES de entrar. Así esta capa no necesita el
// tercer argumento `opts` y no hay dos rutas para el mismo dato.
// ============================================================

// Variables que se pueden poner en un eje. `paso` fijo cuando la
// magnitud es universal (una tasa, un plazo); relativo al valor base
// cuando depende del tamaño del proyecto (montos).
export const EJES_SENSIBILIDAD = {
  tasaAnual: { labelKey: 'fc.sens.eje.tasa', paso: 0.005, formato: 'pct1', min: 0, max: 0.5 },
  plazoObra: { labelKey: 'fc.sens.eje.plazo', paso: 3, formato: 'meses', min: 1, max: 240, entero: true },
  pctFinanciamiento: { labelKey: 'fc.sens.eje.pctFin', paso: 0.05, formato: 'pct0', min: 0, max: 1 },
  capitalInicioMonto: { labelKey: 'fc.sens.eje.capital', pasoRel: 0.25, formato: 'monto', min: 0 },
  montoObra: { labelKey: 'fc.sens.eje.obra', pasoRel: 0.05, formato: 'monto', min: 0 },
  // Atrasar la escrituración es, en la mayoría de las torres, la variable
  // que más mueve el interés: corre sobre la exposición plena. Base 0
  // significa "auto", por eso se resuelve antes de generar los pasos.
  cajaMesInicio: { labelKey: 'fc.sens.eje.cierre', paso: 1, formato: 'meses', min: finObraMes, max: 240, entero: true, base: mesCierreEfectivo },
};

// Aplica UNA variable sobre un escenario. El plazo es el unico caso
// especial: mueve el horizonte, obliga a reescalar el cronograma e
// ARRASTRA LA ESCRITURACION.
//
// Por que arrastra (08/2026): antes el eje movia el plazo dejando
// cajaMesInicio clavado en su mes absoluto. Con el cierre fijo, acortar
// la obra significaba "gire toda la linea antes y quedese sentado sobre
// la deuda plena hasta el mes de cierre" — asi el interes SUBIA al
// acortar el plazo. La aritmetica era correcta, pero respondia una
// pregunta que nadie hizo: nadie lee "obra 12 meses" asumiendo que la
// escrituracion sigue anclada al mes 30 del calendario.
//
// Lo que se conserva es el DESFASE, no el mes absoluto: si el supuesto
// del proyecto es "escrituro 4 meses despues de terminar", el eje mueve
// el cierre con la obra y mantiene esos 4 meses. En el punto base da
// exactamente el mismo numero que antes, por construccion.
// cajaMesInicio = 0 (automatico) ya se comportaba asi: desfase 0.
export function aplicarVariable(actividades, params, clave, valor) {
  // MONTO DE OBRA. En modo estandar la curva se genera desde params.montoObra
  // y basta con escribirlo. En modo actividades el egreso NO sale de ese
  // campo: sale de la suma de actividades[].total, asi que escribir
  // params.montoObra no movia absolutamente nada — el eje devolvia siete
  // columnas con encabezados distintos y el MISMO interes. (Bug 08/2026.)
  // Se escala el cronograma completo por el mismo factor: subir el
  // presupuesto 5% sube cada partida 5% y conserva la forma de la curva.
  if (clave === 'montoObra') {
    const nuevo = Math.max(0, n(valor));
    const anterior = n(params.montoObra);
    const factor = anterior > 0 ? nuevo / anterior : 1;
    return {
      actividades: escalarActividades(actividades, factor),
      params: { ...params, montoObra: nuevo },
    };
  }
  if (clave === 'plazoObra') {
    const pn = Math.max(1, Math.round(n(valor)));
    const p2 = { ...params, plazoObra: pn, horizonteMeses: horizonteDesdePlazo(pn) };
    if (n(params.cajaMesInicio) > 0) {
      const desfase = mesCierreEfectivo(params) - finObraMes(params);
      p2.cajaMesInicio = pn + Math.max(0, desfase);
    }
    return {
      actividades: reescalarActividades(actividades, params.plazoObra, pn),
      params: p2,
    };
  }
  return { actividades, params: { ...params, [clave]: n(valor) } };
}

// Valores de un eje: `radio` pasos hacia arriba y hacia abajo del actual.
// Se recortan a los límites de la variable y se quitan repetidos, de modo
// que un eje contra un tope (0 % financiado, plazo 1) no genere columnas
// idénticas que solo ocupan espacio.
export function valoresEje(clave, params, radio) {
  const meta = EJES_SENSIBILIDAD[clave];
  if (!meta) return [];
  const base = typeof meta.base === 'function' ? n(meta.base(params)) : n(params[clave]);
  // min/max pueden depender del escenario: el mes de cierre no puede bajar
  // del fin de obra, y sin este limite el eje generaba columnas distintas
  // en la cabecera que por dentro daban el mismo numero (todas pisadas por
  // el piso de mesCierreEfectivo).
  const lim = (x) => (typeof x === 'function' ? n(x(params)) : x);
  const vMin = meta.min != null ? lim(meta.min) : null;
  const vMax = meta.max != null ? lim(meta.max) : null;
  const paso = meta.paso != null
    ? meta.paso
    : Math.max(Math.abs(base) * n(meta.pasoRel), n(params.montoObra) * 0.05) || 1;
  const out = [];
  for (let k = -radio; k <= radio; k++) {
    let v = base + k * paso;
    if (vMin != null) v = Math.max(vMin, v);
    if (vMax != null) v = Math.min(vMax, v);
    if (meta.entero) v = Math.round(v);
    else v = Math.round(v * 1e6) / 1e6;
    if (!out.some((x) => Math.abs(x - v) < 1e-9)) out.push(v);
  }
  return out.sort((a, b) => a - b);
}

// Resumen de una corrida. Es lo que se compara entre escenarios y lo
// que se pinta en cada celda de la matriz.
export function evaluarEscenario(actividades, params, opts) {
  const f = calcularFlujoCaja(actividades, params, opts);
  return {
    totalCostos: f.totalCostos,
    interesTotal: f.interesTotal,
    interesFinanciado: f.interesFinanciado,
    exposicionMaxima: f.exposicionMaxima,
    mesExposicionMaxima: f.mesExposicionMaxima,
    horizonte: f.horizonte,
    interesCierre: f.interesCierre,
    mesRepagoCompleto: f.mesRepagoCompleto,
  };
}

/**
 * Matriz de dos variables contra el interés financiado y la exposición.
 * CUIDADO: son (2·radioFilas+1) × (2·radioCols+1) corridas completas
 * — 7×5 = 35 con los valores por defecto. Llamar bajo demanda, nunca
 * en cada tecleo.
 */
export function matrizSensibilidad(actividades, params, opts) {
  const o = opts || {};
  const ejeFilas = o.ejeFilas || 'tasaAnual';
  const ejeCols = o.ejeCols || 'plazoObra';
  const filas = valoresEje(ejeFilas, params, o.radioFilas == null ? 3 : o.radioFilas);
  const cols = valoresEje(ejeCols, params, o.radioCols == null ? 2 : o.radioCols);
  const base = evaluarEscenario(actividades, params);
  const baseFila = n(params[ejeFilas]);
  const baseCol = n(params[ejeCols]);
  const eq = (a, b, clave) => Math.abs(a - b) < (EJES_SENSIBILIDAD[clave]?.entero ? 0.5 : 1e-9);

  const celdas = filas.map((vf) => {
    const paso1 = aplicarVariable(actividades, params, ejeFilas, vf);
    return cols.map((vc) => {
      const paso2 = aplicarVariable(paso1.actividades, paso1.params, ejeCols, vc);
      const r = evaluarEscenario(paso2.actividades, paso2.params);
      return {
        valorFila: vf,
        valorCol: vc,
        interesFinanciado: r.interesFinanciado,
        exposicionMaxima: r.exposicionMaxima,
        mesExposicionMaxima: r.mesExposicionMaxima,
        delta: r.interesFinanciado - base.interesFinanciado,
        deltaPct: base.interesFinanciado ? (r.interesFinanciado - base.interesFinanciado) / base.interesFinanciado : null,
        deltaExposicion: r.exposicionMaxima - base.exposicionMaxima,
        esBase: eq(vf, baseFila, ejeFilas) && eq(vc, baseCol, ejeCols),
      };
    });
  });

  // Si el plazo esta en un eje y el proyecto declara un mes de cierre
  // explicito, el eje arrastra la escrituracion conservando el desfase.
  // Se reporta para que la tabla lo diga en pantalla en vez de dejar al
  // usuario adivinar por que su mes de cierre no aparece por ningun lado.
  const ejePlazo = ejeFilas === 'plazoObra' || ejeCols === 'plazoObra';
  const acopleCierre = ejePlazo && n(params.cajaMesInicio) > 0
    ? { desfase: Math.max(0, mesCierreEfectivo(params) - finObraMes(params)) }
    : null;

  return { ejeFilas, ejeCols, filas, cols, base, celdas, acopleCierre, corridas: filas.length * cols.length };
}

/**
 * Búsqueda binaria sobre una función monótona. Devuelve SIEMPRE un
 * objeto con `ok`: si el objetivo no cae dentro del rango, se dice —
 * con los extremos evaluados — en vez de devolver un número raro.
 */
export function buscarPorBiseccion(opts) {
  const o = opts || {};
  const evaluar = o.evaluar;
  const objetivo = n(o.objetivo);
  const maxIter = o.maxIter || 30;
  const entero = !!o.entero;
  const tol = o.tol != null ? n(o.tol) : Math.max(1, Math.abs(objetivo) * 1e-4);
  let lo = n(o.lo);
  let hi = n(o.hi);
  const yLo = evaluar(lo);
  const yHi = evaluar(hi);
  const creciente = yHi >= yLo;
  const dentro = creciente
    ? objetivo >= Math.min(yLo, yHi) && objetivo <= Math.max(yLo, yHi)
    : objetivo <= Math.max(yLo, yHi) && objetivo >= Math.min(yLo, yHi);

  if (!dentro) {
    return { ok: false, motivo: 'fuera_de_rango', lo, hi, yLo, yHi, creciente };
  }

  let iter = 0;
  let mid = lo;
  let yMid = yLo;
  while (iter < maxIter) {
    iter += 1;
    mid = entero ? Math.round((lo + hi) / 2) : (lo + hi) / 2;
    yMid = evaluar(mid);
    if (Math.abs(yMid - objetivo) <= tol) break;
    const alto = creciente ? yMid > objetivo : yMid < objetivo;
    if (alto) hi = mid; else lo = mid;
    if (entero && Math.abs(hi - lo) <= 1) { mid = creciente ? lo : hi; yMid = evaluar(mid); break; }
    if (!entero && Math.abs(hi - lo) < 1e-9) break;
  }
  return { ok: true, motivo: 'convergio', valor: mid, y: yMid, iteraciones: iter, tol, creciente };
}

// Helper: corre el flujo variando una sola clave y devuelve una métrica.
function medidor(actividades, params, clave, metrica) {
  return (x) => {
    const p = aplicarVariable(actividades, params, clave, x);
    const r = evaluarEscenario(p.actividades, p.params);
    return metrica === 'exposicion' ? r.exposicionMaxima : r.interesFinanciado;
  };
}

// ¿Qué tasa anual hace que el interés financiado llegue a `interesObjetivo`?
export function tasaLimiteInteres(actividades, params, interesObjetivo, opts) {
  const o = opts || {};
  const lo = o.lo == null ? 0 : o.lo;
  const hi = o.hi == null ? 0.20 : o.hi;
  const r = buscarPorBiseccion({
    evaluar: medidor(actividades, params, 'tasaAnual', 'interes'),
    objetivo: interesObjetivo, lo, hi,
  });
  return { ...r, clave: 'tasaAnual', rango: [lo, hi] };
}

// ¿Cuánto capital de inicio hace falta para que la exposición máxima
// no pase de `exposicionObjetivo`? (La exposición baja al subir capital.)
export function capitalParaExposicion(actividades, params, exposicionObjetivo, opts) {
  const o = opts || {};
  const lo = o.lo == null ? 0 : o.lo;
  const hi = o.hi == null ? Math.max(n(params.montoObra), 1) * 1.5 : o.hi;
  const r = buscarPorBiseccion({
    evaluar: medidor(actividades, params, 'capitalInicioMonto', 'exposicion'),
    objetivo: exposicionObjetivo, lo, hi, tol: Math.max(1, Math.abs(exposicionObjetivo) * 1e-4),
  });
  return { ...r, clave: 'capitalInicioMonto', rango: [lo, hi] };
}

// ¿Cuántos meses de atraso se absorben antes de que el interés llegue a
// `interesObjetivo`? Se busca sobre el plazo y se devuelve el delta.
export function atrasoMaximo(actividades, params, interesObjetivo, opts) {
  const o = opts || {};
  const plazoBase = Math.max(1, Math.round(n(params.plazoObra)));
  const maxMeses = o.maxMeses == null ? 24 : o.maxMeses;
  const r = buscarPorBiseccion({
    evaluar: medidor(actividades, params, 'plazoObra', 'interes'),
    objetivo: interesObjetivo, lo: plazoBase, hi: plazoBase + maxMeses, entero: true,
  });
  return {
    ...r,
    clave: 'plazoObra',
    rango: [0, maxMeses],
    meses: r.ok ? Math.max(0, Math.round(r.valor) - plazoBase) : null,
    plazoBase,
  };
}

// ---------- ESCENARIOS GUARDADOS ----------
// Se guardan PARÁMETROS, nunca resultados: si el presupuesto cambia,
// el escenario se recalcula solo. Congelar los números sería fabricar
// una fuente de datos viejos que nadie audita.
export const MAX_ESCENARIOS = 5;

export function crearEscenario(nombre, params) {
  return {
    id: 'esc_' + Math.random().toString(36).slice(2, 9),
    nombre: str(nombre) || 'Escenario',
    fecha: new Date().toISOString(),
    params: { ...params },
  };
}

// ============================================================
// CAPA DE SALDO DE CAJA
//
// EXPOSICIÓN BANCARIA ≠ SALDO DE CAJA. Confundirlas sigue siendo el error
// clásico y la separación se mantiene:
//   · Exposición = obra acumulada − cobrado − amortizado. Es lo que el
//     banco financia y sobre lo que corre el interés. Vive en
//     calcularFlujoCaja.
//   · Saldo de caja = todo lo que entra menos todo lo que sale. Sirve
//     para saber si el proyecto se queda sin efectivo.
//
// LO QUE CAMBIÓ (08/2026): el cierre de ventas ya NO es exclusivo de esta
// capa. La escrituración es el repago de la línea, así que la serie se
// genera en calcularFlujoCaja y aquí solo se CONSUME. Recalcularla aquí
// haría que las dos capas se desincronicen en silencio.
// ============================================================
export function calcularSaldoCaja(flujo, params, opts) {
  const p = { ...PARAMS_FLUJO_DEFAULT, ...(params || {}) };
  if (!p.cajaActivar || !flujo || !flujo.meses) return null;
  const o = opts || {};

  const ini = mesCierreEfectivo(p);
  const mesesCierre = Math.max(1, Math.round(n(p.cajaMeses)));

  // Camino normal: el flujo ya repartió el cierre y amortizó con él.
  // Camino de respaldo (cajaAmortiza:false o flujo viejo en caché): se
  // reconstruye aquí para no dejar la capa de caja en blanco.
  const usarDelFlujo = flujo.cierreAmortiza === true;
  const bruto = n(p.cajaMontoTotal) > 0 ? n(p.cajaMontoTotal) : n(o.ingresosMaster);
  const yaCobrado = usarDelFlujo
    ? n(flujo.yaCobradoEnObra)
    : flujo.meses.reduce((a, m) => a + n(m.ingreso), 0);
  const cierreTotal = usarDelFlujo ? n(flujo.cierreTotal) : Math.max(0, bruto - yaCobrado);
  const porMes = cierreTotal / mesesCierre;

  const H = Math.max(flujo.horizonte, ini + mesesCierre);

  const meses = [];
  let saldo = 0;
  let saldoMinimo = Infinity;
  let mesSaldoMinimo = 0;
  for (let m = 0; m < H; m++) {
    const base = flujo.meses[m] || { egreso: 0, ingreso: 0 };
    const cierre = usarDelFlujo
      ? n(base.cierre)
      : ((m >= ini && m < ini + mesesCierre) ? porMes : 0);
    const entradas = n(base.ingreso) + cierre;
    const salidas = n(base.egreso);
    saldo += entradas - salidas;
    if (saldo < saldoMinimo) { saldoMinimo = saldo; mesSaldoMinimo = m; }
    meses.push({ mes: m, egreso: salidas, ingreso: n(base.ingreso), cierre, entradas, saldo });
  }

  return {
    meses,
    horizonte: H,
    horizonteExtendido: H > flujo.horizonte,
    cierreTotal,
    yaCobrado,
    bruto,
    mesInicioCierre: ini,
    mesesCierre,
    saldoMinimo: saldoMinimo === Infinity ? 0 : saldoMinimo,
    mesSaldoMinimo,
    saldoFinal: saldo,
  };
}

// Resumen por trimestre. En 30+ meses la lectura mensual no cabe legible
// ni en un teléfono ni en una página impresa; el trimestre sí.
export function resumenTrimestral(flujo, caja) {
  if (!flujo || !flujo.meses) return [];
  const H = caja ? caja.horizonte : flujo.horizonte;
  const out = [];
  for (let inicio = 0; inicio < H; inicio += 3) {
    const fin = Math.min(H - 1, inicio + 2);
    const tramo = flujo.meses.filter((m) => m.mes >= inicio && m.mes <= fin);
    const ultimo = tramo[tramo.length - 1];
    const cajaTramo = caja ? caja.meses.filter((m) => m.mes >= inicio && m.mes <= fin) : [];
    const cajaUlt = cajaTramo[cajaTramo.length - 1];
    out.push({
      id: 'T' + (out.length + 1),
      desde: inicio,
      hasta: fin,
      egreso: tramo.reduce((a, m) => a + n(m.egreso), 0),
      ingreso: tramo.reduce((a, m) => a + n(m.ingreso), 0),
      interes: tramo.reduce((a, m) => a + n(m.interesMes), 0),
      acumulado: ultimo ? ultimo.acumulado : 0,
      exposicion: ultimo ? ultimo.baseInteres : 0,
      cierre: cajaTramo.reduce((a, m) => a + n(m.cierre), 0),
      saldo: cajaUlt ? cajaUlt.saldo : null,
    });
  }
  return out;
}

// Comparación entre dos corridas: los cuatro indicadores de cabecera y,
// debajo, en qué mes se movió el cronograma de egresos.
export function compararFlujos(actual, previo) {
  if (!actual || !previo) return null;
  const d = (a, b) => ({ actual: a, previo: b, delta: a - b, deltaPct: b ? (a - b) / b : null });
  const H = Math.max(actual.horizonte, previo.horizonte);
  const meses = [];
  for (let m = 0; m < H; m++) {
    const a = n(actual.meses[m]?.egreso);
    const b = n(previo.meses[m]?.egreso);
    meses.push({ mes: m, actual: a, previo: b, delta: a - b });
  }
  return {
    totalCostos: d(actual.totalCostos, previo.totalCostos),
    interesFinanciado: d(actual.interesFinanciado, previo.interesFinanciado),
    exposicionMaxima: d(actual.exposicionMaxima, previo.exposicionMaxima),
    mesExposicionMaxima: d(actual.mesExposicionMaxima, previo.mesExposicionMaxima),
    meses,
    mayorDesvio: meses.reduce((mx, x) => (Math.abs(x.delta) > Math.abs(mx.delta) ? x : mx), { mes: 0, delta: 0 }),
  };
}

// Monto de obra del Master, para sembrar y reconciliar.
export function obraDelMaster(datos, tipo, r) {
  if (tipo === 'torre') {
    const inp = (datos && datos.inputs) || {};
    return n(inp.costoConstruccion) + n(inp.costosPromotora) + n(r && r.imprevistos);
  }
  return n(r && r.costoConst) + n(r && r.costoInd) + n(r && r.imprevistos) +
    n(r && r.infraO) + n(r && r.infraV);
}