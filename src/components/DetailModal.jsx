import { useState, useEffect, useRef } from "react";
import { CRITERES_LABELS, STATUT_CONFIG, TODAY, RESPONSABLES } from "../data";

function MultiSelect({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  
  function toggle(r) { onChange(selected.includes(r) ? selected.filter(x => x !== r) : [...selected, r]); }
  
  const display = selected.length === 0 ? "Aucun responsable assigne" : selected.length === 1 ? selected[0].split("(")[0].trim() : `${selected.length} responsables`;
  
  return (
    <div className="no-print" ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", background: "white", border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px 12px", textAlign: "left", cursor: "pointer", fontSize: "13px", color: selected.length === 0 ? "#9ca3af" : "#1e3a5f", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{display}</span><span style={{ color: "#6b7280", fontSize: "10px" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "white", border: "1px solid #d1d5db", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 300, maxHeight: "260px", overflowY: "auto" }}>
          {selected.length > 0 && <div style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6" }}><button onClick={() => onChange([])} style={{ fontSize: "11px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Tout deselectionner</button></div>}
          {RESPONSABLES.map(r => {
            const checked = selected.includes(r);
            return (
              <label key={r} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px", cursor: "pointer", background: checked ? "#eff6ff" : "white", borderBottom: "1px solid #f9fafb" }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(r)} style={{ accentColor: "#1d4ed8", width: "15px", height: "15px", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: checked ? "600" : "400", color: "#1e3a5f" }}>{r.split("(")[0].trim()}</div>
                  <div style={{ fontSize: "11px", color: "#6b7280" }}>{r.match(/\(([^)]+)\)/)?.[1] || ""}</div>
                </div>
              </label>
            );
          })}
        </div>
      )}
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
          {selected.map(r => (
            <span key={r} style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "20px", padding: "2px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}>
              {r.split("(")[0].trim()}
              <button onClick={() => toggle(r)} style={{ background: "none", border: "none", cursor: "pointer", color: "#93c5fd", fontSize: "14px", lineHeight: 1, padding: 0 }}>x</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DetailModal({ critere, onClose, onSave }) {
  const [data, setData] = useState({ ...critere, responsables: [...(critere.responsables || [])] });
  const cfg = CRITERES_LABELS[critere.critere];
  const lbl = { display: "block", fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: "700", marginBottom: "7px" };
  const inp = { background: "white", border: "1px solid #d1d5db", borderRadius: "8px", color: "#1e3a5f", padding: "9px 12px", fontSize: "13px", outline: "none", width: "100%" };
  
  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      
      {/* MAGIE CSS POUR L'IMPRESSION DE LA MODALE */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .modal-overlay { 
            position: absolute !important; 
            top: 0 !important; left: 0 !important; 
            background: white !important; /* Cache le tableau de bord derrière */
            align-items: flex-start !important; 
            padding: 0 !important; 
          }
          .modal-content { 
            box-shadow: none !important; 
            border: none !important; 
            width: 100% !important; 
            max-width: 100% !important; 
            max-height: none !important; 
            overflow: visible !important; 
            padding: 0 !important;
          }
          .print-label { display: block !important; margin-bottom: 4px; font-weight: bold; font-size: 14px; color: #1e3a5f; }
          .print-value { display: block !important; margin-bottom: 16px; font-size: 13px; color: #374151; }
        }
      `}</style>

      <div className="modal-content" style={{ background: "white", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "700px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #f1f5f9" }}>
          <span style={{ minWidth: "48px", padding: "5px 0", background: `${cfg.color}15`, color: cfg.color, borderRadius: "8px", fontSize: "14px", fontWeight: "800", textAlign: "center", border: `1px solid ${cfg.color}30` }}>{critere.num}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e3a5f", marginBottom: "3px" }}>{critere.titre}</div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>{cfg.label}</div>
          </div>
          <button className="no-print" onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "22px", cursor: "pointer", lineHeight: 1 }}>x</button>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
          <div>
            <label style={lbl}>Statut</label>
            <select className="no-print" value={data.statut} onChange={e => setData({ ...data, statut: e.target.value })}
              style={{ ...inp, background: STATUT_CONFIG[data.statut].bg, color: STATUT_CONFIG[data.statut].color, fontWeight: "600", border: `1.5px solid ${STATUT_CONFIG[data.statut].border}` }}>
              {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {/* Version texte affichée uniquement à l'impression */}
            <div className="print-value" style={{ display: "none" }}>{STATUT_CONFIG[data.statut].label}</div>
          </div>
          <div>
            <label style={lbl}>Echéance</label>
            <input className="no-print" type="date" value={data.delai} min={TODAY} onChange={e => setData({ ...data, delai: e.target.value })} style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
            <div className="print-value" style={{ display: "none" }}>{new Date(data.delai).toLocaleDateString("fr-FR")}</div>
          </div>
        </div>
        
        <div style={{ marginBottom: "18px" }}>
          <label style={lbl}>Responsable(s)</label>
          <MultiSelect selected={data.responsables} onChange={val => setData({ ...data, responsables: val })} />
          <div className="print-value" style={{ display: "none" }}>
            {data.responsables.length > 0 ? data.responsables.map(r => r.split("(")[0].trim()).join(", ") : "Aucun responsable assigné"}
          </div>
        </div>
        
        <div style={{ marginBottom: "16px" }}>
          <label style={lbl}>Ce qu'attend l'évaluateur Qualiopi</label>
          <textarea className="no-print" value={data.attendus} onChange={e => setData({ ...data, attendus: e.target.value })} rows={3}
            style={{ ...inp, width: "100%", boxSizing: "border-box", resize: "vertical", lineHeight: "1.6", background: "#f8fafc", borderColor: "#e2e8f0" }} />
          <div className="print-value" style={{ display: "none", whiteSpace: "pre-wrap" }}>{data.attendus || "—"}</div>
        </div>
        
        <div style={{ marginBottom: "16px" }}>
          <label style={lbl}>Ce que nous montrerons a l'évaluateur</label>
          <textarea className="no-print" value={data.preuves} onChange={e => setData({ ...data, preuves: e.target.value })} rows={3}
            placeholder="Ex: Livret d'accueil p.12, PV de reunion du 15/01..."
            style={{ ...inp, width: "100%", boxSizing: "border-box", resize: "vertical", lineHeight: "1.6", borderColor: "#bfdbfe", background: "#f0f7ff" }} />
          <div className="print-value" style={{ display: "none", whiteSpace: "pre-wrap" }}>{data.preuves || "—"}</div>
        </div>
        
        <div style={{ marginBottom: "28px" }}>
          <label style={lbl}>Notes internes</label>
          <textarea className="no-print" value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} rows={2}
            placeholder="Points de vigilance, remarques..."
            style={{ ...inp, width: "100%", boxSizing: "border-box", resize: "vertical", lineHeight: "1.6" }} />
          <div className="print-value" style={{ display: "none", whiteSpace: "pre-wrap" }}>{data.notes || "—"}</div>
        </div>
        
        {/* BARRE DES BOUTONS (Avec le nouveau bouton Exporter PDF) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button className="no-print" onClick={() => window.print()} style={{ padding: "8px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", color: "#1d4ed8", cursor: "pointer", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>📄</span> Imprimer la fiche
          </button>
          
          <div className="no-print" style={{ display: "flex", gap: "10px" }}>
            <button onClick={onClose} style={{ padding: "10px 22px", background: "white", border: "1px solid #d1d5db", borderRadius: "8px", color: "#374151", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>Annuler</button>
            <button onClick={() => onSave(data)} style={{ padding: "10px 28px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "none", borderRadius: "8px", color: "white", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>Enregistrer</button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
