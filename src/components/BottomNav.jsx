import React from 'react';
import { FOOTER_H } from '../utils/constants';

export default function BottomNav({ screen, setScreen }){
  return (
    <nav
      style={{position:'fixed',left:0,right:0,bottom:0,height:FOOTER_H,background:'#ff6b00',borderTop:'1px solid #e5e7eb',zIndex:20}}
    >
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',height:'100%'}}>
        {[
          {id:1, label:'Deptos'},
          {id:2, label:'Genéricos'},
          {id:3, label:'Comparativos'},
          {id:4, label:'Contacto'},
        ].map(btn=> (
          <button
            key={btn.id}
            onClick={()=> setScreen(btn.id)}
            style={{
              background:'transparent',border:'0',color: screen===btn.id?'#111':'#fff',
              fontWeight:700
            }}
          >{btn.label}</button>
        ))}
      </div>
    </nav>
  );
}
export { FOOTER_H } from '../utils/constants';
