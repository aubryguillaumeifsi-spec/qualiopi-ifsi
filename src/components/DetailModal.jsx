import { useState, useEffect, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, getBytes } from "firebase/storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from "../firebase";
import { CRITERES_LABELS, STATUT_CONFIG, TODAY, RESPONSABLES, GUIDE_QUALIOPI, ROLE_COLORS } from "../data";

function MultiSelect({ selected, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => { function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); } document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  function toggle(r) { onChange(selected.includes(r) ? selected.filter(x => x !== r) : [...selected, r]); }
  const display = selected.length === 0 ? "Aucun responsable assigné" : selected.length === 1 ? selected[0].split("(")[0].trim() : `${selected.length} responsables`;
  
  return (
    <div className="no-print" ref={ref} style={{ position: "relative" }}>
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
      const uploadTask = await uploadBytesResumable(fileRef, file);
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
    } catch (error) { 
      console.warn("Fichier introuvable sur le serveur, mais on le supprime de l'affichage.");
    }
    setData({ ...data, fichiers: data.fichiers.filter(f => f.url !== fileToDelete.url) });
  }

  async function handleAIAnalysis() {
    const actFile = data.fichiers.filter(f => !f.archive);
    if (actFile.length === 0) return alert("Veuillez d'abord joindre un document à analyser !");
    
    const fileToAnalyze = actFile[actFile.length - 1]; // On analyse le dernier ajouté
    
    // Détermination du format
    const ext = fileToAnalyze.name.split('.').pop().toLowerCase();
    let docMimeType = 'application/pdf';
    
    if (['jpg', 'jpeg'].includes(ext)) docMimeType = 'image/jpeg';
    else if (ext === 'png') docMimeType = 'image/png';
    else if (ext === 'webp') docMimeType = 'image/webp';
    else if (ext !== 'pdf') {
      setAiReport(`⚠️ Format non supporté pour "${fileToAnalyze.name}". L'IA Gemini intégrée peut lire les fichiers PDF et les Images (JPG, PNG, WEBP). Veuillez convertir votre document Word ou Excel en PDF avant de l'analyser.`);
      return;
    }

    setIsAnalyzing(true);
    // On affiche l'état d'avancement directement dans la boîte du rapport
    setAiReport("⏳ L'IA Gemini est en train de lire et d'analyser le document. Cela peut prendre quelques secondes...");
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Clé API Gemini introuvable dans Vercel.");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const fileRef = ref(storage, fileToAnalyze.path);
      const arrayBuffer = await getBytes(fileRef);

      const base64String = await new Promise((resolve, reject) => {
        const blob = new Blob([arrayBuffer], { type: docMimeType });
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const prompt = `Tu es un auditeur Qualiopi expert, exigeant mais constructif. Tu travailles pour un IFSI.
      Voici un document de preuve fourni pour valider l'indicateur Qualiopi n°${critere.num} ("${critere.titre}").
      
      Voici ce que dit le référentiel officiel pour cet indicateur :
      - Attendu : ${guide.niveau}
      - Preuves possibles : ${guide.preuves}
      - Règle de non-conformité : ${guide.nonConformite}

      Analyse ce document PDF attentivement.
      1. Ce document te semble-t-il pertinent et correspond-il aux attentes de cet indicateur précis ?
      2. Si oui, valide-le. Si non, que manque-t-il exactement pour qu'il soit conforme ?
      
      Fais un retour très structuré, court et précis, en utilisant des tirets. Ne dis pas bonjour, va droit au but.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64String, mimeType: docMimeType } }
      ]);

      setAiReport(result.response.text());

    } catch (error) {
      console.error("Erreur IA:", error);
      setAiReport(`❌ Erreur lors de l'analyse.\n\nDétail de l'erreur : ${error.message}\n\nAstuces :\n- Si l'erreur est "fetch failed", vérifiez que votre bloqueur de publicité ne bloque pas l'IA.\n- Si l'erreur mentionne "API_KEY", c'est que Vercel n'a pas appliqué la clé secrète.`);
    }
    setIsAnalyzing(false);
  }

  const actFile = data.fichiers.filter(f => !f.archive);
  const archFile = data.fichiers.filter(f => f.archive);
  
  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <style>{`@media print { .no-print { display: none !important; } .modal-overlay { position: absolute !important; top: 0 !important; left: 0 !important; background: white !important; align-items: flex-start !important; padding: 0 !important; } .modal-content { box-shadow: none !important; border: none !important; width: 100% !important; max-width: 100% !important; max-height: none !important; overflow: visible !important; padding: 0 !important; } .print-label { display: block !important; margin-bottom: 4px; font-weight: bold; font-size: 14px; color: #1e3a5f; } .print-value { display: block !important; margin-bottom: 16px; font-size: 13px; color: #374151; } .print-grid { display: block !important; } .print-col { margin-bottom: 24px !important; } }`}</style>
      <div className="modal-content" style={{ background: "white", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "1000px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #f1f5f9" }}>
          <span style={{ padding: "5px 12px", background: `${cfg.color}15`, color: cfg.color, borderRadius: "8px", fontSize: "14px", fontWeight: "800", textAlign: "center", border: `1px solid ${cfg.color}30`, whiteSpace: "nowrap" }}>{critere.num || "-"}</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: "18px", fontWeight: "800", color: "#1e3a5f", marginBottom: "3px" }}>{critere.titre || "-"}</div><div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>{cfg.label}</div></div>
          {isReadOnly && <span style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", marginRight: "10px" }}>🔒 ARCHIVE</span>}
          <button className="no-print" onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "22px", cursor: "pointer", lineHeight: 1 }}>x</button>
        </div>
        
        <div className="print-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "24px" }}>
          
          <div className="print-col" style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", borderBottom: "2px solid #e2e8f0", paddingBottom: "8px" }}><span style={{ fontSize: "18px" }}>📖</span><h3 style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a5f", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>Référentiel Officiel V9</h3></div>
            <div style={{ marginBottom: "16px" }}><div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Indicateur d'appréciation</div><div style={{ fontSize: "13px", color: "#1e3a5f", fontWeight: "600", fontStyle: "italic", lineHeight: "1.5" }}>"{guide.appreciation}"</div></div>
            <div style={{ marginBottom: "16px" }}><div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Niveau attendu</div><div style={{ fontSize: "13px", color: "#374151", lineHeight: "1.5" }}>{guide.niveau}</div></div>
            <div style={{ marginBottom: "16px" }}><div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Exemples de preuves</div><div style={{ fontSize: "12px", color: "#4b5563", lineHeight: "1.5", background: "white", padding: "10px", border: "1px dashed #d1d5db", borderRadius: "6px" }}>{guide.preuves}</div></div>
            {guide.obligations && (<div style={{ marginBottom: "16px" }}><div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Obligations spécifiques</div><div style={{ fontSize: "12px", color: "#0e7490", background: "#ecfeff", border: "1px solid #a5f3fc", padding: "8px 10px", borderRadius: "6px", lineHeight: "1.5" }}>{guide.obligations}</div></div>)}
            <div style={{ marginTop: "20px", background: "#fef2f2", border: "1px solid #fca5a5", borderLeft: "4px solid #ef4444", padding: "12px", borderRadius: "6px" }}><div style={{ fontSize: "11px", color: "#991b1b", fontWeight: "800", textTransform: "uppercase", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}><span>⚠️</span> Règle de non-conformité</div><div style={{ fontSize: "12px", color: "#7f1d1d", lineHeight: "1.4", fontWeight: "500" }}>{guide.nonConformite}</div></div>
          </div>

          <div className="print-col">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", borderBottom: "2px solid #e2e8f0", paddingBottom: "8px" }}><span style={{ fontSize: "18px" }}>✍️</span><h3 style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a5f", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>Notre Réponse IFPS</h3></div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={lbl}>Statut actuel</label>
                <select className="no-print" disabled={isReadOnly || isAuditMode} value={data.statut} onChange={e => setData({ ...data, statut: e.target.value })} style={{ ...inp, background: (STATUT_CONFIG[data.statut]||STATUT_CONFIG["non-evalue"]).bg, color: (STATUT_CONFIG[data.statut]||STATUT_CONFIG["non-evalue"]).color, fontWeight: "600", border: `1.5px solid ${(STATUT_CONFIG[data.statut]||STATUT_CONFIG["non-evalue"]).border}` }}>
                  {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Échéance visée</label>
                <input className="no-print" disabled={isReadOnly || isAuditMode} type="date" value={data.delai} min={TODAY} onChange={e => setData({ ...data, delai: e.target.value })} style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
              </div>
            </div>
            
            <div style={{ marginBottom: "16px" }}><label style={lbl}>Responsable(s) assigné(s)</label><MultiSelect disabled={isReadOnly || isAuditMode} selected={data.responsables} onChange={val => setData({ ...data, responsables: val })} /></div>
            
            <div style={{ marginBottom: "16px", background: "#f0fdf4", border: "1px solid #6ee7b7", borderRadius: "8px", padding: "12px" }}>
              <label style={{...lbl, color: "#065f46"}}>✅ Documents / Preuves Finalisées</label>
              
              {actFile.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: (isReadOnly || isAuditMode) ? "0" : "12px" }}>
                  {actFile.map(f => (
                    <div key={f.url} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", padding: "8px 12px", borderRadius: "6px", border: "1px solid #a7f3d0", fontSize: "13px" }}>
                      <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#059669", fontWeight: "600", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📄 {f.name}</a>
                      {(!isReadOnly && !isAuditMode) && <button className="no-print" onClick={() => handleDeleteFile(f)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px", opacity: 0.7 }}>🗑️</button>}
                    </div>
                  ))}
                </div>
              )}
              
              {(!isReadOnly && !isAuditMode) && (
                <div style={{ position: "relative", marginTop: actFile.length > 0 ? "10px" : "0" }}>
                  {/* MODIFICATION ICI : On accepte aussi les images pour l'upload */}
                  <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" id={`file-${critere.id}`} style={{ display: "none" }} onChange={handleFileUpload} disabled={uploading} />
                  <label htmlFor={`file-${critere.id}`} style={{ display: "inline-block", background: "white", border: "1px dashed #059669", color: "#059669", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: uploading ? "wait" : "pointer", opacity: uploading ? 0.6 : 1 }}>
                    {uploading ? "⏳ Envoi en cours..." : "📎 Joindre un document (PDF ou Image)..."}
                  </label>
                </div>
              )}

              {archFile.length > 0 && (
                <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px dashed #a7f3d0" }}>
                  <div style={{ fontSize: "11px", color: "#b45309", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase" }}>⚠️ Documents du précédent Audit (À vérifier)</div>
                  {archFile.map(f => (
                    <div key={f.url} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fffbeb", padding: "6px 10px", borderRadius: "6px", border: "1px solid #fde68a", fontSize: "12px", marginBottom: "6px" }}>
                      <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#b45309", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}>📄 {f.name}</a>
                      {(!isReadOnly && !isAuditMode) && <div style={{display: "flex", gap: "10px"}}>
                        <button className="no-print" onClick={() => setData({...data, fichiers: data.fichiers.map(fi => fi.url === f.url ? {...fi, archive: false} : fi)})} style={{ background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46", cursor: "pointer", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>✓ Valider pour cet audit</button>
                        <button className="no-print" onClick={() => handleDeleteFile(f)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "12px" }}>🗑️</button>
                      </div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LE BLOC IA (Rapport ou Erreur s'affiche ici) */}
            {aiReport && (
              <div className="no-print" style={{ marginBottom: "16px", background: "#faf5ff", border: "1px solid #d8b4fe", borderRadius: "8px", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "18px" }}>✨</span>
                  <h4 style={{ margin: 0, color: "#6b21a8", fontSize: "14px", fontWeight: "800" }}>Rapport du Pré-Auditeur IA</h4>
                </div>
                <div style={{ fontSize: "13px", color: "#4c1d95", lineHeight: "1.6", whiteSpace: "pre-wrap", fontFamily: "sans-serif" }}>
                  {aiReport}
                </div>
                {!isAnalyzing && (
                  <button onClick={() => setAiReport("")} style={{ marginTop: "12px", background: "none", border: "none", color: "#9333ea", cursor: "pointer", fontSize: "11px", fontWeight: "700", textDecoration: "underline", padding: 0 }}>Masquer ce rapport</button>
                )}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label style={lbl}>{isAuditMode ? "Liens externes (Sharepoint, Sites)" : "✅ Liens Sharepoint / Remarques de validation"}</label>
              <textarea className="no-print" readOnly={isReadOnly || isAuditMode} value={data.preuves || ""} onChange={e => setData({ ...data, preuves: e.target.value })} rows={2} placeholder="Ex: Livret d'accueil p.12, Lien web..." style={{ ...inp, width: "100%", boxSizing: "border-box", resize: "vertical", borderColor: (isReadOnly || isAuditMode) ? "#d1d5db" : "#6ee7b7", background: (isReadOnly || isAuditMode) ? "#f9fafb" : "#f0fdf4" }} />
            </div>

            {!isAuditMode && (
              <>
                <div style={{ marginBottom: "16px" }}><label style={lbl}>⏳ Actions / Preuves EN COURS d'élaboration</label><textarea className="no-print" readOnly={isReadOnly} value={data.preuves_encours || ""} onChange={e => setData({ ...data, preuves_encours: e.target.value })} rows={3} placeholder="Ex: Trame en cours de rédaction..." style={{ ...inp, width: "100%", boxSizing: "border-box", resize: "vertical", borderColor: isReadOnly ? "#d1d5db" : "#fcd34d", background: isReadOnly ? "#f9fafb" : "#fffbeb" }} /></div>
                <div style={{ marginBottom: "16px" }}><label style={lbl}>Commentaires / Attendus de l'évaluateur</label><textarea className="no-print" readOnly={isReadOnly} value={data.attendus || ""} onChange={e => setData({ ...data, attendus: e.target.value })} rows={2} placeholder="Ex: Demande de préciser la date..." style={{ ...inp, width: "100%", boxSizing: "border-box", resize: "vertical", background: isReadOnly ? "#f9fafb" : "#f8fafc" }} /></div>
                <div style={{ marginBottom: "28px" }}><label style={lbl}>Notes internes IFPS</label><textarea className="no-print" readOnly={isReadOnly} value={data.notes || ""} onChange={e => setData({ ...data, notes: e.target.value })} rows={2} style={{ ...inp, width: "100%", boxSizing: "border-box", resize: "vertical" }} /></div>
              </>
            )}
          </div>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
          
          <div style={{ display: "flex", gap: "10px" }}>
            {(!isReadOnly && !isAuditMode && actFile.length > 0) ? (
              <button className="no-print" onClick={handleAIAnalysis} disabled={isAnalyzing} style={{ padding: "8px 16px", background: "linear-gradient(135deg, #a855f7, #6366f1)", border: "none", borderRadius: "8px", color: "white", cursor: isAnalyzing ? "wait" : "pointer", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", opacity: isAnalyzing ? 0.7 : 1 }}>
                <span>✨</span> {isAnalyzing ? "L'IA lit votre document..." : "Auditer la preuve avec l'IA"}
              </button>
            ) : <div />}
          </div>

          <div className="no-print" style={{ display: "flex", gap: "10px" }}>
            <button onClick={onClose} style={{ padding: "10px 22px", background: "white", border: "1px solid #d1d5db", borderRadius: "8px", color: "#374151", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>{(isReadOnly || isAuditMode) ? "Fermer" : "Annuler"}</button>
            {(!isReadOnly && !isAuditMode) && <button onClick={() => onSave(data)} style={{ padding: "10px 28px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "none", borderRadius: "8px", color: "white", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>Enregistrer</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
