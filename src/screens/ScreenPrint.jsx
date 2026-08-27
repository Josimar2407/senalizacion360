import React, { useMemo } from "react";

const CAPACITY = {
  pescante: 1,
  tcarta: 1,
  tresxdos: 6,
  media: 2,
  cuarto: 4,
  octavo: 8,
};

const SIZE_LABEL = {
  pescante: "Pescante",
  tcarta: "T/Carta",
  media: "1/2 Carta",
  cuarto: "1/4 Carta",
  octavo: "1/8 Carta",
  tresxdos: "3x2",
};

function formatPrice(val) {
  if (val === null || val === undefined || val === '') return '';
  const num = parseFloat(val);
  return isNaN(num) ? val : num.toFixed(2);
}

function getPercentFromItem(it) {
  if (it?.percent) {
    const m = String(it.percent).match(/(\d{1,3})/);
    if (m) return Number(m[1]);
  }
  const n = String(it?.title || "").match(/(\d{1,3})\s*%/);
  return n ? Number(n[1]) : null;
}

// ✨ RECUPERADA: Función que calcula el tamaño de letra según el número de letras
function getDynamicTitleSizeNum(text, hasPrices) {
  const len = (text || "").length;
  
  if (!hasPrices) {
    // Si viene de P2 (Genéricos) -> Espacio del 90% disponible
    if (len < 15) return 150;
    if (len < 30) return 140;
    if (len < 55) return 110;
    return 40;
  } else {
    // Si viene de P3 (Comparativos con Precios) -> Espacio del 55% disponible
    if (len < 15) return 155;
    if (len < 30) return 137;
    if (len < 55) return 100;
    return 26;
  }
}

function explodeTiles(items) {
  const out = [];
  for (const it of items || []) {
    const qty = Math.max(0, Number(it.qty || 0));
    const base = {
      size: it.size,
      title: String(it.title || "").trim(),
      subtitle: String(it.subtitle || "").trim(),
      percent: getPercentFromItem(it),
      precioRegular: it.precioRegular ?? null,
      precioPromocion: it.precioPromocion ?? null,
    };
    const groupKey = base.percent == null ? "OFERTA" : `${base.percent}% de descuento`;
    for (let i = 0; i < qty; i++) {
      out.push({ ...base, groupKey });
    }
  }
  return out;
}

function paginateByCapacity(tiles, size) {
  const cap = CAPACITY[size] || 1;
  const byGroup = new Map();
  for (const t of tiles) {
    const k = t.groupKey || "OFERTA";
    if (!byGroup.has(k)) byGroup.set(k, []);
    byGroup.get(k).push(t);
  }
  const pages = [];
  for (const [, arr] of byGroup) {
    for (let i = 0; i < arr.length; i += cap) {
      pages.push(arr.slice(i, i + cap));
    }
  }
  return pages;
}

function generarPlanDeImpresion(items) {
  const agrupado = {};
  items.forEach(it => {
    const qty = Number(it.qty || 0);
    if (qty <= 0) return;
    const formato = it.size;
    const pct = getPercentFromItem(it);
    const cabecera = pct ? `${pct}% de descuento` : 'OFERTA / SIN DESCUENTO';
    if (!agrupado[cabecera]) {
      agrupado[cabecera] = { pescante: 0, tcarta: 0, media: 0, cuarto: 0, octavo: 0, tresxdos: 0 };
    }
    agrupado[cabecera][formato] = (agrupado[cabecera][formato] || 0) + qty;
  });

  const planImpresion = [];
  Object.entries(agrupado).forEach(([cabecera, formatos]) => {
    Object.entries(formatos).forEach(([formato, cantidadPedida]) => {
      if (cantidadPedida <= 0) return;
      const capacidadHoja = CAPACITY[formato] || 1;
      const hojasNecesarias = Math.ceil(cantidadPedida / capacidadHoja);
      const espaciosTotales = hojasNecesarias * capacidadHoja;
      const desperdicio = espaciosTotales - cantidadPedida;
      planImpresion.push({ cabecera, formato, cantidadPedida, capacidadHoja, hojasNecesarias, desperdicio });
    });
  });

  const planAgrupado = {};
  planImpresion.forEach(item => {
    if(!planAgrupado[item.cabecera]) planAgrupado[item.cabecera] = [];
    planAgrupado[item.cabecera].push(item);
  });
  return planAgrupado;
}

