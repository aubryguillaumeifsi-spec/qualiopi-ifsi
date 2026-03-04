import React, { useState, useEffect, useMemo, useCallback } from "react";
import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";

// IMPORT DES COMPOSANTS DÉCOUPÉS
import DashboardTab from "./components/DashboardTab";
import TourControleTab from "./components/TourControleTab";
import OrganigrammeTab from "./components/OrganigrammeTab";
import { CriteresTab, AxesTab, ResponsablesTab, LivreBlancTab } from "./components/TabsQualiopi";
import { EquipeTab, CompteTab } from "./components/TabsAdmin";

import { getDoc, setDoc, deleteDoc, doc, collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, updatePassword } from "firebase/auth";
import { db, auth, secondaryAuth } from "./firebase";
import { DEFAULT_CRITERES, CRITERES_LABELS, STATUT_CONFIG } from "./data";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h1 style={{ color: "#ef4444" }}>⚠️ Erreur Système</h1>
        <pre style={{ background: "#fef2f2", padding: "20px", borderRadius: "8px", overflowX: "auto" }}>{this.state.error?.toString()}</pre>
        <button onClick={() => window.location.reload()} style={{ marginTop: "20px", padding: "10px 20px", background: "#1d4ed8", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>Recharger l'application</button>
      </div>
    );
    return this.props.children;
  }
}

