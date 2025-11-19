import React from "react";
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as XLSX from 'xlsx';

// UI
import BottomNav, { FOOTER_H } from './components/BottomNav';
import Screen1 from './screens/Screen1';
import Screen2 from './screens/Screen2';
import Screen3 from './screens/Screen3';
import Screen4 from './screens/Screen4';
import ScreenPrint from './screens/ScreenPrint';

// Utils / constants
import { IDX, SHEET_P2, SHEET_P3, HEADERS_P2 } from './utils/constants';
import { toNum, cleanGenericBody, stripLeadingPercent } from './utils/formatUtils';
import { fmtDmy, toDate, fechaNombreArchivoLocal, vigenciaUnificada } from './utils/dateUtils';
import { saveStateRaw, loadState, clearState, useDebouncedEffect } from './utils/storage';
import { loadCatalog, upsertCatalog } from './utils/catalog';
import { exportExcel } from './utils/exportExcel';

export default function App(){
  // ---------------- Navegación con animación izquierda/derecha ----------------
  const [screen, setScreenState] = useState(1); // 1: Deptos, 2: Genéricos, 3: Comparativos, 4: Contacto, 5: Print
  const prevScreenRef = useRef(1);
  const [direction, setDirection] = useState(0);
  const setScreen = (next)=>{
    const prev = prevScreenRef.current;
    if(next!==prev){
      setDirection(next>prev?1:-1);
      prevScreenRef.current = next;
      setScreenState(next);
    }
  };

  // ---------------- Estado global rehidratable -------------------------------
  const [materials, setMaterials] = useState([]);     // filas normalizadas del Excel
  const [deptList, setDeptList] = useState([]);       // catálogo deptos
  const [selectedDepts, setSelectedDepts] = useState([]);

  // P2 (Genéricos)
  const [promoDatesG, setPromoDatesG] = useState({}); // vigencias unificadas por (dept::gen)
  const [qtyP2, setQtyP2] = useState({});             // cantidades por (dept::gen::size)
  const [checkedP2, setCheckedP2] = useState({});     // promos marcadas en P2
  const [openP2, setOpenP2] = useState({});           // acordeón por promoKey

  // P3 (Comparativos)
  const [qtyP3, setQtyP3] = useState({});             // cantidades por (dept::gen::ean-size)
  const [openP3, setOpenP3] = useState({});           // acordeón por mKey
  const [queryEAN, setQueryEAN] = useState('');       // filtro por EAN opcional

  // UI / otros
  const [limitP2, setLimitP2] = useState(139); //Eliminar
  const [limitP3, setLimitP3] = useState(139); //Eliminar
  const [exportMsg, setExportMsg] = useState('');
  const [printBatch, setPrintBatch] = useState(null);
  const [catalog, setCatalog] = useState(loadCatalog()); // catálogo local de descripciones canónicas

  useEffect(()=>{ document.title='Señalizacion 360'; },[]); //Esta quiero Cambiar

  // Rehidrata captura previa (para no perder trabajo al refrescar)
  useEffect(()=>{
    const s = loadState(); if(!s) return;
    setScreenState(s.screen ?? 1); prevScreenRef.current = s.screen ?? 1;
    setDeptList(s.deptList ?? []);
    setSelectedDepts(s.selectedDepts ?? []);
    setPromoDatesG(s.promoDatesG ?? {});
    setQtyP2(s.qtyP2 ?? {});
    setCheckedP2(s.checkedP2 ?? {});
    setMaterials(s.materials ?? []);
    setQtyP3(s.qtyP3 ?? {});
    setOpenP2(s.openP2 ?? {});
    setOpenP3(s.openP3 ?? {});
  },[]);

  // Persiste con debounce para evitar sobrescrituras excesivas
  useDebouncedEffect(()=>{
    saveStateRaw({ screen, deptList, selectedDepts, promoDatesG, qtyP2, checkedP2, materials, qtyP3, openP2, openP3 });
  }, [screen, deptList, selectedDepts, promoDatesG, qtyP2, checkedP2, materials, qtyP3, openP2, openP3], 500);

  // ---------------- Carga Excel + normalización ------------------------------
  const handleFile = async (file)=>{
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type:'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    // header:1 devuelve AOA, defval:'' evita undefined
    const aoa = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
    const body = (aoa||[]).slice(1); // quita encabezado

    // 1) Catálogo de departamentos
    const mapDept = new Map();
    body.forEach(r=>{
      const code = String(r[IDX.DEPT] ?? '').trim();
      if(!code) return;
      if(!mapDept.has(code)){
        const name = String(r[IDX.DEPT_NAME] ?? '').trim();
        const label = name ? `${code} ${name}` : code;
        mapDept.set(code, { code, name, label });
      }
    });
    setDeptList(Array.from(mapDept.values()).sort((a,b)=> String(a.code).localeCompare(String(b.code),'es',{numeric:true})));

    // 2) Materiales (respeta Ajuste 2/3: AA como total, si no, suma Bodega+Piso+Ext)
    const mats = body
      .map(r=>{
        const dept   = String(r[IDX.DEPT] ?? '').trim();
        const promoG = String(r[IDX.G_PROMO] ?? '').trim();  // col G (genérico)
        const descH  = String(r[IDX.H_DESC] ?? '').trim();   // col H (comparativo)
        if(!dept || !promoG) return null;

        const invTotal = (()=>{ // prioriza AA; si 0/empty, calcula manual
          const aa = toNum(r[IDX.AA_TOTAL]);
          if(aa>0) return aa;
          return toNum(r[IDX.C_BODEGA]) + toNum(r[IDX.D_PISO]) + toNum(r[IDX.E_EXT]) + toNum(r[IDX.F_EXT2]);
        })();

        return {
          dept,
          deptName: String(r[IDX.DEPT_NAME] ?? '').trim(),
          promoG,
          descH,
          ean: String(r[IDX.K_EAN] ?? '').trim(),
          invBodega: r[IDX.C_BODEGA],
          invPiso:   r[IDX.D_PISO],
          ext1:      r[IDX.E_EXT],
          ext2:      r[IDX.F_EXT2],
          invTotal,
          precioRegular:   r[IDX.O_PREG],
          precioPromocion: r[IDX.P_PPROMO],
          descuentoPct:    r[IDX.Q_DESC_PCT],
          centros: r[IDX.W_CENTROS],
          vigDesde: r[IDX.S_VIG_INICIO],
          vigHasta: r[IDX.T_VIG_FIN],
        };
      })
      .filter(Boolean)
      .filter(m=> toNum(m.invTotal) > 0) // solo con existencia visible
      .sort((a,b)=> toNum(b.invTotal) - toNum(a.invTotal)); // más stock arriba

    setMaterials(mats);

    // 3) Vigencias unificadas por (dept::gen)
    const acc = new Map();
    mats.forEach(m=>{
      const key = `${m.dept}::${m.promoG}`;
      const dIni = toDate(m.vigDesde);
      const dFin = toDate(m.vigHasta);
      const prev = acc.get(key) || { desde:null, hasta:null };
      const desde = prev.desde && dIni ? (dIni < prev.desde ? dIni : prev.desde) : (prev.desde || dIni);
      const hasta = prev.hasta && dFin ? (dFin > prev.hasta ? dFin : prev.hasta) : (prev.hasta || dFin);
      acc.set(key, { desde, hasta });
    });
    const obj = {};
    acc.forEach((v,k)=>{ obj[k] = { desde: fmtDmy(v.desde), hasta: fmtDmy(v.hasta) }; });
    setPromoDatesG(obj);

    // 4) Resetea límites de listas
    setLimitP2(75); setLimitP3(75);
  };

  // ---------------- Listas derivadas (P2/P3) ---------------------------------
  // Lista única de promos genéricas visibles según deptos seleccionados
  const promoListAll = useMemo(()=>{
    const set = new Map();
    (materials||[]).forEach(m=>{
      if(!selectedDepts.includes(m.dept)) return;
      const key = `${m.dept}::${m.promoG}`;
      if(!set.has(key)){
        set.set(key, {
          key,
          dept: m.dept,
          gen:  m.promoG,
          desde: promoDatesG[key]?.desde || '',
          hasta: promoDatesG[key]?.hasta || ''
        });
      }
    });
    const arr = Array.from(set.values());
    arr.sort((a,b)=> a.dept===b.dept ? a.gen.localeCompare(b.gen,'es',{numeric:true})
                                     : a.dept.localeCompare(b.dept,'es',{numeric:true}));
    return arr;
  }, [materials, selectedDepts, promoDatesG]);

  // Promos marcadas en P2
  const chosenPromoKeys = useMemo(
    ()=> Object.entries(checkedP2).filter(([,v])=> !!v).map(([k])=> k),
    [checkedP2]
  );

  // Materiales visibles para P3 (por depto, selección P2 y filtro EAN)
  const visibleMaterialsAll = useMemo(()=>{
    const chosen = new Set(chosenPromoKeys);
    const q = String(queryEAN||'').trim();
    return (materials||[])
      .filter(m=> selectedDepts.includes(m.dept))
      .filter(m=> (chosen.size===0 ? true : chosen.has(`${m.dept}::${m.promoG}`)))
      .filter(m=> (q ? String(m.ean||'').includes(q) : true));
  }, [materials, selectedDepts, chosenPromoKeys, queryEAN]);

  // ---------------- Handlers de UI y captura --------------------------------
  const onQtyP2 = (key, val) =>     setQtyP2(prev => ({...prev, [key]: val}));  // "5", "10" o "" (Ajuste 1)
  const onQtyP3 = (mKey, size, val)=>   setQtyP3(p=> ({...p, [`${mKey}-${size}`]: Number(val||0)}));
  const toggleDept = (code)=> setSelectedDepts(prev=> prev.includes(code)? prev.filter(c=> c!==code) : [...prev, code]);
  const onReset = ()=>{
    if(!window.confirm('¿Seguro que quieres reiniciar? Esto borrará lo capturado.')) return;
    setMaterials([]); setDeptList([]); setSelectedDepts([]);
    setPromoDatesG({}); setQtyP2({}); setCheckedP2({}); setQtyP3({});
    setOpenP2({}); setOpenP3({}); setQueryEAN('');
    clearState();
  };

  // ---------------- Catálogo canónico (para Screen3) ------------------------
  const saveCanonical = (rawPromo, canonicalText)=>{
    // Normaliza cuerpo y guarda en mayúsculas para consistencia
    const norm = stripLeadingPercent(cleanGenericBody(rawPromo)).toUpperCase();
    const cat = upsertCatalog(norm, String(canonicalText||'').toUpperCase());
    setCatalog(cat);
  };
  const getCanonical = (rawPromo)=>{
    const norm = stripLeadingPercent(cleanGenericBody(rawPromo)).toUpperCase();
    return catalog[norm] || norm;
  };

  // ---------------- EXPORTACIÓN: Vista de Impresión -------------------------
  const onExport = () => {
  const items = [];

  // === P2 → Tarjetas genéricas ===
  Object.entries(qtyP2).forEach(([k, v]) => {
      const n = Number(v || 0);
      if (n <= 0) return;

       const mm = k.match(/^([^:]+)::(.+?)::(pescante|tcarta|media|cuarto|octavo|tresxdos)$/);
       if (!mm) return;
       const dept = mm[1], gen = mm[2], size = mm[3];
       const promoKey = `${dept}::${gen}`;

       const title = getCanonical(gen);
       const subtitle =
       promoDatesG[promoKey]?.desde && promoDatesG[promoKey]?.hasta
           ? vigenciaUnificada(promoDatesG[promoKey]?.desde, promoDatesG[promoKey]?.hasta)
           : "";

  // P2 normalmente no tiene precios (solo nombre + vigencia)
  items.push({
    id: `${promoKey}::${size}`,
    title,
    subtitle,
    size,
    qty: n,
    });
  });

  // === P3 → Tarjetas comparativas (desde columna H: descH) ===
  Object.entries(qtyP3).forEach(([k, v]) => {
      const n = Number(v || 0);
      if (n <= 0) return;

      const mm = k.match(/^(.+)-(pescante|tcarta|media|cuarto|octavo|tresxdos)$/);
      if (!mm) return;
      const mKey = mm[1],
      size = mm[2];
      const m = (materials || []).find(
      (x) => `${x.dept}::${x.promoG}::${x.ean}` === mKey
      );
      if (!m) return;

      const title = getCanonical(m.descH); // comparativo = H
      const subtitle = vigenciaUnificada(
      fmtDmy(toDate(m.vigDesde)),
      fmtDmy(toDate(m.vigHasta))
      );

      const percent = String(m.descuentoPct ?? "").trim() || null;
      const precioRegular = m.precioRegular ?? null;
      const precioPromocion = m.precioPromocion ?? null;

      items.push({
      id: `${mKey}-${size}`,
      title,
      subtitle,
      size,
      qty: n,
      percent,
      precioRegular,
      precioPromocion,
      });
    });

    setPrintBatch({ items });
    setScreen(5);
  };


  // ---------------- EXPORTACIÓN: Excel (utilidad) ---------------------------
  const onExportExcel = ()=>{
    exportExcel({ qtyP2, qtyP3, deptList, promoDatesG, materials, toNum:(x)=>Number(x||0) });
    setExportMsg('✅ Archivo exportado correctamente.');
    setTimeout(()=> setExportMsg(''), 2500);
  };

  // ---------------- Variantes de animación (sin blur) -----------------------
  const variants = {
    enter: (d)=> ({ x: d>0? 40:-40, opacity:0 }),
    center: { x:0, opacity:1, transition:{ type:'spring', stiffness:420, damping:36 } },
    exit:   (d)=> ({ x: d>0? -40:40, opacity:0, transition:{ duration:.25 } }),
  };

  // ---------------- Render ---------------------------------------------------
  return (
    <div className='w-full'>
      {/* Header fijo y limpio (look & feel app móvil) */}
      <header className='px-4 py-2' style={{borderBottom:'1px solid #e5e7eb', background:'#fff', position:'sticky', top:0, zIndex:10, textAlign:'center'}}>
        <h1 className='text-sm' style={{margin:0, fontWeight:700}}>Señalizacion 360</h1>
      </header>

      {/* main con padding inferior = alto del footer para evitar “brinco” móvil */}
      <main style={{ minHeight:'100dvh', paddingBottom:`calc(${FOOTER_H}px + env(safe-area-inset-bottom))` }}>
        <AnimatePresence mode='wait' custom={direction}>
          {screen===1 && (
            <motion.div key='s1' custom={direction} variants={variants} initial='enter' animate='center' exit='exit'>
              <Screen1 onFile={handleFile} deptList={deptList} selectedDepts={selectedDepts} toggleDept={toggleDept} onReset={onReset} />
            </motion.div>
          )}

          {screen===2 && (
            <motion.div key='s2' custom={direction} variants={variants} initial='enter' animate='center' exit='exit'>
              <Screen2
                promoListAll={promoListAll}
                limitP2={limitP2}
                setLimitP2={setLimitP2}
                openP2={openP2}
                setOpenP2={setOpenP2}
                checkedP2={checkedP2}
                setCheckedP2={setCheckedP2}
                qtyP2={qtyP2}
                onQtyP2={onQtyP2}
                selectedDepts={selectedDepts}
                onReset={onReset}
                onExport={onExport}
                onExportExcel={onExportExcel}
              />
            </motion.div>
          )}

          {screen===3 && (
            <motion.div key='s3' custom={direction} variants={variants} initial='enter' animate='center' exit='exit'>
              <Screen3
                visibleMaterialsAll={visibleMaterialsAll}
                limitP3={limitP3}
                setLimitP3={setLimitP3}
                openP3={openP3}
                setOpenP3={setOpenP3}
                qtyP3={qtyP3}
                onQtyP3={onQtyP3}
                selectedDepts={selectedDepts}
                queryEAN={queryEAN}
                setQueryEAN={setQueryEAN}
                promoDatesG={promoDatesG}
                saveCanonical={saveCanonical}
                getCanonical={getCanonical}
              />
            </motion.div>
          )}

          {screen===4 && (
            <motion.div key='s4' custom={direction} variants={variants} initial='enter' animate='center' exit='exit'>
              <Screen4 />
            </motion.div>
          )}

          {screen===5 && (
            <motion.div key='s5' custom={direction} variants={variants} initial='enter' animate='center' exit='exit'>
              <ScreenPrint batch={printBatch} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer fijo (sin contorno blanco ni salto) */}
      <BottomNav className="no-print" screen={screen} setScreen={setScreen} />

      {/* Toast de exportación */}
      {!!exportMsg && (
        <div style={{ position:'fixed', bottom:'calc(56px + 8px)', right:16, background:'#fff', border:'1px solid #d1d5db', borderRadius:8, padding:'8px 12px', color:'#166534', boxShadow:'0 4px 14px rgba(0,0,0,.08)'}}>
          {exportMsg}
        </div>
      )}
    </div>
  );
}
