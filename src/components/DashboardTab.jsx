import React from "react";
import { CRITERES_LABELS } from "../data";

export function GaugeChart({ pct, score, color }) {
  const val = pct !== undefined ? pct : (score !== undefined ? score : 0);
  const c = color || "#1d4ed8";
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (val / 100) * circ;
  return (
    <div style={{ position: "relative", width: "80px", height: "80px" }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="40" cy="40" r={r} fill="transparent" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="transparent" stroke={c} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease-out" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "900" }}>
        {val}%
      </div>
    </div>
  );
}

export function ProgressBar({ pct, color }) {
  return (
    <div style={{ background: "rgba(148, 163, 184, 0.2)", borderRadius: "8px", height: "8px", width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct || 0))}%`, background: color || "#1d4ed8", height: "100%", borderRadius: "8px", transition: "width 0.5s ease-out" }} />
    </div>
  );
}

export default function DashboardTab({ bannerConfig, currentAuditDate, isArchive, handleEditAuditDate, stats, urgents, criteres, userProfile, isDarkMode, isColorblindMode }) {
  
  const hist = [...criteres].flatMap(c => (c.historique||[]).map(h => ({...h, num: c.num, titre: c.titre}))).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 15);

  // COULEURS NATIVES (Dark Mode + Daltonien)
  const bgCard = isDarkMode ? "#1e1f20" : "white";
  const bgMain = isDarkMode ? "#131314" : "#f8fafc";
  const textMain = isDarkMode ? "#e3e3e3" : "#1e3a5f";
  const textMuted = isDarkMode ? "#9aa0a6" : "#64748b";
  const borderCol = isDarkMode ? "#333537" : "#e2e8f0";

  const cConf = isColorblindMode ? "#2563eb" : "#10b981";
  const bgConf = isDarkMode ? "#13231a" : (isColorblindMode ? "#eff6ff" : "#f0fdf4");
  const bdConf = isDarkMode ? "#064e3b" : (isColorblindMode ? "#bfdbfe" : "#86efac");

  const cNConf = isColorblindMode ? "#ea580c" : "#ef4444";
  const bgNConf = isDarkMode ? "#450a0a" : (isColorblindMode ? "#fff7ed" : "#fef2f2");
  const bdNConf = isDarkMode ? "#7f1d1d" : (isColorblindMode ? "#ffedd5" : "#fca5a5");

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* 🟢 BANNIÈRE SUPÉRIEURE */}
      <div style={{ background: bannerConfig.bg, border: `1px solid ${bannerConfig.border}`, padding: "20px 30px", borderRadius: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontSize: "40px" }}>{bannerConfig.icon}</div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "800", color: bannerConfig.color, textTransform: "uppercase", letterSpacing: "1px" }}>{bannerConfig.text}</div>
            <div style={{ fontSize: "28px", fontWeight: "900", color: textMain, display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
              {currentAuditDate ? new Date(currentAuditDate).toLocaleDateString("fr-FR", {day:'numeric', month:'long', year:'numeric'}) : "Non définie"}
              {!isArchive && <button onClick={handleEditAuditDate} style={{ fontSize: "12px", background: bgCard, border: `1px solid ${borderCol}`, padding: "6px 12px", borderRadius: "8px", cursor: "pointer", color: textMuted, fontWeight: "bold" }}>✏️ Modifier</button>}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", background: bgCard, padding: "15px 25px", borderRadius: "12px", border: `1px solid ${borderCol}` }}>
          <div style={{ fontSize: "32px", fontWeight: "900", color: textMain }}>{Math.round((stats.conforme / stats.total) * 100)}%</div>
          <div style={{ fontSize: "12px", fontWeight: "800", color: textMuted, textTransform: "uppercase" }}>Conformité totale</div>
        </div>
      </div>

      {/* 📊 CHIFFRES CLÉS */}
      <div className="responsive-grid-5">
         <StatCard val={stats.conforme} label="Indicateurs Conformes" color={cConf} bg={bgConf} border={bdConf} />
         <StatCard val={stats.enCours} label="Chantiers en cours" color="#d97706" bg={isDarkMode ? "#451a03" : "#fffbeb"} border={isDarkMode ? "#78350f" : "#fde68a"} />
         <StatCard val={stats.nonConforme} label="Non conformités" color={cNConf} bg={bgNConf} border={bdNConf} />
         <StatCard val={criteres.reduce((acc,c)=>acc+(c.fichiers?.filter(f=>f.validated).length||0)+(c.chemins_reseau?.filter(r=>r.validated).length||0),0)} label="Preuves déposées" color={isDarkMode ? "#8ab4f8" : "#1d4ed8"} bg={isDarkMode ? "rgba(138,180,248,0.1)" : "#eff6ff"} border={isDarkMode ? "#8ab4f8" : "#bfdbfe"} />
         <StatCard val={stats.nonConcerne} label="Non concernés" color={textMuted} bg={bgMain} border={borderCol} />
      </div>

      {/* ⚡ COLONNES URGENCES ET HISTORIQUE */}
      <div className="responsive-grid-2">
        <div style={{ background: bgCard, borderRadius: "16px", border: `1px solid ${borderCol}`, padding: "24px" }}>
           <h3 style={{ margin: "0 0 20px", display: "flex", alignItems: "center", gap: "10px", color: textMain, fontSize: "18px", fontWeight: "800" }}>
             <span>🚨</span> Échéances proches
             <span style={{ background: cNConf, color: "white", padding: "2px 8px", borderRadius: "12px", fontSize: "12px" }}>{urgents.length}</span>
           </h3>
           <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
             {urgents.length === 0 ? <div style={{ color: textMuted, fontStyle: "italic", fontSize: "14px" }}>Aucune urgence à traiter.</div> : null}
             
             {/* 👉 NOUVEAUTÉ : Bordure gauche dynamique basée sur le critère */}
             {urgents.map(c => {
               const catColor = CRITERES_LABELS[c.critere]?.color || textMuted;
               return (
                 <div key={c.id} className="td-dash" style={{ background: bgMain, border: `1px solid ${borderCol}`, borderLeft: `6px solid ${catColor}`, borderRadius: "8px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "800", color: textMain, fontSize: "14px", marginBottom: "4px" }}>{c.num} - {c.titre}</div>
                      <div style={{ fontSize: "12px", color: textMuted, fontWeight: "600" }}>{CRITERES_LABELS[c.critere]?.label}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "900", color: cNConf, fontSize: "14px" }}>{new Date(c.delai).toLocaleDateString("fr-FR")}</div>
                      <div style={{ fontSize: "10px", color: textMuted, textTransform: "uppercase", fontWeight: "800", marginTop: "2px" }}>Date limite</div>
                    </div>
                 </div>
               )
             })}
           </div>
        </div>

        <div style={{ background: bgCard, borderRadius: "16px", border: `1px solid ${borderCol}`, padding: "24px" }}>
           <h3 style={{ margin: "0 0 20px", display: "flex", alignItems: "center", gap: "10px", color: textMain, fontSize: "18px", fontWeight: "800" }}><span>⚡</span> Activité de l'équipe</h3>
           <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
             {hist.length === 0 ? <div style={{ color: textMuted, fontStyle: "italic", fontSize: "14px" }}>Aucune modification récente enregistrée.</div> : null}
             {hist.map((h, i) => (
               <div key={i} style={{ display: "flex", gap: "12px" }}>
                 <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: isDarkMode ? "#8ab4f8" : "#1d4ed8", marginTop: "4px", flexShrink: 0 }}></div>
                 <div>
                   <div style={{ fontSize: "13px", color: textMain, fontWeight: "600", lineHeight: "1.4" }}><strong style={{ color: isDarkMode ? "#8ab4f8" : "#1d4ed8" }}>{h.user.split('@')[0]}</strong> {h.msg}</div>
                   <div style={{ fontSize: "10px", color: textMuted, marginTop: "4px", textTransform: "uppercase", fontWeight: "800" }}>{h.num} • {new Date(h.date).toLocaleString("fr-FR")}</div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ val, label, color, bg, border }) {
  return (
    <div className="td-dash" style={{ background: bg, border: `1px solid ${border}`, borderRadius: "12px", padding: "20px", textAlign: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
      <div style={{ fontSize: "36px", fontWeight: "900", color: color }}>{val}</div>
      <div style={{ fontSize: "12px", fontWeight: "800", color: color, textTransform: "uppercase", marginTop: "8px" }}>{label}</div>
    </div>
  )
}
