import { useState, useEffect, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, getBytes } from "firebase/storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from "../firebase";
import { CRITERES_LABELS, STATUT_CONFIG, RESPONSABLES, GUIDE_QUALIOPI, ROLE_COLORS } from "../data";

function MultiSelect({ selected, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();
  useEffect(() => { function h(e) { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false); } document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  function toggle(r) { onChange(selected.includes(r) ? selected.filter(x => x !== r) : [...selected, r]); }
  const display = selected.length === 0 ? "Aucun responsable assigné" : selected.length === 1 ? selected[0].split("(")[0].trim() : `${selected.length} responsables`;
  
  return (
    <div className="no-print" ref={dropdownRef} style={{ position: "relative" }}>
      <button onClick={() => !disabled && setOpen(!open)} style={{ width: "100%", background: disabled ? "#f9fafb" : "white", border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px 12px", textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", fontSize: "13px", color: selected.length === 0 ? "#9ca3af" : "#1e3a5f", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>{display}</span>{!disabled && <span style={{ color: "#6b7280", fontSize: "10px" }}>{open ? "▲" : "▼"}</span>}</button>
      {open && !disabled && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "white", border: "1px solid #d1d5db", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 300, maxHeight: "260px", overflowY: "auto" }}>
          {selected.length > 0 && <div style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6" }}><button onClick={() => onChange([])} style={{ fontSize: "11px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Tout désélectionner</button></div>}
          {RESPONSABLES.map(r => {
            const checked = selected.includes(r);
            const role = r.match(/\(([^)]+)\)/)?.[1] || "Défaut";
            const cCfg = ROLE_COLORS[role] || ROLE_COLORS["Défaut"];
            return (<label key={r} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px", cursor: "pointer", background: checked ? "#eff6ff" : "white", borderBottom: "1px solid #f9fafb" }}><input type="checkbox" checked={checked} onChange={() => toggle(r)} style={{ accentColor: "#1d4ed8", width: "15px", height: "15px", flexShrink: 0 }} /><div><div style={{ fontSize: "13px", fontWeight: checked ? "600" : "400", color: "#1e3a5f" }}>{r.split("(")[0].trim()}</div><div style={{ fontSize: "11px", color: cCfg.text, fontWeight: "600" }}>{role}</div></div></label>);
          })}
        </div>
      )}
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
          {selected.map(r => {
            const role = r.match(/\(([^)]+)\)/)?.[1] || "Défaut";
            const cCfg = ROLE_COLORS[role] || ROLE_COLORS["Défaut"];
            return (<span key={r} style={{ background: disabled ? "#f3f4f6" : cCfg.bg, color: disabled ? "#6b7280" : cCfg.text, border: `1px solid ${disabled ? "#d1d5db" : cCfg.border}`, borderRadius: "20px", padding: "3px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>{r.split("(")[0].trim()}{!disabled && <button onClick={() => toggle(r)} style={{ background: "none", border: "none", cursor: "pointer", color: cCfg.text, opacity: 0.7, fontSize: "14px", lineHeight: 1, padding: 0 }}>x</button>}</span>);
          })}
        </div>
      )}
    </div>
  );
}

export default function DetailModal({ critere, onClose, onSave, isReadOnly, isAuditMode }) {
  const [data, setData] = useState({ ...critere, responsables: [...(critere.responsables || [])], fichiers: [...(critere.fichiers || [])] });
  const [uploading, setUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState("");
  
  const cfg = CRITERES_LABELS[critere.critere] || { color: "#9ca3af" };
  const lbl = { display: "block", fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: "700", marginBottom: "7px" };
  const inp = { background: (isReadOnly || isAuditMode) ? "#f9fafb" : "white", border: "1px solid #d1d5db", borderRadius: "8px", color: "#1e3a5f", padding: "9px 12px", fontSize: "13px", outline: "none", width: "100%", cursor: (isReadOnly || isAuditMode) ? "not-allowed" : "text" };
  const guide = GUIDE_QUALIOPI[critere.id];
  const TODAY = new Date().toISOString().split("T")[0];

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileRef = ref(storage, `preuves/${critere.id}_${Date.now()}_${file.name}`);
      await uploadBytesResumable(fileRef, file);
      const url = await getDownloadURL(fileRef);
      const newFile = { name: file.name, url: url, path: fileRef.fullPath, archive: false };
      setData({ ...data, fichiers: [...data.fichiers, newFile] });
    } catch (error) { alert("Erreur lors de l'envoi : " + error.message); }
    setUploading(false);
  }

  async function handleDeleteFile(fileToDelete) {
    if (!window.confirm(`Supprimer définitivement le document "${fileToDelete.name}" ?`)) return;
    try {
      if (fileToDelete.path) {
        const fileRef = ref(storage, fileToDelete.path);
        await deleteObject(fileRef);
      }
    } catch (error) { console.warn("Fichier déjà supprimé du serveur."); }
    setData({ ...data, fichiers: data.fichiers.filter(f => f.url !== fileToDelete.url) });
  }

  async function handleAIAnalysis() {
    const activeFiles = data.fichiers.filter(f => !f.archive);
    if (activeFiles.length === 0) return alert("Veuillez d'abord joindre un document !");
    
    const fileToAnalyze = activeFiles[activeFiles.length - 1];
    const ext = fileToAnalyze.name.split('.').pop().toLowerCase();
    
    let mimeType = '';
    if (ext === 'pdf') mimeType = 'application/pdf';
    else if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg';
    else if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'webp') mimeType = 'image/webp';
    else {
      setAiReport(`⚠️ Format non supporté (${ext.toUpperCase()}).\n\nL'IA Gemini peut analyser les PDF et les Images.\nPour les fichiers Word (.doc) ou Excel (.xls), merci de les enregistrer en PDF avant de les importer.`);
      return;
    }

    setIsAnalyzing(true);
    setAiReport("⏳ Lecture du document par l'IA en cours...");
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const fileRef = ref(storage, fileToAnalyze.path);
      const arrayBuffer = await getBytes(fileRef);
      const base64String = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

      const prompt = `Tu es un auditeur Qualiopi expert pour un IFSI. Analyse ce document pour l'indicateur ${critere.num} ("${critere.titre}").
      Attendu : ${guide.niveau}
      Preuves suggérées : ${guide.preuves}
      Règle de non-conformité : ${guide.nonConformite}
      
      Réponds de manière structurée :
      1. Pertinence du document (Oui/Non)
      2. Analyse des points forts
      3. Ce qu'il manque éventuellement pour être 100% conforme.
      Sois concis et direct.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64String, mimeType } }
      ]);

      setAiReport(result.response.text());
    } catch (error) {
      setAiReport(`❌ Erreur d'analyse : ${error.message}`);
    }
    setIsAnalyzing(false);
  }

  const actFile = data.fichiers.filter(f => !f.archive);
  const archFile = data.fichiers.filter(f => f.archive);
  
  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "white", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "1000px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #f1f5f9" }}>
          <span style={{ padding: "5px 12px", background: `${cfg.color}15`, color: cfg.color, borderRadius: "8px", fontSize: "14px", fontWeight: "800", textAlign: "center", border: `1px solid ${cfg.color}30`, whiteSpace: "nowrap" }}>{critere.num || "-"}</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: "18px", fontWeight: "800", color: "#1e3a5f", marginBottom: "3px" }}>{critere.titre || "-"}</div><div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>{cfg.label}</div></div>
          {isReadOnly && <span style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", marginRight: "10px" }}>🔒 ARCHIVE</span>}
          <button className="no-print" onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "22px", cursor: "pointer", lineHeight: 1 }}>x</button>
        </div>
        
        <div className="print-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "24px" }}>
          
          <div className="print-col" style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", borderBottom: "2px solid #e2e8f0", paddingBottom: "8px" }}><span style={{ fontSize: "18px" }}>📖</span><h3 style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a5f", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>Référentiel Officiel</h3></div>
            <div style={{ marginBottom: "16px" }}><div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Indicateur d'appréciation</div><div style={{ fontSize: "13px", color: "#1e3a5f", fontWeight: "600", fontStyle: "italic", lineHeight: "1.5" }}>"{guide.appreciation}"</div></div>
            <div style={{ marginBottom: "16px" }}><div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Niveau attendu</div><div style={{ fontSize: "13px", color: "#374151", lineHeight: "1.5" }}>{guide.niveau}</div></div>
            <div style={{ marginBottom: "16px" }}><div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Exemples de preuves</div><div style={{ fontSize: "12px", color: "#4b5563", lineHeight: "1.5", background: "white", padding: "10px", border: "1px dashed #d1d5db", borderRadius: "6px" }}>{guide.preuves}</div></div>
          </div>

          <div className="print-col">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", borderBottom: "2px solid #e2e8f0", paddingBottom: "8px" }}><span style={{ fontSize: "18px" }}>✍️</span><h3 style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a5f", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>Réponse IFPS</h3></div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={lbl}>Statut</label>
                <select disabled={isReadOnly || isAuditMode} value={data.statut} onChange={e => setData({ ...data, statut: e.target.value })} style={{ ...inp, background: (STATUT_CONFIG[data.statut]||STATUT_CONFIG["non-evalue"]).bg, color: (STATUT_CONFIG[data.statut]||STATUT_CONFIG["non-evalue"]).color, fontWeight: "600" }}>
                  {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Échéance</label>
                <input disabled={isReadOnly || isAuditMode} type="date" value={data.delai} min={TODAY} onChange={e => setData({ ...data, delai: e.target.value })} style={inp} />
              </div>
            </div>
            
            <div style={{ marginBottom: "16px" }}><label style={lbl}>Responsables</label><MultiSelect disabled={isReadOnly || isAuditMode} selected={data.responsables} onChange={val => setData({ ...data, responsables: val })} /></div>
            
            <div style={{ marginBottom: "16px", background: "#f0fdf4", border: "1px solid #6ee7b7", borderRadius: "8px", padding: "12px" }}>
              <label style={{...lbl, color: "#065f46"}}>✅ Preuves Finalisées (PDF/Images)</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {actFile.map(f => (
                  <div key={f.url} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", padding: "8px 12px", borderRadius: "6px", border: "1px solid #a7f3d0", fontSize: "13px" }}>
                    <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#059669", fontWeight: "600", textDecoration: "none" }}>📄 {f.name}</a>
                    {(!isReadOnly && !isAuditMode) && <button onClick={() => handleDeleteFile(f)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>🗑️</button>}
                  </div>
                ))}
              </div>
              {(!isReadOnly && !isAuditMode) && (
                <div style={{ marginTop: "10px" }}>
                  <input type="file" accept="application/pdf,image/*" id={`file-${critere.id}`} style={{ display: "none" }} onChange={handleFileUpload} disabled={uploading} />
                  <label htmlFor={`file-${critere.id}`} style={{ display: "inline-block", background: "white", border: "1px dashed #059669", color: "#059669", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                    {uploading ? "⏳ Envoi..." : "📎 Ajouter un PDF ou une Photo..."}
                  </label>
                </div>
              )}
            </div>

            {aiReport && (
              <div style={{ marginBottom: "16px", background: "#faf5ff", border: "1px solid #d8b4fe", borderRadius: "8px", padding: "16px" }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#6b21a8", fontSize: "14px" }}>✨ Rapport d'audit IA</h4>
                <div style={{ fontSize: "13px", color: "#4c1d95", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{aiReport}</div>
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label style={lbl}>Liens externes / Observations</label>
              <textarea readOnly={isReadOnly || isAuditMode} value={data.preuves || ""} onChange={e => setData({ ...data, preuves: e.target.value })} rows={2} style={inp} />
            </div>

            {!isAuditMode && (
              <div style={{ marginBottom: "16px" }}>
                <label style={lbl}>Notes internes</label>
                <textarea readOnly={isReadOnly} value={data.notes || ""} onChange={e => setData({ ...data, notes: e.target.value })} rows={2} style={inp} />
              </div>
            )}
          </div>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
          <button onClick={handleAIAnalysis} disabled={isAnalyzing || actFile.length === 0} style={{ padding: "8px 16px", background: "linear-gradient(135deg, #a855f7, #6366f1)", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontSize: "12px", fontWeight: "700", opacity: (isAnalyzing || actFile.length === 0) ? 0.6 : 1 }}>
            {isAnalyzing ? "Analyse..." : "✨ Auditer avec l'IA"}
          </button>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onClose} style={{ padding: "10px 22px", background: "white", border: "1px solid #d1d5db", borderRadius: "8px", color: "#374151", cursor: "pointer", fontSize: "13px" }}>Annuler</button>
            {(!isReadOnly && !isAuditMode) && <button onClick={() => onSave(data)} style={{ padding: "10px 28px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "none", borderRadius: "8px", color: "white", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>Enregistrer</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
