// src/utils/formatUtils.js
export const toNum = (x) => Number(String(x ?? "").replace(/[^\d.-]/g, "")) || 0;
export const digitsOnly = (s) => String(s ?? "").replace(/\D/g, "");
export const normalizeEAN = (raw) => {
  const d = digitsOnly(raw);
  if (!d) return "";
  if (d.length === 12) return "0" + d;      // UPC→EAN13
  if (d.length === 14) return d.slice(-13);   // quitar DPs
  return d;
};
export const fmt2Dec = (v) => {
  const n = Number(v);
  return isNaN(n) ? "" : n.toFixed(2);
};
export const fmtMXN = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(v || 0));

export const isRangePercent = (txt) => /\bdel\s+\d{1,3}\s*%?\s+(?:al|a)\s+\d{1,3}\s*%/i.test(String(txt || ""));
export const extractSinglePercent = (txt) => {
  const s = String(txt || "");
  if (isRangePercent(s)) return null;
  const m = s.match(/(\d{1,3})\s*%/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
};
export const cleanGenericBody = (txt) => {
  const orig = String(txt || "");
  const s = orig.toLowerCase();
  if (isRangePercent(s)) return orig;
  const idxEn = s.indexOf(" en ");
  if (idxEn < 0) {
    return orig.toUpperCase();
  }
  let body = orig.slice(idxEn).trim();   // "EN TODA LA LÍNEA NIVEA..."
  body = body.replace(/^en\s+/i, "EN ");

  // Todo en mayúsculas por consistencia
  return body.toUpperCase();
};
export const stripLeadingPercent = (txt) => {
  let s = String(txt || "");
  s = s.replace(/^\s*(?:hasta\s+)?\d{1,3}\s*%(?:\s*(?:off|desc(?:\.|uento)?|de\s*desc(?:\.|uento)?))?\s*/i, "");
  s = s.replace(/^[\-:–\s]+/, "");
  return s.trim();
};