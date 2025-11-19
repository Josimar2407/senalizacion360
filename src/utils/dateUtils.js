// src/utils/dateUtils.js
import * as XLSX from "xlsx";

/* ===== helpers base ===== */
const pad2 = (n) => String(n).padStart(2, "0");

const MESES = [
  "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE",
];

/* ===== Excel serial a Date =====
   1) Si viene número -> usa XLSX.SSF.parse_date_code (más fiable con 1900/1904)
   2) Fallback manual si hiciera falta
*/
export const excelSerialToDate = (serial) => {
  if (typeof serial !== "number") return null;
  const o = XLSX?.SSF?.parse_date_code ? XLSX.SSF.parse_date_code(serial) : null;
  if (o && o.y != null) return new Date(o.y, (o.m || 1) - 1, o.d || 1);
  // Fallback: base 1899-12-30
  const ms = (serial - 25569) * 86400 * 1000;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d;
};

/* ===== Normalizador a Date (acepta Date, número Excel, dd/mm/yyyy, ISO, etc.) ===== */
export const toDate = (s) => {
  if (!s && s !== 0) return null;
  if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
  if (typeof s === "number") return excelSerialToDate(s);
  const ds = String(s).trim();

  // dd/mm/yyyy
  const m = ds.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const y = parseInt(m[3], 10);
    const t = new Date(y, mo, d);
    return isNaN(t.getTime()) ? null : t;
  }

  // Cualquier cosa que Date entienda (ISO, etc.)
  const t = new Date(ds);
  return isNaN(t.getTime()) ? null : t;
};

/* ===== Variante "Maybe" para que no truene mapeos ===== */
export const toDateMaybe = (s) => toDate(s);

/* dd/mm/yyyy simple (por si la quieres en campos secundarios) */
export const fmtDmy = (d) =>
  d ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}` : "";

/* ===== Texto de vigencia con NOMBRE DE MES ===== */
export const vigenciaUnificada = (dDesde, dHasta) => {
  const D = toDate(dDesde), H = toDate(dHasta);
  if (!D || !H) return ""; // igual que tu versión

  const di = D.getDate(), mi = D.getMonth(), yi = D.getFullYear();
  const df = H.getDate(), mf = H.getMonth(), yf = H.getFullYear();

  if (yi === yf && mi === mf) {
    // mismo mes y año
    return `DEL ${di} AL ${df} DE ${MESES[mi]} DE ${yi}`;
  }
  if (yi === yf) {
    // mismo año, distinto mes
    return `DEL ${di} DE ${MESES[mi]} AL ${df} DE ${MESES[mf]} DE ${yi}`;
  }
  // distinto año
  return `DEL ${di} DE ${MESES[mi]} DE ${yi} AL ${df} DE ${MESES[mf]} DE ${yf}`;
};

/* ===== Extrae vigencia desde un registro (p) flexible =====
   Intenta múltiples nombres de campo típicos de tus archivos.
   Si falta uno de los dos extremos, devuelve "" (mismo criterio).
*/
export const vigenciaFromRecord = (p = {}) => {
  const dDesde =
    p.desde ?? p.vigencia_desde ?? p.vDesde ?? p.vd ?? p.inicio ?? p.vig_ini ?? p.vigenciaInicio;
  const dHasta =
    p.hasta ?? p.vigencia_hasta ?? p.vHasta ?? p.vh ?? p.fin ?? p.vig_fin ?? p.vigenciaFin;

  const txt = vigenciaUnificada(dDesde, dHasta);
  return txt || ""; // si algo no se puede, regresa vacío
};

/* ===== Nombre sugerido de archivo local ===== */
export const fechaNombreArchivoLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}`;
};
