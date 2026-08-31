// Configuración de localización: idioma, moneda y zona horaria.
// Los valores activos se reflejan en localStorage para que las funciones de
// formato (formatCurrency, fechas) los lean de forma sincrónica en cada render.

export const IDIOMAS = [
  { code: 'es', nombre: 'Español' },
  { code: 'en', nombre: 'English' },
  { code: 'pt', nombre: 'Português' },
];

export const MONEDAS = [
  { code: 'USD', nombre: 'Dólar estadounidense', symbol: '$' },
  { code: 'EUR', nombre: 'Euro', symbol: '€' },
  { code: 'PAB', nombre: 'Balboa panameño', symbol: 'B/.' },
  { code: 'MXN', nombre: 'Peso mexicano', symbol: '$' },
  { code: 'COP', nombre: 'Peso colombiano', symbol: '$' },
  { code: 'PEN', nombre: 'Sol peruano', symbol: 'S/' },
  { code: 'CLP', nombre: 'Peso chileno', symbol: '$' },
  { code: 'ARS', nombre: 'Peso argentino', symbol: '$' },
  { code: 'BRL', nombre: 'Real brasileño', symbol: 'R$' },
  { code: 'GTQ', nombre: 'Quetzal guatemalteco', symbol: 'Q' },
  { code: 'HNL', nombre: 'Lempira hondureño', symbol: 'L' },
  { code: 'CRC', nombre: 'Colón costarricense', symbol: '₡' },
  { code: 'DOP', nombre: 'Peso dominicano', symbol: 'RD$' },
];

export const ZONAS = [
  { id: 'America/Panama', nombre: 'Panamá (GMT-5)' },
  { id: 'America/Mexico_City', nombre: 'Ciudad de México (GMT-6)' },
  { id: 'America/Bogota', nombre: 'Bogotá (GMT-5)' },
  { id: 'America/Lima', nombre: 'Lima (GMT-5)' },
  { id: 'America/Santiago', nombre: 'Santiago (GMT-4)' },
  { id: 'America/Buenos_Aires', nombre: 'Buenos Aires (GMT-3)' },
  { id: 'America/Sao_Paulo', nombre: 'São Paulo (GMT-3)' },
  { id: 'America/Guatemala', nombre: 'Guatemala (GMT-6)' },
  { id: 'America/Costa_Rica', nombre: 'Costa Rica (GMT-6)' },
  { id: 'America/Santo_Domingo', nombre: 'Rep. Dominicana (GMT-4)' },
  { id: 'America/Tegucigalpa', nombre: 'Tegucigalpa (GMT-6)' },
  { id: 'UTC', nombre: 'UTC' },
  { id: 'Europe/Madrid', nombre: 'Madrid (GMT+1/+2)' },
  { id: 'US/Eastern', nombre: 'EE. UU. — Este (GMT-5)' },
  { id: 'US/Pacific', nombre: 'EE. UU. — Pacífico (GMT-8)' },
];

const STORAGE_KEY = 'prefacti_localizacion';
const DEFAULT_TZ = 'America/Panama';

const LOCALE_MAP = { es: 'es', en: 'en-US', pt: 'pt-BR' };
const MONEDA_SYMBOL = Object.fromEntries(MONEDAS.map((m) => [m.code, m.symbol]));

function leerStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return {};
}

export function getLocalizacionActiva() {
  const s = leerStorage();
  return {
    idioma: s.idioma || 'es',
    moneda: s.moneda || 'USD',
    zona: s.zona || DEFAULT_TZ,
  };
}

export function setLocalizacionActiva(cfg) {
  const actual = getLocalizacionActiva();
  const nuevo = { ...actual, ...cfg };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevo)); } catch { /* noop */ }
  return nuevo;
}

export function getMonedaActiva() {
  return leerStorage().moneda || 'USD';
}
export function getSimboloMoneda() {
  return MONEDA_SYMBOL[getMonedaActiva()] || '$';
}
export function getIdiomaActivo() {
  return leerStorage().idioma || 'es';
}
export function getZonaActiva() {
  return leerStorage().zona || DEFAULT_TZ;
}
export function getLocaleBcp47() {
  return LOCALE_MAP[getIdiomaActivo()] || 'es';
}

// Formato de moneda usando la unidad activa (símbolo) y agrupación del idioma.
export function formatMoneda(value) {
  if (value == null || isNaN(value)) return '—';
  const neg = value < 0;
  const abs = Math.abs(value);
  const decimals = abs >= 100000 ? 0 : 2;
  const sym = getSimboloMoneda();
  const s = sym + new Intl.NumberFormat(LOCALE_MAP[getIdiomaActivo()] || 'en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(abs);
  return neg ? '(' + s + ')' : s;
}

// Formatea una fecha 'YYYY-MM-DD' (sin zona horaria) como fecha local,
// evitando el desfase de un día que produce new Date('YYYY-MM-DD') (UTC).
export function formatFechaVersion(fechaStr, idioma) {
  if (!fechaStr) return '';
  const locale = idioma === 'en' ? 'en-US' : idioma === 'pt' ? 'pt-BR' : 'es-PA';
  try {
    return new Date(`${fechaStr}T00:00:00`).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return fechaStr;
  }
}

// Normaliza un timestamp de la API a UTC.
// La API devuelve fechas ISO sin sufijo 'Z' (ej: "2026-07-30T20:21:00.227000"),
// que JavaScript interpreta como hora local. Esto añade 'Z' para tratarlas como UTC
// y que la conversión a la zona horaria del usuario sea correcta.
export function normalizarFechaUTC(fecha) {
  if (typeof fecha === 'string' && fecha.includes('T') && !fecha.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(fecha)) {
    return fecha + 'Z';
  }
  return fecha;
}

// Fecha/hora absoluta en la zona horaria e idioma activos.
export function fechaLocal(fecha, opts = {}) {
  if (!fecha) return '';
  try {
    return new Intl.DateTimeFormat(LOCALE_MAP[opts.idioma || getIdiomaActivo()] || 'es', {
      day: '2-digit', month: '2-digit', year: opts.conAnio ? 'numeric' : undefined,
      hour: '2-digit', minute: '2-digit',
      timeZone: opts.zona || getZonaActiva(),
    }).format(new Date(normalizarFechaUTC(fecha)));
  } catch {
    return new Date(fecha).toLocaleString();
  }
}