import React, { useState, useMemo } from "react";

export default function TourControleTab({ globalScore, activeIfsis, topAlerts, sortedTourIfsis, setSelectedIfsi, archivedIfsis, handleArchiveIfsi, handleHardDeleteIfsi, handleRenameIfsi, setActiveTab, tourSort, setTourSort, t }) {
  
  const [onglet, setOnglet] = useState("vue");

  const etablissements = sortedTourIfsis.map(e => ({
    id: e.id, nom: e.name, region: "Réseau QualiForma", conformite: e.pct || 0,
    nonConformes: e.liste?.filter(c => c.statut === "non-conforme").length || 0,
    enCours: e.liste?.filter(c => c.statut === "en-cours").length || 0,
    audit: e.auditDate ? new Date(e.auditDate).toLocaleDateString("fr-FR") : "-",
    jours: e.auditDate ? Math.round((new Date(e.auditDate) - new Date()) / 86400000) : 0,
    statut: (e.pct < 65 || (e.liste?.filter(c => c.statut === "non-conforme").length || 0) > 10) ? "critique" : (e.pct < 80) ? "alerte" : "actif",
    users: e.users || 0 // Nombre d'utilisateurs
  }));

  const critiques = etablissements.filter(e => e.statut === "critique").length;
  const conformiteMoy = globalScore || 0;

  // Tri des alertes par gravité
  const alertesActives = useMemo(() => {
    const list = topAlerts.map(a => {
      let type = "info";
      let poid = 0;
      let msg = "";
      if (a.type === "non-conforme") { type = "critique"; poid = 3; msg = `L'indicateur ${a.critere?.num} est déclaré non conforme.`; }
      else if (a.type === "depasse" && a.days > 0) { type = "avertissement"; poid = 2; msg = `L'échéance de l'indicateur ${a.critere?.num} est dépassée depuis ${a.days} jours.`; }
      else { type = "info"; poid = 1; msg = `Rappel pour l'indicateur ${a.critere?.num}.`; }
      return { id: a.id, type, etab: a.ifsiName, msg, rawId: a.ifsiId, poid };
    });
    return list.sort((a,b) => b.poid - a.poid);
  }, [topAlerts]);

  const ONGLETS = [
    { id:"vue",      label:"État du réseau",  icon:"📊" },
    { id:"alertes",  label:"Alertes",         icon:"🚨", badge: alertesActives.length },
    { id:"users",    label:"Utilisateurs",    icon:"👥" },
    { id:"journal",  label:"Journal système", icon:"📋" },
    { id:"config",   label:"Configuration",   icon:"⚙️" }
  ];

  return (
    <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
      <style>{`
        .tab-btn:hover { color:${t.text}!important; background:${t.surface2}!important; }
        .ro { transition:background 0.15s; }
        .ro:hover { background:${t.surface2}!important; cursor:pointer; }
      `}</style>

      {/* SUB-HEADER */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"20px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:t.shadowSm }}>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <div style={{ width:"48px", height:"48px", borderRadius:"12px", background:t.goldBg, border:`1px solid ${t.goldBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px" }}>🛸</div>
          <div>
            <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"26px", color:t.text, margin:"0 0 4px 0" }}>Supervision globale</h2>
            <div style={{ fontSize:"13px", color:t.text2 }}>Tour de contrôle du réseau complet. Réservé au Super Admin.</div>
          </div>
        </div>
        
        {/* Audit pill */}
        <div style={{ display:"flex", alignItems:"center", gap:"16px", background:t.goldBg, border:`1px solid ${t.goldBd}`, borderRadius:"10px", padding:"10px 20px", boxShadow:t.shadowGold }}>
          <div>
            <div style={{ fontSize:"9px", fontWeight:"800", color:t.gold, textTransform:"uppercase", letterSpacing:"1px" }}>Conformité moyenne</div>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"18px", color:t.text, marginTop:"2px" }}>{etablissements.length} établissements</div>
          </div>
          <div style={{ width:"1px", height:"32px", background:t.goldBd }}/>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"28px", color:t.gold, lineHeight:1 }}>{conformiteMoy}%</div>
          <div style={{ width:"1px", height:"32px", background:t.goldBd }}/>
          <div style={{ background:critiques > 0 ? t.red : t.green, borderRadius:"6px", padding:"6px 12px", color:"white", fontSize:"12px", fontWeight:"800" }}>
            {critiques > 0 ? `${critiques} IFSI en danger` : "Réseau sain"}
          </div>
        </div>
      </div>

      {/* ONGLETS */}
      <div style={{ display:"flex", gap:"6px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"10px", padding:"4px", boxShadow:t.shadowSm, overflowX:"auto" }}>
        {ONGLETS.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} className={onglet===o.id?"":"tab-btn"} style={{ flex:1, whiteSpace:"nowrap", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", padding:"10px 14px", borderRadius:"8px", border:"none", background:onglet===o.id?t.accentBg:"transparent", color:onglet===o.id?t.accent:t.text2, fontSize:"13px", fontWeight:onglet===o.id?"800":"600", cursor:"pointer", transition:"all 0.15s" }}>
            <span>{o.icon}</span>
            {o.label}
            {o.badge > 0 && <span style={{ background:t.red, color:"white", fontSize:"10px", fontWeight:"800", padding:"2px 8px", borderRadius:"12px", marginLeft:"4px" }}>{o.badge}</span>}
          </button>
        ))}
      </div>

      {/* ONGLET : VUE GLOBALE */}
      {onglet === "vue" && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
          <div style={{ padding:"16px 24px", borderBottom:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:"15px", fontWeight:"800", color:t.text }}>Performances par établissement</span>
            <select value={tourSort} onChange={(e) => setTourSort(e.target.value)} style={{ padding:"8px 12px", borderRadius:"8px", background:t.surface2, color:t.text, border:`1px solid ${t.border}`, outline:"none", fontSize:"12px", fontWeight:"600", cursor:"pointer" }}>
              <option value="urgence">Trier par Audit</option>
              <option value="score_desc">Trier par Conformité</option>
            </select>
          </div>
          
          <div style={{ display:"grid", gridTemplateColumns:"minmax(200px, 1fr) 120px 120px 100px 90px 90px 110px 100px 90px", padding:"12px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
            {["Établissement","Conformité","Statut","Utilisateurs","Ind. NC","En cours","Audit","J-reste","Actions"].map(h => (
              <span key={h} style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"0.8px" }}>{h}</span>
            ))}
          </div>

          <div style={{ overflowY:"auto" }}>
            {etablissements.map(e => {
              const statCfg = {
                actif:    { label:"Sain",     c:t.green },
                alerte:   { label:"Alerte",   c:t.amber },
                critique: { label:"Critique", c:t.red },
              }[e.statut];
              
              const confColor = e.conformite >= 80 ? t.green : e.conformite >= 65 ? t.amber : t.red;

              return (
                <div key={e.id} className="ro" onClick={() => { setSelectedIfsi(e.id); setActiveTab("dashboard"); }} style={{ display:"grid", gridTemplateColumns:"minmax(200px, 1fr) 120px 120px 100px 90px 90px 110px 100px 90px", alignItems:"center", padding:"16px 24px", borderBottom:`1px solid ${t.border2}`, borderLeft:`4px solid ${statCfg.c}` }}>
                  <div>
                    <div style={{ fontSize:"14px", fontWeight:"700", color:t.text }}>{e.nom}</div>
                    <div style={{ fontSize:"11px", color:t.text3, marginTop:"2px" }}>{e.region}</div>
                  </div>
                  
                  <div>
                    <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:confColor, lineHeight:1 }}>{e.conformite}%</div>
                    <div style={{ height:"4px", background:t.border, borderRadius:"2px", marginTop:"4px", width:"80px" }}>
                      <div style={{ width:`${e.conformite}%`, height:"100%", background:confColor, borderRadius:"2px" }}/>
                    </div>
                  </div>
                  
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:statCfg.c, boxShadow:`0 0 8px ${statCfg.c}80` }}/>
                    <span style={{ fontSize:"12px", fontWeight:"600", color:t.text2 }}>{statCfg.label}</span>
                  </div>

                  <div style={{ display:"flex", alignItems:"center", gap:"6px", color:t.text2, fontSize:"13px", fontWeight:"600" }}>
                    <span>👥</span> {e.users}
                  </div>

                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"14px", fontWeight:"800", color:e.nonConformes > 10 ? t.red : e.nonConformes > 0 ? t.amber : t.green }}>{e.nonConformes}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"13px", color:t.text2 }}>{e.enCours}</span>
                  <span style={{ fontSize:"12px", color:t.text2, fontFamily:"'DM Mono',monospace" }}>{e.audit}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"13px", fontWeight:"800", color:e.jours < 0 ? t.red : e.jours < 60 ? t.amber : t.green }}>{e.jours < 0 ? "Dépassé" : `J‑${e.jours}`}</span>
                  
                  {/* Note: Ce bouton déclenche window.confirm qui fait perdre le focus à Vercel (INP block). C'est normal sur navigateur. */}
                  <button onClick={(ev) => { ev.stopPropagation(); handleArchiveIfsi(e.id, e.nom, true); }} style={{ background:t.surface2, border:`1px solid ${t.border}`, color:t.text2, padding:"6px 12px", borderRadius:"6px", cursor:"pointer", fontSize:"11px", fontWeight:"700", transition:"all 0.2s" }} onMouseOver={e=>e.currentTarget.style.color=t.amber} onMouseOut={e=>e.currentTarget.style.color=t.text2}>
                    Archiver
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ONGLET : ALERTES (Design fin et trié par gravité) */}
      {onglet === "alertes" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {alertesActives.length === 0 ? (
            <div style={{ background:t.greenBg, border:`1px solid ${t.greenBd}`, borderRadius:"12px", padding:"40px", textAlign:"center" }}>
              <div style={{ fontSize:"40px", marginBottom:"12px" }}>✅</div>
              <div style={{ fontSize:"18px", fontWeight:"800", color:t.green }}>Aucune alerte réseau</div>
              <div style={{ fontSize:"13px", color:t.green, opacity:0.8, marginTop:"6px" }}>Tous les établissements sont à jour.</div>
            </div>
          ) : (
            alertesActives.map(a => {
              const ui = {
                critique: { bg:t.redBg, bd:t.redBd, c:t.red, icon:"🚨", label:"Critique" },
                avertissement: { bg:t.amberBg, bd:t.amberBd, c:t.amber, icon:"⚠️", label:"Avertissement" },
                info: { bg:t.accentBg, bd:t.accentBd, c:t.accent, icon:"ℹ️", label:"Information" }
              }[a.type];

              return (
                <div key={a.id} style={{ background:t.surface, border:`1px solid ${ui.bd}`, borderLeft:`4px solid ${ui.c}`, borderRadius:"8px", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:t.shadowSm }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
                    <div style={{ fontSize:"16px" }}>{ui.icon}</div>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"2px" }}>
                        <span style={{ fontSize:"14px", fontWeight:"800", color:t.text }}>{a.etab}</span>
                        <span style={{ background:ui.bg, color:ui.c, border:`1px solid ${ui.bd}`, fontSize:"9px", fontWeight:"800", padding:"2px 6px", borderRadius:"4px", textTransform:"uppercase" }}>
                          {ui.label}
                        </span>
                      </div>
                      <div style={{ fontSize:"12px", color:t.text2 }}>{a.msg}</div>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedIfsi(a.rawId); setActiveTab("criteres"); }} style={{ background:t.surface2, border:`1px solid ${t.border}`, padding:"6px 12px", borderRadius:"6px", fontSize:"11px", fontWeight:"700", color:t.text, cursor:"pointer", transition:"all 0.2s" }} onMouseOver={e=>e.currentTarget.style.background=t.accentBg} onMouseOut={e=>e.currentTarget.style.background=t.surface2}>
                    Consulter
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ONGLET : UTILISATEURS (Vue Réseau) */}
      {onglet === "users" && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"40px", textAlign:"center" }}>
           <div style={{ fontSize:"40px", marginBottom:"16px" }}>👥</div>
           <h3 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"24px", color:t.text, margin:"0 0 8px 0" }}>Annuaire Global du Réseau</h3>
           <p style={{ color:t.text2, fontSize:"14px", maxWidth:"500px", margin:"0 auto" }}>Cet onglet regroupera prochainement la liste complète de tous les utilisateurs inter-IFSI, avec la possibilité de leur envoyer des messages groupés.</p>
        </div>
      )}

      {/* ONGLET : JOURNAL SYSTÈME */}
      {onglet === "journal" && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"20px", display:"flex", flexDirection:"column", gap:"12px" }}>
           <div style={{ fontSize:"16px", fontWeight:"800", color:t.text, borderBottom:`1px solid ${t.border}`, paddingBottom:"12px", marginBottom:"12px" }}>Historique des connexions & actions critiques</div>
           {[
             { id:1, u:"superadmin@reseau.fr", a:"A archivé l'établissement IFSI de Lyon", t:"Il y a 10 min", c:t.red },
             { id:2, u:"superadmin@reseau.fr", a:"A exporté la base de données JSON", t:"Il y a 2h", c:t.accent },
             { id:3, u:"directeur@ifsi-lyon.fr", a:"Connexion réussie", t:"Hier à 08:30", c:t.green },
           ].map(j => (
             <div key={j.id} style={{ display:"flex", alignItems:"flex-start", gap:"12px", paddingBottom:"12px", borderBottom:`1px dashed ${t.border2}` }}>
               <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:j.c, marginTop:"4px" }}/>
               <div>
                 <div style={{ fontSize:"13px", color:t.text }}><strong style={{color:t.text}}>{j.u}</strong> : {j.a}</div>
                 <div style={{ fontSize:"11px", color:t.text3, marginTop:"2px", fontFamily:"'DM Mono',monospace" }}>{j.t}</div>
               </div>
             </div>
           ))}
        </div>
      )}

      {/* ONGLET : CONFIGURATION (Archives & Backups globaux) */}
      {onglet === "config" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:"24px" }}>
          
          <div style={{ background:t.surface, border:`1px solid ${t.redBd}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
            <div style={{ padding:"24px 32px" }}>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:t.red, marginBottom:"6px" }}>⚠️ Zone d'administration réseau critique</div>
              <div style={{ fontSize:"13px", color:t.text2, marginBottom:"24px" }}>Ces actions affectent l'intégralité des IFSI et sont irréversibles.</div>
              
              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"8px" }}>
                  <div>
                    <div style={{ fontSize:"14px", fontWeight:"700", color:t.text, marginBottom:"4px" }}>Exporter les données globales</div>
                    <div style={{ fontSize:"12px", color:t.text3 }}>Extraction JSON de la base de données complète</div>
                  </div>
                  <button onClick={()=>alert("Export complet en cours...")} style={{ background:t.accentBg, border:`1px solid ${t.accentBd}`, color:t.accent, padding:"10px 20px", borderRadius:"8px", fontSize:"12px", fontWeight:"700", cursor:"pointer" }}>Exporter JSON</button>
                </div>
                
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", background:t.redBg, border:`1px solid ${t.redBd}`, borderRadius:"8px" }}>
                  <div>
                    <div style={{ fontSize:"14px", fontWeight:"700", color:t.red, marginBottom:"4px" }}>Purger le journal d'audit</div>
                    <div style={{ fontSize:"12px", color:t.red, opacity:0.8 }}>Supprime définitivement tous les historiques datant de plus d'un an.</div>
                  </div>
                  <button onClick={()=>alert("Purge non implémentée.")} style={{ background:t.red, border:"none", color:"white", padding:"10px 20px", borderRadius:"8px", fontSize:"12px", fontWeight:"700", cursor:"pointer", boxShadow:`0 4px 10px ${t.redBd}` }}>Lancer la purge</button>
                </div>
              </div>
            </div>
          </div>

          {/* Section Archives et Restaurations */}
          {archivedIfsis && archivedIfsis.length > 0 && (
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden" }}>
              <div style={{ padding:"16px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}`, color:t.text, fontWeight:"800" }}>📦 Établissements Archivés</div>
              <div style={{ padding:"16px 24px", fontSize:"12px", color:t.text2, fontStyle:"italic", borderBottom:`1px solid ${t.border2}` }}>
                C'est ici que se trouvent les IFSI que vous avez archivés depuis le tableau de bord.
              </div>
              {archivedIfsis.map(a => (
                <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 24px", borderBottom:`1px solid ${t.border2}` }}>
                  <div style={{ color:t.text2, fontWeight:"600" }}>{a.name}</div>
                  <div style={{ display:"flex", gap:"10px" }}>
                     <button onClick={() => handleArchiveIfsi(a.id, a.name, false)} style={{ background:t.greenBg, color:t.green, border:`1px solid ${t.greenBd}`, padding:"8px 16px", borderRadius:"6px", cursor:"pointer", fontWeight:"700", fontSize:"11px" }}>Restaurer</button>
                     <button onClick={() => handleHardDeleteIfsi(a.id, a.name)} style={{ background:t.redBg, color:t.red, border:`1px solid ${t.redBd}`, padding:"8px 16px", borderRadius:"6px", cursor:"pointer", fontWeight:"700", fontSize:"11px" }}>Supprimer définitivement</button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
