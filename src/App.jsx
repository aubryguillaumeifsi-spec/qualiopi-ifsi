import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";

// IMPORT DES COMPOSANTS DÉCOUPÉS
import DashboardTab from "./components/DashboardTab";
import TourControleTab from "./components/TourControleTab";
import OrganigrammeTab from "./components/OrganigrammeTab";
import { CriteresTab, AxesTab, ResponsablesTab, LivreBlancTab } from "./components/TabsQualiopi";
import { EquipeTab, CompteTab } from "./components/TabsAdmin";

import { getDoc, setDoc, deleteDoc, doc, collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, updatePassword, sendPasswordResetEmail, sendEmailVerification } from "firebase/auth";
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

function BackupsTab({ backupsList, handleRestoreBackup }) {
  return (
      <div className="animate-fade-in" style={{ maxWidth: "800px", margin: "0 auto", marginTop: "20px" }}>
          <div style={{ marginBottom: "32px", textAlign: "center", background: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "50px", marginBottom: "10px" }}>⏳</div>
              <h2 style={{ fontSize: "24px", fontWeight: "900", color: "#1e3a5f", margin: "0 0 8px" }}>Machine à remonter le temps</h2>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>Sauvegardes automatiques des 10 derniers jours.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {backupsList.map((b) => (
                  <div key={b.id} className="td-dash" style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                          <div style={{ fontSize: "15px", fontWeight: "800", color: "#1e3a5f" }}>{b.type}</div>
                          <div style={{ fontSize: "13px", color: "#64748b" }}>{new Date(b.timestamp).toLocaleString("fr-FR")}</div>
                      </div>
                      <button onClick={() => handleRestoreBackup(b)} style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fca5a5", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Restaurer</button>
                  </div>
              ))}
          </div>
      </div>
  );
}

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
  const [backupsList, setBackupsList] = useState([]);
  const dailyBackupDone = useRef(null); 
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    onSnapshot(collection(db, "etablissements"), (snapshot) => {
      const list = []; snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setIfsiList(list.sort((a, b) => String(a.name).localeCompare(b.name)));
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        if (!user.emailVerified) setActiveTab("validation_requise");
        else setActiveTab("dashboard");
        
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

  // 👉 SAUVEGARDE GLOBALE (Utilisée par l'autosave et le modal)
  const saveData = async (newCampaigns) => {
    const docId = selectedIfsi === "demo_ifps_cham" ? "criteres" : selectedIfsi;
    await setDoc(doc(db, "qualiopi", docId), { campaigns: newCampaigns, updatedAt: new Date().toISOString() }, { merge: true });
  };

  // 👉 NAVIGATION DANS LE MODAL (Flèches cliquables)
  const currentCampaign = useMemo(() => campaigns?.find(c => c.id === activeCampaignId) || campaigns?.[0], [campaigns, activeCampaignId]);
  const criteres = useMemo(() => currentCampaign?.liste || [], [currentCampaign]);
  
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

  const saveModal = (updated, action) => {
    if (currentCampaign?.locked) return setModalCritere(null);
    const newListe = criteres.map(c => c.id === updated.id ? updated : c);
    const newCampaigns = campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp);
    saveData(newCampaigns);

    if (action === "close") setModalCritere(null);
    else if (action === "next") {
      const idx = filtered.findIndex(c => c.id === updated.id);
      if (idx < filtered.length - 1) setModalCritere(filtered[idx + 1]);
    }
    else if (action === "prev") {
      const idx = filtered.findIndex(c => c.id === updated.id);
      if (idx > 0) setModalCritere(filtered[idx - 1]);
    }
  };

  const handleAutoSave = (updated) => {
    if (currentCampaign?.locked) return;
    const newListe = criteres.map(c => c.id === updated.id ? updated : c);
    const newCampaigns = campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp);
    saveData(newCampaigns);
  };

  // --- REST DE LA LOGIQUE ---
  const createManualBackup = async (label, dataToBackup) => {
    const docId = selectedIfsi === "demo_ifps_cham" ? "criteres" : selectedIfsi;
    await setDoc(doc(db, "backups", `${docId}_${Date.now()}`), { ifsiId: docId, timestamp: Date.now(), type: label, campaigns: dataToBackup });
  };

  const handleRestoreBackup = async (backup) => {
    if (window.confirm("Restaurer cette version ?")) {
      const docId = selectedIfsi === "demo_ifps_cham" ? "criteres" : selectedIfsi;
      await setDoc(doc(db, "qualiopi", docId), { campaigns: backup.campaigns }, { merge: true });
      alert("Version restaurée."); setActiveTab("dashboard");
    }
  };

  const exportToExcel = async () => {
    if (!criteres || typeof window.ExcelJS === "undefined") return;
    const workbook = new window.ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Suivi');
    worksheet.columns = [ { header: 'N°', key: 'num', width: 8 }, { header: 'Indicateur', key: 'titre', width: 40 }, { header: 'Statut', key: 'statut', width: 20 } ];
    criteres.forEach(c => worksheet.addRow({ num: c.num, titre: c.titre, statut: STATUT_CONFIG[c.statut]?.label }));
    const buffer = await workbook.xlsx.writeBuffer();
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([buffer])); link.download = "Export.xlsx"; link.click();
  };

  const handleIfsiSwitch = (e) => setSelectedIfsi(e.target.value);
  const handleLogout = () => signOut(auth);

  const orgRoles = useMemo(() => ifsiData?.roles || [], [ifsiData]);
  const manualUsers = useMemo(() => ifsiData?.manualUsers || [], [ifsiData]);
  const orgAccounts = useMemo(() => teamUsers.filter(u => u.etablissementId === selectedIfsi), [teamUsers, selectedIfsi]);
  const allIfsiMembers = useMemo(() => [
    ...orgAccounts.map(u => ({ id: u.id, name: u.email.split('@')[0], roles: u.orgRoles || [], type: 'account' })),
    ...manualUsers.map(u => ({ id: u.id, name: u.name, roles: u.roles || [], type: 'manual' }))
  ].sort((a,b) => a.name.localeCompare(b.name)), [orgAccounts, manualUsers]);

  const getRoleColor = (roleName) => {
    if (roleName === "Direction") return { bg: "#1e3a5f", border: "#0f172a", text: "#ffffff" };
    const idx = orgRoles.indexOf(roleName);
    return ROLE_PALETTE[idx % ROLE_PALETTE.length] || ROLE_PALETTE[7];
  };

  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet" />
      <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .td-dash:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: 0.2s; }`}</style>

      {modalCritere && (
        <DetailModal 
          critere={modalCritere} onClose={() => setModalCritere(null)} 
          onSave={saveModal} onAutoSave={handleAutoSave}
          isReadOnly={currentCampaign?.locked} isAuditMode={isAuditMode} 
          allMembers={allIfsiMembers} rolePalette={ROLE_PALETTE} orgRoles={orgRoles} 
          hasPrev={filtered.findIndex(c => c.id === modalCritere.id) > 0} 
          hasNext={filtered.findIndex(c => c.id === modalCritere.id) < filtered.length - 1} 
        />
      )}

      {/* NAV */}
      <div className="no-print" style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "10px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <span style={{ fontWeight: "900", color: "#1d4ed8", fontSize: "20px" }}>QualiForma</span>
          {userProfile?.role === "superadmin" ? (
            <select value={selectedIfsi || ""} onChange={handleIfsiSwitch} style={{ padding: "6px", borderRadius: "6px", border: "1px solid #ddd" }}>
              {ifsiList.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          ) : <span style={{ fontWeight: "bold" }}>{ifsiList.find(i=>i.id===selectedIfsi)?.name}</span>}
        </div>
        <div style={{ display: "flex", gap: "5px" }}>
          <button style={navBtn(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}>Tableau de bord</button>
          <button style={navBtn(activeTab === "criteres")} onClick={() => setActiveTab("criteres")}>Indicateurs</button>
          <button style={navBtn(activeTab === "organigramme")} onClick={() => setActiveTab("organigramme")}>Organigramme</button>
          {userProfile?.role === "superadmin" && <button style={navBtn(activeTab === "backups")} onClick={() => setActiveTab("backups")}>⏳ Backups</button>}
          <button onClick={exportToExcel} style={{ ...navBtn(false), color: "#059669" }}>📊 Excel</button>
          <button onClick={handleLogout} style={{ ...navBtn(false), color: "#ef4444" }}>Quitter</button>
        </div>
      </div>

      <div className="animate-fade-in" style={{ maxWidth: "1440px", margin: "0 auto", padding: "30px" }}>
        {activeTab === "dashboard" && <DashboardTab bannerConfig={{ bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", icon: "🗓️" }} currentAuditDate={currentCampaign?.auditDate || ""} isArchive={currentCampaign?.locked} stats={stats} urgents={urgents} criteres={criteres} userProfile={userProfile} />}
        {activeTab === "criteres" && <CriteresTab searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterStatut={filterStatut} setFilterStatut={setFilterStatut} filterCritere={filterCritere} setFilterCritere={setFilterCritere} filtered={filtered} days={days} today={today} dayColor={dayColor} setModalCritere={setModalCritere} isArchive={currentCampaign?.locked} />}
        {activeTab === "organigramme" && <OrganigrammeTab currentIfsiName={ifsiList.find(i=>i.id===selectedIfsi)?.name} orgRoles={orgRoles} allIfsiMembers={allIfsiMembers} getRoleColor={getRoleColor} handleDragOverOrg={e=>e.preventDefault()} handleDropOrg={(e,r)=> {/*...*/} } handleDragStartOrg={(e,t,id)=>{/*...*/}} removeRoleFromUser={()=>{}} editOrgRole={()=>{}} editManualUser={()=>{}} deleteManualUser={()=>{}} addManualUser={()=>{}} addOrgRole={()=>{}} newManualUserInput="" setNewManualUserInput={()=>{}} newRoleInput="" setNewRoleInput={()=>{}} deleteOrgRole={()=>{}} applyDefaultRoles={()=>{}} />}
        {activeTab === "backups" && <BackupsTab backupsList={backupsList} handleRestoreBackup={handleRestoreBackup} />}
        {activeTab === "equipe" && <EquipeTab userProfile={userProfile} sortedTeamUsers={teamUsers} teamSortConfig={teamSortConfig} handleSortTeam={handleSortTeam} auth={auth} handleSendResetEmail={handleSendResetEmail} />}
        {activeTab === "compte" && <CompteTab auth={auth} userProfile={userProfile} pwdUpdate={pwdUpdate} setPwdUpdate={setPwdUpdate} handleChangePassword={()=>{}} />}
      </div>
    </div>
  );
}

export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }
