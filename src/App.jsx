import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";
import { useState, useEffect } from "react";
import { getDoc, setDoc, doc } from "firebase/firestore"; 
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, getEtablissementRef } from "./firebase";
import { DEFAULT_CRITERES, CRITERES_LABELS, STATUT_CONFIG, ROLE_COLORS } from "./data";

// --- COMPOSANTS UI ---
function StatusBadge({ statut }) {
  const s = STATUT_CONFIG[statut] || STATUT_CONFIG["non-evalue"];
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>{s.label}</span>;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [campaigns, setCampaigns] = useState(null);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterCritere, setFilterCritere] = useState("tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalCritere, setModalCritere] = useState(null);
  const [isAuditMode, setIsAuditMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        // On attend un tout petit peu pour laisser la connexion s'établir
        setTimeout(() => loadUserDataAndContent(user), 500);
      } else {
        setIsLoggedIn(false);
        setUserProfile(null);
        setAuthChecked(true);
      }
    });
    return () => unsubscribe();
  }, []);

  async function loadUserDataAndContent(user) {
    try {
      console.log("Tentative de chargement pour UID:", user.uid);
      
      // 1. Récupération du profil utilisateur
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      
      let etablissementId = "demo_ifps_cham";
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserProfile(userData);
        etablissementId = userData.etablissementId || etablissementId;
        console.log("Profil trouvé. Etablissement:", etablissementId);
      } else {
        console.warn("Document utilisateur absent dans Firestore. Utilisation du mode démo.");
      }

      // 2. Récupération des données Qualiopi
      const etabRef = getEtablissementRef(etablissementId);
      let snap = await getDoc(etabRef);

      // --- LOGIQUE DE MIGRATION ---
      if (!snap.exists() || !snap.data()?.campaigns) {
        console.log("Nouveau tiroir détecté. Recherche de l'ancienne collection qualiopi...");
        const oldSnap = await getDoc(doc(db, "qualiopi", "criteres")); 
        
        if (oldSnap.exists()) {
          const oldData = oldSnap.data();
          const migratedCampaign = [{
            id: oldData.id || Date.now().toString(),
            name: oldData.name || "Migration QualiForma",
            auditDate: oldData.auditDate || "2026-10-15",
            liste: oldData.liste || [],
            locked: false
          }];

          await setDoc(etabRef, { 
            campaigns: migratedCampaign, 
            updatedAt: new Date().toISOString(),
            nom: "IFPS du CHAM" 
          }, { merge: true });
          
          snap = await getDoc(etabRef);
        }
      }

      // 3. Affichage
      if (snap.exists() && snap.data()?.campaigns) {
        setCampaigns(snap.data().campaigns); 
        setActiveCampaignId(snap.data().campaigns[snap.data().campaigns.length - 1].id);
      } else {
        initDefault();
      }
      setAuthChecked(true);
    } catch (e) {
      console.error("Erreur technique:", e);
      // Si on a l'erreur "Offline", on réessaie une fois après 2 secondes
      if (e.message.includes("offline")) {
        console.log("Tentative de reconnexion dans 2s...");
        setTimeout(() => loadUserDataAndContent(user), 2000);
      } else {
        initDefault();
        setAuthChecked(true);
      }
    }
  }

  function initDefault() {
    const def = [{ id: Date.now().toString(), name: "Évaluation initiale", auditDate: "2026-10-15", liste: DEFAULT_CRITERES, locked: false }];
    setCampaigns(def); setActiveCampaignId(def[0].id);
  }

  async function saveData(newCampaigns) {
    if (!userProfile?.etablissementId) return;
    setCampaigns(newCampaigns); setSaveStatus("saving");
    try {
      const etabRef = getEtablissementRef(userProfile.etablissementId);
      await setDoc(etabRef, { campaigns: newCampaigns, updatedAt: new Date().toISOString() }, { merge: true });
      setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  const handleLogout = () => signOut(auth);

  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;
  if (!campaigns || !activeCampaignId) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>⏳ Initialisation de la connexion sécurisée...</div>;

  const currentCampaign = campaigns.find(c => c.id === activeCampaignId) || campaigns[0];
  const criteres = currentCampaign.liste || [];

  const stats = {
    total: criteres.filter(c => c.statut !== "non-concerne").length || 1,
    conforme: criteres.filter(c => c.statut === "conforme").length,
    enCours: criteres.filter(c => c.statut === "en-cours").length,
    nonConforme: criteres.filter(c => c.statut === "non-conforme").length,
    nonEvalue: criteres.filter(c => c.statut === "non-evalue").length
  };

  const filtered = criteres.filter(c => {
    if (filterStatut !== "tous" && c.statut !== filterStatut) return false;
    if (filterCritere !== "tous" && c.critere !== parseInt(filterCritere)) return false;
    if (searchTerm && !c.titre.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const navBtn = active => ({ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "700", background: active ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "transparent", color: active ? "white" : "#64748b" });

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif", color: "#1e3a5f" }}>
      {modalCritere && <DetailModal critere={modalCritere} onClose={() => setModalCritere(null)} onSave={(upd) => {
        const newListe = criteres.map(c => c.id === upd.id ? upd : c);
        saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp));
        setModalCritere(null);
      }} isReadOnly={currentCampaign.locked} isAuditMode={isAuditMode} />}

      <header style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 32px", height: "70px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#1d4ed8"/><stop offset="1" stopColor="#3b82f6"/></linearGradient></defs><circle cx="11" cy="11" r="9" stroke="url(#g)" strokeWidth="2"/><path d="M11 7v4l3 2" stroke="url(#g)" strokeWidth="2" strokeLinecap="round"/></svg>
           <h1 style={{ fontSize: "18px", fontWeight: "800" }}>QualiForma</h1>
        </div>
        <nav style={{ display: "flex", gap: "5px", background: "#f1f5f9", padding: "4px", borderRadius: "10px" }}>
          {["dashboard", "criteres"].map(t => <button key={t} style={navBtn(activeTab === t)} onClick={() => setActiveTab(t)}>{t.toUpperCase()}</button>)}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
           <div style={{ textAlign: "right", fontSize: "11px", color: "#64748b" }}>
              <div style={{ fontWeight: "800", color: "#1e3a5f" }}>{userProfile?.role?.toUpperCase() || 'INVITÉ'}</div>
              <div>{userProfile?.etablissementId || 'Démo'}</div>
           </div>
           <button onClick={handleLogout} style={{ background: "#fee2e2", color: "#ef4444", border: "none", padding: "8px 15px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>Déconnexion</button>
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        {activeTab === "dashboard" && (
          <div style={{ display: "grid", gap: "30px" }}>
            <div style={{ background: "white", padding: "30px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "800", margin: 0 }}>Tableau de bord - {currentCampaign.name}</h2>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", marginBottom: "10px" }}>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#64748b" }}>Progression Globale</span>
                <span style={{ fontSize: "24px", fontWeight: "900", color: "#1d4ed8" }}>{Math.round((stats.conforme / stats.total) * 100)}%</span>
              </div>
              <div style={{ height: "12px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${(stats.conforme / stats.total) * 100}%`, background: "#10b981", transition: "width 1s ease" }} />
                <div style={{ width: `${(stats.enCours / stats.total) * 100}%`, background: "#f59e0b", transition: "width 1s ease" }} />
                <div style={{ width: `${(stats.nonConforme / stats.total) * 100}%`, background: "#ef4444", transition: "width 1s ease" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
               {[["Conformes", stats.conforme, "#10b981"], ["En cours", stats.enCours, "#f59e0b"], ["À évaluer", stats.nonEvalue, "#94a3b8"], ["Non conformes", stats.nonConforme, "#ef4444"]].map(([l, v, c]) => (
                 <div key={l} style={{ background: "white", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                   <div style={{ color: c, fontSize: "32px", fontWeight: "900" }}>{v}</div>
                   <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", marginTop: "5px" }}>{l}</div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === "criteres" && (
          <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
             <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9" }}>
               <input placeholder="Filtrer les indicateurs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px 15px", borderRadius: "10px", border: "1px solid #e2e8f0", outline: "none", fontSize: "14px" }} />
             </div>
             <table style={{ width: "100%", borderCollapse: "collapse" }}>
               <thead style={{ background: "#f8fafc", textAlign: "left" }}>
                 <tr>
                   <th style={{ padding: "15px 20px", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>Indicateur</th>
                   <th style={{ padding: "15px 20px", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>Statut</th>
                   <th style={{ padding: "15px 20px", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", textAlign: "center" }}>Action</th>
                 </tr>
               </thead>
               <tbody>
                 {filtered.map(c => (
                   <tr key={c.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                     <td style={{ padding: "20px" }}>
                       <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                         <span style={{ minWidth: "35px", height: "35px", background: "#eff6ff", color: "#1d4ed8", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "13px" }}>{c.num}</span>
                         <span style={{ fontSize: "14px", fontWeight: "600", color: "#334155" }}>{c.titre}</span>
                       </div>
                     </td>
                     <td style={{ padding: "20px" }}><StatusBadge statut={c.statut} /></td>
                     <td style={{ padding: "20px", textAlign: "center" }}>
                       <button onClick={() => setModalCritere(c)} style={{ padding: "8px 16px", borderRadius: "8px", background: "#1d4ed8", color: "white", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>Éditer</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}
      </main>
    </div>
  );
}
