import React, { useState, useEffect, useMemo, useCallback } from "react";
import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";

// 👉 Nos 3 nouveaux composants propres et séparés :
import DashboardTab, { ProgressBar } from "./components/DashboardTab";
import TourControleTab from "./components/TourControleTab";
import OrganigrammeTab from "./components/OrganigrammeTab";

import { getDoc, setDoc, deleteDoc, doc, collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, updatePassword } from "firebase/auth";
import { db, auth, secondaryAuth } from "./firebase";
import { DEFAULT_CRITERES, CRITERES_LABELS, STATUT_CONFIG } from "./data";

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
  { bg: "#e0e7ff", border: "#bfdbfe", text: "#1e40af" }, { bg: "#dcfce7", border: "#86efac", text: "#166534" }, 
  { bg: "#fef3c7", border: "#fde68a", text: "#92400e" }, { bg: "#f3e8ff", border: "#d8b4fe", text: "#6b21a8" }, 
  { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" }, { bg: "#ccfbf1", border: "#67e8f9", text: "#155e75" }, 
  { bg: "#fce7f3", border: "#f9a8d4", text: "#9d174d" }, { bg: "#f1f5f9", border: "#cbd5e1", text: "#334155" }  
];

const today = new Date();
const days = d => { if (!d) return NaN; const p = new Date(d); return isNaN(p.getTime()) ? NaN : Math.round((p - today) / 86400000); };
const dayColor = d => { const daysLeft = days(d); if (isNaN(daysLeft)) return "#6b7280"; return daysLeft < 0 ? "#dc2626" : daysLeft < 30 ? "#d97706" : "#6b7280"; };

