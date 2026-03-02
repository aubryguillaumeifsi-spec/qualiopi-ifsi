import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";
import { useState, useEffect } from "react";
import { getDoc, setDoc, doc } from "firebase/firestore"; 
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, getEtablissementRef } from "./firebase";
import { DEFAULT_CRITERES, STATUT_CONFIG } from "./data";

// --- COMPOSANT BADGE ---
function StatusBadge({ statut }) {
  const s = STATUT_CONFIG[statut] || STATUT_CONFIG["non-evalue"];
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: "700" }}>{s.label}</span>;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [campaigns, setCampaigns] = useState(null);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalCritere, setModalCritere] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        loadUserDataAndContent(user);
      } else {
        setIsLoggedIn(false);
        setAuthChecked(true);
      }
    });
    return () => unsubscribe();
  }, []);

  async function loadUserDataAndContent(user) {
    try {
      // 1. Charger le profil
      const userSnap = await getDoc(doc(db, "users", user.uid));
      let etablissementId = userSnap.exists() ? userSnap.data().etablissementId : "demo_ifps_cham";
      if(userSnap.exists()) setUserProfile(userSnap.data());

      // 2. Tenter de charger les données de l'établissement
      const etabRef = getEtablissementRef(etablissementId);
      const snap = await getDoc(etabRef);

      if (snap.exists() && snap.data().campaigns) {
        setCampaigns(snap.data().campaigns);
        setActiveCampaignId(snap.data().campaigns[snap.data().campaigns.length - 1].id);
      } else {
        // 3. MIGRATION MANUELLE SI VIDE : On cherche dans qualiopi / criteres
        const oldSnap = await getDoc(doc(db, "qualiopi", "criteres"));
        if (oldSnap.exists() && oldSnap.data().liste) {
          const migrated = [{
            id: Date.now().toString(),
            name: "Données Importées",
            auditDate: "2026-10-15",
            liste: oldSnap.data().liste,
            locked: false
          }];
          await setDoc(etabRef, { campaigns: migrated, nom: "IFPS du CHAM" }, { merge: true });
          setCampaigns(migrated);
          setActiveCampaignId(migrated[0].id);
        } else {
          initDefault();
        }
      }
    } catch (e) {
      console.error("Erreur de chargement:", e);
      initDefault();
    } finally {
      setAuthChecked(true);
    }
  }

  function initDefault() {
    const def = [{ id: "1", name: "Évaluation initiale", auditDate: "2026-10-15", liste: DEFAULT_CRITERES, locked: false }];
    setCampaigns(def);
    setActiveCampaignId("1");
  }

  async function saveData(newCampaigns) {
    setCampaigns(newCampaigns);
    const id = userProfile?.etablissementId || "demo_ifps_cham";
    try {
      await setDoc(getEtablissementRef(id), { campaigns: newCampaigns }, { merge: true });
    } catch (e) { console.error(e); }
  }

  if (!authChecked) return <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', fontFamily:'Outfit'}}>Connexion en cours...</div>;
  if (!isLoggedIn) return <LoginPage />;
  if (!campaigns) return null;

  const currentCampaign = campaigns.find(c => c.id === activeCampaignId) || campaigns[0];
  const criteres = currentCampaign.liste || [];
  const stats = {
    total: criteres.length || 1,
    conforme: criteres.filter(c => c.statut === "conforme").length,
    enCours: criteres.filter(c => c.statut === "en-cours").length,
    nonConforme: criteres.filter(c => c.statut === "non-conforme").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif" }}>
      {modalCritere && <DetailModal critere={modalCritere} onClose={() => setModalCritere(null)} onSave={(upd) => {
        const newListe = criteres.map(c => c.id === upd.id ? upd : c);
        saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp));
        setModalCritere(null);
      }} isReadOnly={currentCampaign.locked} />}

      <header style={{ background: "white", padding: "15px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
        <h1 style={{ fontSize: "18px", fontWeight: "800", color: "#1d4ed8", margin: 0 }}>QualiForma</h1>
        <nav style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setActiveTab("dashboard")} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: activeTab === "dashboard" ? "#1d4ed8" : "#f1f5f9", color: activeTab === "dashboard" ? "white" : "#64748b", cursor: "pointer", fontWeight: "700" }}>Dashboard</button>
          <button onClick={() => setActiveTab("criteres")} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: activeTab === "criteres" ? "#1d4ed8" : "#f1f5f9", color: activeTab === "criteres" ? "white" : "#64748b", cursor: "pointer", fontWeight: "700" }}>Critères</button>
        </nav>
        <button onClick={() => signOut(auth)} style={{ background: "#fee2e2", color: "#ef4444", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>Quitter</button>
      </header>

      <main style={{ maxWidth: "1000px", margin: "20px auto", padding: "0 20px" }}>
        {activeTab === "dashboard" ? (
          <div style={{ background: "white", padding: "30px", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
            <h2 style={{marginTop: 0}}>{currentCampaign.name}</h2>
            <div style={{ fontSize: "40px", fontWeight: "900", color: "#1d4ed8" }}>{Math.round((stats.conforme / stats.total) * 100)}%</div>
            <p style={{color: '#64748b'}}>Taux de conformité global</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px", marginTop: "20px" }}>
              <div style={{background: '#f0fdf4', padding: '15px', borderRadius: '12px', color: '#166534'}}><b>{stats.conforme}</b> Conformes</div>
              <div style={{background: '#fffbeb', padding: '15px', borderRadius: '12px', color: '#92400e'}}><b>{stats.enCours}</b> En cours</div>
              <div style={{background: '#fef2f2', padding: '15px', borderRadius: '12px', color: '#991b1b'}}><b>{stats.nonConforme}</b> Non conformes</div>
            </div>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{padding: '15px'}}><input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0'}} /></div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {criteres.filter(c => c.titre.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                  <tr key={c.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "15px" }}><b>{c.num}</b> {c.titre}</td>
                    <td style={{ padding: "15px" }}><StatusBadge statut={c.statut} /></td>
                    <td style={{ padding: "15px", textAlign: 'right' }}><button onClick={() => setModalCritere(c)} style={{ padding: "6px 12px", background: "#1d4ed8", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Modifier</button></td>
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
