import React, { useMemo, useState, useEffect } from "react";

/* ===================== Capacidades por hoja Carta ===================== *
 * - tcarta, tresxdos: 1 por página (vertical)
 * - media: 2 por página (vertical, mitad de hoja)
 * - cuarto: 4 por página (vertical, 2x2) -> NO mezclar diferentes % en la misma hoja
 * - octavo: 8 por página (vertical, 2x4)
 * - pescante: 1 por página, contenido apaisado (rotado 90°)
 * ====================================================================== */

const CAPACITY = {
  pescante: 1,
  tcarta: 1,
  tresxdos: 1,
  media: 2,
  cuarto: 4,
  octavo: 8,
};

const SIZE_LABEL = {
  pescante: "Pescante",
  tcarta: "T/Carta",
  media: "1/2",
  cuarto: "1/4",
  octavo: "1/8",
  tresxdos: "3x2",
};

/** Tamaños recomendados por defecto (puedes afinarlos) */
const DEFAULT_FONT_CONFIG = {
  title: 48,        // Título grande
  vigencia: 24,     // Texto de vigencia
  priceRegular: 16, // Precio tachado
  pricePromo: 28,   // Precio promo
};

/** Extrae un porcentaje del título o del campo percent (si viene). */
function getPercentFromItem(it) {
  if (it?.percent) {
    const m = String(it.percent).match(/(\d{1,3})/);
    if (m) return Number(m[1]);
  }
  const n = String(it?.title || "").match(/(\d{1,3})\s*%/);
  return n ? Number(n[1]) : null;
}

/** Expande items en “tiles” atómicos (una pieza = un tile). Para 1/4 agrupa por % */
function explodeTiles(items) {
  const out = [];
  for (const it of items || []) {
    const qty = Math.max(0, Number(it.qty || 0));
    const base = {
      size: it.size,
      title: String(it.title || "").trim(),
      subtitle: String(it.subtitle || "").trim(), // vigencia
      percent: getPercentFromItem(it),
      precioRegular: it.precioRegular ?? null,
      precioPromocion: it.precioPromocion ?? null,
      badge: it.size === "tresxdos" ? "3x2" : null, // badge visual
    };
    // Cuartos: clave de grupo por porcentaje (no mezclar % en la misma página)
    const groupKey =
      it.size === "cuarto"
        ? (base.percent == null ? "SIN%" : `${base.percent}%`)
        : null;

    for (let i = 0; i < qty; i++) {
      out.push({ ...base, groupKey });
    }
  }
  return out;
}

/** Pagina en lotes de N por hoja; para cuartos respeta groupKey (%). */
function paginateByCapacity(tiles, size) {
  const cap = CAPACITY[size] || 1;
  if (size === "cuarto") {
    const byGroup = new Map();
    for (const t of tiles) {
      const k = t.groupKey || "SIN%";
      if (!byGroup.has(k)) byGroup.set(k, []);
      byGroup.get(k).push(t);
    }
    // cada grupo (mismo %) se pagina aparte
    const pages = [];
    for (const [, arr] of byGroup) {
      for (let i = 0; i < arr.length; i += cap) {
        pages.push(arr.slice(i, i + cap));
      }
    }
    return pages;
  }
  // resto de tamaños
  const pages = [];
  for (let i = 0; i < tiles.length; i += cap) {
    pages.push(tiles.slice(i, i + cap));
  }
  return pages;
}

/** Render común del contenido del “signo” (texto + precios + vigencia). */
function SignContent({ tile }) {
  const hasPrices =
    tile?.precioRegular != null || tile?.precioPromocion != null;

  return (
    <div className="sign-inner">
      {/* Badge del formato y/o 3x2 */}
      <div className="sign-head">
        <span className="badge">{SIZE_LABEL[tile.size] || tile.size}</span>
        {tile.badge && <span className="badge-alt">{tile.badge}</span>}
      </div>

      {/* Título centrado, 3 líneas máx */}
      <div className="sign-title clamp-3" title={tile.title}>
        {tile.title}
      </div>

      {/* Precios (si existen) */}
      {hasPrices && (
        <div className="sign-prices">
          {tile.precioRegular != null && (
            <span className="regular">
              ${String(tile.precioRegular).trim()}
            </span>
          )}
          {tile.precioPromocion != null && (
            <span className="promo">
              ${String(tile.precioPromocion).trim()}
            </span>
          )}
        </div>
      )}

      {/* Vigencia, 2 líneas máx */}
      {tile.subtitle && (
        <div className="sign-vigencia">
          {/* <span className="pill">VIGENCIA</span> */}
          <span className="clamp-2" title={tile.subtitle}>
            {tile.subtitle}
          </span>
        </div>
      )}
    </div>
  );
}

/** Una “página carta” que aloja N signos (grid según tamaño). */
function Page({ size, tiles }) {
  // Clases de layout por tamaño
  const gridClass =
    size === "media"
      ? "grid-2"
      : size === "cuarto"
      ? "grid-4"
      : size === "octavo"
      ? "grid-8"
      : "grid-1"; // tcarta, tresxdos, pescante

  return (
    <div className={`print-page ${size === "pescante" ? "landscape-sim" : ""}`}>
      <div className={`grid-wrap ${gridClass}`}>
        {tiles.map((t, i) => (
          <div key={i} className={`sign sign-${size}`}>
            <SignContent tile={t} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ScreenPrint({ batch }) {
  const items = Array.isArray(batch?.items) ? batch.items : [];

  // ====== Estado para tamaños de fuente (panel de control) ======
  const [fontCfg, setFontCfg] = useState(DEFAULT_FONT_CONFIG);

  // Cargar configuración guardada (si existe)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("spFontConfig");
      if (saved) {
        const parsed = JSON.parse(saved);
        setFontCfg((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.warn("No se pudo leer spFontConfig", e);
    }
  }, []);

  // Aplicar a variables CSS + guardar
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sp-title", String(fontCfg.title));
    root.style.setProperty("--sp-vigencia", String(fontCfg.vigencia));
    root.style.setProperty(
      "--sp-price-regular",
      String(fontCfg.priceRegular)
    );
    root.style.setProperty("--sp-price-promo", String(fontCfg.pricePromo));

    try {
      localStorage.setItem("spFontConfig", JSON.stringify(fontCfg));
    } catch (e) {
      console.warn("No se pudo guardar spFontConfig", e);
    }
  }, [fontCfg]);

  const handleChange = (key, value) => {
    setFontCfg((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  const handleReset = () => {
    setFontCfg(DEFAULT_FONT_CONFIG);
  };

  // 1) Expandimos a tiles
  const tiles = useMemo(() => explodeTiles(items), [items]);

  // 2) Separamos por tamaño
  const tilesBySize = useMemo(() => {
    const map = new Map();
    for (const t of tiles) {
      if (!map.has(t.size)) map.set(t.size, []);
      map.get(t.size).push(t);
    }
    return map;
  }, [tiles]);

  // 3) Paginamos por tamaño (y % en 1/4)
  const pages = useMemo(() => {
    const out = [];
    for (const [size, arr] of tilesBySize) {
      const groups = paginateByCapacity(arr, size);
      groups.forEach((g) => out.push({ size, tiles: g }));
    }
    return out;
  }, [tilesBySize]);

  // ====== Estilos (pantalla + impresión) ======
  const css = `
      /* ================== Variables de tamaño para ScreenPrint ================== */
      :root{
        --sp-title: ${DEFAULT_FONT_CONFIG.title};
        --sp-vigencia: ${DEFAULT_FONT_CONFIG.vigencia};
        --sp-price-regular: ${DEFAULT_FONT_CONFIG.priceRegular};
        --sp-price-promo: ${DEFAULT_FONT_CONFIG.pricePromo};
      }

      /* ====================================================
        🔥 ESCALA AUTOMÁTICA POR TAMAÑO DE FORMATO
        Cada cartel asigna su propio factor
      ===================================================== */
      .sign-tcarta{   --sp-scale: 1;    }
      .sign-tresxdos{ --sp-scale: 1;    }
      .sign-pescante{ --sp-scale: 1;    }
      .sign-media{    --sp-scale: .85;  }  /* 1/2 */
      .sign-cuarto{   --sp-scale: .46;  }  /* 1/4 */
      .sign-octavo{   --sp-scale: .55;  }  /* 1/8 */

      /* ===== PANTALLA (revisión de cortes) ===== */
      .print-page{
        width: 800px;               /* carta vertical aprox (antes 816px) */
        height: 1056px;
        margin: 10px auto;          /* separación ENTRE hojas en PANTALLA */
        border: 2px dashed #e5e7eb; /* borde visible SOLO en pantalla */
        border-radius: 10px;
        background: #fff;
        box-shadow: 0 8px 24px rgba(0,0,0,.06);
        overflow: hidden;
        box-sizing: border-box;     /* ADJ: asegura cómputo de ancho con bordes */
      }

      .print-page.landscape-sim{
        width: 1056px;
        height: 800px;
      }

      .grid-wrap{ width:100%; height:100%; display:grid; box-sizing:border-box; }
      .grid-1{ padding:24px 32px 24px 24px; gap:0px; }
      .grid-2{ padding:24px 32px 24px 24px; gap:12px; }
      .grid-4{
        padding:24px 32px 24px 24px;
        gap:12px;
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(2, 1fr);
      }
      .grid-8{ padding:24px 32px 24px 24px; gap:8px; }

      /* Carteles */
      .sign{
        border:1px solid #d1d5db;
        background:#fff;
        border-radius:12px;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:16px;
        text-align:center;
      }
      .sign-inner{
        width:100%;
        height:100%;
        display:flex;
        flex-direction:column;
        justify-content:flex-start;
        align-items:center;
        gap:8px;
      }

      /* ====================================================
        🔥 TIPOGRAFÍA AUTOMÁTICA
        Tamaño final = slider * factor de escala del formato
      ===================================================== */
      .sign-title{
        font-weight:900;
        text-transform:uppercase;
        line-height:1.06;
        letter-spacing:.2px;
        word-break:break-word;
        display:-webkit-box;
        -webkit-line-clamp:3;
        -webkit-box-orient:vertical;
        overflow:hidden;
        margin:0 auto;

        /* 🔥 tamaño automático */
        font-size: calc(var(--sp-title) * var(--sp-scale) * 1px);

        margin-top: 150px;
      }

      .sign-prices{
        display:flex;
        gap:10px;
        justify-content:center;
        align-items:baseline;
      }

      .sign-prices .regular{
        color:#6b7280;
        text-decoration: line-through;

        /* 🔥 escala automática */
        font-size: calc(var(--sp-price-regular) * var(--sp-scale) * 1px);
      }
      .sign-prices .promo{
        color:#111;
        font-weight:900;

        /* 🔥 escala automática */
        font-size: calc(var(--sp-price-promo) * var(--sp-scale) * 1px);
      }

      /* === Vigencia en UNA sola línea, sin romper márgenes === */
      .sign-vigencia{
        width: 100%;
        margin-top: auto;
        display: flex;
        justify-content: center;
        overflow: hidden;        /* bloquea cualquier desbordamiento */
        padding: 0 8px;          /* evita pegarse a los bordes */
        box-sizing: border-box;  /* asegura que el padding NO expanda el contenedor */
      }

      .sign-vigencia .clamp-2{
        width: 100%;
        white-space: nowrap;         /* no permite salto de línea */
        overflow: hidden;            /* corta lo que se pase */
        text-overflow: ellipsis;     /* agrega "..." */
        color:#334155;
        text-align: center;
        font-size: calc(var(--sp-vigencia) * var(--sp-scale) * 1px);
        line-height: 1.1;
      }


      /* ===== Panel de control de tamaños (solo pantalla) ===== */
      .sp-font-panel{
        position: fixed;
        right: 16px;
        top: 16px;
        z-index: 9999;
        background: rgba(255,255,255,0.96);
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 8px 10px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.12);
        font-size: 12px;
        max-width: 260px;
      }
      .sp-font-panel strong{
        display:block;
        margin-bottom:4px;
      }
      .sp-font-row{ margin-bottom:4px; }
      .sp-font-row label{ display:block; }
      .sp-font-row input[type="range"]{ width:100%; }
      .sp-font-reset{
        margin-top:6px;
        width:100%;
        border:none;
        border-radius:6px;
        padding:4px 6px;
        cursor:pointer;
        font-size:12px;
      }

      /* ===== IMPRESIÓN ===== */
      @media print {
        body * { visibility: hidden; }
        .plan-root, .plan-root * { visibility: visible; }
        .plan-head { display: none !important; }
        .sp-font-panel { display:none !important; }

        html, body { margin: 0 !important; padding: 0 !important; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

        .print-page{
          width: 816px !important;
          height: 1056px !important;
          margin: 0 auto !important;
          border: 0 !important;
          box-shadow: none !important;
          page-break-after: always;
          break-after: page;
        }

        .grid-wrap, .sign { break-inside: avoid-page; page-break-inside: avoid; }

        @page { size: letter portrait; margin: 0; }
      }
  `;


  // ====== Resumen arriba de la pared de páginas para uso en pantalla ======
  const totals = useMemo(() => {
    const acc = new Map();
    for (const it of items) {
      const k = it.size;
      acc.set(k, (acc.get(k) || 0) + Number(it.qty || 0));
    }
    return [...acc.entries()]
      .map(([k, n]) => `${SIZE_LABEL[k] || k}: ${n}`)
      .join(" · ");
  }, [items]);

  return (
    <div className="plan-root">
      <style>{css}</style>

      {/* Panel de control de tamaños (solo vista, no impresión) */}
      <div className="no-print sp-font-panel">
        <strong>Tamaños ScreenPrint</strong>

        <div className="sp-font-row">
          <label>
            Título: {fontCfg.title}px
            <input
              type="range"
              min="24"
              max="96"
              value={fontCfg.title}
              onChange={(e) => handleChange("title", e.target.value)}
            />
          </label>
        </div>

        <div className="sp-font-row">
          <label>
            Vigencia: {fontCfg.vigencia}px
            <input
              type="range"
              min="12"
              max="40"
              value={fontCfg.vigencia}
              onChange={(e) => handleChange("vigencia", e.target.value)}
            />
          </label>
        </div>

        <div className="sp-font-row">
          <label>
            Precio regular: {fontCfg.priceRegular}px
            <input
              type="range"
              min="10"
              max="32"
              value={fontCfg.priceRegular}
              onChange={(e) => handleChange("priceRegular", e.target.value)}
            />
          </label>
        </div>

        <div className="sp-font-row">
          <label>
            Precio promo: {fontCfg.pricePromo}px
            <input
              type="range"
              min="16"
              max="48"
              value={fontCfg.pricePromo}
              onChange={(e) => handleChange("pricePromo", e.target.value)}
            />
          </label>
        </div>

        <button
          type="button"
          className="sp-font-reset"
          onClick={handleReset}
        >
          Usar tamaños recomendados
        </button>
      </div>

      {/* Header pantalla (no se imprime) */}
      <div className="plan-head no-print">
        <div>
          <h2 style={{ margin: "6px 0", fontSize: 16, fontWeight: 800 }}>
            Plan de impresión
          </h2>
          <div className="resume">{totals || "Sin piezas asignadas"}</div>
        </div>
        <div className="actions">
          <button onClick={() => window.history.back?.()}>Volver</button>
          <button
            onClick={() => window.print()}
            style={{ marginLeft: 8, fontWeight: 800 }}
          >
            Imprimir
          </button>
        </div>
      </div>

      {/* Pared de páginas */}
      <div className="preview-wall">
        {pages.length === 0 ? (
          <div style={{ color: "#64748b" }}>
            No hay elementos para imprimir.
          </div>
        ) : (
          pages.map((pg, idx) => (
            <Page key={idx} size={pg.size} tiles={pg.tiles} />
          ))
        )}
      </div>
    </div>
  );
}
