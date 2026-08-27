import React, { useMemo, useRef, useState } from 'react';
import '../styles/brand.css';
import SectionHeader from '../components/SectionHeader';
import NumberInput from '../components/NumberInput';
import usePreserveScrollOnDeps from '../hooks/usePreserveScrollOnDeps';
import { vigenciaFromRecord } from '../utils/dateUtils';
import { cleanGenericBody, extractSinglePercent, stripLeadingPercent } from '../utils/formatUtils';

function getHeaderFromPromo(genText) {
  const s = String(genText || "").toLowerCase();
  const percent = extractSinglePercent(genText);
  if (percent != null) return `${percent}% de descuento`;
  const match = s.match(/(\d+)x(\d+)/);
  if (match) return `${match[1]}x${match[2]}`;
  return "OFERTA";
}

function getFormatConfig(key) {
  switch (key) {
    case 'pescante': return { count: 1, cols: 1, rows: 1 };
    case 'tcarta':   return { count: 1, cols: 1, rows: 1 };
    case 'media':    return { count: 2, cols: 1, rows: 2 };
    case 'cuarto':   return { count: 4, cols: 2, rows: 2 };
    case 'octavo':   return { count: 8, cols: 2, rows: 4 };
    case 'tresxdos': return { count: 6, cols: 2, rows: 3 }; 
    default:         return { count: 1, cols: 1, rows: 1 };
  }
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

  const [activeModalPromo, setActiveModalPromo] = useState(null);

  const FORMATS = [
    { key: 'pescante', label: 'Pescante' },
    { key: 'tcarta',   label: 'T/Carta'  },
    { key: 'media',    label: '1/2 Carta' },
    { key: 'cuarto',   label: '1/4 Carta' },
    { key: 'octavo',   label: '1/8 Carta' },
    { key: 'tresxdos', label: '3x2'      },
  ];

  const css = `
    :root { --tabs-h: 64px; }

    .promo-wrap {
      padding-bottom: calc(var(--tabs-h) + 24px);
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 16px; padding: 16px; max-width: 1200px; margin: 0 auto;
    }

    .sign-card {
      border: 2px solid #ef4444; border-radius: 12px; background: #fff;
      overflow: hidden; position: relative;
      transition: box-shadow .15s ease, border-color .15s ease, transform .12s ease;
      display: flex; flex-direction: column; aspect-ratio: 4 / 5;
    }
    .sign-card.selected {
      border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,.35); transform: translateY(-1px);
    }
    
    .ribbon {
      position: absolute; top: 8px; left: 8px; background: #f97316; color: #fff;
      font-weight: 800; font-size: 11px; padding: 2px 8px; border-radius: 999px;
      display: none; pointer-events: none; z-index: 10;
    }
    .sign-card.selected .ribbon { display: inline-block; }

    .sign-head {
      background: #ef4444; color: #fff; display: flex; align-items: center; justify-content: center;
      text-align: center; font-weight: 800; font-size: 18px; user-select: none; padding: 10px 12px; cursor: pointer;
    }
    .sign-head:active { filter: brightness(0.85); }
    .sign-card.selected .sign-head { background: #b91c1c; }

    .p3-chip {
      display: inline-flex; align-items: center; justify-content: center; padding: 2px 8px; border-radius: 999px;
      background: #f97316; color: #fff; font-size: 0.65rem; font-weight: 700; margin-top: 6px; align-self: center;
    }

    .sign-body {
      padding: 12px 12px 8px; text-align: center; flex-grow: 1; display: flex; flex-direction: column; cursor: pointer;
    }
    .sign-body:active { background: #f8fafc; }
    
    .sign-title { font-weight: 800; text-transform: uppercase; line-height: 1.3; color: #111; font-size: 1rem; word-break: break-word; margin-top: auto; }
    .sign-vig { text-align: center; font-size: 0.6rem; font-weight: 700; color: #000; margin-top: auto; }

    /* Estilo del Modal (Páginas) */
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(3px); z-index: 9999;
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }

    .modal-content {
      background: #fff; width: 100%; max-width: 95%; height: auto; max-height: 90vh;
      border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      display: flex; flex-direction: column; animation: popIn 0.2s ease-out forwards;
    }
    @media (min-width: 768px) { .modal-content { max-width: 500px; } }

    @keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    
    .modal-header {
      background: #ef4444; color: #fff; padding: 16px; font-weight: 800; font-size: 1.2rem; text-align: center; position: relative;
    }
    .modal-close {
      position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
      background: transparent; border: none; color: #fff; font-size: 1.8rem; line-height: 1; cursor: pointer; padding: 0; margin: 0;
    }

    .modal-body-content { display: flex; flex-direction: column; overflow-y: hidden; }
    .modal-promo-title { font-weight: 800; text-align: center; color: #111; padding: 16px 20px 0; font-size: 1rem; }

    .formats-carousel {
      display: flex; gap: 16px; overflow-x: auto; padding: 20px; scroll-snap-type: x mandatory; align-items: stretch;
    }
    .formats-carousel::-webkit-scrollbar { height: 6px; }
    .formats-carousel::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

    .format-slide {
      min-width: 220px; width: 75vw; max-width: 280px;
      border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; text-align: center; background: #f8fafc;
      flex-shrink: 0; scroll-snap-align: center; display: flex; flex-direction: column; align-items: center;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }

    .format-slide-title { font-weight: 800; font-size: 1.1rem; color: #0f172a; margin-bottom: 12px; }

    .page-sheet {
      width: 130px; height: 168px; 
      background: #fff; border: 1px solid #cbd5e1; box-shadow: 2px 2px 6px rgba(0,0,0,0.1);
      padding: 4px; display: grid; gap: 4px; margin-bottom: 16px;
    }

    .mini-sign-mockup {
      border: 1px solid #ef4444; border-radius: 2px; overflow: hidden;
      display: flex; flex-direction: column; background: #fff;
    }
    .mini-head {
      background: #ef4444; color: #fff; flex: 0 0 25%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; text-align: center; line-height: 1.1; padding: 2px;
    }
    .mini-body {
      flex: 1; display: flex; align-items: center; justify-content: center;
      text-align: center; font-weight: 800; padding: 2px; color: #111; line-height: 1.1; word-break: break-word;
    }

    .format-input-area {
      margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%;
    }
    .input-label { font-size: 0.8rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
  `;

  const loadMoreP2 = () => {
    if (limitP2 < promoListAll.length) setLimitP2(n => n + 30);
  };

  const selCount = Object.values(checkedP2).filter(Boolean).length;

  return (
    <div className="screen-container">
      <style>{css}</style>

      <SectionHeader
        right={<span>{promoListAll.length} promociones · {selectedDepts.length} depto(s)</span>}
      />

      <div className="toolbar" style={{ margin: '6px 16px 4px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-pill btn-pill-dark same-height" onClick={onExportExcel}>
          Exportar Excel
        </button>
        <button className="btn-pill btn-pill-dark same-height" onClick={onExport}>
          Terminar señalización
        </button>
        <div className="toolbar-right" style={{ marginLeft: 'auto' }}>
          <button className="btn-pill btn-red same-height btn-compact" onClick={onReset}>
            Reiniciar
          </button>
        </div>
      </div>

      <div className="promo-wrap" ref={listRef}>
        {promoList.map((p, idx) => {
          const promoKey  = p.key || `${p.dept}::${p.gen}`;
          const isChecked = !!checkedP2[promoKey];

          const headRaw = getHeaderFromPromo(p.gen);
          let bodyRaw   = cleanGenericBody(p.gen);
          if (headRaw.includes("%")) bodyRaw = stripLeadingPercent(bodyRaw);
          const vig = vigenciaFromRecord(p);

          // ✨ Validación lógica para verificar si se solicitó algún formato en esta promoción
          const isRequested = FORMATS.some(f => {
            const kk = `${p.dept}::${p.gen}::${f.key}`;
            const val = qtyP2[kk];
            return val !== undefined && val !== "" && Number(val) > 0;
          });

          return (
            <div className={`sign-card ${isChecked ? 'selected' : ''}`} key={`${promoKey}-${idx}`}>
              {/* ✨ SELLO VISUAL DE "SOLICITADO" */}
              {isRequested && <div className="stamp-requested">SOLICITADO</div>}

              <div className="ribbon">SEL</div>

              <div className="sign-head" onClick={() => setCheckedP2(prev => ({ ...prev, [promoKey]: !prev[promoKey] }))}>
                {headRaw}
              </div>

              <div className="sign-body" onClick={() => setActiveModalPromo({ ...p, promoKey, headRaw, bodyRaw, vig })}>
                <div className="sign-title">{bodyRaw || p.gen}</div>
                {isChecked && <div className="p3-chip">EN COMPARATIVOS</div>}
                {vig && <div className="sign-vig">Vigencia: {vig}</div>}
              </div>
            </div>
          );
        })}
        {promoListAll.length > promoList.length && (
          <div style={{ textAlign: 'center', padding: '12px 0 84px', gridColumn: "1 / -1" }}>
            <button className="btn-pill btn-pill-dark same-height" onClick={loadMoreP2}>Cargar 30 más</button>
          </div>
        )}
      </div>

      {activeModalPromo && (
        <div className="modal-overlay" onClick={() => setActiveModalPromo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              {activeModalPromo.headRaw}
              <button className="modal-close" onClick={() => setActiveModalPromo(null)}>×</button>
            </div>

            <div className="modal-body-content">
              <div className="modal-promo-title">{activeModalPromo.bodyRaw || activeModalPromo.gen}</div>
              
              <div className="formats-carousel">
                {FORMATS.map(({ key, label }) => {
                  const kk = `${activeModalPromo.dept}::${activeModalPromo.gen}::${key}`;
                  const v  = qtyP2[kk] ?? "";
                  const config = getFormatConfig(key);

                  return (
                    <div className="format-slide" key={kk}>
                      <div className="format-slide-title">{label}</div>
                      
                      <div 
                        className="page-sheet" 
                        style={{ 
                          gridTemplateColumns: `repeat(${config.cols}, 1fr)`, 
                          gridTemplateRows: `repeat(${config.rows}, 1fr)` 
                        }}
                      >
                        {Array.from({ length: config.count }).map((_, i) => (
                          <div className="mini-sign-mockup" key={i}>
                            <div className="mini-head" style={{ fontSize: config.count <= 2 ? '0.65rem' : '0.35rem' }}>
                              {config.count <= 4 ? activeModalPromo.headRaw : ''}
                            </div>
                            <div className="mini-body" style={{ fontSize: config.count <= 2 ? '0.55rem' : '0.3rem' }}>
                              {config.count <= 2 ? (activeModalPromo.bodyRaw || 'OFERTA') : ''}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="format-input-area">
                        <div className="input-label">Cantidad</div>
                        <NumberInput
                          value={v}
                          onChange={(nv) => onQtyP2(kk, nv)}
                          maxDigits={2}
                          width={80}
                          ariaLabel={`Cantidad ${label}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}