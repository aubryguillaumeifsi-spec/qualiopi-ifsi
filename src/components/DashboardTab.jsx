import React from "react";
import { CRITERES_LABELS } from "../data";

export function ProgressBar({ value, max, color }) {
  return <div style={{ background: "#f1f5f9", borderRadius: "4px", height: "7px", overflow: "hidden" }}><div style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color, height: "100%", borderRadius: "4px", transition: "width 0.8s ease" }} /></div>;
}

export function GaugeChart({ value, max, color, size = 96, fontSize = 15 }) {
  const pct = max > 0 ? (value / max) * 100 : 0, r = (size/2) - 10, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={size*0.09} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.09} strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x={size/2} y={(size/2)+4} textAnchor="middle" fill="#1e3a5f" fontSize={fontSize} fontWeight="700" fontFamily="Outfit">{Math.round(pct)}%</text>
    </svg>
  );
}

export default function DashboardTab({ bannerConfig, currentAuditDate, isArchive, handleEditAuditDate, stats, urgents, criteres }) {
  const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };

  return (
    <>
      <div className="print-break-avoid no-print" style={{ background: bannerConfig.bg, border: `1px solid ${bannerConfig.border}`, borderRadius: "12px", padding: "16px 24px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>{bannerConfig.icon}</span>
          <div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: bannerConfig.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{bannerConfig.text}</div>
            <div style={{ fontSize: "12px", color: bannerConfig.color, opacity: 0.8, marginTop: "2px", fontWeight: "600" }}>Date officielle visée : {new Date(currentAuditDate).toLocaleDateString("fr-FR")}</div>
          </div>
        </div>
        {!isArchive && <button onClick={handleEditAuditDate} style={{ background: "transparent", border: `1px solid ${bannerConfig.color}`, color: bannerConfig.color, padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.opacity=0.7} onMouseOut={e=>e.currentTarget.style.opacity=1}>Modifier la date</button>}
      </div>

      <div className="print-break-avoid no-print td-dash" style={{ ...card, marginBottom: "24px", padding: "20px 24px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#1e3a5f", fontWeight: "800", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <span>🚀 État d'avancement global</span>
          <span style={{ fontSize: "15px", color: "#1d4ed8", fontWeight: "800", background: "#eff6ff", padding: "4px 10px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>{Math.round((stats.conforme / stats.total) * 100) || 0}% Achevé</span>
        </h3>
        <div style={{ display: "flex", height: "26px", borderRadius: "13px", overflow: "hidden", background: "#f1f5f9", gap: "3px", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ width: `${(stats.conforme / stats.total) * 100}%`, background: "#10b981", transition: "width 0.8s ease" }} title={`Conforme: ${stats.conforme}`} />
          <div style={{ width: `${(stats.enCours / stats.total) * 100}%`, background: "#f59e0b", transition: "width 0.8s ease" }} title={`En cours: ${stats.enCours}`} />
          <div style={{ width: `${(stats.nonConforme / stats.total) * 100}%`, background: "#ef4444", transition: "width 0.8s ease" }} title={`Non conforme: ${stats.nonConforme}`} />
          <div style={{ width: `${(stats.nonEvalue / stats.total) * 100}%`, background: "#d1d5db", transition: "width 0.8s ease" }} title={`Non évalué: ${stats.nonEvalue}`} />
        </div>
        <div style={{ display: "flex", gap: "20px", marginTop: "14px", fontSize: "12px", fontWeight: "700", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981" }}></span><span style={{ color: "#065f46" }}>{stats.conforme} Conformes</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f59e0b" }}></span><span style={{ color: "#92400e" }}>{stats.enCours} En cours</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444" }}></span><span style={{ color: "#991b1b" }}>{stats.nonConforme} Non conformes</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#d1d5db" }}></span><span style={{ color: "#4b5563" }}>{stats.nonEvalue} À faire</span></div>
        </div>
      </div>

      <div className="print-break-avoid responsive-grid-5" style={{ marginBottom: "24px" }}>
        {[["#6b7280","#f3f4f6","#d1d5db",stats.nonEvalue,"Non évalués"],["#065f46","#d1fae5","#6ee7b7",stats.conforme,"Conformes"],["#92400e","#fef3c7","#fcd34d",stats.enCours,"En cours"],["#991b1b","#fee2e2","#fca5a5",stats.nonConforme,"Non conf."],["#b45309","#fef9c3","#fde68a",urgents.length,"Urgents < 30j"]].map(([color,bg,border,num,label]) => (
          <div key={label} className="td-dash" style={{ background: bg, border: `1px solid ${border}`, borderRadius: "10px", padding: "14px 16px", opacity: isArchive ? 0.8 : 1 }}>
             <div style={{ fontSize: "28px", fontWeight: "900", color, lineHeight: 1 }}>{num}</div>
             <div style={{ fontSize: "10px", color, opacity: 0.9, marginTop: "4px", textTransform: "uppercase", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
          </div>
        ))}
      </div>
      
      <div className="responsive-grid-2" style={{ marginBottom: "24px" }}>
        <div className="print-break-avoid td-dash" style={card}>
          <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>Score de conformité (sur {stats.total})</div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
            <GaugeChart value={stats.conforme} max={stats.total} color="#1d4ed8" />
            <div style={{ flex: 1, minWidth: "150px" }}>
              {[["Non évalué",stats.nonEvalue,"#9ca3af"],["Conforme",stats.conforme,"#059669"],["En cours",stats.enCours,"#d97706"],["Non conforme",stats.nonConforme,"#dc2626"]].map(([l,v,col]) => (
                <div key={l} style={{ marginBottom: "8px" }}>
                   <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}><span>{l}</span><span style={{ fontWeight: "600", color: col }}>{v}/{stats.total}</span></div>
                   <ProgressBar value={v} max={stats.total} color={col} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="print-break-avoid td-dash" style={card}>
          <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>Avancement par critère</div>
          {Object.entries(CRITERES_LABELS).map(([num, cfg]) => { 
            const cr = criteres.filter(c => c.critere === parseInt(num) && c.statut !== "non-concerne"); 
            const ok = cr.filter(c => c.statut === "conforme").length; 
            return (
              <div key={num} style={{ marginBottom: "11px" }}>
                 <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}><span style={{ fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>C{num} — {cfg.label}</span><span style={{ color: cfg.color, fontWeight: "700", marginLeft: "10px" }}>{ok}/{cr.length}</span></div>
                 <ProgressBar value={ok} max={cr.length === 0 ? 1 : cr.length} color={cfg.color} />
              </div>
            ); 
          })}
        </div>
      </div>
    </>
  );
}
