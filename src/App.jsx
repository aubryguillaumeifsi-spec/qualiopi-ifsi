import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";

import DashboardTab from "./components/DashboardTab";
import TourControleTab from "./components/TourControleTab";
import OrganigrammeTab from "./components/OrganigrammeTab";
import { CriteresTab, AxesTab, ResponsablesTab, LivreBlancTab } from "./components/TabsQualiopi";
import { EquipeTab, CompteTab } from "./components/TabsAdmin";

import { getDoc, setDoc, deleteDoc, doc, collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, updatePassword, sendPasswordResetEmail, sendEmailVerification } from "firebase/auth";
import { db, auth, secondaryAuth } from "./firebase";
import { DEFAULT_CRITERES, CRITERES_LABELS, STATUT_CONFIG } from "./data";

// ----------------------------------------------------------------------
// 🎨 TOKENS HAUTE FIDÉLITÉ "MIDNIGHT"
// ----------------------------------------------------------------------
const GFONT = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Albert+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap";

function buildTokens(dark) {
  return dark ? {
    bg:"#0c1118", nav:"#0d1422", sidebar:"#101520", surface:"#151c2a", surface2:"#1a2235", surface3:"#1e2840",
    border:"#1f2d42", border2:"#192438", borderNav:"rgba(255,255,255,0.07)",
    text:"#d6e3f5", text2:"#5a7299", text3:"#2e4060",
    textNav:"rgba(255,255,255,0.85)", textNavSub:"rgba(255,255,255,0.35)",
    accent:"#4f82f5", accentBg:"rgba(79,130,245,0.12)", accentBd:"rgba(79,130,245,0.28)",
    gold:"#d4a030", goldBg:"rgba(212,160,48,0.12)", goldBd:"rgba(212,160,48,0.3)",
    green:"#2cc880", greenBg:"rgba(44,200,128,0.1)", greenBd:"rgba(44,200,128,0.25)",
    red:"#f07070", redBg:"rgba(240,112,112,0.1)", redBd:"rgba(240,112,112,0.25)",
    amber:"#f0a030", amberBg:"rgba(240,160,48,0.1)", amberBd:"rgba(240,160,48,0.25)",
    shadow:"0 2px 8px rgba(0,0,0,0.5)", shadowSm:"0 1px 3px rgba(0,0,0,0.4)"
  } : {
    bg:"#e8edf5", nav:"#1e2d4a", sidebar:"#f2f5fa", surface:"#ffffff",
    surface2:"#eaeff8", surface3:"#dfe6f3", border:"#cad4e8", border2:"#d8e0ee", borderNav:"rgba(255,255,255,0.08)",
    text:"#0a1628", text2:"#4a5f80", text3:"#90a5c0",
    textNav:"rgba(255,255,255,0.9)", textNavSub:"rgba(255,255,255,0.35)",
    accent:"#1a52d4", accentBg:"#e6effe", accentBd:"#a8c0fc",
    gold:"#b07010", goldBg:"#fef4de", goldBd:"#f0cc70",
    green:"#0e7a50", greenBg:"#e8f8f0", greenBd:"#90ddb8",
    red:"#c42828", redBg:"#fdeaea", redBd:"#f4a0a0",
    amber:"#b06010", amberBg:"#fef2e0", amberBd:"#f0c870",
    shadow:"0 1px 3px rgba(10,22,40,0.08)", shadowSm:"0 1px 2px rgba(10,22,40,0.06)"
  };
}

