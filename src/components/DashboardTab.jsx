import React from "react";

export function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ width: "100%", background: "#f1f5f9", borderRadius: "8px", height: "10px", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, background: color, height: "100%", transition: "width 0.5s ease" }} />
    </div>
  );
}

export default function DashboardTab({ bannerConfig, currentAuditDate, isArchive, handleEditAuditDate, stats, urgents, criteres, userProfile }) {
  const { total, conforme, enCours, nonConforme, nonEvalue, nonConcerne } = stats;
  const progress = Math.round((conforme / total) * 100) || 0;

  return (
    <div className="animate-fade-in">
      {/* Bannières Supérieures */}
      <div style={{ background: bannerConfig.bg, border: `1px solid ${bannerConfig.border}`, borderRadius: "12px", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <span style={{ fontSize: "32px" }}>{bannerConfig.icon}</span>
          <div>
            <div style={{ fontSize: "12px", fontWeight: "800", textTransform: "uppercase", color: bannerConfig.color, letterSpacing: "0.5px" }}>
              {bannerConfig.text}
            </div>
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#1e3a5f", display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              {new Date(currentAuditDate).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric' })}
              {/* Le petit crayon n'apparaît que pour Admin et Superadmin */}
              {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && !isArchive && (
                <button onClick={handleEditAuditDate} style={{ background: "white", border: `1px solid ${bannerConfig.border}`, borderRadius: "6px", cursor: "pointer", fontSize: "14px", padding: "4px 8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }} title="Modifier la date">✏️</button>
              )}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "32px", fontWeight: "900", color: bannerConfig.color }}>{progress}%</div>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Conformité globale</div>
        </div>
      </div>

      {/* Grille de Statistiques */}
      <div className="responsive-grid-5" style={{ marginBottom: "24px" }}>
        {[
          { label: "Conformes", val: conforme, col: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
          { label: "En cours", val: enCours, col: "#d97706", bg: "#fffbeb", border: "#fde68a" },
          { label: "Non conformes", val: nonConforme, col: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
          { label: "Non évalués", val: nonEvalue, col: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
          { label: "Non concernés", val: nonConcerne, col: "#9ca3af", bg: "#f3f4f6", border: "#e5e7eb" }
        ].map((s, i) => (
          <div key={i} className="td-dash" style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "32px", fontWeight: "900", color: s.col, lineHeight: "1" }}>{s.val}</div>
            <div style={{ fontSize: "12px", fontWeight: "800", color: s.col, marginTop: "8px", textTransform: "uppercase", opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alerte Urgences */}
      {urgents.length > 0 && (
        <div className="animate-fade-in" style={{ background: "white", border: "1px solid #fca5a5", borderRadius: "12px", padding: "20px", marginBottom: "24px", boxShadow: "0 4px 12px rgba(239,68,68,0.1)" }}>
           <h3 style={{ margin: "0 0 16px 0", color: "#ef4444", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
             <span>🚨</span> {urgents.length} indicateur(s) nécessitant une attention urgente (échéance &lt; 30 jours)
           </h3>
           <div className="alert-ticker" style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "12px" }}>
             {urgents.map(u => (
               <div key={u.id} className="td-dash" style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "12px 16px", minWidth: "220px", flexShrink: 0 }}>
                 <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
                    <span style={{ fontWeight: "900", color: "#991b1b", fontSize: "14px" }}>Indicateur {u.num}</span>
                    <span style={{ fontSize: "11px", fontWeight: "800", color: "#dc2626", background: "white", border: "1px solid #fca5a5", padding: "3px 8px", borderRadius: "6px" }}>
                      {new Date(u.delai).toLocaleDateString('fr-FR')}
                    </span>
                 </div>
                 <div style={{ fontSize: "13px", color: "#7f1d1d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "600" }}>{u.titre}</div>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
}
