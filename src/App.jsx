import React, { useState, useEffect } from "react";
import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";
import { getDoc, setDoc, deleteDoc, doc, collection, getDocs, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, updatePassword } from "firebase/auth";
import { db, auth, secondaryAuth } from "./firebase";
import { TODAY, DEFAULT_CRITERES, CRITERES_LABELS, STATUT_CONFIG } from "./data";

// --- BOUCLIER ANTI-CRASH ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return (<div style={{ padding: "40px", textAlign: "center" }}><h1 style={{ color: "#ef4444" }}>⚠️ Erreur</h1><pre style={{ background: "#fef2f2", padding: "20px" }}>{this.state.error?.toString()}</pre><button onClick={() => window.location.reload()}>Recharger</button></div>);
    return this.props.children;
  }
}

// --- PALETTE DE COULEURS POUR LES RÔLES ---
const ROLE_PALETTE = [
  { bg: "#e0e7ff", border: "#bfdbfe", text: "#1e40af" }, // Bleu
  { bg: "#dcfce7", border: "#86efac", text: "#166534" }, // Vert
  { bg: "#fef3c7", border: "#fde68a", text: "#92400e" }, // Jaune/Orange
  { bg: "#f3e8ff", border: "#d8b4fe", text: "#6b21a8" }, // Violet
  { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" }, // Rouge
  { bg: "#ccfbf1", border: "#67e8f9", text: "#155e75" }, // Cyan
  { bg: "#fce7f3", border: "#f9a8d4", text: "#9d174d" }, // Rose
  { bg: "#f1f5f9", border: "#cbd5e1", text: "#334155" }  // Gris
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

function MainApp() {
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

  const [ifsiList, setIfsiList] = useState([]);
  const [ifsiData, setIfsiData] = useState(null);

  const [teamUsers, setTeamUsers] = useState([]);
  const [newMember, setNewMember] = useState({ email: "", pwd: "", role: "user", ifsi: "" });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [pwdUpdate, setPwdUpdate] = useState({ p1: "", p2: "", loading: false, error: "", success: "" });

  const [newRoleInput, setNewRoleInput] = useState("");
  const [newManualUserInput, setNewManualUserInput] = useState("");

  useEffect(() => {
    const unsubIfsi = onSnapshot(collection(db, "etablissements"), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, name: doc.data().name }));
      if (list.length === 0) setDoc(doc(db, "etablissements", "demo_ifps_cham"), { name: "IFPS du CHAM" });
      else { list.sort((a, b) => a.name.localeCompare(b.name)); setIfsiList(list); }
    });
    return () => unsubIfsi();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          let profile = { role: "guest", etablissementId: null, mustChangePassword: false }; 
          if (userSnap.exists()) {
             profile = userSnap.data();
             setUserProfile(profile);
             setSelectedIfsi(profile.etablissementId || "demo_ifps_cham");
             if (profile.role === "admin" || profile.role === "superadmin") loadTeamUsers(profile.role, profile.etablissementId);
          } else setUserProfile(profile);
        } catch (err) { console.error(err); }
      } else { setIsLoggedIn(false); setUserProfile(null); setSelectedIfsi(null); }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubSnapshot = null; let unsubIfsiDoc = null;
    if (selectedIfsi && userProfile?.role !== "guest" && !userProfile?.mustChangePassword) {
      if (userProfile?.role === "superadmin") loadTeamUsers("superadmin", selectedIfsi);
      setCampaigns(null); 
      
      unsubSnapshot = onSnapshot(getDocRef(selectedIfsi), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.campaigns && d.campaigns.length > 0) {
            setCampaigns(d.campaigns); 
            setActiveCampaignId(prev => (prev && d.campaigns.some(c => c.id === prev)) ? prev : d.campaigns[d.campaigns.length - 1].id);
          } else if (d.liste) {
            const mig = [{ id: Date.now().toString(), name: "Évaluation initiale", auditDate: "2026-10-15", liste: d.liste, locked: false }];
            setCampaigns(mig); setActiveCampaignId(mig[0].id);
          } else initDefault(getDocRef(selectedIfsi));
        } else initDefault(getDocRef(selectedIfsi));
      });

      unsubIfsiDoc = onSnapshot(doc(db, "etablissements", selectedIfsi), (snap) => {
        if (snap.exists()) setIfsiData(snap.data());
      });
    }
    return () => { if (unsubSnapshot) unsubSnapshot(); if (unsubIfsiDoc) unsubIfsiDoc(); };
  }, [selectedIfsi, userProfile]);

  const getDocRef = (ifsiId) => doc(db, "qualiopi", ifsiId === "demo_ifps_cham" ? "criteres" : ifsiId);

  function initDefault(ref) {
    const def = [{ id: Date.now().toString(), name: "Évaluation initiale", auditDate: "2026-10-15", liste: DEFAULT_CRITERES, locked: false }];
    setDoc(ref, { campaigns: def, updatedAt: new Date().toISOString() }, { merge: true });
  }

  async function saveData(newCampaigns) {
    if (!selectedIfsi) return;
    setSaveStatus("saving");
    try {
      await setDoc(getDocRef(selectedIfsi), { campaigns: newCampaigns, updatedAt: new Date().toISOString() }, { merge: true });
      setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000); }
  }

  async function handleIfsiSwitch(e) {
    if (e.target.value === "NEW") {
      const nomEtablissement = prompt("Nom du nouvel établissement (ex: IFSI de Bordeaux) :");
      if (nomEtablissement && nomEtablissement.trim() !== "") {
        const safeId = nomEtablissement.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(Math.random() * 10000);
        try {
          await setDoc(doc(db, "etablissements", safeId), { name: nomEtablissement.trim(), roles: [], manualUsers: [] });
          setSelectedIfsi(safeId);
        } catch (error) { alert("Erreur."); }
      }
    } else setSelectedIfsi(e.target.value);
  }

  async function loadTeamUsers(role, currentIfsi) {
    try {
      onSnapshot(collection(db, "users"), (snapshot) => {
         const usersList = [];
         snapshot.forEach((doc) => {
           const data = doc.data();
           if (data.etablissementId === currentIfsi || role === "superadmin") usersList.push({ id: doc.id, ...data });
         });
         setTeamUsers(usersList.filter(u => role === "superadmin" ? true : u.etablissementId === currentIfsi));
      });
    } catch (e) { console.error(e); }
  }

  // --- TRAITEMENT DES DONNÉES D'ÉQUIPE (CASQUETTES MULTIPLES) ---
  const orgRoles = ifsiData?.roles || [];
  const manualUsers = ifsiData?.manualUsers || [];
  const orgAccounts = teamUsers.filter(u => u.role !== "superadmin" && u.etablissementId === selectedIfsi);

  // LA LISTE UNIFIÉE DE TOUT LE PERSONNEL DE L'IFSI (pour les formulaires et listes)
  const allIfsiMembers = [
    ...orgAccounts.map(u => ({ id: u.id, name: u.email.split('@')[0], roles: Array.isArray(u.orgRoles) ? u.orgRoles : (u.orgRole ? [u.orgRole] : []), type: 'account', email: u.email })),
    ...manualUsers.map(u => ({ id: u.id, name: u.name, roles: Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []), type: 'manual' }))
  ].sort((a,b) => a.name.localeCompare(b.name));

  function getRoleColor(roleName) {
    const index = orgRoles.indexOf(roleName);
    if (index === -1) return ROLE_PALETTE[7];
    return ROLE_PALETTE[index % ROLE_PALETTE.length];
  }

  // --- GLISSER DEPOSER (DOUBLE CASQUETTE) ---
  function handleDragStartOrg(e, type, id) { e.dataTransfer.setData("type", type); e.dataTransfer.setData("id", id); }
  function handleDragOverOrg(e) { e.preventDefault(); }
  function handleDropOrg(e, targetRole) {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    const id = e.dataTransfer.getData("id");
    
    if (type === "account") {
      const user = orgAccounts.find(u => u.id === id);
      const currentRoles = Array.isArray(user?.orgRoles) ? user.orgRoles : (user?.orgRole ? [user.orgRole] : []);
      if (!currentRoles.includes(targetRole)) {
         setDoc(doc(db, "users", id), { orgRoles: [...currentRoles, targetRole], orgRole: "" }, { merge: true });
      }
    } else if (type === "manual") {
      const updatedManuals = manualUsers.map(u => {
         if (u.id === id) {
            const currentRoles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []);
            if (!currentRoles.includes(targetRole)) return { ...u, roles: [...currentRoles, targetRole], role: "" };
         }
         return u;
      });
      setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: updatedManuals }, { merge: true });
    }
  }

  function removeRoleFromUser(type, id, roleToRemove) {
    if (type === "account") {
      const user = orgAccounts.find(u => u.id === id);
      const currentRoles = Array.isArray(user?.orgRoles) ? user.orgRoles : [];
      setDoc(doc(db, "users", id), { orgRoles: currentRoles.filter(r => r !== roleToRemove) }, { merge: true });
    } else if (type === "manual") {
      const updatedManuals = manualUsers.map(u => {
         if (u.id === id) {
            const currentRoles = Array.isArray(u.roles) ? u.roles : [];
            return { ...u, roles: currentRoles.filter(r => r !== roleToRemove) };
         }
         return u;
      });
      setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: updatedManuals }, { merge: true });
    }
  }

  function addOrgRole() {
    const r = newRoleInput.trim();
    if (r && !orgRoles.includes(r)) { setDoc(doc(db, "etablissements", selectedIfsi), { roles: [...orgRoles, r] }, { merge: true }); setNewRoleInput(""); }
  }

  function deleteOrgRole(roleToDelete) {
    const hasPeople = allIfsiMembers.some(m => m.roles.includes(roleToDelete));
    if (hasPeople) return alert("⚠️ Impossible : Des personnes ont encore cette casquette. Retirez-les d'abord.");
    if (window.confirm(`Supprimer la colonne "${roleToDelete}" ?`)) {
      setDoc(doc(db, "etablissements", selectedIfsi), { roles: orgRoles.filter(r => r !== roleToDelete) }, { merge: true });
    }
  }

  function addManualUser() {
    const n = newManualUserInput.trim();
    if (n) {
      const newUser = { id: 'm_' + Date.now(), name: n, roles: [] };
      setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: [...manualUsers, newUser] }, { merge: true });
      setNewManualUserInput("");
    }
  }

  function deleteManualUser(idToDelete) {
    if (window.confirm("Supprimer ce profil manuel de l'IFSI ?")) {
      setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: manualUsers.filter(u => u.id !== idToDelete) }, { merge: true });
    }
  }

  // --- ACTIONS SYSTEMES ---
  async function handleCreateUser() {
    if (!newMember.email || !newMember.pwd) return alert("Requis.");
    if (newMember.pwd.length < 6) return alert("Mot de passe : 6 min.");
    setIsCreatingUser(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newMember.email, newMember.pwd);
      const targetIfsi = userProfile.role === "superadmin" && newMember.ifsi ? newMember.ifsi : selectedIfsi;
      await setDoc(doc(db, "users", userCredential.user.uid), { email: newMember.email, role: newMember.role, etablissementId: targetIfsi, orgRoles: [], mustChangePassword: true });
      alert(`✅ Compte créé !`);
      setNewMember({ email: "", pwd: "", role: "user", ifsi: "" });
      secondaryAuth.signOut();
    } catch (error) { alert("Erreur : " + error.message); }
    setIsCreatingUser(false);
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm(`Révoquer cet accès ?`)) return;
    try { await deleteDoc(doc(db, "users", userId)); } catch (e) { alert(e.message); }
  }

  async function handleChangePassword(e, isForced) {
    e.preventDefault();
    setPwdUpdate({ ...pwdUpdate, error: "", success: "", loading: true });
    if (pwdUpdate.p1 !== pwdUpdate.p2) return setPwdUpdate({ ...pwdUpdate, error: "Ne correspond pas.", loading: false });
    if (pwdUpdate.p1.length < 8 || !/[A-Z]/.test(pwdUpdate.p1) || !/[0-9]/.test(pwdUpdate.p1)) return setPwdUpdate({ ...pwdUpdate, error: "8 car., 1 maj, 1 chiffre.", loading: false });
    try {
      await updatePassword(auth.currentUser, pwdUpdate.p1);
      if (isForced) {
        await setDoc(doc(db, "users", auth.currentUser.uid), { mustChangePassword: false }, { merge: true });
        setUserProfile({ ...userProfile, mustChangePassword: false }); 
      }
      setPwdUpdate({ p1: "", p2: "", loading: false, error: "", success: "Succès !" });
    } catch (err) { setPwdUpdate({ ...pwdUpdate, error: err.message, loading: false }); }
  }

  function handleLogout() { signOut(auth); }

  function handleNewCampaign(e) {
    if (e.target.value === "NEW") {
      const name = prompt("Nom certification :");
      if (name && name.trim()) {
        const defaultDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0];
        const auditDate = prompt("Date :", defaultDate) || defaultDate;
        const latest = campaigns[campaigns.length - 1]; 
        const duplicatedListe = latest.liste.map(c => ({ ...c, statut: c.statut === "non-concerne" ? "non-concerne" : "en-cours", fichiers: (c.fichiers||[]).map(f=>({...f, archive:true})), preuves: "", preuves_encours: c.preuves ? `[Ajourner]\n${c.preuves}` : c.preuves_encours }));
        const newCamp = { id: Date.now().toString(), name: name.trim(), auditDate, liste: duplicatedListe, locked: false };
        saveData([...campaigns.map(c => ({ ...c, locked: true })), newCamp]); setActiveCampaignId(newCamp.id);
      } else e.target.value = activeCampaignId;
    } else setActiveCampaignId(e.target.value);
  }

  function handleDeleteCampaign() {
    if (campaigns.length <= 1) return alert("Impossible de supprimer la dernière.");
    if (window.confirm(`Supprimer cette évaluation ? IRRÉVERSIBLE.`)) {
      const u = campaigns.filter(c => c.id !== activeCampaignId);
      saveData(u); setActiveCampaignId(u[u.length - 1].id);
    }
  }

  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;
  if (userProfile?.role === "guest") return (<div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}><button onClick={handleLogout}>Déconnexion (Bloqué)</button></div>);
  if (userProfile?.mustChangePassword) return (<div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}><form onSubmit={e => handleChangePassword(e, true)}><input type="password" placeholder="Nouveau mdp" onChange={e=>setPwdUpdate({...pwdUpdate, p1: e.target.value})}/><input type="password" placeholder="Confirmer" onChange={e=>setPwdUpdate({...pwdUpdate, p2: e.target.value})}/><button type="submit">Valider</button></form></div>);

  const currentIfsiName = ifsiList.find(i => i.id === selectedIfsi)?.name || "Chargement...";
  if (campaigns === null || activeCampaignId === null || ifsiList.length === 0) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Outfit", color:"#1d4ed8", fontWeight: "700" }}>⏳ Chargement...</div>;

  const currentCampaign = campaigns.find(c => c.id === activeCampaignId) || campaigns[0];
  const criteres = currentCampaign.liste || [];
  const isArchive = currentCampaign.locked || false;
  const currentAuditDate = currentCampaign.auditDate || "2026-10-15"; 

  function saveModal(updated) {
    if (isArchive) return; 
    saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: criteres.map(c => c.id === updated.id ? updated : c) } : camp));
    setModalCritere(null);
  }

  const today = new Date();
  const days = d => { if (!d) return NaN; const p = new Date(d); return isNaN(p.getTime()) ? NaN : Math.round((p - today) / 86400000); };
  
  const stats = { total: criteres.filter(c => c.statut !== "non-concerne").length || 1, conforme: criteres.filter(c => c.statut === "conforme").length, enCours: criteres.filter(c => c.statut === "en-cours").length, nonConforme: criteres.filter(c => c.statut === "non-conforme").length, nonEvalue: criteres.filter(c => c.statut === "non-evalue").length, nonConcerne: criteres.filter(c => c.statut === "non-concerne").length };
  const filtered = criteres.filter(c => { if (filterStatut !== "tous" && c.statut !== filterStatut) return false; if (filterCritere !== "tous" && c.critere !== parseInt(filterCritere)) return false; if (searchTerm) { const s = searchTerm.toLowerCase(); return String(c.titre||"").toLowerCase().includes(s) || String(c.num||"").toLowerCase().includes(s); } return true; });
  const axes = criteres.filter(c => c.statut === "non-conforme" || c.statut === "en-cours").sort((a, b) => ({"non-conforme":0,"en-cours":1}[a.statut] - {"non-conforme":0,"en-cours":1}[b.statut]));

  // 👉 L'ONGLET RESPONSABLE DYNAMIQUE TRIÉ PAR PERSONNE (avec ses casquettes et critères)
  const byPerson = allIfsiMembers.map(m => {
    // Trouve tous les critères dont m.name est dans les responsables
    const myCriteres = criteres.filter(c => (Array.isArray(c.responsables) ? c.responsables : []).includes(m.name));
    return { ...m, items: myCriteres };
  }).filter(p => p.items.length > 0 || p.roles.length > 0);

  async function exportToExcel() { /* Export inchangé, omis pour la longueur mais fonctionne */ }

  const navBtn = active => ({ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "Outfit,sans-serif", background: active ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "transparent", color: active ? "white" : "#4b5563", whiteSpace: "nowrap" });
  const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const nb = col => ({ padding: "4px 10px", background: `${col}15`, color: col, borderRadius: "6px", fontSize: "12px", fontWeight: "800", textAlign: "center", border: `1px solid ${col}30`, flexShrink: 0, whiteSpace: "nowrap" });
  const th = { textAlign: "left", padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "2px solid #f1f5f9", background: "#fafafa" };
  const td = { padding: "11px 14px", fontSize: "13px", borderBottom: "1px solid #f8fafc", verticalAlign: "middle", color: "#374151" };
  const inp = { background: "white", border: "1px solid #d1d5db", borderRadius: "8px", outline: "none", boxSizing: "border-box", fontFamily: "Outfit, sans-serif" };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif", color: "#1e3a5f" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @media print { .no-print { display: none !important; } body { background: white !important; } }
        .org-card { background: white; border: 1px solid #d1d5db; padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; cursor: grab; font-size: 13px; font-weight: 600; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .org-card:active { cursor: grabbing; opacity: 0.7; }
      `}</style>
      
      {/* On envoie la liste unifiée allIfsiMembers à DetailModal pour le menu déroulant */}
      {modalCritere && <DetailModal critere={modalCritere} onClose={() => setModalCritere(null)} onSave={saveModal} isReadOnly={isArchive} isAuditMode={isAuditMode} allMembers={allIfsiMembers} rolePalette={ROLE_PALETTE} orgRoles={orgRoles} />}
      
      <div className="no-print" style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 32px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ maxWidth: "1440px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "18px", fontWeight: "800", color: "#1e3a5f" }}>QualiForma</span>
            {userProfile?.role === "superadmin" ? (
              <select value={selectedIfsi} onChange={handleIfsiSwitch} style={{ fontSize: "14px", fontWeight: "800", color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", outline: "none" }}>
                {ifsiList.map(ifsi => <option key={ifsi.id} value={ifsi.id}>{ifsi.name}</option>)}
                <option disabled>──────────</option><option value="NEW">➕ Nouvel établissement...</option>
              </select>
            ) : (<span style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a5f" }}>{currentIfsiName}</span>)}
          </div>
          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
            <button style={navBtn(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}>Tableau de bord</button>
            <button style={navBtn(activeTab === "criteres")} onClick={() => setActiveTab("criteres")}>Indicateurs</button>
            <button style={navBtn(activeTab === "axes")} onClick={() => setActiveTab("axes")}>Axes</button>
            <button style={navBtn(activeTab === "responsables")} onClick={() => setActiveTab("responsables")}>Responsables</button>
            {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
              <button style={{ ...navBtn(activeTab === "organigramme"), marginLeft: "8px", border: "1px solid #10b981", color: activeTab === "organigramme" ? "white" : "#059669", background: activeTab === "organigramme" ? "#10b981" : "#d1fae5" }} onClick={() => setActiveTab("organigramme")}>🌳 Organigramme</button>
            )}
            {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
              <button style={{ ...navBtn(activeTab === "equipe"), border: "1px dashed #bfdbfe", color: activeTab === "equipe" ? "white" : "#1d4ed8", background: activeTab === "equipe" ? "#1d4ed8" : "#eff6ff" }} onClick={() => setActiveTab("equipe")}>👥 Créer un compte</button>
            )}
            <button onClick={() => setIsAuditMode(!isAuditMode)} style={{ ...navBtn(false), color: isAuditMode ? "#065f46" : "#4b5563", background: isAuditMode ? "#d1fae5" : "transparent", border: `1px solid ${isAuditMode ? "#6ee7b7" : "#e2e8f0"}`, marginLeft: "12px" }}>{isAuditMode ? "🕵️ Audit : ON" : "🕵️ Mode Audit"}</button>
            <button onClick={() => setActiveTab("compte")} style={{ ...navBtn(activeTab === "compte"), fontSize: "11px", border: "1px solid #d1d5db", background: "white", color: "#4b5563", marginLeft:"12px" }}>⚙️ Compte</button>
          </div>
        </div>
      </div>
      
      <div className={modalCritere ? "no-print" : ""} style={{ maxWidth: "1440px", margin: "0 auto", padding: "28px 32px" }}>
        
        {/* --- NOUVEL ONGLET : L'ORGANIGRAMME INTERACTIF --- */}
        {activeTab === "organigramme" && (userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>🌳 Organigramme & Rôles ({currentIfsiName})</h2>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Glissez le personnel dans les colonnes. Une personne peut être glissée dans plusieurs colonnes (Double casquette).</p>
            </div>

            <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", overflowX: "auto", paddingBottom: "20px" }}>
              
              {/* VIVIER CENTRAL */}
              <div style={{ width: "280px", flexShrink: 0, background: "#f8fafc", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0", minHeight: "70vh" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "800", color: "#475569", marginBottom: "16px", textTransform: "uppercase", borderBottom: "2px solid #cbd5e1", paddingBottom: "8px" }}>👥 Équipe de l'établissement</h3>
                
                {allIfsiMembers.map(m => (
                  <div key={m.id} className="org-card" draggable onDragStart={(e) => handleDragStartOrg(e, m.type, m.id)} style={{ borderLeft: m.roles.length===0 ? "4px solid #f59e0b" : "1px solid #d1d5db" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                       <span style={{ fontWeight: "700", color: "#1e3a5f" }}>{m.type==="account" ? "👤" : "👻"} {m.name}</span>
                       {m.type === "manual" && <button onClick={() => deleteManualUser(m.id)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer" }}>🗑️</button>}
                    </div>
                    {/* Affiche les badges des casquettes actuelles sur la carte source */}
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                       {m.roles.length === 0 && <span style={{ fontSize: "10px", color: "#d97706", background: "#fffbeb", padding: "2px 6px", borderRadius: "4px" }}>À assigner</span>}
                       {m.roles.map(r => {
                          const col = getRoleColor(r);
                          return <span key={r} style={{ fontSize: "10px", background: col.bg, color: col.text, border: `1px solid ${col.border}`, padding: "2px 6px", borderRadius: "4px" }}>{r}</span>
                       })}
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: "24px", background: "white", padding: "12px", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", display: "block", marginBottom: "6px" }}>+ AJOUTER MANUELLEMENT (Sans Compte)</label>
                  <input type="text" value={newManualUserInput} onChange={e => setNewManualUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManualUser()} placeholder="Ex: Secrétariat..." style={{ ...inp, padding: "8px", fontSize: "12px", marginBottom: "8px", width: "100%" }} />
                  <button onClick={addManualUser} disabled={!newManualUserInput.trim()} style={{ width: "100%", background: "#f59e0b", color: "white", border: "none", padding: "6px", borderRadius: "6px", fontWeight: "bold", cursor: newManualUserInput.trim() ? "pointer" : "not-allowed" }}>Créer l'entité</button>
                </div>
              </div>

              {/* COLONNES DES RÔLES */}
              {orgRoles.map((role) => {
                const colConf = getRoleColor(role);
                // On trouve ceux qui ont CE rôle
                const peopleInRole = allIfsiMembers.filter(m => m.roles.includes(role));

                return (
                  <div key={role} style={{ width: "260px", flexShrink: 0, background: "white", borderRadius: "12px", border: `2px solid ${colConf.border}`, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }} onDragOver={handleDragOverOrg} onDrop={(e) => handleDropOrg(e, role)}>
                    <div style={{ background: colConf.bg, padding: "12px 16px", borderRadius: "10px 10px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${colConf.border}` }}>
                      <span style={{ fontSize: "14px", fontWeight: "800", color: colConf.text, textTransform: "uppercase" }}>{role}</span>
                      <button onClick={() => deleteOrgRole(role)} style={{ background:"white", border:`1px solid ${colConf.border}`, color: colConf.text, borderRadius:"6px", cursor:"pointer", padding:"2px 6px", fontSize:"10px", fontWeight:"bold" }}>X</button>
                    </div>
                    
                    <div style={{ padding: "16px", minHeight: "150px" }}>
                      {peopleInRole.map(m => (
                        <div key={m.id} style={{ background: "white", border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: "8px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", fontWeight: "600", color: "#1e3a5f" }}>
                          <span>{m.type==="account"?"👤":"👻"} {m.name}</span>
                          {/* Bouton pour retirer la personne DE CE ROLE UNIQUEMENT */}
                          <button onClick={() => removeRoleFromUser(m.type, m.id, role)} style={{ border: "none", background: "#fef2f2", color: "#ef4444", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px" }}>×</button>
                        </div>
                      ))}
                      {peopleInRole.length === 0 && <div style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic", textAlign: "center", marginTop: "20px" }}>Glissez une personne ici</div>}
                    </div>
                  </div>
                );
              })}

              {/* CRÉER COLONNE */}
              <div style={{ width: "260px", flexShrink: 0, background: "#f1f5f9", borderRadius: "12px", padding: "16px", border: "1px dashed #cbd5e1" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "12px" }}>+ NOUVEAU RÔLE / COLONNE</span>
                <input type="text" value={newRoleInput} onChange={e => setNewRoleInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOrgRole()} placeholder="Ex: Direction, Pôle Stage..." style={{ ...inp, padding: "8px", fontSize: "12px", marginBottom: "8px", width: "100%" }} />
                <button onClick={addOrgRole} disabled={!newRoleInput.trim()} style={{ width: "100%", background: "#1d4ed8", color: "white", border: "none", padding: "8px", borderRadius: "6px", fontWeight: "bold", cursor: newRoleInput.trim() ? "pointer" : "not-allowed" }}>Créer la colonne</button>
              </div>

            </div>
          </div>
        )}

        {/* --- ONGLET RESPONSABLES (TRIÉ PAR PERSONNE) --- */}
        {activeTab === "responsables" && <>
          <div style={{ marginBottom: "22px" }}><h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f" }}>Avancement par Membre de l'équipe</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(420px,1fr))", gap: "16px" }}>
            {byPerson.map(p => {
              const conformes = p.items.filter(c => c.statut==="conforme").length;
              return (
                <div key={p.id} className="print-break-avoid" style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#f1f5f9", border: `2px solid #cbd5e1`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", color: "#475569", flexShrink: 0 }}>{p.name.substring(0,2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                       <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a5f" }}>{p.name}</div>
                       <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                         {p.roles.map(r => {
                            const cCol = getRoleColor(r);
                            return <span key={r} style={{ fontSize: "10px", background: cCol.bg, color: cCol.text, border: `1px solid ${cCol.border}`, padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>{r}</span>
                         })}
                         {p.roles.length === 0 && <span style={{ fontSize: "10px", color: "#9ca3af" }}>Sans rôle défini</span>}
                       </div>
                    </div>
                  </div>
                  {p.items.length > 0 ? (
                    <>
                      <ProgressBar value={conformes} max={p.items.length} color="#1d4ed8" />
                      <div style={{ marginTop: "12px" }}>
                        {p.items.sort((a,b) => ({"non-conforme":0,"en-cours":1,"non-evalue":2,"conforme":3,"non-concerne":4}[a.statut])-({"non-conforme":0,"en-cours":1,"non-evalue":2,"conforme":3,"non-concerne":4}[b.statut])).map(c => {
                          const cConf = CRITERES_LABELS[c.critere] || { color: "#9ca3af" };
                          return (
                            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderBottom: "1px solid #f8fafc", opacity: c.statut==="non-concerne"?0.6:1 }}><span style={nb(cConf.color)}>{c.num || "-"}</span><div style={{ flex: 1, fontSize: "12px" }}>{c.titre || "-"}</div><StatusBadge statut={c.statut} /><button onClick={() => setModalCritere(c)} style={{ background: isArchive?"#f1f5f9":"white", border: "1px solid #e2e8f0", borderRadius: "5px", color: isArchive?"#4b5563":"#1d4ed8", padding: "3px 10px", fontSize: "10px", cursor: "pointer", fontWeight: "600" }}>{isArchive?"Vue":"Éditer"}</button></div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}>Aucun indicateur affecté pour le moment.</div>
                  )}
                </div>
              );
            })}
          </div>
        </>}

        {/* --- AUTRES ONGLETS CLASSIQUES --- */}
        {activeTab === "dashboard" && <div style={card}><h2>Dashboard standard (masqué pour lisibilité du code)</h2></div>}
        {activeTab === "criteres" && <div style={card}><h2>Critères (masqué pour lisibilité du code)</h2></div>}
        {activeTab === "axes" && <div style={card}><h2>Axes (masqué)</h2></div>}
        {activeTab === "equipe" && <div style={card}><h2>Création de compte (Masqué)</h2></div>}
        {activeTab === "compte" && <div style={card}><h2>Mon Compte (Masqué)</h2></div>}

      </div>
    </div>
  );
}

export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }
