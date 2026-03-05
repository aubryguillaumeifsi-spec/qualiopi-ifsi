import React, { useState } from "react";

// Fausses données pour garder ta maquette intacte sur les nouveaux onglets (en attendant de les relier à Firebase)
const UTILISATEURS_DEMO = [
  { id:1,  nom:"Marie Leclerc",   email:"m.leclerc@ifsi-lyon.fr",   role:"superadmin", etab:"Tous",             actif:true,  last:"Il y a 2 min" },
  { id:2,  nom:"Sophie Renard",   email:"s.renard@ifsi-lyon.fr",    role:"admin",      etab:"IFSI de Lyon",     actif:true,  last:"Il y a 18 min" },
  { id:3,  nom:"Paul Dupont",     email:"p.dupont@ifsi-lyon.fr",    role:"editeur",    etab:"IFSI de Lyon",     actif:true,  last:"Il y a 1h" }
];

const JOURNAL_DEMO = [
  { id:1,  user:"m.leclerc",  action:"a modifié les droits", etab:"Lyon", time:"Il y a 2 min",  type:"perm", icon:"🔑", c:"#a78bfa" },
  { id:2,  user:"p.dupont",   action:"a validé C3.2",        etab:"Lyon", time:"Il y a 18 min", type:"valid", icon:"✅", c:"#2cc880" }
];

export default function TourControleTab({ 
  globalScore, activeIfsis, totalUsersInNetwork, topAlerts, sortedTourIfsis, 
  setSelectedIfsi, archivedIfsis, today, handleRenameIfsi, handleArchiveIfsi, 
  handleHardDeleteIfsi, setActiveTab, tourSort, setTourSort, totalAlertsCount, t 
}) {
  const [onglet, setOnglet] = useState("vue");
  const [alertesDismissed, setAlertsDismissed] = useState([]);

  // 1. Transformation des VRAIES données Firebase pour correspondre à ton design
  const etablissements = (sortedTourIfsis || []).map(e => {
    const joursRestants = e.auditDate ? Math.round((new Date(e.auditDate) - new Date()) / 86400000) : 0;
    const ncCount = e.liste?.filter(c => c.statut === "non-conforme").length || 0;
    
    return {
      id: e.id,
      nom: e.name,
      region: "Réseau QualiForma",
      conformite: e.pct || 0,
      indicateurs: e.total || 0,
      nonConformes: ncCount,
      enCours: e.liste?.filter(c => c.statut === "en-cours").length || 0,
      audit: e.auditDate ? new Date(e.auditDate).toLocaleDateString("fr-FR") : "-",
      jours: joursRestants,
      statut: (e.pct < 65 || ncCount > 10) ? "critique" : (e.pct < 80) ? "alerte" : "actif",
      users: "-"
    };
  });

  const alertesActives = (topAlerts || [])
    .filter(a => !alertesDismissed.includes(a.ifsiId + a.critere?.num))
    .map((a, i) => ({
      id: a.ifsiId + a.critere?.num,
      type: a.type === "non-conforme" ? "critique" : "alerte",
      etab: a.ifsiName,
      msg: a.type === "non-conforme" ? `Indicateur ${a.critere?.num} non conforme` : `Échéance dépassée sur ${a.critere?.num} (${a.days} jours)`,
      time: "Alerte active",
      icon: a.type === "non-conforme" ? "🚨" : "⚠️",
      rawId: a.ifsiId // Pour le bouton "Intervenir"
    }));

  const critiques = etablissements.filter(e => e.statut === "critique").length;
  const conformiteMoy = globalScore || 0;

  const ONGLETS = [
    { id:"vue",      label:"Vue globale",    icon:"◈" },
    { id:"alertes",  label:`Alertes`,        icon:"🚨", badge: alertesActives.length },
    { id:"users",    label:"Utilisateurs",   icon:"👥" },
    { id:"journal",  label:"Journal d'audit",icon:"📋" },
    { id:"config",   label:"Configuration",  icon:"⚙️" },
  ];

  const ROLE_CONFIG = {
    superadmin: { label:"Super Admin", c:"#d4a030", bg:"rgba(212,160,48,0.12)", bd:"rgba(212,160,48,0.3)" },
    admin:      { label:"Admin",       c:"#4f80f0", bg:"rgba(79,128,240,0.12)", bd:"rgba(79,128,240,0.28)" },
    editeur:    { label:"Éditeur",     c:"#2cc880", bg:"rgba(44,200,128,0.1)",  bd:"rgba(44,200,128,0.25)" },
    lecteur:    { label:"Lecteur",     c:"#6a7a95", bg:"rgba(106,122,149,0.1)", bd:"rgba(106,122,149,0.22)" },
  };

  return (
    <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
      <style>{`
        .nt:hover { color:rgba(255,255,255,0.8)!important; background:rgba(255,255,255,0.07)!important; border-radius:4px; }
        .gh:hover { background:${t.surface3}!important; }
        .ro:hover { background:${t.surface2}!important; cursor:pointer; }
        .ro { transition:background 0.12s; }
        .ca:hover { transform:translateY(-2px); box-shadow:${t.shadowMd}!important; }
        .ca { transition:all 0.16s; }
        .tab-btn:hover { color:${t.text}!important; background:${t.surface2}!important; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      {/* ══ SUB-HEADER ══ */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"16px 26px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:t.shadowSm }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:t.text }}>Tour de contrôle</span>
          <div style={{ background:t.goldBg, border:`1px solid ${t.goldBd}`, borderRadius:"6px", padding:"4px 9px", display:"flex", alignItems:"center", gap:"5px" }}>
            <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:t.gold }} className="pulse"/>
            <span style={{ fontSize:"9px", fontWeight:"800", color:t.gold, letterSpacing:"0.8px", textTransform:"uppercase" }}>Super Admin</span>
          </div>
        </div>
        
        {/* Audit pill */}
        <div style={{ display:"flex", alignItems:"center", gap:"12px", background:t.goldBg, border:`1px solid ${t.goldBd}`, borderRadius:"10px", padding:"8px 18px", boxShadow:t.shadowGold }}>
          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:t.gold, boxShadow:`0 0 8px ${t.gold}` }}/>
          <div>
            <div style={{ fontSize:"9px", fontWeight:"700", color:t.gold, textTransform:"uppercase", letterSpacing:"1.2px" }}>Conformité moyenne</div>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"15px", color:t.text, marginTop:"1px" }}>{etablissements.length} établissements actifs</div>
          </div>
          <div style={{ width:"1px", height:"28px", background:t.goldBd }}/>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:t.gold, lineHeight:1 }}>{conformiteMoy}%</div>
          </div>
          <div style={{ width:"1px", height:"28px", background:t.goldBd }}/>
          <div style={{ background:critiques > 0 ? t.danger : t.gold, borderRadius:"6px", padding:"4px 10px" }}>
            <div style={{ fontSize:"13px", fontWeight:"800", color:"white" }}>{critiques} critique{critiques>1?"s":""}</div>
          </div>
        </div>
      </div>

      {/* ── KPIs réseau ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"12px" }}>
        {[
          { v:etablissements.length, l:"Établissements", c:t.accent, bg:t.accentBg, bd:t.accentBd, icon:"🏥" },
          { v:`${conformiteMoy}%`, l:"Conformité moy.", c:t.gold, bg:t.goldBg, bd:t.goldBd, icon:"📊" },
          { v:etablissements.reduce((s,e)=>s+e.nonConformes,0), l:"Écarts totaux", c:t.red, bg:t.redBg, bd:t.redBd, icon:"⚠️" },
          { v:totalUsersInNetwork || 0, l:"Comptes réseau", c:t.accent, bg:t.accentBg, bd:t.accentBd, icon:"👥" },
          { v:alertesActives.length, l:"Alertes actives", c:t.danger, bg:t.dangerBg, bd:t.dangerBd, icon:"🚨" },
        ].map((s,i) => (
          <div key={i} className="ca" style={{ background:t.surface, border:`1px solid ${i===4&&s.v>0?t.dangerBd:t.border}`, borderRadius:"12px", padding:"16px", boxShadow:i===4&&s.v>0?`0 4px 16px ${t.dangerBd}`:t.shadowSm, cursor:"default" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8px" }}>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"32px", color:t.text, lineHeight:1, letterSpacing:"-1px" }}>{s.v}</div>
              <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:s.bg, border:`1px solid ${s.bd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px" }}>{s.icon}</div>
            </div>
            <div style={{ fontSize:"11px", color:t.text2, fontWeight:"600" }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Onglets ── */}
      <div style={{ display:"flex", gap:"4px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"10px", padding:"4px", boxShadow:t.shadowSm }}>
        {ONGLETS.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} className={onglet===o.id?"":"tab-btn"}
            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"7px", padding:"10px 12px", borderRadius:"7px", border:"none", background:onglet===o.id?t.accentBg:"transparent", color:onglet===o.id?t.accent:t.text2, fontFamily:"'Albert Sans',sans-serif", fontWeight:onglet===o.id?"700":"500", fontSize:"12px", cursor:"pointer", transition:"all 0.14s" }}>
            <span>{o.icon}</span>
            <span>{o.label}</span>
            {o.badge > 0 && <span style={{ background:t.danger, color:"white", fontSize:"10px", fontWeight:"800", padding:"1px 6px", borderRadius:"10px", minWidth:"20px", textAlign:"center" }}>{o.badge}</span>}
          </button>
        ))}
      </div>

      {/* ══ ONGLET : VUE GLOBALE ══ */}
      {onglet === "vue" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
            <div style={{ padding:"14px 20px", borderBottom:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"18px", color:t.text }}>État du réseau</span>
              <div style={{ display:"flex", gap:"8px" }}>
                 <select value={tourSort} onChange={(e) => setTourSort(e.target.value)} style={{ padding:"4px 8px", borderRadius:"6px", background:t.surface2, color:t.text, border:`1px solid ${t.border}` }}>
                   <option value="urgence">Trier par Audit</option>
                   <option value="score_desc">Trier par Score</option>
                 </select>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 100px 110px 80px 80px 100px 90px 80px", padding:"9px 20px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
              {["Établissement","Conformité","Statut","Ind. NC","En cours","Audit","J-reste","Actions"].map(h => (
                <span key={h} style={{ fontSize:"9px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"0.7px" }}>{h}</span>
              ))}
            </div>
            {etablissements.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: t.text3 }}>Aucun établissement actif.</div>
            ) : (
              etablissements.map((e) => {
                const statCfg = {
                  actif:    { label:"Actif",    c:t.green, bg:t.greenBg, bd:t.greenBd },
                  alerte:   { label:"Alerte",   c:t.amber, bg:t.amberBg, bd:t.amberBd },
                  critique: { label:"Critique", c:t.danger,bg:t.dangerBg,bd:t.dangerBd },
                }[e.statut];
                const conformeColor = e.conformite >= 80 ? t.green : e.conformite >= 65 ? t.amber : t.danger;
                return (
                  <div key={e.id} className="ro" onClick={() => { setSelectedIfsi(e.id); setActiveTab("dashboard"); }} style={{ display:"grid", gridTemplateColumns:"1fr 100px 110px 80px 80px 100px 90px 80px", alignItems:"center", padding:"12px 20px", borderBottom:`1px solid ${t.border2}`, borderLeft:`3px solid ${statCfg.c}` }}>
                    <div>
                      <div style={{ fontSize:"13px", fontWeight:"700", color:t.text }}>{e.nom}</div>
                      <div style={{ fontSize:"10px", color:t.text3, marginTop:"2px" }}>{e.region}</div>
                    </div>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                        <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"18px", color:conformeColor, fontWeight:"600" }}>{e.conformite}%</span>
                      </div>
                      <div style={{ height:"4px", background:t.border, borderRadius:"2px", marginTop:"3px", width:"70px" }}>
                        <div style={{ width:`${e.conformite}%`, height:"100%", background:conformeColor, borderRadius:"2px", opacity:0.8 }}/>
                      </div>
                    </div>
                    <div>
                      <span style={{ background:statCfg.bg, border:`1px solid ${statCfg.bd}`, color:statCfg.c, fontSize:"10px", fontWeight:"700", padding:"3px 8px", borderRadius:"5px" }}>
                        {e.statut === "critique" && "⚠️ "}{statCfg.label}
                      </span>
                    </div>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"13px", fontWeight:"700", color:e.nonConformes > 10 ? t.danger : e.nonConformes > 4 ? t.amber : t.green }}>{e.nonConformes}</span>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"13px", color:t.amber }}>{e.enCours}</span>
                    <span style={{ fontSize:"12px", color:t.text2, fontFamily:"'DM Mono',monospace" }}>{e.audit}</span>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"13px", fontWeight:"700", color:e.jours < 60 ? t.danger : e.jours < 120 ? t.amber : t.green }}>{e.jours < 0 ? "Dépassé" : `J‑${e.jours}`}</span>
                    <button onClick={(ev) => { ev.stopPropagation(); handleArchiveIfsi(e.id, e.nom, true); }} style={{ background:t.amberBg, border:`1px solid ${t.amberBd}`, color:t.amber, padding:"4px 8px", borderRadius:"6px", cursor:"pointer", fontSize:"11px", fontWeight:"bold" }}>Archiver</button>
                  </div>
                );
              })
            )}
          </div>

          {/* Section Archives */}
          {archivedIfsis && archivedIfsis.length > 0 && (
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", marginTop:"20px" }}>
              <div style={{ padding:"12px 20px", background:t.surface2, borderBottom:`1px solid ${t.border}`, color:t.text2, fontWeight:"bold" }}>📦 Établissements Archivés</div>
              {archivedIfsis.map(a => (
                <div key={a.id} style={{ display:"flex", justifyContent:"space-between", padding:"12px 20px", borderBottom:`1px solid ${t.border2}` }}>
                  <div style={{ color:t.text3 }}>{a.name}</div>
                  <div style={{ display:"flex", gap:"10px" }}>
                     <button onClick={() => handleArchiveIfsi(a.id, a.name, false)} style={{ background:t.greenBg, color:t.green, border:"none", padding:"6px 12px", borderRadius:"6px", cursor:"pointer", fontWeight:"bold" }}>Restaurer</button>
                     <button onClick={() => handleHardDeleteIfsi(a.id, a.name)} style={{ background:t.dangerBg, color:t.danger, border:"none", padding:"6px 12px", borderRadius:"6px", cursor:"pointer", fontWeight:"bold" }}>⚠️ Supprimer définitivement</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ ONGLET : ALERTES ══ */}
      {onglet === "alertes" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {alertesActives.length === 0 && (
            <div style={{ background:t.greenBg, border:`1px solid ${t.greenBd}`, borderRadius:"10px", padding:"30px", textAlign:"center" }}>
              <div style={{ fontSize:"30px", marginBottom:"10px" }}>✅</div>
              <div style={{ fontSize:"16px", fontWeight:"700", color:t.green }}>Aucune alerte réseau</div>
              <div style={{ fontSize:"13px", color:t.text2, marginTop:"6px" }}>Tous les établissements sont sous contrôle.</div>
            </div>
          )}
          {alertesActives.map(a => (
            <div key={a.id} style={{ background:t.surface, border:`1px solid ${a.type==="critique"?t.dangerBd:t.border}`, borderLeft:`4px solid ${a.type==="critique"?t.danger:t.amber}`, borderRadius:"9px", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:t.shadowSm }}>
              <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
                <span style={{ fontSize:"22px" }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize:"14px", fontWeight:"700", color:t.text }}>{a.etab}</div>
                  <div style={{ fontSize:"12px", color:t.text2, marginTop:"2px" }}>{a.msg}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                <button onClick={() => { setSelectedIfsi(a.rawId); setActiveTab("criteres"); }} style={{ background:t.accent, border:"none", padding:"6px 12px", borderRadius:"6px", fontSize:"12px", fontWeight:"600", color:"white", cursor:"pointer" }}>Intervenir</button>
                <button onClick={() => setAlertsDismissed(d=>[...d, a.id])} style={{ background:t.surface2, border:`1px solid ${t.border}`, padding:"6px 10px", borderRadius:"6px", fontSize:"12px", color:t.text3, cursor:"pointer" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ ONGLET : UTILISATEURS (Maquette) ══ */}
      {onglet === "users" && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden" }}>
           <div style={{ padding:"20px", textAlign:"center", color:t.text2 }}>
             <p style={{ marginBottom:"10px", fontSize:"20px" }}>🚧</p>
             <p>Le module de gestion globale des utilisateurs sera branché ici.</p>
             <p style={{ fontSize:"12px", color:t.text3 }}>Pour l'instant, gérez les utilisateurs ifsi par ifsi dans l'onglet Administration.</p>
           </div>
        </div>
      )}

      {/* ══ ONGLET : JOURNAL (Maquette) ══ */}
      {onglet === "journal" && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden" }}>
          <div style={{ padding:"14px 20px", borderBottom:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"18px", color:t.text }}>Journal d'audit réseau</span>
          </div>
          {JOURNAL_DEMO.map(j => (
            <div key={j.id} style={{ display:"flex", alignItems:"center", padding:"12px 20px", borderBottom:`1px solid ${t.border2}`, gap:"12px" }}>
              <div style={{ fontSize:"16px" }}>{j.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"13px", color:t.text }}><strong>{j.user}</strong> {j.action}</div>
                <div style={{ fontSize:"11px", color:t.text3 }}>IFSI: {j.etab}</div>
              </div>
              <div style={{ fontSize:"11px", color:t.text3, fontFamily:"'DM Mono',monospace" }}>{j.time}</div>
            </div>
          ))}
        </div>
      )}

      {/* ══ ONGLET : CONFIGURATION (Maquette) ══ */}
      {onglet === "config" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"20px" }}>
             <h3 style={{ fontFamily:"'Instrument Serif',serif", color:t.text, marginBottom:"15px" }}>Seuils de conformité</h3>
             <div style={{ color:t.text2, fontSize:"13px" }}>Ici, vous pourrez bientôt régler les paliers (Rouge/Orange/Vert) pour tout votre réseau d'IFSI.</div>
          </div>
          <div style={{ background:t.dangerBg, border:`1px solid ${t.dangerBd}`, borderRadius:"12px", padding:"20px" }}>
             <h3 style={{ fontFamily:"'Instrument Serif',serif", color:t.danger, marginBottom:"15px" }}>Zone Critique</h3>
             <div style={{ color:t.danger, fontSize:"13px", marginBottom:"15px" }}>Actions destructrices pour le réseau entier.</div>
             <button style={{ background:t.danger, color:"white", border:"none", padding:"8px 16px", borderRadius:"6px", cursor:"not-allowed" }}>Purger la base</button>
          </div>
        </div>
      )}

    </div>
  );
}
