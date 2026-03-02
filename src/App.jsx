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
        await loadUserDataAndContent(user);
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
      // 1. Récupération du profil utilisateur
      const userDoc = await getDoc(doc(db, "users", user.uid));
      let etablissementId = "demo_ifps_cham";
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile(userData);
        etablissementId = userData.etablissementId || etablissementId;
      }

      // 2. Récupération du tiroir de l'établissement
      const etabRef = getEtablissementRef(etablissementId);
      let snap = await getDoc(etabRef);

      // --- LOGIQUE DE MIGRATION CIBLÉE ---
      // Si le nouveau tiroir est vide, on va chercher le document "criteres" dans la collection "qualiopi"
      if (!snap.exists() || !snap.data()?.campaigns) {
        console.log("Migration QualiForma en cours...");
        const oldSnap = await getDoc(doc(db, "qualiopi", "criteres")); 
        
        if (oldSnap.exists()) {
          const oldData = oldSnap.data();
          // On crée la structure de campagne à partir de ton ancien document
          const migratedCampaign = [{
            id: oldData.id || Date.now().toString(),
            name: oldData.name || "Évaluation migrée",
            auditDate: oldData.auditDate || "2026-10-15",
            liste: oldData.liste || [],
            locked: false,
            updatedAt: oldData.updatedAt || new Date().toISOString()
          }];

          await setDoc(etabRef, { 
            campaigns: migratedCampaign, 
            updatedAt: new Date().toISOString(),
            nom: "IFPS du CHAM" 
          }, { merge: true });
          
          snap = await getDoc(etabRef);
        }
      }

      // 3. Initialisation des données
      if (snap.exists() && snap.data()?.campaigns) {
        const d = snap.data();
        setCampaigns(d.campaigns); 
        setActiveCampaignId(d.campaigns[d.campaigns.length - 1].id);
      } else {
        initDefault();
      }
      setAuthChecked(true);
    } catch (e) {
      console.error("Erreur fatale migration:", e);
      initDefault();
      setAuthChecked(true);
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
  if (!campaigns || !activeCampaignId) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>⏳ Chargement de QualiForma...</div>;

  const currentCampaign = campaigns.find(c => c.id === activeCampaignId) || campaigns[0];
  const criteres = currentCampaign.liste || [];
  const isArchive = currentCampaign.locked || false;

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
      }} isReadOnly={isArchive} isAuditMode={isAuditMode} />}

      <header style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 32px", height: "70px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#1d4ed8"/><stop offset="1" stopColor="#3b82f6"/></linearGradient></defs><path d="M11 2C6 2 2 6 2 11s4 9 9 9 9-4 9-9-4-9-9-9zm0 16c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7z" fill="url(#g)"/><path d="M10.5 14.5l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4-6 6z" fill="url(#g)"/></svg>
           <h1 style={{ fontSize: "18px", fontWeight: "800" }}>QualiForma</h1>
        </div>
        <nav style={{ display: "flex", gap: "5px", background: "#f1f5f9", padding: "4px", borderRadius: "10px" }}>
          {["dashboard", "criteres"].map(t => <button key={t} style={navBtn(activeTab === t)} onClick={() => setActiveTab(t)}>{t.toUpperCase()}</button>)}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
           <div style={{ textAlign: "right", fontSize: "11px", color: "#64748b" }}>
              <div style={{ fontWeight: "800", color: "#1e3a5f" }}>{userProfile?.role === 'superadmin' ? '🛡️ Admin' : '👤 Utilisateur'}</div>
              <div>{userProfile?.etablissementId}</div>
           </div>
           <button onClick={handleLogout} style={{ background: "#fee2e2", color: "#ef4444", border: "none", padding: "8px 15px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>Déconnexion</button>
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        {activeTab === "dashboard" && (
          <div style={{ display: "grid", gap: "30px" }}>
            <div style={{ background: "white", padding: "30px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "800", margin: 0 }}>Tableau de bord</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "5px 0 0" }}>Pilotage Qualiopi - {currentCampaign.name}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#1d4ed8" }}>{Math.round((stats.conforme / stats.total) * 100)}%</div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Taux de réussite</div>
                </div>
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
             <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "10px" }}>
               <input placeholder="Rechercher un indicateur..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, padding: "10px 15px", borderRadius: "10px", border: "1px solid #e2e8f0", outline: "none", fontSize: "14px" }} />
             </div>
             <table style={{ width: "100%", borderCollapse: "collapse" }}>
               <thead>
                 <tr style={{ background: "#f8fafc", textAlign: "left" }}>
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
                         <span style={{ minWidth: "35px", height: "35px", background: "#eff6ff", color: "#1d4ed8", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "13px" }}>{c.num || c.id}</span>
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
