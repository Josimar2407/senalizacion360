import React, { useMemo, useRef } from 'react';
import '../styles/brand.css';
import SectionHeader from '../components/SectionHeader';
import NumberInput from '../components/NumberInput';
import usePreserveScrollOnDeps from '../hooks/usePreserveScrollOnDeps';
import { vigenciaFromRecord } from '../utils/dateUtils';
import { cleanGenericBody, extractSinglePercent, stripLeadingPercent } from '../utils/formatUtils';

function getHeaderFromPromo(genText) {
  const s = String(genText || "").toLowerCase();

  // 1️⃣ Detecta porcentaje (%)
  const percent = extractSinglePercent(genText);
  if (percent != null) return `${percent}% de descuento`;

  // 2️⃣ Detecta 2x1, 3x2, etc.
  const match = s.match(/(\d+)x(\d+)/);
  if (match) return `${match[1]}x${match[2]}`;

  // 3️⃣ Por defecto
  return "OFERTA";
}

export default function Screen2({
  promoListAll, limitP2, setLimitP2,
  openP2, setOpenP2,
  checkedP2, setCheckedP2,
  qtyP2, onQtyP2,
  selectedDepts,
  onReset, onExport, onExportExcel,
}) {
  const promoList = useMemo(() => promoListAll.slice(0, limitP2), [promoListAll, limitP2]);
  const listRef = useRef(null);
  usePreserveScrollOnDeps(listRef, [promoList.length]);

  const FORMATS = [
    { key: 'pescante', label: 'Pescante' },
    { key: 'tcarta',   label: 'T/Carta'  },
    { key: 'media',    label: '1/2'      },
    { key: 'cuarto',   label: '1/4'      },
    { key: 'octavo',   label: '1/8'      },
    { key: 'tresxdos', label: '3x2'      },
  ];

  const css = `
    :root{
      --tabs-h: 64px;
      /* tamaño de fuente de los mini-renders (preview/impresión) */
      --mini-print-font: 316px;
    }

    .promo-wrap{
      padding-right:4px;
      padding-bottom:calc(var(--tabs-h) + 24px);
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:12px;
      padding:12px;
    }

    .sign-card{
      border:2px solid #ef4444;
      border-radius:12px;
      background:#fff;
      overflow:hidden;
      position:relative;
      transition: box-shadow .15s ease, border-color .15s ease, transform .12s ease;
    }
    .sign-card.selected{
      border-color:#f97316;                 /* más naranja */
      box-shadow:0 0 0 3px rgba(249,115,22,.35);
      transform: translateY(-1px);          /* pequeño “lift” */
    }
    .ribbon{
      position:absolute; top:8px; left:8px;
      background:#f97316; color:#fff;
      font-weight:800; font-size:11px;
      padding:2px 8px; border-radius:999px;
      display:none;
      pointer-events:none;
    }
    .sign-card.selected .ribbon{ display:inline-block; }

    .sign-head {
      background: #ef4444;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-weight: 800;
      font-size: 18px;
      user-select: none;
      position: relative;
      padding: 10px 12px;
    }

    .sign-head-label{
      display:block;
      width:100%;
    }
    
    .sign-card.selected .sign-head{
    background:#b91c1c;    /* rojo más oscuro cuando está en P3 */
    }

    .p3-chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:2px 8px;
      border-radius:999px;
      background:#f97316;
      color:#fff;
      font-size:0.65rem;
      font-weight:700;
      margin-top:4px;
    }


    /* zonas invisibles de tap izquierda/derecha */
    .hit-zone{
      position:absolute;
      top:0;
      bottom:0;
      width:50%;
      border:none;
      background:transparent;
      padding:0;
      cursor:pointer;
    }
    .hit-zone-left{ left:0; }
    .hit-zone-right{ right:0; }
    .hit-zone:active{ filter:brightness(0.6); }

    .sign-body{
      padding:12px 12px 10px;
      text-align:center;
      position:relative;
      min-height:80px;
    }
    .sign-title{
      font-weight:800;
      text-transform:uppercase;
      line-height:1.3;
      color:#111;
      font-size:1rem;
      margin-bottom:4px;
      word-break:break-word;
    }
    .sign-vig {
      position: absolute;
      bottom: 4px;
      left: 12px;
      right: 12px;
      text-align: center;
      font-size: 0.435rem;
      font-weight: 600;
      color: #000000ff;
    }

    .body-extended{
      padding:10px 12px 12px;
      border-top:1px solid #f1f5f9;
    }
    .formats{
      display:flex;
      gap:10px;
      overflow-x:auto;
      padding:6px 0 8px;
    }

    .mini{
      min-width:120px; max-width:140px;
      border:1px solid #e5e7eb;
      border-radius:8px;
      padding:8px;
      text-align:center;
      background:#fff;
      flex-shrink:0;
    }
    .mini-title{
      font-weight:700;
      font-size:0.8rem;
    }
    .mini-label{
      font-size:0.7rem;
      color:#6b7280;
    }
    .mini .input-wrap{
      display:flex;
      justify-content:center;
      margin-top:6px;
    }

    /* Checkbox oculto */
    .chk-hidden{
      position:absolute !important;
      opacity:0 !important;
      pointer-events:none !important;
      width:0;
      height:0;
    }
  `;

  const loadMoreP2 = () => {
    if (limitP2 < promoListAll.length) setLimitP2(n => n + 30);
  };

  return (
    <div className="px-4" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <style>{css}</style>

      <SectionHeader
        right={<span>{promoListAll.length} promociones · {selectedDepts.length} depto(s)</span>}
      />

      <div className="toolbar" style={{ margin: '6px 0 4px' }}>
        <button className="btn-pill btn-pill-dark same-height" onClick={onExportExcel}>
          Exportar Excel
        </button>
        <button className="btn-pill btn-pill-dark same-height" onClick={onExport}>
          Terminar señalización
        </button>
        <div className="toolbar-right">
          <button className="btn-pill btn-red same-height btn-compact" onClick={onReset}>
            Reiniciar
          </button>
        </div>
      </div>

      <div ref={listRef} className="promo-wrap">
        {promoList.map((p) => {
          const promoKey = p.key;

          const header = getHeaderFromPromo(p.gen);
          const body   = cleanGenericBody(p.gen);   // ya nos da "EN …" en mayúsculas

          const vig       = vigenciaFromRecord(p);
          const isOpen    = !!openP2[promoKey];
          const isChecked = !!checkedP2[promoKey];

          return (
            <div key={promoKey} className={`sign-card ${isChecked ? 'selected' : ''}`}>
              <span className="ribbon">✓ Seleccionado</span>

              {/* CABECERA ROJA */}
              <div className="sign-head">
                <span className="sign-head-label">{header}</span>

                {/* zona izquierda: seleccionar promo */}
                <button
                  type="button"
                  className="hit-zone hit-zone-left"
                  onClick={() =>
                    setCheckedP2(prev => ({ ...prev, [promoKey]: !prev[promoKey] }))
                  }
                  aria-label="Seleccionar promoción"
                />

                {/* zona derecha: abrir menú de formatos */}
                <button
                  type="button"
                  className="hit-zone hit-zone-right"
                  onClick={() =>
                    setOpenP2(prev => ({ ...prev, [promoKey]: !prev[promoKey] }))
                  }
                  aria-label="Abrir menú de formatos"
                />

                {/* checkbox real oculto */}
                <input
                  className="chk-hidden"
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) =>
                    setCheckedP2(prev => ({ ...prev, [promoKey]: e.target.checked }))
                  }
                />
              </div>

              {/* CUERPO */}
              <div className="sign-body">
                <div className="sign-title">{body || p.gen}</div>

                {isChecked && (
                  <div className="p3-chip">
                    EN COMPARATIVOS
                  </div>
                )}

                {vig && <div className="sign-vig">Vigencia: {vig}</div>}
              </div>

              {/* MENÚ DE FORMATOS */}
              {isOpen && (
                <div className="body-extended">
                  <div className="formats">
                    {FORMATS.map(({ key, label }) => {
                      // Clave esperada por exportador P2: `${dept}::${gen}::${size}`
                      const kk = `${p.dept}::${p.gen}::${key}`;
                      const v  = qtyP2[kk] ?? ""; // permite "" durante edición (Ajuste 1)

                      return (
                        <div className="mini" key={kk}>
                          <div className="mini-title">{label}</div>
                          <div className="input-wrap">
                            <NumberInput
                              value={v}
                              onChange={(nv) => onQtyP2(kk, nv)}
                              maxDigits={2}
                              width={64}
                              ariaLabel={`Cantidad ${label}`}
                            />
                          </div>
                          <div className="mini-label">Captura</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {promoListAll.length > promoList.length && (
          <div style={{ textAlign: 'center', padding: '12px 0 84px' }}>
            <button className="btn-pill btn-pill-dark same-height" onClick={loadMoreP2}>
              Cargar 30 más
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
