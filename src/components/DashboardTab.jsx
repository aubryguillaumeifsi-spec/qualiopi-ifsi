import React, { useMemo } from "react";
import { CRITERES_LABELS } from "../data";

export default function DashboardTab({ campaigns, activeCampaignId, setActiveCampaignId, currentAuditDate, stats, urgents, criteres, axes, setModalCritere, userProfile, handleEditAuditDate, handleCreateCampaign, t }) {
  
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

  const hist = useMemo(() => [...safeCriteres].flatMap(c => Array.isArray(c.historique) ? c.historique.map(h => ({ ...h, num: c.num, critere: c.critere })) : []).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5), [safeCriteres]);

  const formatInd = (critere, num) => `${critere}.${String(num).replace(/\D/g, '')}`;

  const totalPreuves = useMemo(() => safeCriteres.reduce((acc, c) => acc + (c.fichiers?.length || 0) + (c.chemins_reseau?.length || 0) + (c.preuves ? 1 : 0), 0), [safeCriteres]);

  const getLastAddDate = (c) => {
    const dates = [];
    if (Array.isArray(c.fichiers)) c.fichiers.forEach(f => f.date && dates.push(new Date(f.date)));
    if (Array.isArray(c.chemins_reseau)) c.chemins_reseau.forEach(cr => cr.date && dates.push(new Date(cr.date)));
    if (Array.isArray(c.historique)) {
      c.historique.forEach(h => {
        if (h.type === 'preuve' || h.msg?.toLowerCase().includes('preuve') || h.msg?.toLowerCase().includes('fichier')) {
          dates.push(new Date(h.date));
        }
      });
    }
    if (dates.length === 0) return "—";
    const maxDate = new Date(Math.max(...dates));
    return maxDate.toLocaleDateString("fr-FR").substring(0,5);
  };

  return (
     <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"16px", paddingBottom:"40px" }}>
        <style>{`
          .ca:hover  { transform:translateY(-2px); box-shadow:${t.shadowLg}!important; }
          .ro:hover  { background:${t.surface2}!important; cursor:default; }
          .ug:hover  { filter:brightness(1.04); transform:translateY(-2px); }
          .ca, .ug   { transition:all 0.18s ease; cursor: default; }
          .ro        { transition:background 0.12s; }
          .scroll-container::-webkit-scrollbar { height: 6px; width: 6px; }
          .scroll-container::-webkit-scrollbar-track { background: transparent; }
          .scroll-container::-webkit-scrollbar-thumb { background: ${t.border2}; border-radius: 4px; }
        `}</style>

        {/* ── EN-TÊTE DASHBOARD & HISTORIQUE AUDITS ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"4px", flexWrap:"wrap", gap:"12px" }}>
          <div>
            <div style={{ fontSize:"11px", fontWeight:"700", color:t.gold, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"8px" }}>Campagne d'audit active</div>
            <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                <select value={activeCampaignId || ""} onChange={(e) => setActiveCampaignId(e.target.value)} style={{ background:t.surface, border:`1px solid ${t.border}`, color:t.text, padding:"10px 36px 10px 16px", borderRadius:"8px", fontSize:"18px", fontWeight:"800", outline:"none", cursor:"pointer", appearance:"none", boxShadow:t.shadowSm, fontFamily:"'Instrument Serif',serif" }}>
                  {campaigns?.map(c => <option key={c.id} value={c.id} style={{fontFamily:"'Albert Sans', sans-serif", fontSize:"14px", fontWeight:"500", color:"#000"}}>{c.name}</option>)}
                </select>
                <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: "12px", color: t.text3 }}>▼</div>
              </div>
            </div>
          </div>
          
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", background:t.surface, border:`1px solid ${t.border}`, padding:"8px 12px", borderRadius:"8px", boxShadow:t.shadowSm }}>
              <span style={{ fontSize:"12px", color:t.text2, fontWeight:"600" }}>Date d'évaluation :</span>
              {userProfile?.role !== "lecteur" ? (
                <input type="date" value={currentAuditDate} onChange={(e) => handleEditAuditDate(e.target.value)} style={{ background:t.surface2, border:`1px solid ${t.border2}`, borderRadius:"6px", padding:"4px 8px", fontSize:"12px", color:t.text, cursor:"pointer", colorScheme: "dark" }} />
              ) : (
                <span style={{ fontSize:"13px", color:t.text, fontWeight:"700" }}>{new Date(currentAuditDate).toLocaleDateString("fr-FR")}</span>
              )}
            </div>
            
            {userProfile?.role !== "lecteur" && (
              <button onClick={handleCreateCampaign} style={{ background:t.surface2, color:t.text, border:`1px solid ${t.border}`, padding:"10px 16px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm, transition:"all 0.2s" }} onMouseOver={e=>e.currentTarget.style.background=t.surface3} onMouseOut={e=>e.currentTarget.style.background=t.surface2}>
                + Nouvel Audit
              </button>
            )}
          </div>
        </div>

        {/* ── ROW 1 : HERO CONFORMITÉ + KPIs ── */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:"12px" }}>
          
          <div className="ca" style={{ background:t.surface, border:`1px solid ${t.goldBd}`, borderRadius:"10px", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:t.shadowGold }}>
            <div style={{ flex: 1, paddingRight: "16px" }}>
              <div style={{ fontSize:"10px", fontWeight:"800", color:t.gold, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"8px" }}>Conformité globale</div>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"46px", color:t.text, lineHeight:1, letterSpacing:"-1px" }}>{pct}<span style={{ fontSize:"22px", color:t.text2, fontWeight:"400" }}>%</span></div>
              <div style={{ display:"flex", alignItems:"center", gap:"12px", marginTop:"10px" }}>
                <div style={{ flex: 1, maxWidth: "140px", height:"6px", background:t.goldBg, borderRadius:"3px", overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg, ${t.gold}, #fcd34d)`, borderRadius:"3px" }}/>
                </div>
                <span style={{ fontSize:"10px", color:t.text3, fontWeight:"600" }}>Objectif 90%</span>
              </div>
            </div>
            <svg width="56" height="56" style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
              <circle cx="28" cy="28" r="24" fill="none" stroke={t.border} strokeWidth="5"/>
              <circle cx="28" cy="28" r="24" fill="none" stroke={t.gold} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ filter:`drop-shadow(0 0 6px ${t.goldBd})`, transition:"stroke-dashoffset 1s ease-out" }}/>
            </svg>
          </div>

          {[
            { v: stats?.conforme || 0,     l:"Conformes",     c:t.green,  bg:t.greenBg,  bd:t.greenBd,  pct: stats?.total ? Math.round(((stats.conforme||0)/stats.total)*100)+"%" : "0%" },
            { v: stats?.enCours || 0,      l:"En cours",      c:t.amber,  bg:t.amberBg,  bd:t.amberBd,  pct: stats?.total ? Math.round(((stats.enCours||0)/stats.total)*100)+"%" : "0%" },
            { v: stats?.nonConforme || 0,  l:"Non conformes", c:t.red,    bg:t.redBg,    bd:t.redBd,    pct: stats?.total ? Math.round(((stats.nonConforme||0)/stats.total)*100)+"%" : "0%" },
          ].map((s, i) => (
            <div key={i} className="ca" style={{ background:t.surface, border:`1px solid ${s.bd}`, borderRadius:"10px", padding:"14px 16px", boxShadow:`0 4px 12px ${s.bg}`, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"6px" }}>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"34px", color:t.text, lineHeight:1 }}>{s.v}</div>
                <div style={{ width:"12px", height:"12px", borderRadius:"50%", background:s.bg, border:`1px solid ${s.bd}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                   <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:s.c }}/>
                </div>
              </div>
              <div style={{ fontSize:"12px", color:t.text2, fontWeight:"600", marginBottom:"auto", paddingBottom:"10px" }}>{s.l}</div>
              <div style={{ height:"4px", background:t.border2, borderRadius:"2px", marginBottom:"6px" }}>
                <div style={{ width:s.pct, height:"100%", background:s.c, borderRadius:"2px", opacity:0.8 }}/>
              </div>
            </div>
          ))}
        </div>

        {/* ── PLAN D'ACTION (Priorités intégrées) ── */}
        {axes && axes.length > 0 && (
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"20px", boxShadow:t.shadowSm }}>
            <div style={{ marginBottom:"16px" }}>
              {/* Plus d'emoji cible ici, look pro et épuré */}
              <h3 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:t.text, margin:0 }}>Plan d'action prioritaire</h3>
              <div style={{ fontSize:"12px", color:t.text2, marginTop:"4px" }}>Indicateurs nécessitant une intervention (Écarts et En cours)</div>
            </div>
            <div style={{ display:"flex", gap:"16px", overflowX:"auto", paddingBottom:"8px" }} className="scroll-container">
              {axes.map(c => {
                const isNC = c.statut === "non-conforme";
                const theme = isNC ? { c:t.red, bg:t.redBg, bd:t.redBd, label:"Non conforme" } : { c:t.amber, bg:t.amberBg, bd:t.amberBd, label:"En cours" };
                const cConf = CRITERES_LABELS[c.critere] || { bg:t.surface2, bd:t.border, color:t.text };
                const d = days(c.delai);
                return (
                  <div key={c.id} onClick={() => setModalCritere(c)} style={{ minWidth:"280px", background:t.surface2, border:`1px solid ${theme.bd}`, borderLeft:`4px solid ${theme.c}`, borderRadius:"8px", padding:"16px", cursor:"pointer", transition:"transform 0.2s", boxShadow:`0 4px 12px ${theme.bg}` }} onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e=>e.currentTarget.style.transform="translateY(0)"}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8px" }}>
                      <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", background: cConf.bg, border: `1px solid ${cConf.bd}`, color: cConf.color, padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "800", fontFamily: "'Albert Sans', sans-serif", whiteSpace: "nowrap" }}>
                        {formatInd(c.critere, c.num)}
                      </span>
                      <span style={{ background:theme.bg, color:theme.c, fontSize:"10px", fontWeight:"800", padding:"3px 8px", borderRadius:"6px" }}>{theme.label}</span>
                    </div>
                    <div style={{ fontSize:"13px", color:t.text, fontWeight:"500", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:"12px" }}>{c.titre}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"11px" }}>
                      <span style={{ color:t.text2 }}>👤 {c.responsables?.[0]||"—"}</span>
                      <span style={{ fontWeight:"800", color: d < 0 ? t.red : t.amber }}>{d < 0 ? "DÉPASSÉ" : `J-${d}`}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── ROW 2 : TABLE + PANEL DROIT ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:"16px" }}>
          
          {/* 📊 Table Aperçu */}
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"10px", boxShadow:t.shadow, display:"flex", flexDirection:"column", overflow: "hidden" }}>
            <div style={{ padding:"12px 20px", borderBottom:`1px solid ${t.border}` }}>
              <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"18px", color:t.text }}>Aperçu des indicateurs</span>
            </div>
            
            <div className="scroll-container" style={{ overflowX: "auto" }}>
              <div style={{ minWidth: "750px" }}>
                <div style={{ display:"grid", gridTemplateColumns:"70px minmax(180px, 1fr) 90px 100px 90px 60px", gap:"10px", padding:"8px 20px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
                  {["N°","Libellé","Statut","Responsable","Dernier ajout","Date"].map(h => (
                    <span key={h} style={{ fontSize:"9px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"0.8px" }}>{h}</span>
                  ))}
                </div>
                
                <div className="scroll-container" style={{ maxHeight: "600px", overflowY: "auto", paddingBottom: "10px" }}>
                  {safeCriteres.map((r, i) => {
                    const cConf = CRITERES_LABELS[r.critere] || { color: t.text2 };
                    const isConforme = r.statut === "conforme";
                    const isNC = r.statut === "non-conforme";
                    const labelStatut = isConforme ? "Conforme" : isNC ? "Non conforme" : r.statut === "en-cours" ? "En cours" : "Non évalué";
                    
                    return (
                      <div key={i} className="ro" style={{ display:"grid", gridTemplateColumns:"70px minmax(180px, 1fr) 90px 100px 90px 60px", gap:"10px", alignItems:"center", padding:"10px 20px", borderBottom:`1px solid ${t.border2}` }}>
                        
                        <div>
                          <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", background: cConf.bg, border: `1px solid ${cConf.bd}`, color: cConf.color, padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "800", fontFamily: "'Albert Sans', sans-serif", whiteSpace: "nowrap" }}>
                            {formatInd(r.critere, r.num)}
                          </span>
                        </div>
                        
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize:"12px", color:t.text, fontWeight:"500", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {r.titre}
                          </div>
                        </div>
                        
                        <div>
                          <span style={{ background: isConforme ? t.greenBg : isNC ? t.redBg : r.statut === "en-cours" ? t.amberBg : t.surface3, color: isConforme ? t.green : isNC ? t.red : r.statut === "en-cours" ? t.amber : t.text2, border: `1px solid ${isConforme ? t.greenBd : isNC ? t.redBd : r.statut === "en-cours" ? t.amberBd : t.border}`, fontSize:"9px", fontWeight:"800", padding:"3px 8px", borderRadius:"5px", whiteSpace:"nowrap" }}>
                            {labelStatut}
                          </span>
                        </div>
                        <span style={{ fontSize:"11px", color:t.text2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.responsables?.[0] || "—"}</span>
                        <span style={{ fontSize:"11px", color:t.text2, fontFamily:"'DM Mono',monospace" }}>{getLastAddDate(r)}</span>
                        <span style={{ fontSize:"11px", color:t.text3, textAlign:"right", fontWeight:"normal", fontFamily:"'DM Mono',monospace" }}>{r.delai ? new Date(r.delai).toLocaleDateString("fr-FR").substring(0,5) : "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ⚡ Panel de droite */}
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"10px", padding:"16px", boxShadow:t.shadow }}>
              <div style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>🚨 Échéances proches</div>
              {safeUrgents.length === 0 ? (
                <div style={{ fontSize:"12px", color:t.text2, fontStyle:"italic" }}>Aucune alerte.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {safeUrgents.slice(0,5).map((u, i) => {
                    const d = days(u.delai);
                    const cConf = CRITERES_LABELS[u.critere] || { bg:t.surface2, bd:t.border, color:t.text };
                    
                    return (
                      <div key={i} className="ug" style={{ background: t.surface2, border:`1px solid ${t.border2}`, borderRadius:"8px", padding:"10px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:t.shadowSm }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px", flex:1, overflow:"hidden" }}>
                          <span style={{ background: cConf.bg, color: cConf.color, border: `1px solid ${cConf.bd}`, padding: "2px 6px", borderRadius: "6px", fontSize:"11px", fontWeight: "800", flexShrink: 0 }}>
                            {formatInd(u.critere, u.num)} 
                          </span>
                          <span style={{ fontSize:"12px", fontWeight:"500", color:t.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {u.titre}
                          </span>
                        </div>
                        
                        {d < 0 ? (
                          <span style={{ background:t.redBg, color:t.red, border:`1px solid ${t.redBd}`, padding:"2px 6px", borderRadius:"4px", fontSize:"9px", fontWeight:"800", marginLeft:"10px", whiteSpace:"nowrap" }}>DÉPASSÉ</span>
                        ) : (
                          <span style={{ fontSize:"11px", fontWeight:"800", color:t.red, marginLeft:"10px", whiteSpace:"nowrap" }}>J-{d}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"10px", padding:"16px", boxShadow:t.shadow, flex:1 }}>
              <div style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"14px" }}>⚡ Activité récente</div>
              {hist.length === 0 ? (
                <div style={{ fontSize:"12px", color:t.text2, fontStyle:"italic" }}>Aucune activité.</div>
              ) : (
                hist.map((h, i) => {
                  const initiales = h.user?.substring(0,2).toUpperCase() || "SY";
                  const cConf = CRITERES_LABELS[h.critere] || { color: t.accent, bg: t.accentBg, bd: t.accentBd };
                  
                  return (
                    <div key={i} style={{ display:"flex", gap:"10px", marginBottom:"14px", alignItems:"flex-start" }}>
                      <div style={{ width:"24px", height:"24px", borderRadius:"6px", background:cConf.bg, border:`1px solid ${cConf.bd}`, color:cConf.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", fontWeight:"800", flexShrink:0, marginTop:"2px" }}>
                        {initiales}
                      </div>
                      <div>
                        <div style={{ fontSize:"11px", color:t.text2, lineHeight:"1.4" }}>
                          <strong style={{ color:t.text }}>{h.user?.split('@')?.[0]}</strong> sur <strong style={{color:cConf.color}}>{formatInd(h.critere, h.num)}</strong>: {h.msg}
                        </div>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px", color:t.text3, marginTop:"3px" }}>{timeAgo(h.date)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"10px", padding:"16px", boxShadow:t.shadow }}>
               <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
                 <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:t.greenBg, border:`1px solid ${t.greenBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px" }}>📁</div>
                 <div>
                   <div style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"4px" }}>Preuves capitalisées</div>
                   <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"28px", color:t.green, lineHeight:1, letterSpacing:"-1px" }}>{totalPreuves} <span style={{ fontSize:"14px", color:t.text2, fontFamily:"'Albert Sans', sans-serif", fontWeight:"500", letterSpacing:"0" }}>documents</span></div>
                 </div>
               </div>
            </div>

          </div>
        </div>
     </div>
  );
}
