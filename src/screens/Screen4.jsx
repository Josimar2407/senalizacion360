import React, { useState } from 'react';

export default function Screen4(){
  // Cambia por tu número en formato internacional sin signos. Ej: México 52 + 10 dígitos
  const WHATS_TARGET = '521234567890'; // <-- pon aquí tu número

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');

  const onSubmit = (e)=>{
    e.preventDefault();
    // Armamos un texto claro con los tres campos
    const text = `Hola, soy ${name || '(sin nombre)'} (${phone || 's/tel'}).\nQuiero información:\n${msg || '(sin mensaje)'}`
    // Abrimos WhatsApp Web / App en nueva pestaña con el mensaje precargado
    const url = `https://wa.me/${WHATS_TARGET}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className='p-4' style={{ minHeight: 'calc(100vh - 56px)' }}>
      <h2 style={{margin:'6px 0', fontSize:16, fontWeight:800}}>Contacto</h2>
      <p style={{color:'#475569', marginTop:0}}>Envíanos un mensaje y te respondemos por WhatsApp.</p>

      <form onSubmit={onSubmit} style={{marginTop:12, maxWidth: 520}}>
        <label style={{display:'block', fontSize:12, color:'#64748b'}}>Nombre</label>
        <input
          value={name}
          onChange={(e)=> setName(e.target.value)}
          required
          placeholder='Tu nombre'
          style={{width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 10px'}}
        />

        <label style={{display:'block', fontSize:12, color:'#64748b', marginTop:12}}>Teléfono</label>
        <input
          value={phone}
          onChange={(e)=> setPhone(e.target.value)}
          placeholder='Tu teléfono'
          style={{width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 10px'}}
        />

        <label style={{display:'block', fontSize:12, color:'#64748b', marginTop:12}}>Mensaje</label>
        <textarea
          value={msg}
          onChange={(e)=> setMsg(e.target.value)}
          placeholder='Escribe tu consulta…'
          rows={4}
          style={{width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 10px'}}
        />

        <div style={{marginTop:14}}>
          <button
            type='submit'
            className='px-4 py-2 rounded'
            style={{ background:'#16a34a', color:'#fff', border:0, fontWeight:700 }}
          >
            Enviar por WhatsApp
          </button>
        </div>

        <p style={{color:'#94a3b8', fontSize:12, marginTop:8}}>
          * Para enviar automáticamente sin abrir WhatsApp se requiere la API Business y un backend.
        </p>
      </form>
    </div>
  );
}
