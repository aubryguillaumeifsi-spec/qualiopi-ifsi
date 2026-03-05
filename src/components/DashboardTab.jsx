import React, { useMemo } from "react";
import { CRITERES_LABELS } from "../data";

export default function DashboardTab({ currentAuditDate, stats, urgents, criteres, t }) {
  
  const safeCriteres = Array.isArray(criteres) ? criteres : [];
  const safeUrgents = Array.isArray(urgents) ? urgents : [];

  const pct = stats?.total > 0 ? Math.round(((stats?.conforme || 0) / stats.total) * 100) : 0;
  const r = 32; 
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

  const hist = useMemo(() => [...safeCriteres].flatMap(c => Array.isArray(c.historique) ? c.historique.map(h => ({ ...h, num: c.num, critere: c.critere })) : []).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5), [safeCriteres]);

  return (
     <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"20px", height:"100%" }}>
        <style>{`
          .ca:hover  { transform:translateY(-2px); box-shadow:${t.shadowLg}!important; }
          .ro:hover  { background:${t.surface2}!important; cursor:default; }
          .ug:hover  { filter:brightness(1.04); transform:translateX(2px); }
          .ca, .ug   { transition:all 0.18s ease; cursor: default; }
          .ro        { transition:background 0.12s; }
        `}</style>

        {/* ── ROW 1 : HERO CONFORMITÉ + KPIs ── */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:"16px" }}>
          
          <div className="ca" style={{ background:t.surface, border:`1px solid ${t.goldBd}`, borderRadius:"12px", padding:"24px 30px", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:t.shadowGold }}>
            <div style={{ flex: 1, paddingRight: "20px" }}>
              <div style={{ fontSize:"11px", fontWeight:"800", color:t.gold, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:"12px" }}>Conformité globale</div>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"64px", color:t.text, lineHeight:1, letterSpacing:"-2px" }}>{pct}<span style={{ fontSize:"28px", color:t.text2, fontWeight:"400" }}>%</span></div>
              <div style={{ display:"flex", alignItems:"center", gap:"14px", marginTop:"16px" }}>
                <div style={{ flex: 1, maxWidth: "160px", height:"6px", background:t.goldBg, borderRadius:"3px" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:t.gold, borderRadius:"3px" }}/>
                </div>
                <span style={{ fontSize:"11px", color:t.text3, fontWeight:"600" }}>Objectif 90%</span>
              </div>
            </div>
            <svg width="80" height="80" style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
              <circle cx="40" cy="40" r="32" fill="none" stroke={t.border} strokeWidth="6"/>
              <circle cx="40" cy="40" r="32" fill="none" stroke={t.gold} strokeWidth="6" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ filter:`drop-shadow(0 0 6px ${t.goldBd})`, transition:"stroke-dashoffset 1s ease-out" }}/>
            </svg>
          </div>

          {[
            { v: stats?.conforme || 0,     l:"Conformes",     c:t.green,  bg:t.greenBg,  bd:t.greenBd,  pct: stats?.total ? Math.round(((stats.conforme||0)/stats.total)*100)+"%" : "0%" },
            { v: stats?.enCours || 0,      l:"En cours",      c:t.amber,  bg:t.amberBg,  bd:t.amberBd,  pct: stats?.total ? Math.round(((stats.enCours||0)/stats.total)*100)+"%" : "0%" },
            { v: stats?.nonConforme || 0,  l:"Non conformes", c:t.red,    bg:t.redBg,    bd:t.redBd,    pct: stats?.total ? Math.round(((stats.nonConforme||0)/stats.total)*100)+"%" : "0%" },
          ].map((s, i) => (
            <div key={i} className="ca" style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"20px", boxShadow:t.shadow, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"42px", fontWeight:"normal", color:t.text, letterSpacing:"-1px", lineHeight:1 }}>{s.v}</div>
                <div style={{ width:"14px", height:"14px", borderRadius:"50%", background:s.c, marginTop:"6px", boxShadow:`0 0 10px ${s.bd}` }}/>
              </div>
              <div style={{ fontSize:"13px", color:t.text2, fontWeight:"600", marginBottom:"auto", paddingBottom:"16px" }}>{s.l}</div>
              <div style={{ height:"4px", background:t.border2, borderRadius:"2px", marginBottom:"6px" }}>
                <div style={{ width:s.pct, height:"100%", background:s.c, borderRadius:"2px", opacity:0.8 }}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px" }}>
                <span style={{ color:s.c, fontWeight:"700" }}>{s.pct}</span>
                <span style={{ color:t.text3 }}>du total</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── ROW 2 : TABLE + PANEL DROIT ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:"20px", flex:1 }}>
          
          {/* 📊 Table Aperçu (Ne bloque plus le scroll, s'étend avec la page) */}
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", boxShadow:t.shadow, display:"flex", flexDirection:"column", minWidth: 0, overflow: "visible" }}>
            <div style={{ padding:"16px 24px", borderBottom:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"20px", color:t.text }}>Aperçu des indicateurs</span>
            </div>
            
            <div style={{ display:"grid", gridTemplateColumns:"120px minmax(0, 1fr) 110px 120px 60px", gap:"12px", padding:"12px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
              {["N°","LIBELLÉ","STATUT","RESPONSABLE","DATE"].map(h => (
                <span key={h} style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"0.8px" }}>{h}</span>
              ))}
            </div>
            
            <div style={{ paddingBottom:"10px" }}>
              {safeCriteres.slice(0, 20).map((r, i) => {
                const cConf = CRITERES_LABELS[r.critere] || { color: t.text2 };
                const isConforme = r.statut === "conforme";
                const isNC = r.statut === "non-conforme";
                const labelStatut = isConforme ? "Conforme" : isNC ? "Non conforme" : r.statut === "en-cours" ? "En cours" : "Non évalué";
                
                return (
                  <div key={i} className="ro" style={{ display:"grid", gridTemplateColumns:"120px minmax(0, 1fr) 110px 120px 60px", gap:"12px", alignItems:"center", padding:"14px 24px", borderBottom:`1px solid ${t.border2}` }}>
                    
                    {/* Numéro stylisé */}
                    <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:cConf.color, whiteSpace:"nowrap" }}>
                      Indicateur {r.num.replace('C', '')}
                    </div>
                    
                    {/* Libellé */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize:"13px", color:t.text, fontWeight:"500", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {r.titre}
                      </div>
                    </div>
                    
                    <div>
                      <span style={{ background: isConforme ? t.greenBg : isNC ? t.redBg : r.statut === "en-cours" ? t.amberBg : t.surface3, color: isConforme ? t.green : isNC ? t.red : r.statut === "en-cours" ? t.amber : t.text2, border: `1px solid ${isConforme ? t.greenBd : isNC ? t.redBd : r.statut === "en-cours" ? t.amberBd : t.border}`, fontSize:"10px", fontWeight:"800", padding:"4px 10px", borderRadius:"6px", whiteSpace:"nowrap" }}>
                        {labelStatut}
                      </span>
                    </div>
                    <span style={{ fontSize:"12px", color:t.text2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.responsables?.[0] || "—"}</span>
                    <span style={{ fontSize:"12px", color:t.text3, textAlign:"right", fontWeight:"600", fontFamily:"'DM Mono',monospace" }}>{r.delai ? new Date(r.delai).toLocaleDateString("fr-FR").substring(0,5) : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ⚡ Panel de droite */}
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"20px", boxShadow:t.shadow }}>
              <div style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"16px" }}>🚨 Échéances proches</div>
              {safeUrgents.length === 0 ? (
                <div style={{ fontSize:"13px", color:t.text2, fontStyle:"italic" }}>Aucune alerte.</div>
              ) : (
                safeUrgents.slice(0,5).map((u, i) => {
                  const d = days(u.delai);
                  const cConf = CRITERES_LABELS[u.critere] || { bg:t.surface2, bd:t.border, color:t.text };
                  
                  return (
                    <div key={i} className="ug" style={{ background: cConf.bg, border:`1px solid ${cConf.bd}`, borderRadius:"8px", padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                      <span style={{ fontSize:"12px", fontWeight:"700", color: cConf.color, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.num} — {u.titre}</span>
                      
                      {/* J-12 ou DÉPASSÉ */}
                      {d < 0 ? (
                        <span style={{ background:t.redBg, color:t.red, padding:"2px 6px", borderRadius:"4px", fontSize:"10px", fontWeight:"800", marginLeft:"10px", whiteSpace:"nowrap" }}>
                          DÉPASSÉ
                        </span>
                      ) : (
                        <span style={{ fontSize:"12px", fontWeight:"800", color:t.red, marginLeft:"10px", whiteSpace:"nowrap" }}>
                          J-{d}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"20px", boxShadow:t.shadow, flex:1 }}>
              <div style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"16px" }}>⚡ Activité récente</div>
              {hist.length === 0 ? (
                <div style={{ fontSize:"13px", color:t.text2, fontStyle:"italic" }}>Aucune activité.</div>
              ) : (
                hist.map((h, i) => {
                  const initiales = h.user?.substring(0,2).toUpperCase() || "SY";
                  const cConf = CRITERES_LABELS[h.critere] || { color: t.accent, bg: t.accentBg, bd: t.accentBd };
                  
                  return (
                    <div key={i} style={{ display:"flex", gap:"12px", marginBottom:"16px", alignItems:"flex-start" }}>
                      <div style={{ width:"26px", height:"26px", borderRadius:"6px", background:cConf.bg, border:`1px solid ${cConf.bd}`, color:cConf.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:"800", flexShrink:0, marginTop:"2px" }}>
                        {initiales}
                      </div>
                      <div>
                        <div style={{ fontSize:"12px", color:t.text2, lineHeight:"1.4" }}>
                          <strong style={{ color:t.text }}>{h.user?.split('@')?.[0]}</strong> sur <strong style={{color:cConf.color}}>{h.num}</strong>: {h.msg}
                        </div>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:t.text3, marginTop:"4px" }}>{timeAgo(h.date)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
     </div>
  );
}