function StatusBadge({ statut }) {
  const s = STATUT_CONFIG[statut] || STATUT_CONFIG["non-evalue"];
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>{s.label}</span>;
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
      if (list.length === 0) setDoc(doc(db, "etablissements", "demo_ifps_cham"), { name: "IFPS du CHAM", roles: DEFAULT_ROLES, archived: false });
      else { list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))); setIfsiList(list); }
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
    let unsubUsers = null;
    if (selectedIfsi && userProfile && userProfile.role !== "guest") {
      unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
         const usersList = [];
         snapshot.forEach((doc) => {
           const data = doc.data();
           if (data.etablissementId === selectedIfsi || userProfile.role === "superadmin") usersList.push({ id: doc.id, ...data });
         });
         setTeamUsers(usersList.filter(u => userProfile.role === "superadmin" ? true : u.etablissementId === selectedIfsi));
      });
    }
    return () => { if (unsubUsers) unsubUsers(); };
  }, [selectedIfsi, userProfile]);

  useEffect(() => {
    let unsubSnapshot = null; let unsubIfsiDoc = null;
    if (selectedIfsi && userProfile?.role !== "guest" && !userProfile?.mustChangePassword) {
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
      unsubIfsiDoc = onSnapshot(doc(db, "etablissements", selectedIfsi), (snap) => { if (snap.exists()) setIfsiData(snap.data()); });
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
    try { await setDoc(getDocRef(selectedIfsi), { campaigns: newCampaigns, updatedAt: new Date().toISOString() }, { merge: true }); setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); } 
    catch (e) { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000); }
  }

  const currentCampaign = useMemo(() => campaigns?.find(c => c.id === activeCampaignId) || campaigns?.[0], [campaigns, activeCampaignId]);
  const criteres = useMemo(() => currentCampaign?.liste || [], [currentCampaign]);
  const isArchive = currentCampaign?.locked || false;
  const currentAuditDate = currentCampaign?.auditDate || "2026-10-15"; 

  const orgRoles = useMemo(() => ifsiData?.roles || [], [ifsiData]);
  const manualUsers = useMemo(() => ifsiData?.manualUsers || [], [ifsiData]);
  const orgAccounts = useMemo(() => teamUsers.filter(u => u.role !== "superadmin" && u.etablissementId === selectedIfsi), [teamUsers, selectedIfsi]);

  const allIfsiMembers = useMemo(() => {
    return [
      ...orgAccounts.map(u => ({ id: u.id, name: u.email.split('@')[0], roles: Array.isArray(u.orgRoles) ? u.orgRoles : (u.orgRole ? [u.orgRole] : []), type: 'account', email: u.email })),
      ...manualUsers.map(u => ({ id: u.id, name: u.name, roles: Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []), type: 'manual' }))
    ].sort((a,b) => String(a.name || "").localeCompare(String(b.name || ""))); 
  }, [orgAccounts, manualUsers]);

  const { stats, urgents, filtered, axes } = useMemo(() => {
    const nbConcerne = criteres.filter(c => c.statut !== "non-concerne").length;
    const baseTotal = nbConcerne === 0 ? 1 : nbConcerne; 
    const st = { total: baseTotal, conforme: criteres.filter(c => c.statut === "conforme").length, enCours: criteres.filter(c => c.statut === "en-cours").length, nonConforme: criteres.filter(c => c.statut === "non-conforme").length, nonEvalue: criteres.filter(c => c.statut === "non-evalue").length, nonConcerne: criteres.filter(c => c.statut === "non-concerne").length };
    const urg = criteres.filter(c => { const d = days(c.delai); return !isNaN(d) && d <= 30 && c.statut !== "conforme" && c.statut !== "non-evalue" && c.statut !== "non-concerne"; });
    const filt = criteres.filter(c => { if (filterStatut !== "tous" && c.statut !== filterStatut) return false; if (filterCritere !== "tous" && c.critere !== parseInt(filterCritere)) return false; if (searchTerm) { const s = searchTerm.toLowerCase(); return String(c.titre||"").toLowerCase().includes(s) || String(c.num||"").toLowerCase().includes(s); } return true; });
    const ax = criteres.filter(c => c.statut === "non-conforme" || c.statut === "en-cours").sort((a, b) => ({"non-conforme":0,"en-cours":1}[a.statut] - {"non-conforme":0,"en-cours":1}[b.statut]));
    return { stats: st, urgents: urg, filtered: filt, axes: ax };
  }, [criteres, filterStatut, filterCritere, searchTerm]);

  const byPerson = useMemo(() => {
    return allIfsiMembers.map(m => {
      const myCriteres = criteres.filter(c => (Array.isArray(c.responsables) ? c.responsables : []).includes(m.name));
      return { ...m, items: myCriteres };
    }).filter(p => p.items.length > 0 || p.roles.length > 0);
  }, [allIfsiMembers, criteres]);

  const getIfsiGlobalStats = useCallback((ifsiId) => {
    const docId = ifsiId === "demo_ifps_cham" ? "criteres" : ifsiId;
    const data = allQualiopiData[docId];
    if (!data) return { total: 1, conforme: 0, nonConforme: 0, enCours: 0, pct: 0, auditDate: "2026-10-15", liste: [] };
    let liste = []; let auditDate = "2026-10-15";
    if (data.campaigns && data.campaigns.length > 0) { const currentCamp = data.campaigns[data.campaigns.length - 1]; liste = currentCamp.liste; auditDate = currentCamp.auditDate || "2026-10-15"; } 
    else if (data.liste) { liste = data.liste; } else return { total: 1, conforme: 0, nonConforme: 0, enCours: 0, pct: 0, auditDate, liste: [] };

    const nbConcerne = liste.filter(c => c.statut !== "non-concerne").length;
    const total = nbConcerne === 0 ? 1 : nbConcerne;
    const conforme = liste.filter(c => c.statut === "conforme").length;
    const nonConforme = liste.filter(c => c.statut === "non-conforme").length;
    const enCours = liste.filter(c => c.statut === "en-cours").length;

    return { total, conforme, nonConforme, enCours, pct: Math.round((conforme/total)*100) || 0, auditDate, liste };
  }, [allQualiopiData]);

  const { activeIfsisStats, globalScore, topAlerts, totalAlertsCount, activeIfsis, archivedIfsis } = useMemo(() => {
    const active = ifsiList.filter(i => !i.archived);
    const archived = ifsiList.filter(i => i.archived);
    const statsArr = active.map(i => ({ id: i.id, name: i.name, ...getIfsiGlobalStats(i.id) }));
    const score = statsArr.length > 0 ? Math.round(statsArr.reduce((acc, curr) => acc + curr.pct, 0) / statsArr.length) : 0;
    
    let alerts = [];
    statsArr.forEach(ifsiStat => {
      if (ifsiStat.liste) {
        ifsiStat.liste.forEach(c => {
          if (c.statut === "non-conforme") alerts.push({ ifsiId: ifsiStat.id, ifsiName: ifsiStat.name, critere: c, type: "non-conforme" });
          else if (c.statut !== "conforme" && c.statut !== "non-concerne") {
            const daysLeft = days(c.delai);
            if (!isNaN(daysLeft) && daysLeft < 0) alerts.push({ ifsiId: ifsiStat.id, ifsiName: ifsiStat.name, critere: c, type: "depasse", days: Math.abs(daysLeft) });
          }
        });
      }
    });
    return { activeIfsis: active, archivedIfsis: archived, activeIfsisStats: statsArr, globalScore: score, topAlerts: alerts.slice(0, 12), totalAlertsCount: alerts.length };
  }, [ifsiList, getIfsiGlobalStats]);

  const sortedTourIfsis = useMemo(() => {
    return [...activeIfsisStats].sort((a, b) => {
      if (tourSort === "urgence") return (new Date(a.auditDate).getTime() || 0) - (new Date(b.auditDate).getTime() || 0);
      if (tourSort === "score_desc") return b.pct - a.pct;
      if (tourSort === "score_asc") return a.pct - b.pct;
      if (tourSort === "alpha") return String(a.name || "").localeCompare(String(b.name || ""));
      return 0;
    });
  }, [activeIfsisStats, tourSort]);

  const sortedTeamUsers = useMemo(() => {
    const filteredUsers = teamUsers.filter(u => {
      if (!teamSearchTerm) return true;
      const sLower = teamSearchTerm.toLowerCase();
      const eMatch = (u.email || "").toLowerCase().includes(sLower);
      const ifsiName = ifsiList.find(i => i.id === u.etablissementId)?.name || u.etablissementId || "";
      return eMatch || ifsiName.toLowerCase().includes(sLower);
    });
    return filteredUsers.sort((a, b) => {
      let valA = ""; let valB = "";
      if (teamSortConfig.key === "email") { valA = a.email || ""; valB = b.email || ""; }
      else if (teamSortConfig.key === "role") { valA = a.role || "user"; valB = b.role || "user"; }
      else if (teamSortConfig.key === "ifsi") { valA = ifsiList.find(i => i.id === a.etablissementId)?.name || a.etablissementId || ""; valB = ifsiList.find(i => i.id === b.etablissementId)?.name || b.etablissementId || ""; }
      if (valA < valB) return teamSortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return teamSortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [teamUsers, teamSearchTerm, teamSortConfig, ifsiList]);

  // -- Les fonctions handlers --
  async function handleIfsiSwitch(e) { /*...*/} // Omit for brevity, logic remains identical
  async function handleRenameIfsi(ifsiId, currentName) { /*...*/ }
  async function handleArchiveIfsi(ifsiId, name, archiveStatus) { /*...*/ }
  async function handleHardDeleteIfsi(ifsiId, name) { /*...*/ }
  function getRoleColor(roleName) { /*...*/ return ROLE_PALETTE[0]; }
  function handleDragStartOrg(e, type, id) { e.dataTransfer.setData("type", type); e.dataTransfer.setData("id", id); }
  function handleDragOverOrg(e) { e.preventDefault(); }
  function handleDropOrg(e, targetRole) {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    const id = e.dataTransfer.getData("id");
    if (type === "account") {
      const user = orgAccounts.find(u => u.id === id);
      const currentRoles = Array.isArray(user?.orgRoles) ? user.orgRoles : (user?.orgRole ? [user.orgRole] : []);
      if (!currentRoles.includes(targetRole)) setDoc(doc(db, "users", id), { orgRoles: [...currentRoles, targetRole], orgRole: "" }, { merge: true });
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
      const updatedManuals = manualUsers.map(u => ({ ...u, roles: (Array.isArray(u.roles) ? u.roles : []).map(r => r === oldRole ? finalRole : r) }));
      for (const acc of orgAccounts) {
        const cRoles = Array.isArray(acc.orgRoles) ? acc.orgRoles : [];
        if (cRoles.includes(oldRole)) await setDoc(doc(db, "users", acc.id), { orgRoles: cRoles.map(r => r === oldRole ? finalRole : r) }, { merge: true });
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
            if (c.responsables && c.responsables.includes(currentName)) return { ...c, responsables: c.responsables.map(r => r === currentName ? finalName : r) };
            return c;
          });
          return { ...camp, liste: newListe };
        });
        saveData(newCampaigns);
      }
    }
  }

  function addOrgRole() { const r = newRoleInput.trim(); if (r && !orgRoles.includes(r)) { setDoc(doc(db, "etablissements", selectedIfsi), { roles: [...orgRoles, r] }, { merge: true }); setNewRoleInput(""); } }
  function deleteOrgRole(roleToDelete) { if (allIfsiMembers.some(m => m.roles.includes(roleToDelete))) return alert("⚠️ Impossible : Des personnes ont encore cette casquette."); if (window.confirm(`Supprimer la colonne "${roleToDelete}" ?`)) setDoc(doc(db, "etablissements", selectedIfsi), { roles: orgRoles.filter(r => r !== roleToDelete) }, { merge: true }); }
  function addManualUser() { const n = newManualUserInput.trim(); if (n) { setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: [...manualUsers, { id: 'm_' + Date.now(), name: n, roles: [] }] }, { merge: true }); setNewManualUserInput(""); } }
  function deleteManualUser(idToDelete) { if (window.confirm("Supprimer ce profil manuel ?")) setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: manualUsers.filter(u => u.id !== idToDelete) }, { merge: true }); }
  function applyDefaultRoles() { setDoc(doc(db, "etablissements", selectedIfsi), { roles: [...new Set([...orgRoles, ...DEFAULT_ROLES])] }, { merge: true }); }

  async function handleCreateUser() { /*...*/ }
  async function handleDeleteUser(userId) { /*...*/ }
  async function handleChangePassword(e, isForced) { /*...*/ }
  function handleLogout() { signOut(auth); }

  function handleEditAuditDate() {
    if (isArchive) return;
    const newDate = prompt("Modifier la date de l'audit (format AAAA-MM-JJ) :", currentAuditDate);
    if (newDate && !isNaN(new Date(newDate).getTime())) saveData(campaigns.map(c => c.id === activeCampaignId ? { ...c, auditDate: newDate } : c));
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
    if (window.confirm(`Supprimer cette évaluation ? IRRÉVERSIBLE.`)) { const u = campaigns.filter(c => c.id !== activeCampaignId); saveData(u); setActiveCampaignId(u[u.length - 1].id); }
  }

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
    if (oldResps !== newResps) newLogs.push({ date: now, user: userEmail, msg: `Responsables mis à jour : ${newResps || "Aucun"}` });
    if ((oldCritere.preuves || "") !== (updated.preuves || "")) newLogs.push({ date: now, user: userEmail, msg: `📝 A modifié le texte des justifications / liens publics` });
    if ((oldCritere.preuves_encours || "") !== (updated.preuves_encours || "")) newLogs.push({ date: now, user: userEmail, msg: `🚧 A modifié le texte de la zone de chantier` });

    const oldFiles = oldCritere.fichiers || []; const newFiles = updated.fichiers || [];
    newFiles.forEach(nf => {
      const of = oldFiles.find(o => o.url === nf.url);
      if (!of) newLogs.push({ date: now, user: userEmail, msg: `📎 A importé le fichier : ${nf.name}` });
      else if (of.validated !== nf.validated) newLogs.push({ date: now, user: userEmail, msg: nf.validated ? `✅ A validé le document comme preuve officielle : ${nf.name}` : `❌ A repassé en chantier le document : ${nf.name}` });
    });
    oldFiles.forEach(of => { if (!newFiles.find(nf => nf.url === of.url)) newLogs.push({ date: now, user: userEmail, msg: `🗑️ A supprimé le fichier : ${of.name}` }); });

    const oldChemins = oldCritere.chemins_reseau || []; const newChemins = updated.chemins_reseau || [];
    newChemins.forEach(nc => {
      const oc = oldChemins.find(o => o.chemin === nc.chemin);
      if (!oc) newLogs.push({ date: now, user: userEmail, msg: `🔗 A ajouté le lien réseau : ${nc.nom}` });
      else if (oc.validated !== nc.validated) newLogs.push({ date: now, user: userEmail, msg: nc.validated ? `✅ A validé le lien réseau comme preuve officielle : ${nc.nom}` : `❌ A repassé en chantier le lien réseau : ${nc.nom}` });
    });
    oldChemins.forEach(oc => { if (!newChemins.find(nc => nc.chemin === oc.chemin)) newLogs.push({ date: now, user: userEmail, msg: `🗑️ A supprimé le lien réseau : ${oc.nom}` }); });

    let finalUpdated = { ...updated };
    if (newLogs.length > 0) finalUpdated.historique = [...(oldCritere.historique || []), ...newLogs];

    const newCriteres = criteres.map(c => c.id === finalUpdated.id ? finalUpdated : c);
    saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newCriteres } : camp));

    const currentIndex = filtered.findIndex(c => c.id === finalUpdated.id);
    if (action === "close" || action === undefined) setModalCritere(null);
    if (action === "next") setModalCritere(filtered[currentIndex + 1]);
    if (action === "prev") setModalCritere(filtered[currentIndex - 1]);
  }

  function handleAutoSave(updated) {
    if (isArchive) return;
    saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: criteres.map(c => c.id === updated.id ? updated : c) } : camp));
  }

  async function exportToExcel() { /*...*/ }

  // ... (HTML RENDER) ...
}
