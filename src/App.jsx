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
      // 1. Récupération du profil
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      
      let etablissementId = "demo_ifps_cham";
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserProfile(userData);
        etablissementId = userData.etablissementId || etablissementId;
      }

      // 2. Lecture du tiroir établissement
      const etabRef = getEtablissementRef(etablissementId);
      let snap = await getDoc(etabRef);
      let currentData = snap.exists() ? snap.data() : null;

      // --- LOGIQUE DE MIGRATION "FORCE BRUTE" ---
      // On migre si le tiroir est vide OU si la première campagne est à 0%
      const isActuallyEmpty = !currentData || !currentData.campaigns || 
                             (currentData.campaigns[0].liste.every(c => c.statut === "non-evalue") && 
                              currentData.campaigns[0].liste.every(c => !c.preuves || c.preuves === ""));

      if (isActuallyEmpty) {
        console.log("🛠️ Mode Migration Activé...");
        // On va chercher dans qualiopi/criteres (ton chemin exact)
        const oldSnap = await getDoc(doc(db, "qualiopi", "criteres"));
        
        if (oldSnap.exists()) {
          const oldData = oldSnap.data();
          console.log("📦 Données trouvées dans qualiopi/criteres ! Transfert...");
          
          const migratedCampaign = [{
            id: oldData.id || Date.now().toString(),
            name: oldData.name || "Migration IFPS",
            auditDate: oldData.auditDate || "2026-10-15",
            liste: oldData.liste,
            locked: false
          }];

          await setDoc(etabRef, { 
            campaigns: migratedCampaign, 
            updatedAt: new Date().toISOString(),
            nom: "IFPS du CHAM" 
          }, { merge: true });
          
          snap = await getDoc(etabRef);
          currentData = snap.data();
        }
      }

      // 3. Mise à jour de l'état
      if (currentData && currentData.campaigns) {
        setCampaigns(currentData.campaigns); 
        setActiveCampaignId(currentData.campaigns[currentData.campaigns.length - 1].id);
      } else {
        initDefault();
      }
      setAuthChecked(true);
    } catch (e) {
      console.error("Erreur de synchro:", e);
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
  if (!campaigns || !activeCampaignId) return <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', fontFamily:'Outfit'}}>⏳ Synchronisation des données...</div>;

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

  const navBtn = active => ({ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "700", background: active ? "#1d4ed8" : "transparent", color: active ? "white" : "#64748b" });

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif", color: "#1e3a5f" }}>
      {modalCritere && <DetailModal critere={modalCritere} onClose={() => setModalCritere(null)} onSave={(upd) => {
        const newListe = criteres.map(c => c.id === upd.id ? upd : c);
        saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp));
        setModalCritere(null);
      }} isReadOnly={currentCampaign.locked} isAuditMode={isAuditMode} />}

      <header style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "10px 30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <div style={{width:'30px', height:'30px', background:'#1d4ed8', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'900'}}>Q</div>
          <h1 style={{ fontSize: "18px", fontWeight: "800", margin: 0 }}>QualiForma</h1>
        </div>
        <nav style={{ display: "flex", gap: "10px", background:'#f1f5f9', padding:'4px', borderRadius:'10px' }}>
          {["dashboard", "criteres"].map(t => <button key={t} style={navBtn(activeTab === t)} onClick={() => setActiveTab(t)}>{t.toUpperCase()}</button>)}
        </nav>
        <button onClick={() => signOut(auth)} style={{ background: "#fee2e2", color: "#ef4444", border: "none", padding: "8px 15px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>Déconnexion</button>
      </header>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "30px" }}>
        {activeTab === "dashboard" && (
          <div style={{ display: "grid", gap: "25px" }}>
            <div style={{ background: "white", padding: "30px", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                <h2 style={{margin:0, fontSize:'18px'}}>Progression Qualiopi</h2>
                <div style={{fontSize:'28px', fontWeight:'900', color:'#1d4ed8'}}>{Math.round((stats.conforme / stats.total) * 100)}%</div>
              </div>
              <div style={{ height: "12px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${(stats.conforme / stats.total) * 100}%`, background: "#10b981", transition: "width 1.5s ease" }} />
                <div style={{ width: `${(stats.enCours / stats.total) * 100}%`, background: "#f59e0b", transition: "width 1.5s ease" }} />
                <div style={{ width: `${(stats.nonConforme / stats.total) * 100}%`, background: "#ef4444", transition: "width 1.5s ease" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px" }}>
              {[["Conformes", stats.conforme, "#10b981"], ["En cours", stats.enCours, "#f59e0b"], ["À traiter", stats.nonEvalue, "#94a3b8"], ["Non conformes", stats.nonConforme, "#ef4444"]].map(([l, v, c]) => (
                <div key={l} style={{ background: "white", padding: "20px", borderRadius: "15px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <div style={{ color: c, fontSize: "32px", fontWeight: "900" }}>{v}</div>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: 'uppercase', marginTop:'5px' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "criteres" && (
          <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "15px", borderBottom:'1px solid #f1f5f9' }}>
              <input placeholder="Rechercher un indicateur..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px 15px", borderRadius: "10px", border: "1px solid #e2e8f0", outline:'none' }} />
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "15px 20px" }}>
                      <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                        <div style={{minWidth:'35px', height:'35px', borderRadius:'8px', background:'#eff6ff', color:'#1d4ed8', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'13px'}}>{c.num}</div>
                        <div style={{fontWeight:'600', fontSize:'14px'}}>{c.titre}</div>
                      </div>
                    </td>
                    <td style={{ padding: "15px 20px" }}><StatusBadge statut={c.statut} /></td>
                    <td style={{ padding: "15px 20px", textAlign:'right' }}>
                      <button onClick={() => setModalCritere(c)} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#1d4ed8", color: "white", fontWeight: "700", cursor: "pointer", fontSize:'12px' }}>Modifier</button>
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
