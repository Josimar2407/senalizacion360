import React from 'react';
export default function SectionHeader({ title, right }){
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0'}}>
      <h2 style={{margin:0,fontSize:'16px',fontWeight:700,color:'#111'}}>{title}</h2>
      <div style={{fontSize:'12px',color:'#475569'}}>{right}</div>
    </div>
  );
}
