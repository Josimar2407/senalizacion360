import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import '../styles/brand.css';
import SectionHeader from '../components/SectionHeader';
import NumberInput from '../components/NumberInput';
import usePreserveScrollOnDeps from '../hooks/usePreserveScrollOnDeps';
import { fmtDmy, vigenciaUnificada, toDate } from '../utils/dateUtils';
import { extractSinglePercent } from '../utils/formatUtils';

function normalizeEANLocal(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits || '';
}

// Extrae solo el descuento para la cabecera
function getHeaderFromPromo(genText) {
  const s = String(genText || "").toLowerCase();
  const percent = extractSinglePercent(genText);
  if (percent != null) return `${percent}% de descuento`;
  const match = s.match(/(\d+)x(\d+)/);
  if (match) return `${match[1]}x${match[2]}`;
  return "OFERTA";
}

// Configuración de Hojas
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

// Formatear a 2 decimales
function formatPrice(val) {
  if (val === null || val === undefined || val === '') return '';
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  return num.toFixed(2);
}

// Tamaño dinámico para las miniaturas del modal
function getDynamicFontSize(text, formatCount) {
  const len = (text || "").length;
  if (formatCount <= 2) {
    if (len < 25) return '0.70rem';
    if (len < 50) return '0.55rem';
    return '0.45rem';
  } else if (formatCount === 4) {
    if (len < 25) return '0.45rem';
    if (len < 50) return '0.35rem';
    return '0.25rem';
  } else {
    return '0.2rem'; 
  }
}

// Tamaño dinámico para la Tarjeta Principal
function getCardFontSize(text) {
  const len = (text || "").length;
  if (len < 20) return '1.2rem';
  if (len < 40) return '0.95rem';
  if (len < 60) return '0.8rem';
  return '0.7rem';
}

