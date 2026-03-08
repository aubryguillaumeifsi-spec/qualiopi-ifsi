import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";

import DashboardTab from "./components/DashboardTab";
import TourControleTab from "./components/TourControleTab";
import OrganigrammeTab from "./components/OrganigrammeTab";
import { CriteresTab, LivreBlancTab } from "./components/TabsQualiopi";
import { EquipeTab, CompteTab } from "./components/TabsAdmin";

import { getDoc, setDoc, deleteDoc, doc, collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, updatePassword, sendPasswordResetEmail, sendEmailVerification } from "firebase/auth";
// 🎯 AJOUT DE STORAGE ICI
import { db, auth, storage, secondaryAuth } from "./firebase";
import { DEFAULT_CRITERES, CRITERES_LABELS, STATUT_CONFIG } from "./data";

const GFONT = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Albert+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap";

function buildTokens(dark) {
  return dark ? {
    bg:"#0b111a", surface:"#151c2a", surface2:"#1a2235", surface3:"#1e2840",
    border:"#1f2d42", border2:"#192438", borderNav:"rgba(255,255,255,0.07)",
    sidebar:"#0a101a", nav:"#0a101a", 
    text:"#d6e3f5", text2:"#748bac", text3:"#425675",
    textNav:"#ffffff", textNavSub:"rgba(255,255,255,0.5)",
    accent:"#4f82f5", accentBg:"rgba(79,130,245,0.12)", accentBd:"rgba(79,130,245,0.28)",
    gold:"#d4a030", goldBg:"rgba(212,160,48,0.12)", goldBd:"rgba(212,160,48,0.3)",
    green:"#2cc880", greenBg:"rgba(44,200,128,0.1)", greenBd:"rgba(44,200,128,0.25)",
    red:"#f07070", redBg:"rgba(240,112,112,0.1)", redBd:"rgba(240,112,112,0.25)",
    amber:"#fbad14", amberBg:"rgba(251,173,20,0.12)", amberBd:"rgba(251,173,20,0.3)",
    shadow:"0 2px 8px rgba(0,0,0,0.5)", shadowSm:"0 1px 3px rgba(0,0,0,0.4)", shadowGold:"0 4px 16px rgba(212,160,48,0.18)",
  } : {
    bg:"#eef2f6", surface:"#ffffff", surface2:"#f8fafc", surface3:"#e2e8f0",
    border:"#d5ddef", border2:"#e2e8f0", borderNav:"rgba(255,255,255,0.08)",
    sidebar:"#162040", nav:"#162040", 
    text:"#0f172a", text2:"#475569", text3:"#94a3b8",
    textNav:"#ffffff", textNavSub:"rgba(255,255,255,0.6)",
    accent:"#1d52d4", accentBg:"#eff6ff", accentBd:"#bfdbfe",
    gold:"#b07010", goldBg:"#fef4de", goldBd:"#f0cc70",
    green:"#0e7a50", greenBg:"#e8f9f3", greenBd:"#9dddc5",
    red:"#c42828", redBg:"#fdecea", redBd:"#f4a6a6",
    amber:"#e08500", amberBg:"#fef6eb", amberBd:"#f8d799",
    shadow:"0 4px 6px -1px rgba(0,0,0,0.05)", shadowSm:"0 1px 3px rgba(0,0,0,0.05)", shadowGold:"0 4px 16px rgba(176,112,16,0.18)",
  };
}

const DEFAULT_ROLES = ["Direction", "Formation", "Secrétariat", "Documentaliste", "Qualité"];
const DEFAULT_JOB_TITLES = ["Directrice IFPS", "Coordinatrice pédagogique", "Formateur IFSI", "Formateur IFAS", "Secrétaire", "TICE", "Documentaliste", "Ingénieur pédagogique"];
const DEFAULT_TAGS = ["Référent Laïcité", "Référent ABS", "Référent Simulation", "Référent Qualité", "AFGSU"];

const ROLE_PALETTE = [ 
  { bg: "#fef4de", border: "#f0cc70", text: "#b07010" }, 
  { bg: "#eff6ff", border: "#bfdbfe", text: "#1d52d4" }, 
  { bg: "#e8f9f3", border: "#9dddc5", text: "#0e7a50" }, 
  { bg: "#fce7f3", border: "#f9a8d4", text: "#be185d" }, 
  { bg: "#f3e8ff", border: "#d8b4fe", text: "#7e22ce" }, 
  { bg: "#ffedd5", border: "#fdba74", text: "#c2410c" }, 
  { bg: "#ecfeff", border: "#7dd3fc", text: "#0369a1" }, 
  { bg: "#fee2e2", border: "#fca5a5", text: "#b91c1c" }, 
  { bg: "#ccfbf1", border: "#5eead4", text: "#0f766e" }, 
  { bg: "#fef08a", border: "#fde047", text: "#a16207" }, 
  { bg: "#e0e7ff", border: "#c7d2fe", text: "#4338ca" }, 
  { bg: "#fae8ff", border: "#f3ccff", text: "#a21caf" }  
];

const today = new Date();
const days = d => { if (!d) return NaN; const p = new Date(d); return isNaN(p.getTime()) ? NaN : Math.round((p - today) / 86400000); };
const dateJourFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(today);

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "Albert Sans, sans-serif" }}>
        <h1 style={{ color: "#f05050" }}>⚠️ Erreur Système</h1>
        <pre style={{ background: "rgba(240,80,80,0.12)", padding: "20px", borderRadius: "8px", overflowX: "auto", maxWidth: "800px", margin: "0 auto" }}>{this.state.error?.toString()}</pre>
        <button onClick={() => window.location.reload()} style={{ marginTop: "20px", padding: "10px 20px", background: "#4f80f0", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>Recharger l'application</button>
      </div>
    );
    return this.props.children;
  }
}

function MainApp() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("theme_dark") !== "false");
  const [isColorblindMode, setIsColorblindMode] = useState(() => localStorage.getItem("theme_colorblind") === "true");

  useEffect(() => { localStorage.setItem("theme_dark", isDarkMode); }, [isDarkMode]);
  useEffect(() => { localStorage.setItem("theme_colorblind", isColorblindMode); }, [isColorblindMode]);

  const t = buildTokens(isDarkMode); 

  const dayColor = useCallback((d) => { 
    const daysLeft = days(d); 
    if (isNaN(daysLeft)) return t.text3; 
    if (daysLeft < 0) return isColorblindMode ? t.amber : t.red; 
    if (daysLeft < 30) return t.amber; 
    return t.text3; 
  }, [isColorblindMode, t]);

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
  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [teamSortConfig, setTeamSortConfig] = useState({ key: "email", direction: "asc" });
  const [tourSort, setTourSort] = useState("urgence");

  const [auditModal, setAuditModal] = useState({ show: false, name: "", date: "" });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "etablissements"), (snapshot) => {
      const list = []; snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setIfsiList(list.sort((a, b) => String(a.name).localeCompare(b.name)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        if (!user.emailVerified) { setActiveTab("validation_requise"); } 
        else { setActiveTab("dashboard"); }
        
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
        const users = []; snapshot.forEach(d => users.push({ id: d.id, ...d.data() }));
        setTeamUsers(users.filter(u => userProfile.role === "superadmin" || u.etablissementId === selectedIfsi));
      });
    }
    return () => unsub && unsub();
  }, [selectedIfsi, userProfile]);

  useEffect(() => {
    if (!selectedIfsi || !userProfile || userProfile.mustChangePassword || !auth.currentUser?.emailVerified) return;
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

  const handleLogout = () => signOut(auth);

  const handleArchiveIfsi = async (id, name, status) => { if (window.confirm(`Voulez-vous ${status ? 'archiver' : 'restaurer'} ${name} ?`)) await setDoc(doc(db, "etablissements", id), { archived: status }, { merge: true }); };
  const handleHardDeleteIfsi = async (id, name) => { if (prompt(`Tapez SUPPRIMER pour détruire ${name}`) === "SUPPRIMER") { await deleteDoc(doc(db, "etablissements", id)); await deleteDoc(doc(db, "qualiopi", id === "demo_ifps_cham" ? "criteres" : id)); if (selectedIfsi === id) setSelectedIfsi("demo_ifps_cham"); } };
  const handleRenameIfsi = async (id, currentName) => { const n = prompt("Nouveau nom :", currentName); if (n?.trim() && n !== currentName) await setDoc(doc(db, "etablissements", id), { name: n.trim() }, { merge: true }); };
  
  const handleSendResetEmail = async (userEmail) => { if (window.confirm(`Envoyer un email de réinitialisation à ${userEmail} ?`)) { try { await sendPasswordResetEmail(auth, userEmail); alert("✅ Email envoyé."); } catch (error) { alert(error.message); } } };
  
  // 🎯 NOUVEAU : Fonction de sauvegarde de l'établissement pour le nouvel onglet
  const handleSaveEtab = async (fields) => {
    if (!selectedIfsi) return;
    await setDoc(doc(db, "etablissements", selectedIfsi), fields, { merge: true });
  };

  const handleDeleteUser = async (userId) => { if (window.confirm("Révoquer cet accès ?")) await deleteDoc(doc(db, "users", userId)); };
  
  const handleCreateUser = async () => {
    if (!newMember.email || !newMember.pwd) return alert("Requis.");
    setIsCreatingUser(true);
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newMember.email, newMember.pwd);
      const targetIfsi = userProfile.role === "superadmin" && newMember.ifsi ? newMember.ifsi : selectedIfsi;
      await setDoc(doc(db, "users", cred.user.uid), { email: newMember.email, role: newMember.role, etablissementId: targetIfsi, orgRoles: [], jobTitles: [], tags: [], mustChangePassword: true, status: "ACTIF", orgLevel: 3 });
      alert("✅ Compte créé !");
      setNewMember({ email: "", pwd: "", role: "user", ifsi: "" });
      secondaryAuth.signOut();
    } catch (error) { alert(error.message); }
    setIsCreatingUser(false);
  };

  const orgRoleColors = useMemo(() => ifsiData?.roleColors || {}, [ifsiData]);

  const getRoleColor = useCallback((roleName) => { 
    if (!roleName) return ROLE_PALETTE[0];
    let idx = orgRoleColors[roleName];
    if (idx === undefined) {
      idx = (ifsiData?.roles || []).indexOf(roleName); 
    }
    return ROLE_PALETTE[idx % ROLE_PALETTE.length] || ROLE_PALETTE[5]; 
  }, [ifsiData, orgRoleColors, t]);

  const currentCampaign = useMemo(() => campaigns?.find(c => c.id === activeCampaignId) || campaigns?.[0], [campaigns, activeCampaignId]);
  const criteres = useMemo(() => currentCampaign?.liste || [], [currentCampaign]);
  const isArchive = currentCampaign?.locked || currentCampaign?.archived || false;
  const currentAuditDate = currentCampaign?.auditDate || "2026-10-15";
  
  const orgRoles = useMemo(() => ifsiData?.roles || DEFAULT_ROLES, [ifsiData]);
  const orgJobTitles = useMemo(() => ifsiData?.jobTitles || DEFAULT_JOB_TITLES, [ifsiData]); 
  const orgTags = useMemo(() => ifsiData?.tags || DEFAULT_TAGS, [ifsiData]); 
  const orgConnections = useMemo(() => ifsiData?.orgConnections || [], [ifsiData]);
  
  const manualUsers = useMemo(() => ifsiData?.manualUsers || [], [ifsiData]);
  const orgAccounts = useMemo(() => teamUsers.filter(u => u.etablissementId === selectedIfsi && u.role !== "superadmin"), [teamUsers, selectedIfsi]);

  const allIfsiMembers = useMemo(() => [
    ...orgAccounts.map(u => ({ 
      id: u.id, 
      prenom: u.prenom || (u.email ? u.email.split('@')[0].split('.')[0] : "Utilisateur"), 
      nom: u.nom || (u.email && u.email.includes('.') ? u.email.split('@')[0].split('.')[1] : ""), 
      name: u.name || (u.email ? u.email.split('@')[0] : "Utilisateur"), 
      roles: u.orgRoles || [], 
      jobTitles: Array.isArray(u.jobTitles) ? u.jobTitles : (u.jobTitle ? [u.jobTitle] : []),
      tags: Array.isArray(u.tags) ? u.tags : [], 
      orgLevel: u.orgLevel || null,
      type: 'account', 
      email: u.email,
      phone: u.phone || "",
      status: u.status || "ACTIF",
      archived: u.archived || false
    })),
    ...manualUsers.map(u => {
      const parts = (u.name || "Membre Inconnu").trim().split(' ');
      return { 
        id: u.id, 
        prenom: u.prenom || parts[0] || "Membre", 
        nom: u.nom || parts.slice(1).join(' ') || "", 
        name: u.name || "Membre", 
        roles: u.roles || [], 
        jobTitles: Array.isArray(u.jobTitles) ? u.jobTitles : (u.jobTitle ? [u.jobTitle] : []),
        tags: Array.isArray(u.tags) ? u.tags : [], 
        orgLevel: u.orgLevel || null,
        type: 'manual',
        email: u.email || "",
        phone: u.phone || "",
        status: u.status || "ACTIF",
        archived: u.archived || false
      };
    })
  ].sort((a,b) => (a.prenom||"").localeCompare(b.prenom||"")), [orgAccounts, manualUsers]);

  const { stats, urgents, filtered, axes } = useMemo(() => {
    const filt = criteres.filter(c => {
      if (filterStatut !== "tous" && c.statut !== filterStatut) return false;
      if (filterCritere !== "tous" && c.critere !== parseInt(filterCritere)) return false;
      if (searchTerm && !c.titre.toLowerCase().includes(searchTerm.toLowerCase()) && !String(c.num).includes(searchTerm)) return false;
      return true;
    });
    const total = criteres.filter(c => c.statut !== "non-concerne").length || 1;
    return {
      stats: { total, conforme: criteres.filter(c => c.statut === "conforme").length, enCours: criteres.filter(c => c.statut === "en-cours").length, nonConforme: criteres.filter(c => c.statut === "non-conforme").length, nonEvalue: criteres.filter(c => c.statut === "non-evalue").length, nonConcerne: criteres.filter(c => c.statut === "non-concerne").length },
      urgents: criteres.filter(c => days(c.delai) <= 30 && c.statut !== "conforme" && c.statut !== "non-concerne").sort((a,b) => days(a.delai) - days(b.delai)),
      filtered: filt,
      axes: criteres.filter(c => ["non-conforme", "en-cours"].includes(c.statut)).sort((a, b) => ({"non-conforme":0,"en-cours":1}[a.statut] - {"non-conforme":0,"en-cours":1}[b.statut]))
    };
  }, [criteres, filterStatut, filterCritere, searchTerm]);

  const sortedTeamUsers = useMemo(() => teamUsers.filter(u => u.role !== "superadmin" || userProfile?.role === "superadmin"), [teamUsers, userProfile]);
  const handleSortTeam = (key) => { let direction = "asc"; if (teamSortConfig.key === key && teamSortConfig.direction === "asc") direction = "desc"; setTeamSortConfig({ key, direction }); };
  
  const handleIfsiSwitch = async (e) => { 
    const val = e.target.value;
    if (val === "NEW") { 
      const nom = prompt("Nom de l'établissement :"); 
      if (nom?.trim()) { 
        const id = nom.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(Math.random() * 1000); 
        await setDoc(doc(db, "etablissements", id), { name: nom.trim(), roles: DEFAULT_ROLES, jobTitles: DEFAULT_JOB_TITLES, tags: DEFAULT_TAGS, roleColors: {}, archived: false }); 
        setSelectedIfsi(id); 
      } else {
        setSelectedIfsi(null); setTimeout(() => setSelectedIfsi(selectedIfsi), 0);
      }
    } else { setSelectedIfsi(val); } 
  };

  const getIfsiGlobalStats = useCallback((id) => {
    const d = allQualiopiData[id === "demo_ifps_cham" ? "criteres" : id]?.campaigns?.at(-1)?.liste || [];
    const conforme = d.filter(c => c.statut === "conforme").length;
    const concerned = d.filter(c => c.statut !== "non-concerne").length || 1;
    return { pct: Math.round((conforme/concerned)*100), conforme, total: concerned, liste: d, auditDate: allQualiopiData[id]?.campaigns?.at(-1)?.auditDate };
  }, [allQualiopiData]);

  const tourData = useMemo(() => {
    const active = ifsiList.filter(i => !i.archived).map(i => ({ ...i, ...getIfsiGlobalStats(i.id), users: teamUsers.filter(u => u.etablissementId === i.id).length }));
    const score = active.length ? Math.round(active.reduce((acc, curr) => acc + curr.pct, 0) / active.length) : 0;
    let alerts = [];
    active.forEach(s => (s.liste || []).forEach(c => {
      if (c.statut === "non-conforme") alerts.push({ ifsiId: s.id, ifsiName: s.name, critere: c, type: "non-conforme", id: s.id+c.num });
      else if (days(c.delai) < 0 && c.statut !== "non-concerne" && c.statut !== "conforme") alerts.push({ ifsiId: s.id, ifsiName: s.name, critere: c, type: "depasse", days: Math.abs(days(c.delai)), id: s.id+c.num });
    }));
    return { active, archived: ifsiList.filter(i => i.archived), score, alerts };
  }, [ifsiList, getIfsiGlobalStats, teamUsers]);

  const sortedTourIfsis = useMemo(() => [...tourData.active].sort((a,b) => {
    if (tourSort === "urgence") return new Date(a.auditDate) - new Date(b.auditDate);
    if (tourSort === "score_desc") return b.pct - a.pct;
    return a.name.localeCompare(b.name);
  }), [tourData.active, tourSort]);

  const saveData = async (newCampaigns) => {
    const docId = selectedIfsi === "demo_ifps_cham" ? "criteres" : selectedIfsi;
    await setDoc(doc(db, "qualiopi", docId), { campaigns: newCampaigns, updatedAt: new Date().toISOString() }, { merge: true });
  };

  const handleAutoSave = (updated) => {
    if (isArchive) return;
    const newListe = criteres.map(c => c.id === updated.id ? updated : c);
    const newCampaigns = campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp);
    saveData(newCampaigns);
  };

  const handleArchiveCampaign = (campaignId, status) => {
    const camp = campaigns.find(c => c.id === campaignId);
    if (window.confirm(`Voulez-vous vraiment ${status ? 'archiver' : 'désarchiver'} l'audit "${camp.name}" ?`)) {
      const newCampaigns = campaigns.map(c => c.id === campaignId ? { ...c, archived: status } : c);
      saveData(newCampaigns);
    }
  };

  const handleDeleteCampaign = (campaignId) => {
    const camp = campaigns.find(c => c.id === campaignId);
    if (prompt(`⚠️ ATTENTION ACTION IRRÉVERSIBLE !\nTapez "SUPPRIMER" pour détruire définitivement l'audit "${camp.name}".`) === "SUPPRIMER") {
      const newCampaigns = campaigns.filter(c => c.id !== campaignId);
      saveData(newCampaigns);
      if (activeCampaignId === campaignId) {
        setActiveCampaignId(newCampaigns[newCampaigns.length - 1]?.id || null);
      }
    }
  };

  const saveModal = (updated, action) => { 
    handleAutoSave(updated); 
    if (action === "close" || !action) setModalCritere(null); 
    else if (action === "next") {
       const idx = filtered.findIndex(c => c.id === updated.id);
       if (idx !== -1 && idx < filtered.length - 1) setModalCritere(filtered[idx + 1]);
    }
    else if (action === "prev") {
       const idx = filtered.findIndex(c => c.id === updated.id);
       if (idx > 0) setModalCritere(filtered[idx - 1]);
    }
  };

  const submitAuditModal = () => {
    if(!auditModal.name || !auditModal.date) return alert("Veuillez remplir tous les champs.");
    const newId = Date.now().toString();
    const newCamp = { id: newId, name: auditModal.name, auditDate: auditModal.date, liste: DEFAULT_CRITERES, locked: false, archived: false };
    saveData([...(campaigns||[]), newCamp]);
    setActiveCampaignId(newId);
    setAuditModal({ show: false, name: "", date: "" });
  };

  const handleEditAuditDate = (newDate) => {
    const newCampaigns = campaigns.map(c => c.id === activeCampaignId ? { ...c, auditDate: newDate } : c);
    saveData(newCampaigns);
  };

  const handleUpdateUserDetail = async (memberId, type, updates) => {
    if (type === 'account') {
      await setDoc(doc(db, "users", memberId), updates, { merge: true });
    } else if (type === 'manual') {
      const updatedManuals = manualUsers.map(u => u.id === memberId ? { ...u, ...updates } : u);
      await setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: updatedManuals }, { merge: true });
    }
  };

  const handleHardDeleteMember = async (memberId, type) => {
    if (type === 'account') {
      await deleteDoc(doc(db, "users", memberId));
    } else if (type === 'manual') {
      const updatedManuals = manualUsers.filter(u => u.id !== memberId);
      await setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: updatedManuals }, { merge: true });
    }
  };

  const handleAddManualUser = (userData) => {
    const newUser = { 
      id: 'm_' + Date.now(), 
      prenom: userData.prenom.trim(), 
      nom: userData.nom.toUpperCase().trim(), 
      name: `${userData.prenom.trim()} ${userData.nom.toUpperCase().trim()}`, 
      roles: userData.roles || [], 
      status: "ACTIF", 
      jobTitles: userData.jobTitles || [],
      tags: userData.tags || [],
      email: userData.email || "",
      phone: userData.phone || "",
      orgLevel: 3 
    };
    setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: [...manualUsers, newUser] }, { merge: true });
  };

  const handleManageStructure = async (type, action, oldVal, newVal) => {
    const docRef = doc(db, "etablissements", selectedIfsi);
    const snap = await getDoc(docRef);
    if(!snap.exists()) return;
    const data = snap.data();
    
    if (type === 'roleColor') {
       const newRoleColors = { ...(data.roleColors || {}) };
       newRoleColors[oldVal] = newVal; 
       await setDoc(docRef, { roleColors: newRoleColors }, { merge: true });
       return;
    }

    let arr = type === 'role' ? (data.roles || DEFAULT_ROLES) : 
              type === 'jobTitle' ? (data.jobTitles || DEFAULT_JOB_TITLES) : 
              (data.tags || DEFAULT_TAGS);
              
    let mUsers = data.manualUsers || [];
    let updates = { manualUsers: mUsers };

    if (action === 'add') {
        if (!newVal || arr.includes(newVal)) return;
        arr.push(newVal);
    } else if (action === 'edit') {
        if (!newVal || arr.includes(newVal)) return;
        arr = arr.map(x => x === oldVal ? newVal : x);
        
        if (type === 'role') {
            mUsers = mUsers.map(u => ({...u, roles: (u.roles||[]).map(r => r === oldVal ? newVal : r)}));
            const newRoleColors = { ...(data.roleColors || {}) };
            if (newRoleColors[oldVal] !== undefined) {
               newRoleColors[newVal] = newRoleColors[oldVal];
               delete newRoleColors[oldVal];
               updates.roleColors = newRoleColors;
            }
        }
        else if (type === 'jobTitle') mUsers = mUsers.map(u => ({...u, jobTitles: (u.jobTitles||[]).map(j => j === oldVal ? newVal : j)}));
        else if (type === 'tag') mUsers = mUsers.map(u => ({...u, tags: (u.tags||[]).map(t => t === oldVal ? newVal : t)}));
        
        orgAccounts.forEach(async (user) => {
           if (type === 'role' && user.orgRoles?.includes(oldVal)) {
               await setDoc(doc(db, "users", user.id), { orgRoles: user.orgRoles.map(r => r === oldVal ? newVal : r) }, { merge: true });
           }
           if (type === 'jobTitle' && user.jobTitles?.includes(oldVal)) {
               await setDoc(doc(db, "users", user.id), { jobTitles: user.jobTitles.map(j => j === oldVal ? newVal : j) }, { merge: true });
           }
           if (type === 'tag' && user.tags?.includes(oldVal)) {
               await setDoc(doc(db, "users", user.id), { tags: user.tags.map(t => t === oldVal ? newVal : t) }, { merge: true });
           }
        });
    } else if (action === 'delete') {
        arr = arr.filter(x => x !== oldVal);
        if (type === 'role') mUsers = mUsers.map(u => ({...u, roles: (u.roles||[]).filter(r => r !== oldVal)}));
        else if (type === 'jobTitle') mUsers = mUsers.map(u => ({...u, jobTitles: (u.jobTitles||[]).filter(j => j !== oldVal)}));
        else if (type === 'tag') mUsers = mUsers.map(u => ({...u, tags: (u.tags||[]).filter(t => t !== oldVal)}));
        
        orgAccounts.forEach(async (user) => {
           if (type === 'role' && user.orgRoles?.includes(oldVal)) {
               await setDoc(doc(db, "users", user.id), { orgRoles: user.orgRoles.filter(r => r !== oldVal) }, { merge: true });
           }
           if (type === 'jobTitle' && user.jobTitles?.includes(oldVal)) {
               await setDoc(doc(db, "users", user.id), { jobTitles: user.jobTitles.filter(j => j !== oldVal) }, { merge: true });
           }
           if (type === 'tag' && user.tags?.includes(oldVal)) {
               await setDoc(doc(db, "users", user.id), { tags: user.tags.filter(t => t !== oldVal) }, { merge: true });
           }
        });
    }

    if (type === 'role') updates.roles = arr;
    else if (type === 'jobTitle') updates.jobTitles = arr;
    else if (type === 'tag') updates.tags = arr;

    await setDoc(docRef, updates, { merge: true });
  };

  const handleUpdateConnections = async (newConns) => {
    await setDoc(doc(db, "etablissements", selectedIfsi), { orgConnections: newConns }, { merge: true });
  };

  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;
  if (activeTab === "validation_requise") return <div style={{ minHeight: "100vh", background: t.bg, color: t.text, display: "flex", justifyContent: "center", alignItems: "center" }}>Vérification Email Requise</div>;
  if (userProfile?.mustChangePassword) return <div style={{ minHeight: "100vh", background: t.bg, color: t.text, display: "flex", justifyContent: "center", alignItems: "center" }}>Veuillez changer votre mot de passe.</div>;

  const currentIfsiName = ifsiList.find(i => i.id === selectedIfsi)?.name || "";
  const pctGlobal = stats?.total > 0 ? Math.round(((stats?.conforme || 0) / stats.total) * 100) : 0;
  
  const menuBtn = (id, label) => {
    const act = activeTab === id;
    return (
      <button 
        onClick={() => { setActiveTab(id); setSearchTerm(""); setFilterStatut("tous"); setFilterCritere("tous"); }} 
        style={{ 
          width: "100%", display: "block", padding: "10px 16px", 
          background: act ? "rgba(212,160,48,0.08)" : "transparent", 
          color: act ? t.textNav : t.textNavSub, 
          border: act ? `1px solid rgba(212,160,48,0.5)` : "1px solid transparent", 
          boxShadow: act ? `0 0 10px rgba(212,160,48,0.1)` : "none",
          borderRadius: "8px", fontSize: "13px", fontWeight: act ? "700" : "500", 
          cursor: "pointer", transition: "all 0.2s", textAlign: "left", marginBottom: "4px" 
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'Albert Sans', sans-serif" }}>
      <link href={GFONT} rel="stylesheet" />
      <style>{`
        html, body, #root { margin: 0; padding: 0; min-height: 100vh; background: ${t.bg}; }
        @media print { .no-print { display: none !important; } body { background: white !important; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        main::-webkit-scrollbar { width: 8px; }
        main::-webkit-scrollbar-track { background: transparent; }
        main::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 4px; }
      `}</style>

      {auditModal.show && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>
          <div className="animate-fade-in" style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"16px", padding:"32px", width:"420px", boxShadow:t.shadowLg }}>
            <h3 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"32px", color:t.text, margin:"0 0 8px 0" }}>Nouvel Audit</h3>
            <p style={{ fontSize:"13px", color:t.text2, marginBottom:"24px", lineHeight:"1.5" }}>Préparez un nouveau cycle d'évaluation. Tous les indicateurs seront réinitialisés pour cette campagne.</p>
            
            <div style={{ marginBottom:"16px" }}>
              <label style={{ display:"block", fontSize:"11px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"8px" }}>Nom de l'audit</label>
              <input type="text" value={auditModal.name} onChange={e=>setAuditModal({...auditModal, name:e.target.value})} placeholder="Ex: Audit de renouvellement 2028" style={{ width:"100%", padding:"12px 16px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"14px", fontFamily:"inherit" }} />
            </div>
            <div style={{ marginBottom:"32px" }}>
              <label style={{ display:"block", fontSize:"11px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"8px" }}>Date d'évaluation prévue</label>
              <input type="date" value={auditModal.date} onChange={e=>setAuditModal({...auditModal, date:e.target.value})} style={{ width:"100%", padding:"12px 16px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"14px", fontFamily:"inherit", colorScheme:isDarkMode?"dark":"light" }} />
            </div>
            
            <div style={{ display:"flex", justifyContent:"flex-end", gap:"12px" }}>
              <button onClick={()=>setAuditModal({show:false, name:"", date:""})} style={{ padding:"12px 20px", borderRadius:"8px", border:"none", background:"transparent", color:t.text2, fontWeight:"600", cursor:"pointer", fontSize:"13px" }}>Annuler</button>
              <button onClick={submitAuditModal} style={{ padding:"12px 24px", borderRadius:"8px", border:"none", background:t.accent, color:"white", fontWeight:"700", cursor:"pointer", boxShadow:`0 4px 12px ${t.accentBd}`, fontSize:"13px" }}>Créer l'audit vierge</button>
            </div>
          </div>
        </div>
      )}

      {modalCritere && (
        <DetailModal critere={modalCritere} onClose={() => setModalCritere(null)} onSave={saveModal} onAutoSave={handleAutoSave} saveData={saveData} isReadOnly={isArchive} isAuditMode={isAuditMode} allMembers={allIfsiMembers} rolePalette={ROLE_PALETTE} orgRoles={orgRoles} hasPrev={false} hasNext={false} />
      )}

      {/* 🧭 SIDEBAR GAUCHE */}
      <aside className="no-print" style={{ width: "250px", background: t.sidebar, borderRight: `1px solid ${t.borderNav}`, display: "flex", flexDirection: "column", flexShrink: 0, zIndex: 50 }}>
        
        <div onClick={() => setActiveTab('dashboard')} style={{ padding:"24px 20px 16px", display:"flex", alignItems:"center", gap:"14px", cursor:"pointer" }}>
          <div style={{ width:"38px", height:"38px", border:`2px solid ${t.gold}`, borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 10px ${t.goldBd}`, background:t.goldBg }}>
            <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:t.gold, fontStyle:"italic", lineHeight:1 }}>Q</span>
          </div>
          <div>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"20px", color:t.textNav, letterSpacing:"0.2px", lineHeight:1 }}>QualiForma</div>
            <div style={{ fontSize:"9px", color:t.textNavSub, letterSpacing:"1px", textTransform:"uppercase", marginTop:"4px" }}>Pilotage Qualiopi</div>
          </div>
        </div>

        <div style={{ padding:"0 20px 20px", fontSize:"12px", color:t.textNavSub, textTransform:"capitalize", fontWeight:"500", borderBottom:`1px solid ${t.borderNav}` }}>
          {dateJourFormat}
        </div>

        <div style={{ padding:"20px" }}>
          <div style={{ fontSize:"10px", fontWeight:"700", color:t.textNavSub, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"10px" }}>Établissement</div>
          {userProfile?.role === "superadmin" ? (
             <select value={selectedIfsi || ""} onChange={handleIfsiSwitch} style={{ width: "100%", padding:"10px 12px", borderRadius:"8px", background:"rgba(255,255,255,0.05)", border:`1px solid rgba(255,255,255,0.1)`, color:t.textNav, fontSize:"13px", fontWeight:"600", outline:"none", cursor:"pointer" }}>
               {ifsiList.map(i => <option key={i.id} value={i.id} style={{ color:"black" }}>{i.name}</option>)}
               <option value="NEW" style={{ color:"black" }}>+ Nouvel établissement</option>
             </select>
          ) : (
            <div style={{ padding:"10px 12px", borderRadius:"8px", background:"rgba(255,255,255,0.05)", border:`1px solid rgba(255,255,255,0.1)`, color:t.textNav, fontSize:"13px", fontWeight:"600" }}>
              {currentIfsiName || "Chargement..."}
            </div>
          )}
        </div>

        {/* Prochain audit avec date bien lisible dans tous les modes */}
        <div style={{ margin:"0 16px 20px", padding:"16px", background:t.goldBg, border:`1px solid ${t.goldBd}`, borderRadius:"12px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
            <div style={{ fontSize:"9px", fontWeight:"800", color:t.gold, textTransform:"uppercase", letterSpacing:"1px" }}>Prochain audit</div>
            <div style={{ background:t.gold, borderRadius:"6px", padding:"2px 8px", fontSize:"11px", fontWeight:"800", color:"#ffffff" }}>
               {days(currentAuditDate) < 0 ? "Dépassé" : `J‑${days(currentAuditDate)}`}
            </div>
          </div>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"18px", color: isDarkMode ? "#ffffff" : "#162040", letterSpacing:"-0.2px", marginBottom:"12px" }}>
            {new Date(currentAuditDate).toLocaleDateString("fr-FR", {day:'numeric', month:'long', year:'numeric'})}
          </div>
          <div style={{ height:"5px", background:"rgba(212,160,48,0.15)", borderRadius:"3px", marginBottom:"6px" }}>
            <div style={{ width:`${pctGlobal}%`, height:"100%", background:`linear-gradient(90deg, ${t.gold}, #f0c060)`, borderRadius:"3px" }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:"11px", color:t.gold, fontWeight:"800" }}>{pctGlobal}% conforme</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 20px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: t.textNavSub, textTransform: "uppercase", letterSpacing: "1px", padding: "0 12px 10px" }}>Navigation</div>
          {menuBtn("dashboard", "Tableau de bord")}
          {menuBtn("criteres", "Indicateurs")}
          {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && menuBtn("organigramme", "Organigramme")}
          
          <div style={{ margin:"16px 12px", height:"1px", background:t.borderNav }}/>
          
          <div style={{ fontSize: "10px", fontWeight: "700", color: t.textNavSub, textTransform: "uppercase", letterSpacing: "1px", padding: "0 12px 10px" }}>Outils</div>
          {menuBtn("livre_blanc", "Livre Blanc")}
          {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && menuBtn("equipe", "Administration")}
          {userProfile?.role === "superadmin" && menuBtn("tour_controle", "Tour de Contrôle")}
        </div>

        <div style={{ borderTop: `1px solid ${t.borderNav}`, background:"rgba(0,0,0,0.15)", padding:"16px" }}>
          <div onClick={() => setActiveTab("compte")} style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden", cursor:"pointer", paddingBottom:"12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius:"10px", background:t.accentBg, border:`1px solid ${t.accentBd}`, display:"flex", alignItems:"center", justifyContent:"center", color:t.accent, fontSize:"14px", fontWeight:"800", flexShrink:0 }}>
              {auth.currentUser?.email?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: t.textNav, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{auth.currentUser?.email?.split('@')[0]}</div>
              <div style={{ fontSize: "11px", color: t.textNavSub, textTransform: "capitalize", marginTop:"2px" }}>Mon profil ⚙️</div>
            </div>
          </div>
        </div>
      </aside>

      {/* 🖥️ MAIN CONTENT */}
      <main style={{ flex: 1, height: "100vh", overflowY: "auto", overflowX: "hidden", background: t.bg, position: "relative", display: "flex", flexDirection: "column" }}>
        
        <div className="no-print" style={{ height:"60px", background:t.surface, borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px", flexShrink:0, boxShadow:t.shadowSm }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"20px", color:t.text, textTransform:"capitalize" }}>{activeTab === 'dashboard' ? 'Tableau de bord' : activeTab.replace('_', ' ')}</span>
            <span style={{ fontSize:"12px", color:t.text3 }}>{currentIfsiName ? `· ${currentIfsiName}` : ""}</span>
          </div>
          <div style={{ display:"flex", gap:"12px" }}>
            <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ background:t.surface2, border:`1px solid ${t.border}`, padding:"8px 14px", borderRadius:"8px", fontSize:"12px", fontWeight:"600", color:t.text, cursor:"pointer", transition:"all 0.15s" }}>
              {isDarkMode ? "☀️ Mode Clair" : "🌙 Mode Sombre"}
            </button>
          </div>
        </div>

        <div className="animate-fade-in" style={{ flex: 1, padding: "32px", boxSizing: "border-box", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
          {activeTab === "dashboard" && campaigns && <DashboardTab campaigns={campaigns} activeCampaignId={activeCampaignId} setActiveCampaignId={setActiveCampaignId} currentAuditDate={currentAuditDate} stats={stats} urgents={urgents} criteres={criteres} axes={axes} setModalCritere={setModalCritere} userProfile={userProfile} handleEditAuditDate={handleEditAuditDate} handleCreateCampaign={() => setAuditModal({show:true, name:"", date:""})} handleAutoSave={handleAutoSave} handleArchiveCampaign={handleArchiveCampaign} handleDeleteCampaign={handleDeleteCampaign} t={t} />}
          {activeTab === "tour_controle" && <TourControleTab globalScore={tourData.score} activeIfsis={tourData.active} topAlerts={tourData.alerts} sortedTourIfsis={sortedTourIfsis} setSelectedIfsi={setSelectedIfsi} archivedIfsis={tourData.archived} handleArchiveIfsi={handleArchiveIfsi} handleHardDeleteIfsi={handleHardDeleteIfsi} handleRenameIfsi={handleRenameIfsi} setActiveTab={setActiveTab} tourSort={tourSort} setTourSort={setTourSort} t={t} />}
          
          {activeTab === "organigramme" && <OrganigrammeTab currentIfsiName={currentIfsiName} orgRoles={orgRoles} orgJobTitles={orgJobTitles} orgTags={orgTags} allIfsiMembers={allIfsiMembers} criteres={criteres} userProfile={userProfile} getRoleColor={getRoleColor} rolePalette={ROLE_PALETTE} handleManageStructure={handleManageStructure} handleAddManualUser={handleAddManualUser} handleUpdateUserDetail={handleUpdateUserDetail} handleHardDeleteMember={handleHardDeleteMember} orgConnections={orgConnections} handleUpdateConnections={handleUpdateConnections} setModalCritere={setModalCritere} days={days} t={t} />}
          
          {activeTab === "criteres" && <CriteresTab searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterStatut={filterStatut} setFilterStatut={setFilterStatut} filterCritere={filterCritere} setFilterCritere={setFilterCritere} filtered={filtered} days={days} setModalCritere={setModalCritere} handleAutoSave={handleAutoSave} t={t} />}
          {activeTab === "livre_blanc" && <LivreBlancTab currentIfsiName={currentIfsiName} criteres={criteres} t={t} />}
          
          {/* NOUVEAU : Le nouvel onglet Equipe */}
          {activeTab === "equipe" && <EquipeTab userProfile={userProfile} newMember={newMember} setNewMember={setNewMember} isCreatingUser={isCreatingUser} handleCreateUser={handleCreateUser} selectedIfsi={selectedIfsi} ifsiList={ifsiList} teamSearchTerm={teamSearchTerm} setTeamSearchTerm={setTeamSearchTerm} sortedTeamUsers={sortedTeamUsers} teamSortConfig={teamSortConfig} handleSortTeam={handleSortTeam} handleDeleteUser={handleDeleteUser} handleSendResetEmail={handleSendResetEmail} ifsiData={ifsiData} handleSaveEtab={handleSaveEtab} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} isColorblindMode={isColorblindMode} setIsColorblindMode={setIsColorblindMode} t={t} />}
          
          {activeTab === "compte" && <CompteTab auth={auth} userProfile={userProfile} pwdUpdate={pwdUpdate} setPwdUpdate={setPwdUpdate} handleChangePassword={()=>{}} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} isColorblindMode={isColorblindMode} setIsColorblindMode={setIsColorblindMode} t={t} />}
        </div>
      </main>
    </div>
  );
}

export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }
