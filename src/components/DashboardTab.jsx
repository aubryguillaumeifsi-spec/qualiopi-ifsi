import React, { useMemo } from "react";
import { CRITERES_LABELS } from "../data";

export default function DashboardTab({ currentAuditDate, stats, urgents, criteres, t }) {
  
  const safeCriteres = Array.isArray(criteres) ? criteres : [];
  const safeUrgents = Array.isArray(urgents) ? urgents : [];

  const pct = stats?.total > 0 ? Math.round(((stats?.conforme || 0) / stats.total) * 100) : 0;
  const r = 24; 
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

  const preuvesCount = useMemo(() => safeCriteres.filter(c => c.preuves || c.preuves_encours || (c.fichiers && c.fichiers.length > 0)).length, [safeCriteres]);
  const hist = useMemo(() => [...safeCriteres].flatMap(c => Array.isArray(c.historique) ? c.historique.map(h => ({ ...h, num: c.num, critere: c.critere })) : []).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5), [safeCriteres]);

  return (
     <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"16px", height:"100%" }}>
        <style>{`
          .ca:hover  { transform:translateY(-2px); box-shadow:${t.shadowLg}!important; border-color:${t.accentBd}!important; }
          .ro:hover  { background:${t.surface2}!important; cursor:default; }
          .ug:hover  { filter:brightness(1.04); transform:translateX(2px); }
          .ca, .ug   { transition:all 0.18s ease; cursor: default; }
          .ro        { transition:background 0.12s; }
        `}</style>

        {/* ── ROW 1 : KPIs (Inspiré de Claude) ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px" }}>
          {[
            { v: stats?.conforme || 0,     l:"Conformes",     c:t.green,  bg:t.greenBg,  bd:t.greenBd,  pct: stats?.total ? Math.round(((stats.conforme||0)/stats.total)*100)+"%" : "0%" },
            { v: stats?.enCours || 0,      l:"En cours",      c:t.amber,  bg:t.amberBg,  bd:t.amberBd,  pct: stats?.total ? Math.round(((stats.enCours||0)/stats.total)*100)+"%" : "0%" },
            { v: stats?.nonConforme || 0,  l:"Non conformes", c:t.red,    bg:t.redBg,    bd:t.redBd,    pct: stats?.total ? Math.round(((stats.nonConforme||0)/stats.total)*100)+"%" : "0%" },
            { v: stats?.nonConcerne || 0,  l:"Non concernés", c:t.text3,  bg:t.surface3, bd:t.border,   pct: "—" },
          ].map((s, i) => (
            <div key={i} className="ca" style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"10px", padding:"16px 20px", boxShadow:t.shadowSm }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"34px", fontWeight:"normal", color:t.text, letterSpacing:"-1px", lineHeight:1 }}>{s.v}</div>
                <div style={{ width:"12px", height:"12px", borderRadius:"50%", background:s.c, marginTop:"6px", boxShadow:`0 0 8px ${s.bd}` }}/>
              </div>
              <div style={{ fontSize:"12px", color:t.text2, fontWeight:"600", marginBottom:"12px" }}>{s.l}</div>
              <div style={{ height:"4px", background:t.border2, borderRadius:"2px" }}>
                <div style={{ width:s.pct==="—"?"0%":s.pct, height:"100%", background:s.c, borderRadius:"2px", opacity:0.8 }}/>
              </div>
            </div>
          ))}
        </div>

        {/* ── ROW 2 : TABLE + PANEL DROIT ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:"16px", flex:1, marginTop: "8px" }}>
          
          {/* Table Aperçu des Indicateurs */}
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm, display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"18px", color:t.text }}>Aperçu des indicateurs</span>
            </div>
            {/* Header avec largeurs ajustées pour éviter les chevauchements */}
            <div style={{ display:"grid", gridTemplateColumns:"44px 1fr 100px 110px 60px", padding:"9px 20px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
              {["N°","Libellé","Statut","Responsable","Date"].map(h => (
                <span key={h} style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"0.8px" }}>{h}</span>
              ))}
            </div>
            <div style={{ overflowY:"auto", flex:1, maxHeight:"450px" }}>
              {safeCriteres.slice(0, 15).map((r, i) => {
                const cConf = CRITERES_LABELS[r.critere] || { color: t.text2, bg: t.surface2, bd: t.border };
                const isConforme = r.statut === "conforme";
                const isNC = r.statut === "non-conforme";
                const labelStatut = isConforme ? "Conforme" : isNC ? "Non conforme" : r.statut === "en-cours" ? "En cours" : "Non évalué";
                
                return (
                  <div key={i} className="ro" style={{ display:"grid", gridTemplateColumns:"44px 1fr 100px 110px 60px", gap:"10px", alignItems:"center", padding:"12px 20px", borderBottom:`1px solid ${t.border2}` }}>
                    <span style={{ fontSize:"12px", fontWeight:"800", color: cConf.color, fontFamily:"'DM Mono',monospace" }}>{r.num}</span>
                    {/* Gestion du chevauchement du texte */}
                    <span style={{ fontSize:"13px", color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingRight:"10px" }}>
                      {r.titre}
                    </span>
                    <span>
                      <span style={{ background: isConforme ? t.greenBg : isNC ? t.redBg : r.statut === "en-cours" ? t.amberBg : t.surface3, color: isConforme ? t.green : isNC ? t.red : r.statut === "en-cours" ? t.amber : t.text2, border: `1px solid ${isConforme ? t.greenBd : isNC ? t.redBd : r.statut === "en-cours" ? t.amberBd : t.border}`, fontSize:"10px", fontWeight:"700", padding:"3px 8px", borderRadius:"6px", whiteSpace:"nowrap" }}>
                        {labelStatut}
                      </span>
                    </span>
                    <span style={{ fontSize:"12px", color:t.text2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.responsables?.[0] || "—"}</span>
                    <span style={{ fontSize:"12px", color:t.text3, textAlign:"right", fontWeight:"600", fontFamily:"'DM Mono',monospace" }}>{r.delai ? new Date(r.delai).toLocaleDateString("fr-FR").substring(0,5) : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel de droite */}
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            
            {/* Widget: Échéances proches */}
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"16px 20px", boxShadow:t.shadowSm }}>
              <div style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"14px" }}>🚨 Échéances proches</div>
              {safeUrgents.length === 0 ? (
                <div style={{ fontSize:"13px", color:t.text2, fontStyle:"italic" }}>Aucune alerte.</div>
              ) : (
                safeUrgents.slice(0,4).map((u, i) => {
                  const d = days(u.delai);
                  const cConf = CRITERES_LABELS[u.critere] || { bg: t.surface2, bd: t.border };
                  return (
                    <div key={i} className="ug" style={{ background: cConf.bg, border:`1px solid ${cConf.bd}`, borderRadius:"8px", padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                      <span style={{ fontSize:"12px", fontWeight:"600", color:t.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.num} — {u.titre}</span>
                      {/* Pastille Dépassé en rouge systématique si < 0 */}
                      <span style={{ fontSize:"11px", fontWeight:"800", color: d < 0 ? t.red : t.amber, background: d < 0 ? t.redBg : "transparent", padding: d < 0 ? "2px 6px" : "0", borderRadius:"4px", marginLeft:"8px", whiteSpace:"nowrap" }}>
                        {d < 0 ? "DÉPASSÉ" : `J-${d}`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Widget: Activité récente */}
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"16px 20px", boxShadow:t.shadowSm, flex:1 }}>
              <div style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"16px" }}>⚡ Activité récente</div>
              {hist.length === 0 ? (
                <div style={{ fontSize:"13px", color:t.text2, fontStyle:"italic" }}>Aucune activité.</div>
              ) : (
                hist.map((h, i) => {
                  const initiales = h.user?.substring(0,2).toUpperCase() || "SY";
                  const cConf = CRITERES_LABELS[h.critere] || { color: t.accent, bg: t.accentBg, bd: t.accentBd };
                  
                  return (
                    <div key={i} style={{ display:"flex", gap:"12px", marginBottom:"14px", alignItems:"flex-start" }}>
                      {/* Remplacement du point orange par les initiales encadrées de la couleur du critère */}
                      <div style={{ width:"24px", height:"24px", borderRadius:"6px", background:cConf.bg, border:`1px solid ${cConf.bd}`, color:cConf.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", fontWeight:"800", flexShrink:0, marginTop:"2px" }}>
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
