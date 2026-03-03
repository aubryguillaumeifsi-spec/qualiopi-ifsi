import { useState, useRef, useEffect } from "react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage, auth } from "../firebase";
import { CRITERES_LABELS, STATUT_CONFIG, GUIDE_QUALIOPI } from "../data";

function OrganigramSelect({ selected, onChange, disabled, allMembers, rolePalette, orgRoles }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();
  
  useEffect(() => { 
    function h(e) { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false); } 
    document.addEventListener("mousedown", h); 
    return () => document.removeEventListener("mousedown", h); 
  }, []);
  
  function toggle(name) { 
    onChange(selected.includes(name) ? selected.filter(x => x !== name) : [...selected, name]); 
  }
  
  const display = selected.length === 0 ? "Personne n'est affecté" : selected.length === 1 ? selected[0] : `${selected.length} personnes sélectionnées`;

  function getRoleColor(roleName) {
    if (roleName === "Direction") return { bg: "#1e3a5f", border: "#0f172a", text: "#ffffff" };
    const index = orgRoles.filter(r => r !== "Direction").indexOf(roleName);
    if (index === -1) return rolePalette[7];
    return rolePalette[index % rolePalette.length];
  }

  return (
    <div className="no-print" ref={dropdownRef} style={{ position: "relative" }}>
      <button type="button" onClick={() => !disabled && setOpen(!open)} style={{ width: "100%", background: disabled ? "#f9fafb" : "white", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px", textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", fontSize: "13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{display}</span>
        {!disabled && <span style={{ fontSize: "10px", color: "#9ca3af" }}>▼</span>}
      </button>
      
      {open && !disabled && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #d1d5db", borderRadius: "10px", marginTop: "4px", zIndex: 300, maxHeight: "250px", overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
          {allMembers.length === 0 && <div style={{ padding: "12px", fontSize: "12px", color: "#9ca3af", fontStyle: "italic", textAlign: "center" }}>L'organigramme est vide.</div>}
          
          {allMembers.map(m => (
            <label key={m.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #f8fafc" }}>
              <input type="checkbox" checked={selected.includes(m.name)} onChange={() => toggle(m.name)} style={{ width: "16px", height: "16px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e3a5f" }}>{m.name}</div>
                <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                  {m.roles.length === 0 && <span style={{ fontSize: "9px", color: "#9ca3af" }}>Sans rôle</span>}
                  {m.roles.map(r => {
                     const col = getRoleColor(r);
                     return <span key={r} style={{ fontSize: "9px", background: col.bg, color: col.text, border: `1px solid ${col.border}`, padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>{r}</span>
                  })}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DetailModal({ critere, onClose, onSave, onAutoSave, isReadOnly, isAuditMode, allMembers, rolePalette, orgRoles, hasNext, hasPrev }) {
  
  const rawChemins = Array.isArray(critere.chemins_reseau) ? critere.chemins_reseau : (critere.chemin_reseau ? [critere.chemin_reseau] : []);
  const initialChemins = rawChemins.map(c => {
    if (typeof c === 'string') return { nom: c.split('\\').pop() || "Document", chemin: c, validated: true };
    return { ...c, validated: c.validated !== false };
  });

  const [data, setData] = useState({});
  // 👉 NOUVEAU : GESTION DES ONGLETS INTERNES
  const [activeSubTab, setActiveSubTab] = useState("validation");
  
  useEffect(() => {
    setData({ 
      ...critere, 
      responsables: [...(critere.responsables || [])], 
      fichiers: [...(critere.fichiers || [])],
      preuves: critere.preuves || "", 
      chemins_reseau: initialChemins, 
      preuves_encours: critere.preuves_encours || "", 
      attendus: critere.attendus || "", 
      notes: critere.notes || "",
      historique: critere.historique || [] 
    });
  }, [critere]);
  
  const [uploading, setUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState("");
  const [newCheminNom, setNewCheminNom] = useState("");
  const [newCheminVal, setNewCheminVal] = useState("");
  
  const cfg = CRITERES_LABELS[critere.critere] || { color: "#9ca3af" };
  const guide = GUIDE_QUALIOPI[critere.id];
  const lbl = { display: "block", fontSize: "11px", color: "#6b7280", textTransform: "uppercase", fontWeight: "700", marginBottom: "6px" };
  const inp = { background: (isReadOnly || isAuditMode) ? "#f9fafb" : "white", border: "1px solid #d1d5db", borderRadius: "8px", padding: "12px", fontSize: "13px", width: "100%", outline: "none", boxSizing: "border-box", fontFamily: "Outfit, sans-serif" };

  const triggerAutoSave = (updatedData, logMsg) => {
    const now = new Date().toISOString();
    const userEmail = auth?.currentUser?.email || "Utilisateur";
    const newLog = { date: now, user: userEmail, msg: logMsg };
    const finalData = { ...updatedData, historique: [...(updatedData.historique || []), newLog] };
    setData(finalData); 
    if (onAutoSave) onAutoSave(finalData); 
  };

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileRef = ref(storage, `preuves/${critere.id}_${Date.now()}_${file.name}`);
      await uploadBytesResumable(fileRef, file);
      const url = await getDownloadURL(fileRef);
      const newFile = { name: file.name, url: url, path: fileRef.fullPath, validated: false };
      triggerAutoSave({ ...data, fichiers: [...data.fichiers, newFile] }, `📎 A importé le fichier : ${file.name}`);
    } catch (error) { alert("Erreur d'envoi : " + error.message); }
    setUploading(false);
  }

  const toggleValidation = (fileUrl) => {
    const fileToToggle = data.fichiers.find(f => f.url === fileUrl);
    const newFichiers = data.fichiers.map(f => f.url === fileUrl ? { ...f, validated: !f.validated } : f);
    const logMsg = !fileToToggle.validated ? `✅ A validé le document comme preuve : ${fileToToggle.name}` : `❌ A repassé en chantier le document : ${fileToToggle.name}`;
    triggerAutoSave({ ...data, fichiers: newFichiers }, logMsg);
  };

  async function handleDeleteFile(fileToDelete) {
    if (!window.confirm(`Supprimer définitivement "${fileToDelete.name}" ?`)) return;
    try { if (fileToDelete.path) await deleteObject(ref(storage, fileToDelete.path)); } catch (e) { console.warn("Introuvable"); }
    triggerAutoSave({ ...data, fichiers: data.fichiers.filter(f => f.url !== fileToDelete.url) }, `🗑️ A supprimé le fichier : ${fileToDelete.name}`);
  }

  const addChemin = () => {
    if (newCheminVal.trim() !== "") {
      const nomFinal = newCheminNom.trim() || newCheminVal.split('\\').pop() || "Lien réseau";
      triggerAutoSave({ ...data, chemins_reseau: [...data.chemins_reseau, { nom: nomFinal, chemin: newCheminVal.trim(), validated: false }] }, `🔗 A ajouté le lien réseau : ${nomFinal}`);
      setNewCheminNom(""); setNewCheminVal("");
    }
  };

  const toggleCheminValidation = (index) => {
    const link = data.chemins_reseau[index];
    const newChemins = data.chemins_reseau.map((c, i) => i === index ? { ...c, validated: !c.validated } : c);
    triggerAutoSave({ ...data, chemins_reseau: newChemins }, !link.validated ? `✅ A validé le lien réseau : ${link.nom}` : `❌ A repassé en chantier le lien réseau : ${link.nom}`);
  };

  const removeChemin = (index) => {
    const link = data.chemins_reseau[index];
    triggerAutoSave({ ...data, chemins_reseau: data.chemins_reseau.filter((_, i) => i !== index) }, `🗑️ A supprimé le lien réseau : ${link.nom}`);
  };

  const copyToClipboard = (chemin) => {
    if (!chemin) return; navigator.clipboard.writeText(chemin); alert("Lien copié dans le presse-papier !");
  };

  async function handleAnalyze(file) {
    if (!file.url) return;
    setIsAnalyzing(true); setAiReport("");
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Clé API introuvable.");
      const response = await fetch(file.url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
         try {
             const base64data = reader.result.split(',')[1];
             let mimeType = blob.type;
             if (file.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
             const genAI = new GoogleGenerativeAI(apiKey);
             const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
             const prompt = `Tu es un auditeur Qualiopi bienveillant. Analyse ce document pour le critère ${data.num} : "${data.titre}". Niveau attendu : ${guide.niveau}. Fais un résumé court (avec emojis) : 1. Contenu ? 2. Pertinence ? 3. Ce qui manque ?`;
             const result = await model.generateContent([prompt, { inlineData: { data: base64data, mimeType } }]);
             setAiReport(result.response.text());
         } catch (err) { setAiReport("Erreur : " + err.message); } finally { setIsAnalyzing(false); }
      };
    } catch (error) { setAiReport("Erreur : " + error.message); setIsAnalyzing(false); }
  }

  if (!data.id) return null;

  const chantierFiles = data.fichiers.filter(f => !f.validated);
  const validatedFiles = data.fichiers.filter(f => f.validated);
  const hasValidatedChemins = data.chemins_reseau.some(c => c.validated);
  const hasChantierChemins = data.chemins_reseau.some(c => !c.validated);
  
  // Style dynamique des onglets
  const tabBtnStyle = (tabId) => ({
    padding: "10px 18px", fontSize: "13px", fontWeight: "700", cursor: "pointer", border: "none", background: "transparent",
    color: activeSubTab === tabId ? "#1d4ed8" : "#64748b",
    borderBottom: activeSubTab === tabId ? "3px solid #1d4ed8" : "3px solid transparent",
    transition: "all 0.2s"
  });

  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "#f8fafc", borderRadius: "16px", width: "100%", maxWidth: "800px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }} onClick={e => e.stopPropagation()}>
        
        {/* --- HEADER --- */}
        <div style={{ background: "white", padding: "24px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
               <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", background: `${cfg.color}15`, color: cfg.color, borderRadius: "12px", fontSize: "18px", fontWeight: "900", border: `1px solid ${cfg.color}30` }}>{data.num}</span>
               <div>
                 <h2 style={{ margin: 0, fontSize: "18px", color: "#1e3a5f", fontWeight: "800", lineHeight: "1.3" }}>{data.titre}</h2>
                 <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>{cfg.label}</span>
               </div>
            </div>
            <button onClick={onClose} style={{ border: "none", background: "#f1f5f9", color: "#64748b", fontSize: "20px", cursor: "pointer", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>

          {/* --- BARRE D'ONGLETS INTERNES --- */}
          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #e2e8f0" }}>
            <button onClick={() => setActiveSubTab("validation")} style={tabBtnStyle("validation")}>✅ Validation & Preuves</button>
            {!isAuditMode && <button onClick={() => setActiveSubTab("chantier")} style={tabBtnStyle("chantier")}>🚧 Espace Travail & IA</button>}
            <button onClick={() => setActiveSubTab("referentiel")} style={tabBtnStyle("referentiel")}>📘 Référentiel</button>
            {!isAuditMode && <button onClick={() => setActiveSubTab("historique")} style={tabBtnStyle("historique")}>🕰️ Historique</button>}
          </div>
        </div>

        {/* --- CORPS DE LA MODALE SCROLLABLE --- */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          
          {/* ONGLET 1 : VALIDATION (OFFICIEL) */}
          {activeSubTab === "validation" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                <div>
                  <label style={lbl}>Statut de l'indicateur</label>
                  <select disabled={isAuditMode || isReadOnly} value={data.statut} onChange={e => setData({...data, statut: e.target.value})} style={{ ...inp, background: (STATUT_CONFIG[data.statut]||STATUT_CONFIG["non-evalue"]).bg, color: (STATUT_CONFIG[data.statut]||STATUT_CONFIG["non-evalue"]).color, fontWeight: "800", border: `1px solid ${(STATUT_CONFIG[data.statut]||STATUT_CONFIG["non-evalue"]).border}` }}>
                    {Object.entries(STATUT_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Responsable(s)</label>
                  <OrganigramSelect disabled={isAuditMode || isReadOnly} selected={data.responsables} onChange={v => setData({...data, responsables: v})} allMembers={allMembers} rolePalette={rolePalette} orgRoles={orgRoles} />
                </div>
              </div>

              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                <label style={{ ...lbl, color: "#166534", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #bbf7d0", paddingBottom: "10px", marginBottom: "16px" }}>🏛️ Preuves Officielles (Présentées le jour de l'Audit)</label>
                
                {(hasValidatedChemins || isAuditMode) && (
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "12px", color: "#059669", fontWeight: "700", marginBottom: "8px", display: "block" }}>🔗 Documents sur le Réseau Local IFSI :</label>
                    {!hasValidatedChemins && <span style={{ fontSize: "12px", color: "#059669", fontStyle: "italic" }}>Aucun document réseau validé.</span>}
                    {data.chemins_reseau.filter(c => c.validated).map((item, index) => (
                        <div key={index} style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px", background: "white", padding: "10px 14px", borderRadius: "8px", border: "1px solid #6ee7b7" }}>
                          <span title={item.chemin} style={{ flex: 1, fontSize: "13px", color: "#065f46", fontWeight: "700" }}>📄 {item.nom}</span>
                          <button onClick={() => copyToClipboard(item.chemin)} style={{ background: "#10b981", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>Copier le lien</button>
                          {(!isAuditMode && !isReadOnly) && (<button onClick={() => toggleCheminValidation(data.chemins_reseau.indexOf(item))} style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>Retirer</button>)}
                        </div>
                    ))}
                  </div>
                )}

                {validatedFiles.length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                     <label style={{ fontSize: "12px", color: "#059669", fontWeight: "700", marginBottom: "8px", display: "block" }}>☁️ Fichiers joints validés :</label>
                     <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                      {validatedFiles.map(f => (
                        <div key={f.url} style={{ background: "white", padding: "8px 12px", borderRadius: "8px", border: "1px solid #6ee7b7", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px" }}>
                          <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#059669", textDecoration: "none", fontWeight: "700" }}>{f.name}</a>
                          {(!isAuditMode && !isReadOnly) && (<button onClick={() => toggleValidation(f.url)} style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", padding: "0", fontSize: "14px" }} title="Retirer des preuves officielles">❌</button>)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(data.preuves || (!isAuditMode && !isReadOnly)) && (
                  <div>
                    <label style={{ fontSize: "12px", color: "#059669", fontWeight: "700", marginBottom: "8px", display: "block" }}>📝 Justifications textuelles publiques :</label>
                    <textarea readOnly={isAuditMode || isReadOnly} value={data.preuves} onChange={e => setData({...data, preuves: e.target.value})} placeholder="Inscrire ici les explications pour l'auditeur ou les liens web directs..." style={{ ...inp, height: "100px", resize: "vertical", background: (isAuditMode || isReadOnly) ? "transparent" : "white", border: (isAuditMode || isReadOnly) ? "none" : "1px solid #6ee7b7", padding: (isAuditMode || isReadOnly) ? "0" : "12px", color: "#166534" }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ONGLET 2 : CHANTIER & IA */}
          {activeSubTab === "chantier" && !isAuditMode && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                <label style={{ ...lbl, color: "#b45309", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #fde68a", paddingBottom: "10px", marginBottom: "16px" }}>🚧 Espace de Préparation (Invisible pour l'Auditeur)</label>
                
                <label style={{ fontSize: "12px", color: "#92400e", fontWeight: "700", marginBottom: "8px", display: "block" }}>Brouillon / Notes de travail :</label>
                <textarea readOnly={isReadOnly} value={data.preuves_encours} onChange={e => setData({...data, preuves_encours: e.target.value})} placeholder="Ce sur quoi l'équipe est en train de travailler..." style={{ ...inp, height: "80px", marginBottom: "20px", borderColor: "#fde68a", resize: "vertical" }} />
                
                {hasChantierChemins && (
                  <div style={{ marginBottom: "20px" }}>
                    <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#92400e", fontWeight: "700" }}>🔗 Liens réseau en attente d'approbation :</p>
                    {data.chemins_reseau.filter(c => !c.validated).map((item, index) => (
                        <div key={index} style={{ background: "white", padding: "8px 12px", borderRadius: "8px", border: "1px dashed #fcd34d", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                          <span title={item.chemin} style={{ color: "#92400e", fontWeight: "600", flex: 1 }}>{item.nom}</span>
                          {!isReadOnly && (
                            <><button onClick={() => toggleCheminValidation(data.chemins_reseau.indexOf(item))} style={{ background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46", cursor: "pointer", padding: "6px 12px", borderRadius: "6px", fontWeight: "bold", fontSize: "11px" }}>Prouver ✅</button>
                              <button onClick={() => removeChemin(data.chemins_reseau.indexOf(item))} style={{ color: "#ef4444", border: "none", background: "none", cursor: "pointer", fontSize: "16px" }}>🗑️</button></>
                          )}
                        </div>
                    ))}
                  </div>
                )}

                {chantierFiles.length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#92400e", fontWeight: "700" }}>☁️ Fichiers joints en attente d'approbation :</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {chantierFiles.map(f => (
                        <div key={f.url} style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #fcd34d", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#92400e", fontWeight: "600", textDecoration: "none" }}>{f.name}</a>
                          {!isReadOnly && (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button onClick={() => handleAnalyze(f)} disabled={isAnalyzing} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", cursor: "pointer", padding: "6px 12px", borderRadius: "6px", fontWeight: "bold", fontSize: "11px" }}>{isAnalyzing ? "⏳ IA..." : "🤖 Analyse IA"}</button>
                              <button onClick={() => toggleValidation(f.url)} style={{ background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46", cursor: "pointer", padding: "6px 12px", borderRadius: "6px", fontWeight: "bold", fontSize: "11px" }}>Prouver ✅</button>
                              <button onClick={() => handleDeleteFile(f)} style={{ color: "#ef4444", border: "none", background: "none", cursor: "pointer", fontSize: "16px" }}>🗑️</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiReport && (
                  <div style={{ background: "#f0fdfa", border: "1px solid #5eead4", padding: "16px", borderRadius: "8px", marginBottom: "20px", position: "relative" }}>
                    <button onClick={() => setAiReport("")} style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>❌</button>
                    <strong style={{ color: "#0f766e", display: "block", marginBottom: "8px", fontSize: "14px" }}>🤖 Analyse de l'Assistant Qualiopi :</strong>
                    <div style={{ fontSize: "13px", color: "#134e4a", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>{aiReport}</div>
                  </div>
                )}

                {!isReadOnly && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "20px", borderTop: "1px dashed #fde68a", paddingTop: "20px" }}>
                    <div>
                      <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#92400e", fontWeight: "700", textTransform: "uppercase" }}>Lier un document réseau</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <input type="text" value={newCheminNom} onChange={e => setNewCheminNom(e.target.value)} placeholder="Nom (Ex: Trame livret)" style={{ ...inp, borderColor: "#fcd34d", padding: "8px" }} />
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input type="text" value={newCheminVal} onChange={e => setNewCheminVal(e.target.value)} placeholder="Chemin (Z:\...)" style={{ ...inp, flex: 1, borderColor: "#fcd34d", padding: "8px" }} />
                          <button onClick={addChemin} disabled={!newCheminVal.trim()} style={{ background: newCheminVal.trim() ? "#d97706" : "#fcd34d", color: "white", border: "none", padding: "0 16px", borderRadius: "8px", cursor: newCheminVal.trim() ? "pointer" : "not-allowed", fontWeight: "bold" }}>➕</button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#92400e", fontWeight: "700", textTransform: "uppercase" }}>Uploader un fichier</p>
                      <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" id="file-chantier" style={{ display: "none" }} onChange={handleFileUpload} disabled={uploading} />
                      <label htmlFor="file-chantier" style={{ background: "white", border: "2px dashed #d97706", color: "#d97706", display: "flex", height: "82px", alignItems: "center", justifyContent: "center", borderRadius: "8px", cursor: uploading ? "wait" : "pointer", fontSize: "13px", fontWeight: "700", opacity: uploading ? 0.6 : 1 }}>
                        {uploading ? "⏳ Upload en cours..." : "📎 Parcourir mon PC (PDF/Image)"}
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ background: "white", border: "1px solid #cbd5e1", padding: "20px", borderRadius: "12px" }}>
                <label style={{ ...lbl, color: "#475569" }}>🕵️ Notes internes de l'équipe (Privé)</label>
                <textarea readOnly={isReadOnly} value={data.notes} onChange={e => setData({...data, notes: e.target.value})} placeholder="Rappels logistiques, blocages..." style={{ ...inp, height: "80px", borderStyle: "dashed", resize: "vertical" }} />
              </div>
            </div>
          )}

          {/* ONGLET 3 : RÉFÉRENTIEL */}
          {activeSubTab === "referentiel" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ background: "white", padding: "24px", borderRadius: "12px", fontSize: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                <h3 style={{ ...lbl, color: "#1e3a5f", fontSize: "14px", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", marginBottom: "16px" }}>Lignes directrices de l'État</h3>
                <p style={{ marginBottom: "16px", lineHeight: "1.6" }}><strong style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Niveau attendu :</strong> <span style={{ color: "#1e3a5f" }}>{guide.niveau}</span></p>
                <p style={{ marginBottom: "16px", lineHeight: "1.6" }}><strong style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Preuves suggérées :</strong> <span style={{ color: "#475569" }}>{guide.preuves}</span></p>
                {!isAuditMode && (
                   <div style={{ background: "#fef2f2", padding: "16px", borderRadius: "8px", color: "#991b1b", marginTop: "20px", border: "1px solid #fca5a5", borderLeft: "4px solid #ef4444" }}>
                     <strong style={{ display: "block", marginBottom: "6px" }}>⚠️ Règle de non-conformité :</strong> 
                     <span style={{ fontSize: "13px", lineHeight: "1.5" }}>{guide.nonConformite}</span>
                   </div>
                )}
              </div>

              {!isAuditMode && (
                <div style={{ background: "white", border: "1px solid #e2e8f0", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <label style={{ ...lbl, color: "#1e3a5f", fontSize: "14px" }}>📝 Remarques des précédents audits</label>
                  <textarea readOnly={isReadOnly} value={data.attendus} onChange={e => setData({...data, attendus: e.target.value})} placeholder="Inscrivez ici les remarques faites par l'auditeur lors des précédents passages..." style={{ ...inp, height: "100px", resize: "vertical" }} />
                </div>
              )}
            </div>
          )}

          {/* ONGLET 4 : HISTORIQUE */}
          {activeSubTab === "historique" && !isAuditMode && (
            <div style={{ background: "white", border: "1px solid #e2e8f0", padding: "24px", borderRadius: "12px", minHeight: "300px" }}>
              {(!data.historique || data.historique.length === 0) ? (
                <div style={{ fontSize: "14px", color: "#9ca3af", fontStyle: "italic", textAlign: "center", padding: "40px 0" }}>Aucune modification n'a été enregistrée pour le moment.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[...data.historique].reverse().map((h, i) => (
                    <div key={i} style={{ fontSize: "13px", background: "#f8fafc", padding: "12px 16px", borderLeft: "4px solid #3b82f6", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                       <div style={{ color: "#334155", fontWeight: "500" }}>{h.msg}</div>
                       <div style={{ textAlign: "right" }}>
                         <div style={{ color: "#1d4ed8", fontWeight: "800", fontSize: "11px" }}>{h.user.split('@')[0]}</div>
                         <div style={{ color: "#64748b", fontSize: "11px" }}>{new Date(h.date).toLocaleDateString("fr-FR")} à {new Date(h.date).toLocaleTimeString("fr-FR").slice(0,5)}</div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* --- FOOTER : NAVIGATION RAPIDE --- */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", background: "white", borderTop: "1px solid #e2e8f0", borderRadius: "0 0 16px 16px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <button disabled={!hasPrev} onClick={() => onSave(data, "prev")} style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: hasPrev ? "white" : "#f8fafc", color: hasPrev ? "#1e3a5f" : "#9ca3af", cursor: hasPrev ? "pointer" : "not-allowed", fontWeight: "700", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}>
              <span>⬅️</span> Précédent
            </button>
            <button disabled={!hasNext} onClick={() => onSave(data, "next")} style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: hasNext ? "white" : "#f8fafc", color: hasNext ? "#1e3a5f" : "#9ca3af", cursor: hasNext ? "pointer" : "not-allowed", fontWeight: "700", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}>
              Suivant <span>➡️</span>
            </button>
            {!isAuditMode && !isReadOnly && <span style={{ fontSize: "11px", color: "#64748b", alignSelf: "center", marginLeft: "10px" }}>💾 Auto-sauvegarde activée</span>}
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            {(!isAuditMode && !isReadOnly) && (
              <button onClick={() => onSave(data, "close")} style={{ padding: "10px 32px", borderRadius: "8px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white", border: "none", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 12px rgba(29, 78, 216, 0.2)" }}>
                Fermer
              </button>
            )}
            {(isAuditMode || isReadOnly) && (
              <button onClick={onClose} style={{ padding: "10px 32px", borderRadius: "8px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", fontWeight: "bold", cursor: "pointer" }}>
                Fermer
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
