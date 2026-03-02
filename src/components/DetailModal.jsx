import { useState, useEffect, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, getBytes } from "firebase/storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from "../firebase";
import { CRITERES_LABELS, STATUT_CONFIG, RESPONSABLES, GUIDE_QUALIOPI, ROLE_COLORS } from "../data";

function MultiSelect({ selected, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();
  
  useEffect(() => { 
    function h(e) { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false); } 
    document.addEventListener("mousedown", h); 
    return () => document.removeEventListener("mousedown", h); 
  }, []);
  
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
    preuves: critere.preuves || "", 
    preuves_encours: critere.preuves_encours || "", 
    attendus: critere.attendus || "", 
    notes: critere.notes || "" 
  });
  
  const [uploading, setUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState("");
  
  const cfg = CRITERES_LABELS[critere.critere] || { color: "#9ca3af" };
  const guide = GUIDE_QUALIOPI[critere.id];
  const lbl = { display: "block", fontSize: "11px", color: "#6b7280", textTransform: "uppercase", fontWeight: "700", marginBottom: "5px" };
  const inp = { background: (isReadOnly || isAuditMode) ? "#f9fafb" : "white", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px", fontSize: "13px", width: "100%", outline: "none", boxSizing: "border-box" };

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileRef = ref(storage, `preuves/${critere.id}_${Date.now()}_${file.name}`);
      await uploadBytesResumable(fileRef, file);
      const url = await getDownloadURL(fileRef);
      // Fichier non validé par défaut -> va dans le Chantier
      const newFile = { name: file.name, url: url, path: fileRef.fullPath, validated: false };
      setData({ ...data, fichiers: [...data.fichiers, newFile] });
    } catch (error) { 
      alert("Erreur d'envoi : " + error.message); 
    }
    setUploading(false);
  }

  const toggleValidation = (fileUrl) => {
    setData({
      ...data,
      fichiers: data.fichiers.map(f => f.url === fileUrl ? { ...f, validated: !f.validated } : f)
    });
  };

  async function handleDeleteFile(fileToDelete) {
    if (!window.confirm(`Supprimer définitivement "${fileToDelete.name}" ?`)) return;
    try { 
      if (fileToDelete.path) await deleteObject(ref(storage, fileToDelete.path)); 
    } catch (e) {
      console.warn("Fichier introuvable sur le serveur, mais on le supprime de l'affichage.");
    }
    setData({ ...data, fichiers: data.fichiers.filter(f => f.url !== fileToDelete.url) });
  }

  async function handleAIAnalysis() {
    const chantierFiles = data.fichiers.filter(f => !f.validated);
    if (chantierFiles.length === 0) return alert("Aucun document dans la zone chantier !");
    
    setIsAnalyzing(true);
    setAiReport(`⏳ Lecture et analyse détaillée de ${chantierFiles.length} document(s) par l'IA...`);
    
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Le prompt structuré pour forcer l'analyse individuelle puis globale
      const promptText = `Tu es un auditeur Qualiopi expert pour un IFSI. 
      Je te fournis ${chantierFiles.length} document(s) de preuve pour l'Indicateur ${critere.num} ("${critere.titre}").
      
      Référentiel :
      - Attendu : ${guide.niveau}
      - Preuves suggérées : ${guide.preuves}
      
      Je souhaite que tu analyses chaque document individuellement, puis que tu fasses un bilan global.
      Réponds EXACTEMENT selon cette structure :

      ### ANALYSE INDIVIDUELLE
      (Pour chaque document, cite son numéro et son nom)
      - PERTINENCE : (Ce document est-il pertinent ?)
      - APPORT : (Que prouve-t-il concrètement ?)
      - LIMITES : (Que manque-t-il à ce document précis ?)

      ### BILAN GLOBAL DE L'INDICATEUR
      - VERDICT : (La somme de ces preuves permet-elle de valider totalement le critère ?)
      - RECOMMANDATION : (Que manque-t-il au global pour être 100% conforme ?)
      
      Sois direct, très professionnel, et utilise des tirets pour faciliter la lecture.`;

      const contentsArray = [promptText];

      for (let i = 0; i < chantierFiles.length; i++) {
        const file = chantierFiles[i];
        const ext = file.name.split('.').pop().toLowerCase();
        
        let mime = '';
        if (ext === 'pdf') mime = 'application/pdf';
        else if (['jpg', 'jpeg'].includes(ext)) mime = 'image/jpeg';
        else if (ext === 'png') mime = 'image/png';
        else if (ext === 'webp') mime = 'image/webp';
        
        if (!mime) {
          console.warn(`Format ignoré par l'IA : ${file.name}`);
          continue; 
        }

        const fileRef = ref(storage, file.path);
        const arrayBuffer = await getBytes(fileRef);
        
        // Conversion robuste en Base64
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = '';
        const len = uint8Array.byteLength;
        for (let j = 0; j < len; j++) {
          binary += String.fromCharCode(uint8Array[j]);
        }
        const base64 = btoa(binary);

        contentsArray.push(`\n--- Document ${i + 1} : ${file.name} ---`);
        contentsArray.push({ inlineData: { data: base64, mimeType: mime } });
      }

      const result = await model.generateContent(contentsArray);
      const response = await result.response;
      setAiReport(response.text());

    } catch (e) {
      console.error("Erreur IA:", e);
      setAiReport(`❌ Erreur technique : ${e.message}\nVérifiez que votre clé API est valide.`);
    }
    setIsAnalyzing(false);
  }

  const chantierFiles = data.fichiers.filter(f => !f.validated);
  const validatedFiles = data.fichiers.filter(f => f.validated);

  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "white", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "1100px", maxHeight: "95vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }} onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
             <span style={{ padding: "6px 14px", background: `${cfg.color}15`, color: cfg.color, borderRadius: "8px", fontSize: "16px", fontWeight: "900", border: `1px solid ${cfg.color}30` }}>{critere.num || "-"}</span>
             <div>
               <h2 style={{ margin: 0, fontSize: "18px", color: "#1e3a5f", fontWeight: "800" }}>{critere.titre}</h2>
               <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>{cfg.label}</span>
             </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "#f1f5f9", color: "#64748b", fontSize: "20px", cursor: "pointer", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "24px" }}>
          
          {/* COLONNE GAUCHE : RÉFÉRENTIEL */}
          <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", fontSize: "13px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ ...lbl, color: "#1e3a5f", fontSize: "13px", borderBottom: "2px solid #e2e8f0", paddingBottom: "8px", marginBottom: "12px" }}>📘 Référentiel Officiel</h3>
            <p style={{ marginBottom: "12px" }}><strong style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Niveau attendu :</strong> <span style={{ color: "#1e3a5f", lineHeight: "1.5" }}>{guide.niveau}</span></p>
            <p style={{ marginBottom: "12px" }}><strong style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Preuves suggérées :</strong> <span style={{ color: "#475569", lineHeight: "1.5" }}>{guide.preuves}</span></p>
            
            {/* On cache la règle de non-conformité à l'auditeur */}
            {!isAuditMode && (
               <div style={{ background: "#fef2f2", padding: "12px", borderRadius: "8px", color: "#991b1b", marginTop: "16px", border: "1px solid #fca5a5", borderLeft: "4px solid #ef4444" }}>
                 <strong style={{ display: "block", marginBottom: "4px" }}>⚠️ Règle de non-conformité :</strong> 
                 <span style={{ fontSize: "12px", lineHeight: "1.4" }}>{guide.nonConformite}</span>
               </div>
            )}
          </div>

          {/* COLONNE DROITE : FORMULAIRE */}
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
              <div>
                <label style={lbl}>Statut</label>
                <select disabled={isAuditMode || isReadOnly} value={data.statut} onChange={e => setData({...data, statut: e.target.value})} style={{ ...inp, background: (STATUT_CONFIG[data.statut]||STATUT_CONFIG["non-evalue"]).bg, color: (STATUT_CONFIG[data.statut]||STATUT_CONFIG["non-evalue"]).color, fontWeight: "700", border: `1px solid ${(STATUT_CONFIG[data.statut]||STATUT_CONFIG["non-evalue"]).border}` }}>
                  {Object.entries(STATUT_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Responsable(s)</label>
                <MultiSelect disabled={isAuditMode || isReadOnly} selected={data.responsables} onChange={v => setData({...data, responsables: v})} />
              </div>
            </div>

            {/* ========================================== */}
            {/* ZONE 1 : COFFRE-FORT (OFFICIEL / AUDIT)    */}
            {/* ========================================== */}
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", padding: "20px", borderRadius: "12px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <label style={{ ...lbl, color: "#166534", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>🏛️ Preuves Validées (Présentées à l'Audit)</label>
              
              {/* Fichiers Validés */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: (data.preuves || !isAuditMode) ? "16px" : "0" }}>
                {validatedFiles.length === 0 && <span style={{ fontSize: "12px", color: "#059669", fontStyle: "italic" }}>Aucun fichier validé pour l'instant.</span>}
                {validatedFiles.map(f => (
                  <div key={f.url} style={{ background: "white", padding: "6px 12px", borderRadius: "8px", border: "1px solid #6ee7b7", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                    <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#059669", textDecoration: "none", fontWeight: "700" }}>📄 {f.name}</a>
                    {(!isAuditMode && !isReadOnly) && (
                      <button onClick={() => toggleValidation(f.url)} title="Repasser en chantier" style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", cursor: "pointer", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>Retirer</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Texte de preuve (pour les justifications sans fichiers) */}
              {(data.preuves || (!isAuditMode && !isReadOnly)) && (
                <div style={{ marginTop: validatedFiles.length > 0 ? "10px" : "0" }}>
                  <label style={{ fontSize: "11px", color: "#059669", fontWeight: "700", marginBottom: "6px", display: "block" }}>Justifications textuelles / Liens Sharepoint :</label>
                  <textarea 
                    readOnly={isAuditMode || isReadOnly} 
                    value={data.preuves} 
                    onChange={e => setData({...data, preuves: e.target.value})} 
                    placeholder="Inscrire ici les preuves textuelles (ex: validé en CSE le...), ou coller un lien vers l'intranet..." 
                    style={{ ...inp, height: "70px", resize: "vertical", background: (isAuditMode || isReadOnly) ? "transparent" : "white", border: (isAuditMode || isReadOnly) ? "none" : "1px solid #6ee7b7", padding: (isAuditMode || isReadOnly) ? "0" : "12px", color: "#166534" }} 
                  />
                </div>
              )}
            </div>

            {/* ========================================== */}
            {/* ZONES MASQUÉES POUR L'AUDITEUR             */}
            {/* ========================================== */}
            {!isAuditMode && (
              <>
                {/* ZONE CHANTIER & IA */}
                <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", padding: "20px", borderRadius: "12px", marginBottom: "20px" }}>
                  <label style={{ ...lbl, color: "#b45309", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>🚧 Zone de Chantier & Préparation</label>
                  
                  <textarea 
                    readOnly={isReadOnly}
                    value={data.preuves_encours} 
                    onChange={e => setData({...data, preuves_encours: e.target.value})} 
                    placeholder="Travail en cours, documents manquants..." 
                    style={{ ...inp, height: "60px", marginBottom: "16px", borderColor: "#fde68a", resize: "vertical" }} 
                  />
                  
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: chantierFiles.length > 0 ? "16px" : "0" }}>
                    {chantierFiles.map(f => (
                      <div key={f.url} style={{ background: "white", padding: "6px 12px", borderRadius: "8px", border: "1px solid #fcd34d", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ color: "#92400e", fontWeight: "600" }}>{f.name}</span>
                        {!isReadOnly && (
                          <>
                            <button onClick={() => toggleValidation(f.url)} style={{ background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46", cursor: "pointer", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold", fontSize: "11px" }}>Valider ✅</button>
                            <button onClick={() => handleDeleteFile(f)} style={{ color: "#ef4444", border: "none", background: "none", cursor: "pointer", fontSize: "14px" }} title="Supprimer">🗑️</button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {!isReadOnly && (
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" id="file-chantier" style={{ display: "none" }} onChange={handleFileUpload} disabled={uploading} />
                      <label htmlFor="file-chantier" style={{ background: "white", border: "1px dashed #d97706", color: "#d97706", padding: "8px 16px", borderRadius: "8px", cursor: uploading ? "wait" : "pointer", fontSize: "12px", fontWeight: "700", opacity: uploading ? 0.6 : 1 }}>
                        {uploading ? "⏳ Upload..." : "📎 Importer un PDF ou une Image"}
                      </label>
                      
                      {chantierFiles.length > 0 && (
                        <button onClick={handleAIAnalysis} disabled={isAnalyzing} style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "white", border: "none", padding: "9px 16px", borderRadius: "8px", cursor: isAnalyzing ? "wait" : "pointer", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", opacity: isAnalyzing ? 0.7 : 1 }}>
                          ✨ {isAnalyzing ? "Analyse en cours..." : "Auditer tout le chantier avec l'IA"}
                        </button>
                      )}
                    </div>
                  )}

                  {aiReport && (
                    <div style={{ marginTop: "16px", background: "white", padding: "16px", borderRadius: "8px", fontSize: "13px", border: "1px solid #d8b4fe", color: "#4c1d95", lineHeight: "1.6" }}>
                      <h4 style={{ margin: "0 0 8px 0", color: "#6b21a8", fontSize: "14px" }}>Rapport IA Global</h4>
                      <div style={{ whiteSpace: "pre-wrap" }}>{aiReport}</div>
                    </div>
                  )}
                </div>

                {/* ZONE HISTORIQUE / REMARQUES ÉVALUATEUR */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "20px", borderRadius: "12px", marginBottom: "20px" }}>
                  <label style={lbl}>📝 Remarques de l'évaluateur (Historique)</label>
                  <textarea 
                    readOnly={isReadOnly}
                    value={data.attendus} 
                    onChange={e => setData({...data, attendus: e.target.value})} 
                    placeholder="Retours des précédents audits (Non-conformités mineures, points d'attention...)" 
                    style={{ ...inp, height: "60px", resize: "vertical" }} 
                  />
                </div>

                {/* ZONE NOTES PERSONNELLES (IFPS) */}
                <div style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "20px", borderRadius: "12px" }}>
                  <label style={lbl}>🕵️ Notes internes IFPS (Privé)</label>
                  <textarea 
                    readOnly={isReadOnly}
                    value={data.notes} 
                    onChange={e => setData({...data, notes: e.target.value})} 
                    placeholder="Rappels logistiques, idées d'amélioration, brouillon..." 
                    style={{ ...inp, height: "60px", borderStyle: "dashed", resize: "vertical" }} 
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #e2e8f0" }}>
          <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", color: "#475569", cursor: "pointer", fontWeight: "600" }}>
            {(isReadOnly || isAuditMode) ? "Fermer" : "Annuler"}
          </button>
          {(!isAuditMode && !isReadOnly) && (
            <button onClick={() => onSave(data)} style={{ padding: "10px 32px", borderRadius: "8px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white", border: "none", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 12px rgba(29, 78, 216, 0.2)" }}>
              Enregistrer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
