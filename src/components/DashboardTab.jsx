import React, { useMemo } from "react";

export default function DashboardTab({ currentAuditDate, stats, urgents, criteres, userProfile, t }) {
  
  // 1. Protection absolue contre les données manquantes (Empêche l'erreur "not iterable")
  const safeCriteres = Array.isArray(criteres) ? criteres : [];
  const safeUrgents = Array.isArray(urgents) ? urgents : [];

  // 2. Calcul des KPI
  const pct = stats?.total > 0 ? Math.round(((stats?.conforme || 0) / stats.total) * 100) : 0;
  
  const r = 27; 
  const circ = 2 * Math.PI * r; 
  const offset = circ - (pct / 100) * circ;

  const timeAgo = (dateString) => {
    if (!dateString) return "à l'instant";
    const diff = Math.floor((new Date() - new Date(dateString)) / 60000);
    if (diff < 60) return `${diff} min`;
    if (diff < 1440) return `${Math.floor(diff/60)} h`;
    return `${Math.floor(diff/1440)} j`;
  };

  const days = d => { if (!d) return NaN; const p = new Date(d); return isNaN(p.getTime()) ? NaN : Math.round((p - new Date()) / 86400000); };

  // 3. Extraction des preuves et de l'historique de manière sécurisée
  const preuvesCount = useMemo(() => safeCriteres.filter(c => c.preuves || c.preuves_encours || (c.fichiers && c.fichiers.length > 0)).length, [safeCriteres]);
  const hist = useMemo(() => [...safeCriteres].flatMap(c => Array.isArray(c.historique) ? c.historique.map(h => ({ ...h, num: c.num })) : []).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5), [safeCriteres]);

  return (
     <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"14px", height:"100%" }}>
        
        {/* CSS embarqué pour les effets de survol spécifiques au Dashboard */}
        <style>{`
          .ca:hover  { transform:translateY(-2px); box-shadow:0 8px 25px rgba(0,0,0,0.4) !important; border-color:${t.goldBd} !important; }
          .ca2:hover { transform:translateY(-2px); box-shadow:0 8px 25px rgba(0,0,0,0.4) !important; border-color:${t.accentBd} !important; }
          .ro:hover  { background:${t.surface3} !important; }
          .ug:hover  { filter:brightness(1.06); transform:translateX(2px); }
          .ca, .ca2, .ug { transition:all 0.18s ease; cursor: default; }
          .ro { transition:background 0.12s; }
        `}</style>

        {/* ── Header / Sub-header ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:t.text }}>Tableau de bord</span>
            <span style={{ fontSize:"12px", color:t.text3 }}>· Audit le {currentAuditDate ? new Date(currentAuditDate).toLocaleDateString("fr-FR") : "-"}</span>
          </div>
        </div>

        {/* ── HERO ROW : Conformité + KPIs ── */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:"12px" }}>
          
          {/* Grande carte OR (Conformité) */}
          <div className="ca" style={{ background:t.surface, border:`1px solid ${t.goldBd}`, borderRadius:"12px", padding:"18px 22px", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:t.shadow }}>
            <div>
              <div style={{ fontSize:"9px", fontWeight:"700", color:t.gold, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:"6px" }}>Conformité globale</div>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"46px", color:t.text, lineHeight:1, letterSpacing:"-2px" }}>{pct}<span style={{ fontSize:"22px", color:t.text2, fontWeight:"400" }}>%</span></div>
              <div style={{ display:"flex", alignItems:"center", gap:"10px", marginTop:"10px" }}>
                <div style={{ height:"5px", width:"100px", background:t.goldBg, borderRadius:"3px" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg, ${t.gold}, #f5d070)`, borderRadius:"3px" }}/>
                </div>
                <span style={{ fontSize:"10px", color:t.text3 }}>Objectif 100%</span>
              </div>
            </div>
            <svg width="68" height="68" style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
              <circle cx="34" cy="34" r="27" fill="none" stroke={t.border} strokeWidth="5.5"/>
              <circle cx="34" cy="34" r="27" fill="none" stroke={t.gold} strokeWidth="5.5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ filter:`drop-shadow(0 0 6px ${t.goldBd})`, transition:"stroke-dashoffset 1s ease-out" }}/>
            </svg>
          </div>

          {/* 3 Blocs KPIs */}
          {[
            { v: stats?.conforme || 0, l: "Conformes", c: t.green, bg: t.greenBg, bd: t.greenBd },
            { v: stats?.enCours || 0, l: "En cours", c: t.amber, bg: t.amberBg, bd: t.amberBd },
            { v: stats?.nonConforme || 0, l: "Écarts", c: t.red, bg: t.redBg, bd: t.redBd },
          ].map((s, i) => (
            <div key={i} className="ca2" style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"16px 18px", boxShadow:t.shadow }}>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"36px", color:t.text, letterSpacing:"-1px", lineHeight:1, marginBottom:"8px" }}>{s.v}</div>
              <div style={{ fontSize:"11px", color:t.text2, fontWeight:"600", marginBottom:"10px" }}>{s.l}</div>
              <div style={{ height:"3px", background:t.border2, borderRadius:"2px" }}>
                <div style={{ width: stats?.total > 0 ? `${Math.round((s.v / stats.total)*100)}%` : "0%", height:"100%", background:s.c, borderRadius:"2px", opacity:0.7 }}/>
              </div>
              <div style={{ marginTop:"6px", display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:"10px", color:s.c, fontWeight:"700" }}>{stats?.total > 0 ? Math.round((s.v / stats.total)*100) : 0}%</span>
                <span style={{ fontSize:"10px", color:t.text3 }}>du total</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── TABLEAU + PANEL DROIT ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:"14px", flex:1, marginTop: "10px" }}>
          
          {/* Table Aperçu des Indicateurs */}
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"10px", overflow:"hidden", boxShadow:t.shadow, display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"12px 18px", borderBottom:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"18px", color:t.text }}>Aperçu des indicateurs</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"44px 1fr 100px 105px 60px", padding:"7px 18px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
              {["N°","Libellé","Statut","Responsable","Date"].map(h => (
                <span key={h} style={{ fontSize:"9px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"0.8px" }}>{h}</span>
              ))}
            </div>
            <div style={{ overflowY:"auto", flex:1, maxHeight:"380px" }}>
              {safeCriteres.slice(0, 10).map((r, i) => {
                const s = r.statut === "conforme" ? {c:t.green, bg:t.greenBg, bd:t.greenBd, l:"Conforme"} : 
                          r.statut === "non-conforme" ? {c:t.red, bg:t.redBg, bd:t.redBd, l:"Écart"} : 
                          r.statut === "en-cours" ? {c:t.amber, bg:t.amberBg, bd:t.amberBd, l:"En Cours"} : 
                          {c:t.text2, bg:t.surface3, bd:t.border, l:"Non évalué"};
                return (
                  <div key={i} className="ro" style={{ display:"grid", gridTemplateColumns:"44px 1fr 100px 105px 60px", alignItems:"center", padding:"10px 18px", borderBottom:`1px solid ${t.border2}` }}>
                    <span style={{ fontSize:"11px", fontWeight:"800", color:t.accent }}>{r.num}</span>
                    <span style={{ fontSize:"12px", color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingRight:"10px" }}>{r.titre}</span>
                    <span>
                      <span style={{ background:s.bg, border:`1px solid ${s.bd}`, color:s.c, fontSize:"10px", fontWeight:"700", padding:"2px 8px", borderRadius:"5px", whiteSpace:"nowrap" }}>{s.l}</span>
                    </span>
                    <span style={{ fontSize:"11px", color:t.text2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.responsables?.[0] || "-"}</span>
                    <span style={{ fontSize:"11px", color:t.text3, textAlign:"right", fontWeight:"600" }}>{r.delai ? new Date(r.delai).toLocaleDateString("fr-FR").substring(0,5) : "-"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel de droite (Urgences, Activités, Preuves) */}
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            
            {/* Widget: Échéances proches */}
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"10px", padding:"14px 16px", boxShadow:t.shadow }}>
              <div style={{ fontSize:"9px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"11px" }}>🚨 Échéances proches</div>
              {safeUrgents.length === 0 ? (
                <div style={{ fontSize:"12px", color:t.text2, fontStyle:"italic" }}>Aucune alerte.</div>
              ) : (
                safeUrgents.slice(0,4).map((u, i) => {
                  const d = days(u.delai);
                  const s = d < 0 ? {c:t.red, bg:t.redBg, bd:t.redBd} : {c:t.amber, bg:t.amberBg, bd:t.amberBd};
                  return (
                    <div key={i} className="ug" style={{ background:s.bg, border:`1px solid ${s.bd}`, borderRadius:"8px", padding:"9px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                      <span style={{ fontSize:"11px", fontWeight:"600", color:t.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.num} — {u.titre}</span>
                      <span style={{ fontSize:"12px", fontWeight:"800", color:s.c, marginLeft:"8px", whiteSpace:"nowrap" }}>{d < 0 ? "DÉPASSÉ" : `J-${d}`}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Widget: Activité récente */}
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"10px", padding:"14px 16px", boxShadow:t.shadow, flex:1 }}>
              <div style={{ fontSize:"9px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>⚡ Activité récente</div>
              {hist.length === 0 ? (
                <div style={{ fontSize:"12px", color:t.text2, fontStyle:"italic" }}>Aucune activité.</div>
              ) : (
                hist.map((h, i) => (
                  <div key={i} style={{ display:"flex", gap:"10px", marginBottom:"11px", alignItems:"flex-start" }}>
                    <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:t.gold, marginTop:"4px", flexShrink:0, opacity:0.7, boxShadow:`0 0 6px ${t.goldBd}` }}/>
                    <div>
                      <div style={{ fontSize:"11px", color:t.text2, lineHeight:"1.45" }}>
                        <strong style={{ color:t.accent }}>{h.user?.split('@')?.[0] || "Système"}</strong> sur <strong style={{color:t.text}}>{h.num}</strong>: {h.msg}
                      </div>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px", color:t.text3, marginTop:"2px" }}>{timeAgo(h.date)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Widget: Preuves déposées */}
            <div style={{ background:t.accentBg, border:`1px solid ${t.accentBd}`, borderRadius:"10px", padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:"9px", fontWeight:"700", color:t.accent, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"3px" }}>Preuves déposées</div>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"26px", color:t.text, lineHeight:1 }}>{preuvesCount}</div>
                </div>
                <div style={{ width:"38px", height:"38px", borderRadius:"9px", background:t.accentBg, border:`1px solid ${t.accentBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px" }}>📎</div>
              </div>
            </div>
          </div>
        </div>
     </div>
  );
}
