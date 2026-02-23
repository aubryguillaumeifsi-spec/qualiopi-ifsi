import { useState, useEffect } from "react";

const CRITERES_DATA = [
  // Critère 1 - Information du public (5 indicateurs)
  { id: 1, num: "1.1", critere: 1, titre: "Publicité des prestations et conditions d'accès", responsable: "Marie Dupont", delai: "2025-03-15", statut: "conforme", notes: "Site web à jour, livret d'accueil révisé" },
  { id: 2, num: "1.2", critere: 1, titre: "Communication sur les résultats obtenus", responsable: "Marie Dupont", delai: "2025-04-01", statut: "en-cours", notes: "Taux de réussite à publier sur site" },
  { id: 3, num: "1.3", critere: 1, titre: "Information sur l'accessibilité aux personnes handicapées", responsable: "Jean Martin", delai: "2025-03-30", statut: "non-conforme", notes: "Référent handicap à nommer" },
  { id: 4, num: "1.4", critere: 1, titre: "Tarifs et modalités de financement", responsable: "Marie Dupont", delai: "2025-02-28", statut: "conforme", notes: "" },
  { id: 5, num: "1.5", critere: 1, titre: "Délais d'accès à la formation", responsable: "Marie Dupont", delai: "2025-03-15", statut: "en-cours", notes: "Calendrier à mettre à jour" },
  // Critère 2 - Identification des objectifs (4 indicateurs)
  { id: 6, num: "2.1", critere: 2, titre: "Analyse des besoins des bénéficiaires potentiels", responsable: "Sophie Bernard", delai: "2025-05-01", statut: "conforme", notes: "Entretiens d'admission structurés" },
  { id: 7, num: "2.2", critere: 2, titre: "Objectifs opérationnels et évaluables définis", responsable: "Sophie Bernard", delai: "2025-04-15", statut: "conforme", notes: "Référentiel de compétences UE" },
  { id: 8, num: "2.3", critere: 2, titre: "Contenus et modalités pédagogiques adaptés", responsable: "Pierre Leclerc", delai: "2025-06-01", statut: "en-cours", notes: "Maquette pédagogique en révision" },
  { id: 9, num: "2.4", critere: 2, titre: "Modalités d'évaluation des acquis", responsable: "Pierre Leclerc", delai: "2025-05-15", statut: "conforme", notes: "" },
  // Critère 3 - Adaptation aux publics (4 indicateurs)
  { id: 10, num: "3.1", critere: 3, titre: "Positionnement des bénéficiaires à l'entrée", responsable: "Anne Moreau", delai: "2025-03-01", statut: "conforme", notes: "Grilles de positionnement validées" },
  { id: 11, num: "3.2", critere: 3, titre: "Adaptation des parcours", responsable: "Anne Moreau", delai: "2025-04-01", statut: "en-cours", notes: "Parcours VAE à formaliser" },
  { id: 12, num: "3.3", critere: 3, titre: "Accompagnement des bénéficiaires", responsable: "Anne Moreau", delai: "2025-03-15", statut: "conforme", notes: "Référents pédagogiques désignés" },
  { id: 13, num: "3.4", critere: 3, titre: "Accessibilité et compensation du handicap", responsable: "Jean Martin", delai: "2025-05-01", statut: "non-conforme", notes: "Plan d'accessibilité à élaborer" },
  // Critère 4 - Moyens pédagogiques (6 indicateurs)
  { id: 14, num: "4.1", critere: 4, titre: "Coordination pédagogique assurée", responsable: "Pierre Leclerc", delai: "2025-02-15", statut: "conforme", notes: "" },
  { id: 15, num: "4.2", critere: 4, titre: "Ressources pédagogiques et techniques mobilisées", responsable: "Lucie Petit", delai: "2025-04-30", statut: "en-cours", notes: "Moodle à enrichir" },
  { id: 16, num: "4.3", critere: 4, titre: "Environnement numérique adapté", responsable: "Lucie Petit", delai: "2025-06-15", statut: "en-cours", notes: "Audit numérique prévu" },
  { id: 17, num: "4.4", critere: 4, titre: "Locaux et équipements adaptés", responsable: "Robert Simon", delai: "2025-03-30", statut: "conforme", notes: "Salles de simulation renouvelées" },
  { id: 18, num: "4.5", critere: 4, titre: "Encadrement et suivi des stages", responsable: "Sophie Bernard", delai: "2025-05-01", statut: "non-conforme", notes: "Conventionnement terrains de stage à réviser" },
  { id: 19, num: "4.6", critere: 4, titre: "Sous-traitance et partenariats", responsable: "Pierre Leclerc", delai: "2025-07-01", statut: "en-cours", notes: "Formalisation des partenariats UE" },
  // Critère 5 - Qualification du personnel (4 indicateurs)
  { id: 20, num: "5.1", critere: 5, titre: "Qualification des intervenants", responsable: "Christine Faure", delai: "2025-03-01", statut: "conforme", notes: "CVs et diplômes à jour" },
  { id: 21, num: "5.2", critere: 5, titre: "Développement des compétences des formateurs", responsable: "Christine Faure", delai: "2025-06-30", statut: "en-cours", notes: "Plan de formation formateurs 2025 en cours" },
  { id: 22, num: "5.3", critere: 5, titre: "Intégration et accompagnement des nouveaux intervenants", responsable: "Christine Faure", delai: "2025-04-15", statut: "conforme", notes: "Livret d'intégration existant" },
  { id: 23, num: "5.4", critere: 5, titre: "Veille légale et réglementaire assurée", responsable: "Marie Dupont", delai: "2025-12-31", statut: "en-cours", notes: "Tableau de veille à compléter" },
  // Critère 6 - Inscription dans l'environnement (5 indicateurs)
  { id: 24, num: "6.1", critere: 6, titre: "Veille sur les évolutions du secteur professionnel", responsable: "Sophie Bernard", delai: "2025-12-31", statut: "en-cours", notes: "Participation aux COPIL régionaux" },
  { id: 25, num: "6.2", critere: 6, titre: "Partenariats avec les acteurs de l'environnement", responsable: "Robert Simon", delai: "2025-09-01", statut: "conforme", notes: "Conventions CHU et cliniques" },
  { id: 26, num: "6.3", critere: 6, titre: "Insertion professionnelle des apprenants", responsable: "Anne Moreau", delai: "2025-10-01", statut: "en-cours", notes: "Suivi à 6 mois à mettre en place" },
  { id: 27, num: "6.4", critere: 6, titre: "Contribution du prestataire à son environnement", responsable: "Robert Simon", delai: "2025-11-01", statut: "conforme", notes: "Participation aux journées portes ouvertes" },
  { id: 28, num: "6.5", critere: 6, titre: "Pratiques écoresponsables", responsable: "Lucie Petit", delai: "2025-12-01", statut: "non-conforme", notes: "Bilan carbone non réalisé" },
  // Critère 7 - Appréciations et réclamations (4 indicateurs)
  { id: 29, num: "7.1", critere: 7, titre: "Recueil des appréciations des parties prenantes", responsable: "Christine Faure", delai: "2025-03-15", statut: "conforme", notes: "Enquêtes de satisfaction annuelles" },
  { id: 30, num: "7.2", critere: 7, titre: "Traitement des réclamations", responsable: "Christine Faure", delai: "2025-03-15", statut: "conforme", notes: "Procédure réclamations formalisée" },
  { id: 31, num: "7.3", critere: 7, titre: "Mesures d'amélioration mises en œuvre", responsable: "Marie Dupont", delai: "2025-06-01", statut: "en-cours", notes: "Plan d'amélioration continue à finaliser" },
  { id: 32, num: "7.4", critere: 7, titre: "Analyse des causes d'abandon et rupture", responsable: "Anne Moreau", delai: "2025-05-01", statut: "en-cours", notes: "Outil de suivi des abandons à créer" },
];

const CRITERES_LABELS = {
  1: { label: "Information du public", color: "#3B82F6" },
  2: { label: "Identification des objectifs", color: "#8B5CF6" },
  3: { label: "Adaptation aux publics", color: "#EC4899" },
  4: { label: "Moyens pédagogiques", color: "#F59E0B" },
  5: { label: "Qualification du personnel", color: "#10B981" },
  6: { label: "Environnement professionnel", color: "#06B6D4" },
  7: { label: "Appréciations & réclamations", color: "#EF4444" },
};

const STATUT_CONFIG = {
  "conforme": { label: "Conforme", color: "#10B981", bg: "#D1FAE5", icon: "✓" },
  "en-cours": { label: "En cours", color: "#F59E0B", bg: "#FEF3C7", icon: "⟳" },
  "non-conforme": { label: "Non conforme", color: "#EF4444", bg: "#FEE2E2", icon: "✗" },
};

const RESPONSABLES = [...new Set(CRITERES_DATA.map(c => c.responsable))];

function GaugeChart({ value, max, color }) {
  const pct = (value / max) * 100;
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
      <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 45 45)"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x="45" y="48" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="'DM Mono', monospace">{Math.round(pct)}%</text>
    </svg>
  );
}

function StatusBadge({ statut }) {
  const cfg = STATUT_CONFIG[statut];
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`,
      borderRadius: "20px", padding: "2px 10px", fontSize: "11px", fontWeight: "700",
      fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px", whiteSpace: "nowrap"
    }}>{cfg.icon} {cfg.label}</span>
  );
}

function ProgressBar({ value, max, color }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
      <div style={{ width: `${(value / max) * 100}%`, background: color, height: "100%", borderRadius: "4px", transition: "width 0.8s ease" }} />
    </div>
  );
}

export default function Qualiopi() {
  const [criteres, setCriteres] = useState(CRITERES_DATA);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterCritere, setFilterCritere] = useState("tous");
  const [filterResp, setFilterResp] = useState("tous");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const stats = {
    total: criteres.length,
    conforme: criteres.filter(c => c.statut === "conforme").length,
    enCours: criteres.filter(c => c.statut === "en-cours").length,
    nonConforme: criteres.filter(c => c.statut === "non-conforme").length,
  };

  const today = new Date();
  const urgents = criteres.filter(c => {
    const d = new Date(c.delai);
    const diff = (d - today) / (1000 * 60 * 60 * 24);
    return diff <= 30 && c.statut !== "conforme";
  });

  const filtered = criteres.filter(c => {
    if (filterStatut !== "tous" && c.statut !== filterStatut) return false;
    if (filterCritere !== "tous" && c.critere !== parseInt(filterCritere)) return false;
    if (filterResp !== "tous" && c.responsable !== filterResp) return false;
    if (searchTerm && !c.titre.toLowerCase().includes(searchTerm.toLowerCase()) && !c.num.includes(searchTerm)) return false;
    return true;
  });

  const axesATravail = criteres.filter(c => c.statut !== "conforme").sort((a, b) => {
    const da = new Date(a.delai), db = new Date(b.delai);
    if (a.statut === "non-conforme" && b.statut !== "non-conforme") return -1;
    if (a.statut !== "non-conforme" && b.statut === "non-conforme") return 1;
    return da - db;
  });

  function startEdit(c) {
    setEditId(c.id);
    setEditData({ ...c });
  }

  function saveEdit() {
    setCriteres(prev => prev.map(c => c.id === editId ? { ...editData } : c));
    setEditId(null);
  }

  const s = {
    app: {
      minHeight: "100vh",
      background: "#020817",
      fontFamily: "'Outfit', 'DM Mono', sans-serif",
      color: "#e2e8f0",
    },
    header: {
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
      borderBottom: "1px solid #1e3a5f",
      padding: "0 32px",
    },
    headerInner: {
      maxWidth: "1400px",
      margin: "0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "20px 0",
    },
    logo: {
      display: "flex",
      alignItems: "center",
      gap: "14px",
    },
    logoIcon: {
      width: "44px",
      height: "44px",
      background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "22px",
    },
    logoText: {
      fontSize: "20px",
      fontWeight: "800",
      background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      letterSpacing: "-0.5px",
    },
    logoSub: { fontSize: "12px", color: "#64748b", fontFamily: "'DM Mono', monospace" },
    nav: { display: "flex", gap: "4px" },
    navBtn: (active) => ({
      padding: "8px 18px",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "600",
      fontFamily: "'Outfit', sans-serif",
      transition: "all 0.2s",
      background: active ? "linear-gradient(135deg, #3b82f6, #8b5cf6)" : "transparent",
      color: active ? "white" : "#94a3b8",
    }),
    main: { maxWidth: "1400px", margin: "0 auto", padding: "32px" },
    grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" },
    card: {
      background: "linear-gradient(135deg, #0f172a 0%, #1a1f3a 100%)",
      border: "1px solid #1e3a5f",
      borderRadius: "16px",
      padding: "24px",
    },
    statCard: (color) => ({
      background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
      border: `1px solid ${color}30`,
      borderRadius: "16px",
      padding: "20px 24px",
    }),
    statNum: (color) => ({
      fontSize: "36px",
      fontWeight: "900",
      color,
      fontFamily: "'DM Mono', monospace",
      lineHeight: 1,
    }),
    statLabel: { fontSize: "12px", color: "#64748b", marginTop: "4px", textTransform: "uppercase", letterSpacing: "1px" },
    sectionTitle: { fontSize: "16px", fontWeight: "700", color: "#e2e8f0", marginBottom: "16px" },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" },
    critereRow: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "10px 0",
      borderBottom: "1px solid #1e3a5f",
    },
    table: { width: "100%", borderCollapse: "collapse" },
    th: {
      textAlign: "left",
      padding: "10px 14px",
      fontSize: "11px",
      fontWeight: "700",
      color: "#475569",
      textTransform: "uppercase",
      letterSpacing: "1px",
      borderBottom: "1px solid #1e3a5f",
      fontFamily: "'DM Mono', monospace",
    },
    td: {
      padding: "10px 14px",
      fontSize: "13px",
      borderBottom: "1px solid #0f172a",
      verticalAlign: "middle",
    },
    input: {
      background: "#1e293b",
      border: "1px solid #334155",
      borderRadius: "6px",
      color: "#e2e8f0",
      padding: "4px 8px",
      fontSize: "12px",
      fontFamily: "'Outfit', sans-serif",
      width: "100%",
    },
    select: {
      background: "#1e293b",
      border: "1px solid #334155",
      borderRadius: "6px",
      color: "#e2e8f0",
      padding: "4px 8px",
      fontSize: "12px",
      fontFamily: "'Outfit', sans-serif",
    },
    btn: (color) => ({
      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      border: "none",
      borderRadius: "6px",
      color: "white",
      padding: "4px 12px",
      fontSize: "11px",
      fontWeight: "700",
      cursor: "pointer",
      fontFamily: "'Outfit', sans-serif",
    }),
    alertCard: (urgence) => ({
      background: urgence ? "#450a0a" : "#1c1917",
      border: `1px solid ${urgence ? "#991b1b" : "#292524"}`,
      borderRadius: "12px",
      padding: "14px 18px",
      marginBottom: "10px",
      display: "flex",
      alignItems: "center",
      gap: "14px",
    }),
    filters: {
      display: "flex",
      gap: "10px",
      marginBottom: "20px",
      flexWrap: "wrap",
      alignItems: "center",
    },
    numBadge: (color) => ({
      minWidth: "40px",
      padding: "3px 8px",
      background: `${color}20`,
      color,
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: "700",
      fontFamily: "'DM Mono', monospace",
      textAlign: "center",
      border: `1px solid ${color}40`,
    }),
  };

  const byResp = RESPONSABLES.map(r => ({
    name: r,
    total: criteres.filter(c => c.responsable === r).length,
    conforme: criteres.filter(c => c.responsable === r && c.statut === "conforme").length,
    nonConforme: criteres.filter(c => c.responsable === r && c.statut === "non-conforme").length,
    urgents: criteres.filter(c => {
      if (c.responsable !== r) return false;
      const diff = (new Date(c.delai) - today) / (1000 * 60 * 60 * 24);
      return diff <= 30 && c.statut !== "conforme";
    }).length,
  }));

  return (
    <div style={s.app}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logo}>
            <div style={s.logoIcon}>🎓</div>
            <div>
              <div style={s.logoText}>QUALIOPI TRACKER — IFSI</div>
              <div style={s.logoSub}>Référentiel National Qualité · 32 indicateurs · {new Date().toLocaleDateString("fr-FR")}</div>
            </div>
          </div>
          <div style={s.nav}>
            {["dashboard", "criteres", "axes", "responsables"].map(t => (
              <button key={t} style={s.navBtn(activeTab === t)} onClick={() => setActiveTab(t)}>
                {t === "dashboard" ? "📊 Tableau de bord" : t === "criteres" ? "📋 Indicateurs" : t === "axes" ? "🎯 Axes à travailler" : "👤 Responsables"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={s.main}>
        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <>
            <div style={s.grid4}>
              {[
                { num: stats.conforme, label: "Conformes", color: "#10B981" },
                { num: stats.enCours, label: "En cours", color: "#F59E0B" },
                { num: stats.nonConforme, label: "Non conformes", color: "#EF4444" },
                { num: urgents.length, label: "Urgents (< 30j)", color: "#F97316" },
              ].map((s2, i) => (
                <div key={i} style={s.statCard(s2.color)}>
                  <div style={s.statNum(s2.color)}>{s2.num}</div>
                  <div style={s.statLabel}>{s2.label}</div>
                </div>
              ))}
            </div>

            <div style={s.grid2}>
              <div style={s.card}>
                <div style={s.sectionTitle}>Score de conformité global</div>
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <GaugeChart value={stats.conforme} max={stats.total} color="#3b82f6" />
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                        <span>Conforme</span><span>{stats.conforme}/{stats.total}</span>
                      </div>
                      <ProgressBar value={stats.conforme} max={stats.total} color="#10B981" />
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                        <span>En cours</span><span>{stats.enCours}/{stats.total}</span>
                      </div>
                      <ProgressBar value={stats.enCours} max={stats.total} color="#F59E0B" />
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                        <span>Non conforme</span><span>{stats.nonConforme}/{stats.total}</span>
                      </div>
                      <ProgressBar value={stats.nonConforme} max={stats.total} color="#EF4444" />
                    </div>
                  </div>
                </div>
              </div>

              <div style={s.card}>
                <div style={s.sectionTitle}>Score par critère</div>
                {Object.entries(CRITERES_LABELS).map(([num, cfg]) => {
                  const cr = criteres.filter(c => c.critere === parseInt(num));
                  const ok = cr.filter(c => c.statut === "conforme").length;
                  return (
                    <div key={num} style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginBottom: "3px" }}>
                        <span>C{num} — {cfg.label}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", color: cfg.color }}>{ok}/{cr.length}</span>
                      </div>
                      <ProgressBar value={ok} max={cr.length} color={cfg.color} />
                    </div>
                  );
                })}
              </div>
            </div>

            {urgents.length > 0 && (
              <div style={s.card}>
                <div style={s.sectionTitle}>⚠️ Indicateurs urgents (échéance dans 30 jours)</div>
                {urgents.map(c => {
                  const diff = Math.round((new Date(c.delai) - today) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={c.id} style={s.alertCard(c.statut === "non-conforme")}>
                      <span style={s.numBadge(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600" }}>{c.titre}</div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>👤 {c.responsable} · 📅 {new Date(c.delai).toLocaleDateString("fr-FR")}</div>
                      </div>
                      <StatusBadge statut={c.statut} />
                      <span style={{ fontSize: "11px", color: diff < 0 ? "#EF4444" : "#F97316", fontWeight: "700", fontFamily: "'DM Mono', monospace" }}>
                        {diff < 0 ? `${Math.abs(diff)}j dépassé` : `J-${diff}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* INDICATEURS */}
        {activeTab === "criteres" && (
          <>
            <div style={s.filters}>
              <input placeholder="🔍 Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ ...s.input, width: "200px" }} />
              <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={s.select}>
                <option value="tous">Tous statuts</option>
                <option value="conforme">Conforme</option>
                <option value="en-cours">En cours</option>
                <option value="non-conforme">Non conforme</option>
              </select>
              <select value={filterCritere} onChange={e => setFilterCritere(e.target.value)} style={s.select}>
                <option value="tous">Tous critères</option>
                {Object.entries(CRITERES_LABELS).map(([n, c]) => <option key={n} value={n}>C{n} — {c.label}</option>)}
              </select>
              <select value={filterResp} onChange={e => setFilterResp(e.target.value)} style={s.select}>
                <option value="tous">Tous responsables</option>
                {RESPONSABLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{filtered.length} résultat(s)</span>
            </div>

            <div style={s.card}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>N°</th>
                    <th style={s.th}>Indicateur</th>
                    <th style={s.th}>Responsable</th>
                    <th style={s.th}>Échéance</th>
                    <th style={s.th}>Statut</th>
                    <th style={s.th}>Notes</th>
                    <th style={s.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const color = CRITERES_LABELS[c.critere].color;
                    const isEdit = editId === c.id;
                    const diff = Math.round((new Date(c.delai) - today) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={c.id} style={{ background: isEdit ? "#1e3a5f20" : "transparent" }}>
                        <td style={s.td}><span style={s.numBadge(color)}>{c.num}</span></td>
                        <td style={{ ...s.td, maxWidth: "260px" }}>
                          <div style={{ fontSize: "13px", fontWeight: "500" }}>{c.titre}</div>
                          <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>{CRITERES_LABELS[c.critere].label}</div>
                        </td>
                        <td style={s.td}>
                          {isEdit
                            ? <select value={editData.responsable} onChange={e => setEditData({ ...editData, responsable: e.target.value })} style={s.select}>
                                {RESPONSABLES.map(r => <option key={r}>{r}</option>)}
                              </select>
                            : <span style={{ fontSize: "13px" }}>👤 {c.responsable}</span>}
                        </td>
                        <td style={s.td}>
                          {isEdit
                            ? <input type="date" value={editData.delai} onChange={e => setEditData({ ...editData, delai: e.target.value })} style={s.input} />
                            : <div>
                                <div style={{ fontSize: "13px", fontFamily: "'DM Mono', monospace" }}>{new Date(c.delai).toLocaleDateString("fr-FR")}</div>
                                <div style={{ fontSize: "10px", color: diff < 0 ? "#EF4444" : diff < 30 ? "#F97316" : "#64748b" }}>
                                  {diff < 0 ? `⚠ ${Math.abs(diff)}j dépassé` : `J-${diff}`}
                                </div>
                              </div>}
                        </td>
                        <td style={s.td}>
                          {isEdit
                            ? <select value={editData.statut} onChange={e => setEditData({ ...editData, statut: e.target.value })} style={s.select}>
                                <option value="conforme">Conforme</option>
                                <option value="en-cours">En cours</option>
                                <option value="non-conforme">Non conforme</option>
                              </select>
                            : <StatusBadge statut={c.statut} />}
                        </td>
                        <td style={{ ...s.td, maxWidth: "200px" }}>
                          {isEdit
                            ? <input value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })} style={s.input} />
                            : <span style={{ fontSize: "12px", color: "#64748b" }}>{c.notes || "—"}</span>}
                        </td>
                        <td style={s.td}>
                          {isEdit
                            ? <button onClick={saveEdit} style={s.btn("#10B981")}>💾 Sauver</button>
                            : <button onClick={() => startEdit(c)} style={s.btn("#3B82F6")}>✏ Éditer</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* AXES À TRAVAILLER */}
        {activeTab === "axes" && (
          <>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#e2e8f0", marginBottom: "6px" }}>🎯 Axes prioritaires d'amélioration</h2>
              <p style={{ fontSize: "13px", color: "#64748b" }}>
                {stats.nonConforme} indicateur(s) non conforme(s) · {stats.enCours} en cours · triés par priorité et échéance
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "700", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
                🔴 Non conformes — Action immédiate
              </div>
              {axesATravail.filter(c => c.statut === "non-conforme").map(c => {
                const color = CRITERES_LABELS[c.critere].color;
                const diff = Math.round((new Date(c.delai) - today) / (1000 * 60 * 60 * 24));
                return (
                  <div key={c.id} style={{
                    background: "#450a0a",
                    border: "1px solid #991b1b",
                    borderLeft: `4px solid #EF4444`,
                    borderRadius: "12px",
                    padding: "16px 20px",
                    marginBottom: "10px",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                      <span style={s.numBadge(color)}>{c.num}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "4px" }}>{c.titre}</div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>{CRITERES_LABELS[c.critere].label}</div>
                        {c.notes && <div style={{ fontSize: "12px", color: "#fca5a5", background: "#7f1d1d40", borderRadius: "6px", padding: "6px 10px" }}>💡 {c.notes}</div>}
                      </div>
                      <div style={{ textAlign: "right", minWidth: "120px" }}>
                        <StatusBadge statut={c.statut} />
                        <div style={{ fontSize: "12px", color: "#EF4444", marginTop: "6px", fontFamily: "'DM Mono', monospace" }}>
                          📅 {new Date(c.delai).toLocaleDateString("fr-FR")}
                        </div>
                        <div style={{ fontSize: "11px", color: "#F97316", marginTop: "2px" }}>
                          {diff < 0 ? `⚠ ${Math.abs(diff)}j dépassé` : `J-${diff}`}
                        </div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px" }}>👤 {c.responsable}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {axesATravail.filter(c => c.statut === "non-conforme").length === 0 &&
                <div style={{ fontSize: "13px", color: "#64748b", padding: "10px" }}>Aucun indicateur non conforme 🎉</div>}
            </div>

            <div>
              <div style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "700", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
                🟡 En cours — À finaliser
              </div>
              {axesATravail.filter(c => c.statut === "en-cours").map(c => {
                const color = CRITERES_LABELS[c.critere].color;
                const diff = Math.round((new Date(c.delai) - today) / (1000 * 60 * 60 * 24));
                return (
                  <div key={c.id} style={{
                    background: "#1c1205",
                    border: "1px solid #78350f",
                    borderLeft: `4px solid #F59E0B`,
                    borderRadius: "12px",
                    padding: "14px 20px",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                  }}>
                    <span style={s.numBadge(color)}>{c.num}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "3px" }}>{c.titre}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{CRITERES_LABELS[c.critere].label}</div>
                      {c.notes && <div style={{ fontSize: "11px", color: "#fcd34d", marginTop: "4px" }}>💡 {c.notes}</div>}
                    </div>
                    <div style={{ textAlign: "right", minWidth: "120px" }}>
                      <div style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
                        📅 {new Date(c.delai).toLocaleDateString("fr-FR")}
                      </div>
                      <div style={{ fontSize: "11px", color: diff < 30 ? "#F97316" : "#64748b", marginTop: "2px" }}>
                        {diff < 0 ? `⚠ ${Math.abs(diff)}j dépassé` : `J-${diff}`}
                      </div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>👤 {c.responsable}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* RESPONSABLES */}
        {activeTab === "responsables" && (
          <>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#e2e8f0", marginBottom: "6px" }}>👥 Vue par responsable</h2>
              <p style={{ fontSize: "13px", color: "#64748b" }}>{RESPONSABLES.length} responsables · chacun voit ses indicateurs et leurs priorités</p>
            </div>
            {byResp.map(r => {
              const myItems = criteres.filter(c => c.responsable === r.name);
              return (
                <div key={r.name} style={{ ...s.card, marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                    <div style={{
                      width: "44px", height: "44px", borderRadius: "50%",
                      background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "18px", fontWeight: "800", color: "white",
                    }}>{r.name.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "16px", fontWeight: "700" }}>{r.name}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {r.conforme} conforme(s) · {r.total - r.conforme} à traiter{r.urgents > 0 ? ` · ⚠ ${r.urgents} urgent(s)` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ ...s.statCard("#10B981"), padding: "6px 12px", borderRadius: "8px" }}>
                        <span style={{ fontSize: "18px", fontWeight: "800", color: "#10B981", fontFamily: "'DM Mono', monospace" }}>{r.conforme}</span>
                        <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "4px" }}>OK</span>
                      </span>
                      <span style={{ ...s.statCard("#EF4444"), padding: "6px 12px", borderRadius: "8px" }}>
                        <span style={{ fontSize: "18px", fontWeight: "800", color: "#EF4444", fontFamily: "'DM Mono', monospace" }}>{r.nonConforme}</span>
                        <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "4px" }}>KO</span>
                      </span>
                    </div>
                  </div>
                  <ProgressBar value={r.conforme} max={r.total} color="#3b82f6" />
                  <div style={{ marginTop: "14px" }}>
                    {myItems.sort((a, b) => {
                      const order = { "non-conforme": 0, "en-cours": 1, "conforme": 2 };
                      return order[a.statut] - order[b.statut];
                    }).map(c => {
                      const color = CRITERES_LABELS[c.critere].color;
                      const diff = Math.round((new Date(c.delai) - today) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid #0f172a" }}>
                          <span style={s.numBadge(color)}>{c.num}</span>
                          <div style={{ flex: 1, fontSize: "12px" }}>{c.titre}</div>
                          <StatusBadge statut={c.statut} />
                          <div style={{ fontSize: "11px", color: diff < 0 ? "#EF4444" : diff < 30 ? "#F97316" : "#64748b", fontFamily: "'DM Mono', monospace", minWidth: "80px", textAlign: "right" }}>
                            📅 {new Date(c.delai).toLocaleDateString("fr-FR")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