const DEFAULT_ROLES = ["Direction", "Qualité", "Secrétariat", "Pôle Stages", "Formateurs IFSI", "Formateurs IFAS"];
const ROLE_PALETTE = [ { bg: "#e0e7ff", border: "#bfdbfe", text: "#1e40af" }, { bg: "#dcfce7", border: "#86efac", text: "#166534" }, { bg: "#fef3c7", border: "#fde68a", text: "#92400e" }, { bg: "#f3e8ff", border: "#d8b4fe", text: "#6b21a8" }, { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" }, { bg: "#ccfbf1", border: "#67e8f9", text: "#155e75" }, { bg: "#fce7f3", border: "#f9a8d4", text: "#9d174d" }, { bg: "#f1f5f9", border: "#cbd5e1", text: "#334155" } ];

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
        <pre style={{ background: "rgba(240,80,80,0.12)", padding: "20px", borderRadius: "8px", overflowX: "auto" }}>{this.state.error?.toString()}</pre>
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
  const [newRoleInput, setNewRoleInput] = useState("");
  const [newManualUser, setNewManualUser] = useState({ prenom: "", nom: "" });
  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [teamSortConfig, setTeamSortConfig] = useState({ key: "email", direction: "asc" });
  const [tourSort, setTourSort] = useState("urgence");
  const [importReport, setImportReport] = useState(null);
  const [backupsList, setBackupsList] = useState([]);
  const dailyBackupDone = useRef(null); 
  const [verificationSent, setVerificationSent] = useState(false);

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

  const saveData = async (newCampaigns) => {
    const docId = selectedIfsi === "demo_ifps_cham" ? "criteres" : selectedIfsi;
    await setDoc(doc(db, "qualiopi", docId), { campaigns: newCampaigns, updatedAt: new Date().toISOString() }, { merge: true });
  };

  const handleLogout = () => signOut(auth);

  // Mémos et calculs
  const currentCampaign = useMemo(() => campaigns?.find(c => c.id === activeCampaignId) || campaigns?.[0], [campaigns, activeCampaignId]);
  const criteres = useMemo(() => currentCampaign?.liste || [], [currentCampaign]);
  const isArchive = currentCampaign?.locked || false;
  const currentAuditDate = currentCampaign?.auditDate || "2026-10-15";
  const orgRoles = useMemo(() => ifsiData?.roles || [], [ifsiData]);
  const manualUsers = useMemo(() => ifsiData?.manualUsers || [], [ifsiData]);

  const orgAccounts = useMemo(() => teamUsers.filter(u => u.etablissementId === selectedIfsi && u.role !== "superadmin"), [teamUsers, selectedIfsi]);

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
    const total = criteres.filter(c => c.statut !== "non-concerne").length || 1;
    return {
      stats: { total, conforme: criteres.filter(c => c.statut === "conforme").length, enCours: criteres.filter(c => c.statut === "en-cours").length, nonConforme: criteres.filter(c => c.statut === "non-conforme").length, nonEvalue: criteres.filter(c => c.statut === "non-evalue").length, nonConcerne: criteres.filter(c => c.statut === "non-concerne").length },
      urgents: criteres.filter(c => days(c.delai) <= 30 && c.statut !== "conforme" && c.statut !== "non-concerne"),
      filtered: filt,
      axes: criteres.filter(c => ["non-conforme", "en-cours"].includes(c.statut)).sort((a, b) => ({"non-conforme":0,"en-cours":1}[a.statut] - {"non-conforme":0,"en-cours":1}[b.statut]))
    };
  }, [criteres, filterStatut, filterCritere, searchTerm]);

  const sortedTeamUsers = useMemo(() => teamUsers.filter(u => u.role !== "superadmin" || userProfile?.role === "superadmin"), [teamUsers, userProfile]);

  const handleSortTeam = (key) => { let direction = "asc"; if (teamSortConfig.key === key && teamSortConfig.direction === "asc") direction = "desc"; setTeamSortConfig({ key, direction }); };
  
  // Correction du bug Nouvel IFSI
  const handleIfsiSwitch = async (e) => { 
    const val = e.target.value;
    if (val === "NEW") { 
      const nom = prompt("Nom de l'établissement :"); 
      if (nom?.trim()) { 
        const id = nom.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(Math.random() * 1000); 
        await setDoc(doc(db, "etablissements", id), { name: nom.trim(), roles: DEFAULT_ROLES, archived: false }); 
        setSelectedIfsi(id); 
      } else {
        // Force React to reset the select visually if cancelled
        setSelectedIfsi(null);
        setTimeout(() => setSelectedIfsi(selectedIfsi), 0);
      }
    } else { 
      setSelectedIfsi(val); 
    } 
  };

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

  const handleAutoSave = (updated) => {
    if (isArchive) return;
    const newListe = criteres.map(c => c.id === updated.id ? updated : c);
    const newCampaigns = campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp);
    saveData(newCampaigns);
  };

  const saveModal = (updated, action) => {
    handleAutoSave(updated);
    if (action === "close" || action === undefined) setModalCritere(null);
  };

  // ----------------------------------------------------------------------
  // 🖥️ AFFICHAGE PRINCIPAL
  // ----------------------------------------------------------------------
  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;
  if (activeTab === "validation_requise") return <div style={{ minHeight: "100vh", background: t.bg, color: t.text, display: "flex", justifyContent: "center", alignItems: "center" }}>Vérification Email Requise</div>;
  if (userProfile?.mustChangePassword) return <div style={{ minHeight: "100vh", background: t.bg, color: t.text, display: "flex", justifyContent: "center", alignItems: "center" }}>Veuillez changer votre mot de passe.</div>;

  const currentIfsiName = ifsiList.find(i => i.id === selectedIfsi)?.name || "Chargement...";
  const pctGlobal = stats?.total > 0 ? Math.round(((stats?.conforme || 0) / stats.total) * 100) : 0;
  
  const menuBtn = (id, icon, label) => {
    const act = activeTab === id;
    return (
      <button 
        onClick={() => { setActiveTab(id); setSearchTerm(""); setFilterStatut("tous"); setFilterCritere("tous"); }} 
        className="sidebar-btn"
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: act ? (isDarkMode?"rgba(255,255,255,0.05)":"rgba(26,82,212,0.07)") : "transparent", color: act ? t.textNav : t.textNavSub, border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: act ? "700" : "500", cursor: "pointer", transition: "all 0.2s", textAlign: "left", marginBottom: "4px", borderLeft: `2px solid ${act ? t.accent : "transparent"}` }}
      >
        <span style={{ fontSize: "14px", opacity: act ? 1 : 0.5 }}>{icon}</span>
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'Albert Sans', sans-serif" }}>
      <link href={GFONT} rel="stylesheet" />
      <style>{`
        @media print { .no-print { display: none !important; } body { background: white !important; } }
        .sidebar-btn:hover { background: ${isDarkMode?"rgba(255,255,255,0.05)":"rgba(26,82,212,0.07)"} !important; color: ${t.textNav} !important; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        main::-webkit-scrollbar { width: 8px; }
        main::-webkit-scrollbar-track { background: transparent; }
        main::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 4px; }
      `}</style>

      {modalCritere && (
        <DetailModal 
          critere={modalCritere} onClose={() => setModalCritere(null)} onSave={saveModal} onAutoSave={handleAutoSave} 
          isReadOnly={isArchive} isAuditMode={isAuditMode} allMembers={allIfsiMembers} rolePalette={ROLE_PALETTE} orgRoles={orgRoles} 
          hasPrev={false} hasNext={false} 
        />
      )}

      {/* 🧭 SIDEBAR GAUCHE (Design "Midnight") */}
      <aside className="no-print" style={{ width: "240px", background: t.sidebar, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", flexShrink: 0, zIndex: 50, boxShadow: isDarkMode?"3px 0 12px rgba(0,0,0,0.35)":"3px 0 12px rgba(14,25,41,0.06)" }}>
        
        {/* Logo */}
        <div style={{ padding:"20px", display:"flex", alignItems:"center", gap:"12px", borderBottom:`1px solid ${t.border}` }}>
          <div style={{ width:"32px", height:"32px", border:`2px solid ${t.gold}`, borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 10px ${t.goldBd}` }}>
            <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"18px", color:t.gold, fontStyle:"italic" }}>Q</span>
          </div>
          <div>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"18px", color:t.text, letterSpacing:"0.2px" }}>QualiForma</div>
            <div style={{ fontSize:"10px", color:t.text3, letterSpacing:"1.5px", textTransform:"uppercase", marginTop:"2px" }}>Pilotage Qualiopi</div>
          </div>
        </div>

        {/* Date du jour */}
        <div style={{ padding:"16px 20px 0", fontSize:"11px", color:t.text3, textTransform:"capitalize" }}>
          {dateJourFormat}
        </div>

        {/* Sélecteur IFSI */}
        <div style={{ padding:"12px 20px 20px", borderBottom:`1px solid ${t.border2}` }}>
          <div style={{ fontSize:"9px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"8px" }}>Établissement</div>
          {userProfile?.role === "superadmin" ? (
             <select value={selectedIfsi || ""} onChange={handleIfsiSwitch} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: t.surface2, border: `1px solid ${t.border}`, color: t.text, fontSize: "12px", fontWeight: "600", outline: "none", cursor: "pointer", fontFamily:"inherit" }}>
               {ifsiList.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
               <option value="NEW">+ Nouvel établissement</option>
             </select>
          ) : (
            <div style={{ padding: "10px", borderRadius: "8px", background: t.surface2, border: `1px solid ${t.border}`, color: t.text, fontSize: "12px", fontWeight: "600" }}>
              {currentIfsiName}
            </div>
          )}
        </div>

        {/* Menu Principal */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 10px" }}>
          <div style={{ fontSize: "9px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", padding: "0 10px 10px" }}>Navigation</div>
          {menuBtn("dashboard", "⊞", "Tableau de bord")}
          {menuBtn("criteres", "☰", "Indicateurs")}
          {menuBtn("axes", "🔥", "Priorités")}
          {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && menuBtn("organigramme", "⊕", "Organigramme")}
          <div style={{ margin:"16px 0", height:"1px", background:t.border }}/>
          {menuBtn("livre_blanc", "📖", "Livre Blanc")}
          {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && menuBtn("equipe", "⊛", "Administration")}
          {userProfile?.role === "superadmin" && menuBtn("tour_controle", "◉", "Tour de Contrôle")}
        </div>

        {/* ✦ Prochain audit — Badge Gold ✦ */}
        <div style={{ margin:"0 16px 16px", padding:"16px", background:t.goldBg, border:`1px solid ${t.goldBd}`, borderRadius:"10px", boxShadow:t.shadowGold }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
            <div style={{ fontSize:"9px", fontWeight:"700", color:t.gold, textTransform:"uppercase", letterSpacing:"1px" }}>Prochain audit</div>
            <div style={{ background:t.gold, borderRadius:"5px", padding:"2px 8px", fontSize:"10px", fontWeight:"800", color:isDarkMode?"#0c1118":"white" }}>
               {days(currentAuditDate) < 0 ? "Dépassé" : `J‑${days(currentAuditDate)}`}
            </div>
          </div>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"17px", color:t.text, letterSpacing:"-0.2px", marginBottom:"12px" }}>
            {new Date(currentAuditDate).toLocaleDateString("fr-FR", {day:'numeric', month:'long', year:'numeric'})}
          </div>
          <div style={{ height:"5px", background:isDarkMode?"rgba(212,160,48,0.15)":"rgba(176,112,16,0.15)", borderRadius:"3px", marginBottom:"6px" }}>
            <div style={{ width:`${pctGlobal}%`, height:"100%", background:`linear-gradient(90deg, ${t.gold}, ${isDarkMode?"#f0c060":"#d4a030"})`, borderRadius:"3px" }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:"10px", color:t.gold, fontWeight:"700" }}>{pctGlobal}% conforme</span>
          </div>
        </div>

        {/* Profil & Logout */}
        <div style={{ borderTop: `1px solid ${t.border}`, background:isDarkMode?"rgba(0,0,0,0.15)":t.surface2, padding:"12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: t.accentBg, border: `1px solid ${t.accentBd}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.accent, fontSize: "12px", fontWeight: "800", flexShrink: 0 }}>
                {auth.currentUser?.email?.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: t.text, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{auth.currentUser?.email?.split('@')[0]}</div>
                <div style={{ fontSize: "10px", color: t.text3, textTransform: "capitalize" }}>{userProfile?.role}</div>
              </div>
            </div>
            <button onClick={handleLogout} style={{ background: "transparent", border: "none", color: t.text3, cursor: "pointer", fontSize: "16px", transition: "color 0.2s" }} title="Se déconnecter" onMouseOver={e=>e.currentTarget.style.color=t.red} onMouseOut={e=>e.currentTarget.style.color=t.text3}>
              ⏏
            </button>
          </div>
        </div>
      </aside>

      {/* 🖥️ MAIN CONTENT */}
      <main style={{ flex: 1, height: "100vh", overflowY: "auto", overflowX: "hidden", background: t.bg, position: "relative", display: "flex", flexDirection: "column" }}>
        
        {/* Sub-header global (Actions rapides) */}
        <div className="no-print" style={{ height:"50px", background:t.surface, borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px", flexShrink:0, boxShadow:t.shadowSm }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"17px", color:t.text, textTransform:"capitalize" }}>{activeTab.replace('_', ' ')}</span>
            <span style={{ fontSize:"11px", color:t.text3 }}>· {currentIfsiName}</span>
          </div>
          <div style={{ display:"flex", gap:"10px" }}>
            <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ background:t.surface2, border:`1px solid ${t.border}`, padding:"5px 12px", borderRadius:"6px", fontSize:"11px", fontWeight:"600", color:t.text, cursor:"pointer", transition:"all 0.15s" }}>
              {isDarkMode ? "☀️ Clair" : "🌙 Sombre"}
            </button>
          </div>
        </div>

        <div className="animate-fade-in" style={{ flex: 1, padding: "24px 32px", boxSizing: "border-box", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
          {activeTab === "dashboard" && campaigns && <DashboardTab currentAuditDate={currentAuditDate} stats={stats} urgents={urgents} criteres={criteres} userProfile={userProfile} t={t} />}
          {activeTab === "tour_controle" && <TourControleTab globalScore={tourData.score} activeIfsis={tourData.active} totalUsersInNetwork={teamUsers.length} topAlerts={tourData.alerts} sortedTourIfsis={sortedTourIfsis} setSelectedIfsi={setSelectedIfsi} archivedIfsis={tourData.archived} handleArchiveIfsi={handleArchiveIfsi} handleHardDeleteIfsi={handleHardDeleteIfsi} setActiveTab={setActiveTab} tourSort={tourSort} setTourSort={setTourSort} t={t} />}
          {activeTab === "organigramme" && <OrganigrammeTab currentIfsiName={currentIfsiName} t={t} />}
          {activeTab === "criteres" && <CriteresTab searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterStatut={filterStatut} setFilterStatut={setFilterStatut} filterCritere={filterCritere} setFilterCritere={setFilterCritere} filtered={filtered} days={days} dayColor={dayColor} setModalCritere={setModalCritere} t={t} />}
          {activeTab === "axes" && <AxesTab axes={axes} days={days} dayColor={dayColor} setModalCritere={setModalCritere} t={t} />}
          {activeTab === "livre_blanc" && <LivreBlancTab currentIfsiName={currentIfsiName} criteres={criteres} t={t} />}
          {activeTab === "equipe" && <EquipeTab userProfile={userProfile} newMember={newMember} setNewMember={setNewMember} isCreatingUser={isCreatingUser} handleCreateUser={handleCreateUser} selectedIfsi={selectedIfsi} ifsiList={ifsiList} teamSearchTerm={teamSearchTerm} setTeamSearchTerm={setTeamSearchTerm} sortedTeamUsers={sortedTeamUsers} handleDeleteUser={handleDeleteUser} t={t} />}
        </div>
        
      </main>
    </div>
  );
}

export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }
