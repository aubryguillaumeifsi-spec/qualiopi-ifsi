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
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{display}</span>
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
  
  const [data, setData] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("validation");
  const [uploading, setUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState("");
  const [newCheminNom, setNewCheminNom] = useState("");
  const [newCheminVal, setNewCheminVal] = useState("");
  
  useEffect(() => {
    if (critere) {
      const rawChemins = Array.isArray(critere.chemins_reseau) ? critere.chemins_reseau : [];
      const initialChemins = rawChemins.map(c => ({ ...c, validated: c.validated !== false }));
      
      setData({ 
        ...critere, 
        responsables: critere.responsables || [], 
        fichiers: critere.fichiers || [],
        preuves: critere.preuves || "", 
        chemins_reseau: initialChemins, 
        preuves_encours: critere.preuves_encours || "", 
        attendus: critere.attendus || "", 
        notes: critere.notes || "",
        historique: critere.historique || [] 
      });
    }
  }, [critere]);

  if (!data) return <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "white", fontWeight: "bold" }}>Chargement de l'indicateur...</div></div>;

  const cfg = CRITERES_LABELS[critere.critere] || { color: "#9ca3af" };
  const guide = GUIDE_QUALIOPI[critere.id] || { niveau: "Non défini", preuves: "Non défini", nonConformite: "Non défini" };
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
      const newFile = { name: file.name, url, path: fileRef.fullPath, validated: false };
      triggerAutoSave({ ...data, fichiers: [...data.fichiers, newFile] }, `📎 Import fichier : ${file.name}`);
    } catch (error) { alert("Erreur d'envoi : " + error.message); }
    setUploading(false);
  }

  const toggleValidation = (fileUrl) => {
    const fileToToggle = data.fichiers.find(f => f.url === fileUrl);
    const newFichiers = data.fichiers.map(f => f.url === fileUrl ? { ...f, validated: !f.validated } : f);
    triggerAutoSave({ ...data, fichiers: newFichiers }, !fileToToggle.validated ? `✅ Validation preuve : ${fileToToggle.name}` : `❌ Retrait preuve : ${fileToToggle.name}`);
  };

  async function handleDeleteFile(fileToDelete) {
    if (!window.confirm(`Supprimer "${fileToDelete.name}" ?`)) return;
    try { if (fileToDelete.path) await deleteObject(ref(storage, fileToDelete.path)); } catch (e) {}
    triggerAutoSave({ ...data, fichiers: data.fichiers.filter(f => f.url !== fileToDelete.url) }, `🗑️ Suppression fichier : ${fileToDelete.name}`);
  }

  const addChemin = () => {
    if (!newCheminVal.trim()) return;
    const nomFinal = newCheminNom.trim() || newCheminVal.split('\\').pop() || "Lien réseau";
    triggerAutoSave({ ...data, chemins_reseau: [...data.chemins_reseau, { nom: nomFinal, chemin: newCheminVal.trim(), validated: false }] }, `🔗 Ajout lien réseau : ${nomFinal}`);
    setNewCheminNom(""); setNewCheminVal("");
  };

  const toggleCheminValidation = (index) => {
    const link = data.chemins_reseau[index];
    const newChemins = data.chemins_reseau.map((c, i) => i === index ? { ...c, validated: !c.validated } : c);
    triggerAutoSave({ ...data, chemins_reseau: newChemins }, !link.validated ? `✅ Validation réseau : ${link.nom}` : `❌ Retrait réseau : ${link.nom}`);
  };

  const removeChemin = (index) => {
    const link = data.chemins_reseau[index];
    triggerAutoSave({ ...data, chemins_reseau: data.chemins_reseau.filter((_, i) => i !== index) }, `🗑️ Suppression lien réseau : ${link.nom}`);
  };

  const copyToClipboard = (chemin) => {
    navigator.clipboard.writeText(chemin); alert("Copié !");
  };

  async function handleAnalyze(file) {
    // 👉 ALERTE RGPD BLOQUANTE AVANT LE SCAN
    if (!window.confirm("⚠️ ALERTE RGPD - CONFIDENTIALITÉ DES DONNÉES\n\nAvant de transmettre ce document à l'Intelligence Artificielle, veuillez confirmer qu'il ne contient AUCUNE donnée personnelle, médicale ou sensible (noms de patients, numéros de sécurité sociale, etc.).\n\nAvez-vous bien anonymisé ou biffé les informations sensibles ?")) return;

    if (!file.url) return;
    setIsAnalyzing(true); setAiReport("");
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const response = await fetch(file.url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
         const base64data = reader.result.split(',')[1];
         let mimeType = blob.type;
         if (file.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
         const genAI = new GoogleGenerativeAI(apiKey);
         const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
         
         const prompt = `CRITIQUE : Avant toute analyse, tu dois vérifier que le document fourni a un lien DIRECT et ÉVIDENT avec la formation professionnelle et le référentiel Qualiopi. Si le document n'a rien à voir (ex: politique, élection, recette de cuisine, publicité, etc.), TU DOIS REFUSER L'ANALYSE et répondre UNIQUEMENT : '❌ Document non pertinent : Ce document ne semble avoir aucun lien avec la formation professionnelle ou les exigences de cet indicateur Qualiopi.'

Tu es un Auditeur Qualiopi expert et strict. Analyse ce document pour le critère ${data.num} : "${data.titre}".
Niveau attendu : ${guide.niveau}.
Fais un résumé court (avec emojis) structuré ainsi :
1. Contenu (Ce que contient vraiment le document)
2. Pertinence (En quoi il répond aux exigences de l'indicateur)
3. Manques (Ce qu'il manque pour être une preuve parfaite)`;
         
         const result = await model.generateContent([prompt, { inlineData: { data: base64data, mimeType } }]);
         setAiReport(result.response.text());
         setIsAnalyzing(false);
      };
    } catch (error) { setAiReport("Erreur IA : " + error.message); setIsAnalyzing(false); }
  }

  const tabBtnStyle = (tabId) => ({
    padding: "10px 18px", fontSize: "13px", fontWeight: "700", cursor: "pointer", border: "none", background: "transparent",
    color: activeSubTab === tabId ? "#1d4ed8" : "#64748b",
    borderBottom: activeSubTab === tabId ? "3px solid #1d4ed8" : "3px solid transparent",
    transition: "all 0.2s"
  });

  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "850px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div style={{ background: "white", padding: "24px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
               <span style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: "48px", padding: "0 10px", height: "48px", background: `${cfg.color}15`, color: cfg.color, borderRadius: "12px", fontSize: "18px", fontWeight: "900", border: `1px solid ${cfg.color}30`, flexShrink: 0 }}>{data.num}</span>
               <div>
                 <h2 style={{ margin: 0, fontSize: "18px", color: "#1e3a5f", fontWeight: "800", lineHeight: "1.3" }}>{data.titre}</h2>
                 <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>{cfg.label}</span>
               </div>
            </div>
            <button onClick={onClose} style={{ border: "none", background: "#f1f5f9", color: "#64748b", fontSize: "20px", cursor: "pointer", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #e2e8f0" }}>
            <button onClick={() => setActiveSubTab("validation")} style={tabBtnStyle("validation")}>✅ Validation</button>
            {!isAuditMode && <button onClick={() => setActiveSubTab("chantier")} style={tabBtnStyle("chantier")}>🚧 Chantier & IA</button>}
            <button onClick={() => setActiveSubTab("referentiel")} style={tabBtnStyle("referentiel")}>📘 Référentiel</button>
            {!isAuditMode && <button onClick={() => setActiveSubTab("historique")} style={tabBtnStyle("historique")}>🕰️ Historique</button>}
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          
          {activeSubTab === "validation" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div>
                  <label style={lbl}>Statut actuel</label>
                  <select disabled={isAuditMode || isReadOnly} value={data.statut} onChange={e => setData({...data, statut: e.target.value})} style={{ ...inp, background: (STATUT_CONFIG[data.statut]||STATUT_CONFIG["non-evalue"]).bg, color: (STATUT_CONFIG[data.statut]||STATUT_CONFIG["non-evalue"]).color, fontWeight: "800", border: `1px solid ${(STATUT_CONFIG[data.statut]||STATUT_CONFIG["non-evalue"]).border}` }}>
                    {Object.entries(STATUT_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Responsable(s)</label>
                  <OrganigramSelect disabled={isAuditMode || isReadOnly} selected={data.responsables} onChange={v => setData({...data, responsables: v})} allMembers={allMembers} rolePalette={rolePalette} orgRoles={orgRoles} />
                </div>
              </div>

              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", padding: "20px", borderRadius: "12px" }}>
                <label style={{ ...lbl, color: "#166534", borderBottom: "1px solid #bbf7d0", paddingBottom: "10px", marginBottom: "16px" }}>🏛️ Preuves Officielles (Audit)</label>
                {data.chemins_reseau.filter(c => c.validated).map((item, index) => (
                    <div key={index} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", background: "white", padding: "10px", borderRadius: "8px", border: "1px solid #6ee7b7" }}>
                      <span style={{ flex: 1, fontSize: "13px", color: "#065f46", fontWeight: "700" }}>📄 {item.nom}</span>
                      <button onClick={() => copyToClipboard(item.chemin)} style={{ background: "#10b981", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>Lien</button>
                      {!isAuditMode && !isReadOnly && (<button onClick={() => toggleCheminValidation(data.chemins_reseau.indexOf(item))} style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", padding: "6px", borderRadius: "6px" }}>✖</button>)}
                    </div>
                ))}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px" }}>
                  {data.fichiers.filter(f => f.validated).map(f => (
                    <div key={f.url} style={{ background: "white", padding: "8px 12px", borderRadius: "8px", border: "1px solid #6ee7b7", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#059669", textDecoration: "none", fontWeight: "700" }}>☁️ {f.name}</a>
                      {!isAuditMode && !isReadOnly && (<button onClick={() => toggleValidation(f.url)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>✖</button>)}
                    </div>
                  ))}
                </div>
                <textarea readOnly={isAuditMode || isReadOnly} value={data.preuves} onChange={e => setData({...data, preuves: e.target.value})} placeholder="Justifications textuelles..." style={{ ...inp, height: "100px", marginTop: "15px", border: "1px solid #6ee7b7", color: "#166534" }} />
              </div>
            </div>
          )}

          {activeSubTab === "chantier" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", padding: "20px", borderRadius: "12px" }}>
                <label style={{ ...lbl, color: "#b45309", borderBottom: "1px solid #fde68a", paddingBottom: "10px", marginBottom: "16px" }}>🚧 Espace Travail (Privé)</label>
                <textarea readOnly={isReadOnly} value={data.preuves_encours} onChange={e => setData({...data, preuves_encours: e.target.value})} placeholder="Notes de chantier..." style={{ ...inp, height: "80px", borderColor: "#fde68a", marginBottom: "15px" }} />
                
                {data.chemins_reseau.filter(c => !c.validated).map((item, index) => (
                    <div key={index} style={{ background: "white", padding: "10px", borderRadius: "8px", border: "1px dashed #fcd34d", display: "flex", gap: "10px", marginBottom: "6px" }}>
                      <span style={{ color: "#92400e", fontWeight: "600", flex: 1 }}>🔗 {item.nom}</span>
                      <button onClick={() => toggleCheminValidation(data.chemins_reseau.indexOf(item))} style={{ background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold", fontSize: "11px" }}>Valider</button>
                      <button onClick={() => removeChemin(data.chemins_reseau.indexOf(item))} style={{ color: "#ef4444", border: "none", background: "none" }}>🗑️</button>
                    </div>
                ))}
                {data.fichiers.filter(f => !f.validated).map(f => (
                    <div key={f.url} style={{ background: "white", padding: "10px", borderRadius: "8px", border: "1px solid #fcd34d", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: "#92400e", fontWeight: "600" }}>☁️ {f.name}</span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => handleAnalyze(f)} disabled={isAnalyzing} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>{isAnalyzing ? "..." : "🤖 IA"}</button>
                        <button onClick={() => toggleValidation(f.url)} style={{ background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold", fontSize: "11px" }}>Valider</button>
                        <button onClick={() => handleDeleteFile(f)} style={{ color: "#ef4444", border: "none", background: "none" }}>🗑️</button>
                      </div>
                    </div>
                ))}
                {aiReport && <div style={{ background: "#f0fdfa", border: "1px solid #5eead4", padding: "15px", borderRadius: "8px", marginTop: "15px", fontSize: "13px", whiteSpace: "pre-wrap" }}>🤖 <strong>Analyse QualiForma :</strong><br/>{aiReport}</div>}
                {!isReadOnly && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "15px" }}>
                    <div style={{ background: "white", padding: "10px", borderRadius: "8px", border: "1px solid #fcd34d" }}>
                      <input type="text" value={newCheminNom} onChange={e => setNewCheminNom(e.target.value)} placeholder="Nom lien" style={{ ...inp, padding: "6px", marginBottom: "5px" }} />
                      <div style={{ display: "flex", gap: "5px" }}>
                        <input type="text" value={newCheminVal} onChange={e => setNewCheminVal(e.target.value)} placeholder="Z:\..." style={{ ...inp, padding: "6px" }} />
                        <button onClick={addChemin} style={{ background: "#d97706", color: "white", border: "none", borderRadius: "6px", padding: "0 10px" }}>+</button>
                      </div>
                    </div>
                    <label style={{ background: "white", border: "2px dashed #d97706", color: "#d97706", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>
                      <input type="file" style={{ display: "none" }} onChange={handleFileUpload} /> {uploading ? "Chargement..." : "📎 Uploader PDF/Image"}
                    </label>
                  </div>
                )}
              </div>
              <textarea readOnly={isReadOnly} value={data.notes} onChange={e => setData({...data, notes: e.target.value})} placeholder="Notes internes..." style={{ ...inp, height: "80px", borderStyle: "dashed" }} />
            </div>
          )}

          {activeSubTab === "referentiel" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <p><strong>Niveau attendu :</strong> {guide.niveau}</p>
                <p><strong>Preuves suggérées :</strong> {guide.preuves}</p>
                {!isAuditMode && <div style={{ background: "#fef2f2", padding: "15px", borderRadius: "8px", color: "#991b1b", marginTop: "15px" }}>⚠️ <strong>Règle Non-Conformité :</strong> {guide.nonConformite}</div>}
              </div>
              <textarea readOnly={isReadOnly} value={data.attendus} onChange={e => setData({...data, attendus: e.target.value})} placeholder="Remarques précédents audits..." style={{ ...inp, height: "100px" }} />
            </div>
          )}

          {activeSubTab === "historique" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(!data.historique || data.historique.length === 0) ? (
                <div style={{ fontSize: "13px", color: "#9ca3af", fontStyle: "italic", textAlign: "center", padding: "20px" }}>Aucun historique disponible.</div>
              ) : (
                [...data.historique].reverse().map((h, i) => (
                  <div key={i} style={{ fontSize: "12px", background: "white", padding: "10px", borderLeft: "4px solid #3b82f6", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span>{h.msg}</span>
                    <span style={{ color: "#9ca3af" }}>{h.user.split('@')[0]} • {new Date(h.date).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding: "20px 24px", background: "white", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <button disabled={!hasPrev} onClick={() => onSave(data, "prev")} style={{ padding: "10px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", cursor: "pointer", color: hasPrev ? "#1e3a5f" : "#9ca3af" }}>⬅️ Précédent</button>
            <button disabled={!hasNext} onClick={() => onSave(data, "next")} style={{ padding: "10px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", cursor: "pointer", color: hasNext ? "#1e3a5f" : "#9ca3af" }}>Suivant ➡️</button>
          </div>
          <button onClick={() => onSave(data, "close")} style={{ padding: "10px 30px", borderRadius: "8px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white", border: "none", fontWeight: "bold", cursor: "pointer" }}>{isReadOnly || isAuditMode ? "Fermer" : "Enregistrer & Fermer"}</button>
        </div>
      </div>
    </div>
  );
}
