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

  // Initialisation liste établissements
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "etablissements"), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setIfsiList(list.sort((a, b) => String(a.name).localeCompare(b.name)));
    });
    return () => unsub();
  }, []);

  // Auth & Profile
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

  // Cleanup Team Users listener
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

  // Data Qualiopi Sync
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

  // --- OPTIMISATIONS ---
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
      if (searchTerm && !c.titre.toLowerCase().includes(searchTerm.toLowerCase()) && !c.num.includes(searchTerm)) return false;
      return true;
    });
    const concerned = criteres.filter(c => c.statut !== "non-concerne");
    const total = concerned.length || 1;
    return {
      stats: { total, conforme: criteres.filter(c => c.statut === "conforme").length, enCours: criteres.filter(c => c.statut === "en-cours").length, nonConforme: criteres.filter(c => c.statut === "non-conforme").length, nonEvalue: criteres.filter(c => c.statut === "non-evalue").length, nonConcerne: criteres.filter(c => c.statut === "non-concerne").length },
      urgents: criteres.filter(c => days(c.delai) <= 30 && c.statut !== "conforme" && c.statut !== "non-concerne"),
      filtered: filt,
      axes: criteres.filter(c => ["non-conforme", "en-cours"].includes(c.statut))
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
      if (c.statut === "non-conforme") alerts.push({ ifsiName: s.name, critere: c, type: "non-conforme" });
      else if (days(c.delai) < 0 && c.statut !== "non-concerne" && c.statut !== "conforme") alerts.push({ ifsiName: s.name, critere: c, type: "depasse", days: Math.abs(days(c.delai)) });
    }));
    return { active, archived: ifsiList.filter(i => i.archived), score, alerts };
  }, [ifsiList, getIfsiGlobalStats]);

  const sortedTourIfsis = useMemo(() => [...tourData.active].sort((a,b) => {
    if (tourSort === "urgence") return new Date(a.auditDate) - new Date(b.auditDate);
    if (tourSort === "score_desc") return b.pct - a.pct;
    return a.name.localeCompare(b.name);
  }), [tourData.active, tourSort]);

  const totalUsersInNetwork = teamUsers.length;

  // 👉 HANDLERS RÉINTRODUITS ICI
  const handleIfsiSwitch = async (e) => {
    if (e.target.value === "NEW") {
      const nom = prompt("Nom de l'établissement :");
      if (nom?.trim()) {
        const id = nom.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(Math.random() * 1000);
        await setDoc(doc(db, "etablissements", id), { name: nom.trim(), roles: DEFAULT_ROLES, archived: false });
        setSelectedIfsi(id);
      }
    } else {
      setSelectedIfsi(e.target.value);
    }
  };

  const handleRenameIfsi = async (id, currentName) => {
    const n = prompt("Nouveau nom :", currentName);
    if (n?.trim() && n !== currentName) await setDoc(doc(db, "etablissements", id), { name: n.trim() }, { merge: true });
  };

  const handleArchiveIfsi = async (id, name, status) => {
    if (window.confirm(`Voulez-vous ${status ? 'archiver' : 'restaurer'} ${name} ?`))
      await setDoc(doc(db, "etablissements", id), { archived: status }, { merge: true });
  };

  const handleHardDeleteIfsi = async (id, name) => {
    if (prompt(`Tapez SUPPRIMER pour détruire ${name}`) === "SUPPRIMER") {
      await deleteDoc(doc(db, "etablissements", id));
      await deleteDoc(doc(db, "qualiopi", id === "demo_ifps_cham" ? "criteres" : id));
      if (selectedIfsi === id) setSelectedIfsi("demo_ifps_cham");
    }
  };

  const handleSortTeam = (key) => {
    let direction = "asc";
    if (teamSortConfig.key === key && teamSortConfig.direction === "asc") direction = "desc";
    setTeamSortConfig({ key, direction });
  };

  const saveModal = (updated, action) => {
    const newCriteres = criteres.map(c => c.id === updated.id ? updated : c);
    saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newCriteres } : camp));
    if (action === "close") setModalCritere(null);
    else if (action === "next") setModalCritere(filtered[filtered.findIndex(c => c.id === updated.id) + 1]);
    else if (action === "prev") setModalCritere(filtered[filtered.findIndex(c => c.id === updated.id) - 1]);
  };

  const handleAutoSave = (updated) => {
    const newCriteres = criteres.map(c => c.id === updated.id ? updated : c);
    saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newCriteres } : camp));
  };

  const handleEditAuditDate = async () => {
    const d = prompt("Date d'audit (AAAA-MM-JJ) :", currentAuditDate);
    if (d) saveData(campaigns.map(c => c.id === activeCampaignId ? { ...c, auditDate: d } : c));
  };

  const handleNewCampaign = (e) => {
    if (e.target.value === "NEW") {
      const nom = prompt("Nom de la campagne :");
      if (nom) {
        const newCamp = { id: Date.now().toString(), name: nom, auditDate: "2026-10-15", liste: DEFAULT_CRITERES, locked: false };
        saveData([...campaigns.map(c => ({ ...c, locked: true })), newCamp]);
      }
    } else setActiveCampaignId(e.target.value);
  };

  const getRoleColor = (roleName) => {
    if (roleName === "Direction") return { bg: "#1e3a5f", border: "#0f172a", text: "#ffffff" };
    const idx = orgRoles.indexOf(roleName);
    return ROLE_PALETTE[idx % ROLE_PALETTE.length] || ROLE_PALETTE[7];
  };

  const navBtn = active => ({ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", background: active ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "transparent", color: active ? "white" : "#4b5563", whiteSpace: "nowrap", transition: "all 0.2s" });

  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;

  const currentIfsiName = ifsiList.find(i => i.id === selectedIfsi)?.name || "Chargement...";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif", color: "#1e3a5f" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @media (max-width: 1024px) { .hide-mobile { display: none !important; } }
      `}</style>

      {modalCritere && (
        <DetailModal 
          critere={modalCritere} onClose={() => setModalCritere(null)} onSave={saveModal} onAutoSave={handleAutoSave}
          isReadOnly={isArchive} isAuditMode={isAuditMode} allMembers={allIfsiMembers} rolePalette={ROLE_PALETTE} 
          orgRoles={orgRoles} hasPrev={filtered.findIndex(c => c.id === modalCritere.id) > 0} hasNext={filtered.findIndex(c => c.id === modalCritere.id) < filtered.length - 1}
        />
      )}

      {/* NAVIGATION */}
      <div className="no-print" style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "14px 32px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ maxWidth: "1440px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "20px", fontWeight: "800", color: "#1d4ed8", cursor: "pointer" }} onClick={() => setActiveTab("dashboard")}>QualiForma</span>
            <select value={selectedIfsi || ""} onChange={handleIfsiSwitch} style={{ padding: "6px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
              {ifsiList.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              {userProfile?.role === "superadmin" && <option value="NEW">+ Nouvel établissement</option>}
            </select>
          </div>

          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {userProfile?.role === "superadmin" && <button style={navBtn(activeTab === "tour_controle")} onClick={() => setActiveTab("tour_controle")}>🛸 Tour Contrôle</button>}
            <button style={navBtn(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
            <button style={navBtn(activeTab === "criteres")} onClick={() => setActiveTab("criteres")}>Indicateurs</button>
            <button style={navBtn(activeTab === "axes")} onClick={() => setActiveTab("axes")}>Priorités</button>
            <button style={navBtn(activeTab === "livre_blanc")} onClick={() => setActiveTab("livre_blanc")}>Livre Blanc</button>
            <button style={navBtn(activeTab === "organigramme")} onClick={() => setActiveTab("organigramme")}>🌳 Organigramme</button>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setActiveTab("compte")} style={{ border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: "6px", background: "white" }}>⚙️</button>
            <button onClick={() => signOut(auth)} style={{ color: "#ef4444", border: "1px solid #fca5a5", padding: "6px 12px", borderRadius: "6px" }}>Déconnexion</button>
          </div>
        </div>
      </div>

      {/* CONTENU */}
      <div className="animate-fade-in" style={{ maxWidth: "1440px", margin: "0 auto", padding: "28px 32px" }}>
        {activeTab === "dashboard" && campaigns && <DashboardTab bannerConfig={{ bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", icon: "🗓️", text: "Audit Qualiopi" }} currentAuditDate={currentAuditDate} isArchive={isArchive} handleEditAuditDate={handleEditAuditDate} stats={stats} urgents={urgents} criteres={criteres} />}
        {activeTab === "tour_controle" && <TourControleTab globalScore={tourData.score} activeIfsis={tourData.active} totalUsersInNetwork={totalUsersInNetwork} topAlerts={tourData.alerts} sortedTourIfsis={sortedTourIfsis} setSelectedIfsi={setSelectedIfsi} archivedIfsis={tourData.archived} today={today} handleRenameIfsi={handleRenameIfsi} handleArchiveIfsi={handleArchiveIfsi} handleHardDeleteIfsi={handleHardDeleteIfsi} setActiveTab={setActiveTab} tourSort={tourSort} setTourSort={setTourSort} totalAlertsCount={tourData.alerts.length} />}
        {activeTab === "organigramme" && <OrganigrammeTab currentIfsiName={currentIfsiName} orgRoles={orgRoles} allIfsiMembers={allIfsiMembers} getRoleColor={getRoleColor} handleDragOverOrg={handleDragOverOrg} handleDropOrg={handleDropOrg} handleDragStartOrg={handleDragStartOrg} removeRoleFromUser={removeRoleFromUser} editOrgRole={editOrgRole} editManualUser={editManualUser} deleteManualUser={deleteManualUser} addManualUser={addManualUser} addOrgRole={addOrgRole} newManualUserInput={newManualUserInput} setNewManualUserInput={setNewManualUserInput} newRoleInput={newRoleInput} setNewRoleInput={setNewRoleInput} deleteOrgRole={handleHardDeleteIfsi} applyDefaultRoles={applyDefaultRoles} />}
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
