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
// 🎨 SYSTÈME DE TOKENS "MIDNIGHT" (Design System)
// ----------------------------------------------------------------------
const GFONT = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Albert+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap";

function buildTokens(dark) {
  return dark ? {
    bg:"#0f172a", nav:"#080e1a", surface:"#172035",
    surface2:"#1c2840", surface3:"#223050", border:"#1e2d42", border2:"#182438",
    text:"#c8d8f0", text2:"#4a6285", text3:"#283850",
    textNav:"rgba(255,255,255,0.9)", textNavSub:"rgba(255,255,255,0.4)",
    accent:"#4f80f0", accentBg:"rgba(79,128,240,0.12)", accentBd:"rgba(79,128,240,0.28)",
    gold:"#d4a030", goldBg:"rgba(212,160,48,0.12)", goldBd:"rgba(212,160,48,0.3)",
    green:"#2cc880", greenBg:"rgba(44,200,128,0.12)", greenBd:"rgba(44,200,128,0.25)",
    red:"#f05050", redBg:"rgba(240,80,80,0.12)", redBd:"rgba(240,80,80,0.25)",
    amber:"#f09830", amberBg:"rgba(240,152,48,0.12)", amberBd:"rgba(240,152,48,0.25)",
    shadow:"0 4px 20px rgba(0,0,0,0.3)", shadowSm:"0 2px 10px rgba(0,0,0,0.2)"
  } : {
    bg:"#f8fafc", nav:"#080e1a", surface:"#ffffff",
    surface2:"#f1f5f9", surface3:"#e2e8f0", border:"#e2e8f0", border2:"#cbd5e1",
    text:"#0f172a", text2:"#475569", text3:"#94a3b8",
    textNav:"rgba(255,255,255,0.9)", textNavSub:"rgba(255,255,255,0.4)",
    accent:"#2563eb", accentBg:"#eff6ff", accentBd:"#bfdbfe",
    gold:"#d97706", goldBg:"#fef3c7", goldBd:"#fde68a",
    green:"#059669", greenBg:"#d1fae5", greenBd:"#6ee7b7",
    red:"#dc2626", redBg:"#fee2e2", redBd:"#fca5a5",
    amber:"#d97706", amberBg:"#fef3c7", amberBd:"#fde68a",
    shadow:"0 4px 6px -1px rgba(0,0,0,0.1)", shadowSm:"0 1px 2px 0 rgba(0,0,0,0.05)"
  };
}

const DEFAULT_ROLES = ["Direction", "Qualité", "Secrétariat", "Pôle Stages", "Formateurs IFSI", "Formateurs IFAS"];
const ROLE_PALETTE = [ { bg: "#e0e7ff", border: "#bfdbfe", text: "#1e40af" }, { bg: "#dcfce7", border: "#86efac", text: "#166534" }, { bg: "#fef3c7", border: "#fde68a", text: "#92400e" }, { bg: "#f3e8ff", border: "#d8b4fe", text: "#6b21a8" }, { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" }, { bg: "#ccfbf1", border: "#67e8f9", text: "#155e75" }, { bg: "#fce7f3", border: "#f9a8d4", text: "#9d174d" }, { bg: "#f1f5f9", border: "#cbd5e1", text: "#334155" } ];

const today = new Date();
const days = d => { if (!d) return NaN; const p = new Date(d); return isNaN(p.getTime()) ? NaN : Math.round((p - today) / 86400000); };

// ----------------------------------------------------------------------
// 🛡️ GESTION DES ERREURS
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// 🧱 COMPOSANTS GLOBAUX
// ----------------------------------------------------------------------
function Footer({ isDarkMode, t }) {
  return (
    <footer className="no-print" style={{ background: t.surface, borderTop: `1px solid ${t.border}`, padding: "20px 32px", marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", fontSize: "13px", color: t.text2 }}>
      <div>
        <strong style={{ color: t.text, fontSize: "14px", fontFamily: "'Instrument Serif', serif", letterSpacing: "1px" }}>QualiForma</strong> 
        <span style={{ background: t.accentBg, color: t.accent, border: `1px solid ${t.accentBd}`, padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "900", marginLeft: "8px" }}>V2.0 Midnight</span>
      </div>
      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center", fontWeight: "600" }}>
        <a href="#" onClick={e => {e.preventDefault(); alert("📄 Mentions Légales (Bientôt disponible)");}} style={{ color: "inherit", textDecoration: "none" }}>Mentions Légales</a>
        <a href="mailto:support@qualiforma.fr" style={{ color: "inherit", textDecoration: "none" }}>✉️ Contact Support</a>
      </div>
    </footer>
  );
}

function BackupsTab({ backupsList, handleRestoreBackup, t }) {
  return (
      <div className="animate-fade-in" style={{ maxWidth: "800px", margin: "0 auto", marginTop: "20px" }}>
          <div style={{ marginBottom: "32px", textAlign: "center", padding: "30px", borderRadius: "16px", background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}>
              <div style={{ fontSize: "50px", marginBottom: "10px" }}>⏳</div>
              <h2 style={{ fontSize: "24px", fontWeight: "900", margin: "0 0 8px", color: t.text, fontFamily: "'Instrument Serif', serif" }}>Machine à remonter le temps</h2>
              <p style={{ fontSize: "14px", margin: 0, lineHeight: "1.5", color: t.text2 }}>L'application sauvegarde automatiquement l'état de l'IFSI une fois par jour et avant chaque importation Excel.</p>
          </div>
          {backupsList.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", borderRadius: "14px", border: `1px dashed ${t.border2}`, fontStyle: "italic", color: t.text3 }}>Le coffre-fort est vide.</div>
          ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {backupsList.map((b) => (
                      <div key={b.id} style={{ borderRadius: "12px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: t.surface, border: `1px solid ${t.border}` }}>
                          <div>
                                  <div style={{ fontSize: "15px", fontWeight: "800", color: t.text }}>{b.type}</div>
                                  <div style={{ fontSize: "13px", marginTop: "4px", color: t.text2 }}>{new Date(b.timestamp).toLocaleString("fr-FR")}</div>
                          </div>
                          <button onClick={() => handleRestoreBackup(b)} style={{ background: t.redBg, border: `1px solid ${t.redBd}`, color: t.red, padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Restaurer</button>
                      </div>
                  ))}
              </div>
          )}
      </div>
  );
}

// ----------------------------------------------------------------------
// 🚀 APPLICATION PRINCIPALE
// ----------------------------------------------------------------------
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

  const createManualBackup = async (label, dataToBackup) => {
    const docId = selectedIfsi === "demo_ifps_cham" ? "criteres" : selectedIfsi;
    const backupId = `${docId}_manual_${Date.now()}`;
    await setDoc(doc(db, "backups", backupId), { ifsiId: docId, timestamp: Date.now(), date: new Date().toISOString(), type: label, campaigns: dataToBackup });
  };

  useEffect(() => {
    if (!campaigns || !selectedIfsi || campaigns.length === 0) return;
    if (dailyBackupDone.current === selectedIfsi) return; 
    dailyBackupDone.current = selectedIfsi;
    const docId = selectedIfsi === "demo_ifps_cham" ? "criteres" : selectedIfsi;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBackupId = `${docId}_daily_${todayStr}`;
    getDoc(doc(db, "backups", todayBackupId)).then(snap => {
        if (!snap.exists()) { setDoc(doc(db, "backups", todayBackupId), { ifsiId: docId, timestamp: Date.now(), date: new Date().toISOString(), type: "Sauvegarde Quotidienne", campaigns: campaigns }).catch(e => console.log(e)); }
    });
  }, [selectedIfsi, campaigns]);

  useEffect(() => {
    if (activeTab === "backups" && selectedIfsi) {
        const docId = selectedIfsi === "demo_ifps_cham" ? "criteres" : selectedIfsi;
        const unsub = onSnapshot(collection(db, "backups"), (snap) => {
            const list = []; const now = Date.now(); const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000; 
            snap.forEach(docSnap => {
                const d = docSnap.data();
                if (d.ifsiId === docId) { if (d.timestamp < tenDaysAgo) { deleteDoc(docSnap.ref); } else { list.push({ id: docSnap.id, ...d }); } }
            });
            setBackupsList(list.sort((a,b) => b.timestamp - a.timestamp)); 
        });
        return () => unsub();
    }
  }, [activeTab, selectedIfsi]);

  const handleRestoreBackup = async (backup) => {
    if (window.confirm(`⚠️ Restaurer toute la base de données à l'état du ${new Date(backup.timestamp).toLocaleString()} ?\nToutes les données récentes seront écrasées.`)) {
        await createManualBackup("Avant Restauration", campaigns); 
        const docId = selectedIfsi === "demo_ifps_cham" ? "criteres" : selectedIfsi;
        await setDoc(doc(db, "qualiopi", docId), { campaigns: backup.campaigns, updatedAt: new Date().toISOString() }, { merge: true });
        alert("✅ Restauration réussie !");
        setActiveTab("dashboard");
    }
  };

  const handleSendResetEmail = async (userEmail) => {
    if (window.confirm(`Envoyer un email de réinitialisation à ${userEmail} ?`)) {
      try { await sendPasswordResetEmail(auth, userEmail); alert(`✅ Email envoyé.`); } catch (error) { alert(error.message); }
    }
  };

  const handleResendVerification = async () => {
    try { await sendEmailVerification(auth.currentUser); setVerificationSent(true); } catch (e) { alert(e.message); }
  };
  
  const handleLogout = () => signOut(auth);

  const handleEditAuditDate = () => {
    if (isArchive) return;
    const currentFr = new Date(currentAuditDate).toLocaleDateString("fr-FR");
    const newDateFr = prompt("Modifier la date de l'audit (Format demandé : JJ/MM/AAAA) :", currentFr);
    
    if (newDateFr) {
      const parts = newDateFr.split('/');
      if (parts.length === 3) {
        const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        if (!isNaN(new Date(isoDate).getTime())) {
          saveData(campaigns.map(c => c.id === activeCampaignId ? { ...c, auditDate: isoDate } : c));
        } else { alert("Format de date invalide."); }
      } else { alert("Merci de respecter le format avec les tirets obliques : JJ/MM/AAAA"); }
    }
  };

  // ----------------------------------------------------------------------
  // 🧠 LE CERVEAU DE L'APPLICATION (Mémos & Calculs)
  // ----------------------------------------------------------------------
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

  const byPerson = useMemo(() => allIfsiMembers.map(m => ({ ...m, items: criteres.filter(c => c.responsables?.includes(m.name)) })).filter(p => p.items.length > 0 || p.roles.length > 0), [allIfsiMembers, criteres]);

  const sortedTeamUsers = useMemo(() => {
    const filteredUsers = teamUsers.filter(u => {
      if (u.role === "superadmin") return false; 
      if (userProfile?.role === "superadmin" && u.role !== "superadmin" && u.etablissementId !== selectedIfsi) return false;
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
  }, [teamUsers, teamSearchTerm, teamSortConfig, ifsiList, selectedIfsi, userProfile]);

  const handleSortTeam = (key) => { let direction = "asc"; if (teamSortConfig.key === key && teamSortConfig.direction === "asc") direction = "desc"; setTeamSortConfig({ key, direction }); };
  
  const handleIfsiSwitch = async (e) => { 
    if (e.target.value === "NEW") { 
      const nom = prompt("Nom de l'établissement :"); 
      if (nom?.trim()) { 
        const id = nom.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(Math.random() * 1000); 
        await setDoc(doc(db, "etablissements", id), { name: nom.trim(), roles: DEFAULT_ROLES, archived: false }); 
        setSelectedIfsi(id); 
      } 
    } else { setSelectedIfsi(e.target.value); } 
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

  const handleRenameIfsi = async (id, currentName) => { const n = prompt("Nouveau nom :", currentName); if (n?.trim() && n !== currentName) await setDoc(doc(db, "etablissements", id), { name: n.trim() }, { merge: true }); };
  const handleArchiveIfsi = async (id, name, status) => { if (window.confirm(`Voulez-vous ${status ? 'archiver' : 'restaurer'} ${name} ?`)) await setDoc(doc(db, "etablissements", id), { archived: status }, { merge: true }); };
  const handleHardDeleteIfsi = async (id, name) => { if (prompt(`Tapez SUPPRIMER pour détruire ${name}`) === "SUPPRIMER") { await deleteDoc(doc(db, "etablissements", id)); await deleteDoc(doc(db, "qualiopi", id === "demo_ifps_cham" ? "criteres" : id)); if (selectedIfsi === id) setSelectedIfsi("demo_ifps_cham"); } };

  const getRoleColor = useCallback((roleName) => { 
    if (roleName === "Direction") return { bg: t.surface3, border: t.border, text: t.text }; 
    const idx = orgRoles.indexOf(roleName); 
    return ROLE_PALETTE[idx % ROLE_PALETTE.length] || ROLE_PALETTE[7]; 
  }, [orgRoles, t]);
  
  const handleDragStartOrg = (e, type, id) => { e.dataTransfer.setData("type", type); e.dataTransfer.setData("id", id); };
  const handleDragOverOrg = (e) => { e.preventDefault(); };
  const handleDropOrg = (e, targetRole) => { 
    e.preventDefault(); const type = e.dataTransfer.getData("type"); const id = e.dataTransfer.getData("id"); 
    if (type === "account") { 
      const user = orgAccounts.find(u => u.id === id); const currentRoles = Array.isArray(user?.orgRoles) ? user.orgRoles : (user?.orgRole ? [user.orgRole] : []); 
      if (!currentRoles.includes(targetRole)) setDoc(doc(db, "users", id), { orgRoles: [...currentRoles, targetRole], orgRole: "" }, { merge: true }); 
    } else if (type === "manual") { 
      const updatedManuals = manualUsers.map(u => { 
        if (u.id === id) { const currentRoles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []); if (!currentRoles.includes(targetRole)) return { ...u, roles: [...currentRoles, targetRole], role: "" }; } return u; 
      }); 
      setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: updatedManuals }, { merge: true }); 
    } 
  };
  const removeRoleFromUser = (type, id, roleToRemove) => { 
    if (type === "account") { 
      const user = orgAccounts.find(u => u.id === id); const currentRoles = Array.isArray(user?.orgRoles) ? user.orgRoles : []; 
      setDoc(doc(db, "users", id), { orgRoles: currentRoles.filter(r => r !== roleToRemove) }, { merge: true }); 
    } else if (type === "manual") { 
      const updatedManuals = manualUsers.map(u => { 
        if (u.id === id) { const currentRoles = Array.isArray(u.roles) ? u.roles : []; return { ...u, roles: currentRoles.filter(r => r !== roleToRemove) }; } return u; 
      }); 
      setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: updatedManuals }, { merge: true }); 
    } 
  };
  const editOrgRole = async (oldRole) => { const newRole = prompt("Renommer la colonne :", oldRole); if (newRole && newRole.trim() !== "" && newRole !== oldRole) { const finalRole = newRole.trim(); if (orgRoles.includes(finalRole)) return alert("Ce rôle existe déjà."); const updatedRoles = orgRoles.map(r => r === oldRole ? finalRole : r); const updatedManuals = manualUsers.map(u => ({ ...u, roles: (Array.isArray(u.roles) ? u.roles : []).map(r => r === oldRole ? finalRole : r) })); for (const acc of orgAccounts) { const cRoles = Array.isArray(acc.orgRoles) ? acc.orgRoles : []; if (cRoles.includes(oldRole)) await setDoc(doc(db, "users", acc.id), { orgRoles: cRoles.map(r => r === oldRole ? finalRole : r) }, { merge: true }); } await setDoc(doc(db, "etablissements", selectedIfsi), { roles: updatedRoles, manualUsers: updatedManuals }, { merge: true }); } };
  const editManualUser = async (id, currentName) => { const newName = prompt("Modifier le nom de l'entité :", currentName); if (newName && newName.trim() !== "" && newName !== currentName) { const finalName = newName.trim(); const updatedManuals = manualUsers.map(u => u.id === id ? { ...u, name: finalName } : u); await setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: updatedManuals }, { merge: true }); if (campaigns && campaigns.length > 0) { const newCampaigns = campaigns.map(camp => { const newListe = camp.liste.map(c => { if (c.responsables && c.responsables.includes(currentName)) return { ...c, responsables: c.responsables.map(r => r === currentName ? finalName : r) }; return c; }); return { ...camp, liste: newListe }; }); saveData(newCampaigns); } } };
  const addOrgRole = () => { const r = newRoleInput.trim(); if (r && !orgRoles.includes(r)) { setDoc(doc(db, "etablissements", selectedIfsi), { roles: [...orgRoles, r] }, { merge: true }); setNewRoleInput(""); } };
  const deleteOrgRole = (roleToDelete) => { if (allIfsiMembers.some(m => m.roles.includes(roleToDelete))) return alert("⚠️ Impossible : Des personnes ont encore cette casquette."); if (window.confirm(`Supprimer la colonne "${roleToDelete}" ?`)) setDoc(doc(db, "etablissements", selectedIfsi), { roles: orgRoles.filter(r => r !== roleToDelete) }, { merge: true }); };
  const addManualUser = () => { const p = newManualUser.prenom.trim(); const n = newManualUser.nom.trim().toUpperCase(); if (!p || !n) return alert("Veuillez saisir un Prénom ET un NOM."); const fullName = `${n} ${p}`; setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: [...manualUsers, { id: 'm_' + Date.now(), name: fullName, roles: [] }] }, { merge: true }); setNewManualUser({ prenom: "", nom: "" }); };
  const deleteManualUser = (idToDelete) => { if (window.confirm("Supprimer ce profil manuel ?")) setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: manualUsers.filter(u => u.id !== idToDelete) }, { merge: true }); };
  const applyDefaultRoles = () => { if(window.confirm("Appliquer les colonnes par défaut ?")) setDoc(doc(db, "etablissements", selectedIfsi), { roles: [...new Set([...orgRoles, ...DEFAULT_ROLES])] }, { merge: true }); };

  const handleCreateUser = async () => { if (!newMember.email || !newMember.pwd) return alert("Requis."); if (newMember.pwd.length < 6) return alert("Mot de passe : 6 min."); setIsCreatingUser(true); try { const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newMember.email, newMember.pwd); const targetIfsi = userProfile.role === "superadmin" && newMember.ifsi ? newMember.ifsi : selectedIfsi; await setDoc(doc(db, "users", userCredential.user.uid), { email: newMember.email, role: newMember.role, etablissementId: targetIfsi, orgRoles: [], mustChangePassword: true }); alert(`✅ Compte créé !`); setNewMember({ email: "", pwd: "", role: "user", ifsi: "" }); secondaryAuth.signOut(); } catch (error) { alert("Erreur : " + error.message); } setIsCreatingUser(false); };
  const handleDeleteUser = async (userId) => { if (!window.confirm(`Révoquer cet accès ?`)) return; try { await deleteDoc(doc(db, "users", userId)); } catch (e) { alert(e.message); } };
  
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

  const handleImportExcel = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.name.toLowerCase().endsWith('.csv')) { setImportReport({ type: "warning", title: "Format inadapté", msg: "L'application attend un fichier Excel (.xlsx) et non un fichier CSV.", details: "" }); return e.target.value = null; }
    if (typeof window.ExcelJS === "undefined") { setImportReport({ type: "error", title: "Erreur Système", msg: "Moteur Excel non chargé.", details: "" }); return e.target.value = null; }
    if (!window.confirm("⚠️ Écraser les données de cet établissement par le fichier Excel ?")) return e.target.value = null;

    try {
      const arrayBuffer = await file.arrayBuffer(); const workbook = new window.ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer); const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error("Aucun onglet trouvé.");

      await createManualBackup("Avant Import Excel", campaigns);

      let updatedCriteres = [...criteres]; let count = 0; let logs = []; let newlyDiscoveredUsers = new Set();
      const existingNamesList = allIfsiMembers.map(m => m.name.toLowerCase());
      const getCellText = (cell) => { if (!cell || cell.value === null || cell.value === undefined) return ""; if (typeof cell.value === "object") { if (cell.value.richText) return cell.value.richText.map(t => t.text).join(""); if (cell.value.hyperlink) return String(cell.value.text || ""); if (cell.value.result !== undefined) return String(cell.value.result); if (cell.value instanceof Date) return cell.value.toLocaleDateString(); } return String(cell.text || cell.value || ""); };
      const normalize = str => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
      const tagImport = (oldVal, newVal) => { const o = String(oldVal || "").trim(); const n = String(newVal || "").trim(); if (!n || o === n) return o; if (n.includes("[📥 IMPORT EXCEL]")) return n; return `[📥 IMPORT EXCEL]\n${n}`; };

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; 
        let numRaw = getCellText(row.getCell(1)).trim(); if (!numRaw) return;
        const numClean = numRaw.replace(/[^\d]/g, ''); const index = updatedCriteres.findIndex(c => String(c.num) === numClean || String(c.num) === numRaw);
        if (index !== -1) {
          const statutText = getCellText(row.getCell(4)).trim();
          let statutKey = updatedCriteres[index].statut || "non-evalue";
          if (statutText) { const foundStatut = Object.entries(STATUT_CONFIG).find(([k,v]) => normalize(v.label) === normalize(statutText)); if (foundStatut) statutKey = foundStatut[0]; }
          const dateCell = row.getCell(5); let newDelai = updatedCriteres[index].delai;
          if (dateCell && dateCell.value) { if (dateCell.value instanceof Date) { newDelai = dateCell.value.toISOString().split('T')[0]; } else { const dStr = getCellText(dateCell).trim(); if (dStr.includes('/')) { const parts = dStr.split('/'); if (parts.length === 3) newDelai = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`; } } }
          const respText = getCellText(row.getCell(6)); let responsables = updatedCriteres[index].responsables || [];
          if (respText) { responsables = respText.split(',').map(s => s.trim()).filter(s => s); responsables.forEach(r => { if (!existingNamesList.includes(r.toLowerCase())) newlyDiscoveredUsers.add(r); }); }
          let newCritere = { ...updatedCriteres[index], statut: statutKey, delai: newDelai || updatedCriteres[index].delai, responsables: responsables, preuves: tagImport(updatedCriteres[index].preuves, getCellText(row.getCell(7))), preuves_encours: tagImport(updatedCriteres[index].preuves_encours, getCellText(row.getCell(8))), attendus: tagImport(updatedCriteres[index].attendus, getCellText(row.getCell(9))), notes: tagImport(updatedCriteres[index].notes, getCellText(row.getCell(10))) };
          Object.keys(newCritere).forEach(key => { if (newCritere[key] === undefined) newCritere[key] = ""; });
          newCritere.historique = [...(newCritere.historique || []), { date: new Date().toISOString(), user: "Système d'Import", msg: "📥 Données synchronisées depuis un fichier Excel" }];
          updatedCriteres[index] = newCritere; count++; logs.push(`Indicateur ${numClean} mis à jour avec succès.`);
        }
      });

      if (count === 0) { setImportReport({ type: "warning", title: "Aucune mise à jour", msg: "Le fichier a été lu, mais aucun numéro d'indicateur n'a été trouvé.", details: "" }); } 
      else {
        if (newlyDiscoveredUsers.size > 0) {
           const newManualsToAdd = Array.from(newlyDiscoveredUsers).map(name => ({ id: 'm_' + Date.now() + Math.random().toString(36).substr(2, 5), name: name, roles: [] }));
           const freshIfsi = await getDoc(doc(db, "etablissements", selectedIfsi));
           if (freshIfsi.exists()) { const currentManuals = freshIfsi.data().manualUsers || []; await setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: [...currentManuals, ...newManualsToAdd] }, { merge: true }); }
        }
        const newCampaigns = campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: updatedCriteres } : camp);
        await saveData(newCampaigns);
        setImportReport({ type: "success", title: "Import Réussi", msg: `Base de données mise à jour ! ${newlyDiscoveredUsers.size > 0 ? `\n👤 ${newlyDiscoveredUsers.size} nouveaux responsables créés.` : ''}`, details: `${count} indicateurs affectés:\n${logs.join("\n")}` });
      }
    } catch (error) { setImportReport({ type: "error", title: "Échec de la lecture", msg: "Impossible de décoder le fichier Excel.", details: `${error.name}: ${error.message}` }); }
    e.target.value = null;
  };

  const saveModal = (updated, action) => {
    if (isArchive) return setModalCritere(null);
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
    
    const newListe = criteres.map(c => c.id === finalUpdated.id ? finalUpdated : c);
    const newCampaigns = campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp);
    saveData(newCampaigns);

    if (action === "close" || action === undefined) setModalCritere(null);
    else if (action === "next") { const idx = filtered.findIndex(c => c.id === updated.id); if (idx < filtered.length - 1) setModalCritere(filtered[idx + 1]); }
    else if (action === "prev") { const idx = filtered.findIndex(c => c.id === updated.id); if (idx > 0) setModalCritere(filtered[idx - 1]); }
  };

  const handleAutoSave = (updated) => {
    if (isArchive) return;
    const newListe = criteres.map(c => c.id === updated.id ? updated : c);
    const newCampaigns = campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp);
    saveData(newCampaigns);
  };


  // ----------------------------------------------------------------------
  // 🚪 ÉCRANS DE BLOCAGE
  // ----------------------------------------------------------------------
  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;

  if (activeTab === "validation_requise") {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, color: t.text, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "Albert Sans, sans-serif" }}>
        <div className="animate-fade-in" style={{ background: t.surface, padding: "40px", borderRadius: "16px", border: `1px solid ${t.border}`, boxShadow: t.shadow, maxWidth: "500px", width: "100%", textAlign: "center" }}>
           <div style={{ fontSize: "50px", marginBottom: "20px" }}>✉️</div>
           <h2 style={{ color: t.text, margin: "0 0 10px 0" }}>Vérification de l'email</h2>
           <p style={{ color: t.text2, marginBottom: "30px", fontSize: "15px", lineHeight: "1.6" }}>
             Un e-mail de confirmation a été envoyé à <strong>{auth.currentUser?.email}</strong>.<br/>
             Veuillez cliquer sur le lien dans l'e-mail pour activer votre compte.
           </p>
           {verificationSent ? (
             <div style={{ background: t.greenBg, color: t.green, padding: "12px", borderRadius: "8px", fontSize: "14px", fontWeight: "bold", marginBottom: "20px" }}>✅ Nouveau lien envoyé !</div>
           ) : (
             <button onClick={handleResendVerification} style={{ width: "100%", padding: "12px", background: t.accent, color: "white", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer", marginBottom: "12px" }}>Renvoyer l'e-mail</button>
           )}
           <button onClick={() => window.location.reload()} style={{ width: "100%", padding: "12px", background: t.surface2, color: t.text, borderRadius: "8px", border: `1px solid ${t.border}`, fontWeight: "bold", cursor: "pointer", marginBottom: "12px" }}>J'ai validé mon mail (Actualiser)</button>
           <button onClick={handleLogout} style={{ width: "100%", padding: "12px", background: "transparent", color: t.danger, border: `1px solid ${t.dangerBd}`, borderRadius: "8px", cursor: "pointer" }}>Déconnexion</button>
        </div>
      </div>
    );
  }

  if (userProfile?.mustChangePassword) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, color: t.text, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "Albert Sans, sans-serif" }}>
        <div className="animate-fade-in" style={{ background: t.surface, padding: "40px", borderRadius: "16px", border: `1px solid ${t.border}`, boxShadow: t.shadow, maxWidth: "500px", width: "100%" }}>
           <div style={{ textAlign: "center", fontSize: "40px", marginBottom: "10px" }}>🔒</div>
           <h2 style={{ color: t.danger, textAlign: "center", margin: "0 0 10px 0" }}>Sécurité du compte</h2>
           <p style={{ textAlign: "center", color: t.text2, marginBottom: "30px", fontSize: "14px", lineHeight: "1.5" }}>C'est votre première connexion. Vous devez créer votre mot de passe.</p>
           <CompteTab auth={auth} userProfile={userProfile} pwdUpdate={pwdUpdate} setPwdUpdate={setPwdUpdate} handleChangePassword={async (e) => { e.preventDefault(); setPwdUpdate({...pwdUpdate, loading: true}); try { await updatePassword(auth.currentUser, pwdUpdate.p1); await setDoc(doc(db,"users",auth.currentUser.uid),{mustChangePassword:false},{merge:true}); alert("✅ Mot de passe mis à jour ! Redémarrage..."); window.location.reload(); } catch (err) { alert("Erreur : " + err.message); setPwdUpdate({...pwdUpdate, loading: false, error: err.message}); } }} />
           <button onClick={handleLogout} style={{ marginTop: "20px", width: "100%", padding: "12px", background: t.surface2, color: t.text2, border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Quitter</button>
        </div>
      </div>
    );
  }

  const currentIfsiName = ifsiList.find(i => i.id === selectedIfsi)?.name || "Chargement...";
  const menuBtn = (id, icon, label) => {
    const act = activeTab === id;
    return (
      <button 
        onClick={() => { setActiveTab(id); setSearchTerm(""); setFilterStatut("tous"); setFilterCritere("tous"); }} 
        className="sidebar-btn"
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: act ? "rgba(255,255,255,0.08)" : "transparent", color: act ? t.textNav : t.textNavSub, border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: act ? "600" : "500", cursor: "pointer", transition: "all 0.2s", textAlign: "left", marginBottom: "4px" }}
      >
        <span style={{ fontSize: "16px", opacity: act ? 1 : 0.6 }}>{icon}</span>
        {label}
      </button>
    );
  };

  // ----------------------------------------------------------------------
  // 🖥️ AFFICHAGE PRINCIPAL (SIDEBAR + MAIN)
  // ----------------------------------------------------------------------
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'Albert Sans', sans-serif" }}>
      <link href={GFONT} rel="stylesheet" />
      <style>{`
        @media print { .no-print { display: none !important; } body { background: white !important; } }
        .sidebar-btn:hover { background: rgba(255,255,255,0.06) !important; color: ${t.textNav} !important; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        main::-webkit-scrollbar { width: 8px; }
        main::-webkit-scrollbar-track { background: transparent; }
        main::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 4px; }
      `}</style>

      {importReport && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }}>
           <div className="animate-fade-in" style={{ background: t.surface, borderRadius: "16px", padding: "32px", maxWidth: "500px", width: "100%", boxShadow: t.shadow }}>
              <div style={{ fontSize: "40px", textAlign: "center", marginBottom: "16px" }}>{importReport.type === 'success' ? '✅' : importReport.type === 'warning' ? '⚠️' : '❌'}</div>
              <h2 style={{ textAlign: "center", margin: "0 0 12px 0", color: t.text }}>{importReport.title}</h2>
              <p style={{ textAlign: "center", color: t.text2, fontSize: "14px", marginBottom: "20px", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>{importReport.msg}</p>
              {importReport.details && (
                 <div style={{ background: t.surface2, padding: "12px", borderRadius: "8px", fontSize: "11px", color: t.text3, maxHeight: "150px", overflowY: "auto", whiteSpace: "pre-wrap", fontFamily: "monospace", marginBottom: "20px", border: `1px solid ${t.border}` }}>
                   {importReport.details}
                 </div>
              )}
              <button onClick={() => setImportReport(null)} style={{ width: "100%", padding: "12px", background: t.accent, color: "white", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}>Fermer</button>
           </div>
        </div>
      )}

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

      {/* 🧭 SIDEBAR GAUCHE */}
      <aside className="no-print" style={{ width: "260px", background: t.nav, borderRight: `1px solid rgba(255,255,255,0.05)`, display: "flex", flexDirection: "column", padding: "24px 16px", flexShrink: 0, zIndex: 50 }}>
        
        {/* Logo & Etablissement */}
        <div style={{ marginBottom: "24px", padding: "0 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #4f80f0, #2c55b8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", boxShadow: "0 2px 10px rgba(79,128,240,0.3)" }}>✨</div>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: "24px", color: "white", letterSpacing: "0.5px" }}>QualiForma</span>
          </div>

          {userProfile?.role === "superadmin" ? (
            <div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: t.textNavSub, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Établissement</div>
              <select value={selectedIfsi || ""} onChange={handleIfsiSwitch} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: t.textNav, fontSize: "12px", fontWeight: "600", outline: "none", cursor: "pointer" }}>
                {ifsiList.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                <option value="NEW">+ Nouvel établissement</option>
              </select>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: t.textNavSub, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Établissement</div>
              <div style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)", color: t.textNav, fontSize: "12px", fontWeight: "600" }}>
                {currentIfsiName}
              </div>
            </div>
          )}
        </div>

        {/* Menu Principal */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: "20px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: t.textNavSub, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px", paddingLeft: "8px" }}>Pilotage</div>
          {menuBtn("dashboard", "📊", "Vue Globale")}
          {menuBtn("criteres", "🎯", "Indicateurs")}
          {menuBtn("axes", "🔥", "Priorités")}
          {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && menuBtn("organigramme", "👥", "Organigramme")}

          <div style={{ fontSize: "10px", fontWeight: "700", color: t.textNavSub, textTransform: "uppercase", letterSpacing: "1px", marginTop: "24px", marginBottom: "12px", paddingLeft: "8px" }}>Outils</div>
          {menuBtn("livre_blanc", "📖", "Livre Blanc")}
          {menuBtn("responsables", "👤", "Responsables")}
          {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && menuBtn("equipe", "⚙️", "Administration")}
          {userProfile?.role === "superadmin" && menuBtn("tour_controle", "🛸", "Tour de Contrôle")}
          {userProfile?.role === "superadmin" && menuBtn("backups", "⏳", "Sauvegardes")}
        </div>

        {/* Actions rapides */}
        <div style={{ display:"flex", gap:"8px", marginBottom: "16px" }}>
          <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ flex: 1, padding: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: t.textNav, borderRadius: "8px", cursor: "pointer", fontSize: "12px", display:"flex", justifyContent:"center", alignItems:"center" }}>
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          <button onClick={exportToExcel} style={{ flex: 1, padding: "8px", background: "rgba(79,128,240,0.15)", border: `1px solid rgba(79,128,240,0.3)`, color: "#7aa4f8", borderRadius: "8px", cursor: "pointer", fontSize: "12px", display:"flex", justifyContent:"center", alignItems:"center", fontWeight:"bold" }}>
            📊 Excel
          </button>
          {(userProfile?.role === "superadmin" && !isArchive) && (
            <>
              <input type="file" id="import-excel" accept=".xlsx" style={{ display: 'none' }} onChange={handleImportExcel} />
              <label htmlFor="import-excel" style={{ flex: 1, padding: "8px", background: "rgba(44,200,128,0.15)", border: `1px solid rgba(44,200,128,0.3)`, color: "#6ee7b7", borderRadius: "8px", cursor: "pointer", fontSize: "12px", display:"flex", justifyContent:"center", alignItems:"center", fontWeight:"bold", margin: 0 }}>
                📥
              </label>
            </>
          )}
        </div>

        {/* Profil & Logout */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden", cursor: "pointer" }} onClick={() => setActiveTab("compte")}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: t.textNav, fontSize: "12px", fontWeight: "700", flexShrink: 0 }}>
                {auth.currentUser?.email?.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "12px", fontWeight: "600", color: t.textNav, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{auth.currentUser?.email?.split('@')[0]}</div>
                <div style={{ fontSize: "10px", color: t.textNavSub, textTransform: "capitalize" }}>{userProfile?.role}</div>
              </div>
            </div>
            <button onClick={handleLogout} style={{ background: "transparent", border: "none", color: t.danger, cursor: "pointer", fontSize: "16px", padding: "4px", transition: "all 0.2s" }} title="Se déconnecter" className="sidebar-btn">🚪</button>
          </div>
        </div>
      </aside>

      {/* 🖥️ ZONE DE CONTENU PRINCIPALE */}
      <main style={{ flex: 1, height: "100vh", overflowY: "auto", overflowX: "hidden", background: t.bg, position: "relative", display: "flex", flexDirection: "column" }}>
        
        <div className="animate-fade-in" style={{ flex: 1, padding: "32px", boxSizing: "border-box", maxWidth: "1440px", margin: "0 auto", width: "100%" }}>
          {activeTab === "dashboard" && campaigns && <DashboardTab bannerConfig={{ bg: t.accentBg, border: t.accentBd, color: t.accent, icon: "🗓️", text: "Audit Qualiopi" }} currentAuditDate={currentAuditDate} isArchive={isArchive} handleEditAuditDate={handleEditAuditDate} stats={stats} urgents={urgents} criteres={criteres} userProfile={userProfile} isDarkMode={isDarkMode} isColorblindMode={isColorblindMode} t={t} />}
          
          {activeTab === "tour_controle" && <TourControleTab globalScore={tourData.score} activeIfsis={tourData.active} totalUsersInNetwork={teamUsers.length} topAlerts={tourData.alerts} sortedTourIfsis={sortedTourIfsis} setSelectedIfsi={setSelectedIfsi} archivedIfsis={tourData.archived} today={today} handleRenameIfsi={handleRenameIfsi} handleArchiveIfsi={handleArchiveIfsi} handleHardDeleteIfsi={handleHardDeleteIfsi} setActiveTab={setActiveTab} tourSort={tourSort} setTourSort={setTourSort} totalAlertsCount={tourData.alerts.length} t={t} />}
          
          {activeTab === "organigramme" && <OrganigrammeTab currentIfsiName={currentIfsiName} orgRoles={orgRoles} allIfsiMembers={allIfsiMembers} getRoleColor={getRoleColor} handleDragOverOrg={handleDragOverOrg} handleDropOrg={handleDropOrg} handleDragStartOrg={handleDragStartOrg} removeRoleFromUser={removeRoleFromUser} editOrgRole={editOrgRole} editManualUser={editManualUser} deleteManualUser={deleteManualUser} addManualUser={addManualUser} addOrgRole={addOrgRole} newManualUser={newManualUser} setNewManualUser={setNewManualUser} newRoleInput={newRoleInput} setNewRoleInput={setNewRoleInput} deleteOrgRole={deleteOrgRole} applyDefaultRoles={applyDefaultRoles} isDarkMode={isDarkMode} isColorblindMode={isColorblindMode} t={t} />}
          
          {activeTab === "criteres" && <CriteresTab searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterStatut={filterStatut} setFilterStatut={setFilterStatut} filterCritere={filterCritere} setFilterCritere={setFilterCritere} filtered={filtered} days={days} today={today} dayColor={dayColor} setModalCritere={setModalCritere} isArchive={isArchive} t={t} />}
          
          {activeTab === "axes" && <AxesTab axes={axes} days={days} today={today} dayColor={dayColor} setModalCritere={setModalCritere} isArchive={isArchive} isAuditMode={isAuditMode} t={t} />}
          
          {activeTab === "responsables" && <ResponsablesTab byPerson={byPerson} setModalCritere={setModalCritere} isArchive={isArchive} getRoleColor={getRoleColor} t={t} />}
          
          {activeTab === "livre_blanc" && <LivreBlancTab currentIfsiName={currentIfsiName} currentCampaign={currentCampaign} criteres={criteres} t={t} />}
          
          {activeTab === "backups" && <BackupsTab backupsList={backupsList} handleRestoreBackup={handleRestoreBackup} t={t} />}
          
          {activeTab === "equipe" && <EquipeTab userProfile={userProfile} newMember={newMember} setNewMember={setNewMember} isCreatingUser={isCreatingUser} handleCreateUser={handleCreateUser} selectedIfsi={selectedIfsi} ifsiList={ifsiList} teamSearchTerm={teamSearchTerm} setTeamSearchTerm={setTeamSearchTerm} sortedTeamUsers={sortedTeamUsers} teamSortConfig={teamSortConfig} handleSortTeam={handleSortTeam} handleDeleteUser={handleDeleteUser} auth={auth} handleSendResetEmail={handleSendResetEmail} isDarkMode={isDarkMode} t={t} />}
          
          {activeTab === "compte" && <CompteTab auth={auth} userProfile={userProfile} pwdUpdate={pwdUpdate} setPwdUpdate={setPwdUpdate} handleChangePassword={async (e) => { e.preventDefault(); setPwdUpdate({...pwdUpdate, loading: true}); try { await updatePassword(auth.currentUser, pwdUpdate.p1); setPwdUpdate({...pwdUpdate, loading: false, success: "Mot de passe modifié", p1:"", p2:""}); } catch (err) { setPwdUpdate({...pwdUpdate, loading: false, error: err.message}); } }} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} isColorblindMode={isColorblindMode} setIsColorblindMode={setIsColorblindMode} t={t} />}
        </div>
        
        <Footer isDarkMode={isDarkMode} t={t} />
      </main>

    </div>
  );
}

export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }
