import React from "react";
import { GaugeChart } from "./DashboardTab";

export default function TourControleTab({
  globalScore, activeIfsis, totalUsersInNetwork, topAlerts, totalAlertsCount,
  tourSort, setTourSort, sortedTourIfsis, setSelectedIfsi, setActiveTab,
  handleRenameIfsi, handleArchiveIfsi, handleHardDeleteIfsi, archivedIfsis, today
}) {
  const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const sel = { background: "white", border: "1px solid #d1d5db", borderRadius: "7px", color: "#374151", padding: "7px 10px", fontSize: "12px", cursor: "pointer" };

  return (
    <div>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#312e81", margin: "0 0 4px" }}>🛸 Tour de Contrôle Nationale</h2>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>Supervision en direct de l'avancement de tous les établissements.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "linear-gradient(135deg, #4f46e5, #3b82f6)", borderRadius: "12px", padding: "20px", color: "white", boxShadow: "0 4px 10px rgba(79,70,229,0.2)" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase", opacity: 0.9 }}>Score National Moyen</div>
          <div style={{ fontSize: "36px", fontWeight: "900", marginTop: "4px" }}>{globalScore}%</div>
        </div>
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Établissements Actifs</div>
          <div style={{ fontSize: "32px", fontWeight: "900", color: "#1e3a5f", marginTop: "4px" }}>{activeIfsis.length}</div>
        </div>
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Utilisateurs Connectés</div>
          <div style={{ fontSize: "32px", fontWeight: "900", color: "#1e3a5f", marginTop: "4px" }}>{totalUsersInNetwork}</div>
        </div>
      </div>

      {topAlerts.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "800", color: "#991b1b", margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: "6px" }}>🚨 Alertes Urgentes sur le réseau</h3>
          <div className="alert-ticker" style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "10px" }}>
            {topAlerts.map((alert, i) => (
              <div key={i} style={{ minWidth: "280px", background: "#fef2f2", border: "1px solid #fca5a5", borderLeft: `4px solid ${alert.type === "non-conforme" ? "#ef4444" : "#f59e0b"}`, borderRadius: "8px", padding: "12px", cursor: "pointer" }} onClick={() => { setSelectedIfsi(alert.ifsiId); setActiveTab("axes"); }}>
                <div style={{ fontSize: "10px", color: "#991b1b", fontWeight: "800", textTransform: "uppercase", marginBottom: "4px" }}>{alert.ifsiName}</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e3a5f", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>C{alert.critere.num} - {alert.critere.titre}</div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: alert.type === "non-conforme" ? "#dc2626" : "#d97706" }}>
                  {alert.type === "non-conforme" ? "🔴 Non-conforme !" : `⏳ Dépassé de ${alert.days} jour(s)`}
                </div>
              </div>
            ))}
            {totalAlertsCount > 12 && (
              <div style={{ minWidth: "150px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                + {totalAlertsCount - 12} autres alertes
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #86efac", paddingBottom: "8px", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "16px", color: "#10b981", margin: 0 }}>✅ Établissements Actifs ({activeIfsis.length})</h3>
        <select value={tourSort} onChange={e => setTourSort(e.target.value)} style={{ ...sel, borderColor: "#cbd5e1", fontWeight: "600", padding: "6px 12px" }}>
          <option value="urgence">⏳ Trier par date d'audit (Plus proche)</option>
          <option value="score_desc">🏆 Trier par Score (Meilleurs en 1er)</option>
          <option value="score_asc">🚨 Trier par Score (En difficulté en 1er)</option>
          <option value="alpha">🔤 Trier par Nom (A-Z)</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        {sortedTourIfsis.map(s => {
          const auditDateObj = new Date(s.auditDate);
          const daysToAudit = Math.ceil((auditDateObj - today) / 86400000);
          const auditColor = daysToAudit < 0 ? "#ef4444" : daysToAudit <= 30 ? "#f59e0b" : "#10b981";
          const auditText = daysToAudit < 0 ? `Dépassé (${Math.abs(daysToAudit)}j)` : `J-${daysToAudit}`;

          return (
            <div key={s.id} className="td-dash" style={{ ...card, padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "1px solid #e0e7ff", background: "white", transition: "all 0.2s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#1e3a5f", margin: 0 }}>{s.name}</h3>
                    <button onClick={() => handleRenameIfsi(s.id, s.name)} style={{ border: "none", background: "#f1f5f9", borderRadius: "4px", padding: "2px 6px", cursor: "pointer", fontSize: "10px", color: "#64748b" }} title="Renommer">✏️</button>
                  </div>
                  <div style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "monospace", marginBottom: "8px" }}>ID: {s.id}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
                     <span>🗓️ {new Date(s.auditDate).toLocaleDateString("fr-FR")}</span>
                     <span style={{ background: auditColor+"20", color: auditColor, padding: "2px 6px", borderRadius: "4px", fontWeight: "800", fontSize: "10px" }}>{auditText}</span>
                  </div>
                </div>
                <GaugeChart value={s.conforme} max={s.total} color={s.pct >= 80 ? "#10b981" : s.pct >= 50 ? "#f59e0b" : "#ef4444"} size={64} fontSize={12} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <div style={{ background: "#f0fdf4", padding: "10px", borderRadius: "8px", border: "1px solid #86efac", textAlign: "center" }}>
                   <div style={{ fontSize: "18px", fontWeight: "800", color: "#166534" }}>{s.conforme}</div>
                   <div style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#15803d" }}>Conformes</div>
                </div>
                <div style={{ background: "#fef3c7", padding: "10px", borderRadius: "8px", border: "1px solid #fde68a", textAlign: "center" }}>
                   <div style={{ fontSize: "18px", fontWeight: "800", color: "#92400e" }}>{s.enCours}</div>
                   <div style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#d97706" }}>En cours</div>
                </div>
                <div style={{ background: "#fef2f2", padding: "10px", borderRadius: "8px", border: "1px solid #fca5a5", textAlign: "center" }}>
                   <div style={{ fontSize: "18px", fontWeight: "800", color: "#991b1b" }}>{s.nonConforme}</div>
                   <div style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#ef4444" }}>Non conf.</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => { setSelectedIfsi(s.id); setActiveTab("dashboard"); }} style={{ flex: 1, padding: "8px", background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "white", borderRadius: "8px", border: "none", fontWeight: "700", cursor: "pointer", fontSize: "12px" }}>🔎 Accéder</button>
                <button onClick={() => handleArchiveIfsi(s.id, s.name, true)} style={{ padding: "8px 12px", background: "white", color: "#f59e0b", border: "1px solid #fcd34d", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "12px" }}>📦 Archiver</button>
              </div>
            </div>
          );
        })}
        {sortedTourIfsis.length === 0 && <div style={{ color: "#9ca3af", fontStyle: "italic" }}>Aucun établissement actif.</div>}
      </div>

      {archivedIfsis.length > 0 && (
        <>
          <h3 style={{ fontSize: "16px", color: "#991b1b", borderBottom: "2px solid #fca5a5", paddingBottom: "8px", marginBottom: "16px", marginTop: "40px" }}>📦 Établissements Archivés ({archivedIfsis.length})</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
            {archivedIfsis.map(ifsi => {
              return (
                <div key={ifsi.id} style={{ ...card, padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "1px dashed #fca5a5", background: "#fef2f2", opacity: 0.9 }}>
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#991b1b", margin: 0 }}>{ifsi.name}</h3>
                      <button onClick={() => handleRenameIfsi(ifsi.id, ifsi.name)} style={{ border: "none", background: "white", borderRadius: "4px", padding: "2px 6px", cursor: "pointer", fontSize: "10px", color: "#64748b" }} title="Renommer">✏️</button>
                    </div>
                    <div style={{ fontSize: "11px", color: "#ef4444", fontFamily: "monospace", marginBottom: "8px" }}>ID: {ifsi.id}</div>
                    <p style={{ fontSize: "12px", color: "#991b1b", margin: 0 }}>Cet établissement est invisible pour ses utilisateurs.</p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button onClick={() => handleArchiveIfsi(ifsi.id, ifsi.name, false)} style={{ padding: "8px", background: "white", color: "#10b981", border: "1px solid #86efac", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "12px" }}>♻️ Restaurer l'établissement</button>
                    <button onClick={() => handleHardDeleteIfsi(ifsi.id, ifsi.name)} style={{ padding: "8px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "12px" }}>⚠️ Supprimer définitivement</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
