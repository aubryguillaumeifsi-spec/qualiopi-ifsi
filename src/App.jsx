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
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>Sauvegarde automatique quotidienne et avant import. Les données de plus de 10 jours sont supprimées.</p>
          </div>
          {backupsList.length === 0 ? (
              <div style={{ background: "white", padding: "40px", textAlign: "center", borderRadius: "14px", border: "1px dashed #cbd5e1", color: "#9ca3af", fontStyle: "italic" }}>Coffre-fort vide.</div>
          ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {backupsList.map((b) => (
                      <div key={b.id} className="td-dash" style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#1e3a5f" }}>{b.type}</div>
                                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>{new Date(b.timestamp).toLocaleString("fr-FR")}</div>
                          </div>
                          <button onClick={() => handleRestoreBackup(b)} style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fca5a5", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Restaurer</button>
                      </div>
                  ))}
              </div>
          )}
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
  const [importReport, setImportReport] = useState(null);
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
        // 👮 DOUANE : On vérifie l'email
        if (!user.emailVerified) {
          setIsLoggedIn(true);
          setActiveTab("validation_requise");
        } else {
          setIsLoggedIn(true);
          setActiveTab("dashboard");
        }
        
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
    if (window.confirm(`⚠️ Restaurer toute la base de données à l'état du ${new Date(backup.timestamp).toLocaleString()} ?`)) {
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
    const total = criteres.filter(c => c.statut !== "non-concerne").length || 1;
    return {
      stats: { total, conforme: criteres.filter(c => c.statut === "conforme").length, enCours: criteres.filter(c => c.statut === "en-cours").length, nonConforme: criteres.filter(c => c.statut === "non-conforme").length, nonEvalue: criteres.filter(c => c.statut === "non-evalue").length, nonConcerne: criteres.filter(c => c.statut === "non-concerne").length },
      urgents: criteres.filter(c => days(c.delai) <= 30 && c.statut !== "conforme" && c.statut !== "non-concerne"),
      filtered: filt,
      axes: criteres.filter(c => ["non-conforme", "en-cours"].includes(c.statut)).sort((a, b) => ({"non-conforme":0,"en-cours":1}[a.statut] - {"non-conforme":0,"en-cours":1}[b.statut]))
    };
  }, [criteres, filterStatut, filterCritere, searchTerm]);

  const byPerson = useMemo(() => allIfsiMembers.map(m => ({ ...m, items: criteres.filter(c => c.responsables?.includes(m.name)) })).filter(p => p.items.length > 0 || p.roles.length > 0), [allIfsiMembers, criteres]);

  const handleSortTeam = (key) => { let direction = "asc"; if (teamSortConfig.key === key && teamSortConfig.direction === "asc") direction = "desc"; setTeamSortConfig({ key, direction }); };
  const handleIfsiSwitch = async (e) => { if (e.target.value === "NEW") { const nom = prompt("Nom de l'établissement :"); if (nom?.trim()) { const id = nom.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(Math.random() * 1000); await setDoc(doc(db, "etablissements", id), { name: nom.trim(), roles: DEFAULT_ROLES, archived: false }); setSelectedIfsi(id); } } else { setSelectedIfsi(e.target.value); } };
  const handleLogout = () => { signOut(auth); };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!window.confirm("⚠️ Écraser les données par le fichier Excel ?")) return;
    try {
      const arrayBuffer = await file.arrayBuffer(); const workbook = new window.ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer); const worksheet = workbook.worksheets[0];
      await createManualBackup("Avant Import Excel", campaigns);
      let updatedCriteres = [...criteres]; let count = 0; let newlyDiscoveredUsers = new Set();
      const existingNamesList = allIfsiMembers.map(m => m.name.toLowerCase());
      const getCellText = (cell) => {
        if (!cell || cell.value === null || cell.value === undefined) return "";
        if (typeof cell.value === "object" && cell.value.richText) return cell.value.richText.map(t => t.text).join("");
        return String(cell.text || cell.value || "");
      };
      const normalize = str => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; let numRaw = getCellText(row.getCell(1)).trim(); if (!numRaw) return;
        const numClean = numRaw.replace(/[^\d]/g, ''); const index = updatedCriteres.findIndex(c => String(c.num) === numClean || String(c.num) === numRaw);
        if (index !== -1) {
          const statutText = getCellText(row.getCell(4)).trim();
          let statutKey = updatedCriteres[index].statut;
          if (statutText) { const found = Object.entries(STATUT_CONFIG).find(([k,v]) => normalize(v.label) === normalize(statutText)); if (found) statutKey = found[0]; }
          const respText = getCellText(row.getCell(6));
          let responsables = updatedCriteres[index].responsables || [];
          if (respText) { responsables = respText.split(',').map(s => s.trim()).filter(s => s); responsables.forEach(r => { if (!existingNamesList.includes(r.toLowerCase())) newlyDiscoveredUsers.add(r); }); }
          updatedCriteres[index] = { ...updatedCriteres[index], statut: statutKey, responsables: responsables, preuves: getCellText(row.getCell(7)) || updatedCriteres[index].preuves, notes: getCellText(row.getCell(10)) || updatedCriteres[index].notes };
          count++;
        }
      });
      if (newlyDiscoveredUsers.size > 0) {
        const newManuals = Array.from(newlyDiscoveredUsers).map(n => ({ id: 'm_'+Date.now()+Math.random(), name: n, roles: [] }));
        const snap = await getDoc(doc(db, "etablissements", selectedIfsi));
        if (snap.exists()) await setDoc(doc(db, "etablissements", selectedIfsi), { manualUsers: [...(snap.data().manualUsers || []), ...newManuals] }, { merge: true });
      }
      saveData(campaigns.map(c => c.id === activeCampaignId ? { ...c, liste: updatedCriteres } : c));
      alert(`✅ Import réussi : ${count} indicateurs.`);
    } catch (error) { alert(error.message); }
    e.target.value = null;
  };

  const navBtn = active => ({ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", background: active ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "transparent", color: active ? "white" : "#4b5563", whiteSpace: "nowrap" });

  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;

  // 👮 ÉCRAN DE BLOCAGE EMAIL NON VALIDÉ
  if (activeTab === "validation_requise") {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "20px", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "Outfit, sans-serif" }}>
        <div className="animate-fade-in" style={{ background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", maxWidth: "500px", width: "100%", textAlign: "center" }}>
           <div style={{ fontSize: "50px", marginBottom: "20px" }}>✉️</div>
           <h2 style={{ color: "#1e3a5f", margin: "0 0 10px 0" }}>Vérification de l'email</h2>
           <p style={{ color: "#64748b", marginBottom: "30px", fontSize: "15px", lineHeight: "1.6" }}>
             Un e-mail de confirmation a été envoyé à <strong>{auth.currentUser?.email}</strong>.<br/><br/>
             Veuillez cliquer sur le lien dans l'e-mail pour activer votre compte QualiForma.
           </p>
           {verificationSent ? (
             <div style={{ background: "#f0fdf4", color: "#166534", padding: "12px", borderRadius: "8px", fontSize: "14px", fontWeight: "bold", marginBottom: "20px" }}>✅ Nouveau lien envoyé !</div>
           ) : (
             <button onClick={handleResendVerification} style={{ width: "100%", padding: "12px", background: "#1d4ed8", color: "white", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer", marginBottom: "12px" }}>Renvoyer l'e-mail de confirmation</button>
           )}
           <button onClick={() => window.location.reload()} style={{ width: "100%", padding: "12px", background: "#f1f5f9", color: "#1e3a5f", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer", marginBottom: "12px" }}>J'ai validé mon mail (Actualiser)</button>
           <button onClick={handleLogout} style={{ width: "100%", padding: "12px", background: "transparent", color: "#ef4444", border: "1px solid #fca5a5", borderRadius: "8px", cursor: "pointer" }}>Se déconnecter</button>
        </div>
      </div>
    );
  }

  // 👉 ÉCRAN DE BLOCAGE CHANGEMENT DE MOT DE PASSE OBLIGATOIRE
  if (userProfile?.mustChangePassword) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "20px", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "Outfit, sans-serif" }}>
        <div className="animate-fade-in" style={{ background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", maxWidth: "500px", width: "100%" }}>
           <div style={{ textAlign: "center", fontSize: "40px", marginBottom: "10px" }}>🔒</div>
           <h2 style={{ color: "#ef4444", textAlign: "center", margin: "0 0 10px 0" }}>Sécurité du compte</h2>
           <p style={{ textAlign: "center", color: "#64748b", marginBottom: "30px", fontSize: "14px", lineHeight: "1.5" }}>C'est votre première connexion. Vous devez créer votre propre mot de passe pour accéder aux données.</p>
           <CompteTab auth={auth} userProfile={userProfile} pwdUpdate={pwdUpdate} setPwdUpdate={setPwdUpdate} handleChangePassword={(e) => handleChangePassword(e, true)} />
           <button onClick={handleLogout} style={{ marginTop: "20px", width: "100%", padding: "12px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Se déconnecter</button>
        </div>
      </div>
    );
  }

  const currentIfsiName = ifsiList.find(i => i.id === selectedIfsi)?.name || "Chargement...";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif", color: "#1e3a5f" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @media print { .no-print { display: none !important; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .responsive-grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
        .responsive-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 1024px) { .responsive-grid-5 { grid-template-columns: 1fr 1fr; } .responsive-grid-2 { grid-template-columns: 1fr; } }
        .td-dash:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      `}</style>

      {modalCritere && (
        <DetailModal critere={modalCritere} onClose={() => setModalCritere(null)} onSave={saveModal} onAutoSave={handleAutoSave} isReadOnly={isArchive} isAuditMode={isAuditMode} allMembers={allIfsiMembers} rolePalette={ROLE_PALETTE} orgRoles={orgRoles} hasPrev={filtered.findIndex(c => c.id === modalCritere.id) > 0} hasNext={filtered.findIndex(c => c.id === modalCritere.id) < filtered.length - 1} />
      )}

      {/* NAVIGATION */}
      <div className="no-print" style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 32px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", maxWidth: "1440px", margin: "0 auto", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div onClick={() => setActiveTab("dashboard")} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              <span style={{ fontSize: "22px", fontWeight: "900", color: "#1d4ed8" }}>Q</span>
              <span style={{ fontSize: "18px", fontWeight: "800", color: "#1e3a5f" }}>QualiForma</span>
            </div>
            {userProfile?.role === "superadmin" ? (
              <select value={selectedIfsi || ""} onChange={handleIfsiSwitch} style={{ padding: "6px", borderRadius: "6px", border: "1px solid #d1d5db", fontWeight: "800", color: "#1d4ed8" }}>
                {ifsiList.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                <option value="NEW">+ Nouveau</option>
              </select>
            ) : (
              <div style={{ padding: "6px 12px", borderRadius: "6px", background: "#eff6ff", border: "1px solid #bfdbfe", fontWeight: "800", color: "#1d4ed8", fontSize: "14px" }}>{currentIfsiName}</div>
            )}
          </div>

          <div style={{ display: "flex", gap: "4px", flex: 1, justifyContent: "center" }}>
            {userProfile?.role === "superadmin" && <button style={navBtn(activeTab === "tour_controle")} onClick={() => setActiveTab("tour_controle")}>🛸 Superadmin</button>}
            <button style={navBtn(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}>Tableau de bord</button>
            <button style={navBtn(activeTab === "criteres")} onClick={() => setActiveTab("criteres")}>Indicateurs</button>
            <button style={navBtn(activeTab === "axes")} onClick={() => setActiveTab("axes")}>Priorités</button>
            <button style={navBtn(activeTab === "responsables")} onClick={() => setActiveTab("responsables")}>Responsables</button>
            <button style={navBtn(activeTab === "livre_blanc")} onClick={() => setActiveTab("livre_blanc")}>Livre Blanc</button>
            {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && <button style={navBtn(activeTab === "organigramme")} onClick={() => setActiveTab("organigramme")}>🌳 Organigramme</button>}
            {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && <button style={navBtn(activeTab === "equipe")} onClick={() => setActiveTab("equipe")}>👥 Comptes</button>}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {userProfile?.role === "superadmin" && <button onClick={() => setActiveTab("backups")} style={navBtn(activeTab === "backups")}>⏳ Backups</button>}
            {userProfile?.role === "superadmin" && !isArchive && (
              <>
                <input type="file" id="import-excel" accept=".xlsx" style={{ display: 'none' }} onChange={handleImportExcel} />
                <label htmlFor="import-excel" style={{ ...navBtn(false), background: "white", border: "1px solid #d1d5db", cursor: "pointer" }}>📥 Importer</label>
              </>
            )}
            <button onClick={exportToExcel} style={{ ...navBtn(false), color: "#059669", background: "#d1fae5" }}>📊 Excel</button>
            <button onClick={() => setActiveTab("compte")} style={{ border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: "6px", background: "white", cursor: "pointer" }}>⚙️</button>
            <button onClick={handleLogout} style={{ color: "#ef4444", border: "1px solid #fca5a5", padding: "6px 12px", borderRadius: "6px", background: "#fef2f2", cursor: "pointer", fontWeight: "bold" }}>Quitter</button>
          </div>
        </div>
      </div>

      <div className="animate-fade-in" style={{ maxWidth: "1440px", margin: "0 auto", padding: "28px 32px" }}>
        {activeTab === "backups" && <BackupsTab backupsList={backupsList} handleRestoreBackup={handleRestoreBackup} />}
        {activeTab === "dashboard" && campaigns && <DashboardTab bannerConfig={{ bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", icon: "🗓️" }} currentAuditDate={currentAuditDate} isArchive={isArchive} handleEditAuditDate={handleEditAuditDate} stats={stats} urgents={urgents} criteres={criteres} userProfile={userProfile} />}
        {activeTab === "tour_controle" && <TourControleTab globalScore={tourData.score} activeIfsis={tourData.active} totalUsersInNetwork={teamUsers.length} topAlerts={tourData.alerts} sortedTourIfsis={sortedTourIfsis} setSelectedIfsi={setSelectedIfsi} archivedIfsis={tourData.archived} today={today} handleRenameIfsi={handleRenameIfsi} handleArchiveIfsi={handleArchiveIfsi} handleHardDeleteIfsi={handleHardDeleteIfsi} setActiveTab={setActiveTab} tourSort={tourSort} setTourSort={setTourSort} totalAlertsCount={tourData.alerts.length} />}
        {activeTab === "organigramme" && <OrganigrammeTab currentIfsiName={currentIfsiName} orgRoles={orgRoles} allIfsiMembers={allIfsiMembers} getRoleColor={getRoleColor} handleDragOverOrg={handleDragOverOrg} handleDropOrg={handleDropOrg} handleDragStartOrg={handleDragStartOrg} removeRoleFromUser={removeRoleFromUser} editOrgRole={editOrgRole} editManualUser={editManualUser} deleteManualUser={deleteManualUser} addManualUser={addManualUser} addOrgRole={addOrgRole} newManualUserInput={newManualUserInput} setNewManualUserInput={setNewManualUserInput} newRoleInput={newRoleInput} setNewRoleInput={setNewRoleInput} deleteOrgRole={deleteOrgRole} applyDefaultRoles={applyDefaultRoles} />}
        {activeTab === "criteres" && <CriteresTab searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterStatut={filterStatut} setFilterStatut={setFilterStatut} filterCritere={filterCritere} setFilterCritere={setFilterCritere} filtered={filtered} days={days} today={today} dayColor={dayColor} setModalCritere={setModalCritere} isArchive={isArchive} />}
        {activeTab === "axes" && <AxesTab axes={axes} days={days} today={today} dayColor={dayColor} setModalCritere={setModalCritere} isArchive={isArchive} isAuditMode={isAuditMode} />}
        {activeTab === "responsables" && <ResponsablesTab byPerson={byPerson} setModalCritere={setModalCritere} isArchive={isArchive} getRoleColor={getRoleColor} />}
        {activeTab === "livre_blanc" && <LivreBlancTab currentIfsiName={currentIfsiName} currentCampaign={currentCampaign} criteres={criteres} />}
        {activeTab === "equipe" && <EquipeTab userProfile={userProfile} newMember={newMember} setNewMember={setNewMember} isCreatingUser={isCreatingUser} handleCreateUser={handleCreateUser} selectedIfsi={selectedIfsi} ifsiList={ifsiList} teamSearchTerm={teamSearchTerm} setTeamSearchTerm={setTeamSearchTerm} sortedTeamUsers={sortedTeamUsers} teamSortConfig={teamSortConfig} handleSortTeam={handleSortTeam} handleDeleteUser={handleDeleteUser} auth={auth} handleSendResetEmail={handleSendResetEmail} />}
        {activeTab === "compte" && <CompteTab auth={auth} userProfile={userProfile} pwdUpdate={pwdUpdate} setPwdUpdate={setPwdUpdate} handleChangePassword={handleChangePassword} />}
      </div>
    </div>
  );
}

export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }
