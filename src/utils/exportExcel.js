import * as XLSX from 'xlsx';
import { HEADERS_P2, SHEET_P2, SHEET_P3 } from './constants';
import { toDate, fmtDmy, vigenciaUnificada, fechaNombreArchivoLocal } from './dateUtils';

export function exportExcel({ qtyP2, qtyP3, deptList, promoDatesG, materials, toNum=(x)=>Number(x||0) }){
  // ------- P2
  const headerP2 = [
    'Departamento','Promoción','Vigencia',
    HEADERS_P2.pescante, HEADERS_P2.tcarta, HEADERS_P2.media,
    HEADERS_P2.cuarto, HEADERS_P2.octavo, HEADERS_P2.tresxdos,
  ];
  const mapP2 = new Map();
  Object.entries(qtyP2||{}).forEach(([k,v])=>{
    const n = toNum(v); if(n<=0) return;
    const mm = k.match(/^([^:]+)::(.+?)::(pescante|tcarta|media|cuarto|octavo|tresxdos)$/);
    if(!mm) return;
    const dept=mm[1], gen=mm[2], size=mm[3];
    const promoKey = `${dept}::${gen}`;
    const deptLabel = (deptList||[]).find(x=>x.code===dept)?.label || dept;
    const desde = promoDatesG?.[promoKey]?.desde || '';
    const hasta = promoDatesG?.[promoKey]?.hasta || '';
    const vig = vigenciaUnificada(desde,hasta) || [desde,hasta].filter(Boolean).join(' - ');
    if(!mapP2.has(promoKey)) mapP2.set(promoKey,{ deptLabel, gen, vig, sizes:{pescante:0,tcarta:0,media:0,cuarto:0,octavo:0,tresxdos:0} });
    mapP2.get(promoKey).sizes[size]+=n;
  });
  const rowsP2 = Array.from(mapP2.values()).map(r=>[
    r.deptLabel, r.gen, r.vig,
    r.sizes.pescante, r.sizes.tcarta, r.sizes.media,
    r.sizes.cuarto, r.sizes.octavo, r.sizes.tresxdos,
  ]);
  const wsP2 = XLSX.utils.aoa_to_sheet([headerP2, ...rowsP2]);
  wsP2['!autofilter'] = { ref: `A1:I${Math.max(1,rowsP2.length)+1}` };

  // ------- P3 (Comparativos = columna H TAL CUAL)
  const headerP3 = [
    'Departamento','Comparativo','Descuento (%)','Precio Regular','Precio Promoción','Vigencia',
    HEADERS_P2.pescante, HEADERS_P2.tcarta, HEADERS_P2.media, HEADERS_P2.cuarto, HEADERS_P2.octavo, HEADERS_P2.tresxdos,
  ];
  const matIndex = new Map();
  (materials||[]).forEach(mat=>{
    matIndex.set(`${mat.dept}::${mat.promoG}::${mat.ean}`, mat);
  });
  const mapP3 = new Map();
  Object.entries(qtyP3||{}).forEach(([k,v])=>{
    const n = toNum(v); if(n<=0) return;
    const mm = k.match(/^(.+)-(pescante|tcarta|media|cuarto|octavo|tresxdos)$/);
    if(!mm) return;
    const mKey=mm[1], size=mm[2];
    const mat = matIndex.get(mKey); if(!mat) return;
    const promoKey = `${mat.dept}::${mat.promoG}`;
    const desde = promoDatesG?.[promoKey]?.desde || fmtDmy(toDate(mat.vigDesde));
    const hasta = promoDatesG?.[promoKey]?.hasta || fmtDmy(toDate(mat.vigHasta));
    const vig = vigenciaUnificada(desde,hasta) || [desde||'',hasta||''].filter(Boolean).join(' - ');
    const deptLabel = (deptList||[]).find(x=>x.code===mat.dept)?.label || mat.dept;
    if(!mapP3.has(mKey)) mapP3.set(mKey,{
      deptLabel,
      comparativo: String(mat.descH ?? ''), // 👈 exacto de H
      descuentoPct: String(mat.descuentoPct ?? '').trim(),
      precioRegular: mat.precioRegular,
      precioPromocion: mat.precioPromocion,
      vig,
      sizes:{pescante:0,tcarta:0,media:0,cuarto:0,octavo:0,tresxdos:0}
    });
    mapP3.get(mKey).sizes[size]+=n;
  });
  const rowsP3 = Array.from(mapP3.values()).map(r=>[
    r.deptLabel, r.comparativo, r.descuentoPct, r.precioRegular, r.precioPromocion, r.vig,
    r.sizes.pescante, r.sizes.tcarta, r.sizes.media, r.sizes.cuarto, r.sizes.octavo, r.sizes.tresxdos,
  ]);
  const wsP3 = XLSX.utils.aoa_to_sheet([headerP3,...rowsP3]);
  wsP3['!autofilter'] = { ref: `A1:L${Math.max(1,rowsP3.length)+1}` };

  // ------- Libro
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsP2, SHEET_P2);
  XLSX.utils.book_append_sheet(wb, wsP3, SHEET_P3);
  XLSX.writeFile(wb, `Senalizacion_${fechaNombreArchivoLocal()}.xlsx`);
}
