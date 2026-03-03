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
    if (this.state.hasError) return (<div style={{ padding: "40px", textAlign: "center" }}><h1 style={{ color: "#ef4444" }}>⚠️ Erreur</h1><pre style={{ background: "#fef2f2", padding: "20px", border: "1px solid #fca5a5", borderRadius: "8px", overflowX: "auto" }}>{this.state.error?.toString()}</pre><button onClick={() => window.location.reload()} style={{ marginTop: "20px", padding: "10px 20px", background: "#1d4ed8", color: "white", borderRadius: "8px", border: "none", cursor: "pointer" }}>Recharger l'application</button></div>);
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

  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [teamSortConfig, setTeamSortConfig] = useState({ key: "email", direction: "asc" });

  const [tourSort, setTourSort] = useState("urgence");

  useEffect(() => {
    const unsubIfsi = onSnapshot(collection(db, "etablissements"), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, name: doc.data().name || "IFSI sans nom", archived: doc.data().archived || false }));
      if (list.length === 0) {
        setDoc(doc(db, "etablissements", "demo_ifps_cham"), { name: "IFPS du CHAM", roles: DEFAULT_ROLES, archived: false });
      } else { 
        list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))); 
        setIfsiList(list); 
      }
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
          await setDoc(doc(db, "etablissements", safeId), { name: nomEtablissement.trim(), roles: DEFAULT_ROLES, manualUsers: [], archived: false });
          setSelectedIfsi(safeId);
          setActiveTab("dashboard");
        } catch (error) { alert("Erreur."); }
      }
    } else {
      setSelectedIfsi(e.target.value);
      setActiveTab("dashboard");
    }
  }

  async function handleRenameIfsi(ifsiId, currentName) {
    const newName = prompt(`Renommer l'établissement "${currentName}" :`, currentName);
    if (newName && newName.trim() !== "" && newName !== currentName) {
      try {
        await setDoc(doc(db, "etablissements", ifsiId), { name: newName.trim() }, { merge: true });
      } catch (error) { alert("Erreur : " + error.message); }
    }
  }

  async function handleArchiveIfsi(ifsiId, name, archiveStatus) {
    const action = archiveStatus ? "archiver" : "restaurer";
    if (!window.confirm(`Voulez-vous vraiment ${action} l'établissement "${name}" ?`)) return;
    try { await setDoc(doc(db, "etablissements", ifsiId), { archived: archiveStatus }, { merge: true }); } 
    catch (e) { alert("Erreur : " + e.message); }
  }

  async function handleHardDeleteIfsi(ifsiId, name) {
    const confirmText = prompt(`⚠️ ATTENTION DANGER DÉFINITIF ⚠️\n\nVous êtes sur le point de détruire "${name}".\nToutes les données seront perdues à jamais.\n\nPour confirmer, tapez le mot "SUPPRIMER" en majuscules :`);
    if (confirmText === "SUPPRIMER") {
      try {
        await deleteDoc(doc(db, "etablissements", ifsiId));
        await deleteDoc(doc(db, "qualiopi", ifsiId === "demo_ifps_cham" ? "criteres" : ifsiId));
        if (selectedIfsi === ifsiId) setSelectedIfsi("demo_ifps_cham");
        alert("L'établissement a été supprimé.");
      } catch (e) { alert("Erreur : " + e.message); }
    } else if (confirmText !== null) { alert("Annulé. Le mot de sécurité était incorrect."); }
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
  ].sort((a,b) => String(a.name || "").localeCompare(String(b.name || ""))); 

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

  async function editOrgRole(oldRole) {
    const newRole = prompt("Renommer la colonne :", oldRole);
    if (newRole && newRole.trim() !== "" && newRole !== oldRole) {
      const finalRole = newRole.trim();
      if (orgRoles.includes(finalRole)) return alert("Ce rôle existe déjà.");
      
      const updatedRoles = orgRoles.map(r => r === oldRole ? finalRole : r);
      const updatedManuals = manualUsers.map(u => ({
        ...u,
        roles: (Array.isArray(u.roles) ? u.roles : []).map(r => r === oldRole ? finalRole : r)
      }));

      for (const acc of orgAccounts) {
        const cRoles = Array.isArray(acc.orgRoles) ? acc.orgRoles : [];
        if (cRoles.includes(oldRole)) {
          await setDoc(doc(db, "users", acc.id), { orgRoles: cRoles.map(r => r === oldRole ? finalRole : r) }, { merge: true });
        }
      }
      await setDoc(doc(db, "etablissements", selectedIfsi), { roles: updatedRoles, manualUsers: updatedManuals }, { merge: true });
    }
  }

  async function editManualUser(id, currentName) {
    const newName = prompt("Modifier le nom de l'entité :", currentName);
    if (newName && newName.trim() !== "" && newName !== currentName) {
      const finalName = newName.trim();
      const updatedManuals = manualUsers.map(u => u.id === id ? { ...u, name: finalName } : u);
      await setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: updatedManuals }, { merge: true });

      if (campaigns && campaigns.length > 0) {
        const newCampaigns = campaigns.map(camp => {
          const newListe = camp.liste.map(c => {
            if (c.responsables && c.responsables.includes(currentName)) {
              return { ...c, responsables: c.responsables.map(r => r === currentName ? finalName : r) };
            }
            return c;
          });
          return { ...camp, liste: newListe };
        });
        saveData(newCampaigns);
      }
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
    if (window.confirm("Supprimer ce profil manuel ?")) {
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

  const today = new Date();
  const days = d => { if (!d) return NaN; const p = new Date(d); return isNaN(p.getTime()) ? NaN : Math.round((p - today) / 86400000); };
  const dayColor = d => { const daysLeft = days(d); if (isNaN(daysLeft)) return "#6b7280"; return daysLeft < 0 ? "#dc2626" : daysLeft < 30 ? "#d97706" : "#6b7280"; };

  function getIfsiGlobalStats(ifsiId) {
    const docId = ifsiId === "demo_ifps_cham" ? "criteres" : ifsiId;
    const data = allQualiopiData[docId];
    if (!data) return { total: 1, conforme: 0, nonConforme: 0, enCours: 0, pct: 0, auditDate: "2026-10-15", liste: [] };
    
    let liste = [];
    let auditDate = "2026-10-15";

    if (data.campaigns && data.campaigns.length > 0) {
      const currentCamp = data.campaigns[data.campaigns.length - 1];
      liste = currentCamp.liste;
      auditDate = currentCamp.auditDate || "2026-10-15";
    } else if (data.liste) {
      liste = data.liste;
    } else {
      return { total: 1, conforme: 0, nonConforme: 0, enCours: 0, pct: 0, auditDate, liste: [] };
    }

    const nbConcerne = liste.filter(c => c.statut !== "non-concerne").length;
    const total = nbConcerne === 0 ? 1 : nbConcerne;
    const conforme = liste.filter(c => c.statut === "conforme").length;
    const nonConforme = liste.filter(c => c.statut === "non-conforme").length;
    const enCours = liste.filter(c => c.statut === "en-cours").length;

    return { total, conforme, nonConforme, enCours, pct: Math.round((conforme/total)*100) || 0, auditDate, liste };
  }

  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;
  
  if (userProfile?.role === "guest") return (<div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#f8fafc", fontFamily: "Outfit" }}><div style={{ fontSize: "50px", marginBottom: "20px" }}>🔒</div><h2 style={{ color: "#1e3a5f" }}>Accès en attente</h2><p style={{ color: "#6b7280", marginBottom: "30px" }}>Votre compte a bien été authentifié, mais vous n'êtes rattaché à aucun établissement.</p><button onClick={handleLogout} style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Se déconnecter</button></div>);
  if (userProfile?.mustChangePassword) return (<div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg,#f0f4ff,#e8f0fe)", fontFamily: "Outfit" }}><div style={{ background: "white", padding: "40px", borderRadius: "20px", boxShadow: "0 10px 40px rgba(0,0,0,0.08)", maxWidth: "400px", width: "100%", textAlign: "center" }}><div style={{ fontSize: "40px", marginBottom: "16px" }}>🔐</div><h2 style={{ color: "#1e3a5f", margin: "0 0 10px 0", fontSize: "22px", fontWeight: "800" }}>Sécurisez votre compte</h2><p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "24px", lineHeight: "1.5" }}>Veuillez remplacer le mot de passe provisoire.</p><form onSubmit={e => handleChangePassword(e, true)}><input type="password" placeholder="Nouveau (8 car., 1 maj., 1 chiffre)" onChange={e=>setPwdUpdate({...pwdUpdate, p1: e.target.value})} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", marginBottom: "12px", boxSizing: "border-box" }} required /><input type="password" placeholder="Confirmer" onChange={e=>setPwdUpdate({...pwdUpdate, p2: e.target.value})} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", marginBottom: "16px", boxSizing: "border-box" }} required />{pwdUpdate.error && <div style={{ color: "#ef4444", background: "#fef2f2", padding: "10px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px", fontWeight: "600" }}>{pwdUpdate.error}</div>}<button type="submit" disabled={pwdUpdate.loading} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "none", borderRadius: "8px", color: "white", fontWeight: "700", cursor: pwdUpdate.loading ? "wait" : "pointer" }}>{pwdUpdate.loading ? "Mise à jour..." : "Valider"}</button></form><button onClick={handleLogout} style={{ marginTop: "20px", background: "none", border: "none", color: "#9ca3af", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}>Se déconnecter</button></div></div>);

  const currentIfsiObj = ifsiList.find(i => i.id === selectedIfsi);
  if (currentIfsiObj?.archived && userProfile?.role !== "superadmin") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#f8fafc", fontFamily: "Outfit" }}>
        <div style={{ fontSize: "50px", marginBottom: "20px" }}>📦</div>
        <h2 style={{ color: "#1e3a5f" }}>Établissement Archivé</h2>
        <p style={{ color: "#6b7280", marginBottom: "30px" }}>Cet espace a été suspendu par la direction.</p>
        <button onClick={handleLogout} style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Se déconnecter</button>
      </div>
    );
  }

  const currentIfsiName = currentIfsiObj?.name || "Chargement...";
  if (campaigns === null || activeCampaignId === null || ifsiList.length === 0) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Outfit", color:"#1d4ed8", fontWeight: "700", background: "#f8fafc" }}>⏳ Chargement...</div>;

  const currentCampaign = campaigns.find(c => c.id === activeCampaignId) || campaigns[0];
  const criteres = currentCampaign.liste || [];
  const isArchive = currentCampaign.locked || false;
  const currentAuditDate = currentCampaign.auditDate || "2026-10-15"; 

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

  function saveModal(updated, action) {
    if (isArchive) {
       if (action === "close" || !action) setModalCritere(null);
       if (action === "next") setModalCritere(filtered[filtered.findIndex(c => c.id === updated.id) + 1]);
       if (action === "prev") setModalCritere(filtered[filtered.findIndex(c => c.id === updated.id) - 1]);
       return;
    }

    const oldCritere = criteres.find(c => c.id === updated.id);
    let newLogs = [];
    const userEmail = auth.currentUser?.email || "Utilisateur inconnu";
    const now = new Date().toISOString();

    if (oldCritere.statut !== updated.statut) {
      const oldName = STATUT_CONFIG[oldCritere.statut]?.label || "Non évalué";
      const newName = STATUT_CONFIG[updated.statut]?.label || "Non évalué";
      newLogs.push({ date: now, user: userEmail, msg: `Statut : ${oldName} ➡️ ${newName}` });
    }
    
    const oldResps = Array.isArray(oldCritere.responsables) ? oldCritere.responsables.slice().sort().join(", ") : "";
    const newResps = Array.isArray(updated.responsables) ? updated.responsables.slice().sort().join(", ") : "";
    if (oldResps !== newResps) {
      newLogs.push({ date: now, user: userEmail, msg: `Responsables mis à jour : ${newResps || "Aucun"}` });
    }

    if ((oldCritere.preuves || "") !== (updated.preuves || "")) {
       newLogs.push({ date: now, user: userEmail, msg: `📝 A modifié le texte des justifications / liens publics` });
    }
    if ((oldCritere.preuves_encours || "") !== (updated.preuves_encours || "")) {
       newLogs.push({ date: now, user: userEmail, msg: `🚧 A modifié le texte de la zone de chantier` });
    }

    let finalUpdated = { ...updated };
    if (newLogs.length > 0) {
      finalUpdated.historique = [...(oldCritere.historique || []), ...newLogs];
    }

    const newCriteres = criteres.map(c => c.id === finalUpdated.id ? finalUpdated : c);
    saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newCriteres } : camp));

    const currentIndex = filtered.findIndex(c => c.id === finalUpdated.id);
    if (action === "close" || action === undefined) setModalCritere(null);
    if (action === "next") setModalCritere(filtered[currentIndex + 1]);
    if (action === "prev") setModalCritere(filtered[currentIndex - 1]);
  }

  function handleAutoSave(updated) {
    if (isArchive) return;
    const newCriteres = criteres.map(c => c.id === updated.id ? updated : c);
    saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newCriteres } : camp));
  }

  const byPerson = allIfsiMembers.map(m => {
    const myCriteres = criteres.filter(c => (Array.isArray(c.responsables) ? c.responsables : []).includes(m.name));
    return { ...m, items: myCriteres };
  }).filter(p => p.items.length > 0 || p.roles.length > 0);

  const filteredTeamUsers = teamUsers.filter(u => {
    if (!teamSearchTerm) return true;
    const sLower = teamSearchTerm.toLowerCase();
    const eMatch = (u.email || "").toLowerCase().includes(sLower);
    const ifsiName = ifsiList.find(i => i.id === u.etablissementId)?.name || u.etablissementId || "";
    const iMatch = ifsiName.toLowerCase().includes(sLower);
    return eMatch || iMatch;
  });

  const sortedTeamUsers = [...filteredTeamUsers].sort((a, b) => {
    let valA = ""; let valB = "";
    if (teamSortConfig.key === "email") { valA = a.email || ""; valB = b.email || ""; }
    else if (teamSortConfig.key === "role") { valA = a.role || "user"; valB = b.role || "user"; }
    else if (teamSortConfig.key === "ifsi") { 
      valA = ifsiList.find(i => i.id === a.etablissementId)?.name || a.etablissementId || ""; 
      valB = ifsiList.find(i => i.id === b.etablissementId)?.name || b.etablissementId || ""; 
    }
    if (valA < valB) return teamSortConfig.direction === "asc" ? -1 : 1;
    if (valA > valB) return teamSortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleSortTeam = (key) => {
    let direction = "asc";
    if (teamSortConfig.key === key && teamSortConfig.direction === "asc") direction = "desc";
    setTeamSortConfig({ key, direction });
  };

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

  const navBtn = active => ({ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "Outfit,sans-serif", background: active ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "transparent", color: active ? "white" : "#4b5563", whiteSpace: "nowrap", transition: "all 0.2s" });
  const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const nb = col => ({ padding: "4px 10px", background: `${col}15`, color: col, borderRadius: "6px", fontSize: "12px", fontWeight: "800", textAlign: "center", border: `1px solid ${col}30`, flexShrink: 0, whiteSpace: "nowrap" });
  const th = { textAlign: "left", padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "2px solid #f1f5f9", background: "#fafafa" };
  const td = { padding: "11px 14px", fontSize: "13px", borderBottom: "1px solid #f8fafc", verticalAlign: "middle", color: "#374151" };
  const sel = { background: "white", border: "1px solid #d1d5db", borderRadius: "7px", color: "#374151", padding: "7px 10px", fontSize: "12px", cursor: "pointer" };
  const inp = { background: "white", border: "1px solid #d1d5db", borderRadius: "8px", outline: "none", boxSizing: "border-box", fontFamily: "Outfit, sans-serif" };

  const activeIfsisStats = activeIfsis.map(i => ({ id: i.id, name: i.name, ...getIfsiGlobalStats(i.id) }));
  
  const sortedTourIfsis = [...activeIfsisStats].sort((a, b) => {
    if (tourSort === "urgence") {
      const dateA = new Date(a.auditDate).getTime() || 0;
      const dateB = new Date(b.auditDate).getTime() || 0;
      return dateA - dateB;
    }
    if (tourSort === "score_desc") return b.pct - a.pct;
    if (tourSort === "score_asc") return a.pct - b.pct;
    if (tourSort === "alpha") return String(a.name || "").localeCompare(String(b.name || ""));
    return 0;
  });

  const globalScore = activeIfsisStats.length > 0 ? Math.round(activeIfsisStats.reduce((acc, curr) => acc + curr.pct, 0) / activeIfsisStats.length) : 0;
  const totalUsersInNetwork = teamUsers.length; 

  let globalAlerts = [];
  activeIfsisStats.forEach(ifsiStat => {
    if (ifsiStat.liste) {
      ifsiStat.liste.forEach(c => {
        if (c.statut === "non-conforme") {
          globalAlerts.push({ ifsiId: ifsiStat.id, ifsiName: ifsiStat.name, critere: c, type: "non-conforme" });
        } else if (c.statut !== "conforme" && c.statut !== "non-concerne") {
          const daysLeft = days(c.delai);
          if (!isNaN(daysLeft) && daysLeft < 0) {
            globalAlerts.push({ ifsiId: ifsiStat.id, ifsiName: ifsiStat.name, critere: c, type: "depasse", days: Math.abs(daysLeft) });
          }
        }
      });
    }
  });
  const topAlerts = globalAlerts.slice(0, 12);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif", color: "#1e3a5f" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @media print { 
          .no-print { display: none !important; } 
          body { background: white !important; } 
          .print-break-avoid { page-break-inside: avoid; }
        }
        .org-card { background: white; border: 1px solid #d1d5db; padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; cursor: grab; font-size: 13px; font-weight: 600; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .org-card:active { cursor: grabbing; opacity: 0.7; }
        .td-dash:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .alert-ticker::-webkit-scrollbar { height: 6px; }
        .alert-ticker::-webkit-scrollbar-thumb { background: #fca5a5; border-radius: 10px; }
      `}</style>
      
      {modalCritere && (
        <DetailModal 
          critere={modalCritere} 
          onClose={() => setModalCritere(null)} 
          onSave={saveModal} 
          onAutoSave={handleAutoSave}
          isReadOnly={isArchive} 
          isAuditMode={isAuditMode} 
          allMembers={allIfsiMembers} 
          rolePalette={ROLE_PALETTE} 
          orgRoles={orgRoles} 
          hasPrev={filtered.findIndex(c => c.id === modalCritere.id) > 0}
          hasNext={filtered.findIndex(c => c.id === modalCritere.id) < filtered.length - 1}
        />
      )}
      
      <div className="no-print" style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 32px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ maxWidth: "1440px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", gap: "20px", flexWrap: "wrap" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div 
              onClick={() => {
                setActiveTab(userProfile?.role === "superadmin" ? "tour_controle" : "dashboard");
                setSearchTerm(""); setFilterStatut("tous"); setFilterCritere("tous");
              }} 
              style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
              title="Retour à l'accueil"
            >
              <div style={{ width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#1d4ed8"/><stop offset="1" stopColor="#3b82f6"/></linearGradient></defs>
                  <path fillRule="evenodd" clipRule="evenodd" d="M11 2C6.02944 2 2 6.02944 2 11C2 15.9706 6.02944 20 11 20C13.125 20 15.078 19.2635 16.6177 18.0319L20.2929 21.7071C20.6834 22.0976 21.3166 22.0976 21.7071 21.7071C22.0976 21.3166 22.0976 20.6834 21.7071 20.2929L18.0319 16.6177C19.2635 15.078 20 13.125 20 11C20 6.02944 15.9706 2 11 2ZM4 11C4 7.13401 7.13401 4 11 4C14.866 4 18 7.13401 18 11C18 14.866 14.866 18 11 18C7.13401 18 4 14.866 4 11Z" fill="url(#grad)"/>
                  <path d="M10.5 15.5L7 12L8.41 10.59L10.5 12.67L14.59 8.59L16 10L10.5 15.5Z" fill="url(#grad)"/>
                </svg>
              </div>
              <span style={{ fontSize: "18px", fontWeight: "800", color: "#1e3a5f" }}>QualiForma</span>
              <span style={{ fontSize: "10px", color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>V2.0</span>
            </div>
            
            <span style={{ color: "#d1d5db" }}>—</span>
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px", borderLeft: "2px solid transparent" }}>
              {userProfile?.role === "superadmin" ? (
                <select value={selectedIfsi} onChange={handleIfsiSwitch} style={{ fontSize: "14px", fontWeight: "800", color: currentIfsiObj?.archived ? "#991b1b" : "#1d4ed8", background: currentIfsiObj?.archived ? "#fef2f2" : "#eff6ff", border: `1px solid ${currentIfsiObj?.archived ? "#fca5a5" : "#bfdbfe"}`, borderRadius: "6px", padding: "4px 8px", cursor: "pointer", outline: "none" }}>
                  {ifsiList.map(ifsi => <option key={ifsi.id} value={ifsi.id}>{ifsi.name} {ifsi.archived ? " 📦 (Archivé)" : ""}</option>)}
                  <option disabled>──────────</option><option value="NEW">➕ Nouvel établissement...</option>
                </select>
              ) : (<span style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a5f" }}>{currentIfsiName}</span>)}
              
              <select value={activeCampaignId || ""} onChange={handleNewCampaign} style={{ ...sel, fontWeight: "700", color: "#1d4ed8", borderColor: "#bfdbfe", background: "#eff6ff", outline: "none", marginLeft: "10px" }}>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name} {c.locked ? "(Archive)" : ""}</option>)}<option disabled>──────────</option><option value="NEW">➕ Nouvelle certification...</option></select>
              {campaigns.length > 1 && <button onClick={handleDeleteCampaign} className="no-print" title="Supprimer" style={{ background: "white", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontSize: "14px", color: "#ef4444", padding: "6px 8px" }}>🗑️</button>}
            </div>
          </div>

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

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginLeft: "auto" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={exportToExcel} style={{ ...navBtn(false), color: "#059669", background: "#d1fae5", fontSize: "12px", border: "1px solid #6ee7b7", display: "flex", gap: "6px", padding: "6px 12px" }}><span>📊</span> Excel</button>
              {/* 👉 NOUVEAU BOUTON LIVRE BLANC */}
              <button onClick={() => setActiveTab("livre_blanc")} style={{ ...navBtn(activeTab === "livre_blanc"), color: activeTab === "livre_blanc" ? "white" : "#4f46e5", background: activeTab === "livre_blanc" ? "#4f46e5" : "#e0e7ff", fontSize: "12px", border: "1px solid #6366f1", display: "flex", gap: "6px", padding: "6px 12px" }}><span>📘</span> Livre Blanc</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: "10px", borderLeft: "2px solid #f1f5f9" }}>
               <button onClick={() => setActiveTab("compte")} style={{ ...navBtn(activeTab === "compte"), fontSize: "11px", border: "1px solid #d1d5db", background: "white", color: "#4b5563", padding: "6px 12px" }}>⚙️ Mon compte</button>
               <button onClick={handleLogout} style={{ ...navBtn(false), color: "#ef4444", fontSize: "11px", border: "1px solid #fca5a5", background: "#fef2f2", padding: "6px 12px" }}>Déconnexion</button>
            </div>
          </div>

        </div>
      </div>
      
      {currentIfsiObj?.archived && <div className="no-print" style={{ background: "#fef2f2", borderBottom: "1px solid #fca5a5", color: "#991b1b", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "700" }}>⚠️ ATTENTION : Cet établissement est actuellement ARCHIVÉ. Il est invisible pour les utilisateurs normaux.</div>}
      {isArchive && <div className="no-print" style={{ background: "#fef2f2", borderBottom: "1px solid #fca5a5", color: "#991b1b", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "700" }}>🔒 Mode Lecture Seule : Cette évaluation est une archive historique.</div>}
      {isAuditMode && !isArchive && <div className="no-print" style={{ background: "#d1fae5", borderBottom: "1px solid #6ee7b7", color: "#065f46", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "700" }}>✅ Mode Audit Activé : Les notes internes et preuves en cours sont masquées.</div>}
      
      <div className={modalCritere ? "no-print" : ""} style={{ maxWidth: "1440px", margin: "0 auto", padding: "28px 32px" }}>
        
        {/* ========================================================= */}
        {/* 👉 NOUVEAU : ONGLET LIVRE BLANC                           */}
        {/* ========================================================= */}
        {activeTab === "livre_blanc" && (
          <div style={{ background: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.05)", maxWidth: "900px", margin: "0 auto", color: "black", fontFamily: "Arial, sans-serif" }}>
            
            {/* Bandeau d'impression (masqué lors de l'impression) */}
            <div className="no-print" style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#eff6ff", padding: "16px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
              <p style={{ margin: 0, color: "#1d4ed8", fontWeight: "600", fontSize: "14px" }}>Ceci est la vue propre optimisée pour l'impression ou l'export PDF du rapport officiel.</p>
              <button onClick={() => window.print()} style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>🖨️ Générer le PDF (Imprimer)</button>
            </div>

            {/* En-tête du document */}
            <div style={{ textAlign: "center", marginBottom: "40px", borderBottom: "3px solid #1e3a5f", paddingBottom: "20px" }}>
              <h1 style={{ fontSize: "32px", fontWeight: "900", color: "#1e3a5f", margin: "0 0 10px 0" }}>Livre Blanc Qualiopi</h1>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#475569", margin: "0 0 10px 0" }}>{currentIfsiName}</h2>
              <div style={{ fontSize: "14px", color: "#64748b" }}>Généré le {new Date().toLocaleDateString('fr-FR')} • Évaluation : {currentCampaign.name}</div>
            </div>

            {/* Liste des critères */}
            {criteres.sort((a,b) => parseInt(a.num) - parseInt(b.num)).map(c => {
               const cConf = CRITERES_LABELS[c.critere] || { label: "Critère", color: "#9ca3af" };
               const validFiles = (c.fichiers || []).filter(f => f.validated);
               const validChemins = (c.chemins_reseau || []).filter(ch => ch.validated);
               const hasPreuves = validFiles.length > 0 || validChemins.length > 0 || (c.preuves && c.preuves.trim());
               
               // Optionnel : ne pas afficher les "non-concernés" pour épurer le PDF
               if (c.statut === "non-concerne") return null; 

               return (
                 <div key={c.id} className="print-break-avoid" style={{ marginBottom: "30px", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                   
                   {/* Titre du critère */}
                   <div style={{ background: "#f8fafc", padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                       <span style={{ background: cConf.color, color: "white", padding: "4px 10px", borderRadius: "6px", fontWeight: "900", fontSize: "14px" }}>{c.num}</span>
                       <span style={{ fontWeight: "700", color: "#1e3a5f", fontSize: "15px" }}>{c.titre}</span>
                     </div>
                     <StatusBadge statut={c.statut} />
                   </div>
                   
                   {/* Contenu du critère */}
                   <div style={{ padding: "16px" }}>
                     
                     {/* Responsables */}
                     <div style={{ marginBottom: "16px", fontSize: "13px" }}>
                       <strong style={{ color: "#475569" }}>Responsable(s) de l'indicateur : </strong>
                       {c.responsables && c.responsables.length > 0 ? (
                         <span style={{ color: "#1e3a5f", fontWeight: "600" }}>{c.responsables.join(', ')}</span>
                       ) : (
                         <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Non assigné</span>
                       )}
                     </div>

                     {/* Boîte de preuves */}
                     <div>
                       <strong style={{ color: "#475569", fontSize: "13px", display: "block", marginBottom: "8px" }}>Éléments de preuve présentés :</strong>
                       
                       {!hasPreuves ? (
                         <div style={{ fontSize: "13px", color: "#9ca3af", fontStyle: "italic", background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>Aucune preuve validée pour le moment.</div>
                       ) : (
                         <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px", borderRadius: "8px" }}>
                           
                           {/* Textes publics */}
                           {c.preuves && (
                             <div style={{ fontSize: "13px", color: "#166534", whiteSpace: "pre-wrap", marginBottom: (validFiles.length > 0 || validChemins.length > 0) ? "12px" : "0" }}>
                               {c.preuves}
                             </div>
                           )}

                           {/* Liens réseau */}
                           {validChemins.length > 0 && (
                             <div style={{ marginBottom: validFiles.length > 0 ? "8px" : "0" }}>
                               {validChemins.map((link, i) => (
                                 <div key={i} style={{ fontSize: "12px", color: "#065f46", display: "flex", gap: "6px", alignItems: "flex-start", marginBottom: "4px" }}>
                                   <span>🔗</span> <span style={{ fontWeight: "600" }}>{link.nom}</span> <span style={{ color: "#10b981" }}>({link.chemin})</span>
                                 </div>
                               ))}
                             </div>
                           )}

                           {/* Fichiers uploadés */}
                           {validFiles.length > 0 && (
                             <div>
                               {validFiles.map((file, i) => (
                                 <div key={i} style={{ fontSize: "12px", color: "#065f46", display: "flex", gap: "6px", alignItems: "center", marginBottom: "4px" }}>
                                   <span>☁️</span> <span style={{ fontWeight: "600" }}>{file.name}</span>
                                 </div>
                               ))}
                             </div>
                           )}

                         </div>
                       )}
                     </div>

                   </div>
                 </div>
               )
            })}

            {/* Pied de page du document */}
            <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "2px solid #e2e8f0", textAlign: "center", fontSize: "11px", color: "#9ca3af" }}>
              Document officiel généré par la plateforme QualiForma
            </div>

          </div>
        )}

        {/* --- TOUR DE CONTRÔLE --- */}
        {activeTab === "tour_controle" && userProfile?.role === "superadmin" && (
          <div>
            <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#312e81", margin: "0 0 4px" }}>🛸 Tour de Contrôle Nationale</h2>
                <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>Supervision en direct de l'avancement de tous les établissements.</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
              <div style={{ background: "linear-gradient(135deg, #4f46e5, #3b82f6)", borderRadius: "12px", padding: "20px", color: "white", boxShadow: "0 4px 10px rgba(79,70,229,0.2)" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase", opacity: 0.9 }}>Score National Moyen</div>
                <div style={{ fontSize: "36px", fontWeight: "900", marginTop: "4px" }}>{globalScore}%</div>
              </div>
              <div style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Établissements Actifs</div>
                <div style={{ fontSize: "32px", fontWeight: "900", color: "#1e3a5f", marginTop: "4px" }}>{activeIfsis.length}</div>
              </div>
              <div style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Utilisateurs Connectés</div>
                <div style={{ fontSize: "32px", fontWeight: "900", color: "#1e3a5f", marginTop: "4px" }}>{totalUsersInNetwork}</div>
              </div>
            </div>

            {topAlerts.length > 0 && (
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "800", color: "#991b1b", margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: "6px" }}>🚨 Alertes Urgentes sur le réseau</h3>
                <div className="alert-ticker" style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "10px" }}>
                  {topAlerts.map((alert, i) => (
                    <div key={i} style={{ minWidth: "280px", background: "#fef2f2", border: "1px solid #fca5a5", borderLeft: `4px solid ${alert.type === "non-conforme" ? "#ef4444" : "#f59e0b"}`, borderRadius: "8px", padding: "12px", cursor: "pointer" }} onClick={() => { setSelectedIfsi(alert.ifsiId); setActiveTab("axes"); }}>
                      <div style={{ fontSize: "10px", color: "#991b1b", fontWeight: "800", textTransform: "uppercase", marginBottom: "4px" }}>{alert.ifsiName}</div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e3a5f", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>C{alert.critere.num} - {alert.critere.titre}</div>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: alert.type === "non-conforme" ? "#dc2626" : "#d97706" }}>
                        {alert.type === "non-conforme" ? "🔴 Non-conforme !" : `⏳ Dépassé de ${alert.days} jour(s)`}
                      </div>
                    </div>
                  ))}
                  {globalAlerts.length > 12 && (
                    <div style={{ minWidth: "150px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                      + {globalAlerts.length - 12} autres alertes
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #86efac", paddingBottom: "8px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", color: "#10b981", margin: 0 }}>✅ Établissements Actifs ({activeIfsis.length})</h3>
              <select value={tourSort} onChange={e => setTourSort(e.target.value)} style={{ ...sel, borderColor: "#cbd5e1", fontWeight: "600", padding: "6px 12px" }}>
                <option value="urgence">⏳ Trier par date d'audit (Plus proche)</option>
                <option value="score_desc">🏆 Trier par Score (Meilleurs en 1er)</option>
                <option value="score_asc">🚨 Trier par Score (En difficulté en 1er)</option>
                <option value="alpha">🔤 Trier par Nom (A-Z)</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px", marginBottom: "40px" }}>
              {sortedTourIfsis.map(s => {
                const auditDateObj = new Date(s.auditDate);
                const daysToAudit = Math.ceil((auditDateObj - today) / 86400000);
                const auditColor = daysToAudit < 0 ? "#ef4444" : daysToAudit <= 30 ? "#f59e0b" : "#10b981";
                const auditText = daysToAudit < 0 ? `Dépassé (${Math.abs(daysToAudit)}j)` : `J-${daysToAudit}`;

                return (
                  <div key={s.id} className="td-dash" style={{ ...card, padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "1px solid #e0e7ff", background: "white", transition: "all 0.2s ease" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#1e3a5f", margin: 0 }}>{s.name}</h3>
                          <button onClick={() => handleRenameIfsi(s.id, s.name)} style={{ border: "none", background: "#f1f5f9", borderRadius: "4px", padding: "2px 6px", cursor: "pointer", fontSize: "10px", color: "#64748b" }} title="Renommer">✏️</button>
                        </div>
                        <div style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "monospace", marginBottom: "8px" }}>ID: {s.id}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
                           <span>🗓️ {new Date(s.auditDate).toLocaleDateString("fr-FR")}</span>
                           <span style={{ background: auditColor+"20", color: auditColor, padding: "2px 6px", borderRadius: "4px", fontWeight: "800", fontSize: "10px" }}>{auditText}</span>
                        </div>
                      </div>
                      <GaugeChart value={s.conforme} max={s.total} color={s.pct >= 80 ? "#10b981" : s.pct >= 50 ? "#f59e0b" : "#ef4444"} size={64} fontSize={12} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
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

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => { setSelectedIfsi(s.id); setActiveTab("dashboard"); }} style={{ flex: 1, padding: "8px", background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "white", borderRadius: "8px", border: "none", fontWeight: "700", cursor: "pointer", fontSize: "12px" }}>🔎 Accéder</button>
                      <button onClick={() => handleArchiveIfsi(s.id, s.name, true)} style={{ padding: "8px 12px", background: "white", color: "#f59e0b", border: "1px solid #fcd34d", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "12px" }}>📦 Archiver</button>
                    </div>
                  </div>
                );
              })}
              {sortedTourIfsis.length === 0 && <div style={{ color: "#9ca3af", fontStyle: "italic" }}>Aucun établissement actif.</div>}
            </div>

            {archivedIfsis.length > 0 && (
              <>
                <h3 style={{ fontSize: "16px", color: "#991b1b", borderBottom: "2px solid #fca5a5", paddingBottom: "8px", marginBottom: "16px", marginTop: "40px" }}>📦 Établissements Archivés ({archivedIfsis.length})</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
                  {archivedIfsis.map(ifsi => {
                    return (
                      <div key={ifsi.id} style={{ ...card, padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "1px dashed #fca5a5", background: "#fef2f2", opacity: 0.9 }}>
                        <div style={{ marginBottom: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#991b1b", margin: 0 }}>{ifsi.name}</h3>
                            <button onClick={() => handleRenameIfsi(ifsi.id, ifsi.name)} style={{ border: "none", background: "white", borderRadius: "4px", padding: "2px 6px", cursor: "pointer", fontSize: "10px", color: "#64748b" }} title="Renommer">✏️</button>
                          </div>
                          <div style={{ fontSize: "11px", color: "#ef4444", fontFamily: "monospace", marginBottom: "8px" }}>ID: {ifsi.id}</div>
                          <p style={{ fontSize: "12px", color: "#991b1b", margin: 0 }}>Cet établissement est invisible pour ses utilisateurs.</p>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <button onClick={() => handleArchiveIfsi(ifsi.id, ifsi.name, false)} style={{ padding: "8px", background: "white", color: "#10b981", border: "1px solid #86efac", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "12px" }}>♻️ Restaurer l'établissement</button>
                          <button onClick={() => handleHardDeleteIfsi(ifsi.id, ifsi.name)} style={{ padding: "8px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "12px" }}>⚠️ Supprimer définitivement</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* --- ORGANIGRAMME --- */}
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

            <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", paddingBottom: "20px" }}>
              
              <div style={{ width: "280px", flexShrink: 0, background: "#f8fafc", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0", minHeight: "60vh" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "800", color: "#475569", marginBottom: "16px", textTransform: "uppercase", borderBottom: "2px solid #cbd5e1", paddingBottom: "8px" }}>👥 Équipe globale</h3>
                
                {allIfsiMembers.map(m => (
                  <div key={m.id} className="org-card" draggable onDragStart={(e) => handleDragStartOrg(e, m.type, m.id)} style={{ borderLeft: m.roles.length===0 ? "4px solid #f59e0b" : "1px solid #d1d5db" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                       <span style={{ fontWeight: "700", color: "#1e3a5f" }}>{m.type==="account" ? "👤" : "👻"} {m.name}</span>
                       {m.type === "manual" && (
                         <div style={{ display: "flex", gap: "4px" }}>
                           <button onClick={() => editManualUser(m.id, m.name)} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", padding:"0 2px" }} title="Renommer">✏️</button>
                           <button onClick={() => deleteManualUser(m.id)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", padding:"0 2px" }} title="Supprimer">🗑️</button>
                         </div>
                       )}
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
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", display: "block", marginBottom: "6px" }}>+ AJOUTER MANUELLEMENT</label>
                  <input type="text" value={newManualUserInput} onChange={e => setNewManualUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManualUser()} placeholder="Ex: Secrétariat..." style={{ ...inp, padding: "8px", fontSize: "12px", marginBottom: "8px", width: "100%" }} />
                  <button onClick={addManualUser} disabled={!newManualUserInput.trim()} style={{ width: "100%", background: "#f59e0b", color: "white", border: "none", padding: "6px", borderRadius: "6px", fontWeight: "bold", cursor: newManualUserInput.trim() ? "pointer" : "not-allowed" }}>Créer l'entité</button>
                </div>
              </div>

              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", flex: 1, alignContent: "flex-start" }}>
                {orgRoles.filter(r => r !== "Direction").map((role) => {
                  const colConf = getRoleColor(role);
                  const peopleInRole = allIfsiMembers.filter(m => m.roles.includes(role));

                  return (
                    <div key={role} style={{ width: "260px", background: "white", borderRadius: "12px", border: `2px solid ${colConf.border}`, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }} onDragOver={handleDragOverOrg} onDrop={(e) => handleDropOrg(e, role)}>
                      <div style={{ background: colConf.bg, padding: "12px 16px", borderRadius: "10px 10px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${colConf.border}` }}>
                        <span style={{ fontSize: "14px", fontWeight: "800", color: colConf.text, textTransform: "uppercase" }}>{role}</span>
                        <div>
                          <button onClick={() => editOrgRole(role)} style={{ background:"white", border:`1px solid ${colConf.border}`, color: colConf.text, borderRadius:"6px", cursor:"pointer", padding:"2px 6px", fontSize:"10px", fontWeight:"bold", marginRight: "4px" }} title="Renommer la colonne">✏️</button>
                          <button onClick={() => deleteOrgRole(role)} style={{ background:"white", border:`1px solid ${colConf.border}`, color: colConf.text, borderRadius:"6px", cursor:"pointer", padding:"2px 6px", fontSize:"10px", fontWeight:"bold" }}>X</button>
                        </div>
                      </div>
                      
                      <div style={{ padding: "16px", minHeight: "150px" }}>
                        {peopleInRole.map(m => (
                          <div key={m.id} style={{ background: "white", border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: "8px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", fontWeight: "600", color: "#1e3a5f" }}>
                            <span>{m.type==="account"?"👤":"👻"} {m.name}</span>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              {m.type === "manual" && <button onClick={() => editManualUser(m.id, m.name)} style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: "12px" }} title="Renommer">✏️</button>}
                              <button onClick={() => removeRoleFromUser(m.type, m.id, role)} style={{ border: "none", background: "#fef2f2", color: "#ef4444", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px" }}>×</button>
                            </div>
                          </div>
                        ))}
                        {peopleInRole.length === 0 && <div style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic", textAlign: "center", marginTop: "20px" }}>Glissez une personne ici</div>}
                      </div>
                    </div>
                  );
                })}

                <div style={{ width: "260px", background: "#f1f5f9", borderRadius: "12px", padding: "16px", border: "1px dashed #cbd5e1" }}>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "12px" }}>+ NOUVEAU RÔLE / COLONNE</span>
                  <input type="text" value={newRoleInput} onChange={e => setNewRoleInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOrgRole()} placeholder="Ex: Qualité..." style={{ ...inp, padding: "8px", fontSize: "12px", marginBottom: "8px", width: "100%" }} />
                  <button onClick={addOrgRole} disabled={!newRoleInput.trim()} style={{ width: "100%", background: "#1d4ed8", color: "white", border: "none", padding: "8px", borderRadius: "6px", fontWeight: "bold", cursor: newRoleInput.trim() ? "pointer" : "not-allowed" }}>Créer la colonne</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- ONGLET ÉQUIPE --- */}
        {activeTab === "equipe" && (userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>👥 Création & Gestion des Comptes</h2>
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
                  <input type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px" }} placeholder="contact@institut.fr" />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Mot de passe provisoire</label>
                  <input type="text" value={newMember.pwd} onChange={e => setNewMember({...newMember, pwd: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px" }} placeholder="Ex: Qualiopi2026!" />
                  <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "6px", lineHeight: "1.4" }}>👉 Minimum 6 caractères.</div>
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Rôle système</label>
                  <select value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px", background: "white" }}>
                    <option value="user">Membre (lecture & écriture)</option>
                    {userProfile.role === "superadmin" && <option value="admin">Admin (création de compte)</option>}
                  </select>
                </div>
                {userProfile.role === "superadmin" && (
                   <div style={{ marginBottom: "16px", background: "#fffbeb", padding: "10px", borderRadius: "8px", border: "1px dashed #fcd34d" }}>
                     <label style={{ fontSize: "11px", fontWeight: "800", color: "#d97706", textTransform: "uppercase" }}>👑 Établissement (Mode Superadmin)</label>
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
                <div style={{ padding: "16px", background: "#fafafa", borderBottom: "1px solid #e2e8f0" }}>
                  <input 
                    type="text" 
                    placeholder="🔍 Rechercher par email ou nom d'établissement..." 
                    value={teamSearchTerm}
                    onChange={e => setTeamSearchTerm(e.target.value)}
                    style={{ ...inp, width: "100%", maxWidth: "400px", padding: "8px 12px", fontSize: "13px" }}
                  />
                  {userProfile.role === "superadmin" && (
                    <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "12px", fontWeight: "600" }}>
                      {sortedTeamUsers.length} compte(s) trouvé(s) au total
                    </span>
                  )}
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{...th, cursor: "pointer", userSelect: "none"}} onClick={() => handleSortTeam('email')} title="Trier par Email">
                        Email {teamSortConfig.key === 'email' ? (teamSortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕'}
                      </th>
                      <th style={{...th, cursor: "pointer", userSelect: "none"}} onClick={() => handleSortTeam('role')} title="Trier par Rôle">
                        Rôle Système {teamSortConfig.key === 'role' ? (teamSortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕'}
                      </th>
                      {userProfile.role === "superadmin" && (
                        <th style={{...th, cursor: "pointer", userSelect: "none"}} onClick={() => handleSortTeam('ifsi')} title="Trier par Établissement">
                          Établissement {teamSortConfig.key === 'ifsi' ? (teamSortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕'}
                        </th>
                      )}
                      <th style={th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeamUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ ...td, fontWeight: "600", color: "#1e3a5f" }}>{u.email || u.id}</td>
                        <td style={td}>
                          {u.role === "superadmin" && <span style={{ background: "#fef2f2", color: "#991b1b", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", border: "1px solid #fca5a5" }}>SUPERADMIN</span>}
                          {u.role === "admin" && <span style={{ background: "#fff7ed", color: "#c2410c", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", border: "1px solid #fed7aa" }}>ADMIN</span>}
                          {(u.role === "user" || !u.role) && <span style={{ background: "#f3f4f6", color: "#4b5563", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", border: "1px solid #d1d5db" }}>MEMBRE</span>}
                        </td>
                        {userProfile.role === "superadmin" && <td style={{ ...td, fontSize: "11px", color: "#6b7280" }}>{ifsiList.find(i => i.id === u.etablissementId)?.name || u.etablissementId}</td>}
                        <td style={td}>
                          {u.id !== auth.currentUser?.uid && u.role !== "superadmin" && (
                            <button onClick={() => handleDeleteUser(u.id, u.email)} style={{ background: "white", color: "#ef4444", border: "1px solid #fca5a5", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>Supprimer</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {sortedTeamUsers.length === 0 && <tr><td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontStyle: "italic", fontSize: "13px" }}>Aucun compte trouvé.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- COMPTE --- */}
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
