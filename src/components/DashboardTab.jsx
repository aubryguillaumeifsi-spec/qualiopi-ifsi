import React from "react";
import { CRITERES_LABELS } from "../data";

// 👉 LE COMPOSANT MANQUANT (GaugeChart) EST RÉINTÉGRÉ ICI !
export function GaugeChart({ pct, score, color }) {
  const val = pct !== undefined ? pct : (score !== undefined ? score : 0);
  const c = color || "#1d4ed8";
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (val / 100) * circ;
  return (
    <div style={{ position: "relative", width: "80px", height: "80px" }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
        {/* Le fond de la jauge est rendu universel avec une transparence pour le Dark Mode */}
        <circle cx="40" cy="40" r={r} fill="transparent" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="transparent" stroke={c} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease-out" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "900" }}>
        {val}%
      </div>
    </div>
  );
}

export default function DashboardTab({ bannerConfig, currentAuditDate, isArchive, handleEditAuditDate, stats, urgents, criteres, userProfile }) {
  
  // Reconstitution des 15 dernières actions de l'historique
  const hist = [...criteres].flatMap(c => (c.historique||[]).map(h => ({...h, num: c.num, titre: c.titre}))).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 15);

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* 🟢 BANNIÈRE SUPÉRIEURE */}
      <div className="theme-card" style={{ background: bannerConfig.bg, border: `1px solid ${bannerConfig.border}`, padding: "20px 30px", borderRadius: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontSize: "40px" }}>{bannerConfig.icon}</div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "800", color: bannerConfig.color, textTransform: "uppercase", letterSpacing: "1px" }}>{bannerConfig.text}</div>
            <div style={{ fontSize: "28px", fontWeight: "900", color: "#1e3a5f", display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
              {currentAuditDate ? new Date(currentAuditDate).toLocaleDateString("fr-FR", {day:'numeric', month:'long', year:'numeric'}) : "Non définie"}
              {!isArchive && <button onClick={handleEditAuditDate} style={{ fontSize: "12px", background: "white", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", color: "#475569", fontWeight: "bold", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>✏️ Modifier</button>}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", background: "white", padding: "15px 25px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "32px", fontWeight: "900", color: "#1e3a5f" }}>{Math.round((stats.conforme / stats.total) * 100)}%</div>
          <div style={{ fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Conformité totale</div>
        </div>
      </div>

      {/* 📊 CHIFFRES CLÉS */}
      <div className="responsive-grid-5">
         <StatCard val={stats.conforme} label="Indicateurs Conformes" color="#10b981" bg="#f0fdf4" border="#86efac" />
         <StatCard val={stats.enCours} label="Chantiers en cours" color="#d97706" bg="#fffbeb" border="#fde68a" />
         <StatCard val={stats.nonConforme} label="Non conformités" color="#ef4444" bg="#fef2f2" border="#fca5a5" />
         <StatCard val={criteres.reduce((acc,c)=>acc+(c.fichiers?.filter(f=>f.validated).length||0)+(c.chemins_reseau?.filter(r=>r.validated).length||0),0)} label="Preuves déposées" color="#1d4ed8" bg="#eff6ff" border="#bfdbfe" />
         <StatCard val={stats.nonConcerne} label="Non concernés" color="#64748b" bg="#f8fafc" border="#cbd5e1" />
      </div>

      {/* ⚡ COLONNES URGENCES ET HISTORIQUE */}
      <div className="responsive-grid-2">
        <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
           <h3 style={{ margin: "0 0 20px", display: "flex", alignItems: "center", gap: "10px", color: "#1e3a5f", fontSize: "18px", fontWeight: "800" }}>
             <span>🚨</span> Échéances proches
             <span style={{ background: "#ef4444", color: "white", padding: "2px 8px", borderRadius: "12px", fontSize: "12px" }}>{urgents.length}</span>
           </h3>
           <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
             {urgents.length === 0 ? <div style={{ color: "#64748b", fontStyle: "italic", fontSize: "14px" }}>Aucune urgence à traiter.</div> : null}
             
             {urgents.map(c => {
               const catColor = CRITERES_LABELS[c.critere]?.color || "#9ca3af";
               return (
                 <div key={c.id} className="td-dash" style={{ background: "white", border: "1px solid #e2e8f0", borderLeft: `6px solid ${catColor}`, borderRadius: "8px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "800", color: "#1e3a5f", fontSize: "14px", marginBottom: "4px" }}>{c.num} - {c.titre}</div>
                      <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>{CRITERES_LABELS[c.critere]?.label}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "900", color: "#ef4444", fontSize: "14px" }}>{new Date(c.delai).toLocaleDateString("fr-FR")}</div>
                      <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: "800", marginTop: "2px" }}>Date limite</div>
                    </div>
                 </div>
               )
             })}
           </div>
        </div>

        <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
           <h3 style={{ margin: "0 0 20px", display: "flex", alignItems: "center", gap: "10px", color: "#1e3a5f", fontSize: "18px", fontWeight: "800" }}><span>⚡</span> Activité de l'équipe</h3>
           <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
             {hist.length === 0 ? <div style={{ color: "#64748b", fontStyle: "italic", fontSize: "14px" }}>Aucune modification récente enregistrée.</div> : null}
             {hist.map((h, i) => (
               <div key={i} style={{ display: "flex", gap: "12px" }}>
                 <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#1d4ed8", marginTop: "4px", flexShrink: 0 }}></div>
                 <div>
                   <div style={{ fontSize: "13px", color: "#1e3a5f", fontWeight: "600", lineHeight: "1.4" }}><strong style={{ color: "#1d4ed8" }}>{h.user.split('@')[0]}</strong> {h.msg}</div>
                   <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", textTransform: "uppercase", fontWeight: "800" }}>{h.num} • {new Date(h.date).toLocaleString("fr-FR")}</div>
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
