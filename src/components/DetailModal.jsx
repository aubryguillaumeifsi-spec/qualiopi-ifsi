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
          {allMembers.length === 0 && <div style={{ padding: "12px", fontSize: "12px", color: "#9ca3af", fontStyle: "italic", textAlign: "center" }}>L'organigramme de cet IFSI est vide. L'Admin doit d'abord ajouter des personnes.</div>}
          
          {allMembers.map(m => (
            <label key={m.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #f8fafc", transition: "background 0.2s" }} onMouseOver={e=>e.currentTarget.style.background="#f8fafc"} onMouseOut={e=>e.currentTarget.style.background="white"}>
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
  const lbl = { display: "block", fontSize: "11px", color: "#6b7280", textTransform: "uppercase", fontWeight: "700", marginBottom: "5px" };
  const inp = { background: (isReadOnly || isAuditMode) ? "#f9fafb" : "white", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px", fontSize: "13px", width: "100%", outline: "none", boxSizing: "border-box" };

  // 👉 FONCTION CENTRALE : AUTO-SAUVEGARDE + HISTORIQUE TEMPS RÉEL
  const triggerAutoSave = (updatedData, logMsg) => {
    const now = new Date().toISOString();
    const userEmail = auth?.currentUser?.email || "Utilisateur";
    const newLog = { date: now, user: userEmail, msg: logMsg };
    
    const finalData = { 
      ...updatedData, 
      historique: [...(updatedData.historique || []), newLog] 
    };
    
    setData(finalData); // Met à jour l'écran immédiatement
    if (onAutoSave) onAutoSave(finalData); // Sauvegarde en BDD en arrière-plan
  };

  // --- ACTIONS SUR LES FICHIERS CLOUD ---
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileRef = ref(storage, `preuves/${critere.id}_${Date.now()}_${file.name}`);
      await uploadBytesResumable(fileRef, file);
      const url = await getDownloadURL(fileRef);
      const newFile = { name: file.name, url: url, path: fileRef.fullPath, validated: false };
      
      triggerAutoSave(
        { ...data, fichiers: [...data.fichiers, newFile] }, 
        `📎 A importé le fichier : ${file.name}`
      );
    } catch (error) { alert("Erreur d'envoi : " + error.message); }
    setUploading(false);
  }

  const toggleValidation = (fileUrl) => {
    const fileToToggle = data.fichiers.find(f => f.url === fileUrl);
    const newFichiers = data.fichiers.map(f => f.url === fileUrl ? { ...f, validated: !f.validated } : f);
    const logMsg = !fileToToggle.validated 
      ? `✅ A validé le document comme preuve officielle : ${fileToToggle.name}` 
      : `❌ A repassé en chantier le document : ${fileToToggle.name}`;
    triggerAutoSave({ ...data, fichiers: newFichiers }, logMsg);
  };

  async function handleDeleteFile(fileToDelete) {
    if (!window.confirm(`Supprimer définitivement "${fileToDelete.name}" ?`)) return;
    try { if (fileToDelete.path) await deleteObject(ref(storage, fileToDelete.path)); } catch (e) { console.warn("Introuvable sur le serveur"); }
    const newFichiers = data.fichiers.filter(f => f.url !== fileToDelete.url);
    triggerAutoSave({ ...data, fichiers: newFichiers }, `🗑️ A supprimé le fichier : ${fileToDelete.name}`);
  }

  // --- ACTIONS SUR LES LIENS RÉSEAU ---
  const addChemin = () => {
    if (newCheminVal.trim() !== "") {
      const nomFinal = newCheminNom.trim() || newCheminVal.split('\\').pop() || "Lien réseau";
      const newChemins = [...data.chemins_reseau, { nom: nomFinal, chemin: newCheminVal.trim(), validated: false }];
      triggerAutoSave({ ...data, chemins_reseau: newChemins }, `🔗 A ajouté le lien réseau : ${nomFinal}`);
      setNewCheminNom(""); setNewCheminVal("");
    }
  };

  const toggleCheminValidation = (index) => {
    const link = data.chemins_reseau[index];
    const newChemins = data.chemins_reseau.map((c, i) => i === index ? { ...c, validated: !c.validated } : c);
    const logMsg = !link.validated 
      ? `✅ A validé le lien réseau comme preuve officielle : ${link.nom}` 
      : `❌ A repassé en chantier le lien réseau : ${link.nom}`;
    triggerAutoSave({ ...data, chemins_reseau: newChemins }, logMsg);
  };

  const removeChemin = (index) => {
    const link = data.chemins_reseau[index];
    const newChemins = data.chemins_reseau.filter((_, i) => i !== index);
    triggerAutoSave({ ...data, chemins_reseau: newChemins }, `🗑️ A supprimé le lien réseau : ${link.nom}`);
  };

  const copyToClipboard = (chemin) => {
    if (!chemin) return;
    navigator.clipboard.writeText(chemin);
    alert("Copié ! Faites Ctrl+V dans votre explorateur.");
  };

  // 👉 LE RETOUR DE L'INTELLIGENCE ARTIFICIELLE (AVEC GEMINI 2.5 FLASH)
  async function handleAnalyze(file) {
    if (!file.url) return;
    setIsAnalyzing(true);
    setAiReport("");
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Clé API Gemini introuvable (VITE_GEMINI_API_KEY). Veuillez la configurer dans Vercel.");

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
             // 🔥 Correction de la version du modèle ici :
             const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

             const prompt = `Tu es un auditeur Qualiopi bienveillant mais rigoureux. Analyse ce document pour le critère ${data.num} : "${data.titre}".
              Voici le niveau attendu par le référentiel : ${guide.niveau}.
              Fais un résumé très clair et concis (avec des emojis) :
              1. 📄 Que contient ce document ?
              2. 🎯 Est-il pertinent pour valider ce critère précis ?
              3. ⚠️ Que manque-t-il pour être parfait ?`;

             const result = await model.generateContent([
               prompt,
               { inlineData: { data: base64data, mimeType } }
             ]);
             setAiReport(result.response.text());
         } catch (err) {
             setAiReport("Erreur lors de l'analyse : " + err.message);
         } finally {
             setIsAnalyzing(false);
         }
      };
    } catch (error) {
      setAiReport("Erreur réseau : " + error.message);
      setIsAnalyzing(false);
    }
  }

  if (!data.id) return null;

  const chantierFiles = data.fichiers.filter(f => !f.validated);
  const validatedFiles = data.fichiers.filter(f => f.validated);
  const hasValidatedChemins = data.chemins_reseau.some(c => c.validated);
  const hasChantierChemins = data.chemins_reseau.some(c => !c.validated);

  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "white", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "1100px", maxHeight: "95vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
             <span style={{ padding: "6px 14px", background: `${cfg.color}15`, color: cfg.color, borderRadius: "8px", fontSize: "16px", fontWeight: "900", border: `1px solid ${cfg.color}30` }}>{data.num || "-"}</span>
             <div>
               <h2 style={{ margin: 0, fontSize: "18px", color: "#1e3a5f", fontWeight: "800" }}>{data.titre}</h2>
               <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>{cfg.label}</span>
             </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "#f1f5f9", color: "#64748b", fontSize: "20px", cursor: "pointer", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "24px", flex: 1 }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", fontSize: "13px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ ...lbl, color: "#1e3a5f", fontSize: "13px", borderBottom: "2px solid #e2e8f0", paddingBottom: "8px", marginBottom: "12px" }}>📘 Référentiel Officiel</h3>
              <p style={{ marginBottom: "12px" }}><strong style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Niveau attendu :</strong> <span style={{ color: "#1e3a5f", lineHeight: "1.5" }}>{guide.niveau}</span></p>
              <p style={{ marginBottom: "12px" }}><strong style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Preuves suggérées :</strong> <span style={{ color: "#475569", lineHeight: "1.5" }}>{guide.preuves}</span></p>
              {!isAuditMode && (
                 <div style={{ background: "#fef2f2", padding: "12px", borderRadius: "8px", color: "#991b1b", marginTop: "16px", border: "1px solid #fca5a5", borderLeft: "4px solid #ef4444" }}>
                   <strong style={{ display: "block", marginBottom: "4px" }}>⚠️ Règle de non-conformité :</strong> 
                   <span style={{ fontSize: "12px", lineHeight: "1.4" }}>{guide.nonConformite}</span>
                 </div>
              )}
            </div>

            {!isAuditMode && (
              <div style={{ background: "white", border: "1px solid #e2e8f0", padding: "20px", borderRadius: "12px", flex: 1, display: "flex", flexDirection: "column" }}>
                <h3 style={{ ...lbl, color: "#1e3a5f", fontSize: "13px", borderBottom: "2px solid #e2e8f0", paddingBottom: "8px", marginBottom: "12px" }}>🕰️ Historique & Traçabilité</h3>
                
                {(!data.historique || data.historique.length === 0) ? (
                  <div style={{ fontSize: "12px", color: "#9ca3af", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>Aucune modification enregistrée.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "250px", overflowY: "auto", paddingRight: "6px" }}>
                    {[...data.historique].reverse().map((h, i) => (
                      <div key={i} style={{ fontSize: "11px", background: "#f8fafc", padding: "10px", borderLeft: "3px solid #3b82f6", borderRadius: "4px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                         <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                           <span style={{ color: "#64748b", fontWeight: "700" }}>{new Date(h.date).toLocaleDateString("fr-FR")} à {new Date(h.date).toLocaleTimeString("fr-FR").slice(0,5)}</span>
                           <span style={{ color: "#1d4ed8", fontWeight: "700" }}>{h.user.split('@')[0]}</span>
                         </div>
                         <div style={{ color: "#334155", lineHeight: "1.4" }}>{h.msg}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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
                <OrganigramSelect 
                  disabled={isAuditMode || isReadOnly} 
                  selected={data.responsables} 
                  onChange={v => setData({...data, responsables: v})}
                  allMembers={allMembers}
                  rolePalette={rolePalette}
                  orgRoles={orgRoles}
                />
              </div>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", padding: "20px", borderRadius: "12px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <label style={{ ...lbl, color: "#166534", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>🏛️ Preuves Validées (Présentées à l'Audit)</label>
              {(hasValidatedChemins || isAuditMode) && (
                <div style={{ marginBottom: "16px", padding: "16px", background: "white", borderRadius: "8px", border: "1px dashed #34d399" }}>
                  <label style={{ fontSize: "12px", color: "#059669", fontWeight: "700", marginBottom: "12px", display: "block" }}>🔗 Documents sur le Réseau Local</label>
                  {!hasValidatedChemins && <span style={{ fontSize: "12px", color: "#059669", fontStyle: "italic" }}>Aucun document réseau validé.</span>}
                  {data.chemins_reseau.map((item, index) => {
                    if (!item.validated) return null;
                    return (
                      <div key={index} style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "10px", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <span title={item.chemin} style={{ flex: 1, fontSize: "14px", color: "#1e3a5f", fontWeight: "700" }}>📄 {item.nom}</span>
                        <button onClick={() => copyToClipboard(item.chemin)} style={{ background: "#10b981", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>📋 Copier</button>
                        {!isAuditMode && !isReadOnly && (<button onClick={() => toggleCheminValidation(index)} style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>Retirer</button>)}
                      </div>
                    );
                  })}
                </div>
              )}
              {validatedFiles.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                  {validatedFiles.map(f => (
                    <div key={f.url} style={{ background: "white", padding: "6px 12px", borderRadius: "8px", border: "1px solid #6ee7b7", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#059669", textDecoration: "none", fontWeight: "700" }}>☁️ {f.name}</a>
                      {(!isAuditMode && !isReadOnly) && (<button onClick={() => toggleValidation(f.url)} style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", cursor: "pointer", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>Retirer</button>)}
                    </div>
                  ))}
                </div>
              )}
              {(data.preuves || (!isAuditMode && !isReadOnly)) && (
                <div>
                  <label style={{ fontSize: "11px", color: "#059669", fontWeight: "700", marginBottom: "6px", display: "block" }}>Justifications textuelles (ou liens web) :</label>
                  <textarea readOnly={isAuditMode || isReadOnly} value={data.preuves} onChange={e => setData({...data, preuves: e.target.value})} placeholder="Inscrire ici..." style={{ ...inp, height: "70px", resize: "vertical", background: (isAuditMode || isReadOnly) ? "transparent" : "white", border: (isAuditMode || isReadOnly) ? "none" : "1px solid #6ee7b7", padding: (isAuditMode || isReadOnly) ? "0" : "12px", color: "#166534" }} />
                </div>
              )}
            </div>

            {!isAuditMode && (
              <>
                <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", padding: "20px", borderRadius: "12px", marginBottom: "20px" }}>
                  <label style={{ ...lbl, color: "#b45309", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>🚧 Zone de Chantier & Préparation</label>
                  <textarea readOnly={isReadOnly} value={data.preuves_encours} onChange={e => setData({...data, preuves_encours: e.target.value})} placeholder="Travail en cours..." style={{ ...inp, height: "60px", marginBottom: "16px", borderColor: "#fde68a", resize: "vertical" }} />
                  
                  {hasChantierChemins && (
                    <div style={{ marginBottom: "16px" }}>
                      <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#92400e", fontWeight: "700" }}>🔗 Liens réseau en attente :</p>
                      {data.chemins_reseau.map((item, index) => {
                        if (item.validated) return null;
                        return (
                          <div key={index} style={{ background: "white", padding: "6px 12px", borderRadius: "8px", border: "1px dashed #fcd34d", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                            <span title={item.chemin} style={{ color: "#92400e", fontWeight: "600", flex: 1 }}>🔗 {item.nom}</span>
                            {!isReadOnly && (
                              <><button onClick={() => toggleCheminValidation(index)} style={{ background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46", cursor: "pointer", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold", fontSize: "11px" }}>Valider ✅</button>
                                <button onClick={() => removeChemin(index)} style={{ color: "#ef4444", border: "none", background: "none", cursor: "pointer", fontSize: "14px" }}>🗑️</button></>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isReadOnly && (
                    <div style={{ marginBottom: "20px", padding: "12px", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fde68a" }}>
                      <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#92400e", fontWeight: "700" }}>Ajouter un lien réseau :</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <input type="text" value={newCheminNom} onChange={e => setNewCheminNom(e.target.value)} placeholder="Nom affiché (Ex: Tableau de bord)" style={{ ...inp, borderColor: "#fcd34d", fontSize: "12px" }} />
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input type="text" value={newCheminVal} onChange={e => setNewCheminVal(e.target.value)} placeholder="Chemin (Ex: Z:\QUALIOPI\tab26.xlsx)" style={{ ...inp, flex: 1, borderColor: "#fcd34d", fontSize: "12px", fontFamily: "monospace" }} onKeyDown={(e) => { if(e.key === 'Enter') addChemin(); }} />
                          <button onClick={addChemin} disabled={!newCheminVal.trim()} style={{ background: newCheminVal.trim() ? "#d97706" : "#fcd34d", color: "white", border: "none", padding: "0 16px", borderRadius: "8px", cursor: newCheminVal.trim() ? "pointer" : "not-allowed", fontWeight: "bold", fontSize: "12px" }}>➕</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: chantierFiles.length > 0 ? "16px" : "0" }}>
                    {chantierFiles.map(f => (
                      <div key={f.url} style={{ background: "white", padding: "10px 14px", borderRadius: "8px", border: "1px solid #fcd34d", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: "#92400e", fontWeight: "600" }}>☁️ {f.name}</span>
                        {!isReadOnly && (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => handleAnalyze(f)} disabled={isAnalyzing} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", cursor: "pointer", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold", fontSize: "11px" }}>
                              {isAnalyzing ? "⏳ IA..." : "🤖 Analyse IA"}
                            </button>
                            <button onClick={() => toggleValidation(f.url)} style={{ background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46", cursor: "pointer", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold", fontSize: "11px" }}>Valider ✅</button>
                            <button onClick={() => handleDeleteFile(f)} style={{ color: "#ef4444", border: "none", background: "none", cursor: "pointer", fontSize: "14px" }}>🗑️</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {aiReport && (
                    <div style={{ background: "#f0fdfa", border: "1px solid #5eead4", padding: "16px", borderRadius: "8px", marginBottom: "16px", position: "relative" }}>
                      <button onClick={() => setAiReport("")} style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>❌</button>
                      <strong style={{ color: "#0f766e", display: "block", marginBottom: "8px", fontSize: "13px" }}>🤖 Analyse de l'Assistant Qualiopi :</strong>
                      <div style={{ fontSize: "12px", color: "#134e4a", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>{aiReport}</div>
                    </div>
                  )}

                  {!isReadOnly && (
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "10px" }}>
                      <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" id="file-chantier" style={{ display: "none" }} onChange={handleFileUpload} disabled={uploading} />
                      <label htmlFor="file-chantier" style={{ background: "white", border: "1px dashed #d97706", color: "#d97706", padding: "8px 16px", borderRadius: "8px", cursor: uploading ? "wait" : "pointer", fontSize: "12px", fontWeight: "700", opacity: uploading ? 0.6 : 1 }}>
                        {uploading ? "⏳ Upload en cours..." : "📎 Importer (PDF/Image)"}
                      </label>
                    </div>
                  )}
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "20px", borderRadius: "12px", marginBottom: "20px" }}>
                  <label style={lbl}>📝 Remarques de l'évaluateur (Historique)</label>
                  <textarea readOnly={isReadOnly} value={data.attendus} onChange={e => setData({...data, attendus: e.target.value})} placeholder="Retours des précédents audits..." style={{ ...inp, height: "60px", resize: "vertical" }} />
                </div>

                <div style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "20px", borderRadius: "12px" }}>
                  <label style={lbl}>🕵️ Notes internes IFPS (Privé)</label>
                  <textarea readOnly={isReadOnly} value={data.notes} onChange={e => setData({...data, notes: e.target.value})} placeholder="Rappels logistiques..." style={{ ...inp, height: "60px", borderStyle: "dashed", resize: "vertical" }} />
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #e2e8f0" }}>
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              disabled={!hasPrev} 
              onClick={() => onSave(data, "prev")} 
              style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: hasPrev ? "white" : "#f8fafc", color: hasPrev ? "#1e3a5f" : "#9ca3af", cursor: hasPrev ? "pointer" : "not-allowed", fontWeight: "700", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}>
              <span>⬅️</span> Précédent
            </button>
            <button 
              disabled={!hasNext} 
              onClick={() => onSave(data, "next")} 
              style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: hasNext ? "white" : "#f8fafc", color: hasNext ? "#1e3a5f" : "#9ca3af", cursor: hasNext ? "pointer" : "not-allowed", fontWeight: "700", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}>
              Suivant <span>➡️</span>
            </button>
            {!isAuditMode && !isReadOnly && <span style={{ fontSize: "11px", color: "#64748b", alignSelf: "center", marginLeft: "10px" }}>(Sauvegarde auto.)</span>}
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", color: "#475569", cursor: "pointer", fontWeight: "600" }}>
              {(isReadOnly || isAuditMode) ? "Fermer" : "Annuler"}
            </button>
            {(!isAuditMode && !isReadOnly) && (
              <button onClick={() => onSave(data, "close")} style={{ padding: "10px 32px", borderRadius: "8px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white", border: "none", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 12px rgba(29, 78, 216, 0.2)" }}>
                Enregistrer & Fermer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
