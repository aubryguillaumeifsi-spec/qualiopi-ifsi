import React, { useState, useEffect } from "react";
import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";
import { getDoc, setDoc, deleteDoc, doc, collection, getDocs, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, updatePassword } from "firebase/auth";
import { db, auth, secondaryAuth } from "./firebase";
import { TODAY, DEFAULT_CRITERES, CRITERES_LABELS, STATUT_CONFIG } from "./data";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return (<div style={{ padding: "40px", textAlign: "center" }}><h1 style={{ color: "#ef4444" }}>⚠️ Erreur</h1><pre style={{ background: "#fef2f2", padding: "20px" }}>{this.state.error?.toString()}</pre><button onClick={() => window.location.reload()}>Recharger</button></div>);
    return this.props.children;
  }
}

const DEFAULT_ROLES = ["Direction", "Qualité", "Secrétariat", "Pôle Stages", "Formateurs IFSI", "Formateurs IFAS"];

const ROLE_PALETTE = [
  { bg: "#e0e7ff", border: "#bfdbfe", text: "#1e40af" }, 
  { bg: "#dcfce7", border: "#86efac", text: "#166534" }, 
  { bg: "#fef3c7", border: "#fde68a", text: "#92400e" }, 
  { bg: "#f3e8ff", border: "#d8b4fe", text: "#6b21a8" }, 
  { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" }, 
  { bg: "#ccfbf1", border: "#67e8f9", text: "#155e75" }, 
  { bg: "#fce7f3", border: "#f9a8d4", text: "#9d174d" }, 
  { bg: "#f1f5f9", border: "#cbd5e1", text: "#334155" }  
];

function GaugeChart({ value, max, color, size = 96, fontSize = 15 }) {
  const pct = max > 0 ? (value / max) * 100 : 0, r = (size/2) - 10, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={size*0.09} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.09} strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x={size/2} y={(size/2)+4} textAnchor="middle" fill="#1e3a5f" fontSize={fontSize} fontWeight="700" fontFamily="Outfit">{Math.round(pct)}%</text>
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
  const [allQualiopiData, setAllQualiopiData] = useState({}); 

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
      if (list.length === 0) setDoc(doc(db, "etablissements", "demo_ifps_cham"), { name: "IFPS du CHAM", roles: DEFAULT_ROLES });
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
             
             if (profile.role === "superadmin") {
                onSnapshot(collection(db, "qualiopi"), (snap) => {
                  const data = {};
                  snap.forEach(d => { data[d.id] = d.data(); });
                  setAllQualiopiData(data);
                });
             }
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
          await setDoc(doc(db, "etablissements", safeId), { name: nomEtablissement.trim(), roles: DEFAULT_ROLES, manualUsers: [] });
          setSelectedIfsi(safeId);
          setActiveTab("dashboard");
        } catch (error) { alert("Erreur."); }
      }
    } else {
      setSelectedIfsi(e.target.value);
      setActiveTab("dashboard");
    }
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

  const orgRoles = ifsiData?.roles || [];
  const manualUsers = ifsiData?.manualUsers || [];
  const orgAccounts = teamUsers.filter(u => u.role !== "superadmin" && u.etablissementId === selectedIfsi);

  const allIfsiMembers = [
    ...orgAccounts.map(u => ({ id: u.id, name: u.email.split('@')[0], roles: Array.isArray(u.orgRoles) ? u.orgRoles : (u.orgRole ? [u.orgRole] : []), type: 'account', email: u.email })),
    ...manualUsers.map(u => ({ id: u.id, name: u.name, roles: Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []), type: 'manual' }))
  ].sort((a,b) => a.name.localeCompare(b.name));

  function getRoleColor(roleName) {
    if (roleName === "Direction") return { bg: "#1e3a5f", border: "#0f172a", text: "#ffffff" }; 
    const index = orgRoles.filter(r => r !== "Direction").indexOf(roleName);
    if (index === -1) return ROLE_PALETTE[7];
    return ROLE_PALETTE[index % ROLE_PALETTE.length];
  }

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

  function applyDefaultRoles() {
    setDoc(doc(db, "etablissements", selectedIfsi), { roles: [...new Set([...orgRoles, ...DEFAULT_ROLES])] }, { merge: true });
  }

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

  function handleEditAuditDate() {
    if (isArchive) return;
    const newDate = prompt("Modifier la date de l'audit (format AAAA-MM-JJ) :", currentAuditDate);
    if (newDate) {
      if (isNaN(new Date(newDate).getTime())) return alert("Format invalide.");
      saveData(campaigns.map(c => c.id === activeCampaignId ? { ...c, auditDate: newDate } : c));
    }
  }

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

  // 👉 MISE A JOUR : On récupère aussi la date d'audit pour la Tour de Contrôle
  function getIfsiGlobalStats(ifsiId) {
    const docId = ifsiId === "demo_ifps_cham" ? "criteres" : ifsiId;
    const data = allQualiopiData[docId];
    if (!data) return { total: 1, conforme: 0, nonConforme: 0, enCours: 0, pct: 0, auditDate: "2026-10-15" };
    
    let liste = [];
    let auditDate = "2026-10-15";

    if (data.campaigns && data.campaigns.length > 0) {
      const currentCamp = data.campaigns[data.campaigns.length - 1];
      liste = currentCamp.liste;
      auditDate = currentCamp.auditDate || "2026-10-15";
    } else if (data.liste) {
      liste = data.liste;
    } else {
      return { total: 1, conforme: 0, nonConforme: 0, enCours: 0, pct: 0, auditDate };
    }

    const nbConcerne = liste.filter(c => c.statut !== "non-concerne").length;
    const total = nbConcerne === 0 ? 1 : nbConcerne;
    const conforme = liste.filter(c => c.statut === "conforme").length;
    const nonConforme = liste.filter(c => c.statut === "non-conforme").length;
    const enCours = liste.filter(c => c.statut === "en-cours").length;

    return { total, conforme, nonConforme, enCours, pct: Math.round((conforme/total)*100) || 0, auditDate };
  }

  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;
  if (userProfile?.role === "guest") return (<div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#f8fafc", fontFamily: "Outfit" }}><div style={{ fontSize: "50px", marginBottom: "20px" }}>🔒</div><h2 style={{ color: "#1e3a5f" }}>Accès en attente</h2><p style={{ color: "#6b7280", marginBottom: "30px" }}>Votre compte a bien été authentifié, mais vous n'êtes rattaché à aucun établissement.</p><button onClick={handleLogout} style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Se déconnecter</button></div>);
  if (userProfile?.mustChangePassword) return (<div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg,#f0f4ff,#e8f0fe)", fontFamily: "Outfit" }}><div style={{ background: "white", padding: "40px", borderRadius: "20px", boxShadow: "0 10px 40px rgba(0,0,0,0.08)", maxWidth: "400px", width: "100%", textAlign: "center" }}><div style={{ fontSize: "40px", marginBottom: "16px" }}>🔐</div><h2 style={{ color: "#1e3a5f", margin: "0 0 10px 0", fontSize: "22px", fontWeight: "800" }}>Sécurisez votre compte</h2><p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "24px", lineHeight: "1.5" }}>Veuillez remplacer le mot de passe provisoire.</p><form onSubmit={e => handleChangePassword(e, true)}><input type="password" placeholder="Nouveau (8 car., 1 maj., 1 chiffre)" onChange={e=>setPwdUpdate({...pwdUpdate, p1: e.target.value})} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", marginBottom: "12px", boxSizing: "border-box" }} required /><input type="password" placeholder="Confirmer" onChange={e=>setPwdUpdate({...pwdUpdate, p2: e.target.value})} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", marginBottom: "16px", boxSizing: "border-box" }} required />{pwdUpdate.error && <div style={{ color: "#ef4444", background: "#fef2f2", padding: "10px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px", fontWeight: "600" }}>{pwdUpdate.error}</div>}<button type="submit" disabled={pwdUpdate.loading} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "none", borderRadius: "8px", color: "white", fontWeight: "700", cursor: pwdUpdate.loading ? "wait" : "pointer" }}>{pwdUpdate.loading ? "Mise à jour..." : "Valider"}</button></form><button onClick={handleLogout} style={{ marginTop: "20px", background: "none", border: "none", color: "#9ca3af", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}>Se déconnecter</button></div></div>);

  const currentIfsiName = ifsiList.find(i => i.id === selectedIfsi)?.name || "Chargement...";
  if (campaigns === null || activeCampaignId === null || ifsiList.length === 0) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Outfit", color:"#1d4ed8", fontWeight: "700", background: "#f8fafc" }}>⏳ Chargement...</div>;

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
  
  const auditDateObj = new Date(currentAuditDate);
  const daysToAudit = Math.ceil((auditDateObj - today) / 86400000);
  let bannerConfig = { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", icon: "🗓️", text: `Audit Qualiopi dans ${daysToAudit} jour(s)` };
  if (daysToAudit < 0) bannerConfig = { bg: "#f3f4f6", border: "#d1d5db", color: "#4b5563", icon: "🏁", text: `L'audit a eu lieu il y a ${Math.abs(daysToAudit)} jour(s)` };
  else if (daysToAudit <= 30) bannerConfig = { bg: "#fee2e2", border: "#fca5a5", color: "#991b1b", icon: "🚨", text: `URGENT : Audit Qualiopi dans ${daysToAudit} jour(s) !` };
  
  const nbConcerne = criteres.filter(c => c.statut !== "non-concerne").length;
  const baseTotal = nbConcerne === 0 ? 1 : nbConcerne; 

  const stats = { total: baseTotal, conforme: criteres.filter(c => c.statut === "conforme").length, enCours: criteres.filter(c => c.statut === "en-cours").length, nonConforme: criteres.filter(c => c.statut === "non-conforme").length, nonEvalue: criteres.filter(c => c.statut === "non-evalue").length, nonConcerne: criteres.filter(c => c.statut === "non-concerne").length };
  const urgents = criteres.filter(c => { const d = days(c.delai); return !isNaN(d) && d <= 30 && c.statut !== "conforme" && c.statut !== "non-evalue" && c.statut !== "non-concerne"; });
  const filtered = criteres.filter(c => { if (filterStatut !== "tous" && c.statut !== filterStatut) return false; if (filterCritere !== "tous" && c.critere !== parseInt(filterCritere)) return false; if (searchTerm) { const s = searchTerm.toLowerCase(); return String(c.titre||"").toLowerCase().includes(s) || String(c.num||"").toLowerCase().includes(s); } return true; });
  const axes = criteres.filter(c => c.statut === "non-conforme" || c.statut === "en-cours").sort((a, b) => ({"non-conforme":0,"en-cours":1}[a.statut] - {"non-conforme":0,"en-cours":1}[b.statut]));

  const byPerson = allIfsiMembers.map(m => {
    const myCriteres = criteres.filter(c => (Array.isArray(c.responsables) ? c.responsables : []).includes(m.name));
    return { ...m, items: myCriteres };
  }).filter(p => p.items.length > 0 || p.roles.length > 0);

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
        resp: resps.join(", "), preuves: c.preuves || "", preuves_encours: c.preuves_encours || "", attendus: c.attendus || "", notes: c.notes || ""
      });
      const cConf = CRITERES_LABELS[c.critere] || { color: "#9ca3af" }; 
      row.getCell('num').font = { color: { argb: toArgb(cConf.color) }, bold: true }; row.getCell('num').alignment = { horizontal: 'center', vertical: 'middle' }; 
      row.getCell('statut').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toArgb(sConf.bg) } }; row.getCell('statut').font = { color: { argb: toArgb(sConf.color) }, bold: true }; row.getCell('statut').alignment = { horizontal: 'center', vertical: 'middle' }; 
      const cellDelai = row.getCell('delai'); if (!isNaN(d) && d < 0 && c.statut!=="non-concerne") { cellDelai.font = { color: { argb: 'FFDC2626' }, bold: true }; } else if (!isNaN(d) && d < 30 && c.statut!=="non-concerne") { cellDelai.font = { color: { argb: 'FFD97706' }, bold: true }; }
    });
    const headerRow = worksheet.getRow(1); headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }; headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }; headerRow.alignment = { vertical: 'middle', horizontal: 'center' }; worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    worksheet.eachRow((row, rowNumber) => { row.eachCell((cell) => { cell.border = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, right: { style: 'thin', color: { argb: 'FFD1D5DB' } } }; if (rowNumber > 1) { if (!cell.alignment) { cell.alignment = { vertical: 'top', wrapText: true }; } else { cell.alignment.wrapText = true; } } }); });
    const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); const url = URL.createObjectURL(blob); const safeName = currentCampaign.name.replace(/[^a-z0-9]/gi, '_').toLowerCase(); const link = document.createElement("a"); link.href = url; link.setAttribute("download", `QualiForma_Export_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  const navBtn = active => ({ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "Outfit,sans-serif", background: active ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "transparent", color: active ? "white" : "#4b5563", whiteSpace: "nowrap" });
  const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const nb = col => ({ padding: "4px 10px", background: `${col}15`, color: col, borderRadius: "6px", fontSize: "12px", fontWeight: "800", textAlign: "center", border: `1px solid ${col}30`, flexShrink: 0, whiteSpace: "nowrap" });
  const th = { textAlign: "left", padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "2px solid #f1f5f9", background: "#fafafa" };
  const td = { padding: "11px 14px", fontSize: "13px", borderBottom: "1px solid #f8fafc", verticalAlign: "middle", color: "#374151" };
  const sel = { background: "white", border: "1px solid #d1d5db", borderRadius: "7px", color: "#374151", padding: "7px 10px", fontSize: "12px", cursor: "pointer" };
  const inp = { background: "white", border: "1px solid #d1d5db", borderRadius: "8px", outline: "none", boxSizing: "border-box", fontFamily: "Outfit, sans-serif" };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif", color: "#1e3a5f" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @media print { .no-print { display: none !important; } body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { size: portrait; margin: 10mm; } * { box-shadow: none !important; } .print-break-avoid { page-break-inside: avoid; } }
        .org-card { background: white; border: 1px solid #d1d5db; padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; cursor: grab; font-size: 13px; font-weight: 600; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .org-card:active { cursor: grabbing; opacity: 0.7; }
        .td-dash:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
      `}</style>
      
      {modalCritere && <DetailModal critere={modalCritere} onClose={() => setModalCritere(null)} onSave={saveModal} isReadOnly={isArchive} isAuditMode={isAuditMode} allMembers={allIfsiMembers} rolePalette={ROLE_PALETTE} orgRoles={orgRoles} />}
      
      <div className="no-print" style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 32px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        
        {/* 👉 HAUT DE PAGE RE-STRUCTURÉ POUR ÉVITER LE RETOUR À LA LIGNE MOCHE */}
        <div style={{ maxWidth: "1440px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", gap: "20px", flexWrap: "wrap" }}>
          
          {/* BLOC 1 : LOGO & SÉLECTEUR */}
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
                <select value={selectedIfsi} onChange={handleIfsiSwitch} style={{ fontSize: "14px", fontWeight: "800", color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", outline: "none" }}>
                  {ifsiList.map(ifsi => <option key={ifsi.id} value={ifsi.id}>{ifsi.name}</option>)}
                  <option disabled>──────────</option><option value="NEW">➕ Nouvel établissement...</option>
                </select>
              ) : (<span style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a5f" }}>{currentIfsiName}</span>)}
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "10px", borderLeft: "2px solid #f1f5f9", paddingLeft: "16px" }}>
              <select value={activeCampaignId || ""} onChange={handleNewCampaign} style={{ ...sel, fontWeight: "700", color: "#1d4ed8", borderColor: "#bfdbfe", background: "#eff6ff", outline: "none" }}>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name} {c.locked ? "(Archive)" : ""}</option>)}<option disabled>──────────</option><option value="NEW">➕ Nouvelle certification...</option></select>
              {campaigns.length > 1 && <button onClick={handleDeleteCampaign} className="no-print" title="Supprimer" style={{ background: "white", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontSize: "14px", color: "#ef4444", padding: "6px 8px" }}>🗑️</button>}
            </div>
          </div>

          {/* BLOC 2 : MENUS DE NAVIGATION */}
          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap", flex: 1, justifyContent: "center" }}>
            {userProfile?.role === "superadmin" && (
              <button style={{ ...navBtn(activeTab === "tour_controle"), marginRight: "8px", border: "1px solid #6366f1", color: activeTab === "tour_controle" ? "white" : "#4f46e5", background: activeTab === "tour_controle" ? "#6366f1" : "#e0e7ff" }} onClick={() => setActiveTab("tour_controle")}>🛸 Tour de Contrôle</button>
            )}
            <button style={navBtn(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}>Tableau de bord</button>
            <button style={navBtn(activeTab === "criteres")} onClick={() => setActiveTab("criteres")}>Indicateurs</button>
            <button style={navBtn(activeTab === "axes")} onClick={() => setActiveTab("axes")}>Axes prioritaires</button>
            <button style={navBtn(activeTab === "responsables")} onClick={() => setActiveTab("responsables")}>Responsables</button>
            
            {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
              <button style={{ ...navBtn(activeTab === "organigramme"), marginLeft: "8px", border: "1px solid #10b981", color: activeTab === "organigramme" ? "white" : "#059669", background: activeTab === "organigramme" ? "#10b981" : "#d1fae5" }} onClick={() => setActiveTab("organigramme")}>🌳 Organigramme</button>
            )}
            {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
              <button style={{ ...navBtn(activeTab === "equipe"), border: "1px dashed #bfdbfe", color: activeTab === "equipe" ? "white" : "#1d4ed8", background: activeTab === "equipe" ? "#1d4ed8" : "#eff6ff" }} onClick={() => setActiveTab("equipe")}>👥 Comptes</button>
            )}
            <button onClick={() => setIsAuditMode(!isAuditMode)} style={{ ...navBtn(false), color: isAuditMode ? "#065f46" : "#4b5563", background: isAuditMode ? "#d1fae5" : "transparent", fontSize: "12px", marginLeft: "12px", border: `1px solid ${isAuditMode ? "#6ee7b7" : "#e2e8f0"}`, display: "flex", alignItems: "center", gap: "6px" }}><span>{isAuditMode ? "🕵️‍♂️ Mode Audit : ON" : "🕵️‍♂️ Mode Audit"}</span></button>
          </div>

          {/* BLOC 3 : EXPORTS & PROFIL (Forcé sur la droite) */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginLeft: "auto" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={exportToExcel} style={{ ...navBtn(false), color: "#059669", background: "#d1fae5", fontSize: "12px", border: "1px solid #6ee7b7", display: "flex", gap: "6px", padding: "6px 12px" }}><span>📊</span> Excel</button>
              <button onClick={() => window.print()} style={{ ...navBtn(false), color: "#1d4ed8", background: "#eff6ff", fontSize: "12px", border: "1px solid #bfdbfe", display: "flex", gap: "6px", padding: "6px 12px" }}><span>📄</span> PDF</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: "10px", borderLeft: "2px solid #f1f5f9" }}>
               <button onClick={() => setActiveTab("compte")} style={{ ...navBtn(activeTab === "compte"), fontSize: "11px", border: "1px solid #d1d5db", background: "white", color: "#4b5563", padding: "6px 12px" }}>⚙️ Mon compte</button>
               <button onClick={handleLogout} style={{ ...navBtn(false), color: "#ef4444", fontSize: "11px", border: "1px solid #fca5a5", background: "#fef2f2", padding: "6px 12px" }}>Déconnexion</button>
            </div>
          </div>

        </div>
      </div>
      
      {isArchive && <div className="no-print" style={{ background: "#fef2f2", borderBottom: "1px solid #fca5a5", color: "#991b1b", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "700" }}>🔒 Mode Lecture Seule : Cette évaluation est une archive historique.</div>}
      {isAuditMode && !isArchive && <div className="no-print" style={{ background: "#d1fae5", borderBottom: "1px solid #6ee7b7", color: "#065f46", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "700" }}>✅ Mode Audit Activé : Les notes internes et preuves en cours sont masquées.</div>}
      
      <div className={modalCritere ? "no-print" : ""} style={{ maxWidth: "1440px", margin: "0 auto", padding: "28px 32px" }}>
        
        {/* ========================================================= */}
        {/* 👉 ONGLET : TOUR DE CONTRÔLE (AVEC CONFORMES + DATE)      */}
        {/* ========================================================= */}
        {activeTab === "tour_controle" && userProfile?.role === "superadmin" && (
          <div>
            <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#312e81", margin: "0 0 4px" }}>🛸 Tour de Contrôle Nationale</h2>
                <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>Supervision en direct de l'avancement de tous les établissements.</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
              {ifsiList.map(ifsi => {
                const s = getIfsiGlobalStats(ifsi.id);
                
                // Calcul pour la date
                const auditDateObj = new Date(s.auditDate);
                const daysToAudit = Math.ceil((auditDateObj - today) / 86400000);
                const auditColor = daysToAudit < 0 ? "#ef4444" : daysToAudit <= 30 ? "#f59e0b" : "#10b981";
                const auditText = daysToAudit < 0 ? `Dépassé (${Math.abs(daysToAudit)}j)` : `J-${daysToAudit}`;

                return (
                  <div key={ifsi.id} className="td-dash" style={{ ...card, padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "1px solid #e0e7ff", background: "white", transition: "all 0.2s ease" }}>
                    
                    {/* Header : Nom + Date + Jauge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                      <div>
                        <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 2px 0" }}>{ifsi.name}</h3>
                        <div style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "monospace", marginBottom: "8px" }}>ID: {ifsi.id}</div>
                        {/* La date et le compte à rebours */}
                        <div style={{ fontSize: "12px", color: "#6b7280", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
                           <span>🗓️ {new Date(s.auditDate).toLocaleDateString("fr-FR")}</span>
                           <span style={{ background: auditColor+"20", color: auditColor, padding: "2px 6px", borderRadius: "4px", fontWeight: "800", fontSize: "10px" }}>{auditText}</span>
                        </div>
                      </div>
                      <GaugeChart value={s.conforme} max={s.total} color={s.pct >= 80 ? "#10b981" : s.pct >= 50 ? "#f59e0b" : "#ef4444"} size={64} fontSize={12} />
                    </div>

                    {/* Les 3 métriques */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                      <div style={{ background: "#f0fdf4", padding: "10px", borderRadius: "8px", border: "1px solid #86efac", textAlign: "center" }}>
                         <div style={{ fontSize: "18px", fontWeight: "800", color: "#166534" }}>{s.conforme}</div>
                         <div style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#15803d" }}>Conformes</div>
                      </div>
                      <div style={{ background: "#fef3c7", padding: "10px", borderRadius: "8px", border: "1px solid #fde68a", textAlign: "center" }}>
                         <div style={{ fontSize: "18px", fontWeight: "800", color: "#92400e" }}>{s.enCours}</div>
                         <div style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#d97706" }}>En cours</div>
                      </div>
                      <div style={{ background: "#fef2f2", padding: "10px", borderRadius: "8px", border: "1px solid #fca5a5", textAlign: "center" }}>
                         <div style={{ fontSize: "18px", fontWeight: "800", color: "#991b1b" }}>{s.nonConforme}</div>
                         <div style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#ef4444" }}>Non conf.</div>
                      </div>
                    </div>

                    <button onClick={() => { setSelectedIfsi(ifsi.id); setActiveTab("dashboard"); }} style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "white", borderRadius: "8px", border: "none", fontWeight: "700", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
                      <span>🔎 Accéder au portail</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- ONGLET : ORGANIGRAMME --- */}
        {activeTab === "organigramme" && (userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>🌳 Organigramme & Rôles ({currentIfsiName})</h2>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Glissez le personnel dans les colonnes. Une personne peut avoir une double casquette.</p>
            </div>

            {orgRoles.length === 0 && (
              <button onClick={applyDefaultRoles} style={{ marginBottom: "20px", background: "#10b981", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}>✨ Générer les rôles standards (Direction, Qualité...)</button>
            )}

            {orgRoles.includes("Direction") && (
              <div style={{ background: "#1e3a5f", borderRadius: "12px", padding: "16px", marginBottom: "24px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }} onDragOver={handleDragOverOrg} onDrop={(e) => handleDropOrg(e, "Direction")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #334155", paddingBottom: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "white", textTransform: "uppercase" }}>👑 Direction de l'Institut</span>
                  <button onClick={() => deleteOrgRole("Direction")} style={{ background:"transparent", border:"1px solid #475569", color: "#94a3b8", borderRadius:"6px", cursor:"pointer", padding:"2px 6px", fontSize:"10px" }}>Supprimer</button>
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", minHeight: "45px" }}>
                  {allIfsiMembers.filter(m => m.roles.includes("Direction")).map(m => (
                    <div key={m.id} style={{ background: "white", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: "700", color: "#1e3a5f" }}>
                      <span>{m.type==="account"?"👤":"👻"} {m.name}</span>
                      <button onClick={() => removeRoleFromUser(m.type, m.id, "Direction")} style={{ border: "none", background: "#fef2f2", color: "#ef4444", borderRadius: "50%", width: "18px", height: "18px", cursor: "pointer" }}>×</button>
                    </div>
                  ))}
                  {allIfsiMembers.filter(m => m.roles.includes("Direction")).length === 0 && <span style={{ color: "#64748b", fontSize: "12px", fontStyle: "italic", alignSelf: "center" }}>Glissez le directeur / la directrice ici.</span>}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", overflowX: "auto", paddingBottom: "20px" }}>
              <div style={{ width: "280px", flexShrink: 0, background: "#f8fafc", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0", minHeight: "60vh" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "800", color: "#475569", marginBottom: "16px", textTransform: "uppercase", borderBottom: "2px solid #cbd5e1", paddingBottom: "8px" }}>👥 Équipe globale</h3>
                
                {allIfsiMembers.map(m => (
                  <div key={m.id} className="org-card" draggable onDragStart={(e) => handleDragStartOrg(e, m.type, m.id)} style={{ borderLeft: m.roles.length===0 ? "4px solid #f59e0b" : "1px solid #d1d5db" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                       <span style={{ fontWeight: "700", color: "#1e3a5f" }}>{m.type==="account" ? "👤" : "👻"} {m.name}</span>
                       {m.type === "manual" && <button onClick={() => deleteManualUser(m.id)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer" }}>🗑️</button>}
                    </div>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                       {m.roles.length === 0 && <span style={{ fontSize: "10px", color: "#d97706", background: "#fffbeb", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>À assigner</span>}
                       {m.roles.map(r => {
                          const col = getRoleColor(r);
                          return <span key={r} style={{ fontSize: "10px", background: col.bg, color: col.text, border: `1px solid ${col.border}`, padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>{r}</span>
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

              {orgRoles.filter(r => r !== "Direction").map((role) => {
                const colConf = getRoleColor(role);
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
                          <button onClick={() => removeRoleFromUser(m.type, m.id, role)} style={{ border: "none", background: "#fef2f2", color: "#ef4444", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px" }}>×</button>
                        </div>
                      ))}
                      {peopleInRole.length === 0 && <div style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic", textAlign: "center", marginTop: "20px" }}>Glissez une personne ici</div>}
                    </div>
                  </div>
                );
              })}

              <div style={{ width: "260px", flexShrink: 0, background: "#f1f5f9", borderRadius: "12px", padding: "16px", border: "1px dashed #cbd5e1" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "12px" }}>+ NOUVEAU RÔLE / COLONNE</span>
                <input type="text" value={newRoleInput} onChange={e => setNewRoleInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOrgRole()} placeholder="Ex: Qualité..." style={{ ...inp, padding: "8px", fontSize: "12px", marginBottom: "8px", width: "100%" }} />
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

        {/* --- ONGLET "MON COMPTE" --- */}
        {activeTab === "compte" && (
          <div style={{ maxWidth: "500px", margin: "0 auto" }}>
            <div style={{ marginBottom: "24px", textAlign: "center" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>⚙️ Mon compte personnel</h2>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Gérez vos informations de sécurité.</p>
            </div>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
                 <div>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase" }}>Email de connexion</div>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#1e3a5f" }}>{auth.currentUser?.email}</div>
                 </div>
                 <span style={{ fontSize: "10px", fontWeight: "800", background: "#eff6ff", color: "#1d4ed8", padding: "4px 8px", borderRadius: "6px", border: "1px solid #bfdbfe", textTransform: "uppercase" }}>Rôle : {userProfile?.role}</span>
              </div>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f", marginBottom: "12px" }}>Changer mon mot de passe</h3>
              {pwdUpdate.success && <div style={{ color: "#059669", background: "#d1fae5", padding: "10px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px", fontWeight: "600", border: "1px solid #6ee7b7" }}>{pwdUpdate.success}</div>}
              {pwdUpdate.error && <div style={{ color: "#ef4444", background: "#fef2f2", padding: "10px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px", fontWeight: "600", border: "1px solid #fca5a5" }}>{pwdUpdate.error}</div>}
              <form onSubmit={(e) => handleChangePassword(e, false)}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280" }}>Nouveau mot de passe</label>
                  <input type="password" value={pwdUpdate.p1} onChange={e => setPwdUpdate({...pwdUpdate, p1: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px" }} placeholder="8 caractères, 1 majuscule, 1 chiffre" required />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280" }}>Confirmer le mot de passe</label>
                  <input type="password" value={pwdUpdate.p2} onChange={e => setPwdUpdate({...pwdUpdate, p2: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px" }} placeholder="Répétez le mot de passe" required />
                </div>
                <button type="submit" disabled={pwdUpdate.loading} style={{ width: "100%", padding: "10px", background: "#1e3a5f", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: pwdUpdate.loading ? "wait" : "pointer" }}>
                  {pwdUpdate.loading ? "Enregistrement..." : "Mettre à jour le mot de passe"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- ONGLET ÉQUIPE (CRÉATION DE COMPTES) --- */}
        {activeTab === "equipe" && (userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>👥 Création de comptes d'accès</h2>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Créez les identifiants de connexion. Vous pourrez ensuite affecter ces personnes dans l'onglet "Organigramme".</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "24px", alignItems: "start" }}>
              <div style={{ ...card, background: "#f8fafc" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 16px 0", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" }}>➕ Nouveau compte</h3>
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px", borderRadius: "6px", fontSize: "11px", color: "#1d4ed8", marginBottom: "16px", lineHeight: "1.4" }}>
                  ℹ️ L'utilisateur sera forcé de modifier son mot de passe provisoire lors de sa première connexion.
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Email</label>
                  <input type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px" }} placeholder="formateur@ifsi.fr" />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Mot de passe provisoire</label>
                  <input type="text" value={newMember.pwd} onChange={e => setNewMember({...newMember, pwd: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px" }} placeholder="Ex: Qualiopi2026!" />
                  <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "6px", lineHeight: "1.4" }}>👉 Minimum 6 caractères.</div>
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Rôle système</label>
                  <select value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px", background: "white" }}>
                    <option value="user">Formateur / Membre (Lecture & Écriture)</option>
                    {userProfile.role === "superadmin" && <option value="admin">Administrateur IFSI (Peut inviter des gens)</option>}
                  </select>
                </div>
                {userProfile.role === "superadmin" && (
                   <div style={{ marginBottom: "16px", background: "#fffbeb", padding: "10px", borderRadius: "8px", border: "1px dashed #fcd34d" }}>
                     <label style={{ fontSize: "11px", fontWeight: "800", color: "#d97706", textTransform: "uppercase" }}>👑 Choix IFSI (Mode Superadmin)</label>
                     <select value={newMember.ifsi || selectedIfsi} onChange={e => setNewMember({...newMember, ifsi: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #fcd34d", marginTop: "4px", background: "white" }}>
                       {ifsiList.map(ifsi => <option key={ifsi.id} value={ifsi.id}>{ifsi.name}</option>)}
                     </select>
                   </div>
                )}
                <button onClick={handleCreateUser} disabled={isCreatingUser} style={{ width: "100%", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white", padding: "10px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: isCreatingUser ? "wait" : "pointer" }}>
                  {isCreatingUser ? "Création en cours..." : "Créer le compte"}
                </button>
              </div>

              <div style={{ ...card, padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Email</th><th style={th}>Rôle Système</th>{userProfile.role === "superadmin" && <th style={th}>IFSI Attaché</th>}<th style={th}>Actions</th></tr></thead>
                  <tbody>
                    {teamUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ ...td, fontWeight: "600", color: "#1e3a5f" }}>{u.email || u.id}</td>
                        <td style={td}>
                          {u.role === "superadmin" && <span style={{ background: "#fef2f2", color: "#991b1b", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", border: "1px solid #fca5a5" }}>SUPERADMIN</span>}
                          {u.role === "admin" && <span style={{ background: "#fff7ed", color: "#c2410c", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", border: "1px solid #fed7aa" }}>ADMIN IFSI</span>}
                          {(u.role === "user" || !u.role) && <span style={{ background: "#f3f4f6", color: "#4b5563", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", border: "1px solid #d1d5db" }}>FORMATEUR</span>}
                        </td>
                        {userProfile.role === "superadmin" && <td style={{ ...td, fontSize: "11px", color: "#6b7280" }}>{ifsiList.find(i => i.id === u.etablissementId)?.name || u.etablissementId}</td>}
                        <td style={td}>
                          {u.id !== auth.currentUser?.uid && u.role !== "superadmin" && (
                            <button onClick={() => handleDeleteUser(u.id, u.email)} style={{ background: "white", color: "#ef4444", border: "1px solid #fca5a5", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>Supprimer</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- DASHBOARD --- */}
        {activeTab === "dashboard" && <>
          <div className="print-break-avoid no-print" style={{ background: bannerConfig.bg, border: `1px solid ${bannerConfig.border}`, borderRadius: "12px", padding: "16px 24px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "24px" }}>{bannerConfig.icon}</span>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: bannerConfig.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{bannerConfig.text}</div>
                <div style={{ fontSize: "12px", color: bannerConfig.color, opacity: 0.8, marginTop: "2px", fontWeight: "600" }}>Date officielle visée : {new Date(currentAuditDate).toLocaleDateString("fr-FR")}</div>
              </div>
            </div>
            {!isArchive && <button onClick={handleEditAuditDate} style={{ background: "transparent", border: `1px solid ${bannerConfig.color}`, color: bannerConfig.color, padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", opacity: 0.7, transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.opacity=1} onMouseOut={e=>e.currentTarget.style.opacity=0.7}>Modifier la date</button>}
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

        {/* --- CRITERES --- */}
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
                return (<tr key={c.id} className="print-break-avoid" onMouseOver={e => e.currentTarget.style.background="#f8fafc"} onMouseOut={e => e.currentTarget.style.background="white"}><td style={{ ...td, width: "110px" }}><span style={nb(cConf.color)}>{c.num || "-"}</span></td><td style={{ ...td, maxWidth: "280px", opacity: c.statut==="non-concerne"?0.6:1 }}><div style={{ fontWeight: "600", color: "#1e3a5f" }}>{c.titre || "-"}</div><div style={{ fontSize: "11px", color: "#9ca3af" }}>{cConf.label}</div></td><td style={{ ...td, maxWidth: "200px" }}>{resps.length === 0 ? <span style={{ fontSize: "11px", color: "#d97706", fontWeight: "600", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "5px", padding: "2px 8px" }}>À assigner</span> : <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>{resps.slice(0,2).map(r => { const rSafe = String(r || ""); return <span key={rSafe} style={{ fontSize: "10px", color: "#1e40af", background: "#eff6ff", border: `1px solid #bfdbfe`, borderRadius: "4px", padding: "2px 6px", fontWeight: "600" }}>{rSafe.split("(")[0].trim()}</span> })}{resps.length > 2 && <span style={{ fontSize: "10px", color: "#6b7280", background: "#f3f4f6", borderRadius: "4px", padding: "2px 6px" }}>+{resps.length-2}</span>}</div>}</td><td style={td}><div style={{ fontSize: "12px" }}>{c.statut==="non-concerne"?"-":new Date(c.delai || today).toLocaleDateString("fr-FR")}</div>{c.statut!=="non-concerne" && !isNaN(d) && <div style={{ fontSize: "10px", color: dayColor(c.delai), fontWeight: "600" }}>{d < 0 ? `${Math.abs(d)}j dépassé` : `J-${d}`}</div>}</td><td style={td}><StatusBadge statut={c.statut} /></td>
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

        {/* --- AXES --- */}
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

      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
