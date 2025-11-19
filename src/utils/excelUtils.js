// src/utils/excelUtils.js
import * as XLSX from "xlsx";
import { HEADERS_P2, SHEET_P2, SHEET_P3 } from "./constants";
import { toNum, fmt2Dec } from "./formatUtils";
import { vigenciaUnificada, fechaNombreArchivoLocal, fmtDmy, toDate } from "./dateUtils";

// Recibe todos los datos que necesita. No lee estado por cierre.
export function exportExcel({
  qtyP2,                 // objeto: { `${dept}::${gen}::${size}`: cantidad }
  qtyP3,                 // objeto: { `${dept}::${gen}::${ean}-${size}`: cantidad }
  deptList,              // array: [{ code, label }]
  promoDatesG,           // objeto: { `${dept}::${gen}`: {desde, hasta} }
  materials,             // array: [{ dept, promoG, descH, ean, vigDesde, vigHasta, descuentoPct, precioRegular, precioPromocion }]
  toNum = (x) => Number(x || 0), // opcional para compatibilidad
}) {
  /* ========================= Hoja 1: Promociones (P2) ========================= */
  const headerP2 = [
    "Departamento", "Promoción", "Vigencia",
    HEADERS_P2.pescante, HEADERS_P2.tcarta, HEADERS_P2.media,
    HEADERS_P2.cuarto, HEADERS_P2.octavo, HEADERS_P2.tresxdos,
  ];

  const mapP2 = new Map();
  Object.entries(qtyP2 || {}).forEach(([k, v]) => {
    const n = toNum(v); if (n <= 0) return;
    const mm = k.match(/^([^:]+)::(.+?)::(pescante|tcarta|media|cuarto|octavo|tresxdos)$/);
    if (!mm) return;
    const dept = mm[1], gen = mm[2], size = mm[3];
    const promoKey = `${dept}::${gen}`;

    const deptLabel = (() => {
      const d = (deptList || []).find((x) => x.code === dept);
      return d?.label || dept;
    })();

    const vig = vigenciaUnificada(
      promoDatesG?.[promoKey]?.desde,
      promoDatesG?.[promoKey]?.hasta
    );

    if (!mapP2.has(promoKey)) {
      mapP2.set(promoKey, {
        deptLabel,
        gen, // se conserva “tal cual” como te funcionaba
        vig,
        sizes: { pescante: 0, tcarta: 0, media: 0, cuarto: 0, octavo: 0, tresxdos: 0 },
      });
    }
    mapP2.get(promoKey).sizes[size] += n;
  });

  const rowsP2 = Array.from(mapP2.values()).map((r) => [
    r.deptLabel, r.gen, r.vig,
    r.sizes.pescante, r.sizes.tcarta, r.sizes.media,
    r.sizes.cuarto, r.sizes.octavo, r.sizes.tresxdos,
  ]);

  const wsP2 = XLSX.utils.aoa_to_sheet([headerP2, ...rowsP2]);
  wsP2["!cols"] = [
    { wch: 26 }, { wch: 60 }, { wch: 44 },
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
  ];
  wsP2["!autofilter"] = { ref: `A1:I${rowsP2.length + 1}` };

  /* ========================= Hoja 2: Comparativos (P3) ======================= */
  const headerP3 = [
    "Departamento","Comparativo","Descuento (%)","Precio Regular","Precio Promoción","Vigencia",
    HEADERS_P2.pescante, HEADERS_P2.tcarta, HEADERS_P2.media, HEADERS_P2.cuarto, HEADERS_P2.octavo, HEADERS_P2.tresxdos,
  ];

  const matIndex = new Map();
  (materials || []).forEach((m) => {
    const mKey = `${m.dept}::${m.promoG}::${m.ean}`;
    matIndex.set(mKey, m);
  });

  const mapP3 = new Map();
  Object.entries(qtyP3 || {}).forEach(([k, v]) => {
    const n = toNum(v); if (n <= 0) return;
    const mm = k.match(/^(.+)-(pescante|tcarta|media|cuarto|octavo|tresxdos)$/);
    if (!mm) return;

    const mKey = mm[1], size = mm[2];
    const m = matIndex.get(mKey); if (!m) return;
    const promoKey = `${m.dept}::${m.promoG}`;

    const desde = promoDatesG?.[promoKey]?.desde ?? fmtDmy(toDate(m.vigDesde));
    const hasta = promoDatesG?.[promoKey]?.hasta ?? fmtDmy(toDate(m.vigHasta));
    const vig = vigenciaUnificada(desde, hasta);

    const deptLabel = (() => {
      const d = (deptList || []).find((x) => x.code === m.dept);
      return d?.label || m.dept;
    })();

    if (!mapP3.has(mKey)) {
      mapP3.set(mKey, {
        deptLabel,
        promoH: String(m.descH ?? ""), // ← EXACTO tal cual columna H (Comparativo)
        descuentoPct: String(m.descuentoPct ?? "").trim(),
        precioRegular: m.precioRegular,
        precioPromocion: m.precioPromocion,
        vig,
        sizes: { pescante: 0, tcarta: 0, media: 0, cuarto: 0, octavo: 0, tresxdos: 0 },
      });
    }
    mapP3.get(mKey).sizes[size] += n;
  });

  const rowsP3 = Array.from(mapP3.values()).map((r) => [
    r.deptLabel, r.promoH, r.descuentoPct, r.precioRegular, r.precioPromocion, r.vig,
    r.sizes.pescante, r.sizes.tcarta, r.sizes.media, r.sizes.cuarto, r.sizes.octavo, r.sizes.tresxdos,
  ]);

  /* ========================= Libro y guardado =============================== */
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsP2, SHEET_P2);

  if (rowsP3.length > 0) {
    const wsP3 = XLSX.utils.aoa_to_sheet([headerP3, ...rowsP3]);
    wsP3["!cols"] = [
      { wch: 26 }, { wch: 64 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 36 },
      { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
    ];
    wsP3["!autofilter"] = { ref: `A1:L${rowsP3.length + 1}` };
    XLSX.utils.book_append_sheet(wb, wsP3, SHEET_P3);
  }

  XLSX.writeFile(wb, `Señalización_${fechaNombreArchivoLocal()}.xlsx`);
}

