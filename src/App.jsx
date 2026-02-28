import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";
import { useState, useEffect, useRef } from "react";
import { getDoc, setDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, DOC_REF } from "./firebase";
import { NOM_ETABLISSEMENT, TODAY, RESPONSABLES, DEFAULT_CRITERES, CRITERES_LABELS, STATUT_CONFIG, ROLE_COLORS } from "./data";

function GaugeChart({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0, r = 38, circ = 2 * Math.PI * r;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
      <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="9" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} strokeLinecap="round" transform="rotate(-90 48 48)" style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x="48" y="52" textAnchor="middle" fill="#1e3a5f" fontSize="15" fontWeight="700" fontFamily="Outfit">{Math.round(pct)}%</text>
    </svg>
  );
}

function StatusBadge({ statut }) {
  const s = STATUT_CONFIG[statut] || STATUT_CONFIG["non-evalue"];
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
      if (user) { setIsLoggedIn(true); loadData(); } 
      else { setIsLoggedIn(false); }
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
          setCampaigns(d.campaigns); setActiveCampaignId(d.campaigns[d.campaigns.length - 1].id);
        } else if (d.liste) {
          const mig = [{ id: Date.now().toString(), name: "Évaluation initiale", auditDate: "2026-10-15", liste: d.liste, locked: false }];
          setCampaigns(mig); setActiveCampaignId(mig[0].id);
        } else { initDefault(); }
      } else { initDefault(); }
    } catch (e) { initDefault(); }
  }

  function initDefault() {
    const def = [{ id: Date.now().toString(), name: "Évaluation initiale", auditDate: "2026-10-15", liste: DEFAULT_CRITERES, locked: false }];
    setCampaigns(def); setActiveCampaignId(def[0].id);
  }

  async function saveData(newCampaigns) {
    setCampaigns(newCampaigns); setSaveStatus("saving");
    try {
      await setDoc(DOC_REF, { campaigns: newCampaigns, updatedAt: new Date().toISOString() });
      setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  function handleLogout() { signOut(auth); }

  function handleNewCampaign(e) {
    if (e.target.value === "NEW") {
      const name = prompt("Nom de la nouvelle certification (ex: Audit de Surveillance 2026) :");
      if (name && name.trim() !== "") {
        const defaultDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0];
        const auditDate = prompt("Date prévue pour cet audit (format AAAA-MM-JJ) :", defaultDate) || defaultDate;

        const latest = campaigns[campaigns.length - 1]; 
        
        const duplicatedListe = latest.liste.map(c => {
          const oldFiles = (c.fichiers || []).map(f => ({ ...f, archive: true }));
          return { 
            ...c, 
            statut: c.statut === "non-concerne" ? "non-concerne" : "en-cours",
            fichiers: oldFiles,
            preuves: "", 
            preuves_encours: c.preuves ? `[Preuves précédentes à mettre à jour]\n${c.preuves}` : c.preuves_encours 
          };
        });

        const locked = campaigns.map(c => ({ ...c, locked: true }));
        const newCamp = { id: Date.now().toString(), name: name.trim(), auditDate: auditDate, liste: duplicatedListe, locked: false };
        const newCampaigns = [...locked, newCamp];
        saveData(newCampaigns); setActiveCampaignId(newCamp.id);
      } else { e.target.value = activeCampaignId; }
    } else { setActiveCampaignId(e.target.value); }
  }

  function handleDeleteCampaign() {
    if (campaigns.length <= 1) { alert("Vous ne pouvez pas supprimer la seule évaluation existante."); return; }
    const currentName = campaigns.find(c => c.id === activeCampaignId)?.name;
    if (window.confirm(`⚠️ ATTENTION ⚠️\n\nÊtes-vous sûr de vouloir supprimer l'évaluation :\n"${currentName}" ?\n\nAction IRRÉVERSIBLE.`)) {
      const updatedCampaigns = campaigns.filter(c => c.id !== activeCampaignId);
      saveData(updatedCampaigns); setActiveCampaignId(updatedCampaigns[updatedCampaigns.length - 1].id);
    }
  }

  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;
  if (campaigns === null || activeCampaignId === null) return <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>⏳ Chargement...</div>;

  const currentCampaign = campaigns.find(c => c.id === activeCampaignId) || campaigns[0];
  const criteres = currentCampaign.liste || [];
  const isArchive = currentCampaign.locked || false;
  const currentAuditDate = currentCampaign.auditDate || "2026-10-15"; 

  function saveModal(updated) {
    if (isArchive) return; 
    const newListe = criteres.map(c => c.id === updated.id ? updated : c);
    saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp));
    setModalCritere(null);
  }

  function handleDragStart(e, critereId) { e.dataTransfer.setData("critereId", critereId.toString()); }
  function handleDragOver(e) { e.preventDefault(); }
  function handleDrop(e, newStatut) {
    e.preventDefault();
    if (isArchive) return;
    const critereId = e.dataTransfer.getData("critereId");
    if (!critereId) return;
    const newListe = criteres.map(c => c.id.toString() === critereId ? { ...c, statut: newStatut } : c);
    saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp));
  }

  function handleEditAuditDate() {
    if (isArchive) return;
    const newDate = prompt("Modifier la date de l'audit (format AAAA-MM-JJ) :", currentAuditDate);
    if (newDate) {
      if (isNaN(new Date(newDate).getTime())) { alert("Format de date invalide. Veuillez utiliser AAAA-MM-JJ."); return; }
      const newCampaigns = campaigns.map(c => c.id === activeCampaignId ? { ...c, auditDate: newDate } : c);
      saveData(newCampaigns);
    }
  }

  const today = new Date();
  const days = d => {
    if (!d) return NaN;
    const p = new Date(d);
    if (isNaN(p.getTime())) return NaN;
    return Math.round((p - today) / 86400000);
  };
  
  const dayColor = d => {
    const daysLeft = days(d);
    if (isNaN(daysLeft)) return "#6b7280";
    return daysLeft < 0 ? "#dc2626" : daysLeft < 30 ? "#d97706" : "#6b7280";
  };
  
  const auditDateObj = new Date(currentAuditDate);
  const daysToAudit = Math.ceil((auditDateObj - today) / 86400000);
  let bannerConfig = { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", icon: "🗓️", text: `Audit Qualiopi dans ${daysToAudit} jour(s)` };
  if (daysToAudit < 0) { bannerConfig = { bg: "#f3f4f6", border: "#d1d5db", color: "#4b5563", icon: "🏁", text: `L'audit a eu lieu il y a ${Math.abs(daysToAudit)} jour(s)` }; } 
  else if (daysToAudit <= 30) { bannerConfig = { bg: "#fee2e2", border: "#fca5a5", color: "#991b1b", icon: "🚨", text: `URGENT : Audit Qualiopi dans ${daysToAudit} jour(s) !` }; } 
  else if (daysToAudit <= 90) { bannerConfig = { bg: "#fff7ed", border: "#fed7aa", color: "#c2410c", icon: "⏳", text: `L'audit approche : plus que ${daysToAudit} jour(s)` }; }

  const nbConcerne = criteres.filter(c => c.statut !== "non-concerne").length;
  const baseTotal = nbConcerne === 0 ? 1 : nbConcerne; 

  const stats = {
    total: baseTotal, 
    conforme: criteres.filter(c => c.statut === "conforme").length, 
    enCours: criteres.filter(c => c.statut === "en-cours").length,
    nonConforme: criteres.filter(c => c.statut === "non-conforme").length, 
    nonEvalue: criteres.filter(c => c.statut === "non-evalue").length,
    nonConcerne: criteres.filter(c => c.statut === "non-concerne").length
  };
  
  const urgents = criteres.filter(c => {
    const d = days(c.delai);
    return !isNaN(d) && d <= 30 && c.statut !== "conforme" && c.statut !== "non-evalue" && c.statut !== "non-concerne";
  });
  
  const filtered = criteres.filter(c => {
    if (filterStatut !== "tous" && c.statut !== filterStatut) return false;
    if (filterCritere !== "tous" && c.critere !== parseInt(filterCritere)) return false;
    if (searchTerm) {
      const t = String(c.titre || "").toLowerCase();
      const n = String(c.num || "").toLowerCase();
      const s = searchTerm.toLowerCase();
      if (!t.includes(s) && !n.includes(s)) return false;
    }
    return true;
  });
  
  const axes = criteres.filter(c => c.statut === "non-conforme" || c.statut === "en-cours").sort((a, b) => ({ "non-conforme": 0, "en-cours": 1 }[a.statut] - { "non-conforme": 0, "en-cours": 1 }[b.statut] || new Date(a.delai || today) - new Date(b.delai || today)));
  
  const byResp = RESPONSABLES.map(r => ({ 
    name: r, nom: (r||"").split("(")[0].trim(), 
    role: (r||"").match(/\(([^)]+)\)/)?.[1] || "Défaut", 
    items: criteres.filter(c => (Array.isArray(c.responsables) ? c.responsables : []).includes(r)), 
  })).filter(r => r.items.length > 0);

  async function exportToExcel() {
    if (!criteres) return;
    if (typeof window.ExcelJS === "undefined") { alert("Le moteur Excel est en cours de chargement."); return; }
    const workbook = new window.ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Suivi Qualiopi');
    worksheet.columns = [
      { header: 'N°', key: 'num', width: 8 }, { header: 'Critère', key: 'critere', width: 12 }, { header: 'Indicateur', key: 'titre', width: 45 }, { header: 'Statut', key: 'statut', width: 18 },
      { header: 'Échéance', key: 'delai', width: 14 }, { header: 'Responsable(s)', key: 'resp', width: 25 }, { header: 'Preuves finalisées', key: 'preuves', width: 50 },
      { header: 'Preuves en cours', key: 'preuves_encours', width: 50 }, { header: 'Remarques Évaluateur', key: 'attendus', width: 45 }, { header: 'Notes internes', key: 'notes', width: 45 }
    ];
    const toArgb = (hex) => hex ? hex.replace('#', 'FF').toUpperCase() : 'FF000000';
    criteres.forEach(c => {
      const d = days(c.delai);
      const sConf = STATUT_CONFIG[c.statut] || STATUT_CONFIG["non-evalue"];
      const resps = Array.isArray(c.responsables) ? c.responsables : [];
      
      const row = worksheet.addRow({
        num: c.num || "", critere: `Critère ${c.critere || ""}`, titre: c.titre || "", statut: sConf.label, delai: c.statut==="non-concerne"?"-":new Date(c.delai || today).toLocaleDateString("fr-FR"),
        resp: resps.map(r => String(r).split("(")[0].trim()).join("\n"), preuves: c.preuves || "", preuves_encours: c.preuves_encours || "", attendus: c.attendus || "", notes: c.notes || ""
      });
      const cConf = CRITERES_LABELS[c.critere] || { color: "#9ca3af" }; 
      row.getCell('num').font = { color: { argb: toArgb(cConf.color) }, bold: true }; row.getCell('num').alignment = { horizontal: 'center', vertical: 'middle' }; 
      row.getCell('statut').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toArgb(sConf.bg) } }; row.getCell('statut').font = { color: { argb: toArgb(sConf.color) }, bold: true }; row.getCell('statut').alignment = { horizontal: 'center', vertical: 'middle' }; 
      const cellDelai = row.getCell('delai'); if (!isNaN(d) && d < 0 && c.statut!=="non-concerne") { cellDelai.font = { color: { argb: 'FFDC2626' }, bold: true }; } else if (!isNaN(d) && d < 30 && c.statut!=="non-concerne") { cellDelai.font = { color: { argb: 'FFD97706' }, bold: true }; }
    });
    const headerRow = worksheet.getRow(1); headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }; headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }; headerRow.alignment = { vertical: 'middle', horizontal: 'center' }; worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    worksheet.eachRow((row, rowNumber) => { row.eachCell((cell) => { cell.border = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, right: { style: 'thin', color: { argb: 'FFD1D5DB' } } }; if (rowNumber > 1) { if (!cell.alignment) { cell.alignment = { vertical: 'top', wrapText: true }; } else { cell.alignment.wrapText = true; } } }); });
    const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); const url = URL.createObjectURL(blob); const safeName = currentCampaign.name.replace(/[^a-z0-9]/gi, '_').toLowerCase(); const link = document.createElement("a"); link.href = url; link.setAttribute("download", `Qualiopi_Export_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  const navBtn = active => ({ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "Outfit,sans-serif", background: active ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "transparent", color: active ? "white" : "#4b5563", whiteSpace: "nowrap" });
  const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const nb = col => ({ padding: "4px 10px", background: `${col}15`, color: col, borderRadius: "6px", fontSize: "12px", fontWeight: "800", textAlign: "center", border: `1px solid ${col}30`, flexShrink: 0, whiteSpace: "nowrap" });
  const th = { textAlign: "left", padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "2px solid #f1f5f9", background: "#fafafa" };
  const td = { padding: "11px 14px", fontSize: "13px", borderBottom: "1px solid #f8fafc", verticalAlign: "middle", color: "#374151" };
  const sel = { background: "white", border: "1px solid #d1d5db", borderRadius: "7px", color: "#374151", padding: "7px 10px", fontSize: "12px", cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif", color: "#1e3a5f" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @media print { .no-print { display: none !important; } body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { size: portrait; margin: 10mm; } * { box-shadow: none !important; } .print-break-avoid { page-break-inside: avoid; } }
        .kanban-card { transition: all 0.2s ease; } .kanban-card:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important; border-color: #bfdbfe !important; } .kanban-col { scrollbar-width: thin; }
      `}</style>
      
      {modalCritere && <DetailModal critere={modalCritere} onClose={() => setModalCritere(null)} onSave={saveModal} isReadOnly={isArchive} isAuditMode={isAuditMode} />}
      
      <div className="no-print" style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 32px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ maxWidth: "1440px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}><svg viewBox="0 0 24 24" width="36" height="36"><defs><linearGradient id="g" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#1d4ed8"/><stop offset="100%" stopColor="#3b82f6"/></linearGradient></defs><path fill="url(#g)" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg></div>
            <div><div style={{ fontSize: "17px", fontWeight: "800", color: "#1e3a5f", display: "flex", alignItems: "center", flexWrap: "wrap" }}>Qualiopi Tracker <span style={{ fontSize: "10px", color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: "6px", marginLeft: "8px", border: "1px solid #e2e8f0" }}>V1.6</span><span style={{ margin: "0 8px", color: "#d1d5db" }}>—</span> {NOM_ETABLISSEMENT}</div><div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>Référentiel National Qualité · 32 indicateurs</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "10px", borderLeft: "2px solid #f1f5f9", paddingLeft: "16px" }}>
              <select value={activeCampaignId || ""} onChange={handleNewCampaign} style={{ ...sel, fontWeight: "700", color: "#1d4ed8", borderColor: "#bfdbfe", background: "#eff6ff", outline: "none" }}>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name} {c.locked ? "(Archive)" : ""}</option>)}<option disabled>──────────</option><option value="NEW">➕ Nouvelle certification...</option></select>
              {campaigns.length > 1 && <button onClick={handleDeleteCampaign} className="no-print" title="Supprimer" style={{ background: "white", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontSize: "14px", color: "#ef4444", padding: "6px 8px" }}>🗑️</button>}
            </div>
          </div>
          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
            {[["dashboard","Tableau de bord"],["kanban","Vue Kanban"],["criteres","Indicateurs"],["axes","Axes prioritaires"],["responsables","Responsables"]].map(([t, l]) => <button key={t} style={navBtn(activeTab === t)} onClick={() => setActiveTab(t)}>{l}</button>)}
            <button onClick={() => setIsAuditMode(!isAuditMode)} style={{ ...navBtn(false), color: isAuditMode ? "#065f46" : "#4b5563", background: isAuditMode ? "#d1fae5" : "transparent", fontSize: "12px", marginLeft: "12px", border: `1px solid ${isAuditMode ? "#6ee7b7" : "#e2e8f0"}`, display: "flex", alignItems: "center", gap: "6px" }}><span>{isAuditMode ? "🕵️‍♂️ Mode Audit : ON" : "🕵️‍♂️ Mode Audit"}</span></button>
            <div style={{ display: "flex", gap: "6px", marginLeft: "8px" }}><button onClick={exportToExcel} style={{ ...navBtn(false), color: "#059669", background: "#d1fae5", fontSize: "12px", border: "1px solid #6ee7b7", display: "flex", gap: "6px" }}><span>📊</span> Excel</button><button onClick={() => window.print()} style={{ ...navBtn(false), color: "#1d4ed8", background: "#eff6ff", fontSize: "12px", border: "1px solid #bfdbfe", display: "flex", gap: "6px" }}><span>📄</span> PDF</button></div>
            <button onClick={handleLogout} style={{ ...navBtn(false), color: "#9ca3af", fontSize: "12px", marginLeft: "8px", border: "1px solid #e2e8f0" }}>Déconnexion</button>
          </div>
        </div>
      </div>
      
      {isArchive && <div className="no-print" style={{ background: "#fef2f2", borderBottom: "1px solid #fca5a5", color: "#991b1b", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "700" }}>🔒 Mode Lecture Seule : Cette évaluation est une archive historique.</div>}
      {isAuditMode && !isArchive && <div className="no-print" style={{ background: "#d1fae5", borderBottom: "1px solid #6ee7b7", color: "#065f46", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "700" }}>✅ Mode Audit Activé : Les notes internes et preuves en cours sont masquées.</div>}
      
      <div className={modalCritere ? "no-print" : ""} style={{ maxWidth: "1440px", margin: "0 auto", padding: "28px 32px" }}>
        
        {activeTab === "dashboard" && <>
          <div className="print-break-avoid no-print" style={{ background: bannerConfig.bg, border: `1px solid ${bannerConfig.border}`, borderRadius: "12px", padding: "16px 24px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "24px" }}>{bannerConfig.icon}</span>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: bannerConfig.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{bannerConfig.text}</div>
                <div style={{ fontSize: "12px", color: bannerConfig.color, opacity: 0.8, marginTop: "2px", fontWeight: "600" }}>Date officielle visée : {new Date(currentAuditDate).toLocaleDateString("fr-FR")}</div>
              </div>
            </div>
            {!isArchive && (
              <button onClick={handleEditAuditDate} style={{ background: "transparent", border: `1px solid ${bannerConfig.color}`, color: bannerConfig.color, padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", opacity: 0.7, transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.opacity=1} onMouseOut={e=>e.currentTarget.style.opacity=0.7}>Modifier la date</button>
            )}
          </div>

          <div className="print-break-avoid" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "12px", marginBottom: "24px" }}>
            {[["#6b7280","#f3f4f6","#d1d5db",stats.nonEvalue,"Non évalués"],["#065f46","#d1fae5","#6ee7b7",stats.conforme,"Conformes"],["#92400e","#fef3c7","#fcd34d",stats.enCours,"En cours"],["#991b1b","#fee2e2","#fca5a5",stats.nonConforme,"Non conformes"],["#475569","#e2e8f0","#cbd5e1",stats.nonConcerne,"Non concernés"],["#b45309","#fef9c3","#fde68a",urgents.length,"Urgents < 30j"]].map(([color,bg,border,num,label]) => (
              <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "10px", padding: "14px 16px", opacity: isArchive ? 0.8 : 1 }}><div style={{ fontSize: "28px", fontWeight: "900", color, lineHeight: 1 }}>{num}</div><div style={{ fontSize: "10px", color, opacity: 0.9, marginTop: "4px", textTransform: "uppercase", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div></div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div className="print-break-avoid" style={card}><div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>Score de conformité (sur les {stats.total} concernés)</div><div style={{ display: "flex", gap: "20px" }}><GaugeChart value={stats.conforme} max={stats.total} color="#1d4ed8" /><div style={{ flex: 1 }}>{[["Non évalué",stats.nonEvalue,"#9ca3af"],["Conforme",stats.conforme,"#059669"],["En cours",stats.enCours,"#d97706"],["Non conforme",stats.nonConforme,"#dc2626"], ["Non concerné",stats.nonConcerne,"#64748b"]].map(([l,v,col]) => (<div key={l} style={{ marginBottom: "8px" }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}><span>{l}</span><span style={{ fontWeight: "600", color: col }}>{l==="Non concerné" ? v : `${v}/${stats.total}`}</span></div>{l!=="Non concerné" && <ProgressBar value={v} max={stats.total} color={col} />}</div>))}</div></div></div>
            <div className="print-break-avoid" style={card}><div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>Avancement par critère (hors non-concernés)</div>{Object.entries(CRITERES_LABELS).map(([num, cfg]) => { const cr = criteres.filter(c => c.critere === parseInt(num) && c.statut !== "non-concerne"); const ok = cr.filter(c => c.statut === "conforme").length; return (<div key={num} style={{ marginBottom: "11px" }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}><span style={{ fontWeight: "600" }}>C{num} — {cfg.label}</span><span style={{ color: cfg.color, fontWeight: "700" }}>{ok}/{cr.length}</span></div><ProgressBar value={ok} max={cr.length === 0 ? 1 : cr.length} color={cfg.color} /></div>); })}</div>
          </div>
        </>}

        {activeTab === "kanban" && (
          <>
            <div style={{ marginBottom: "22px" }} className="no-print">
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>Tableau Kanban des indicateurs</h2>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Faites glisser les cartes d'une colonne à l'autre pour mettre à jour leur statut.</p>
            </div>
            
            <div style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "20px", minHeight: "70vh", alignItems: "flex-start" }} className="no-print">
              {Object.entries(STATUT_CONFIG).map(([stKey, stVal]) => {
                const items = criteres.filter(c => c.statut === stKey);
                return (
                  <div key={stKey} className="kanban-col" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stKey)} style={{ flex: "1 1 220px", minWidth: "220px", background: "#f8fafc", border: `1px solid ${stVal.border}`, borderRadius: "12px", padding: "12px", display: "flex", flexDirection: "column", gap: "12px", minHeight: "65vh", backgroundColor: stVal.bg }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `3px solid ${stVal.color}`, paddingBottom: "10px", marginBottom: "4px" }}><span style={{ fontWeight: "800", color: stVal.color, textTransform: "uppercase", fontSize: "13px", letterSpacing: "0.5px" }}>{stVal.label}</span><span style={{ background: "white", color: stVal.color, padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "800", border: `1px solid ${stVal.border}` }}>{items.length}</span></div>
                    {items.map(c => {
                      const d = days(c.delai);
                      const cConf = CRITERES_LABELS[c.critere] || { label: "Critère", color: "#9ca3af" };
                      const resps = Array.isArray(c.responsables) ? c.responsables : []; 
                      
                      return (
                        <div key={c.id} className="kanban-card" draggable={!isArchive} onDragStart={(e) => handleDragStart(e, c.id)} onClick={() => setModalCritere(c)} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", cursor: isArchive ? "pointer" : "grab", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", opacity: stKey === "non-concerne" ? 0.6 : 1 }}>
                          <div style={{ display: "flex", gap: "10px", marginBottom: "8px", alignItems: "flex-start" }}><span style={{ ...nb(cConf.color), padding: "3px 8px", fontSize: "11px" }}>{c.num || "-"}</span><div style={{ fontSize: "13px", fontWeight: "700", color: "#1e3a5f", lineHeight: "1.3" }}>{c.titre || "-"}</div></div>
                          <div style={{ fontSize: "10px", color: "#6b7280", marginBottom: "12px", paddingLeft: "2px" }}>{cConf.label}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f8fafc", paddingTop: "10px" }}>
                            <div style={{ display: "flex", gap: "4px" }}>
                              {resps.length > 0 ? resps.slice(0, 3).map(r => { const rSafe = String(r || ""); const rRole = rSafe.match(/\(([^)]+)\)/)?.[1] || "Défaut"; const rCfg = ROLE_COLORS[rRole] || ROLE_COLORS["Défaut"]; return <span key={rSafe} title={rSafe} style={{ width: "24px", height: "24px", borderRadius: "50%", background: rCfg.bg, border: `1px solid ${rCfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "800", color: rCfg.text, cursor: "help" }}>{rSafe.split(" ").map(n=>(n[0]||"")).join("").substring(0,2).toUpperCase()}</span> }) : <span style={{ fontSize: "10px", color: "#d97706", fontWeight: "600", background: "#fffbeb", padding: "2px 6px", borderRadius: "4px" }}>À assigner</span>}
                              {resps.length > 3 && <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#f3f4f6", border: "1px solid #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "800", color: "#6b7280" }}>+{resps.length - 3}</span>}
                            </div>
                            {stKey !== "non-concerne" && !isNaN(d) && <div style={{ fontSize: "11px", color: dayColor(c.delai), fontWeight: "700", background: d < 0 ? "#fee2e2" : d < 30 ? "#fef3c7" : "#f3f4f6", padding: "3px 8px", borderRadius: "6px" }}>{d < 0 ? `Dépassé` : `J-${d}`}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === "criteres" && <>
          <div className="no-print" style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}><input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ background: "white", border: "1px solid #d1d5db", borderRadius: "7px", padding: "7px 12px", fontSize: "13px", width: "220px", outline: "none" }} /><select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={sel}><option value="tous">Tous les statuts</option>{Object.entries(STATUT_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select><select value={filterCritere} onChange={e => setFilterCritere(e.target.value)} style={sel}><option value="tous">Tous les critères</option>{Object.entries(CRITERES_LABELS).map(([n,c]) => <option key={n} value={n}>C{n} — {c.label}</option>)}</select><span style={{ fontSize: "12px", color: "#9ca3af" }}>{filtered.length} indicateur(s)</span></div>
          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["N°","Indicateur","Responsable(s)","Échéance","Statut","Preuves fournies"].map(h => <th key={h} style={th}>{h}</th>)}<th style={th} className="no-print"></th></tr></thead>
              <tbody>{filtered.map(c => { 
                const cConf = CRITERES_LABELS[c.critere] || { label: "Critère Inconnu", color: "#9ca3af" };
                const d = days(c.delai); 
                const resps = Array.isArray(c.responsables) ? c.responsables : []; 
                
                // --- NOUVELLE LOGIQUE D'AFFICHAGE DES PREUVES DANS LE TABLEAU ---
                const nbFiles = (c.fichiers || []).filter(f => !f.archive).length;
                const hasLink = (c.preuves || "").trim().length > 0;
                
                return (<tr key={c.id} className="print-break-avoid" onMouseOver={e => e.currentTarget.style.background="#f8fafc"} onMouseOut={e => e.currentTarget.style.background="white"}><td style={{ ...td, width: "110px" }}><span style={nb(cConf.color)}>{c.num || "-"}</span></td><td style={{ ...td, maxWidth: "280px", opacity: c.statut==="non-concerne"?0.6:1 }}><div style={{ fontWeight: "600", color: "#1e3a5f" }}>{c.titre || "-"}</div><div style={{ fontSize: "11px", color: "#9ca3af" }}>{cConf.label}</div></td><td style={{ ...td, maxWidth: "200px" }}>{resps.length === 0 ? <span style={{ fontSize: "11px", color: "#d97706", fontWeight: "600", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "5px", padding: "2px 8px" }}>À assigner</span> : <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>{resps.slice(0,2).map(r => { const rSafe = String(r || ""); const rRole = rSafe.match(/\(([^)]+)\)/)?.[1] || "Défaut"; const rCfg = ROLE_COLORS[rRole] || ROLE_COLORS["Défaut"]; return <span key={rSafe} style={{ fontSize: "10px", color: rCfg.text, background: rCfg.bg, border: `1px solid ${rCfg.border}`, borderRadius: "4px", padding: "2px 6px", fontWeight: "600" }}>{rSafe.split("(")[0].trim()}</span> })}{resps.length > 2 && <span style={{ fontSize: "10px", color: "#6b7280", background: "#f3f4f6", borderRadius: "4px", padding: "2px 6px" }}>+{resps.length-2}</span>}</div>}</td><td style={td}><div style={{ fontSize: "12px" }}>{c.statut==="non-concerne"?"-":new Date(c.delai || today).toLocaleDateString("fr-FR")}</div>{c.statut!=="non-concerne" && !isNaN(d) && <div style={{ fontSize: "10px", color: dayColor(c.delai), fontWeight: "600" }}>{d < 0 ? `${Math.abs(d)}j dépassé` : `J-${d}`}</div>}</td><td style={td}><StatusBadge statut={c.statut} /></td>
                
                {/* ICI SONT LES NOUVEAUX BADGES DE PREUVES */}
                <td style={td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                    {nbFiles > 0 && <span style={{ fontSize: "10px", color: "#065f46", background: "#d1fae5", padding: "2px 6px", borderRadius: "4px", border: "1px solid #6ee7b7", whiteSpace: "nowrap" }}>📄 {nbFiles} Doc(s)</span>}
                    {hasLink && <span style={{ fontSize: "10px", color: "#1d4ed8", background: "#eff6ff", padding: "2px 6px", borderRadius: "4px", border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>🔗 Lien(s)</span>}
                    {nbFiles === 0 && !hasLink && <span style={{ fontSize: "10px", color: "#9ca3af" }}>Vide</span>}
                  </div>
                </td>
                
                <td className="no-print" style={{ ...td, width: "80px" }}><button onClick={() => setModalCritere(c)} style={{ background: isArchive ? "#f1f5f9" : "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: isArchive ? "1px solid #d1d5db" : "none", borderRadius: "6px", color: isArchive ? "#4b5563" : "white", padding: "5px 14px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>{isArchive ? "Consulter" : "Éditer"}</button></td></tr>);})}</tbody>
            </table>
          </div>
        </>}

        {activeTab === "axes" && <>
          <div style={{ marginBottom: "22px" }}><h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>Axes prioritaires d'amélioration</h2></div>
          {["non-conforme","en-cours"].map(st => {
            const items = axes.filter(c => c.statut === st); if (items.length === 0) return null; const isNC = st === "non-conforme";
            return (<div key={st}><div className="print-break-avoid" style={{ fontSize: "12px", color: isNC?"#991b1b":"#92400e", fontWeight: "700", marginBottom: "10px", textTransform: "uppercase" }}>{isNC ? "🔴 Non conformes — Action immédiate" : "🟠 En cours — À finaliser"}</div>
              {items.map(c => {
                const cConf = CRITERES_LABELS[c.critere] || { label: "Critère", color: "#9ca3af" };
                const d = days(c.delai);
                return (<div key={c.id} className="print-break-avoid" style={{ background: "white", border: `1px solid ${isNC?"#fca5a5":"#fcd34d"}`, borderLeft: `4px solid ${isNC?"#dc2626":"#d97706"}`, borderRadius: "10px", padding: "16px 20px", marginBottom: "10px" }}><div style={{ display: "flex", gap: "12px" }}><span style={nb(cConf.color)}>{c.num || "-"}</span><div style={{ flex: 1 }}><div style={{ fontSize: "14px", fontWeight: "700" }}>{c.titre || "-"}</div><div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "8px" }}>{cConf.label}</div>{(!isAuditMode && (c.attendus||"")) && <div style={{ fontSize: "12px", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "6px", padding: "8px 12px", marginBottom: "6px" }}><span style={{ fontWeight: "700", color: "#92400e" }}>Remarques : </span>{c.attendus}</div>}{((c.fichiers && c.fichiers.length > 0) || (c.preuves||"").trim()) && <div style={{ fontSize: "12px", background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "6px", padding: "8px 12px", marginBottom: "6px" }}><span style={{ fontWeight: "700", color: "#065f46" }}>{isAuditMode ? "Preuves :" : "Preuves finalisées :"} </span>{c.fichiers?.length > 0 ? `${c.fichiers.length} document(s) joint(s). ` : ""}{c.preuves}</div>}{(!isAuditMode && (c.preuves_encours||"").trim()) && <div style={{ fontSize: "12px", background: "#fefce8", border: "1px solid #fde68a", borderRadius: "6px", padding: "8px 12px" }}><span style={{ fontWeight: "700", color: "#d97706" }}>En cours : </span>{c.preuves_encours}</div>}</div><div style={{ textAlign: "right", minWidth: "140px" }}><StatusBadge statut={c.statut} /><div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>{new Date(c.delai || today).toLocaleDateString("fr-FR")}</div>{!isNaN(d) && <div style={{ fontSize: "10px", color: dayColor(c.delai), fontWeight: "700" }}>{d < 0 ? `${Math.abs(d)}j dépassé` : `J-${d}`}</div>}<button onClick={() => setModalCritere(c)} style={{ marginTop: "8px", background: isArchive ? "#f1f5f9" : (isNC?"#fff5f5":"#fffbeb"), border:`1px solid ${isArchive ? "#d1d5db" : (isNC?"#fca5a5":"#fcd34d")}`, borderRadius: "6px", color: isArchive ? "#4b5563" : (isNC?"#dc2626":"#92400e"), padding: "4px 12px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>{isArchive ? "Consulter" : "Éditer"}</button></div></div></div>)
              })}
            </div>);
          })}
        </>}

        {activeTab === "responsables" && <>
          <div style={{ marginBottom: "22px" }}><h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f" }}>Vue par responsable</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(420px,1fr))", gap: "16px" }}>
            {byResp.map(r => {
              const conformes = r.items.filter(c => c.statut==="conforme").length;
              const rCfg = ROLE_COLORS[r.role] || ROLE_COLORS["Défaut"];
              return (
                <div key={r.name} className="print-break-avoid" style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: rCfg.bg, border: `2px solid ${rCfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", color: rCfg.text, flexShrink: 0 }}>{r.nom.split(" ").map(n=>n[0]||"").join("").substring(0,2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f" }}>{r.nom}</div><div style={{ fontSize: "11px", color: rCfg.text, fontWeight: "700" }}>{r.role}</div></div>
                  </div>
                  <ProgressBar value={conformes} max={r.items.length} color={rCfg.text} />
                  <div style={{ marginTop: "12px" }}>
                    {r.items.sort((a,b) => ({"non-conforme":0,"en-cours":1,"non-evalue":2,"conforme":3,"non-concerne":4}[a.statut])-({"non-conforme":0,"en-cours":1,"non-evalue":2,"conforme":3,"non-concerne":4}[b.statut])).map(c => {
                      const cConf = CRITERES_LABELS[c.critere] || { color: "#9ca3af" };
                      return (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderBottom: "1px solid #f8fafc", opacity: c.statut==="non-concerne"?0.6:1 }}><span style={nb(cConf.color)}>{c.num || "-"}</span><div style={{ flex: 1, fontSize: "12px" }}>{c.titre || "-"}</div><StatusBadge statut={c.statut} /><button onClick={() => setModalCritere(c)} style={{ background: isArchive?"#f1f5f9":"white", border: "1px solid #e2e8f0", borderRadius: "5px", color: isArchive?"#4b5563":"#1d4ed8", padding: "3px 10px", fontSize: "10px", cursor: "pointer", fontWeight: "600" }}>{isArchive?"Vue":"Éditer"}</button></div>
                      )
                    })}
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
