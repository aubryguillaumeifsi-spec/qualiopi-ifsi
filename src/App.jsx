import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";
import { useState, useEffect } from "react";
import { getDoc, setDoc, doc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, getEtablissementRef } from "./firebase";
import { NOM_ETABLISSEMENT, DEFAULT_CRITERES, CRITERES_LABELS, STATUT_CONFIG, RESPONSABLES, ROLE_COLORS } from "./data";

// --- COMPOSANTS UI ---
function GaugeChart({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0, r = 38, circ = 2 * Math.PI * r;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
      <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="9" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} strokeLinecap="round" transform="rotate(-90 48 48)" style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x="48" y="52" textAnchor="middle" fill="#1e3a5f" fontSize="15" fontWeight="700" fontFamily="Outfit">{Math.round(pct)}%</text>
    </svg>
  );
}

function StatusBadge({ statut }) {
  const s = STATUT_CONFIG[statut] || STATUT_CONFIG["non-evalue"];
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>{s.label}</span>;
}

function ProgressBar({ value, max, color }) {
  return <div style={{ background: "#f1f5f9", borderRadius: "4px", height: "7px", overflow: "hidden" }}><div style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color, height: "100%", borderRadius: "4px", transition: "width 0.8s ease" }} /></div>;
}

// --- COMPOSANT PRINCIPAL ---
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

  // 1. Surveillance de l'état de connexion
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        await loadUserDataAndContent(user);
      } else {
        setIsLoggedIn(false);
        setUserProfile(null);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Chargement des données selon l'établissement de l'utilisateur
  async function loadUserDataAndContent(user) {
    try {
      // Récupérer le profil utilisateur (pour avoir l'etablissementId)
      const userDoc = await getDoc(doc(db, "users", user.uid));
      let etablissementId = "demo_ifps_cham"; // Valeur par défaut
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile(userData);
        etablissementId = userData.etablissementId || etablissementId;
      }

      // Charger les données de l'établissement
      const etabRef = getEtablissementRef(etablissementId);
      const snap = await getDoc(etabRef);

      if (snap.exists()) {
        const d = snap.data();
        if (d.campaigns && d.campaigns.length > 0) {
          setCampaigns(d.campaigns); 
          setActiveCampaignId(d.campaigns[d.campaigns.length - 1].id);
        } else { initDefault(); }
      } else { initDefault(); }
    } catch (e) {
      console.error("Erreur de chargement:", e);
      initDefault();
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
      await setDoc(etabRef, { campaigns: newCampaigns, updatedAt: new Date().toISOString() });
      setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  const handleLogout = () => signOut(auth);

  // --- LOGIQUE MÉTIER ---
  function handleNewCampaign(e) {
    if (e.target.value === "NEW") {
      const name = prompt("Nom de la nouvelle certification :");
      if (name && name.trim() !== "") {
        const auditDate = prompt("Date prévue (AAAA-MM-JJ) :", "2027-01-01");
        const latest = campaigns[campaigns.length - 1]; 
        const duplicatedListe = latest.liste.map(c => ({
          ...c, 
          statut: c.statut === "non-concerne" ? "non-concerne" : "en-cours",
          fichiers: (c.fichiers || []).map(f => ({ ...f, archive: true })),
          preuves: "",
          preuves_encours: c.preuves ? `[Preuves précédentes]\n${c.preuves}` : c.preuves_encours 
        }));
        const locked = campaigns.map(c => ({ ...c, locked: true }));
        const newCamp = { id: Date.now().toString(), name: name.trim(), auditDate, liste: duplicatedListe, locked: false };
        saveData([...locked, newCamp]);
        setActiveCampaignId(newCamp.id);
      }
    } else { setActiveCampaignId(e.target.value); }
  }

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

  // --- STYLE ---
  const navBtn = active => ({ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", background: active ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "transparent", color: active ? "white" : "#4b5563" });

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif", color: "#1e3a5f" }}>
      {modalCritere && <DetailModal critere={modalCritere} onClose={() => setModalCritere(null)} onSave={(upd) => {
        const newListe = criteres.map(c => c.id === upd.id ? upd : c);
        saveData(campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp));
        setModalCritere(null);
      }} isReadOnly={isArchive} isAuditMode={isAuditMode} />}

      <header style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M11 2C6 2 2 6 2 11s4 9 9 9 9-4 9-9-4-9-9-9zm0 16c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7z" fill="#1d4ed8"/><path d="M10.5 14.5l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4-6 6z" fill="#1d4ed8"/></svg>
          <h1 style={{ fontSize: "18px", fontWeight: "800", margin: 0 }}>QualiForma <span style={{fontSize:"10px", color:"#94a3b8"}}>V2.0</span></h1>
          <select value={activeCampaignId} onChange={handleNewCampaign} style={{ marginLeft: "20px", padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="NEW">+ Nouvelle évaluation</option>
          </select>
        </div>
        <nav style={{ display: "flex", gap: "8px" }}>
          {["dashboard", "criteres", "kanban"].map(t => <button key={t} style={navBtn(activeTab === t)} onClick={() => setActiveTab(t)}>{t.toUpperCase()}</button>)}
          <button onClick={handleLogout} style={{ ...navBtn(false), color: "#ef4444" }}>Déconnexion</button>
        </nav>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
        {activeTab === "dashboard" && (
          <div style={{ display: "grid", gap: "24px" }}>
            {/* Barre de progression globale */}
            <div style={{ background: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontWeight: "800" }}>Progression Globale</span>
                <span style={{ color: "#1d4ed8", fontWeight: "800" }}>{Math.round((stats.conforme / stats.total) * 100)}%</span>
              </div>
              <div style={{ display: "flex", height: "12px", borderRadius: "6px", overflow: "hidden", background: "#f1f5f9" }}>
                <div style={{ width: `${(stats.conforme / stats.total) * 100}%`, background: "#10b981" }} />
                <div style={{ width: `${(stats.enCours / stats.total) * 100}%`, background: "#f59e0b" }} />
                <div style={{ width: `${(stats.nonConforme / stats.total) * 100}%`, background: "#ef4444" }} />
              </div>
            </div>
            
            {/* Grille de stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
              {[["Conformes", stats.conforme, "#10b981"], ["En cours", stats.enCours, "#f59e0b"], ["À faire", stats.nonEvalue, "#94a3b8"], ["Non conformes", stats.nonConforme, "#ef4444"]].map(([lbl, val, col]) => (
                <div key={lbl} style={{ background: "white", padding: "20px", borderRadius: "12px", border: `1px solid ${col}40`, borderTop: `4px solid ${col}` }}>
                  <div style={{ fontSize: "24px", fontWeight: "900" }}>{val}</div>
                  <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "criteres" && (
           <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
             <table style={{ width: "100%", borderCollapse: "collapse" }}>
               <thead style={{ background: "#f8fafc" }}>
                 <tr>
                   <th style={{ padding: "16px", textAlign: "left" }}>N°</th>
                   <th style={{ padding: "16px", textAlign: "left" }}>Indicateur</th>
                   <th style={{ padding: "16px", textAlign: "left" }}>Statut</th>
                   <th style={{ padding: "16px", textAlign: "center" }}>Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {filtered.map(c => (
                   <tr key={c.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                     <td style={{ padding: "16px", fontWeight: "800", color: "#3b82f6" }}>{c.num}</td>
                     <td style={{ padding: "16px", fontSize: "14px" }}>{c.titre}</td>
                     <td style={{ padding: "16px" }}><StatusBadge statut={c.statut} /></td>
                     <td style={{ padding: "16px", textAlign: "center" }}>
                       <button onClick={() => setModalCritere(c)} style={{ padding: "6px 12px", borderRadius: "6px", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", cursor: "pointer" }}>Ouvrir</button>
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
