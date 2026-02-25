import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";
import { useState, useEffect, useRef } from "react";
import { getDoc, setDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, DOC_REF } from "./firebase";
import { NOM_ETABLISSEMENT, TODAY, RESPONSABLES, DEFAULT_CRITERES, CRITERES_LABELS, STATUT_CONFIG } from "./data";

function GaugeChart({ value, max, color }) {
  const pct = (value / max) * 100, r = 38, circ = 2 * Math.PI * r;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
      <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="9" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} strokeLinecap="round" transform="rotate(-90 48 48)" style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x="48" y="52" textAnchor="middle" fill="#1e3a5f" fontSize="15" fontWeight="700" fontFamily="Outfit">{Math.round(pct)}%</text>
    </svg>
  );
}

function StatusBadge({ statut }) {
  const s = STATUT_CONFIG[statut];
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>{s.label}</span>;
}

function ProgressBar({ value, max, color }) {
  return <div style={{ background: "#f1f5f9", borderRadius: "4px", height: "7px", overflow: "hidden" }}><div style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color, height: "100%", borderRadius: "4px", transition: "width 0.8s ease" }} /></div>;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [campaigns, setCampaigns] = useState(null);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterCritere, setFilterCritere] = useState("tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalCritere, setModalCritere] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        loadData();
      } else {
        setIsLoggedIn(false);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  async function loadData() {
    try {
      const snap = await getDoc(DOC_REF);
      if (snap.exists()) {
        const d = snap.data();
        if (d.campaigns && d.campaigns.length > 0) {
          setCampaigns(d.campaigns);
          setActiveCampaignId(d.campaigns[d.campaigns.length - 1].id);
        } else if (d.liste) {
          const mig = [{ id: Date.now().toString(), name: "Évaluation initiale", liste: d.liste, locked: false }];
          setCampaigns(mig);
          setActiveCampaignId(mig[0].id);
        } else {
          initDefault();
        }
      } else {
        initDefault();
      }
    } catch (e) {
      console.error("Erreur Firebase:", e);
      initDefault();
    }
  }

  function initDefault() {
    const def = [{ id: Date.now().toString(), name: "Évaluation initiale", liste: DEFAULT_CRITERES, locked: false }];
    setCampaigns(def);
    setActiveCampaignId(def[0].id);
  }

  async function saveData(newCampaigns) {
    setCampaigns(newCampaigns);
    setSaveStatus("saving");
    try {
      await setDoc(DOC_REF, { campaigns: newCampaigns, updatedAt: new Date().toISOString() });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error("Erreur sauvegarde:", e);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  function handleLogout() { signOut(auth); }

  function handleNewCampaign(e) {
    if (e.target.value === "NEW") {
      const name = prompt("Nom de la nouvelle certification (ex: Audit de Surveillance 2026) :");
      if (name && name.trim() !== "") {
        const latest = campaigns[campaigns.length - 1]; 
        const duplicatedListe = latest.liste.map(c => ({
          ...c,
          statut: "non-evalue" 
        }));
        const locked = campaigns.map(c => ({ ...c, locked: true }));
        const newCamp = {
          id: Date.now().toString(),
          name: name.trim(),
          liste: duplicatedListe,
          locked: false
        };
        const newCampaigns = [...locked, newCamp];
        saveData(newCampaigns);
        setActiveCampaignId(newCamp.id);
      } else {
        e.target.value = activeCampaignId;
      }
    } else {
      setActiveCampaignId(e.target.value);
    }
  }

  function handleDeleteCampaign() {
    if (campaigns.length <= 1) {
      alert("Vous ne pouvez pas supprimer la seule évaluation existante.");
      return;
    }
    const currentName = campaigns.find(c => c.id === activeCampaignId)?.name;
    const confirmDelete = window.confirm(`⚠️ ATTENTION ⚠️\n\nÊtes-vous sûr de vouloir supprimer définitivement l'évaluation :\n"${currentName}" ?\n\nToutes les données de cette session seront perdues. Cette action est IRRÉVERSIBLE.`);
    
    if (confirmDelete) {
      const updatedCampaigns = campaigns.filter(c => c.id !== activeCampaignId);
      const newActiveId = updatedCampaigns[updatedCampaigns.length - 1].id;
      saveData(updatedCampaigns);
      setActiveCampaignId(newActiveId);
    }
  }

  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;
  if (campaigns === null || activeCampaignId === null) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Outfit,sans-serif" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div><div style={{ fontSize: "14px", color: "#6b7280" }}>Chargement des données...</div></div>
    </div>
  );

  const currentCampaign = campaigns.find(c => c.id === activeCampaignId);
  const criteres = currentCampaign.liste;
  const isArchive = currentCampaign.locked;

  function saveModal(updated) {
    if (isArchive) return; 
    const newListe = criteres.map(c => c.id === updated.id ? updated : c);
    const newCampaigns = campaigns.map(camp => camp.id === activeCampaignId ? { ...camp, liste: newListe } : camp);
    saveData(newCampaigns);
    setModalCritere(null);
  }

  const today = new Date();
  const days = d => Math.round((new Date(d) - today) / 86400000);
  const dayColor = d => days(d) < 0 ? "#dc2626" : days(d) < 30 ? "#d97706" : "#6b7280";
  const stats = {
    total: criteres.length,
    conforme: criteres.filter(c => c.statut === "conforme").length,
    enCours: criteres.filter(c => c.statut === "en-cours").length,
    nonConforme: criteres.filter(c => c.statut === "non-conforme").length,
    nonEvalue: criteres.filter(c => c.statut === "non-evalue").length,
  };
  const urgents = criteres.filter(c => days(c.delai) <= 30 && c.statut !== "conforme" && c.statut !== "non-evalue");
  const filtered = criteres.filter(c => {
    if (filterStatut !== "tous" && c.statut !== filterStatut) return false;
    if (filterCritere !== "tous" && c.critere !== parseInt(filterCritere)) return false;
    if (searchTerm && !c.titre.toLowerCase().includes(searchTerm.toLowerCase()) && !c.num.includes(searchTerm)) return false;
    return true;
  });
  const axes = criteres.filter(c => c.statut === "non-conforme" || c.statut === "en-cours")
    .sort((a, b) => ({ "non-conforme": 0, "en-cours": 1 }[a.statut] - { "non-conforme": 0, "en-cours": 1 }[b.statut] || new Date(a.delai) - new Date(b.delai)));
  const byResp = RESPONSABLES.map(r => ({
    name: r, nom: r.split("(")[0].trim(), role: r.match(/\(([^)]+)\)/)?.[1] || "",
    items: criteres.filter(c => c.responsables.includes(r)),
  })).filter(r => r.items.length > 0);
  const sansResp = criteres.filter(c => !c.responsables || c.responsables.length === 0);

  const navBtn = active => ({ padding: "8px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "Outfit,sans-serif", background: active ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "transparent", color: active ? "white" : "#4b5563", whiteSpace: "nowrap" });
  const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const nb = col => ({ padding: "4px 10px", background: `${col}15`, color: col, borderRadius: "6px", fontSize: "12px", fontWeight: "800", textAlign: "center", border: `1px solid ${col}30`, flexShrink: 0, whiteSpace: "nowrap" });
  const th = { textAlign: "left", padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "2px solid #f1f5f9", background: "#fafafa" };
  const td = { padding: "11px 14px", fontSize: "13px", borderBottom: "1px solid #f8fafc", verticalAlign: "middle", color: "#374151" };
  const sel = { background: "white", border: "1px solid #d1d5db", borderRadius: "7px", color: "#374151", padding: "7px 10px", fontSize: "12px", cursor: "pointer" };

  const SaveIndicator = () => {
    if (saveStatus === "idle") return null;
    const cfg = { saving: ["#6b7280","Sauvegarde..."], saved: ["#065f46","Sauvegarde"], error: ["#991b1b","Erreur"] }[saveStatus];
    return <span className="no-print" style={{ fontSize: "11px", color: cfg[0], background: saveStatus==="saved"?"#d1fae5":saveStatus==="error"?"#fee2e2":"#f3f4f6", border:`1px solid ${saveStatus==="saved"?"#6ee7b7":saveStatus==="error"?"#fca5a5":"#d1d5db"}`, borderRadius:"6px", padding:"3px 10px", marginLeft:"10px" }}>{saveStatus==="saved"?"✓":saveStatus==="saving"?"⟳":"✕"} {cfg[1]}</span>;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif", color: "#1e3a5f" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { size: landscape; margin: 10mm; }
            * { box-shadow: none !important; }
            .print-break-avoid { page-break-inside: avoid; }
          }
        `}
      </style>

      {modalCritere && <DetailModal critere={modalCritere} onClose={() => setModalCritere(null)} onSave={saveModal} isReadOnly={isArchive} />}

      <div className="no-print" style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 32px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        {/* MODIFICATION ICI : ajout de gap: "20px" et flexWrap: "wrap" pour éviter le chevauchement */}
        <div style={{ maxWidth: "1440px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", gap: "20px", flexWrap: "wrap" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ width: "42px", height: "42px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🎓</div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "#1e3a5f", display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                Qualiopi Tracker 
                <span style={{ fontSize: "10px", color: "#6b7280", background: "#f3f
