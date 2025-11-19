import React, { useMemo, useRef } from 'react';
import NumberInput from '../components/NumberInput';
import usePreserveScrollOnDeps from '../hooks/usePreserveScrollOnDeps';
import { fmtDmy, vigenciaUnificada, toDate } from '../utils/dateUtils';

/** Normaliza el código leído por la cámara a solo dígitos */
function normalizeEANLocal(raw){
  const digits = String(raw || '').replace(/\D/g, '');
  return digits || '';
}

/** Botón simple */
function Btn({ children, className='', ...props }){
  return (
    <button
      className={`px-3 py-2 rounded text-sm font-medium ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default function Screen3({
  visibleMaterialsAll,        // materiales filtrados por depto / P2 / EAN
  limitP3, setLimitP3,        // paginación incremental
  openP3, setOpenP3,          // estado de acordeón por mKey
  qtyP3, onQtyP3,             // captura: { `${mKey}-${size}`: number }
  selectedDepts,              // info en header
  queryEAN, setQueryEAN,      // filtro EAN
  promoDatesG,                // vigencias unificadas (fallback por G)
  saveCanonical, getCanonical // catálogo canónico
}){
  // Slice para paginar tarjetas (mejor perf en móviles)
  const mats = useMemo(
    ()=> visibleMaterialsAll.slice(0, limitP3),
    [visibleMaterialsAll, limitP3]
  );

  // Scroll estable
  const listRef = useRef(null);
  const { runScrollSafe } = usePreserveScrollOnDeps(listRef, [mats.length]);

  const loadMore = ()=> runScrollSafe(()=>{
    if (limitP3 < visibleMaterialsAll.length) {
      setLimitP3(n => n + 30);
    }
  });

  // ========== LECTOR CON CÁMARA (BarcodeDetector) ==========
  const [scanOn, setScanOn] = React.useState(false);
  const [scanError, setScanError] = React.useState("");
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(0);
  const detectorRef= useRef(null);
  const lastCodeRef= useRef("");
  const lastTsRef  = useRef(0);

  const stopScanner = () => {
    try { cancelAnimationFrame(rafRef.current); } catch {}
    rafRef.current = 0;
    try { videoRef.current && videoRef.current.pause(); } catch {}
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    } catch {}
    detectorRef.current = null;
  };

  React.useEffect(() => {
    if (!scanOn) {
      stopScanner();
      return;
    }

    let cancelled = false;

    (async () => {
      setScanError("");
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setScanError("Tu navegador no permite acceso a cámara. Prueba en Safari/Chrome reciente.");
          return;
        }
        if (!("BarcodeDetector" in window)) {
          setScanError("Tu navegador no soporta BarcodeDetector. Usa Safari/Chrome reciente y HTTPS.");
          return;
        }

        const formats = [
          "ean_13","ean_8","upc_a","upc_e",
          "code_128","code_39","qr_code","itf","codabar"
        ];
        detectorRef.current = new window.BarcodeDetector({ formats });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        if (cancelled) return;

        streamRef.current = stream;
        const v = videoRef.current;
        if (!v) return;

        v.srcObject = stream;
        // Para iPhone: que no se vaya a pantalla completa
        v.setAttribute("playsinline", "true");
        v.muted = true;
        await v.play();

        const loop = async () => {
          if (cancelled || !detectorRef.current || !videoRef.current) return;
          try {
            const codes = await detectorRef.current.detect(videoRef.current);
            const now = Date.now();
            if (codes && codes.length) {
              const raw        = codes[0].rawValue || "";
              const normalized = normalizeEANLocal(raw);
              if (
                normalized &&
                (normalized !== lastCodeRef.current || now - lastTsRef.current > 1000)
              ) {
                lastCodeRef.current = normalized;
                lastTsRef.current   = now;
                setQueryEAN(normalized);
                setScanOn(false);   // auto-stop tras lectura
              }
            }
          } catch {
            // ignoramos errores de frame suelto
          }
          rafRef.current = requestAnimationFrame(loop);
        };

        loop();
      } catch (err) {
        console.error(err);
        setScanError("No se pudo acceder a la cámara. Revisa permisos y que estés en HTTPS.");
        stopScanner();
      }
    })();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [scanOn, setQueryEAN]);

  // Estilos locales
  const css = `
    /* Contenedor principal tipo app */
    .p3-wrap {
      flex: 1 1 auto;
      overflow-y: auto;
      padding-right: 4px;
      padding-bottom: 8px;
    }

    .card { 
      border: 1px solid #e5e7eb; 
      border-radius: 12px; 
      background:#fff; 
      margin: 10px 2px; 
    }
    .head { 
      display:flex; 
      align-items:center; 
      gap:10px; 
      padding:10px 12px; 
      border-bottom:1px solid #f1f5f9; 
      background:#fff; 
    }
    .title { 
      font-weight:800; 
      color:#111; 
      line-height:1.1; 
      word-break:break-word; 
    }
    .muted { 
      color:#475569; 
      font-size:12px; 
    }
    .pill { 
      display:inline-block; 
      background:#111; 
      color:#fff; 
      border-radius:6px; 
      padding:2px 6px; 
      margin-right:6px; 
      font-weight:700; 
      font-size:12px; 
    }
    .body { 
      padding:10px 12px; 
    }
    .formats { 
      display:flex; 
      gap:10px; 
      overflow-x:auto; 
      padding:8px 0 10px; 
    }
    .mini { 
      min-width:120px; 
      max-width:140px; 
      border:1px solid #e5e7eb; 
      border-radius:8px; 
      padding:8px; 
      text-align:center; 
      background:#fff; 
    }
    .row { 
      display:flex; 
      gap:8px; 
      align-items:center; 
      margin-top:6px; 
    }
    .canon { 
      display:flex; 
      gap:6px; 
      margin-top:8px; 
    }
    .canon input { 
      flex: 1 1 auto; 
      border:1px solid #e5e7eb; 
      border-radius:8px; 
      padding:6px 8px; 
    }
    .ean { 
      font-size:12px; 
      color:#64748b; 
    }

    /* Scanner */
    .scanner-wrap{
      margin-top:6px;
      margin-bottom:6px;
      border-radius:12px;
      overflow:hidden;
      border:1px solid #e5e7eb;
      background:#0f172a;
    }
    .scanner-video{
      width:100%;
      max-height:220px;
      display:block;
      object-fit:cover;
      background:#000;
    }
    .scanner-error{
      margin-top:4px;
      font-size:12px;
      color:#b91c1c;
    }
  `;

  return (
    // Contenedor tipo "app": ocupa el alto completo debajo del header/nav (ajusta 56px según tu top bar real)
    <div
      className='px-4 flex flex-col'
      style={{ minHeight: 'calc(100vh - 56px)' }}
    >
      <style>{css}</style>

      {/* Header con resumen + input EAN + botón de escáner */}
      <div
        className='py-2 flex flex-col gap-2'
        style={{ flexShrink: 0 }}
      >
        <div className='flex items-center justify-between gap-2'>
          <div className='muted'>
            {visibleMaterialsAll.length} materiales · {selectedDepts.length} depto(s)
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {/* Input EAN compatible iPhone */}
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
              border:'1px solid #e5e7eb',
              borderRadius:8,
              padding:'6px 10px',
              minWidth: 0,
              flex: 1
            }}
          />

          {/* Botón para activar / desactivar escáner */}
          <button
            type="button"
            onClick={()=> setScanOn(on => !on)}
            style={{
              border:'1px solid #e5e7eb',
              borderRadius:8,
              padding:'6px 10px',
              fontSize:12,
              fontWeight:600,
              background: scanOn ? '#fee2e2' : '#f9fafb'
            }}
          >
            {scanOn ? 'Detener' : 'Escanear'}
          </button>
        </div>

        {/* Vista de cámara + errores */}
        {scanOn && (
          <div className='scanner-wrap'>
            <video
              ref={videoRef}
              className='scanner-video'
              autoPlay
              muted
              playsInline
            />
          </div>
        )}
        {scanError && (
          <div className='scanner-error'>{scanError}</div>
        )}
      </div>

      {/* Lista de promociones ocupando todo el espacio restante */}
      <div ref={listRef} className='p3-wrap'>
        {mats.map(m=>{
          const mKey = `${m.dept}::${m.promoG}::${m.ean}`;

          const titleRaw   = String(m.descH || '').trim();
          const titleShown = getCanonical(titleRaw);

          const pKey  = `${m.dept}::${m.promoG}`;
          const desde = promoDatesG[pKey]?.desde || fmtDmy(toDate(m.vigDesde));
          const hasta = promoDatesG[pKey]?.hasta || fmtDmy(toDate(m.vigHasta));
          const vig   = vigenciaUnificada(desde, hasta);

          const isOpen = !!openP3[mKey];

          return (
            <div key={mKey} className='card'>
              <div
                className='head'
                onClick={()=> runScrollSafe(()=>{
                  setOpenP3(prev => ({ ...prev, [mKey]: !prev[mKey] }));
                })}
              >
                <div style={{flex:1}}>
                  <div className='title'>
                    {titleShown || titleRaw || '(Sin descripción H)'}
                  </div>
                  <div className='ean'>EAN: {m.ean || '-'}</div>
                  {!!vig && (
                    <div className='muted'>
                      <span className='pill'>VIGENCIA</span> {vig}
                    </div>
                  )}
                </div>
                <button
                  className='px-2 py-1 rounded text-sm'
                  style={{ border:'1px solid #e5e7eb', background:'#fff' }}
                  onClick={(e)=>{
                    e.stopPropagation();
                    runScrollSafe(()=>{
                      setOpenP3(prev => ({ ...prev, [mKey]: !prev[mKey] }));
                    });
                  }}
                >
                  {isOpen ? 'Ocultar' : 'Ver formatos'}
                </button>
              </div>

              {isOpen && (
                <div className='body'>
                  {/* Editor de canónico */}
                  <div className='canon'>
                    <input
                      defaultValue={titleShown}
                      placeholder='Descripción canónica para esta promo…'
                      onBlur={(e)=> saveCanonical(titleRaw, e.target.value)}
                      title='Guarda un texto canónico para esta descripción'
                    />
                    <Btn
                      className='border'
                      onClick={()=>{
                        const val = window.prompt(
                          'Texto canónico para esta promo:',
                          titleShown || titleRaw
                        );
                        if (val != null) saveCanonical(titleRaw, val);
                      }}
                    >
                      Guardar
                    </Btn>
                  </div>

                  {/* Formatos y captura */}
                  <div className='formats'>
                    {[
                      { key:'pescante', label:'Pescante' },
                      { key:'tcarta',   label:'T/Carta'  },
                      { key:'media',    label:'1/2'      },
                      { key:'cuarto',   label:'1/4'      },
                      { key:'octavo',   label:'1/8'      },
                      { key:'tresxdos', label:'3x2'      },
                    ].map(({key,label})=>{
                      const kk = `${mKey}-${key}`;
                      const v  = +qtyP3[kk] || 0;
                      return (
                        <div className='mini' key={kk}>
                          <div style={{fontWeight:700, fontSize:12}}>{label}</div>
                          <div className='row'>
                            <NumberInput
                              value={v}
                              onChange={(nv)=> runScrollSafe(()=> onQtyP3(mKey, key, nv))}
                              maxDigits={2}
                              width={60}
                              ariaLabel={`Cantidad ${label}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Info de precios */}
                  <div className='muted' style={{marginTop:6}}>
                    Precio regular: <b>{m.precioRegular ?? '-'}</b> ·
                    &nbsp;Precio promo: <b>{m.precioPromocion ?? '-'}</b> ·
                    &nbsp;Desc.: <b>{m.descuentoPct ?? '-'}</b>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {visibleMaterialsAll.length > mats.length && (
          <div style={{textAlign:'center',padding:'12px 0'}}>
            <Btn className='border' onClick={loadMore}>Cargar 30 más</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