const DEFAULT_ROLES = ["Direction", "Qualité", "Secrétariat", "Pôle Stages", "Formateurs IFSI", "Formateurs IFAS"];
const ROLE_PALETTE = [ { bg: "#e0e7ff", border: "#bfdbfe", text: "#1e40af" }, { bg: "#dcfce7", border: "#86efac", text: "#166534" }, { bg: "#fef3c7", border: "#fde68a", text: "#92400e" }, { bg: "#f3e8ff", border: "#d8b4fe", text: "#6b21a8" }, { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" }, { bg: "#ccfbf1", border: "#67e8f9", text: "#155e75" }, { bg: "#fce7f3", border: "#f9a8d4", text: "#9d174d" }, { bg: "#f1f5f9", border: "#cbd5e1", text: "#334155" } ];

const today = new Date();
const days = d => { if (!d) return NaN; const p = new Date(d); return isNaN(p.getTime()) ? NaN : Math.round((p - today) / 86400000); };
const dayColor = d => { const daysLeft = days(d); if (isNaN(daysLeft)) return "#6b7280"; return daysLeft < 0 ? "#dc2626" : daysLeft < 30 ? "#d97706" : "#6b7280"; };

function MainApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userProfile, setUserProfile] = useState(null); 
  const [selectedIfsi, setSelectedIfsi] = useState(null); 
  const [campaigns, setCampaigns] = useState(null);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
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
    const unsub = onSnapshot(collection(db, "etablissements"), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setIfsiList(list.sort((a, b) => String(a.name).localeCompare(b.name)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
          const profile = userSnap.data();
          setUserProfile(profile);
          setSelectedIfsi(profile.etablissementId || "demo_ifps_cham");
          if (profile.role === "superadmin") {
            onSnapshot(collection(db, "qualiopi"), (snap) => {
              const data = {}; snap.forEach(d => { data[d.id] = d.data(); });
              setAllQualiopiData(data);
            });
          }
        }
      } else { setIsLoggedIn(false); }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsub = null;
    if (selectedIfsi && userProfile && userProfile.role !== "guest") {
      unsub = onSnapshot(collection(db, "users"), (snapshot) => {
        const users = [];
        snapshot.forEach(d => users.push({ id: d.id, ...d.data() }));
        setTeamUsers(users.filter(u => userProfile.role === "superadmin" || u.etablissementId === selectedIfsi));
      });
    }
    return () => unsub && unsub();
  }, [selectedIfsi, userProfile]);

  useEffect(() => {
    if (!selectedIfsi || !userProfile || userProfile.mustChangePassword) return;
    setCampaigns(null);
    const docId = selectedIfsi === "demo_ifps_cham" ? "criteres" : selectedIfsi;
    const unsub = onSnapshot(doc(db, "qualiopi", docId), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setCampaigns(d.campaigns || []);
        setActiveCampaignId(prev => (prev && d.campaigns?.some(c => c.id === prev)) ? prev : d.campaigns?.[d.campaigns.length - 1]?.id);
      } else {
        const def = [{ id: Date.now().toString(), name: "Évaluation initiale", auditDate: "2026-10-15", liste: DEFAULT_CRITERES, locked: false }];
        setDoc(doc(db, "qualiopi", docId), { campaigns: def, updatedAt: new Date().toISOString() });
      }
    });
    const unsubIfsi = onSnapshot(doc(db, "etablissements", selectedIfsi), (snap) => setIfsiData(snap.data()));
    return () => { unsub(); unsubIfsi(); };
  }, [selectedIfsi, userProfile]);

  const saveData = async (newCampaigns) => {
    const docId = selectedIfsi === "demo_ifps_cham" ? "criteres" : selectedIfsi;
    await setDoc(doc(db, "qualiopi", docId), { campaigns: newCampaigns, updatedAt: new Date().toISOString() }, { merge: true });
  };

  const currentCampaign = useMemo(() => campaigns?.find(c => c.id === activeCampaignId) || campaigns?.[0], [campaigns, activeCampaignId]);
  const criteres = useMemo(() => currentCampaign?.liste || [], [currentCampaign]);
  const isArchive = currentCampaign?.locked || false;
  const currentAuditDate = currentCampaign?.auditDate || "2026-10-15";
  const orgRoles = useMemo(() => ifsiData?.roles || [], [ifsiData]);
  const manualUsers = useMemo(() => ifsiData?.manualUsers || [], [ifsiData]);
  const orgAccounts = useMemo(() => teamUsers.filter(u => u.etablissementId === selectedIfsi), [teamUsers, selectedIfsi]);

  const allIfsiMembers = useMemo(() => [
    ...orgAccounts.map(u => ({ id: u.id, name: u.email.split('@')[0], roles: u.orgRoles || [], type: 'account', email: u.email })),
    ...manualUsers.map(u => ({ id: u.id, name: u.name, roles: u.roles || [], type: 'manual' }))
  ].sort((a,b) => a.name.localeCompare(b.name)), [orgAccounts, manualUsers]);

  const { stats, urgents, filtered, axes } = useMemo(() => {
    const filt = criteres.filter(c => {
      if (filterStatut !== "tous" && c.statut !== filterStatut) return false;
      if (filterCritere !== "tous" && c.critere !== parseInt(filterCritere)) return false;
      if (searchTerm && !c.titre.toLowerCase().includes(searchTerm.toLowerCase()) && !String(c.num).includes(searchTerm)) return false;
      return true;
    });
    const concerned = criteres.filter(c => c.statut !== "non-concerne");
    const total = concerned.length || 1;
    return {
      stats: { total, conforme: criteres.filter(c => c.statut === "conforme").length, enCours: criteres.filter(c => c.statut === "en-cours").length, nonConforme: criteres.filter(c => c.statut === "non-conforme").length, nonEvalue: criteres.filter(c => c.statut === "non-evalue").length, nonConcerne: criteres.filter(c => c.statut === "non-concerne").length },
      urgents: criteres.filter(c => days(c.delai) <= 30 && c.statut !== "conforme" && c.statut !== "non-concerne"),
      filtered: filt,
      axes: criteres.filter(c => ["non-conforme", "en-cours"].includes(c.statut)).sort((a, b) => ({"non-conforme":0,"en-cours":1}[a.statut] - {"non-conforme":0,"en-cours":1}[b.statut]))
    };
  }, [criteres, filterStatut, filterCritere, searchTerm]);

  const byPerson = useMemo(() => allIfsiMembers.map(m => ({ ...m, items: criteres.filter(c => c.responsables?.includes(m.name)) })).filter(p => p.items.length > 0 || p.roles.length > 0), [allIfsiMembers, criteres]);

  const getIfsiGlobalStats = useCallback((id) => {
    const d = allQualiopiData[id === "demo_ifps_cham" ? "criteres" : id]?.campaigns?.at(-1)?.liste || [];
    const conforme = d.filter(c => c.statut === "conforme").length;
    const concerned = d.filter(c => c.statut !== "non-concerne").length || 1;
    return { pct: Math.round((conforme/concerned)*100), conforme, total: concerned, liste: d, auditDate: allQualiopiData[id]?.campaigns?.at(-1)?.auditDate };
  }, [allQualiopiData]);

  const tourData = useMemo(() => {
    const active = ifsiList.filter(i => !i.archived).map(i => ({ ...i, ...getIfsiGlobalStats(i.id) }));
    const score = active.length ? Math.round(active.reduce((acc, curr) => acc + curr.pct, 0) / active.length) : 0;
    let alerts = [];
    active.forEach(s => (s.liste || []).forEach(c => {
      if (c.statut === "non-conforme") alerts.push({ ifsiId: s.id, ifsiName: s.name, critere: c, type: "non-conforme" });
      else if (days(c.delai) < 0 && c.statut !== "non-concerne" && c.statut !== "conforme") alerts.push({ ifsiId: s.id, ifsiName: s.name, critere: c, type: "depasse", days: Math.abs(days(c.delai)) });
    }));
    return { active, archived: ifsiList.filter(i => i.archived), score, alerts };
  }, [ifsiList, getIfsiGlobalStats]);

  const sortedTourIfsis = useMemo(() => [...tourData.active].sort((a,b) => {
    if (tourSort === "urgence") return new Date(a.auditDate) - new Date(b.auditDate);
    if (tourSort === "score_desc") return b.pct - a.pct;
    return a.name.localeCompare(b.name);
  }), [tourData.active, tourSort]);

  const sortedTeamUsers = useMemo(() => {
    const filteredUsers = teamUsers.filter(u => {
      if (!teamSearchTerm) return true;
      const sLower = teamSearchTerm.toLowerCase();
      const ifsiName = ifsiList.find(i => i.id === u.etablissementId)?.name || u.etablissementId || "";
      return (u.email || "").toLowerCase().includes(sLower) || ifsiName.toLowerCase().includes(sLower);
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

  const totalUsersInNetwork = teamUsers.length;

  const handleSortTeam = (key) => { let direction = "asc"; if (teamSortConfig.key === key && teamSortConfig.direction === "asc") direction = "desc"; setTeamSortConfig({ key, direction }); };
  const handleIfsiSwitch = async (e) => { if (e.target.value === "NEW") { const nom = prompt("Nom de l'établissement :"); if (nom?.trim()) { const id = nom.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(Math.random() * 1000); await setDoc(doc(db, "etablissements", id), { name: nom.trim(), roles: DEFAULT_ROLES, archived: false }); setSelectedIfsi(id); } } else { setSelectedIfsi(e.target.value); } };
  const handleRenameIfsi = async (id, currentName) => { const n = prompt("Nouveau nom :", currentName); if (n?.trim() && n !== currentName) await setDoc(doc(db, "etablissements", id), { name: n.trim() }, { merge: true }); };
  const handleArchiveIfsi = async (id, name, status) => { if (window.confirm(`Voulez-vous ${status ? 'archiver' : 'restaurer'} ${name} ?`)) await setDoc(doc(db, "etablissements", id), { archived: status }, { merge: true }); };
  const handleHardDeleteIfsi = async (id, name) => { if (prompt(`Tapez SUPPRIMER pour détruire ${name}`) === "SUPPRIMER") { await deleteDoc(doc(db, "etablissements", id)); await deleteDoc(doc(db, "qualiopi", id === "demo_ifps_cham" ? "criteres" : id)); if (selectedIfsi === id) setSelectedIfsi("demo_ifps_cham"); } };

  const getRoleColor = (roleName) => { if (roleName === "Direction") return { bg: "#1e3a5f", border: "#0f172a", text: "#ffffff" }; const idx = orgRoles.indexOf(roleName); return ROLE_PALETTE[idx % ROLE_PALETTE.length] || ROLE_PALETTE[7]; };
  const handleDragStartOrg = (e, type, id) => { e.dataTransfer.setData("type", type); e.dataTransfer.setData("id", id); };
  const handleDragOverOrg = (e) => { e.preventDefault(); };
  const handleDropOrg = (e, targetRole) => { e.preventDefault(); const type = e.dataTransfer.getData("type"); const id = e.dataTransfer.getData("id"); if (type === "account") { const user = orgAccounts.find(u => u.id === id); const currentRoles = Array.isArray(user?.orgRoles) ? user.orgRoles : (user?.orgRole ? [user.orgRole] : []); if (!currentRoles.includes(targetRole)) setDoc(doc(db, "users", id), { orgRoles: [...currentRoles, targetRole], orgRole: "" }, { merge: true }); } else if (type === "manual") { const updatedManuals = manualUsers.map(u => { if (u.id === id) { const currentRoles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []); if (!currentRoles.includes(targetRole)) return { ...u, roles: [...currentRoles, targetRole], role: "" }; } return u; }); setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: updatedManuals }, { merge: true }); } };
  const removeRoleFromUser = (type, id, roleToRemove) => { if (type === "account") { const user = orgAccounts.find(u => u.id === id); const currentRoles = Array.isArray(user?.orgRoles) ? user.orgRoles : []; setDoc(doc(db, "users", id), { orgRoles: currentRoles.filter(r => r !== roleToRemove) }, { merge: true }); } else if (type === "manual") { const updatedManuals = manualUsers.map(u => { if (u.id === id) { const currentRoles = Array.isArray(u.roles) ? u.roles : []; return { ...u, roles: currentRoles.filter(r => r !== roleToRemove) }; } return u; }); setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: updatedManuals }, { merge: true }); } };
  const editOrgRole = async (oldRole) => { const newRole = prompt("Renommer la colonne :", oldRole); if (newRole && newRole.trim() !== "" && newRole !== oldRole) { const finalRole = newRole.trim(); if (orgRoles.includes(finalRole)) return alert("Ce rôle existe déjà."); const updatedRoles = orgRoles.map(r => r === oldRole ? finalRole : r); const updatedManuals = manualUsers.map(u => ({ ...u, roles: (Array.isArray(u.roles) ? u.roles : []).map(r => r === oldRole ? finalRole : r) })); for (const acc of orgAccounts) { const cRoles = Array.isArray(acc.orgRoles) ? acc.orgRoles : []; if (cRoles.includes(oldRole)) await setDoc(doc(db, "users", acc.id), { orgRoles: cRoles.map(r => r === oldRole ? finalRole : r) }, { merge: true }); } await setDoc(doc(db, "etablissements", selectedIfsi), { roles: updatedRoles, manualUsers: updatedManuals }, { merge: true }); } };
  const editManualUser = async (id, currentName) => { const newName = prompt("Modifier le nom de l'entité :", currentName); if (newName && newName.trim() !== "" && newName !== currentName) { const finalName = newName.trim(); const updatedManuals = manualUsers.map(u => u.id === id ? { ...u, name: finalName } : u); await setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: updatedManuals }, { merge: true }); if (campaigns && campaigns.length > 0) { const newCampaigns = campaigns.map(camp => { const newListe = camp.liste.map(c => { if (c.responsables && c.responsables.includes(currentName)) return { ...c, responsables: c.responsables.map(r => r === currentName ? finalName : r) }; return c; }); return { ...camp, liste: newListe }; }); saveData(newCampaigns); } } };
  const addOrgRole = () => { const r = newRoleInput.trim(); if (r && !orgRoles.includes(r)) { setDoc(doc(db, "etablissements", selectedIfsi), { roles: [...orgRoles, r] }, { merge: true }); setNewRoleInput(""); } };
  const deleteOrgRole = (roleToDelete) => { if (allIfsiMembers.some(m => m.roles.includes(roleToDelete))) return alert("⚠️ Impossible : Des personnes ont encore cette casquette."); if (window.confirm(`Supprimer la colonne "${roleToDelete}" ?`)) setDoc(doc(db, "etablissements", selectedIfsi), { roles: orgRoles.filter(r => r !== roleToDelete) }, { merge: true }); };
  const addManualUser = () => { const n = newManualUserInput.trim(); if (n) { setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: [...manualUsers, { id: 'm_' + Date.now(), name: n, roles: [] }] }, { merge: true }); setNewManualUserInput(""); } };
  const deleteManualUser = (idToDelete) => { if (window.confirm("Supprimer ce profil manuel ?")) setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: manualUsers.filter(u => u.id !== idToDelete) }, { merge: true }); };
  const applyDefaultRoles = () => { setDoc(doc(db, "etablissements", selectedIfsi), { roles: [...new Set([...orgRoles, ...DEFAULT_ROLES])] }, { merge: true }); };

  const handleCreateUser = async () => { if (!newMember.email || !newMember.pwd) return alert("Requis."); if (newMember.pwd.length < 6) return alert("Mot de passe : 6 min."); setIsCreatingUser(true); try { const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newMember.email, newMember.pwd); const targetIfsi = userProfile.role === "superadmin" && newMember.ifsi ? newMember.ifsi : selectedIfsi; await setDoc(doc(db, "users", userCredential.user.uid), { email: newMember.email, role: newMember.role, etablissementId: targetIfsi, orgRoles: [], mustChangePassword: true }); alert(`✅ Compte créé !`); setNewMember({ email: "", pwd: "", role: "user", ifsi: "" }); secondaryAuth.signOut(); } catch (error) { alert("Erreur : " + error.message); } setIsCreatingUser(false); };
  const handleDeleteUser = async (userId) => { if (!window.confirm(`Révoquer cet accès ?`)) return; try { await deleteDoc(doc(db, "users", userId)); } catch (e) { alert(e.message); } };
  const handleChangePassword = async (e, isForced) => { e.preventDefault(); setPwdUpdate({ ...pwdUpdate, error: "", success: "", loading: true }); if (pwdUpdate.p1 !== pwdUpdate.p2) return setPwdUpdate({ ...pwdUpdate, error: "Ne correspond pas.", loading: false }); if (pwdUpdate.p1.length < 8 || !/[A-Z]/.test(pwdUpdate.p1) || !/[0-9]/.test(pwdUpdate.p1)) return setPwdUpdate({ ...pwdUpdate, error: "8 car., 1 maj, 1 chiffre.", loading: false }); try { await updatePassword(auth.currentUser, pwdUpdate.p1); if (isForced) { await setDoc(doc(db, "users", auth.currentUser.uid), { mustChangePassword: false }, { merge: true }); setUserProfile({ ...userProfile, mustChangePassword: false }); } setPwdUpdate({ p1: "", p2: "", loading: false, error: "", success: "Succès !" }); } catch (err) { setPwdUpdate({ ...pwdUpdate, error: err.message, loading: false }); } };
  const handleEditAuditDate = () => { if (isArchive) return; const newDate = prompt("Modifier la date de l'audit (format AAAA-MM-JJ) :", currentAuditDate); if (newDate && !isNaN(new Date(newDate).getTime())) saveData(campaigns.map(c => c.id === activeCampaignId ? { ...c, auditDate: newDate } : c)); };
  const handleNewCampaign = (e) => { if (e.target.value === "NEW") { const name = prompt("Nom certification :"); if (name && name.trim()) { const defaultDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0]; const auditDate = prompt("Date :", defaultDate) || defaultDate; const latest = campaigns[campaigns.length - 1]; const duplicatedListe = latest.liste.map(c => ({ ...c, statut: c.statut === "non-concerne" ? "non-concerne" : "en-cours", fichiers: (c.fichiers||[]).map(f=>({...f, archive:true})), preuves: "", preuves_encours: c.preuves ? `[Ajourner]\n${c.preuves}` : c.preuves_encours })); const newCamp = { id: Date.now().toString(), name: name.trim(), auditDate, liste: duplicatedListe, locked: false }; saveData([...campaigns.map(c => ({ ...c, locked: true })), newCamp]); setActiveCampaignId(newCamp.id); } else e.target.value = activeCampaignId; } else setActiveCampaignId(e.target.value); };
  const handleDeleteCampaign = () => { if (campaigns.length <= 1) return alert("Impossible de supprimer la dernière."); if (window.confirm(`Supprimer cette évaluation ? IRRÉVERSIBLE.`)) { const u = campaigns.filter(c => c.id !== activeCampaignId); saveData(u); setActiveCampaignId(u[u.length - 1].id); } };
  const handleLogout = () => { signOut(auth); };

  const saveModal = (updated, action) => {
    try {
      if (isArchive) {
         if (action === "close" || !action) setModalCritere(null);
         else if (action === "next") setModalCritere(filtered[filtered.findIndex(c => c.id === updated.id) + 1]);
         else if (action === "prev") setModalCritere(filtered[filtered.findIndex(c => c.id === updated.id) - 1]);
         return;
      }
      const oldCritere = criteres.find(c => c.id === updated.id) || updated; 
      let newLogs = []; const userEmail = auth.currentUser?.email || "Utilisateur"; const now = new Date().toISOString();

      if (oldCritere.statut !== updated.statut) { const oldName = STATUT_CONFIG[oldCritere.statut]?.label || "Non évalué"; const newName = STATUT_CONFIG[updated.statut]?.label || "Non évalué"; newLogs.push({ date: now, user: userEmail, msg: `Statut : ${oldName} ➡️ ${newName}` }); }
      const oldResps = Array.isArray(oldCritere.responsables) ? oldCritere.responsables.slice().sort().join(", ") : ""; const newResps = Array.isArray(updated.responsables) ? updated.responsables.slice().sort().join(", ") : "";
      if (oldResps !== newResps) newLogs.push({ date: now, user: userEmail, msg: `Responsables mis à jour : ${newResps || "Aucun"}` });
      if ((oldCritere.preuves || "") !== (updated.preuves || "")) newLogs.push({ date: now, user: userEmail, msg: `📝 A modifié le texte des justifications / liens publics` });
      if ((oldCritere.preuves_encours || "") !== (updated.preuves_encours || "")) newLogs.push({ date: now, user: userEmail, msg: `🚧 A modifié le texte de la zone de chantier` });

      const oldFiles = oldCritere.fichiers || []; const newFiles = updated.fichiers || [];
      newFiles.forEach(nf => { const of = oldFiles.find(o => o.url === nf.url); if (!of) newLogs.push({ date: now, user: userEmail, msg: `📎 A importé le fichier : ${nf.name}` }); else if (of.validated !== nf.validated) newLogs.push({ date: now, user: userEmail, msg: nf.validated ? `✅ A validé le document comme preuve officielle : ${nf.name}` : `❌ A repassé en chantier le document : ${nf.name}` }); });
      oldFiles.forEach(of => { if (!newFiles.find(nf => nf.url === of.url)) newLogs.push({ date: now, user: userEmail, msg: `🗑️ A supprimé le fichier : ${of.name}` }); });

      const oldChemins = Array.isArray(oldCritere.chemins_reseau) ? oldCritere.chemins_reseau : []; const newChemins = Array.isArray(updated.chemins_reseau) ? updated.chemins_reseau : [];
      newChemins.forEach(nc => { const oc = oldChemins.find(o => typeof o === 'object' && o.chemin === nc.chemin); if (!oc) newLogs.push({ date: now, user: userEmail, msg: `🔗 A ajouté le lien réseau : ${nc.nom}` }); else if (oc.validated !== nc.validated) newLogs.push({ date: now, user: userEmail, msg: nc.validated ? `✅ A validé le lien réseau comme preuve officielle : ${nc.nom}` : `❌ A repassé en chantier le lien réseau : ${nc.nom}` }); });
      oldChemins.forEach(oc => { if (typeof oc === 'object' && !newChemins.find(nc => nc.chemin === oc.chemin)) newLogs.push({ date: now, user: userEmail, msg: `🗑️ A supprimé le lien réseau : ${oc.nom}` }); });

      let finalUpdated = { ...updated }; if (newLogs.length > 0) finalUpdated.historique = [...(oldCritere.historique || []), ...newLogs];
      const newCriteres = criteres.map(c => c.id === finalUpdated.id ? finalUpdated : c);
      saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newCriteres } : camp));

      const currentIndex = filtered.findIndex(c => c.id === finalUpdated.id);
      if (action === "close" || action === undefined) setModalCritere(null);
      else if (action === "next") setModalCritere(filtered[currentIndex + 1]);
      else if (action === "prev") setModalCritere(filtered[currentIndex - 1]);
    } catch (error) { console.error(error); setModalCritere(null); }
  };

  const handleAutoSave = (updated) => {
    if (isArchive) return;
    saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: criteres.map(c => c.id === updated.id ? updated : c) } : camp));
  };

  const exportToExcel = async () => {
    if (!criteres) return;
    if (typeof window.ExcelJS === "undefined") { alert("Le moteur Excel est en cours de chargement."); return; }
    const workbook = new window.ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Suivi Qualiopi');
    worksheet.columns = [ { header: 'N°', key: 'num', width: 8 }, { header: 'Critère', key: 'critere', width: 12 }, { header: 'Indicateur', key: 'titre', width: 45 }, { header: 'Statut', key: 'statut', width: 18 }, { header: 'Échéance', key: 'delai', width: 14 }, { header: 'Responsable(s)', key: 'resp', width: 25 }, { header: 'Preuves finalisées', key: 'preuves', width: 50 }, { header: 'Preuves en cours', key: 'preuves_encours', width: 50 }, { header: 'Remarques Évaluateur', key: 'attendus', width: 45 }, { header: 'Notes internes', key: 'notes', width: 45 } ];
    const toArgb = (hex) => hex ? hex.replace('#', 'FF').toUpperCase() : 'FF000000';
    criteres.forEach(c => {
      const d = days(c.delai); const sConf = STATUT_CONFIG[c.statut] || STATUT_CONFIG["non-evalue"]; const resps = Array.isArray(c.responsables) ? c.responsables : []; 
      const row = worksheet.addRow({ num: c.num || "", critere: `Critère ${c.critere || ""}`, titre: c.titre || "", statut: sConf.label, delai: c.statut==="non-concerne"?"-":new Date(c.delai || today).toLocaleDateString("fr-FR"), resp: resps.join(", "), preuves: c.preuves || "", preuves_encours: c.preuves_encours || "", attendus: c.attendus || "", notes: c.notes || "" });
      const cConf = CRITERES_LABELS[c.critere] || { color: "#9ca3af" }; 
      row.getCell('num').font = { color: { argb: toArgb(cConf.color) }, bold: true }; row.getCell('num').alignment = { horizontal: 'center', vertical: 'middle' }; 
      row.getCell('statut').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toArgb(sConf.bg) } }; row.getCell('statut').font = { color: { argb: toArgb(sConf.color) }, bold: true }; row.getCell('statut').alignment = { horizontal: 'center', vertical: 'middle' }; 
      const cellDelai = row.getCell('delai'); if (!isNaN(d) && d < 0 && c.statut!=="non-concerne") { cellDelai.font = { color: { argb: 'FFDC2626' }, bold: true }; } else if (!isNaN(d) && d < 30 && c.statut!=="non-concerne") { cellDelai.font = { color: { argb: 'FFD97706' }, bold: true }; }
    });
    const headerRow = worksheet.getRow(1); headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }; headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }; headerRow.alignment = { vertical: 'middle', horizontal: 'center' }; worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    worksheet.eachRow((row, rowNumber) => { row.eachCell((cell) => { cell.border = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, right: { style: 'thin', color: { argb: 'FFD1D5DB' } } }; if (rowNumber > 1) { if (!cell.alignment) { cell.alignment = { vertical: 'top', wrapText: true }; } else { cell.alignment.wrapText = true; } } }); });
    const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); const url = URL.createObjectURL(blob); const safeName = currentCampaign.name.replace(/[^a-z0-9]/gi, '_').toLowerCase(); const link = document.createElement("a"); link.href = url; link.setAttribute("download", `QualiForma_Export_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // 👉 LA FONCTION MAGIQUE ET ULTRA-ROBUSTE D'IMPORTATION
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (typeof window.ExcelJS === "undefined") return alert("Le moteur Excel n'est pas encore chargé. Veuillez patienter.");

    if (!window.confirm("⚠️ Attention : L'import va écraser les données actuelles de cet établissement par celles du fichier Excel. Êtes-vous sûr de vouloir continuer ?")) {
      e.target.value = null;
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new window.ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];
      
      if (!worksheet) throw new Error("Aucun onglet lisible n'a été trouvé dans le fichier.");

      let updatedCriteres = [...criteres];
      let count = 0;

      // Extracteur sécurisé (Gère le format texte enrichi ou brut d'Excel)
      const getCellText = (cell) => {
        if (!cell) return "";
        if (cell.text) return String(cell.text);
        if (cell.value) {
          if (typeof cell.value === "object" && cell.value.richText) return cell.value.richText.map(t => t.text).join("");
          return String(cell.value);
        }
        return "";
      };

      // Normalisateur (Enlève les accents pour la comparaison de statut)
      const normalize = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Ignore l'en-tête
        
        let numRaw = getCellText(row.getCell(1)).trim();
        if (!numRaw) return;
        
        // Si le tableur a écrit "Indicateur 1", on ne récupère que le chiffre "1"
        const numMatch = numRaw.match(/\d+/);
        const numClean = numMatch ? numMatch[0] : numRaw;

        // On cherche le bon indicateur dans notre base
        const index = updatedCriteres.findIndex(c => String(c.num) === numClean || String(c.num) === numRaw);
        
        if (index !== -1) {
          const statutText = getCellText(row.getCell(4)).trim();
          let statutKey = updatedCriteres[index].statut;
          if (statutText) {
            const foundStatut = Object.entries(STATUT_CONFIG).find(([k,v]) => normalize(v.label) === normalize(statutText));
            if (foundStatut) statutKey = foundStatut[0];
          }

          const respText = getCellText(row.getCell(6));
          let responsables = updatedCriteres[index].responsables || [];
          if (respText) responsables = respText.split(',').map(s => s.trim()).filter(s => s);

          updatedCriteres[index] = {
            ...updatedCriteres[index],
            statut: statutKey,
            responsables: responsables,
            preuves: getCellText(row.getCell(7)) || updatedCriteres[index].preuves,
            preuves_encours: getCellText(row.getCell(8)) || updatedCriteres[index].preuves_encours,
            attendus: getCellText(row.getCell(9)) || updatedCriteres[index].attendus,
            notes: getCellText(row.getCell(10)) || updatedCriteres[index].notes,
          };
          count++;
        }
      });

      if (count === 0) {
        alert("⚠️ Fichier lu, mais aucun numéro d'indicateur n'a pu être identifié. Assurez-vous d'importer un fichier généré via le bouton 'Excel'.");
      } else {
        const newCampaigns = campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: updatedCriteres } : camp);
        await saveData(newCampaigns);
        alert(`✅ Import réussi ! ${count} indicateurs ont été mis à jour avec succès.`);
      }
    } catch (error) {
      console.error(error);
      alert("❌ Échec de la lecture du fichier.\nMessage : " + error.message);
    }
    e.target.value = null; // Réinitialise le bouton
  };

  const navBtn = active => ({ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", background: active ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "transparent", color: active ? "white" : "#4b5563", whiteSpace: "nowrap", transition: "all 0.2s" });

  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;

  const currentIfsiName = ifsiList.find(i => i.id === selectedIfsi)?.name || "Chargement...";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif", color: "#1e3a5f" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      
      <style>{`
        @media print { .no-print { display: none !important; } body { background: white !important; } .print-break-avoid { page-break-inside: avoid; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        
        .flex-nav { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; gap: 20px; flex-wrap: wrap; }
        .nav-center { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; flex: 1; justify-content: center; }
        .responsive-grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
        .responsive-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        
        @media (max-width: 1024px) {
          .flex-nav { flex-direction: column; align-items: stretch !important; }
          .nav-center { justify-content: flex-start; }
          .hide-mobile { display: none !important; }
          .responsive-grid-5 { grid-template-columns: 1fr 1fr; }
          .responsive-grid-2 { grid-template-columns: 1fr; }
        }
        
        .org-card { background: white; border: 1px solid #d1d5db; padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; cursor: grab; font-size: 13px; font-weight: 600; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.2s; }
        .org-card:hover { border-color: #9ca3af; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .org-card:active { cursor: grabbing; opacity: 0.7; }
        
        .td-dash { transition: all 0.2s ease; border: 1px solid transparent; }
        .td-dash:hover { transform: translateY(-4px); box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1) !important; border-color: #bfdbfe !important; }
        
        .alert-ticker::-webkit-scrollbar { height: 6px; } 
        .alert-ticker::-webkit-scrollbar-thumb { background: #fca5a5; border-radius: 10px; }
      `}</style>

      {modalCritere && (
        <DetailModal 
          critere={modalCritere} onClose={() => setModalCritere(null)} onSave={saveModal} onAutoSave={handleAutoSave}
          isReadOnly={isArchive} isAuditMode={isAuditMode} allMembers={allIfsiMembers} rolePalette={ROLE_PALETTE} 
          orgRoles={orgRoles} hasPrev={filtered.findIndex(c => c.id === modalCritere.id) > 0} hasNext={filtered.findIndex(c => c.id === modalCritere.id) < filtered.length - 1}
        />
      )}

      {/* NAVIGATION */}
      <div className="no-print" style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 32px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <div className="flex-nav" style={{ maxWidth: "1440px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div onClick={() => { setActiveTab("dashboard"); setSearchTerm(""); setFilterStatut("tous"); setFilterCritere("tous"); }} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              <div style={{ width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#1d4ed8"/><stop offset="1" stopColor="#3b82f6"/></linearGradient></defs><path fillRule="evenodd" clipRule="evenodd" d="M11 2C6.02944 2 2 6.02944 2 11C2 15.9706 6.02944 20 11 20C13.125 20 15.078 19.2635 16.6177 18.0319L20.2929 21.7071C20.6834 22.0976 21.3166 22.0976 21.7071 21.7071C22.0976 21.3166 22.0976 20.6834 21.7071 20.2929L18.0319 16.6177C19.2635 15.078 20 13.125 20 11C20 6.02944 15.9706 2 11 2ZM4 11C4 7.13401 7.13401 4 11 4C14.866 4 18 7.13401 18 11C18 14.866 14.866 18 11 18C7.13401 18 4 14.866 4 11Z" fill="url(#g)"/><path d="M10.5 15.5L7 12L8.41 10.59L10.5 12.67L14.59 8.59L16 10L10.5 15.5Z" fill="url(#g)"/></svg>
              </div>
              <span style={{ fontSize: "18px", fontWeight: "800", color: "#1e3a5f" }}>QualiForma</span>
            </div>
            <select value={selectedIfsi || ""} onChange={handleIfsiSwitch} style={{ padding: "6px", borderRadius: "6px", border: "1px solid #d1d5db", fontWeight: "800", color: "#1d4ed8" }}>
              {ifsiList.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              {userProfile?.role === "superadmin" && <option value="NEW">+ Nouvel établissement</option>}
            </select>
          </div>

          <div className="nav-center">
            {userProfile?.role === "superadmin" && <button style={navBtn(activeTab === "tour_controle")} onClick={() => setActiveTab("tour_controle")}>🛸 Superadmin</button>}
            <button style={navBtn(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
            <button style={navBtn(activeTab === "criteres")} onClick={() => setActiveTab("criteres")}>Indicateurs</button>
            <button style={navBtn(activeTab === "axes")} onClick={() => setActiveTab("axes")}>Priorités</button>
            <button style={navBtn(activeTab === "responsables")} onClick={() => setActiveTab("responsables")}>Responsables</button>
            <button style={navBtn(activeTab === "livre_blanc")} onClick={() => setActiveTab("livre_blanc")}>Livre Blanc</button>
            {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && <button style={navBtn(activeTab === "organigramme")} onClick={() => setActiveTab("organigramme")}>🌳 Organigramme</button>}
            {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && <button style={navBtn(activeTab === "equipe")} onClick={() => setActiveTab("equipe")}>👥 Comptes</button>}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {/* 👉 BOUTON IMPORT EXCEL RÉSERVÉ AU SUPERADMIN ET ADMIN */}
            {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && !isArchive && (
              <>
                <input type="file" id="import-excel" accept=".xlsx" style={{ display: 'none' }} onChange={handleImportExcel} />
                <label htmlFor="import-excel" className="hide-mobile" style={{ ...navBtn(false), color: "#059669", background: "white", fontSize: "12px", border: "1px solid #d1d5db", display: "flex", gap: "6px", padding: "6px 12px", cursor: "pointer", margin: 0 }}>
                  <span>📥</span> Importer
                </label>
              </>
            )}
            <button className="hide-mobile" onClick={exportToExcel} style={{ ...navBtn(false), color: "#059669", background: "#d1fae5", fontSize: "12px", border: "1px solid #6ee7b7", display: "flex", gap: "6px", padding: "6px 12px" }}><span>📊</span> Excel</button>
            <button onClick={() => setActiveTab("compte")} style={{ border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: "6px", background: "white", cursor: "pointer" }}>⚙️</button>
            <button onClick={handleLogout} style={{ color: "#ef4444", border: "1px solid #fca5a5", padding: "6px 12px", borderRadius: "6px", background: "#fef2f2", cursor: "pointer", fontWeight: "bold" }}>Déconnexion</button>
          </div>
        </div>
      </div>

      {/* CONTENU */}
      <div className="animate-fade-in" style={{ maxWidth: "1440px", margin: "0 auto", padding: "28px 32px" }}>
        {activeTab === "dashboard" && campaigns && <DashboardTab bannerConfig={{ bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", icon: "🗓️", text: "Audit Qualiopi" }} currentAuditDate={currentAuditDate} isArchive={isArchive} handleEditAuditDate={handleEditAuditDate} stats={stats} urgents={urgents} criteres={criteres} />}
        {activeTab === "tour_controle" && <TourControleTab globalScore={tourData.score} activeIfsis={tourData.active} totalUsersInNetwork={totalUsersInNetwork} topAlerts={tourData.alerts} sortedTourIfsis={sortedTourIfsis} setSelectedIfsi={setSelectedIfsi} archivedIfsis={tourData.archived} today={today} handleRenameIfsi={handleRenameIfsi} handleArchiveIfsi={handleArchiveIfsi} handleHardDeleteIfsi={handleHardDeleteIfsi} setActiveTab={setActiveTab} tourSort={tourSort} setTourSort={setTourSort} totalAlertsCount={tourData.alerts.length} />}
        {activeTab === "organigramme" && <OrganigrammeTab currentIfsiName={currentIfsiName} orgRoles={orgRoles} allIfsiMembers={allIfsiMembers} getRoleColor={getRoleColor} handleDragOverOrg={handleDragOverOrg} handleDropOrg={handleDropOrg} handleDragStartOrg={handleDragStartOrg} removeRoleFromUser={removeRoleFromUser} editOrgRole={editOrgRole} editManualUser={editManualUser} deleteManualUser={deleteManualUser} addManualUser={addManualUser} addOrgRole={addOrgRole} newManualUserInput={newManualUserInput} setNewManualUserInput={setNewManualUserInput} newRoleInput={newRoleInput} setNewRoleInput={setNewRoleInput} deleteOrgRole={deleteOrgRole} applyDefaultRoles={applyDefaultRoles} />}
        {activeTab === "criteres" && <CriteresTab searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterStatut={filterStatut} setFilterStatut={setFilterStatut} filterCritere={filterCritere} setFilterCritere={setFilterCritere} filtered={filtered} days={days} today={today} dayColor={dayColor} setModalCritere={setModalCritere} isArchive={isArchive} />}
        {activeTab === "axes" && <AxesTab axes={axes} days={days} today={today} dayColor={dayColor} setModalCritere={setModalCritere} isArchive={isArchive} isAuditMode={isAuditMode} />}
        {activeTab === "responsables" && <ResponsablesTab byPerson={byPerson} setModalCritere={setModalCritere} isArchive={isArchive} getRoleColor={getRoleColor} />}
        {activeTab === "livre_blanc" && <LivreBlancTab currentIfsiName={currentIfsiName} currentCampaign={currentCampaign} criteres={criteres} />}
        {activeTab === "equipe" && <EquipeTab userProfile={userProfile} newMember={newMember} setNewMember={setNewMember} isCreatingUser={isCreatingUser} handleCreateUser={handleCreateUser} selectedIfsi={selectedIfsi} ifsiList={ifsiList} teamSearchTerm={teamSearchTerm} setTeamSearchTerm={setTeamSearchTerm} sortedTeamUsers={sortedTeamUsers} teamSortConfig={teamSortConfig} handleSortTeam={handleSortTeam} handleDeleteUser={handleDeleteUser} auth={auth} />}
        {activeTab === "compte" && <CompteTab auth={auth} userProfile={userProfile} pwdUpdate={pwdUpdate} setPwdUpdate={setPwdUpdate} handleChangePassword={handleChangePassword} />}
      </div>
    </div>
  );
}

export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }
