import React, { useState, useMemo } from "react";

// --- Fausses données pour l'UI de l'onglet Utilisateurs (Maquette Image 5) ---
const MOCK_USERS = [
  { id:1, init:"ML", nom:"Marie Leclerc", mail:"m.leclerc@ifsi-lyon.fr", etab:"Tous", role:"Super Admin", active:"Il y a 2 min", status:"Actif" },
  { id:2, init:"SR", nom:"Sophie Renard", mail:"s.renard@ifsi-lyon.fr", etab:"IFSI de Lyon", role:"Admin", active:"Il y a 18 min", status:"Actif" },
  { id:3, init:"PD", nom:"Paul Dupont", mail:"p.dupont@ifsi-lyon.fr", etab:"IFSI de Lyon", role:"Éditeur", active:"Il y a 1h", status:"Actif" },
  { id:4, init:"CM", nom:"Claire Martin", mail:"c.martin@ifsi-lyon.fr", etab:"IFSI de Lyon", role:"Éditeur", active:"Hier", status:"Inactif" },
  { id:5, init:"ÉB", nom:"Éric Bouvier", mail:"e.bouvier@ifsi-grenoble.fr", etab:"IFSI de Grenoble", role:"Admin", active:"Il y a 30 min", status:"Actif" },
  { id:6, init:"ND", nom:"Nathalie Durand", mail:"n.durand@ifsi-st-et.fr", etab:"IFSI de St-Étienne", role:"Éditeur", active:"Il y a 4h", status:"Actif" },
  { id:7, init:"MF", nom:"Marc Fontaine", mail:"m.fontaine@ifsi-annecy.fr", etab:"IFSI d'Annecy", role:"Lecteur", active:"Il y a 2j", status:"Actif" },
];

export default function TourControleTab({ globalScore, activeIfsis, topAlerts, sortedTourIfsis, setSelectedIfsi, archivedIfsis, handleArchiveIfsi, handleHardDeleteIfsi, setActiveTab, tourSort, setTourSort, t }) {
  
  const [onglet, setOnglet] = useState("vue");

  const etablissements = sortedTourIfsis.map(e => ({
    id: e.id, nom: e.name, region: "Réseau QualiForma", conformite: e.pct || 0,
    nonConformes: e.liste?.filter(c => c.statut === "non-conforme").length || 0,
    enCours: e.liste?.filter(c => c.statut === "en-cours").length || 0,
    audit: e.auditDate ? new Date(e.auditDate).toLocaleDateString("fr-FR") : "-",
    jours: e.auditDate ? Math.round((new Date(e.auditDate) - new Date()) / 86400000) : 0,
    statut: (e.pct < 65 || (e.liste?.filter(c => c.statut === "non-conforme").length || 0) > 10) ? "critique" : (e.pct < 80) ? "alerte" : "actif",
    users: e.users || Math.floor(Math.random() * 8) + 2 // Simulation si prop manquante
  }));

  const critiques = etablissements.filter(e => e.statut === "critique").length;
  const conformiteMoy = globalScore || 0;

  // Tri des alertes par gravité (Critique > Avertissement > Info)
  const alertesActives = useMemo(() => {
    const list = (topAlerts || []).map(a => {
      let type = "info";
      let poid = 0;
      let msg = "";
      if (a.type === "non-conforme") { type = "critique"; poid = 3; msg = `${a.critere?.num} — ${a.critere?.titre}`; }
      else if (a.type === "depasse" && a.days > 0) { type = "avertissement"; poid = 2; msg = `L'échéance de l'indicateur ${a.critere?.num} est dépassée de ${a.days} jours.`; }
      else { type = "info"; poid = 1; msg = `Information sur ${a.critere?.num}.`; }
      return { id: a.id, type, etab: a.ifsiName, msg, rawId: a.ifsiId, poid };
    });
    return list.sort((a,b) => b.poid - a.poid);
  }, [topAlerts]);

  const ONGLETS = [
    { id:"vue",      label:"Vue globale",     icon:"◈" },
    { id:"alertes",  label:"Alertes",         icon:"🚨", badge: alertesActives.length },
    { id:"users",    label:"Utilisateurs",    icon:"👥" },
    { id:"journal",  label:"Journal d'audit", icon:"📋" },
    { id:"config",   label:"Configuration",   icon:"⚙️" }
  ];

  return (
    <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
      <style>{`
        .tab-btn:hover { color:${t.text}!important; background:${t.surface2}!important; }
        .ro { transition:background 0.15s; }
        .ro:hover { background:${t.surface2}!important; cursor:pointer; }
        
        /* Toggle Switch CSS */
        .toggle-switch { position: relative; width: 36px; height: 20px; border-radius: 10px; background: ${t.border}; cursor: pointer; transition: background 0.3s; display:flex; alignItems:center; padding: 2px; }
        .toggle-switch.on { background: ${t.accent}; }
        .toggle-knob { width: 16px; height: 16px; border-radius: 50%; background: white; transition: transform 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .toggle-switch.on .toggle-knob { transform: translateX(16px); }
      `}</style>

      {/* ── KPIs HAUT DE PAGE (Image 159aab) ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"16px" }}>
        {[
          { v:etablissements.length, l:"Établissements", c:t.text, icon:"🏥", bg:t.surface3 },
          { v:`${conformiteMoy}%`, l:"Conformité moy.", c:t.text, icon:"📊", bg:t.goldBg, bc:t.gold },
          { v:etablissements.reduce((s,e)=>s+e.nonConformes,0), l:"Non conformes", c:t.text, icon:"⚠️", bg:t.amberBg, bc:t.amber },
          { v:MOCK_USERS.length, l:"Utilisateurs", c:t.text, icon:"👥", bg:t.purpleBg || t.surface3, bc:t.purple || t.text3 },
        ].map((s,i) => (
          <div key={i} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"20px", boxShadow:t.shadowSm }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"42px", color:s.c, lineHeight:1, letterSpacing:"-1px", marginBottom:"8px" }}>{s.v}</div>
                <div style={{ fontSize:"13px", color:t.text2, fontWeight:"600" }}>{s.l}</div>
              </div>
              <div style={{ width:"36px", height:"36px", borderRadius:"8px", background:s.bg, color:s.bc || t.text, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px" }}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── ONGLETS ── */}
      <div style={{ display:"flex", gap:"8px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"6px", boxShadow:t.shadowSm, overflowX:"auto" }}>
        {ONGLETS.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} className={onglet===o.id?"":"tab-btn"} style={{ flex:1, whiteSpace:"nowrap", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", padding:"12px 16px", borderRadius:"8px", border:"none", background:onglet===o.id?t.accentBg:"transparent", color:onglet===o.id?t.accent:t.text2, fontSize:"14px", fontWeight:onglet===o.id?"800":"600", cursor:"pointer", transition:"all 0.15s" }}>
            <span>{o.icon}</span>
            {o.label}
            {o.badge > 0 && <span style={{ background:t.red, color:"white", fontSize:"11px", fontWeight:"800", padding:"2px 8px", borderRadius:"12px", marginLeft:"6px" }}>{o.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── ONGLET : VUE GLOBALE ── */}
      {onglet === "vue" && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
          <div style={{ padding:"16px 24px", borderBottom:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:"16px", fontWeight:"800", color:t.text }}>Performances par établissement</span>
            <select value={tourSort} onChange={(e) => setTourSort(e.target.value)} style={{ padding:"8px 12px", borderRadius:"8px", background:t.surface2, color:t.text, border:`1px solid ${t.border}`, outline:"none", fontSize:"12px", fontWeight:"600", cursor:"pointer" }}>
              <option value="urgence">Trier par Audit</option>
              <option value="score_desc">Trier par Conformité</option>
            </select>
          </div>
          
          <div className="scroll-container" style={{ overflowX:"auto" }}>
            <div style={{ minWidth:"850px" }}>
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
                        <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:statCfg.c, boxShadow:`0 0 6px ${statCfg.c}80` }}/>
                        <span style={{ fontSize:"13px", fontWeight:"600", color:t.text2 }}>{statCfg.label}</span>
                      </div>

                      <div style={{ display:"flex", alignItems:"center", gap:"8px", color:t.text2, fontSize:"14px", fontWeight:"600" }}>
                        <span style={{ fontSize:"16px" }}>👥</span> {e.users}
                      </div>

                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"15px", fontWeight:"800", color:e.nonConformes > 10 ? t.red : e.nonConformes > 0 ? t.amber : t.green }}>{e.nonConformes}</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"14px", color:t.text2 }}>{e.enCours}</span>
                      <span style={{ fontSize:"12px", color:t.text2, fontFamily:"'DM Mono',monospace" }}>{e.audit}</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"14px", fontWeight:"800", color:e.jours < 0 ? t.red : e.jours < 60 ? t.amber : t.green }}>{e.jours < 0 ? "Dépassé" : `J‑${e.jours}`}</span>
                      
                      <button onClick={(ev) => { ev.stopPropagation(); handleArchiveIfsi(e.id, e.nom, true); }} style={{ background:t.surface2, border:`1px solid ${t.border}`, color:t.text2, padding:"6px 12px", borderRadius:"6px", cursor:"pointer", fontSize:"11px", fontWeight:"700", transition:"all 0.2s" }} onMouseOver={e=>e.currentTarget.style.color=t.amber} onMouseOut={e=>e.currentTarget.style.color=t.text2}>
                        Archiver
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ONGLET : ALERTES (Affinées et Élégantes) ── */}
      {onglet === "alertes" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          
          <div style={{ fontSize:"12px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginTop:"10px", marginBottom:"4px" }}>
            — Critiques ({alertesActives.filter(a=>a.type==="critique").length})
          </div>
          {alertesActives.filter(a=>a.type==="critique").map(a => (
            <div key={a.id} style={{ background:t.surface, border:`1px solid ${t.redBd}`, borderLeft:`4px solid ${t.red}`, borderRadius:"8px", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:t.shadowSm }}>
              <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
                <div style={{ fontSize:"18px" }}>🚨</div>
                <div>
                  <div style={{ fontSize:"14px", fontWeight:"800", color:t.text, marginBottom:"2px" }}>{a.etab}</div>
                  <div style={{ fontSize:"12px", color:t.text2 }}>{a.msg}</div>
                </div>
              </div>
              <button onClick={() => { setSelectedIfsi(a.rawId); setActiveTab("criteres"); }} style={{ background:t.accent, border:"none", padding:"8px 16px", borderRadius:"6px", fontSize:"12px", fontWeight:"700", color:"white", cursor:"pointer", boxShadow:`0 2px 8px ${t.accentBd}` }}>
                Intervenir
              </button>
            </div>
          ))}

          <div style={{ fontSize:"12px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginTop:"20px", marginBottom:"4px" }}>
            — Avertissements ({alertesActives.filter(a=>a.type==="avertissement").length})
          </div>
          {alertesActives.filter(a=>a.type==="avertissement").map(a => (
            <div key={a.id} style={{ background:t.surface, border:`1px solid ${t.amberBd}`, borderLeft:`4px solid ${t.amber}`, borderRadius:"8px", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:t.shadowSm }}>
              <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
                <div style={{ fontSize:"18px" }}>⚠️</div>
                <div>
                  <div style={{ fontSize:"14px", fontWeight:"800", color:t.text, marginBottom:"2px" }}>{a.etab}</div>
                  <div style={{ fontSize:"12px", color:t.text2 }}>{a.msg}</div>
                </div>
              </div>
              <button onClick={() => { setSelectedIfsi(a.rawId); setActiveTab("criteres"); }} style={{ background:t.accent, border:"none", padding:"8px 16px", borderRadius:"6px", fontSize:"12px", fontWeight:"700", color:"white", cursor:"pointer", boxShadow:`0 2px 8px ${t.accentBd}` }}>
                Intervenir
              </button>
            </div>
          ))}

          {alertesActives.length === 0 && (
            <div style={{ background:t.greenBg, border:`1px solid ${t.greenBd}`, borderRadius:"12px", padding:"40px", textAlign:"center" }}>
              <div style={{ fontSize:"40px", marginBottom:"12px" }}>✅</div>
              <div style={{ fontSize:"18px", fontWeight:"800", color:t.green }}>Aucune alerte réseau</div>
            </div>
          )}
        </div>
      )}

      {/* ── ONGLET : UTILISATEURS (Image 15f0a5) ── */}
      {onglet === "users" && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
          <div style={{ padding:"16px 24px", borderBottom:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:t.text }}>Gestion des utilisateurs</span>
            <button style={{ background:t.accent, color:"white", border:"none", padding:"8px 16px", borderRadius:"8px", fontSize:"12px", fontWeight:"700", cursor:"pointer", boxShadow:`0 4px 10px ${t.accentBd}` }}>
              + Inviter un utilisateur
            </button>
          </div>
          
          <div className="scroll-container" style={{ overflowX:"auto" }}>
            <div style={{ minWidth:"850px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"minmax(220px, 1fr) 160px 120px 140px 100px 140px", padding:"12px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
                {["Utilisateur", "Établissement", "Rôle", "Dernière activité", "Statut", "Actions"].map(h => (
                  <span key={h} style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"0.8px" }}>{h}</span>
                ))}
              </div>

              <div style={{ overflowY:"auto", maxHeight:"500px" }}>
                {MOCK_USERS.map(u => (
                  <div key={u.id} className="ro" style={{ display:"grid", gridTemplateColumns:"minmax(220px, 1fr) 160px 120px 140px 100px 140px", alignItems:"center", padding:"14px 24px", borderBottom:`1px solid ${t.border2}` }}>
                    
                    <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                      <div style={{ width:"36px", height:"36px", borderRadius:"10px", background: u.role==="Super Admin" ? t.goldBg : t.surface3, color: u.role==="Super Admin" ? t.gold : t.text, border:`1px solid ${u.role==="Super Admin" ? t.goldBd : t.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:"800" }}>
                        {u.init}
                      </div>
                      <div style={{ overflow:"hidden" }}>
                        <div style={{ fontSize:"13px", fontWeight:"700", color:t.text, whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{u.nom}</div>
                        <div style={{ fontSize:"11px", color:t.text3, whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{u.mail}</div>
                      </div>
                    </div>

                    <span style={{ fontSize:"12px", color:t.text2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.etab}</span>
                    
                    <div>
                      <span style={{ border:`1px solid ${u.role==="Super Admin" ? t.goldBd : u.role==="Admin" ? t.accentBd : t.greenBd}`, background:u.role==="Super Admin" ? t.goldBg : u.role==="Admin" ? t.accentBg : t.greenBg, color:u.role==="Super Admin" ? t.gold : u.role==="Admin" ? t.accent : t.green, fontSize:"10px", fontWeight:"800", padding:"3px 8px", borderRadius:"6px" }}>
                        {u.role}
                      </span>
                    </div>

                    <span style={{ fontSize:"11px", color:t.text3, fontFamily:"'DM Mono',monospace" }}>{u.active}</span>

                    <div>
                      <span style={{ background:u.status==="Actif" ? t.greenBg : t.surface3, color:u.status==="Actif" ? t.green : t.text3, border:`1px solid ${u.status==="Actif" ? t.greenBd : t.border}`, fontSize:"10px", fontWeight:"800", padding:"3px 8px", borderRadius:"12px" }}>
                        {u.status}
                      </span>
                    </div>

                    <div style={{ display:"flex", gap:"8px" }}>
                      <button style={{ background:t.surface2, border:`1px solid ${t.border}`, padding:"6px 10px", borderRadius:"6px", cursor:"pointer", color:t.text2 }}>✏️</button>
                      <button style={{ background:t.surface2, border:`1px solid ${t.border}`, padding:"6px 10px", borderRadius:"6px", cursor:"pointer", color:t.gold }}>🔑</button>
                      {u.role !== "Super Admin" ? (
                        <button style={{ background:t.redBg, border:`1px solid ${t.redBd}`, padding:"6px 12px", borderRadius:"6px", cursor:"pointer", color:t.red, fontSize:"11px", fontWeight:"600" }}>Révoquer</button>
                      ) : (
                        <span style={{ fontSize:"12px", color:t.text3, padding:"6px 12px" }}>—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ONGLET : JOURNAL SYSTÈME ── */}
      {onglet === "journal" && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"32px", display:"flex", flexDirection:"column", gap:"16px" }}>
           <div style={{ fontSize:"18px", fontWeight:"800", color:t.text, borderBottom:`1px solid ${t.border}`, paddingBottom:"16px", marginBottom:"8px" }}>Historique des événements techniques</div>
           {[
             { id:1, u:"superadmin@reseau.fr", a:"A archivé l'établissement IFSI de Lyon", t:"Il y a 10 min", c:t.red },
             { id:2, u:"superadmin@reseau.fr", a:"A exporté la base de données JSON", t:"Il y a 2h", c:t.accent },
             { id:3, u:"directeur@ifsi-lyon.fr", a:"Connexion réussie", t:"Hier à 08:30", c:t.green },
             { id:4, u:"Système", a:"Sauvegarde automatique de la base effectuée", t:"Hier à 03:00", c:t.text3 },
           ].map(j => (
             <div key={j.id} style={{ display:"flex", alignItems:"flex-start", gap:"16px", paddingBottom:"16px", borderBottom:`1px dashed ${t.border2}` }}>
               <div style={{ width:"10px", height:"10px", borderRadius:"50%", background:j.c, marginTop:"6px", boxShadow:`0 0 8px ${j.c}80` }}/>
               <div>
                 <div style={{ fontSize:"14px", color:t.text }}><strong style={{color:t.text}}>{j.u}</strong> : {j.a}</div>
                 <div style={{ fontSize:"12px", color:t.text3, marginTop:"4px", fontFamily:"'DM Mono',monospace" }}>{j.t}</div>
               </div>
             </div>
           ))}
        </div>
      )}

      {/* ── ONGLET : CONFIGURATION (Image 6) ── */}
      {onglet === "config" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"24px" }}>
          
          {/* Colonne Gauche */}
          <div style={{ display:"flex", flexDirection:"column", gap:"24px" }}>
            
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
              <div style={{ padding:"16px 20px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
                <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"18px", color:t.text }}>Seuils de conformité</span>
              </div>
              <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:"12px" }}>
                {[
                  { l:"Seuil critique (en dessous = critique)", v:"65%", c:t.red },
                  { l:"Seuil d'alerte (en dessous = alerte)", v:"80%", c:t.amber },
                  { l:"Objectif cible", v:"90%", c:t.green },
                ].map(s => (
                  <div key={s.l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"8px" }}>
                    <span style={{ fontSize:"13px", color:t.text2 }}>{s.l}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                      <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:s.c }}>{s.v}</span>
                      <button style={{ background:"transparent", border:`1px solid ${t.accentBd}`, color:t.accent, padding:"4px 10px", borderRadius:"6px", fontSize:"11px", fontWeight:"600", cursor:"pointer" }}>Modifier</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
              <div style={{ padding:"16px 20px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
                <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"18px", color:t.text }}>Sauvegardes & Exports</span>
              </div>
              <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:"12px" }}>
                {[
                  { l:"Dernière sauvegarde", v:"Aujourd'hui 03:00", c:t.green },
                  { l:"Fréquence", v:"Quotidienne (03:00)", c:t.text },
                  { l:"Rétention", v:"90 jours", c:t.text },
                  { l:"Export auto PDF", v:"Mensuel (1er du mois)", c:t.text },
                ].map(s => (
                  <div key={s.l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"8px" }}>
                    <span style={{ fontSize:"13px", color:t.text2 }}>{s.l}</span>
                    <span style={{ fontSize:"13px", fontWeight:"800", color:s.c }}>{s.v}</span>
                  </div>
                ))}
                <button style={{ marginTop:"8px", background:t.accentBg, border:`1px solid ${t.accentBd}`, color:t.accent, padding:"12px", borderRadius:"8px", fontSize:"13px", fontWeight:"800", cursor:"pointer" }}>
                  📥 Lancer une sauvegarde maintenant
                </button>
              </div>
            </div>
            
          </div>

          {/* Colonne Droite */}
          <div style={{ display:"flex", flexDirection:"column", gap:"24px" }}>
            
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
              <div style={{ padding:"16px 20px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
                <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"18px", color:t.text }}>Notifications automatiques</span>
              </div>
              <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:"12px" }}>
                {[
                  { l:"Email J-30 avant audit", on:true },
                  { l:"Email J-15 avant audit", on:true },
                  { l:"Email J-7 avant audit", on:true },
                  { l:"Alerte indicateur NC ajouté", on:true },
                  { l:"Rapport hebdomadaire réseau", on:false },
                ].map(n => (
                  <div key={n.l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"8px" }}>
                    <span style={{ fontSize:"13px", color:t.text2 }}>{n.l}</span>
                    <div className={`toggle-switch ${n.on ? 'on' : ''}`}>
                      <div className="toggle-knob" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:t.dangerBg, border:`1px solid ${t.dangerBd}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
              <div style={{ padding:"20px 24px" }}>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:t.danger, marginBottom:"6px" }}>⚠️ Zone d'administration critique</div>
                <div style={{ fontSize:"12px", color:t.danger, opacity:0.8, marginBottom:"20px" }}>Ces actions sont irréversibles. Réservées au Super Admin.</div>
                
                <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                  {[
                    { l:"Réinitialiser tous les mots de passe", d:"Envoie un email à tous les utilisateurs" },
                    { l:"Purger le journal d'audit", d:"Supprime les entrées > 1 an" },
                    { l:"Exporter toutes les données", d:"Export complet JSON / CSV" },
                  ].map(a => (
                    <div key={a.l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:t.surface, border:`1px solid ${t.dangerBd}`, borderRadius:"8px" }}>
                      <div>
                        <div style={{ fontSize:"13px", fontWeight:"800", color:t.text, marginBottom:"2px" }}>{a.l}</div>
                        <div style={{ fontSize:"11px", color:t.text3 }}>{a.d}</div>
                      </div>
                      <button style={{ background:"transparent", border:`1px solid ${t.dangerBd}`, color:t.danger, padding:"6px 12px", borderRadius:"6px", fontSize:"11px", fontWeight:"700", cursor:"pointer" }}>Exécuter</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
          </div>

          {/* Section Archives en pleine largeur en bas */}
          {archivedIfsis && archivedIfsis.length > 0 && (
            <div style={{ gridColumn:"1/-1", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
              <div style={{ padding:"20px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}`, color:t.text, fontSize:"16px", fontWeight:"800" }}>📦 Établissements Archivés</div>
              <div style={{ padding:"16px 24px", fontSize:"13px", color:t.text2, fontStyle:"italic", borderBottom:`1px solid ${t.border2}` }}>
                IFSI archivés depuis le tableau de bord global. Ils sont invisibles pour les utilisateurs.
              </div>
              {archivedIfsis.map(a => (
                <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 24px", borderBottom:`1px solid ${t.border2}` }}>
                  <div style={{ color:t.text, fontSize:"15px", fontWeight:"700" }}>{a.name}</div>
                  <div style={{ display:"flex", gap:"12px" }}>
                     <button onClick={() => handleArchiveIfsi(a.id, a.name, false)} style={{ background:t.greenBg, color:t.green, border:`1px solid ${t.greenBd}`, padding:"8px 16px", borderRadius:"6px", cursor:"pointer", fontWeight:"700", fontSize:"12px" }}>Restaurer l'accès</button>
                     <button onClick={() => handleHardDeleteIfsi(a.id, a.name)} style={{ background:t.redBg, color:t.red, border:`1px solid ${t.redBd}`, padding:"8px 16px", borderRadius:"6px", cursor:"pointer", fontWeight:"700", fontSize:"12px" }}>Supprimer définitivement</button>
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
