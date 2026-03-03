import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";
import { useState, useEffect } from "react";
import { getDoc, setDoc, doc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth, secondaryAuth } from "./firebase";
import { TODAY, RESPONSABLES, DEFAULT_CRITERES, CRITERES_LABELS, STATUT_CONFIG, ROLE_COLORS } from "./data";

// --- LISTE DES ÉTABLISSEMENTS ---
const IFSI_LIST = [
  { id: "demo_ifps_cham", name: "IFPS du CHAM" },
  { id: "ifsi_lyon", name: "IFSI de Lyon" },
  { id: "ifsi_marseille", name: "IFSI de Marseille" }
];

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
  const [userProfile, setUserProfile] = useState(null); 
  const [selectedIfsi, setSelectedIfsi] = useState(null); 
  const [campaigns, setCampaigns] = useState(null);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterCritere, setFilterCritere] = useState("tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalCritere, setModalCritere] = useState(null);
  const [isAuditMode, setIsAuditMode] = useState(false);

  // ÉTATS POUR LA GESTION D'ÉQUIPE
  const [teamUsers, setTeamUsers] = useState([]);
  const [newMember, setNewMember] = useState({ email: "", pwd: "", role: "user", ifsi: "" });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          let profile = { role: "user", etablissementId: "demo_ifps_cham" }; 
          if (userSnap.exists()) profile = userSnap.data();
          
          setUserProfile(profile);
          setSelectedIfsi(profile.etablissementId || "demo_ifps_cham");
          
          // Si c'est un admin ou superadmin, on charge l'équipe de l'IFSI
          if (profile.role === "admin" || profile.role === "superadmin") {
            loadTeamUsers(profile.role, profile.etablissementId);
          }
          
        } catch (err) {
          console.error("Erreur profil:", err);
          setSelectedIfsi("demo_ifps_cham");
        }
      } else {
        setIsLoggedIn(false);
        setUserProfile(null);
        setSelectedIfsi(null);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedIfsi) {
      loadCampaigns(selectedIfsi);
      // Met à jour la liste des utilisateurs si le superadmin change d'IFSI
      if (userProfile?.role === "superadmin") {
        loadTeamUsers("superadmin", selectedIfsi);
      }
    }
  }, [selectedIfsi]);

  const getDocRef = (ifsiId) => {
    const docName = ifsiId === "demo_ifps_cham" ? "criteres" : ifsiId;
    return doc(db, "qualiopi", docName);
  };

  async function loadCampaigns(ifsiId) {
    setCampaigns(null); 
    try {
      const ref = getDocRef(ifsiId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        if (d.campaigns && d.campaigns.length > 0) {
          setCampaigns(d.campaigns); setActiveCampaignId(d.campaigns[d.campaigns.length - 1].id);
        } else if (d.liste) {
          const mig = [{ id: Date.now().toString(), name: "Évaluation initiale", auditDate: "2026-10-15", liste: d.liste, locked: false }];
          setCampaigns(mig); setActiveCampaignId(mig[0].id);
        } else { initDefault(ref); }
      } else { initDefault(ref); }
    } catch (e) { initDefault(getDocRef(ifsiId)); }
  }

  function initDefault(ref) {
    const def = [{ id: Date.now().toString(), name: "Évaluation initiale", auditDate: "2026-10-15", liste: DEFAULT_CRITERES, locked: false }];
    setCampaigns(def); setActiveCampaignId(def[0].id);
    setDoc(ref, { campaigns: def, updatedAt: new Date().toISOString() }, { merge: true });
  }

  async function saveData(newCampaigns) {
    if (!selectedIfsi) return;
    setCampaigns(newCampaigns); setSaveStatus("saving");
    try {
      await setDoc(getDocRef(selectedIfsi), { campaigns: newCampaigns, updatedAt: new Date().toISOString() }, { merge: true });
      setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  // --- FONCTIONS GESTION ÉQUIPE ---
  async function loadTeamUsers(role, currentIfsi) {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Le superadmin voit l'équipe de l'IFSI qu'il est en train de consulter
        // L'admin ne voit que son propre IFSI
        if (role === "superadmin" || data.etablissementId === currentIfsi) {
           if (data.etablissementId === currentIfsi || role === "superadmin") {
              usersList.push({ id: doc.id, ...data });
           }
        }
      });
      setTeamUsers(usersList.filter(u => role === "superadmin" ? true : u.etablissementId === currentIfsi));
    } catch (e) { console.error("Erreur chargement équipe", e); }
  }

  async function handleCreateUser() {
    if (!newMember.email || !newMember.pwd) return alert("Email et mot de passe requis.");
    setIsCreatingUser(true);
    try {
      // 1. Création silencieuse du compte (ne déconnecte pas l'admin)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newMember.email, newMember.pwd);
      const newUid = userCredential.user.uid;

      // 2. Définition de l'IFSI cible (forcé si on est juste admin)
      const targetIfsi = userProfile.role === "superadmin" && newMember.ifsi ? newMember.ifsi : selectedIfsi;

      // 3. Sauvegarde du profil dans Firestore
      await setDoc(doc(db, "users", newUid), {
        email: newMember.email,
        role: newMember.role,
        etablissementId: targetIfsi
      });

      alert(`✅ Le compte ${newMember.email} a été créé avec succès !`);
      setNewMember({ email: "", pwd: "", role: "user", ifsi: "" });
      loadTeamUsers(userProfile.role, selectedIfsi); // Rafraîchit la liste
      
      // Déconnecte l'instance secondaire pour nettoyer
      secondaryAuth.signOut();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la création : " + error.message);
    }
    setIsCreatingUser(false);
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
          return { ...c, statut: c.statut === "non-concerne" ? "non-concerne" : "en-cours", fichiers: oldFiles, preuves: "", preuves_encours: c.preuves ? `[Preuves précédentes à mettre à jour]\n${c.preuves}` : c.preuves_encours };
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
  if (campaigns === null || activeCampaignId === null) return <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Outfit", color:"#1d4ed8", fontWeight: "700" }}>⏳ Chargement de l'établissement...</div>;

  const currentCampaign = campaigns.find(c => c.id === activeCampaignId) || campaigns[0];
  const criteres = currentCampaign.liste || [];
  const isArchive = currentCampaign.locked || false;
  const currentAuditDate = currentCampaign.auditDate || "2026-10-15"; 
  const currentIfsiName = IFSI_LIST.find(i => i.id === selectedIfsi)?.name || "Établissement Inconnu";

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
  const days = d => { if (!d) return NaN; const p = new Date(d); if (isNaN(p.getTime())) return NaN; return Math.round((p - today) / 86400000); };
  const dayColor = d => { const daysLeft = days(d); if (isNaN(daysLeft)) return "#6b7280"; return daysLeft < 0 ? "#dc2626" : daysLeft < 30 ? "#d97706" : "#6b7280"; };
  
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
  const urgents = criteres.filter(c => { const d = days(c.delai); return !isNaN(d) && d <= 30 && c.statut !== "conforme" && c.statut !== "non-evalue" && c.statut !== "non-concerne"; });
  
  const filtered = criteres.filter(c => {
    if (filterStatut !== "tous" && c.statut !== filterStatut) return false;
    if (filterCritere !== "tous" && c.critere !== parseInt(filterCritere)) return false;
    if (searchTerm) { const t = String(c.titre || "").toLowerCase(); const n = String(c.num || "").toLowerCase(); const s = searchTerm.toLowerCase(); if (!t.includes(s) && !n.includes(s)) return false; }
    return true;
  });
  
  const axes = criteres.filter(c => c.statut === "non-conforme" || c.statut === "en-cours").sort((a, b) => ({ "non-conforme": 0, "en-cours": 1 }[a.statut] - { "non-conforme": 0, "en-cours": 1 }[b.statut] || new Date(a.delai || today) - new Date(b.delai || today)));
  
  const byResp = RESPONSABLES.map(r => ({ 
    name: r, nom: (r||"").split("(")[0].trim(), 
    role: (r||"").match(/\(([^)]+)\)/)?.[1] || "Défaut", 
    items: criteres.filter(c => (Array.isArray(c.responsables) ? c.responsables : []).includes(r)), 
  })).filter(r => r.items.length > 0);

  async function exportToExcel() { /* ... function inchangée ... */ }

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
            <div style={{ width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#1d4ed8"/><stop offset="1" stopColor="#3b82f6"/></linearGradient></defs>
                <path fillRule="evenodd" clipRule="evenodd" d="M11 2C6.02944 2 2 6.02944 2 11C2 15.9706 6.02944 20 11 20C13.125 20 15.078 19.2635 16.6177 18.0319L20.2929 21.7071C20.6834 22.0976 21.3166 22.0976 21.7071 21.7071C22.0976 21.3166 22.0976 20.6834 21.7071 20.2929L18.0319 16.6177C19.2635 15.078 20 13.125 20 11C20 6.02944 15.9706 2 11 2ZM4 11C4 7.13401 7.13401 4 11 4C14.866 4 18 7.13401 18 11C18 14.866 14.866 18 11 18C7.13401 18 4 14.866 4 11Z" fill="url(#grad)"/>
                <path d="M10.5 15.5L7 12L8.41 10.59L10.5 12.67L14.59 8.59L16 10L10.5 15.5Z" fill="url(#grad)"/>
              </svg>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px", fontWeight: "800", color: "#1e3a5f" }}>QualiForma</span>
              <span style={{ fontSize: "10px", color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>V2.0</span>
              <span style={{ color: "#d1d5db" }}>—</span>
              
              {userProfile?.role === "superadmin" ? (
                <select value={selectedIfsi} onChange={(e) => setSelectedIfsi(e.target.value)} style={{ fontSize: "14px", fontWeight: "800", color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", outline: "none" }}>
                  {IFSI_LIST.map(ifsi => <option key={ifsi.id} value={ifsi.id}>{ifsi.name}</option>)}
                </select>
              ) : (
                <span style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a5f" }}>{currentIfsiName}</span>
              )}
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "10px", borderLeft: "2px solid #f1f5f9", paddingLeft: "16px" }}>
              <select value={activeCampaignId || ""} onChange={handleNewCampaign} style={{ ...sel, fontWeight: "700", color: "#1d4ed8", borderColor: "#bfdbfe", background: "#eff6ff", outline: "none" }}>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name} {c.locked ? "(Archive)" : ""}</option>)}<option disabled>──────────</option><option value="NEW">➕ Nouvelle certification...</option></select>
              {campaigns.length > 1 && <button onClick={handleDeleteCampaign} className="no-print" title="Supprimer" style={{ background: "white", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontSize: "14px", color: "#ef4444", padding: "6px 8px" }}>🗑️</button>}
            </div>
          </div>
          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
            <button style={navBtn(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}>Tableau de bord</button>
            <button style={navBtn(activeTab === "kanban")} onClick={() => setActiveTab("kanban")}>Vue Kanban</button>
            <button style={navBtn(activeTab === "criteres")} onClick={() => setActiveTab("criteres")}>Indicateurs</button>
            <button style={navBtn(activeTab === "axes")} onClick={() => setActiveTab("axes")}>Axes prioritaires</button>
            <button style={navBtn(activeTab === "responsables")} onClick={() => setActiveTab("responsables")}>Responsables</button>
            
            {/* L'ONGLET ÉQUIPE APPARAIT SEULEMENT POUR LES ADMINS ET SUPERADMINS */}
            {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
              <button style={{ ...navBtn(activeTab === "equipe"), marginLeft: "8px", border: "1px dashed #bfdbfe", color: activeTab === "equipe" ? "white" : "#1d4ed8", background: activeTab === "equipe" ? "#1d4ed8" : "#eff6ff" }} onClick={() => setActiveTab("equipe")}>👥 Équipe IFSI</button>
            )}

            <button onClick={() => setIsAuditMode(!isAuditMode)} style={{ ...navBtn(false), color: isAuditMode ? "#065f46" : "#4b5563", background: isAuditMode ? "#d1fae5" : "transparent", fontSize: "12px", marginLeft: "12px", border: `1px solid ${isAuditMode ? "#6ee7b7" : "#e2e8f0"}`, display: "flex", alignItems: "center", gap: "6px" }}><span>{isAuditMode ? "🕵️‍♂️ Mode Audit : ON" : "🕵️‍♂️ Mode Audit"}</span></button>
            <div style={{ display: "flex", gap: "6px", marginLeft: "8px" }}><button onClick={() => window.print()} style={{ ...navBtn(false), color: "#1d4ed8", background: "#eff6ff", fontSize: "12px", border: "1px solid #bfdbfe", display: "flex", gap: "6px" }}><span>📄</span> PDF</button></div>
            <button onClick={handleLogout} style={{ ...navBtn(false), color: "#9ca3af", fontSize: "12px", marginLeft: "8px", border: "1px solid #e2e8f0" }}>Déconnexion</button>
          </div>
        </div>
      </div>
      
      {isArchive && <div className="no-print" style={{ background: "#fef2f2", borderBottom: "1px solid #fca5a5", color: "#991b1b", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "700" }}>🔒 Mode Lecture Seule : Cette évaluation est une archive historique.</div>}
      {isAuditMode && !isArchive && <div className="no-print" style={{ background: "#d1fae5", borderBottom: "1px solid #6ee7b7", color: "#065f46", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "700" }}>✅ Mode Audit Activé : Les notes internes et preuves en cours sont masquées.</div>}
      
      <div className={modalCritere ? "no-print" : ""} style={{ maxWidth: "1440px", margin: "0 auto", padding: "28px 32px" }}>
        
        {/* --- NOUVEL ONGLET GESTION DE L'ÉQUIPE --- */}
        {activeTab === "equipe" && (userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>👥 Gestion des accès pour {currentIfsiName}</h2>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Ajoutez des formateurs ou des membres de la direction. Ils ne verront que les données de cet IFSI.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "24px", alignItems: "start" }}>
              
              {/* FORMULAIRE DE CRÉATION */}
              <div style={{ ...card, background: "#f8fafc" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 16px 0", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" }}>➕ Inviter un membre</h3>
                
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Email</label>
                  <input type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px" }} placeholder="formateur@ifsi.fr" />
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Mot de passe provisoire</label>
                  <input type="text" value={newMember.pwd} onChange={e => setNewMember({...newMember, pwd: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px" }} placeholder="Ex: Qualiopi2026!" />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Rôle</label>
                  <select value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px", background: "white" }}>
                    <option value="user">Formateur / Membre (Lecture & Écriture)</option>
                    <option value="admin">Administrateur IFSI (Peut inviter des gens)</option>
                  </select>
                </div>

                {userProfile.role === "superadmin" && (
                   <div style={{ marginBottom: "16px", background: "#fffbeb", padding: "10px", borderRadius: "8px", border: "1px dashed #fcd34d" }}>
                     <label style={{ fontSize: "11px", fontWeight: "800", color: "#d97706", textTransform: "uppercase" }}>👑 Choix IFSI (Mode Superadmin)</label>
                     <select value={newMember.ifsi || selectedIfsi} onChange={e => setNewMember({...newMember, ifsi: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #fcd34d", marginTop: "4px", background: "white" }}>
                       {IFSI_LIST.map(ifsi => <option key={ifsi.id} value={ifsi.id}>{ifsi.name}</option>)}
                     </select>
                   </div>
                )}

                <button onClick={handleCreateUser} disabled={isCreatingUser} style={{ width: "100%", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white", padding: "10px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: isCreatingUser ? "wait" : "pointer" }}>
                  {isCreatingUser ? "Création en cours..." : "Créer le compte"}
                </button>
              </div>

              {/* LISTE DES UTILISATEURS */}
              <div style={{ ...card, padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr><th style={th}>Email</th><th style={th}>Rôle</th>{userProfile.role === "superadmin" && <th style={th}>IFSI Attaché</th>}</tr>
                  </thead>
                  <tbody>
                    {teamUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ ...td, fontWeight: "600", color: "#1e3a5f" }}>{u.email || u.id}</td>
                        <td style={td}>
                          {u.role === "superadmin" && <span style={{ background: "#fef2f2", color: "#991b1b", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", border: "1px solid #fca5a5" }}>SUPERADMIN</span>}
                          {u.role === "admin" && <span style={{ background: "#fff7ed", color: "#c2410c", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", border: "1px solid #fed7aa" }}>ADMIN IFSI</span>}
                          {(u.role === "user" || !u.role) && <span style={{ background: "#f3f4f6", color: "#4b5563", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", border: "1px solid #d1d5db" }}>FORMATEUR</span>}
                        </td>
                        {userProfile.role === "superadmin" && (
                          <td style={{ ...td, fontSize: "11px", color: "#6b7280" }}>{IFSI_LIST.find(i => i.id === u.etablissementId)?.name || u.etablissementId}</td>
                        )}
                      </tr>
                    ))}
                    {teamUsers.length === 0 && <tr><td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontStyle: "italic", fontSize: "13px" }}>Aucun utilisateur trouvé pour cet établissement.</td></tr>}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* ... LE RESTE DU CODE (Dashboard, Kanban, etc...) RESTE EXACTEMENT LE MÊME ... */}
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

          <div className="print-break-avoid no-print" style={{ ...card, marginBottom: "24px", padding: "20px 24px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#1e3a5f", fontWeight: "800", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <span>🚀 État d'avancement global</span>
              <span style={{ fontSize: "15px", color: "#1d4ed8", fontWeight: "800", background: "#eff6ff", padding: "4px 10px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>{Math.round((stats.conforme / stats.total) * 100) || 0}% Achevé</span>
            </h3>
            
            <div style={{ display: "flex", height: "26px", borderRadius: "13px", overflow: "hidden", background: "#f1f5f9", gap: "3px", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ width: `${(stats.conforme / stats.total) * 100}%`, background: "#10b981", transition: "width 0.8s ease" }} title={`Conforme: ${stats.conforme}`} />
              <div style={{ width: `${(stats.enCours / stats.total) * 100}%`, background: "#f59e0b", transition: "width 0.8s ease" }} title={`En cours: ${stats.enCours}`} />
              <div style={{ width: `${(stats.nonConforme / stats.total) * 100}%`, background: "#ef4444", transition: "width 0.8s ease" }} title={`Non conforme: ${stats.nonConforme}`} />
              <div style={{ width: `${(stats.nonEvalue / stats.total) * 100}%`, background: "#d1d5db", transition: "width 0.8s ease" }} title={`Non évalué: ${stats.nonEvalue}`} />
            </div>
            
            <div style={{ display: "flex", gap: "20px", marginTop: "14px", fontSize: "12px", fontWeight: "700", flexWrap: "wrap", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981" }}></span><span style={{ color: "#065f46" }}>{stats.conforme} Conformes ({Math.round((stats.conforme / stats.total) * 100) || 0}%)</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f59e0b" }}></span><span style={{ color: "#92400e" }}>{stats.enCours} En cours ({Math.round((stats.enCours / stats.total) * 100) || 0}%)</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444" }}></span><span style={{ color: "#991b1b" }}>{stats.nonConforme} Non conformes ({Math.round((stats.nonConforme / stats.total) * 100) || 0}%)</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#d1d5db" }}></span><span style={{ color: "#4b5563" }}>{stats.nonEvalue} À faire ({Math.round((stats.nonEvalue / stats.total) * 100) || 0}%)</span></div>
            </div>
          </div>

          <div className="print-break-avoid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "12px", marginBottom: "24px" }}>
            {[["#6b7280","#f3f4f6","#d1d5db",stats.nonEvalue,"Non évalués"],["#065f46","#d1fae5","#6ee7b7",stats.conforme,"Conformes"],["#92400e","#fef3c7","#fcd34d",stats.enCours,"En cours"],["#991b1b","#fee2e2","#fca5a5",stats.nonConforme,"Non conformes"],["#b45309","#fef9c3","#fde68a",urgents.length,"Urgents < 30j"]].map(([color,bg,border,num,label]) => (
              <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "10px", padding: "14px 16px", opacity: isArchive ? 0.8 : 1 }}><div style={{ fontSize: "28px", fontWeight: "900", color, lineHeight: 1 }}>{num}</div><div style={{ fontSize: "10px", color, opacity: 0.9, marginTop: "4px", textTransform: "uppercase", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div></div>
            ))}
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div className="print-break-avoid" style={card}><div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>Score de conformité (sur les {stats.total} concernés)</div><div style={{ display: "flex", gap: "20px" }}><GaugeChart value={stats.conforme} max={stats.total} color="#1d4ed8" /><div style={{ flex: 1 }}>{[["Non évalué",stats.nonEvalue,"#9ca3af"],["Conforme",stats.conforme,"#059669"],["En cours",stats.enCours,"#d97706"],["Non conforme",stats.nonConforme,"#dc2626"]].map(([l,v,col]) => (<div key={l} style={{ marginBottom: "8px" }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}><span>{l}</span><span style={{ fontWeight: "600", color: col }}>{v}/{stats.total}</span></div><ProgressBar value={v} max={stats.total} color={col} /></div>))}</div></div></div>
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
                const nbFiles = (c.fichiers || []).filter(f => !f.archive).length;
                const nbChemins = (c.chemins_reseau || []).length;
                const hasLink = (c.preuves || "").trim().length > 0;
                return (<tr key={c.id} className="print-break-avoid" onMouseOver={e => e.currentTarget.style.background="#f8fafc"} onMouseOut={e => e.currentTarget.style.background="white"}><td style={{ ...td, width: "110px" }}><span style={nb(cConf.color)}>{c.num || "-"}</span></td><td style={{ ...td, maxWidth: "280px", opacity: c.statut==="non-concerne"?0.6:1 }}><div style={{ fontWeight: "600", color: "#1e3a5f" }}>{c.titre || "-"}</div><div style={{ fontSize: "11px", color: "#9ca3af" }}>{cConf.label}</div></td><td style={{ ...td, maxWidth: "200px" }}>{resps.length === 0 ? <span style={{ fontSize: "11px", color: "#d97706", fontWeight: "600", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "5px", padding: "2px 8px" }}>À assigner</span> : <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>{resps.slice(0,2).map(r => { const rSafe = String(r || ""); const rRole = rSafe.match(/\(([^)]+)\)/)?.[1] || "Défaut"; const rCfg = ROLE_COLORS[rRole] || ROLE_COLORS["Défaut"]; return <span key={rSafe} style={{ fontSize: "10px", color: rCfg.text, background: rCfg.bg, border: `1px solid ${rCfg.border}`, borderRadius: "4px", padding: "2px 6px", fontWeight: "600" }}>{rSafe.split("(")[0].trim()}</span> })}{resps.length > 2 && <span style={{ fontSize: "10px", color: "#6b7280", background: "#f3f4f6", borderRadius: "4px", padding: "2px 6px" }}>+{resps.length-2}</span>}</div>}</td><td style={td}><div style={{ fontSize: "12px" }}>{c.statut==="non-concerne"?"-":new Date(c.delai || today).toLocaleDateString("fr-FR")}</div>{c.statut!=="non-concerne" && !isNaN(d) && <div style={{ fontSize: "10px", color: dayColor(c.delai), fontWeight: "600" }}>{d < 0 ? `${Math.abs(d)}j dépassé` : `J-${d}`}</div>}</td><td style={td}><StatusBadge statut={c.statut} /></td>
                <td style={td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                    {nbChemins > 0 && <span style={{ fontSize: "10px", color: "#065f46", background: "#d1fae5", padding: "2px 6px", borderRadius: "4px", border: "1px solid #6ee7b7", whiteSpace: "nowrap" }}>🔗 {nbChemins} Lien(s) Réseau</span>}
                    {nbFiles > 0 && <span style={{ fontSize: "10px", color: "#065f46", background: "#d1fae5", padding: "2px 6px", borderRadius: "4px", border: "1px solid #6ee7b7", whiteSpace: "nowrap" }}>☁️ {nbFiles} Upload(s)</span>}
                    {hasLink && <span style={{ fontSize: "10px", color: "#1d4ed8", background: "#eff6ff", padding: "2px 6px", borderRadius: "4px", border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>📝 Texte</span>}
                    {nbFiles === 0 && nbChemins === 0 && !hasLink && <span style={{ fontSize: "10px", color: "#9ca3af" }}>Vide</span>}
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