function SignContent({ tile }) {
  const hasPrices = tile?.precioRegular != null || tile?.precioPromocion != null;
  const dynamicSize = getDynamicTitleSizeNum(tile.title, hasPrices);

  return (
    <div className={`sign-inner ${hasPrices ? 'has-prices' : 'no-prices'}`}>
      {/* Título con tamaño calculado dinámicamente según la cantidad de letras */}
      <div 
        className="sign-title clamp-4" 
        title={tile.title}
        style={{ fontSize: `calc(${dynamicSize}px * var(--sp-scale))` }}
      >
        {tile.title}
      </div>

      {/* Bloque de Precios (Solo si viene de Comparativos - P3) */}
      {hasPrices && (
        <div className="sign-prices-group">
          <div className="price-row regular-row">
            <span className="price-label">DE: </span>
            <span className="regular">${formatPrice(tile.precioRegular)}</span>
          </div>
          <div className="price-row promo-row">
            <span className="price-label">A: </span>
            <span className="promo">${formatPrice(tile.precioPromocion)}</span>
          </div>
        </div>
      )}

      {/* Vigencia fija al fondo */}
      {tile.subtitle && (
        <div className="sign-vigencia">
          <span className="clamp-2" title={tile.subtitle}>
            {tile.subtitle}
          </span>
        </div>
      )}
    </div>
  );
}

function Page({ size, tiles }) {
  const gridClass =
    size === "media" ? "grid-2"
      : size === "cuarto" ? "grid-4"
      : size === "octavo" ? "grid-8"
      : size === "tresxdos" ? "grid-6"
      : "grid-1";

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

  const tiles = useMemo(() => explodeTiles(items), [items]);
  const planDeImpresion = useMemo(() => generarPlanDeImpresion(items), [items]);

  const tilesBySize = useMemo(() => {
    const map = new Map();
    for (const t of tiles) {
      if (!map.has(t.size)) map.set(t.size, []);
      map.get(t.size).push(t);
    }
    return map;
  }, [tiles]);

  const pages = useMemo(() => {
    const out = [];
    for (const [size, arr] of tilesBySize) {
      const groups = paginateByCapacity(arr, size);
      groups.forEach((g) => out.push({ size, tiles: g }));
    }
    return out;
  }, [tilesBySize]);

  const guardarPlanEnBD = () => {
    const totalHojas = Object.values(planDeImpresion)
      .flat()
      .reduce((sum, item) => sum + item.hojasNecesarias, 0);

    const payload = {
      fechaCreacion: new Date().toISOString(),
      totalHojasCarta: totalHojas,
      planDetallado: planDeImpresion,
      materialesEAN: items.map(it => ({ id: it.id, cantidad: it.qty, descuento: it.percent }))
    };

    console.log("🚀 Payload listo para enviar a la Base de Datos:", JSON.stringify(payload, null, 2));
    alert("¡Informe generado y estructurado en Consola!\n\nListo para conectarse al Backend.");
  };

const css = `
      .sign-tcarta{   --sp-scale: 1;    }
      .sign-pescante{ --sp-scale: 1;    }
      .sign-media{    --sp-scale: 0.7;  } 
      .sign-cuarto{   --sp-scale: 0.5;  } 
      .sign-tresxdos{ --sp-scale: 0.45; } 
      .sign-octavo{   --sp-scale: 0.35; } 

      /* Márgenes visibles en la PC con borde punteado claro */
      .print-page{
        width: 800px; height: 1056px; margin: 24px auto;
        border: 3px dashed #94a3b8; border-radius: 12px; background: #fff;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden; box-sizing: border-box;
      }
      .print-page.landscape-sim{ width: 1056px; height: 800px; }

      .grid-wrap{ width:100%; height:100%; display:grid; box-sizing:border-box; }
      .grid-1{ padding:32px; gap:0px; }
      .grid-2{ padding:32px; gap:16px; }
      .grid-4{ padding:32px; gap:16px; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); }
      .grid-6{ padding:32px; gap:16px; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(3, 1fr); }
      .grid-8{ padding:32px; gap:16px; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(4, 1fr); }

      .sign{
        border: 2px solid #ef4444; background:#fff; border-radius:12px;
        display:flex; align-items:center; justify-content:center; padding:12px; text-align:center;
        overflow: hidden; box-sizing: border-box;
      }

      /* Contenedor maestro estricto para que NADA rompa los márgenes */
      .sign-inner{ 
        width:100%; height:100%; display:flex; flex-direction:column; 
        justify-content:space-between; align-items:center; padding: 4px; box-sizing: border-box;
        overflow: hidden;
      }

      /* CASO 1: SIN PRECIOS (Genéricos - P2) */
      .sign-inner.no-prices .sign-title {
        height: 85%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 900; text-transform: uppercase; line-height: 1.1; word-break: break-word;
      }
      .sign-inner.no-prices .sign-vigencia { height: 15%; display: flex; align-items: center; justify-content: center; }

      /* CASO 2: CON PRECIOS (Comparativos - P3) -> Distribución Proporcional Ajustada */
      .sign-inner.has-prices .sign-title {
        height: 70%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 900; text-transform: uppercase; line-height: 1.05; word-break: break-word;
      }
      
      .sign-inner.has-prices .sign-prices-group {
        height: 30%;
        display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2px;
        width: 100%;
      }

      .price-row { display: flex; align-items: baseline; gap: 8px; justify-content: center; }
      .price-label { font-size: calc(35px * var(--sp-scale)); font-weight: 900; color: #111; }
      
      .regular-row .regular { 
        color:#64748b; font-weight: 700; position: relative; display: inline-block; padding: 0 4px; line-height: 1;
        font-size: calc(72px * var(--sp-scale)); 
      }
      .regular-row .regular::after {
        content: ""; position: absolute; left: 0; right: 0; top: 50%; height: calc(3.5px * var(--sp-scale));
        background: #64748b; transform: rotate(-10deg);
      }
      
      .promo-row .promo { 
        color:#b91c1c; font-weight:900; line-height: 1;
        font-size: calc(102px * var(--sp-scale)); 
      }

      .sign-inner.has-prices .sign-vigencia {
        height: 10%;
        display: flex; align-items: center; justify-content: center;
      }

      /* Reglas comunes de texto para asegurar que no empujen los márgenes */
      .sign-title {
        overflow: hidden; text-align: center; width: 100%; text-overflow: ellipsis;
      }
      
      .sign-vigencia{
        font-weight: 700; width: 100%; overflow: hidden; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
      }
      
      /* ✨ VIGENCIA FORZADA A UNA SOLA LÍNEA LIMPIA Y SIN PUNTOS SUSPENSIVOS ✨ */
      .sign-vigencia .clamp-2{
        width: 100%; 
        white-space: nowrap !important; 
        overflow: visible !important; 
        text-overflow: clip !important;
        color: #334155; 
        text-align: center; 
        font-size: calc(18px * var(--sp-scale)); 
        line-height: 1;
      }

      /* Estilos del Plan de Impresión */
      .print-plan-container {
        margin: 20px auto; max-width: 1056px; padding: 20px;
        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
      }
      .plan-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
      .task-card {
        background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; flex-direction: column;
      }
      .task-head { background: #ef4444; color: #fff; padding: 12px 16px; font-weight: 800; font-size: 1.1rem; text-align: center; }
      .task-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
      .task-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
      .task-row:last-child { border-bottom: none; padding-bottom: 0; }
      .task-format { font-weight: 800; color: #0f172a; text-transform: uppercase; font-size: 0.95rem; }
      .task-stats { text-align: right; }
      .task-hojas { font-size: 1.1rem; font-weight: 900; color: #0369a1; background: #e0f2fe; padding: 2px 8px; border-radius: 6px; }
      .task-piezas { font-size: 0.8rem; color: #64748b; font-weight: 600; margin-top: 4px; display: block; }
      .task-merma-ok { font-size: 0.75rem; color: #16a34a; font-weight: 700; display: block; margin-top: 2px; }
      .task-merma-warn { font-size: 0.75rem; color: #b91c1c; font-weight: 700; display: block; margin-top: 2px; }

      /* Limpieza total al mandar a imprimir físicamente */
      @media print {
        body * { visibility: hidden; }
        .plan-root, .plan-root * { visibility: visible; }
        .no-print { display: none !important; }
        
        /* ✨ ESTO QUITA EL CONTORNO ROJO DE LAS ETIQUETAS AL IMPRIMIR ✨ */
        .sign {
          border: none !important;
          box-shadow: none !important;
        }

        html, body { margin: 0 !important; padding: 0 !important; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

        .print-page{
          width: 816px !important; height: 1056px !important; margin: 0 auto !important;
          border: 0 !important; box-shadow: none !important;
          page-break-after: always; break-after: page;
        }

        .grid-wrap, .sign { break-inside: avoid-page; page-break-inside: avoid; }
        
        /* ✨ ESTO ES CLAVE: ELIMINA LA FECHA, LA IP Y LA PAGINACIÓN (X/Y) DEL NAVEGADOR ✨ */
        @page { 
          size: letter portrait; 
          margin: 0px !important; 
        }
      }
  `;

  return (
    <div className="plan-root">
      <style>{css}</style>

      {/* Cabecera de Acciones */}
      <div className="plan-head no-print" style={{ padding: '16px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Módulo de Impresión</h2>
          <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>Tamaños de letras dinámicos + Distribución por porcentajes.</div>
        </div>
        <div className="actions" style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-pill btn-pill-dark" onClick={() => window.history.back?.()}>Volver</button>
          <button className="btn-pill" style={{ background: '#10b981', color: '#fff' }} onClick={guardarPlanEnBD}>Guardar Plan (BD)</button>
          <button className="btn-pill btn-red" onClick={() => window.print()}>Mandar a Imprimir</button>
        </div>
      </div>

      {/* Informe Digerible */}
      {Object.keys(planDeImpresion).length > 0 && (
        <div className="no-print print-plan-container">
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
            Plan de Acción para Impresora
          </h3>
          
          <div className="plan-grid">
            {Object.entries(planDeImpresion).map(([cabecera, formatos]) => (
              <div key={cabecera} className="task-card">
                <div className="task-head">🔴 {cabecera}</div>
                <div className="task-body">
                  {formatos.map((item, idx) => (
                    <div key={idx} className="task-row">
                      <div className="task-format">{SIZE_LABEL[item.formato] || item.formato}</div>
                      <div className="task-stats">
                        <span className="task-hojas">{item.hojasNecesarias} {item.hojasNecesarias === 1 ? 'Hoja' : 'Hojas'}</span>
                        <span className="task-piezas">Imprime {item.cantidadPedida} piezas</span>
                        {item.desperdicio === 0 ? (
                          <span className="task-merma-ok">✓ Sin desperdicio</span>
                        ) : (
                          <span className="task-merma-warn">⚠️ Sobran {item.desperdicio} en blanco</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pared de páginas */}
      <div className="preview-wall" style={{ marginTop: '30px' }}>
        {pages.length === 0 ? (
          <div style={{ color: "#64748b", textAlign: "center", marginTop: "40px" }}>No hay elementos para imprimir.</div>
        ) : (
          pages.map((pg, idx) => (
            <Page key={idx} size={pg.size} tiles={pg.tiles} />
          ))
        )}
      </div>
    </div>
  );
}