export default function Screen3({
  visibleMaterialsAll,
  limitP3, setLimitP3,
  openP3, setOpenP3,
  qtyP3, onQtyP3,
  selectedDepts,
  queryEAN, setQueryEAN,
  promoDatesG,
  saveCanonical, getCanonical
}) {
  const mats = useMemo(
    () => visibleMaterialsAll.slice(0, limitP3),
    [visibleMaterialsAll, limitP3]
  );

  const listRef = useRef(null);
  const { runScrollSafe } = usePreserveScrollOnDeps(listRef, [mats.length]);

  const [activeModalMaterial, setActiveModalMaterial] = useState(null);

  const loadMore = () => runScrollSafe(() => {
    if (limitP3 < visibleMaterialsAll.length) {
      setLimitP3(n => n + 30);
    }
  });

  const FORMATS = [
    { key: 'pescante', label: 'Pescante' },
    { key: 'tcarta',   label: 'T/Carta'  },
    { key: 'media',    label: '1/2 Carta' },
    { key: 'cuarto',   label: '1/4 Carta' },
    { key: 'octavo',   label: '1/8 Carta' },
    { key: 'tresxdos', label: '3x2'      },
  ];

  // ========== LECTOR CON CÁMARA ==========
  const [scanOn, setScanOn] = useState(false);
  const [scanError, setScanError] = useState("");

  useEffect(() => {
    if (!scanOn) return;
    setScanError("");
    
    let html5QrCode;
    const timer = setTimeout(() => {
      try {
        html5QrCode = new Html5Qrcode("reader");
        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 100 } },
          (decodedText) => {
            const normalized = normalizeEANLocal(decodedText);
            setQueryEAN(normalized);
            setScanOn(false);
          },
          (errorMessage) => { }
        ).catch(err => {
          setScanError("No se pudo iniciar la cámara. Revisa los permisos.");
        });
      } catch (err) {
        setScanError("Error al inicializar el lector.");
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [scanOn, setQueryEAN]);

  // ========== ESTILOS ==========
  const css = `
    :root { --tabs-h: 64px; }

    .p3-wrap {
      flex: 1 1 auto; overflow-y: auto;
      padding-bottom: calc(var(--tabs-h) + 24px);
    }

    .promo-wrap {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 16px; padding: 16px 0; max-width: 1200px; margin: 0 auto;
    }

    .sign-card {
      border: 2px solid #ef4444; 
      border-radius: 12px; background: #fff;
      overflow: hidden; position: relative;
      display: flex; flex-direction: column; aspect-ratio: 4 / 5;
    }
    
    .sign-head {
      background: #ef4444; color: #fff; 
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; user-select: none; padding: 8px; cursor: pointer;
    }
    .head-title { font-weight: 800; font-size: 14px; }
    .head-ean { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.8); margin-top: 2px; }
    
    .sign-body {
      padding: 12px 10px 0px; text-align: center; flex-grow: 1; display: flex; flex-direction: column; cursor: pointer;
    }
    .sign-body:active { background: #f8fafc; }
    
    .title-container {
      flex-grow: 1; display: flex; align-items: center; justify-content: center; width: 100%;
    }
    .sign-title { 
      font-weight: 800; text-transform: uppercase; line-height: 1.1; color: #111; 
      word-break: break-word; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden;
    }
    
    .price-wrap {
      display: flex; flex-direction: column; gap: 0px; justify-content: center; align-items: center; margin-top: auto; margin-bottom: 6px;
    }
    
    .price-regular { 
      font-size: 0.85rem; color: #64748b; line-height: 1; 
      position: relative; display: inline-block; padding: 0 2px;
    }
    .price-regular::after {
      content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1.5px;
      background: #64748b; transform: rotate(-10deg);
    }
    
    .price-promo { font-size: 1.25rem; font-weight: 900; color: #b91c1c; line-height: 1; margin-top: 2px; }

    .sign-vig { 
      text-align: center; font-size: clamp(6.5px, 3vw, 9px); font-weight: 700; color: #000; 
      margin-bottom: 8px; white-space: nowrap; letter-spacing: -0.3px; width: 100%;
    }

    .scanner-wrap {
      margin-top: 10px; margin-bottom: 10px; border-radius: 12px; overflow: hidden;
      border: 1px solid #e5e7eb; background: #000;
    }
    #reader { width: 100%; border: none !important; }
    #reader video { object-fit: cover; border-radius: 12px; }

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
      background: #ef4444; color: #fff; padding: 12px 16px; text-align: center; position: relative; display: flex; flex-direction: column;
    }
    .modal-close {
      position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
      background: transparent; border: none; color: #fff; font-size: 1.8rem; line-height: 1; cursor: pointer; padding: 0; margin: 0;
    }

    .modal-body-content { display: flex; flex-direction: column; overflow-y: auto; }
    
    .canon-wrap { padding: 16px 20px 0; display: flex; flex-direction: column; gap: 6px; }
    
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
      width: 130px; height: 168px; background: #fff; border: 1px solid #cbd5e1; box-shadow: 2px 2px 6px rgba(0,0,0,0.1);
      padding: 4px; display: grid; gap: 4px; margin-bottom: 16px;
    }

    .mini-sign-mockup {
      border: 1px solid #ef4444; border-radius: 2px; overflow: hidden; display: flex; flex-direction: column; background: #fff;
    }
    .mini-head {
      background: #ef4444; color: #fff; flex: 0 0 25%; display: flex; align-items: center; justify-content: center;
      font-weight: 800; text-align: center; line-height: 1.1; padding: 2px;
    }
    .mini-body {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; font-weight: 800; padding: 2px 4px 0; color: #111; line-height: 1.1; word-break: break-word;
    }
    .mini-body-text {
      display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;
      min-height: 2.2em; width: 100%;
    }
    
    .mini-price-regular {
      font-size: 0.45rem; color: #64748b; line-height: 1; position: relative; display: inline-block; padding: 0 1px;
    }
    .mini-price-regular::after {
      content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: #64748b; transform: rotate(-10deg);
    }

    .mini-vig { font-weight: 700; color: #000; text-align: center; white-space: nowrap; margin-bottom: 2px; letter-spacing: -0.2px; }

    .format-input-area { margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%; }
    .input-label { font-size: 0.8rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
  `;

  return (
    <div className='px-4 flex flex-col' style={{ minHeight: 'calc(100vh - 56px)' }}>
      <style>{css}</style>

      {/* HEADER DINÁMICO */}
      <div className='py-2 flex flex-col gap-2' style={{ flexShrink: 0, marginTop: '8px' }}>
        <div className='flex items-center justify-between gap-2'>
          <div style={{ color: '#475569', fontSize: '14px', fontWeight: 600 }}>
            {visibleMaterialsAll.length} materiales · {selectedDepts.length} depto(s)
          </div>
        </div>

        {/* BUSCADOR Y BOTÓN ESCÁNER */}
        <div className='flex items-center gap-2'>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={queryEAN}
            onChange={(e)=> setQueryEAN(e.target.value.replace(/[^\d]/g, ''))}
            onFocus={(e)=> e.target.select()}
            placeholder='Escanear / escribir EAN…'
            style={{
              border:'1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', minWidth: 0, flex: 1, fontSize: '15px'
            }}
          />
          <button
            type="button"
            onClick={()=> setScanOn(on => !on)}
            style={{
              border:'1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontWeight: 700,
              background: scanOn ? '#fee2e2' : '#ef4444', color: scanOn ? '#b91c1c' : '#fff'
            }}
          >
            {scanOn ? 'Detener' : 'Cámara'}
          </button>
        </div>

        {/* LECTOR HTML5-QRCODE */}
        {scanOn && (
          <div className='scanner-wrap'>
            <div id="reader"></div>
          </div>
        )}
        {scanError && <div style={{ color: '#b91c1c', fontSize: '13px', marginTop: '4px' }}>{scanError}</div>}
      </div>

      {/* GRID DE COMPARATIVOS */}
      <div ref={listRef} className='p3-wrap'>
        <div className="promo-wrap">
          {mats.map(m => {
            const mKey = `${m.dept}::${m.promoG}::${m.ean}`;
            const titleRaw = String(m.descH || '').trim();
            
            const canonKey = m.ean ? String(m.ean).trim() : titleRaw; 
            let titleShown = getCanonical(canonKey);
            
            if (!titleShown || titleShown === canonKey) {
              titleShown = titleRaw;
            }

            const finalTitle = titleShown || '(Sin descripción)';

            const pKey  = `${m.dept}::${m.promoG}`;
            const desde = promoDatesG[pKey]?.desde || fmtDmy(toDate(m.vigDesde));
            const hasta = promoDatesG[pKey]?.hasta || fmtDmy(toDate(m.vigHasta));
            const vig   = vigenciaUnificada(desde, hasta);
            const headRaw = getHeaderFromPromo(m.promoG);

            // ✨ Validación lógica para verificar si se solicitó algún formato en este material
            const isRequested = FORMATS.some(f => {
              const val = qtyP3[`${mKey}-${f.key}`];
              return val !== undefined && val !== "" && Number(val) > 0;
            });

            return (
              <div className="sign-card" key={mKey}>
                {/* ✨ SELLO VISUAL DE "SOLICITADO" EN SCREEN 3 */}
                {isRequested && <div className="stamp-requested">SOLICITADO</div>}

                <div 
                  className="sign-head"
                  onClick={() => setActiveModalMaterial({ ...m, mKey, headRaw, titleRaw, canonKey, finalTitle, vig })}
                >
                  <div className="head-title">{headRaw}</div>
                  {m.ean && <div className="head-ean">EAN: {m.ean}</div>}
                </div>
                
                <div 
                  className="sign-body"
                  onClick={() => setActiveModalMaterial({ ...m, mKey, headRaw, titleRaw, canonKey, finalTitle, vig })}
                >
                  <div className="title-container">
                    <div className="sign-title" style={{ fontSize: getCardFontSize(finalTitle) }}>
                      {finalTitle}
                    </div>
                  </div>

                  {(m.precioRegular || m.precioPromocion) && (
                    <div className="price-wrap">
                      {m.precioRegular && (
                        <span className="price-regular">${formatPrice(m.precioRegular)}</span>
                      )}
                      {m.precioPromocion && (
                        <span className="price-promo">${formatPrice(m.precioPromocion)}</span>
                      )}
                    </div>
                  )}

                  {vig && <div className="sign-vig">{vig}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {visibleMaterialsAll.length > mats.length && (
          <div style={{ textAlign: 'center', padding: '12px 0 84px' }}>
            <button className='btn-pill btn-pill-dark' onClick={loadMore}>Cargar 30 más</button>
          </div>
        )}
      </div>

      {/* ✨ MODAL CARRUSEL CON HOJAS Y PRECIOS ✨ */}
      {activeModalMaterial && (
        <div className="modal-overlay" onClick={() => setActiveModalMaterial(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{activeModalMaterial.headRaw}</div>
              {activeModalMaterial.ean && <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>EAN: {activeModalMaterial.ean}</div>}
              <button className="modal-close" onClick={() => setActiveModalMaterial(null)}>×</button>
            </div>

            <div className="modal-body-content">
              
              {/* Editor de Canónico LIGADO AL EAN */}
              <div className='canon-wrap'>
                <label className='input-label' style={{ textAlign: 'left' }}>Descripción Personalizada</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', fontWeight: 600 }}
                    defaultValue={activeModalMaterial.finalTitle}
                    onBlur={(e)=> saveCanonical(activeModalMaterial.canonKey, e.target.value)}
                  />
                  <button
                    className="btn-pill btn-pill-dark"
                    style={{ padding: '0 16px' }}
                    onClick={()=>{
                      const val = window.prompt('Editar descripción para este EAN:', activeModalMaterial.finalTitle);
                      if (val != null) {
                        saveCanonical(activeModalMaterial.canonKey, val);
                        setActiveModalMaterial(prev => ({...prev, finalTitle: val}));
                      }
                    }}
                  >
                    Editar
                  </button>
                </div>
              </div>

              {/* Carrusel de Hojas */}
              <div className="formats-carousel">
                {FORMATS.map(({ key, label }) => {
                  const kk = `${activeModalMaterial.mKey}-${key}`;
                  const v  = qtyP3[kk] || "";
                  const config = getFormatConfig(key);
                  const dynamicSize = getDynamicFontSize(activeModalMaterial.finalTitle, config.count);

                  return (
                    <div className="format-slide" key={kk}>
                      <div className="format-slide-title">{label}</div>
                      
                      <div className="page-sheet" style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)`, gridTemplateRows: `repeat(${config.rows}, 1fr)` }}>
                        {Array.from({ length: config.count }).map((_, i) => (
                          <div className="mini-sign-mockup" key={i}>
                            
                            <div className="mini-head" style={{ fontSize: config.count <= 2 ? '0.60rem' : '0.35rem' }}>
                              {config.count <= 4 ? activeModalMaterial.headRaw : ''}
                            </div>
                            
                            <div className="mini-body">
                              <div className="mini-body-text" style={{ fontSize: dynamicSize }}>
                                {config.count <= 4 ? activeModalMaterial.finalTitle : ''}
                              </div>
                              
                              {/* Precios Reales en Mockup */}
                              {config.count <= 2 && (
                                <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '0px', alignItems: 'center' }}>
                                  {activeModalMaterial.precioRegular && (
                                    <span className="mini-price-regular">
                                      ${formatPrice(activeModalMaterial.precioRegular)}
                                    </span>
                                  )}
                                  {activeModalMaterial.precioPromocion && (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#b91c1c', lineHeight: 1, marginTop: '2px' }}>
                                      ${formatPrice(activeModalMaterial.precioPromocion)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="mini-vig" style={{ fontSize: config.count <= 2 ? '0.35rem' : '0.2rem' }}>
                              {config.count <= 4 ? activeModalMaterial.vig : ''}
                            </div>

                          </div>
                        ))}
                      </div>

                      <div className="format-input-area">
                        <div className="input-label">Cantidad</div>
                        <NumberInput
                          value={v}
                          onChange={(nv) => onQtyP3(activeModalMaterial.mKey, key, nv)}
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