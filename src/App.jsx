import { useState, useEffect } from "react";

// ============================================================
// CONFIGURATION — modifiez ces deux lignes
// ============================================================
const MOT_DE_PASSE = "Qualiopi2025!";
const NOM_ETABLISSEMENT = "IFSI";

// ============================================================
// DONNEES — remplacez les noms fictifs par les vrais
// ============================================================
const CRITERES_DATA = [
  { id: 1, num: "1.1", critere: 1, titre: "Publicite des prestations et conditions d'acces", responsable: "Marie Dupont", delai: "2025-03-15", statut: "conforme", notes: "Site web a jour, livret accueil revise" },
  { id: 2, num: "1.2", critere: 1, titre: "Communication sur les resultats obtenus", responsable: "Marie Dupont", delai: "2025-04-01", statut: "en-cours", notes: "Taux de reussite a publier sur site" },
  { id: 3, num: "1.3", critere: 1, titre: "Information sur l'accessibilite aux personnes handicapees", responsable: "Jean Martin", delai: "2025-03-30", statut: "non-conforme", notes: "Referent handicap a nommer" },
  { id: 4, num: "1.4", critere: 1, titre: "Tarifs et modalites de financement", responsable: "Marie Dupont", delai: "2025-02-28", statut: "conforme", notes: "" },
  { id: 5, num: "1.5", critere: 1, titre: "Delais d'acces a la formation", responsable: "Marie Dupont", delai: "2025-03-15", statut: "en-cours", notes: "Calendrier a mettre a jour" },
  { id: 6, num: "2.1", critere: 2, titre: "Analyse des besoins des beneficiaires potentiels", responsable: "Sophie Bernard", delai: "2025-05-01", statut: "conforme", notes: "Entretiens d'admission structures" },
  { id: 7, num: "2.2", critere: 2, titre: "Objectifs operationnels et evaluables definis", responsable: "Sophie Bernard", delai: "2025-04-15", statut: "conforme", notes: "Referentiel de competences UE" },
  { id: 8, num: "2.3", critere: 2, titre: "Contenus et modalites pedagogiques adaptes", responsable: "Pierre Leclerc", delai: "2025-06-01", statut: "en-cours", notes: "Maquette pedagogique en revision" },
  { id: 9, num: "2.4", critere: 2, titre: "Modalites d'evaluation des acquis", responsable: "Pierre Leclerc", delai: "2025-05-15", statut: "conforme", notes: "" },
  { id: 10, num: "3.1", critere: 3, titre: "Positionnement des beneficiaires a l'entree", responsable: "Anne Moreau", delai: "2025-03-01", statut: "conforme", notes: "Grilles de positionnement validees" },
  { id: 11, num: "3.2", critere: 3, titre: "Adaptation des parcours", responsable: "Anne Moreau", delai: "2025-04-01", statut: "en-cours", notes: "Parcours VAE a formaliser" },
  { id: 12, num: "3.3", critere: 3, titre: "Accompagnement des beneficiaires", responsable: "Anne Moreau", delai: "2025-03-15", statut: "conforme", notes: "Referents pedagogiques designes" },
  { id: 13, num: "3.4", critere: 3, titre: "Accessibilite et compensation du handicap", responsable: "Jean Martin", delai: "2025-05-01", statut: "non-conforme", notes: "Plan d'accessibilite a elaborer" },
  { id: 14, num: "4.1", critere: 4, titre: "Coordination pedagogique assuree", responsable: "Pierre Leclerc", delai: "2025-02-15", statut: "conforme", notes: "" },
  { id: 15, num: "4.2", critere: 4, titre: "Ressources pedagogiques et techniques mobilisees", responsable: "Lucie Petit", delai: "2025-04-30", statut: "en-cours", notes: "Moodle a enrichir" },
  { id: 16, num: "4.3", critere: 4, titre: "Environnement numerique adapte", responsable: "Lucie Petit", delai: "2025-06-15", statut: "en-cours", notes: "Audit numerique prevu" },
  { id: 17, num: "4.4", critere: 4, titre: "Locaux et equipements adaptes", responsable: "Robert Simon", delai: "2025-03-30", statut: "conforme", notes: "Salles de simulation renouvelees" },
  { id: 18, num: "4.5", critere: 4, titre: "Encadrement et suivi des stages", responsable: "Sophie Bernard", delai: "2025-05-01", statut: "non-conforme", notes: "Conventionnement terrains de stage a reviser" },
  { id: 19, num: "4.6", critere: 4, titre: "Sous-traitance et partenariats", responsable: "Pierre Leclerc", delai: "2025-07-01", statut: "en-cours", notes: "Formalisation des partenariats UE" },
  { id: 20, num: "5.1", critere: 5, titre: "Qualification des intervenants", responsable: "Christine Faure", delai: "2025-03-01", statut: "conforme", notes: "CVs et diplomes a jour" },
  { id: 21, num: "5.2", critere: 5, titre: "Developpement des competences des formateurs", responsable: "Christine Faure", delai: "2025-06-30", statut: "en-cours", notes: "Plan de formation formateurs 2025 en cours" },
  { id: 22, num: "5.3", critere: 5, titre: "Integration et accompagnement des nouveaux intervenants", responsable: "Christine Faure", delai: "2025-04-15", statut: "conforme", notes: "Livret d'integration existant" },
  { id: 23, num: "5.4", critere: 5, titre: "Veille legale et reglementaire assuree", responsable: "Marie Dupont", delai: "2025-12-31", statut: "en-cours", notes: "Tableau de veille a completer" },
  { id: 24, num: "6.1", critere: 6, titre: "Veille sur les evolutions du secteur professionnel", responsable: "Sophie Bernard", delai: "2025-12-31", statut: "en-cours", notes: "Participation aux COPIL regionaux" },
  { id: 25, num: "6.2", critere: 6, titre: "Partenariats avec les acteurs de l'environnement", responsable: "Robert Simon", delai: "2025-09-01", statut: "conforme", notes: "Conventions CHU et cliniques" },
  { id: 26, num: "6.3", critere: 6, titre: "Insertion professionnelle des apprenants", responsable: "Anne Moreau", delai: "2025-10-01", statut: "en-cours", notes: "Suivi a 6 mois a mettre en place" },
  { id: 27, num: "6.4", critere: 6, titre: "Contribution du prestataire a son environnement", responsable: "Robert Simon", delai: "2025-11-01", statut: "conforme", notes: "Participation aux journees portes ouvertes" },
  { id: 28, num: "6.5", critere: 6, titre: "Pratiques ecoresponsables", responsable: "Lucie Petit", delai: "2025-12-01", statut: "non-conforme", notes: "Bilan carbone non realise" },
  { id: 29, num: "7.1", critere: 7, titre: "Recueil des appreciations des parties prenantes", responsable: "Christine Faure", delai: "2025-03-15", statut: "conforme", notes: "Enquetes de satisfaction annuelles" },
  { id: 30, num: "7.2", critere: 7, titre: "Traitement des reclamations", responsable: "Christine Faure", delai: "2025-03-15", statut: "conforme", notes: "Procedure reclamations formalisee" },
  { id: 31, num: "7.3", critere: 7, titre: "Mesures d'amelioration mises en oeuvre", responsable: "Marie Dupont", delai: "2025-06-01", statut: "en-cours", notes: "Plan amelioration continue a finaliser" },
  { id: 32, num: "7.4", critere: 7, titre: "Analyse des causes d'abandon et rupture", responsable: "Anne Moreau", delai: "2025-05-01", statut: "en-cours", notes: "Outil de suivi des abandons a creer" },
];

const CRITERES_LABELS = {
  1: { label: "Information du public", color: "#3B82F6" },
  2: { label: "Identification des objectifs", color: "#8B5CF6" },
  3: { label: "Adaptation aux publics", color: "#EC4899" },
  4: { label: "Moyens pedagogiques", color: "#F59E0B" },
  5: { label: "Qualification du personnel", color: "#10B981" },
  6: { label: "Environnement professionnel", color: "#06B6D4" },
  7: { label: "Appreciations et reclamations", color: "#EF4444" },
};

const STATUT_CONFIG = {
  "conforme": { label: "Conforme", color: "#10B981", bg: "#D1FAE5", icon: "V" },
  "en-cours": { label: "En cours", color: "#F59E0B", bg: "#FEF3C7", icon: "~" },
  "non-conforme": { label: "Non conforme", color: "#EF4444", bg: "#FEE2E2", icon: "X" },
};

const RESPONSABLES = [...new Set(CRITERES_DATA.map(c => c.responsable))];

function LoginPage({ onLogin }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  function handleSubmit() {
    if (pwd === MOT_DE_PASSE) {
      onLogin();
    } else {
      setError(true); setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setError(false), 3000);
      setPwd("");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#020817 0%,#1e1b4b 50%,#020817 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Outfit,sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1a1f3a)", border: "1px solid #1e3a5f", borderRadius: "24px", padding: "48px 40px", width: "100%", maxWidth: "380px", textAlign: "center", animation: shake ? "shake 0.4s ease" : "none" }}>
        <div style={{ width: "64px", height: "64px", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", margin: "0 auto 24px" }}>🎓</div>
        <div style={{ fontSize: "22px", fontWeight: "800", background: "linear-gradient(90deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "6px" }}>Qualiopi Tracker</div>
        <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "32px" }}>{NOM_ETABLISSEMENT} - Acces securise</div>
        <div style={{ marginBottom: "16px", textAlign: "left" }}>
          <label style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600" }}>Mot de passe</label>
          <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="Saisir le mot de passe" autoFocus
            style={{ display: "block", width: "100%", marginTop: "8px", background: "#1e293b", border: `1px solid ${error ? "#EF4444" : "#334155"}`, borderRadius: "10px", color: "#e2e8f0", padding: "12px 16px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
          {error && <div style={{ fontSize: "12px", color: "#EF4444", marginTop: "6px" }}>Mot de passe incorrect</div>}
        </div>
        <button onClick={handleSubmit} style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: "10px", color: "white", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>
          Acceder au tableau de bord
        </button>
        <div style={{ marginTop: "24px", fontSize: "11px", color: "#334155", lineHeight: "1.5" }}>Acces reserve a l'equipe {NOM_ETABLISSEMENT} - RGPD</div>
      </div>
    </div>
  );
}

function GaugeChart({ value, max, color }) {
  const pct = (value / max) * 100, r = 36, circ = 2 * Math.PI * r;
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
      <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} strokeLinecap="round" transform="rotate(-90 45 45)" style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x="45" y="48" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{Math.round(pct)}%</text>
    </svg>
  );
}

function StatusBadge({ statut }) {
  const cfg = STATUT_CONFIG[statut];
  return <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, borderRadius: "20px", padding: "2px 10px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>{cfg.icon} {cfg.label}</span>;
}

function ProgressBar({ value, max, color }) {
  return <div style={{ background: "#1e293b", borderRadius: "4px", height: "6px", overflow: "hidden" }}><div style={{ width: `${(value / max) * 100}%`, background: color, height: "100%", transition: "width 0.8s ease" }} /></div>;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [criteres, setCriteres] = useState(CRITERES_DATA);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterCritere, setFilterCritere] = useState("tous");
  const [filterResp, setFilterResp] = useState("tous");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { if (sessionStorage.getItem("qualiopi_auth") === "ok") setIsLoggedIn(true); }, []);
  function handleLogin() { sessionStorage.setItem("qualiopi_auth", "ok"); setIsLoggedIn(true); }
  function handleLogout() { sessionStorage.removeItem("qualiopi_auth"); setIsLoggedIn(false); }
  if (!isLoggedIn) return <LoginPage onLogin={handleLogin} />;

  const today = new Date();
  const stats = { total: criteres.length, conforme: criteres.filter(c => c.statut === "conforme").length, enCours: criteres.filter(c => c.statut === "en-cours").length, nonConforme: criteres.filter(c => c.statut === "non-conforme").length };
  const urgents = criteres.filter(c => (new Date(c.delai) - today) / 86400000 <= 30 && c.statut !== "conforme");
  const filtered = criteres.filter(c => {
    if (filterStatut !== "tous" && c.statut !== filterStatut) return false;
    if (filterCritere !== "tous" && c.critere !== parseInt(filterCritere)) return false;
    if (filterResp !== "tous" && c.responsable !== filterResp) return false;
    if (searchTerm && !c.titre.toLowerCase().includes(searchTerm.toLowerCase()) && !c.num.includes(searchTerm)) return false;
    return true;
  });
  const axes = criteres.filter(c => c.statut !== "conforme").sort((a, b) => ({ "non-conforme": 0, "en-cours": 1 }[a.statut] - { "non-conforme": 0, "en-cours": 1 }[b.statut] || new Date(a.delai) - new Date(b.delai)));
  const byResp = RESPONSABLES.map(r => ({ name: r, total: criteres.filter(c => c.responsable === r).length, conforme: criteres.filter(c => c.responsable === r && c.statut === "conforme").length, nonConforme: criteres.filter(c => c.responsable === r && c.statut === "non-conforme").length, urgents: criteres.filter(c => c.responsable === r && (new Date(c.delai) - today) / 86400000 <= 30 && c.statut !== "conforme").length }));

  function startEdit(c) { setEditId(c.id); setEditData({ ...c }); }
  function saveEdit() { setCriteres(p => p.map(c => c.id === editId ? { ...editData } : c)); setEditId(null); }
  const days = d => Math.round((new Date(d) - today) / 86400000);

  const nb = col => ({ minWidth: "40px", padding: "3px 8px", background: `${col}20`, color: col, borderRadius: "6px", fontSize: "12px", fontWeight: "700", textAlign: "center", border: `1px solid ${col}40` });
  const btn = col => ({ background: `linear-gradient(135deg,${col},${col}cc)`, border: "none", borderRadius: "6px", color: "white", padding: "4px 12px", fontSize: "11px", fontWeight: "700", cursor: "pointer" });
  const inp = { background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#e2e8f0", padding: "4px 8px", fontSize: "12px", width: "100%" };
  const sel = { background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#e2e8f0", padding: "4px 8px", fontSize: "12px" };
  const card = { background: "linear-gradient(135deg,#0f172a,#1a1f3a)", border: "1px solid #1e3a5f", borderRadius: "16px", padding: "24px" };
  const navBtn = active => ({ padding: "8px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", background: active ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "transparent", color: active ? "white" : "#94a3b8" });
  const th = { textAlign: "left", padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid #1e3a5f" };
  const td = { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #0f172a", verticalAlign: "middle" };
  const dayColor = d => days(d) < 0 ? "#EF4444" : days(d) < 30 ? "#F97316" : "#64748b";

  return (
    <div style={{ minHeight: "100vh", background: "#020817", fontFamily: "Outfit,sans-serif", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e1b4b,#0f172a)", borderBottom: "1px solid #1e3a5f", padding: "0 32px" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "44px", height: "44px", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>🎓</div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: "800", background: "linear-gradient(90deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>QUALIOPI TRACKER — {NOM_ETABLISSEMENT}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>32 indicateurs - {new Date().toLocaleDateString("fr-FR")}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            {[["dashboard","Tableau de bord"],["criteres","Indicateurs"],["axes","Axes a travailler"],["responsables","Responsables"]].map(([t, l]) => <button key={t} style={navBtn(activeTab === t)} onClick={() => setActiveTab(t)}>{l}</button>)}
            <button onClick={handleLogout} style={{ ...navBtn(false), color: "#475569", fontSize: "12px", marginLeft: "8px" }}>Deconnexion</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "32px" }}>

        {activeTab === "dashboard" && <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "28px" }}>
            {[["#10B981",stats.conforme,"Conformes"],["#F59E0B",stats.enCours,"En cours"],["#EF4444",stats.nonConforme,"Non conformes"],["#F97316",urgents.length,"Urgents moins 30j"]].map(([color,num,label]) => (
              <div key={label} style={{ background: `linear-gradient(135deg,${color}15,${color}05)`, border: `1px solid ${color}30`, borderRadius: "16px", padding: "20px 24px" }}>
                <div style={{ fontSize: "36px", fontWeight: "900", color, lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>
            <div style={card}>
              <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>Score global</div>
              <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                <GaugeChart value={stats.conforme} max={stats.total} color="#3b82f6" />
                <div style={{ flex: 1 }}>
                  {[["Conforme",stats.conforme,"#10B981"],["En cours",stats.enCours,"#F59E0B"],["Non conforme",stats.nonConforme,"#EF4444"]].map(([l,v,col]) => (
                    <div key={l} style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}><span>{l}</span><span>{v}/{stats.total}</span></div>
                      <ProgressBar value={v} max={stats.total} color={col} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>Score par critere</div>
              {Object.entries(CRITERES_LABELS).map(([num, cfg]) => {
                const cr = criteres.filter(c => c.critere === parseInt(num)), ok = cr.filter(c => c.statut === "conforme").length;
                return <div key={num} style={{ marginBottom: "10px" }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginBottom: "3px" }}><span>C{num} - {cfg.label}</span><span style={{ color: cfg.color }}>{ok}/{cr.length}</span></div><ProgressBar value={ok} max={cr.length} color={cfg.color} /></div>;
              })}
            </div>
          </div>
          {urgents.length > 0 && <div style={card}>
            <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>Indicateurs urgents (moins de 30 jours)</div>
            {urgents.map(c => (
              <div key={c.id} style={{ background: c.statut === "non-conforme" ? "#450a0a" : "#1c1917", border: `1px solid ${c.statut === "non-conforme" ? "#991b1b" : "#292524"}`, borderRadius: "12px", padding: "14px 18px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={nb(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: "600" }}>{c.titre}</div><div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{c.responsable} - {new Date(c.delai).toLocaleDateString("fr-FR")}</div></div>
                <StatusBadge statut={c.statut} />
                <span style={{ fontSize: "11px", color: dayColor(c.delai), fontWeight: "700" }}>{days(c.delai) < 0 ? `${Math.abs(days(c.delai))}j depasse` : `J-${days(c.delai)}`}</span>
              </div>
            ))}
          </div>}
        </>}

        {activeTab === "criteres" && <>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inp, width: "200px" }} />
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={sel}><option value="tous">Tous statuts</option><option value="conforme">Conforme</option><option value="en-cours">En cours</option><option value="non-conforme">Non conforme</option></select>
            <select value={filterCritere} onChange={e => setFilterCritere(e.target.value)} style={sel}><option value="tous">Tous criteres</option>{Object.entries(CRITERES_LABELS).map(([n,c]) => <option key={n} value={n}>C{n} - {c.label}</option>)}</select>
            <select value={filterResp} onChange={e => setFilterResp(e.target.value)} style={sel}><option value="tous">Tous responsables</option>{RESPONSABLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
            <span style={{ fontSize: "12px", color: "#64748b" }}>{filtered.length} resultat(s)</span>
          </div>
          <div style={card}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["N","Indicateur","Responsable","Echeance","Statut","Notes","Action"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(c => {
                  const col = CRITERES_LABELS[c.critere].color, isEdit = editId === c.id, d = days(c.delai);
                  return (
                    <tr key={c.id} style={{ background: isEdit ? "#1e3a5f20" : "transparent" }}>
                      <td style={td}><span style={nb(col)}>{c.num}</span></td>
                      <td style={{ ...td, maxWidth: "260px" }}><div style={{ fontWeight: "500" }}>{c.titre}</div><div style={{ fontSize: "11px", color: "#475569" }}>{CRITERES_LABELS[c.critere].label}</div></td>
                      <td style={td}>{isEdit ? <select value={editData.responsable} onChange={e => setEditData({ ...editData, responsable: e.target.value })} style={sel}>{RESPONSABLES.map(r => <option key={r}>{r}</option>)}</select> : c.responsable}</td>
                      <td style={td}>{isEdit ? <input type="date" value={editData.delai} onChange={e => setEditData({ ...editData, delai: e.target.value })} style={inp} /> : <div><div>{new Date(c.delai).toLocaleDateString("fr-FR")}</div><div style={{ fontSize: "10px", color: dayColor(c.delai) }}>{d < 0 ? `${Math.abs(d)}j depasse` : `J-${d}`}</div></div>}</td>
                      <td style={td}>{isEdit ? <select value={editData.statut} onChange={e => setEditData({ ...editData, statut: e.target.value })} style={sel}><option value="conforme">Conforme</option><option value="en-cours">En cours</option><option value="non-conforme">Non conforme</option></select> : <StatusBadge statut={c.statut} />}</td>
                      <td style={{ ...td, maxWidth: "200px" }}>{isEdit ? <input value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })} style={inp} /> : <span style={{ fontSize: "12px", color: "#64748b" }}>{c.notes || "-"}</span>}</td>
                      <td style={td}>{isEdit ? <button onClick={saveEdit} style={btn("#10B981")}>Sauver</button> : <button onClick={() => startEdit(c)} style={btn("#3B82F6")}>Editer</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>}

        {activeTab === "axes" && <>
          <h2 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "6px" }}>Axes prioritaires d'amelioration</h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>{stats.nonConforme} non conforme(s) - {stats.enCours} en cours</p>
          <div style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "700", marginBottom: "12px", textTransform: "uppercase" }}>Non conformes - Action immediate</div>
          {axes.filter(c => c.statut === "non-conforme").map(c => (
            <div key={c.id} style={{ background: "#450a0a", border: "1px solid #991b1b", borderLeft: "4px solid #EF4444", borderRadius: "12px", padding: "16px 20px", marginBottom: "10px", display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <span style={nb(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "4px" }}>{c.titre}</div><div style={{ fontSize: "12px", color: "#94a3b8" }}>{CRITERES_LABELS[c.critere].label}</div>{c.notes && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "6px" }}>{c.notes}</div>}</div>
              <div style={{ textAlign: "right" }}><StatusBadge statut={c.statut} /><div style={{ fontSize: "12px", color: "#EF4444", marginTop: "6px" }}>{new Date(c.delai).toLocaleDateString("fr-FR")}</div><div style={{ fontSize: "11px", color: "#F97316" }}>{days(c.delai) < 0 ? `${Math.abs(days(c.delai))}j depasse` : `J-${days(c.delai)}`}</div><div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>{c.responsable}</div></div>
            </div>
          ))}
          <div style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "700", marginBottom: "12px", marginTop: "24px", textTransform: "uppercase" }}>En cours - A finaliser</div>
          {axes.filter(c => c.statut === "en-cours").map(c => (
            <div key={c.id} style={{ background: "#1c1205", border: "1px solid #78350f", borderLeft: "4px solid #F59E0B", borderRadius: "12px", padding: "14px 20px", marginBottom: "8px", display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <span style={nb(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: "600" }}>{c.titre}</div><div style={{ fontSize: "11px", color: "#64748b" }}>{CRITERES_LABELS[c.critere].label}</div>{c.notes && <div style={{ fontSize: "11px", color: "#fcd34d", marginTop: "4px" }}>{c.notes}</div>}</div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: "12px", color: "#94a3b8" }}>{new Date(c.delai).toLocaleDateString("fr-FR")}</div><div style={{ fontSize: "11px", color: dayColor(c.delai) }}>{days(c.delai) < 0 ? `${Math.abs(days(c.delai))}j depasse` : `J-${days(c.delai)}`}</div><div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>{c.responsable}</div></div>
            </div>
          ))}
        </>}

        {activeTab === "responsables" && <>
          <h2 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "6px" }}>Vue par responsable</h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>{RESPONSABLES.length} responsables</p>
          {byResp.map(r => {
            const myItems = criteres.filter(c => c.responsable === r.name).sort((a, b) => ({ "non-conforme": 0, "en-cours": 1, "conforme": 2 }[a.statut] - { "non-conforme": 0, "en-cours": 1, "conforme": 2 }[b.statut]));
            return (
              <div key={r.name} style={{ ...card, marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "800", color: "white" }}>{r.name.charAt(0)}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: "16px", fontWeight: "700" }}>{r.name}</div><div style={{ fontSize: "12px", color: "#64748b" }}>{r.conforme} conforme(s) - {r.total - r.conforme} a traiter{r.urgents > 0 ? ` - ${r.urgents} urgent(s)` : ""}</div></div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[["#10B981",r.conforme,"OK"],["#EF4444",r.nonConforme,"KO"]].map(([col,val,label]) => (
                      <span key={label} style={{ background: `${col}15`, border: `1px solid ${col}30`, padding: "6px 12px", borderRadius: "8px" }}>
                        <span style={{ fontSize: "18px", fontWeight: "800", color: col }}>{val}</span>
                        <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "4px" }}>{label}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <ProgressBar value={r.conforme} max={r.total} color="#3b82f6" />
                <div style={{ marginTop: "14px" }}>
                  {myItems.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid #0f172a" }}>
                      <span style={nb(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
                      <div style={{ flex: 1, fontSize: "12px" }}>{c.titre}</div>
                      <StatusBadge statut={c.statut} />
                      <div style={{ fontSize: "11px", color: dayColor(c.delai), minWidth: "80px", textAlign: "right" }}>{new Date(c.delai).toLocaleDateString("fr-FR")}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>}
      </div>
    </div>
  );
}
