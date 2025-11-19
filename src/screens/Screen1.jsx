import React, { useMemo, useRef, useState } from "react";
import '../Styles/brand.css'

const ORANGE = "#f97316";
const ORANGE_L = "#fb923c";
const GRAY_100 = "#f6f6f6";

const ROW_H = 88;

export default function Screen1({
  onFile,
  deptList = [],
  selectedDepts = [],
  toggleDept,
  onReset,
}) {
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);

  const openFile = () => fileRef.current?.click();
  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFileName(f.name);
      onFile?.(f);
    }
  };

  // Reinicia todo: UI + input + callback externo
  const handleReset = () => {
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
    onReset?.();
  };

  const sortedDepts = useMemo(() => {
    const arr = Array.isArray(deptList) ? [...deptList] : [];
    return arr.sort((a, b) =>
      String(a?.code ?? "").localeCompare(String(b?.code ?? ""), "es", { numeric: true })
    );
  }, [deptList]);

  const iconPathFor = (labelRaw) => {
    const t = (labelRaw || "").toLowerCase();
    if (t.includes("belleza")) return "M7 20h2l8-8-2-2-8 8v2zm9.7-11.3 1.6-1.6a2 2 0 0 0 0-2.8l-1.6-1.6-2.8 2.8 2.8 2.8z";
    if (t.includes("tinte") || t.includes("shampoo")) return "M7 20h10v-2H7v2zM10 3h4v6h-4V3zm-1 6h6l2 4H7l2-4z";
    if (t.includes("cuidado personal")) return "M10 2h4v4h-4V2zm-1 6h6l-1 12H10L9 8z";
    if (t.includes("eléctric") || t.includes("electronica") || t.includes("electrónica")) return "M13 2 3 14h7l-1 8 10-12h-7l1-8z";
    if (t.includes("jugueter")) return "M5 8a3 3 0 1 1 6 0H5zm8 0a3 3 0 1 1 6 0h-6zM4 10h16v2H4v-2zm2 4h12v6H6v-6z";
    if (t.includes("bebé") || t.includes("bebe")) return "M12 3a5 5 0 0 0-5 5v3h10V8a5 5 0 0 0-5-5zm-6 9v7h12v-7H6z";
    if (t.includes("papeler")) return "M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1v5h5";
    if (t.includes("regalo")) return "M20 12v8H4v-8h16zm0-4h-4.35A2.5 2.5 0 1 0 12 6.5 2.5 2.5 0 1 0 8.35 8H4v4h16V8z";
    if (t.includes("dulcer")) return "M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0zm-5-1 3-3-3 1-2-3-2 3-3-1 3 3-1 3 3-2 3 2-1-3z";
    if (t.includes("enseres")) return "M3 13h18v2H3v-2zm2-8h4l2 6H3l2-6zm10 0h4l2 6h-8l2-6z";
    if (t.includes("check out") || t.includes("caja")) return "M6 6h12v2H6V6zm-2 4h16v8H4v-8zm3 2v4h2v-4H7z";
    if (t.includes("niñ")) return "M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-7 12h14v2H5v-2z";
    return "M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2z";
  };

  return (
    <div className="min-h-screen" style={{ background: GRAY_100, color: "#111" }}>
      {/* HEADER */}
      <div className="px-4 pt-4 w-full max-w-4xl mx-auto">
        <div className="toolbar">
          {/* Elegir archivo (cambia a naranja y muestra nombre) */}
          <button
            onClick={openFile}
            className={`btn-pill same-height ${fileName ? "btn-orange animate-glow" : "btn-pill-dark"}`}
            title="Cargar Excel"
          >
            <span className="excel-icon">
              <svg viewBox="0 0 24 24" aria-hidden>
                {/* Ícono Excel se mantiene IGUAL en ambos estados */}
                <path d="M14 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8l-6-6z" fill="#107C41"/>
                <path d="M14 2v6h6" fill="#185C37"/>
                <path d="M6 9h5l1.5 2 1.5-2h5l-4 5 4 5h-5l-1.5-2-1.5 2H6l4-5-4-5z" fill="#fff"/>
              </svg>
            </span>
            <span>{fileName || "Elegir archivo (.xls/.xlsx)"}</span>
          </button>

          {/* Reiniciar (extremo derecho) */}
          <button
            onClick={handleReset}
            className="btn-pill btn-red same-height toolbar-right btn-compact"
            title="Reiniciar"
          >
            <svg width="72" height="72" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 1 1-5-5z" />
            </svg>
            <span>Reiniciar</span>
          </button>

          {/* input nativo oculto */}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={onPick}
            className="file-hidden"
          />
        </div>
      </div>

      {/* LISTA */}
      <div className="px-4 pb-6 pt-3 w-full max-w-4xl mx-auto">
        <ul className="screen1-ul">
          {sortedDepts.map((d) => {
            const isSelected = selectedDepts.includes(d.code);
            return (
              <li key={d.code} className="screen1-li" style={{ height: ROW_H, padding: "10px 0" }}>
                <button
                  onClick={() => toggleDept(d.code)}
                  className={`item ${isSelected ? "is-selected" : ""}`}
                >
                  <span className="icon-circle" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d={iconPathFor(d.label)} fill="#111" />
                    </svg>
                  </span>
                  <span className="label">{d.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ====== ESTILOS ====== */}
      <style>{`
        :root{
          --circle-size: 44px;
          --circle-bg: #fff;
          --circle-border: #111;
          --label-color: #2f2f2f;
          --item-bg: #fff;
          --item-radius: 999px;
          --gap: 10px;
          --orange: ${ORANGE};
          --orangeL: ${ORANGE_L};
        }

        /* Scrollbar naranja institucional */
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-track { background: #f5f5f5; }
        ::-webkit-scrollbar-thumb {
          background-color: var(--orange);
          border-radius: 6px;
          border: 2px solid #f5f5f5;
          transition: background-color .3s ease;
        }
        ::-webkit-scrollbar-thumb:hover { background-color: var(--orangeL); }
        * { scrollbar-width: thin; scrollbar-color: var(--orange) #f5f5f5; }

        /* Header */
        .toolbar { display:flex; align-items:center; gap:16px; flex-wrap:nowrap; }
        .toolbar-right { margin-left:auto; }

        .file-hidden{ position:absolute; left:-9999px; opacity:0; pointer-events:none; }

        /* Botones */
        .btn-pill{
          display:inline-flex; align-items:center; justify-content:center; gap:10px;
          padding:10px 18px; height:50px; border:none; border-radius:999px;
          font-weight:700; cursor:pointer; user-select:none;
          transition:transform .12s ease, box-shadow .18s ease, filter .18s ease;
          box-shadow:0 6px 18px rgba(0,0,0,.16); white-space:nowrap;
        }
        .btn-pill svg{ display:block; }
        .btn-pill:active{ transform:scale(.97); }
        .btn-pill:hover{ filter:brightness(1.05); box-shadow:0 8px 22px rgba(0,0,0,.22); }
        .btn-pill-dark{ background:#2f2f2f; color:#fff; }
        .btn-red{ background:#ef4444; color:#fff; }
        .btn-compact{ min-width:210px; }
        .same-height{ height:50px; }

        .excel-icon{
          width:30px; height:30px; display:inline-grid; place-items:center;
          border-radius:6px; overflow:hidden; background:#fff;
        }

        /* Estado naranja + animación glow */
        .btn-orange{
          background:linear-gradient(90deg, var(--orange), var(--orangeL));
          color:#fff;
          border:2px solid var(--orange);
          box-shadow:0 0 12px rgba(249,115,22,.3);
          animation: glowPulse 1s ease-in-out;
        }
        .btn-orange:hover{
          filter:brightness(1.1);
          box-shadow:0 0 20px rgba(249,115,22,.45);
        }
        @keyframes glowPulse {
          0% { box-shadow:0 0 0 rgba(249,115,22,0); transform:scale(0.96); }
          60% { box-shadow:0 0 25px rgba(249,115,22,0.4); transform:scale(1.02); }
          100% { box-shadow:0 0 12px rgba(249,115,22,0.3); transform:scale(1); }
        }

        /* Lista */
        .screen1-ul{ margin:0; padding:0; list-style:none; }
        .item{
          display:inline-flex; align-items:center; gap:var(--gap);
          padding:8px 14px 8px 8px; width:100%;
          background:var(--item-bg); border:2px solid #000; border-radius:var(--item-radius);
          cursor:pointer; transition:transform .05s ease-in-out, background .2s, color .2s, border-color .2s, box-shadow .2s;
        }
        .item:active{ transform:scale(0.985); }
        .item .label{
          color:var(--label-color); font-size:18px; font-weight:800;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .icon-circle{
          width:var(--circle-size); height:var(--circle-size);
          border-radius:50%; background:var(--circle-bg); border:2px solid var(--circle-border);
          display:grid; place-items:center; flex:0 0 auto;
        }
        .icon-circle svg{ width:70%; height:70%; display:block; }

        .item.is-selected{
          background:linear-gradient(90deg, var(--orange), var(--orangeL));
          border-color:var(--orange); box-shadow:0 0 12px rgba(249,115,22,.28);
        }
        .item.is-selected .label{ color:#fff; }
        .item.is-selected .icon-circle{ background:var(--orange); border-color:#fff; }
        .item.is-selected .icon-circle svg path{ fill:#fff !important; }

        @media (max-width: 520px){
          .toolbar{ flex-wrap:wrap; }
          .toolbar-right{ margin-left:0; }
        }
      `}</style>
    </div>
  );
}
