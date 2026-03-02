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
  const display = selected.length === 0 ? "Aucun responsable" : selected.length === 1 ? selected[0].split("(")[0].trim() : `${selected.length} responsables`;
  return (
    <div className="no-print" ref={dropdownRef} style={{ position: "relative" }}>
      <button onClick={() => !disabled && setOpen(!open)} style={{ width: "100%", background: disabled ? "#f9fafb" : "white", border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px 12px", textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", fontSize: "13px" }}><span>{display}</span></button>
      {open && !disabled && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #d1d5db", borderRadius: "10px", zIndex: 300, maxHeight: "200px", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          {RESPONSABLES.map(r => (
            <label key={r} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", cursor: "pointer" }}>
              <input type="checkbox" checked={selected.includes(r)} onChange={() => toggle(r)} />
              <span style={{ fontSize: "13px" }}>{r.split("(")[0].trim()}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DetailModal({ critere, onClose, onSave, isReadOnly, isAuditMode }) {
  const [data, setData] = useState({ 
    ...critere, 
    responsables: [...(critere.responsables || [])], 
    fichiers: [...(critere.fichiers || [])],
    preuves: critere.preuves || "", // Zone Coffre-fort (Texte)
    preuves_encours: critere.preuves_encours || "", // Zone Chantier (Texte)
    attendus: critere.attendus || "",
    notes: critere.notes || ""
  });
  const [uploading, setUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState("");
  
  const cfg = CRITERES_LABELS[critere.critere] || { color: "#9ca3af" };
  const guide = GUIDE_QUALIOPI[critere.id];
  const lbl = { display: "block", fontSize: "11px", color: "#6b7280", textTransform: "uppercase", fontWeight: "700", marginBottom: "5px" };
  const inp = { background: (isReadOnly || isAuditMode) ? "#f9fafb" : "white", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px", fontSize: "13px", width: "100%", outline: "none" };

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileRef = ref(storage, `preuves/${critere.id}_${Date.now()}_${file.name}`);
      await uploadBytesResumable(fileRef, file);
      const url = await getDownloadURL(fileRef);
      const newFile = { name: file.name, url: url, path: fileRef.fullPath, validated: false };
      setData({ ...data, fichiers: [...data.fichiers, newFile] });
    } catch (error) { alert("Erreur : " + error.message); }
    setUploading(false);
  }

  const toggleValidation = (fileUrl) => {
    setData({
      ...data,
      fichiers: data.fichiers.map(f => f.url === fileUrl ? { ...f, validated: !f.validated } : f)
    });
  };

  async function handleDeleteFile(fileToDelete) {
    if (!window.confirm(`Supprimer "${fileToDelete.name}" ?`)) return;
    try { if (fileToDelete.path) await deleteObject(ref(storage, fileToDelete.path)); } catch (e) {}
    setData({ ...data, fichiers: data.fichiers.filter(f => f.url !== fileToDelete.url) });
  }

  async function handleAIAnalysis() {
    const chantierFiles = data.fichiers.filter(f => !f.validated);
    if (chantierFiles.length === 0) return alert("Aucun document dans la zone chantier !");
    const file = chantierFiles[chantierFiles.length - 1];
    const ext = file.name.split('.').pop().toLowerCase();
    let mime = (ext === 'pdf') ? 'application/pdf' : (['jpg','jpeg','png','webp'].includes(ext)) ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : null;
    if (!mime) return alert(`Format ${ext.toUpperCase()} non supporté.`);
    setIsAnalyzing(true);
    setAiReport("⏳ Analyse IA en cours...");
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
      const arrayBuffer = await getBytes(ref(storage, file.path));
      const base64 = btoa(new Uint8Array(arrayBuffer).reduce((d, b) => d + String.fromCharCode(b), ''));
      const prompt = `Auditeur Qualiopi. Analyse l'indicateur ${critere.num}. Attendu: ${guide.niveau}. Preuves: ${guide.preuves}.`;
      const result = await model.generateContent([prompt, { inlineData: { data: base64, mimeType: mime } }]);
      setAiReport(result.response.text());
    } catch (e) { setAiReport("❌ Erreur: " + e.message); }
    setIsAnalyzing(false);
  }

  const chantierFiles = data.fichiers.filter(f => !f.validated);
  const validatedFiles = data.fichiers.filter(f => f.validated);

  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "white", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "1100px", maxHeight: "95vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
          <div><h2 style={{ margin: 0, fontSize: "18px", color: cfg.color }}>{critere.num} : {critere.titre}</h2></div>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "24px" }}>
          <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "12px", fontSize: "13px" }}>
            <h3 style={{ ...lbl, color: "#1e3a5f" }}>📘 Référentiel</h3>
            <p><strong>Attendu :</strong> {guide.niveau}</p>
            <p><strong>Preuves :</strong> {guide.preuves}</p>
            {!isAuditMode && (
               <div style={{ background: "#fee2e2", padding: "10px", borderRadius: "6px", color: "#991b1b", marginTop: "10px" }}>
                 <strong>⚠️ Non-conformité :</strong> {guide.nonConformite}
               </div>
            )}
          </div>

          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
              <div><label style={lbl}>Statut</label><select disabled={isAuditMode} value={data.statut} onChange={e => setData({...data, statut: e.target.value})} style={inp}>{Object.entries(STATUT_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              <div><label style={lbl}>Responsables</label><MultiSelect disabled={isAuditMode} selected={data.responsables} onChange={v => setData({...data, responsables: v})} /></div>
            </div>

            {/* --- ZONE 1 : COFFRE-FORT (OFFICIEL) --- */}
            <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", padding: "15px", borderRadius: "12px", marginBottom: "15px" }}>
              <label style={{ ...lbl, color: "#166534" }}>🏛️ Preuves Validées (Zone Audit)</label>
              
              {/* Fichiers Validés */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: data.preuves ? "10px" : "0" }}>
                {validatedFiles.map(f => (
                  <div key={f.url} style={{ background: "white", padding: "5px 10px", borderRadius: "6px", border: "1px solid #86efac", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#166534", textDecoration: "none", fontWeight: "bold" }}>📄 {f.name}</a>
                    {!isAuditMode && <button onClick={() => toggleValidation(f.url)} style={{ background: "#fee2e2", border: "none", color: "#991b1b", cursor: "pointer", padding: "2px 5px", borderRadius: "4px" }}>Annuler</button>}
                  </div>
                ))}
              </div>

              {/* Texte de preuve (pour les preuves sans fichiers) */}
              {(data.preuves || !isAuditMode) && (
                <textarea 
                  readOnly={isAuditMode} 
                  value={data.preuves} 
                  onChange={e => setData({...data, preuves: e.target.value})} 
                  placeholder="Inscrire ici les preuves textuelles ou liens web validés..." 
                  style={{ ...inp, height: "60px", background: isAuditMode ? "transparent" : "white", border: isAuditMode ? "none" : "1px solid #86efac", padding: isAuditMode ? "0" : "10px" }} 
                />
              )}
            </div>

            {/* --- ZONE 2 : CHANTIER & NOTES (MASQUÉ EN MODE AUDIT) --- */}
            {!isAuditMode && (
              <>
                <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", padding: "15px", borderRadius: "12px", marginBottom: "15px" }}>
                  <label style={{ ...lbl, color: "#92400e" }}>🚧 Chantier (En cours / IA)</label>
                  <textarea value={data.preuves_encours} onChange={e => setData({...data, preuves_encours: e.target.value})} placeholder="Notes de chantier..." style={{ ...inp, height: "50px", marginBottom: "10px" }} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                    {chantierFiles.map(f => (
                      <div key={f.url} style={{ background: "white", padding: "5px 10px", borderRadius: "6px", border: "1px solid #fcd34d", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>{f.name}</span>
                        <button onClick={() => toggleValidation(f.url)} style={{ background: "#d1fae5", border: "none", color: "#065f46", cursor: "pointer", padding: "2px 5px", borderRadius: "4px" }}>Valider ✅</button>
                        <button onClick={() => handleDeleteFile(f)} style={{ color: "red", border: "none", background: "none", cursor: "pointer" }}>🗑️</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input type="file" id="file-chantier" style={{ display: "none" }} onChange={handleFileUpload} />
                    <label htmlFor="file-chantier" style={{ background: "white", border: "1px dashed #d97706", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>📎 Ajouter</label>
                    {chantierFiles.length > 0 && <button onClick={handleAIAnalysis} disabled={isAnalyzing} style={{ background: "#7c3aed", color: "white", border: "none", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>✨ IA</button>}
                  </div>
                  {aiReport && <div style={{ marginTop: "10px", background: "white", padding: "10px", borderRadius: "8px", fontSize: "12px", border: "1px solid #d8b4fe", whiteSpace: "pre-wrap" }}>{aiReport}</div>}
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "15px", borderRadius: "12px", marginBottom: "15px" }}>
                  <label style={lbl}>📝 Historique / Remarques de l'évaluateur</label>
                  <textarea value={data.attendus} onChange={e => setData({...data, attendus: e.target.value})} placeholder="Retours des précédents audits..." style={{ ...inp, height: "50px" }} />
                </div>

                <div style={{ background: "#f9fafb", border: "1px solid #d1d5db", padding: "15px", borderRadius: "12px" }}>
                  <label style={lbl}>🕵️ Notes personnelles (Privé)</label>
                  <textarea value={data.notes} onChange={e => setData({...data, notes: e.target.value})} placeholder="Rappels internes..." style={{ ...inp, height: "40px", borderStyle: "dashed" }} />
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
          <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: "8px", border: "1px solid #ccc", cursor: "pointer" }}>Fermer</button>
          {!isAuditMode && <button onClick={() => onSave(data)} style={{ padding: "8px 30px", borderRadius: "8px", background: "#1d4ed8", color: "white", border: "none", fontWeight: "bold", cursor: "pointer" }}>Enregistrer</button>}
        </div>
      </div>
    </div>
  );
}
