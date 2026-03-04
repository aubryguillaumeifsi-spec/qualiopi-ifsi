import React from "react";

/**
 * Composant de la Jauge Circulaire (utilisé aussi par la Tour de Contrôle)
 */
export function GaugeChart({ score }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#d97706" : "#ef4444";
  
  return (
    <div style={{ position: "relative", width: "80px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="40" cy="40" r={radius} stroke="#e2e8f0" strokeWidth="8" fill="none" />
        <circle cx="40" cy="40" r={radius} stroke={color} strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease-in-out" }} />
      </svg>
      <div style={{ position: "absolute", fontSize: "18px", fontWeight: "900", color: color }}>{score}%</div>
    </div>
  );
}

/**
 * Barre de progression horizontale
 */
export function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ width: "100%", background: "#f1f5f9", borderRadius: "8px", height: "10px", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, background: color, height: "100%", transition: "width 0.5s ease" }} />
    </div>
  );
}

/**
 * TABLEAU DE BORD PRINCIPAL
 */
export default function DashboardTab({ bannerConfig, currentAuditDate, isArchive, handleEditAuditDate, stats, urgents, criteres, userProfile }) {
  const { total, conforme, enCours, nonConforme, nonEvalue, nonConcerne } = stats;
  const progress = Math.round((conforme / total) * 100) || 0;

  // 📊 Calcul des preuves totales déposées
  const totalPreuves = criteres.reduce((acc, curr) => {
    const files = (curr.fichiers || []).length;
    const links = (curr.chemins_reseau || []).length;
    return acc + files + links;
  }, 0);

  // ⚡ Extraction de l'activité récente (5 derniers logs)
  const logs = [];
  criteres.forEach(c => {
    if (c.historique && Array.isArray(c.historique)) {
      c.historique.forEach(h => {
        logs.push({ ...h, num: c.num, titre: c.titre });
      });
    }
  });
  const lastActivities = logs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <div className="animate-fade-in">
      {/* 🔝 BANNIÈRE D'ÉTAT GLOBALE */}
      <div style={{ background: bannerConfig.bg, border: `1px solid ${bannerConfig.border}`, borderRadius: "12px", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <div style={{ fontSize: "40px", background: "white", width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
            {bannerConfig.icon}
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: "800", textTransform: "uppercase", color: bannerConfig.color, letterSpacing: "1px" }}>
              Date prévue de l'Audit
            </div>
            <div style={{ fontSize: "22px", fontWeight: "900", color: "#1e3a5f", display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
              {new Date(currentAuditDate).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric' })}
              {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && !isArchive && (
                <button onClick={handleEditAuditDate} style={{ background: "white", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontSize: "14px", padding: "6px 10px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.borderColor="#3b82f6"} onMouseOut={e=>e.currentTarget.style.borderColor="#cbd5e1"}>✏️ Modifier</button>
              )}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "38px", fontWeight: "950", color: bannerConfig.color, lineHeight: "1" }}>{progress}%</div>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", marginTop: "4px" }}>Conformité Totale</div>
        </div>
      </div>

      {/* 📊 GRILLE DE CHIFFRES CLÉS */}
      <div className="responsive-grid-5" style={{ marginBottom: "30px" }}>
        {[
          { label: "Indicateurs Conformes", val: conforme, col: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
          { label: "Chantiers en cours", val: enCours, col: "#d97706", bg: "#fffbeb", border: "#fde68a" },
          { label: "Non conformités", val: nonConforme, col: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
          { label: "Preuves déposées", val: totalPreuves, col: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
          { label: "Non concernés", val: nonConcerne, col: "#64748b", bg: "#f8fafc", border: "#e2e8f0" }
        ].map((s, i) => (
          <div key={i} className="td-dash" style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "36px", fontWeight: "900", color: s.col, lineHeight: "1" }}>{s.val}</div>
            <div style={{ fontSize: "10px", fontWeight: "800", color: s.col, marginTop: "10px", textTransform: "uppercase", textAlign: "center", letterSpacing: "0.5px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 🧭 ZONE DE PILOTAGE À DEUX COLONNES */}
      <div className="responsive-grid-2">
        
        {/* 🚨 BLOC URGENCES */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, color: "#1e3a5f", fontSize: "18px", fontWeight: "900", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ background: "#fee2e2", padding: "8px", borderRadius: "10px", fontSize: "20px" }}>🚨</span> Échéances proches
            </h3>
            {urgents.length > 0 && <span style={{ background: "#dc2626", color: "white", padding: "2px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "800" }}>{urgents.length}</span>}
          </div>
          
          {urgents.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {urgents.map(u => (
                <div key={u.id} className="td-dash" style={{ padding: "14px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <div style={{ overflow: "hidden" }}>
                     <div style={{ fontWeight: "800", color: "#1e3a5f", fontSize: "14px" }}>Indicateur {u.num}</div>
                     <div style={{ fontSize: "12px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>{u.titre}</div>
                   </div>
                   <div style={{ textAlign: "right", minWidth: "90px" }}>
                     <div style={{ fontSize: "13px", fontWeight: "900", color: "#dc2626" }}>{new Date(u.delai).toLocaleDateString('fr-FR')}</div>
                     <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700" }}>DATE LIMITE</div>
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontStyle: "italic", fontSize: "15px" }}>
              <div style={{ fontSize: "30px", marginBottom: "10px" }}>✅</div>
              Tout est sous contrôle. Aucune échéance critique.
            </div>
          )}
        </div>

        {/* ⚡ BLOC ACTIVITÉ RÉCENTE */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 20px 0", color: "#1e3a5f", fontSize: "18px", fontWeight: "900", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ background: "#eff6ff", padding: "8px", borderRadius: "10px", fontSize: "20px" }}>⚡</span> Activité de l'équipe
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {lastActivities.length > 0 ? lastActivities.map((act, i) => (
              <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3b82f6", marginTop: "6px", flexShrink: 0, boxShadow: "0 0 0 4px #eff6ff" }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", color: "#334155", lineHeight: "1.5" }}>
                    <strong style={{ color: "#1d4ed8", fontWeight: "800" }}>{act.user.split('@')[0]}</strong> {act.msg}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px", fontWeight: "600", textTransform: "uppercase" }}>
                    Indicateur {act.num} • {new Date(act.date).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontStyle: "italic", fontSize: "15px" }}>
                Aucune modification récente enregistrée.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
