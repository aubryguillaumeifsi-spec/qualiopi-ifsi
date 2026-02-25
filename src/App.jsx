import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";
import { useState, useEffect, useRef } from "react";
import { getDoc, setDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, DOC_REF } from "./firebase";
import { NOM_ETABLISSEMENT, TODAY, RESPONSABLES, DEFAULT_CRITERES, CRITERES_LABELS, STATUT_CONFIG } from "./data";

function GaugeChart({ value, max, color }) {
  const pct = (value / max) * 100, r = 38, circ = 2 * Math.PI * r;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
      <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="9" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} strokeLinecap="round" transform="rotate(-90 48 48)" style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x="48" y="52" textAnchor="middle" fill="#1e3a5f" fontSize="15" fontWeight="700" fontFamily="Outfit">{Math.round(pct)}%</text>
    </svg>
  );
}

function StatusBadge({ statut }) {
  const s = STATUT_CONFIG[statut];
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>{s.label}</span>;
}

function ProgressBar({ value, max, color }) {
  return <div style={{ background: "#f1f5f9", borderRadius: "4px", height: "7px", overflow: "hidden" }}><div style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color, height: "100%", borderRadius: "4px", transition: "width 0.8s ease" }} /></div>;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [campaigns, setCampaigns] = useState(null);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterCritere, setFilterCritere] = useState("tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalCritere, setModalCritere] = useState(null);
  const [isAuditMode, setIsAuditMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        loadData();
      } else {
        setIsLoggedIn(false);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  async function loadData() {
    try {
      const snap = await getDoc(DOC_REF);
      if (snap.exists()) {
        const d = snap.data();
        if (d.campaigns && d.campaigns.length > 0) {
          setCampaigns(d.campaigns);
          setActiveCampaignId(d.campaigns[d.campaigns.length - 1].id);
        } else if (d.liste) {
          const mig = [{ id: Date.now().toString(), name: "Évaluation initiale", liste: d.liste, locked: false }];
          setCampaigns(mig);
          setActiveCampaignId(mig[0].id);
        } else {
          initDefault();
        }
      } else {
        initDefault();
      }
    } catch (e) {
      console.error("Erreur Firebase:", e);
      initDefault();
    }
  }

  function initDefault() {
    const def = [{ id: Date.now().toString(), name: "Évaluation initiale", liste: DEFAULT_CRITERES, locked: false }];
    setCampaigns(def);
    setActiveCampaignId(def[0].id);
  }

  async function saveData(newCampaigns) {
    setCampaigns(newCampaigns);
    setSaveStatus("saving");
    try {
      await setDoc(DOC_REF, { campaigns: newCampaigns, updatedAt: new Date().toISOString() });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error("Erreur sauvegarde:", e);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  function handleLogout() { signOut(auth); }

  function handleNewCampaign(e) {
    if (e.target.value === "NEW") {
      const name = prompt("Nom de la nouvelle certification (ex: Audit de Surveillance 2026) :");
      if (name && name.trim() !== "") {
        const latest = campaigns[campaigns.length - 1]; 
        const duplicatedListe = latest.liste.map(c => ({
          ...c,
          statut: "non-evalue" 
        }));
        const locked = campaigns.map(c => ({ ...c, locked: true }));
        const newCamp = {
          id: Date.now().toString(),
          name: name.trim(),
          liste: duplicatedListe,
          locked: false
        };
        const newCampaigns = [...locked, newCamp];
        saveData(newCampaigns);
        setActiveCampaignId(newCamp.id);
      } else {
        e.target.value = activeCampaignId;
      }
    } else {
      setActiveCampaignId(e.target.value);
    }
  }

  function handleDeleteCampaign() {
    if (campaigns.length <= 1) {
      alert("Vous ne pouvez pas supprimer la seule évaluation existante.");
      return;
    }
    const currentName = campaigns.find(c => c.id === activeCampaignId)?.name;
    const confirmDelete = window.confirm(`⚠️ ATTENTION ⚠️\n\nÊtes-vous sûr de vouloir supprimer définitivement l'évaluation :\n"${currentName}" ?\n\nToutes les données de cette session seront perdues. Cette action est IRRÉVERSIBLE.`);
    
    if (confirmDelete) {
      const updatedCampaigns = campaigns.filter(c => c.id !== activeCampaignId);
      const newActiveId = updatedCampaigns[updatedCampaigns.length - 1].id;
      saveData(updatedCampaigns);
      setActiveCampaignId(newActiveId);
    }
  }

  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;
  if (campaigns === null || activeCampaignId === null) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Outfit,sans-serif" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div><div style={{ fontSize: "14px", color: "#6b7280" }}>Chargement des données...</div></div>
    </div>
  );

  const currentCampaign = campaigns.find(c => c.id === activeCampaignId);
  const criteres = currentCampaign.liste;
  const isArchive = currentCampaign.locked;

  function saveModal(updated) {
    if (isArchive) return; 
    const newListe = criteres.map(c => c.id === updated.id ? updated : c);
    const newCampaigns = campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp);
    saveData(newCampaigns);
    setModalCritere(null);
  }

  // NOUVELLE FONCTION : EXPORT EXCEL PROPRE (.xlsx)
  function exportToExcel() {
    if (!criteres) return;
    if (typeof window.XLSX === "undefined") {
      alert("La fonction d'export est en cours de chargement. Veuillez patienter une seconde.");
      return;
    }

    // 1. Création des entêtes
    const headers = ["Indicateur", "Critère Qualiopi", "Titre", "Statut", "Échéance", "Responsables", "Preuves finalisées", "Preuves en cours", "Remarques Évaluateur", "Notes internes"];
    
    // 2. Création des lignes de données (sans les balises d'échappement CSV)
    const dataRows = criteres.map(c => [
      c.num,
      `Critère ${c.critere}`,
      c.titre,
      STATUT_CONFIG[c.statut]?.label || c.statut,
      new Date(c.delai).toLocaleDateString("fr-FR"),
      (c.responsables || []).map(r => r.split("(")[0].trim()).join(", "),
      c.preuves || "",
      c.preuves_encours || "",
      c.attendus || "",
      c.notes || ""
    ]);

    // 3. Combiner Entêtes et Lignes
    const worksheetData = [headers, ...dataRows];
    const ws = window.XLSX.utils.aoa_to_sheet(worksheetData);

    // 4. LA MAGIE : Définir la largeur des colonnes (en caractères)
    ws['!cols'] = [
      { wch: 12 },  // Indicateur
      { wch: 16 },  // Critère
      { wch: 45 },  // Titre (plus large)
      { wch: 15 },  // Statut
      { wch: 12 },  // Échéance
      { wch: 25 },  // Responsables
      { wch: 50 },  // Preuves finalisées
      { wch: 50 },  // Preuves en cours
      { wch: 40 },  // Remarques
      { wch: 40 }   // Notes internes
    ];

    // 5. Création du fichier et téléchargement
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Suivi Qualiopi");
    
    const safeName = currentCampaign.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `Qualiopi_Export_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    window.XLSX.writeFile(wb, fileName);
  }

  const today = new Date();
  const days = d => Math.round((new Date(d) - today) / 86400000);
  const dayColor = d => days(d) < 0 ? "#dc2626" : days(d) < 30 ? "#d97706" : "#6b7280";
  const stats = {
    total: criteres.length,
    conforme: criteres.filter(c => c.statut === "conforme").length,
    enCours: criteres.filter(c => c.statut === "en-cours").length,
    nonConforme: criteres.filter(c => c.statut === "non-conforme").length,
    nonEvalue: criteres.filter(c => c.statut === "non-evalue").length,
  };
  const urgents = criteres.filter(c => days(c.delai) <= 30 && c.statut !== "conforme" && c.statut !== "non-evalue");
  const filtered = criteres.filter(c => {
    if (filterStatut !== "tous" && c.statut !== filterStatut) return false;
    if (filterCritere !== "tous" && c.critere !== parseInt(filterCritere)) return false;
    if (searchTerm && !c.titre.toLowerCase().includes(searchTerm.toLowerCase()) && !c.num.includes(searchTerm)) return false;
    return true;
  });
  const axes = criteres.filter(c => c.statut === "non-conforme" || c.statut === "en-cours")
    .sort((a, b) => ({ "non-conforme": 0, "en-cours": 1 }[a.statut] - { "non-conforme": 0, "en-cours": 1 }[b.statut] || new Date(a.delai) - new Date(b.delai)));
  const byResp = RESPONSABLES.map(r => ({
    name: r, nom: r.split("(")[0].trim(), role: r.match(/\(([^)]+)\)/)?.[1] || "",
    items: criteres.filter(c => c.responsables.includes(r)),
  })).filter(r => r.items.length > 0);
  const sansResp = criteres.filter(c => !c.responsables || c.responsables.length === 0);

  const navBtn = active => ({ padding: "8px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "Outfit,sans-serif", background: active ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "transparent", color: active ? "white" : "#4b5563", whiteSpace: "nowrap" });
  const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const nb = col => ({ padding: "4px 10px", background: `${col}15`, color: col, borderRadius: "6px", fontSize: "12px", fontWeight: "800", textAlign: "center", border: `1px solid ${col}30`, flexShrink: 0, whiteSpace: "nowrap" });
  const th = { textAlign: "left", padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "2px solid #f1f5f9", background: "#fafafa" };
  const td = { padding: "11px 14px", fontSize: "13px", borderBottom: "1px solid #f8fafc", verticalAlign: "middle", color: "#374151" };
  const sel = { background: "white", border: "1px solid #d1d5db", borderRadius: "7px", color: "#374151", padding: "7px 10px", fontSize: "12px", cursor: "pointer" };

  const SaveIndicator = () => {
    if (saveStatus === "idle") return null;
    const cfg = { saving: ["#6b7280","Sauvegarde..."], saved: ["#065f46","Sauvegarde"], error: ["#991b1b","Erreur"] }[saveStatus];
    return <span className="no-print" style={{ fontSize: "11px", color: cfg[0], background: saveStatus==="saved"?"#d1fae5":saveStatus==="error"?"#fee2e2":"#f3f4f6", border:`1px solid ${saveStatus==="saved"?"#6ee7b7":saveStatus==="error"?"#fca5a5":"#d1d5db"}`, borderRadius:"6px", padding:"3px 10px", marginLeft:"10px" }}>{saveStatus==="saved"?"✓":saveStatus==="saving"?"⟳":"✕"} {cfg[1]}</span>;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif", color: "#1e3a5f" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { size: portrait; margin: 10mm; }
            * { box-shadow: none !important; }
            .print-break-avoid { page-break-inside: avoid; }
          }
        `}
      </style>

      {modalCritere && <DetailModal critere={modalCritere} onClose={() => setModalCritere(null)} onSave={saveModal} isReadOnly={isArchive} isAuditMode={isAuditMode} />}

      <div className="no-print" style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 32px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ maxWidth: "1440px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", gap: "20px", flexWrap: "wrap" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width="36" height="36"><defs><linearGradient id="g" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#1d4ed8"/><stop offset="100%" stopColor="#3b82f6"/></linearGradient></defs><path fill="url(#g)" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "#1e3a5f", display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                Qualiopi Tracker 
                <span style={{ fontSize: "10px", color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: "6px", marginLeft: "8px", border: "1px solid #e2e8f0", letterSpacing: "0.5px" }}>V1.4</span>
                <span style={{ margin: "0 8px", color: "#d1d5db" }}>—</span> 
                {NOM_ETABLISSEMENT}
                <SaveIndicator />
              </div>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>Référentiel National Qualité · 32 indicateurs</div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "10px", borderLeft: "2px solid #f1f5f9", paddingLeft: "16px" }}>
              <select value={activeCampaignId || ""} onChange={handleNewCampaign} style={{ ...sel, fontWeight: "700", color: "#1d4ed8", borderColor: "#bfdbfe", background: "#eff6ff", padding: "8px 14px", outline: "none" }}>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.locked ? "(Archive)" : ""}</option>
                ))}
                <option disabled>──────────</option>
                <option value="NEW">➕ Nouvelle certification...</option>
              </select>
              
              {campaigns.length > 1 && (
                <button onClick={handleDeleteCampaign} className="no-print" title="Supprimer définitivement cette évaluation" style={{ background: "white", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontSize: "14px", color: "#ef4444", padding: "6px 8px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = '#fef2f2'} onMouseOut={e => e.currentTarget.style.background = 'white'}>
                  🗑️
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
            {[["dashboard","Tableau de bord"],["criteres","Indicateurs"],["axes","Axes prioritaires"],["responsables","Responsables"]].map(([t, l]) => (
              <button key={t} style={navBtn(activeTab === t)} onClick={() => setActiveTab(t)}>{l}</button>
            ))}
            
            <button onClick={() => setIsAuditMode(!isAuditMode)} style={{ ...navBtn(false), color: isAuditMode ? "#065f46" : "#4b5563", background: isAuditMode ? "#d1fae5" : "transparent", fontSize: "12px", marginLeft: "16px", border: `1px solid ${isAuditMode ? "#6ee7b7" : "#e2e8f0"}`, display: "flex", alignItems: "center", gap: "6px", transition: "all 0.3s" }}>
              <span>{isAuditMode ? "🕵️‍♂️ Mode Audit : ON" : "🕵️‍♂️ Mode Audit"}</span>
            </button>

            <div style={{ display: "flex", gap: "6px", marginLeft: "8px" }}>
              <button onClick={exportToExcel} style={{ ...navBtn(false), color: "#059669", background: "#d1fae5", fontSize: "12px", border: "1px solid #6ee7b7", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📊</span> Excel
              </button>
              <button onClick={() => window.print()} style={{ ...navBtn(false), color: "#1d4ed8", background: "#eff6ff", fontSize: "12px", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📄</span> PDF
              </button>
            </div>
            
            <button onClick={handleLogout} style={{ ...navBtn(false), color: "#9ca3af", fontSize: "12px", marginLeft: "8px", border: "1px solid #e2e8f0" }}>Déconnexion</button>
          </div>
        </div>
      </div>

      {isArchive && (
        <div className="no-print" style={{ background: "#fef2f2", borderBottom: "1px solid #fca5a5", color: "#991b1b", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "700", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
          <span>🔒</span> Mode Lecture Seule : Cette évaluation est une archive historique. Les modifications sont bloquées.
        </div>
      )}

      {isAuditMode && !isArchive && (
        <div className="no-print" style={{ background: "#d1fae5", borderBottom: "1px solid #6ee7b7", color: "#065f46", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "700", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
          <span>✅</span> Mode Audit Activé : Les notes internes et preuves en cours sont masquées de l'affichage.
        </div>
      )}

      <div className={modalCritere ? "no-print" : ""} style={{ maxWidth: "1440px", margin: "0 auto", padding: "28px 32px" }}>

        {activeTab === "dashboard" && <>
          <div className="print-break-avoid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "14px", marginBottom: "24px" }}>
            {[["#6b7280","#f3f4f6","#d1d5db",stats.nonEvalue,"Non évalués"],["#065f46","#d1fae5","#6ee7b7",stats.conforme,"Conformes"],["#92400e","#fef3c7","#fcd34d",stats.enCours,"En cours"],["#991b1b","#fee2e2","#fca5a5",stats.nonConforme,"Non conformes"],["#b45309","#fef9c3","#fde68a",urgents.length,"Urgents moins 30j"]].map(([color,bg,border,num,label]) => (
              <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "12px", padding: "20px 22px", opacity: isArchive ? 0.8 : 1 }}>
                <div style={{ fontSize: "34px", fontWeight: "900", color, lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: "11px", color, opacity: 0.8, marginTop: "5px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600" }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div className="print-break-avoid" style={card}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>Score de conformité global</div>
              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <GaugeChart value={stats.conforme} max={stats.total} color="#1d4ed8" />
                <div style={{ flex: 1 }}>
                  {[["Non évalué",stats.nonEvalue,"#9ca3af"],["Conforme",stats.conforme,"#059669"],["En cours",stats.enCours,"#d97706"],["Non conforme",stats.nonConforme,"#dc2626"]].map(([l,v,col]) => (
                    <div key={l} style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}><span>{l}</span><span style={{ fontWeight: "600", color: col }}>{v}/{stats.total}</span></div>
                      <ProgressBar value={v} max={stats.total} color={col} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="print-break-avoid" style={card}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>Avancement par critère</div>
              {Object.entries(CRITERES_LABELS).map(([num, cfg]) => {
                const cr = criteres.filter(c => c.critere === parseInt(num));
                const ok = cr.filter(c => c.statut === "conforme").length;
                return (
                  <div key={num} style={{ marginBottom: "11px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "600" }}>C{num} — {cfg.label}</span>
                      <span style={{ color: cfg.color, fontWeight: "700" }}>{ok}/{cr.length}</span>
                    </div>
                    <ProgressBar value={ok} max={cr.length} color={cfg.color} />
                  </div>
                );
              })}
            </div>
          </div>
          {(!isArchive && urgents.length > 0) && (
            <div className="print-break-avoid" style={card}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f", marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>Indicateurs urgents — moins de 30 jours</div>
              {urgents.map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "8px", background: c.statut==="non-conforme"?"#fff5f5":"#fffbeb", border:`1px solid ${c.statut==="non-conforme"?"#fca5a5":"#fcd34d"}`, marginBottom: "8px" }}>
                  <span style={nb(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: "600", fontSize: "13px" }}>{c.titre}</div><div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>{c.responsables.length > 0 ? c.responsables.map(r => r.split("(")[0].trim()).join(", ") : "Aucun responsable"}</div></div>
                  <StatusBadge statut={c.statut} />
                  <span style={{ fontSize: "11px", color: dayColor(c.delai), fontWeight: "700", minWidth: "70px", textAlign: "right" }}>{days(c.delai) < 0 ? `${Math.abs(days(c.delai))}j dépassé` : `J-${days(c.delai)}`}</span>
                  <button className="no-print" onClick={() => setModalCritere(c)} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", color: "#1d4ed8", padding: "4px 12px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>Éditer</button>
                </div>
              ))}
            </div>
          )}
        </>}

        {activeTab === "criteres" && <>
          <div className="no-print" style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ background: "white", border: "1px solid #d1d5db", borderRadius: "7px", color: "#374151", padding: "7px 12px", fontSize: "13px", width: "220px", outline: "none" }} />
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={sel}><option value="tous">Tous les statuts</option>{Object.entries(STATUT_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select>
            <select value={filterCritere} onChange={e => setFilterCritere(e.target.value)} style={sel}><option value="tous">Tous les critères</option>{Object.entries(CRITERES_LABELS).map(([n,c]) => <option key={n} value={n}>C{n} — {c.label}</option>)}</select>
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>{filtered.length} indicateur(s)</span>
          </div>
          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["N°","Indicateur","Responsable(s)","Échéance","Statut","Preuves"].map(h => <th key={h} style={th}>{h}</th>)}<th style={th} className="no-print"></th></tr></thead>
              <tbody>
                {filtered.map(c => {
                  const col = CRITERES_LABELS[c.critere].color, d = days(c.delai);
                  return (
                    <tr key={c.id} className="print-break-avoid" onMouseOver={e => e.currentTarget.style.background="#f8fafc"} onMouseOut={e => e.currentTarget.style.background="white"}>
                      <td style={{ ...td, width: "110px" }}><span style={nb(col)}>{c.num}</span></td>
                      <td style={{ ...td, maxWidth: "280px" }}><div style={{ fontWeight: "600", color: "#1e3a5f", marginBottom: "2px" }}>{c.titre}</div><div style={{ fontSize: "11px", color: "#9ca3af" }}>{CRITERES_LABELS[c.critere].label}</div></td>
                      <td style={{ ...td, maxWidth: "200px" }}>
                        {c.responsables.length === 0
                          ? <span style={{ fontSize: "11px", color: "#d97706", fontWeight: "600", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "5px", padding: "2px 8px" }}>À assigner</span>
                          : <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>{c.responsables.slice(0,2).map(r => <span key={r} style={{ fontSize: "10px", color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "4px", padding: "2px 6px" }}>{r.split("(")[0].trim()}</span>)}{c.responsables.length > 2 && <span style={{ fontSize: "10px", color: "#6b7280", background: "#f3f4f6", borderRadius: "4px", padding: "2px 6px" }}>+{c.responsables.length-2}</span>}</div>}
                      </td>
                      <td style={td}><div style={{ fontSize: "12px" }}>{new Date(c.delai).toLocaleDateString("fr-FR")}</div><div style={{ fontSize: "10px", color: dayColor(c.delai), fontWeight: "600" }}>{d < 0 ? `${Math.abs(d)}j dépassé` : `J-${d}`}</div></td>
                      <td style={td}><StatusBadge statut={c.statut} /></td>
                      <td style={td}>
                        {c.preuves?.trim() ? (
                          <span style={{ fontSize: "10px", color: "#065f46", background: "#d1fae5", padding: "2px 8px", borderRadius: "5px", border: "1px solid #6ee7b7" }}>Finalisées</span>
                        ) : c.preuves_encours?.trim() ? (
                          <span style={{ fontSize: "10px", color: "#92400e", background: "#fef3c7", padding: "2px 8px", borderRadius: "5px", border: "1px solid #fcd34d" }}>En cours</span>
                        ) : (
                          <span style={{ fontSize: "10px", color: "#9ca3af" }}>Vides</span>
                        )}
                      </td>
                      <td className="no-print" style={{ ...td, width: "80px" }}>
                        <button onClick={() => setModalCritere(c)} style={{ background: isArchive ? "#f1f5f9" : "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: isArchive ? "1px solid #d1d5db" : "none", borderRadius: "6px", color: isArchive ? "#4b5563" : "white", padding: "5px 14px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
                          {isArchive ? "Consulter" : "Éditer"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>}

        {activeTab === "axes" && <>
          <div style={{ marginBottom: "22px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>Axes prioritaires d'amélioration</h2>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>{stats.nonConforme} non conforme(s) · {stats.enCours} en cours</p>
          </div>
          {["non-conforme","en-cours"].map(st => {
            const items = axes.filter(c => c.statut === st);
            if (items.length === 0) return null;
            const isNC = st === "non-conforme";
            return (
              <div key={st}>
                <div className="print-break-avoid" style={{ fontSize: "12px", color: isNC?"#991b1b":"#92400e", fontWeight: "700", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: isNC?"#dc2626":"#d97706" }} />
                  {isNC ? "Non conformes — Action immédiate" : "En cours — À finaliser"}
                </div>
                {items.map(c => (
                  <div key={c.id} className="print-break-avoid" style={{ background: "white", border: `1px solid ${isNC?"#fca5a5":"#fcd34d"}`, borderLeft: `4px solid ${isNC?"#dc2626":"#d97706"}`, borderRadius: "10px", padding: "16px 20px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <span style={nb(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f", marginBottom: "4px" }}>{c.titre}</div>
                        <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "8px" }}>{CRITERES_LABELS[c.critere].label}</div>
                        
                        {(!isAuditMode && c.attendus) && <div style={{ fontSize: "12px", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "6px", padding: "8px 12px", marginBottom: "6px" }}><span style={{ fontWeight: "700", color: "#92400e" }}>Remarques Évaluateur : </span>{c.attendus}</div>}
                        {c.preuves && <div style={{ fontSize: "12px", background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "6px", padding: "8px 12px", marginBottom: "6px" }}><span style={{ fontWeight: "700", color: "#065f46" }}>{isAuditMode ? "Preuves :" : "Preuves finalisées :"} </span>{c.preuves}</div>}
                        {(!isAuditMode && c.preuves_encours) && <div style={{ fontSize: "12px", background: "#fefce8", border: "1px solid #fde68a", borderRadius: "6px", padding: "8px 12px", marginBottom: "6px" }}><span style={{ fontWeight: "700", color: "#d97706" }}>Preuves en cours : </span>{c.preuves_encours}</div>}
                        
                        {(!c.preuves && (!c.preuves_encours || isAuditMode)) && <div style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic" }}>Aucune preuve renseignée</div>}
                      </div>
                      <div style={{ textAlign: "right", minWidth: "140px", flexShrink: 0 }}>
                        <StatusBadge statut={c.statut} />
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>{new Date(c.delai).toLocaleDateString("fr-FR")}</div>
                        <div style={{ fontSize: "10px", color: dayColor(c.delai), fontWeight: "700" }}>{days(c.delai) < 0 ? `${Math.abs(days(c.delai))}j dépassé` : `J-${days(c.delai)}`}</div>
                        <button className="no-print" onClick={() => setModalCritere(c)} style={{ marginTop: "8px", background: isArchive ? "#f1f5f9" : (isNC?"#fff5f5":"#fffbeb"), border:`1px solid ${isArchive ? "#d1d5db" : (isNC?"#fca5a5":"#fcd34d")}`, borderRadius: "6px", color: isArchive ? "#4b5563" : (isNC?"#dc2626":"#92400e"), padding: "4px 12px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>
                          {isArchive ? "Consulter" : "Éditer"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ height: "16px" }} />
              </div>
            );
          })}
        </>}

        {activeTab === "responsables" && <>
          <div style={{ marginBottom: "22px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>Vue par responsable</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(420px,1fr))", gap: "16px" }}>
            {byResp.map(r => {
              const conformes = r.items.filter(c => c.statut==="conforme").length;
              const nonConformes = r.items.filter(c => c.statut==="non-conforme").length;
              const enCours = r.items.filter(c => c.statut==="en-cours").length;
              return (
                <div key={r.name} className="print-break-avoid" style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", color: "white", flexShrink: 0 }}>{r.nom.split(" ").map(n=>n[0]).join("").substring(0,2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f" }}>{r.nom}</div><div style={{ fontSize: "11px", color: "#9ca3af" }}>{r.role}</div></div>
                  </div>
                  <ProgressBar value={conformes} max={r.items.length} color="#1d4ed8" />
                  <div style={{ marginTop: "12px" }}>
                    {r.items.sort((a,b) => ({"non-conforme":0,"en-cours":1,"non-evalue":2,"conforme":3}[a.statut])-({"non-conforme":0,"en-cours":1,"non-evalue":2,"conforme":3}[b.statut])).map(c => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderBottom: "1px solid #f8fafc" }}>
                        <span style={nb(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
                        <div style={{ flex: 1, fontSize: "12px", color: "#374151" }}>{c.titre}</div>
                        <StatusBadge statut={c.statut} />
                        <button className="no-print" onClick={() => setModalCritere(c)} style={{ background: isArchive ? "#f1f5f9" : "white", border: "1px solid #e2e8f0", borderRadius: "5px", color: isArchive ? "#4b5563" : "#1d4ed8", padding: "3px 10px", fontSize: "10px", cursor: "pointer", fontWeight: "600" }}>
                          {isArchive ? "Vue" : "Éditer"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>}
      </div>
    </div>
  );
}
