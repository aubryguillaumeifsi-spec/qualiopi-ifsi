import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";

import DashboardTab from "./components/DashboardTab";
import TourControleTab from "./components/TourControleTab";
import OrganigrammeTab from "./components/OrganigrammeTab";
import { CriteresTab, AxesTab, ResponsablesTab, LivreBlancTab } from "./components/TabsQualiopi";
import { EquipeTab, CompteTab } from "./components/TabsAdmin";

import { getDoc, setDoc, deleteDoc, doc, collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut, updatePassword, sendEmailVerification } from "firebase/auth";
import { db, auth } from "./firebase";
import { DEFAULT_CRITERES } from "./data";

// ----------------------------------------------------------------------
// 🎨 SYSTÈME DE TOKENS "MIDNIGHT" (Design System)
// ----------------------------------------------------------------------
const GFONT = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Albert+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap";

function buildTokens(dark) {
  // Le thème "Midnight" par défaut (dark), avec un fallback clair élégant
  return dark ? {
    bg:"#0f172a", nav:"#080e1a", surface:"#172035",
    surface2:"#1c2840", surface3:"#223050", border:"#1e2d42", border2:"#182438",
    text:"#c8d8f0", text2:"#4a6285", text3:"#283850",
    textNav:"rgba(255,255,255,0.9)", textNavSub:"rgba(255,255,255,0.4)",
    accent:"#4f80f0", accentBg:"rgba(79,128,240,0.12)", accentBd:"rgba(79,128,240,0.28)",
    gold:"#d4a030", goldBg:"rgba(212,160,48,0.12)", goldBd:"rgba(212,160,48,0.3)",
    green:"#2cc880", greenBg:"rgba(44,200,128,0.12)", greenBd:"rgba(44,200,128,0.25)",
    red:"#f05050", redBg:"rgba(240,80,80,0.12)", redBd:"rgba(240,80,80,0.25)",
    amber:"#f09830", amberBg:"rgba(240,152,48,0.12)", amberBd:"rgba(240,152,48,0.25)",
    danger:"#f05050", dangerBg:"rgba(240,80,80,0.12)", dangerBd:"rgba(240,80,80,0.25)",
    shadow:"0 4px 20px rgba(0,0,0,0.3)", shadowSm:"0 2px 10px rgba(0,0,0,0.2)"
  } : {
    bg:"#f8fafc", nav:"#080e1a", surface:"#ffffff", // La navigation reste sombre en mode clair
    surface2:"#f1f5f9", surface3:"#e2e8f0", border:"#e2e8f0", border2:"#cbd5e1",
    text:"#0f172a", text2:"#475569", text3:"#94a3b8",
    textNav:"rgba(255,255,255,0.9)", textNavSub:"rgba(255,255,255,0.4)",
    accent:"#2563eb", accentBg:"#eff6ff", accentBd:"#bfdbfe",
    gold:"#d97706", goldBg:"#fef3c7", goldBd:"#fde68a",
    green:"#059669", greenBg:"#d1fae5", greenBd:"#6ee7b7",
    red:"#dc2626", redBg:"#fee2e2", redBd:"#fca5a5",
    amber:"#d97706", amberBg:"#fef3c7", amberBd:"#fde68a",
    danger:"#dc2626", dangerBg:"#fee2e2", dangerBd:"#fca5a5",
    shadow:"0 4px 6px -1px rgba(0,0,0,0.1)", shadowSm:"0 1px 2px 0 rgba(0,0,0,0.05)"
  };
}

// ----------------------------------------------------------------------
// 🛡️ GESTION DES ERREURS
// ----------------------------------------------------------------------
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "Albert Sans" }}>
        <h1 style={{ color: "#f05050" }}>⚠️ Erreur Système</h1>
        <pre style={{ background: "rgba(240,80,80,0.12)", padding: "20px", borderRadius: "8px", overflowX: "auto" }}>{this.state.error?.toString()}</pre>
        <button onClick={() => window.location.reload()} style={{ marginTop: "20px", padding: "10px 20px", background: "#4f80f0", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>Recharger l'application</button>
      </div>
    );
    return this.props.children;
  }
}

// ----------------------------------------------------------------------
// 🚀 APPLICATION PRINCIPALE
// ----------------------------------------------------------------------
function MainApp() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("theme_dark") !== "false"); // Sombre par défaut
  const [isColorblindMode, setIsColorblindMode] = useState(() => localStorage.getItem("theme_colorblind") === "true");
  
  useEffect(() => { localStorage.setItem("theme_dark", isDarkMode); }, [isDarkMode]);
  useEffect(() => { localStorage.setItem("theme_colorblind", isColorblindMode); }, [isColorblindMode]);

  const t = buildTokens(isDarkMode); // Génération des couleurs
  
  // États de l'application
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userProfile, setUserProfile] = useState(null); 
  const [selectedIfsi, setSelectedIfsi] = useState(null); 
  const [campaigns, setCampaigns] = useState(null);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [ifsiList, setIfsiList] = useState([]);
  const [ifsiData, setIfsiData] = useState(null);
  const [pwdUpdate, setPwdUpdate] = useState({ p1: "", p2: "", loading: false, error: "", success: "" });

  // 1. Charger la liste des établissements
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "etablissements"), (snapshot) => {
      const list = []; snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setIfsiList(list.sort((a, b) => String(a.name).localeCompare(b.name)));
    });
    return () => unsub();
  }, []);

  // 2. Observer l'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        if (!user.emailVerified) { setActiveTab("validation_requise"); } 
        else { setActiveTab("dashboard"); }
        
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
          const profile = userSnap.data();
          setUserProfile(profile);
          setSelectedIfsi(profile.etablissementId || "demo_ifps_cham");
        }
      } else { setIsLoggedIn(false); }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // 3. Charger les données Qualiopi de l'IFSI sélectionné
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

  const handleLogout = () => signOut(auth);

  // Écrans de blocage (Validation Email & Mot de passe)
  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;

  if (activeTab === "validation_requise") {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, color: t.text, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "Albert Sans, sans-serif" }}>
        <div style={{ background: t.surface, padding: "40px", borderRadius: "16px", border: `1px solid ${t.border}`, textAlign: "center", maxWidth: "500px" }}>
           <h2>Vérification de l'email</h2>
           <p style={{ color: t.text2 }}>Veuillez cliquer sur le lien envoyé à <strong>{auth.currentUser?.email}</strong>.</p>
           <button onClick={() => window.location.reload()} style={{ width: "100%", padding: "12px", background: t.accent, color: "white", borderRadius: "8px", border: "none", cursor: "pointer", marginBottom: "12px" }}>J'ai validé mon mail</button>
           <button onClick={handleLogout} style={{ width: "100%", padding: "12px", background: "transparent", color: t.danger, border: `1px solid ${t.dangerBd}`, borderRadius: "8px", cursor: "pointer" }}>Déconnexion</button>
        </div>
      </div>
    );
  }

  if (userProfile?.mustChangePassword) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, color: t.text, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "Albert Sans, sans-serif" }}>
        <div style={{ background: t.surface, padding: "40px", borderRadius: "16px", border: `1px solid ${t.border}`, maxWidth: "500px", width:"100%" }}>
           <h2 style={{ color: t.danger, textAlign: "center" }}>Sécurité du compte</h2>
           <p style={{ color: t.text2, textAlign: "center", marginBottom:"20px" }}>Première connexion : créez votre mot de passe.</p>
           <CompteTab auth={auth} userProfile={userProfile} pwdUpdate={pwdUpdate} setPwdUpdate={setPwdUpdate} handleChangePassword={async (e) => { e.preventDefault(); setPwdUpdate({...pwdUpdate, loading: true}); try { await updatePassword(auth.currentUser, pwdUpdate.p1); await setDoc(doc(db,"users",auth.currentUser.uid),{mustChangePassword:false},{merge:true}); alert("Mot de passe mis à jour !"); window.location.reload(); } catch (err) { setPwdUpdate({...pwdUpdate, loading: false, error: err.message}); } }} />
        </div>
      </div>
    );
  }

  // --- RENDU DE L'APPLICATION (SIDEBAR + MAIN) ---
  const currentIfsiName = ifsiList.find(i => i.id === selectedIfsi)?.name || "Chargement...";
  const menuBtn = (id, icon, label) => {
    const act = activeTab === id;
    return (
      <button 
        onClick={() => setActiveTab(id)} 
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: act ? "rgba(255,255,255,0.06)" : "transparent", color: act ? t.textNav : t.textNavSub, border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: act ? "600" : "500", cursor: "pointer", transition: "all 0.2s", textAlign: "left", marginBottom: "4px" }}
      >
        <span style={{ fontSize: "16px", opacity: act ? 1 : 0.6 }}>{icon}</span>
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'Albert Sans', sans-serif" }}>
      <style>@import url('{GFONT}');</style>

      {/* 🧭 SIDEBAR GAUCHE */}
      <aside style={{ width: "260px", background: t.nav, borderRight: `1px solid rgba(255,255,255,0.05)`, display: "flex", flexDirection: "column", padding: "24px 16px", flexShrink: 0 }}>
        
        {/* Logo & Etablissement */}
        <div style={{ marginBottom: "32px", padding: "0 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #4f80f0, #2c55b8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>✨</div>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: "24px", color: "white", letterSpacing: "0.5px" }}>QualiForma</span>
          </div>

          {userProfile?.role === "superadmin" ? (
            <select value={selectedIfsi || ""} onChange={(e) => setSelectedIfsi(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: t.textNav, fontSize: "12px", fontWeight: "600", outline: "none", cursor: "pointer" }}>
              {ifsiList.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          ) : (
            <div style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)", color: t.textNav, fontSize: "12px", fontWeight: "600" }}>
              {currentIfsiName}
            </div>
          )}
        </div>

        {/* Menu Principal */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: t.textNavSub, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px", paddingLeft: "8px" }}>Pilotage</div>
          {menuBtn("dashboard", "📊", "Vue Globale")}
          {menuBtn("criteres", "🎯", "Indicateurs")}
          {menuBtn("organigramme", "👥", "Équipe & Rôles")}

          <div style={{ fontSize: "10px", fontWeight: "700", color: t.textNavSub, textTransform: "uppercase", letterSpacing: "1px", marginTop: "24px", marginBottom: "12px", paddingLeft: "8px" }}>Outils</div>
          {menuBtn("livre_blanc", "📖", "Livre Blanc")}
          {(userProfile?.role === "superadmin" || userProfile?.role === "admin") && menuBtn("administration", "⚙️", "Administration")}
          {userProfile?.role === "superadmin" && menuBtn("tour_controle", "🛸", "Tour de Contrôle")}
        </div>

        {/* Profil & Logout */}
        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: t.textNav, fontSize: "12px", fontWeight: "700", flexShrink: 0 }}>
                {auth.currentUser?.email?.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "12px", fontWeight: "600", color: t.textNav, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{auth.currentUser?.email?.split('@')[0]}</div>
                <div style={{ fontSize: "10px", color: t.textNavSub, textTransform: "capitalize" }}>{userProfile?.role}</div>
              </div>
            </div>
            <button onClick={handleLogout} style={{ background: "transparent", border: "none", color: t.textNavSub, cursor: "pointer", fontSize: "16px", padding: "4px" }} title="Se déconnecter">🚪</button>
          </div>
        </div>
      </aside>

      {/* 🖥️ ZONE DE CONTENU PRINCIPALE */}
      <main style={{ flex: 1, height: "100vh", overflowY: "auto", padding: "32px 40px", boxSizing: "border-box", position: "relative" }}>
        
        {/* On charge ici les anciens composants en attendant de les réécrire. 
            On leur passe 't' (les tokens) pour commencer à les adapter si besoin. */}
        {activeTab === "dashboard" && campaigns && <DashboardTab isDarkMode={isDarkMode} t={t} />}
        {activeTab === "criteres" && <CriteresTab isDarkMode={isDarkMode} t={t} />}
        {activeTab === "organigramme" && <OrganigrammeTab isDarkMode={isDarkMode} t={t} />}
        {activeTab === "tour_controle" && <TourControleTab isDarkMode={isDarkMode} t={t} />}
        {activeTab === "administration" && <CompteTab auth={auth} userProfile={userProfile} pwdUpdate={pwdUpdate} setPwdUpdate={setPwdUpdate} handleChangePassword={()=>{}} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} isColorblindMode={isColorblindMode} setIsColorblindMode={setIsColorblindMode} />}
        {activeTab === "livre_blanc" && <LivreBlancTab currentIfsiName={currentIfsiName} />}
        
      </main>
    </div>
  );
}

export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }
