import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";
import { useState, useEffect } from "react";
import { getDoc, setDoc, doc, collection, getDocs } from "firebase/firestore"; 
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
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalCritere, setModalCritere] = useState(null);
  const [isAuditMode, setIsAuditMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        loadUserDataAndContent(user);
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
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      
      let etablissementId = "demo_ifps_cham";
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserProfile(userData);
        etablissementId = userData.etablissementId || etablissementId;
      }

      const etabRef = getEtablissementRef(etablissementId);
      let snap = await getDoc(etabRef);

      // --- SCRIPT DE MIGRATION FORCEE ---
      // On force la migration si on voit "32 à évaluer" (données par défaut)
      const data = snap.data();
      const needsMigration = !snap.exists() || !data?.campaigns || (data.campaigns[0].liste[0].statut === "non-evalue" && data.campaigns[0].liste[0].preuves === "");

      if (needsMigration) {
        console.log("🚀 MIGRATION FORCEE LANCEE...");
        
        // Tentative 1 : Document unique "criteres" dans "qualiopi"
        const docRef1 = doc(db, "qualiopi", "criteres");
        const snap1 = await getDoc(docRef1);

        // Tentative 2 : Document unique "data" dans "qualiopi"
        const docRef2 = doc(db, "qualiopi", "data");
        const snap2 = await getDoc(docRef2);

        let source = snap1.exists() ? snap1.data() : (snap2.exists() ? snap2.data() : null);

        if (source && source.liste) {
          console.log("✅ DONNEES TROUVEES DANS QUALIOPI !");
          const migratedCampaign = [{
            id: source.id || Date.now().toString(),
            name: source.name || "Migration Importante",
            auditDate: source.auditDate || "2026-10-15",
            liste: source.liste,
            locked: false
          }];

          await setDoc(etabRef, { 
            campaigns: migratedCampaign, 
            updatedAt: new Date().toISOString(),
            nom: "IFPS du CHAM (MIGRÉ)" 
          });
          
          // Rechargement immédiat
          snap = await getDoc(etabRef);
        } else {
          console.log("❌ AUCUNE DONNEE DANS QUALIOPI/CRITERES NI QUALIOPI/DATA");
        }
      }

      if (snap.exists() && snap.data()?.campaigns) {
        const d = snap.data();
        setCampaigns(d.campaigns); 
        setActiveCampaignId(d.campaigns[d.campaigns.length - 1].id);
      } else {
        initDefault();
      }
      setAuthChecked(true);
    } catch (e) {
      console.error("ERREUR:", e);
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
    setCampaigns(newCampaigns);
    try {
      const etabRef = getEtablissementRef(userProfile.etablissementId);
      await setDoc(etabRef, { campaigns: newCampaigns, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) { console.error(e); }
  }

  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;
  if (!campaigns || !activeCampaignId) return <div>Synchronisation...</div>;

  const currentCampaign = campaigns.find(c => c.id === activeCampaignId) || campaigns[0];
  const criteres = currentCampaign.liste || [];
  const stats = {
    total: criteres.filter(c => c.statut !== "non-concerne").length || 1,
    conforme: criteres.filter(c => c.statut === "conforme").length,
    enCours: criteres.filter(c => c.statut === "en-cours").length,
    nonConforme: criteres.filter(c => c.statut === "non-conforme").length,
    nonEvalue: criteres.filter(c => c.statut === "non-evalue").length
  };
  const filtered = criteres.filter(c => c.titre.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif" }}>
      {modalCritere && <DetailModal critere={modalCritere} onClose={() => setModalCritere(null)} onSave={(upd) => {
        const newListe = criteres.map(c => c.id === upd.id ? upd : c);
        saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp));
        setModalCritere(null);
      }} isReadOnly={currentCampaign.locked} isAuditMode={isAuditMode} />}

      <header style={{ background: "white", padding: "10px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "900", color: "#1d4ed8" }}>QualiForma</h1>
        <nav style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setActiveTab("dashboard")} style={{ padding: "8px 15px", borderRadius: "8px", border: "none", background: activeTab === "dashboard" ? "#1d4ed8" : "transparent", color: activeTab === "dashboard" ? "white" : "#64748b", fontWeight: "700", cursor: "pointer" }}>DASHBOARD</button>
          <button onClick={() => setActiveTab("criteres")} style={{ padding: "8px 15px", borderRadius: "8px", border: "none", background: activeTab === "criteres" ? "#1d4ed8" : "transparent", color: activeTab === "criteres" ? "white" : "#64748b", fontWeight: "700", cursor: "pointer" }}>CRITERES</button>
        </nav>
        <button onClick={() => signOut(auth)} style={{ background: "#fee2e2", color: "#ef4444", border: "none", padding: "8px 15px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>Quitter</button>
      </header>

      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "30px" }}>
        {activeTab === "dashboard" && (
          <div>
            <div style={{ background: "white", padding: "30px", borderRadius: "20px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
              <h2 style={{ margin: 0 }}>{currentCampaign.name}</h2>
              <div style={{ fontSize: "40px", fontWeight: "900", color: "#1d4ed8", margin: "20px 0" }}>{Math.round((stats.conforme / stats.total) * 100)}%</div>
              <div style={{ height: "15px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${(stats.conforme / stats.total) * 100}%`, background: "#10b981" }} />
                <div style={{ width: `${(stats.enCours / stats.total) * 100}%`, background: "#f59e0b" }} />
                <div style={{ width: `${(stats.nonConforme / stats.total) * 100}%`, background: "#ef4444" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px" }}>
              {[["Conformes", stats.conforme, "#10b981"], ["En cours", stats.enCours, "#f59e0b"], ["À faire", stats.nonEvalue, "#94a3b8"], ["Non conformes", stats.nonConforme, "#ef4444"]].map(([l, v, c]) => (
                <div key={l} style={{ background: "white", padding: "20px", borderRadius: "15px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <div style={{ color: c, fontSize: "30px", fontWeight: "900" }}>{v}</div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "criteres" && (
          <div style={{ background: "white", borderRadius: "15px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "15px" }}><input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }} /></div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "15px" }}><span style={{ fontWeight: "800", color: "#1d4ed8", marginRight: "10px" }}>{c.num}</span> {c.titre}</td>
                  <td style={{ padding: "15px" }}><StatusBadge statut={c.statut} /></td>
                  <td style={{ padding: "15px" }}><button onClick={() => setModalCritere(c)} style={{ padding: "5px 15px", borderRadius: "6px", border: "none", background: "#1d4ed8", color: "white", fontWeight: "700", cursor: "pointer" }}>Modifier</button></td>
                </tr>
              ))}
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
