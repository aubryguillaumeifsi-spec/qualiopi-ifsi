import React, { useState, useMemo } from "react";

export default function OrganigrammeTab({ currentIfsiName, orgRoles, allIfsiMembers, criteres, userProfile, getRoleColor, handleAddOrgRole, handleAddManualUser, handleUpdateUserDetail, t }) {
  const [selectedPersonId, setSelectedPersonId] = useState(null);

  const isAdminOrSuper = userProfile?.role === "admin" || userProfile?.role === "superadmin";
  const isSuperAdmin = userProfile?.role === "superadmin";

  // Fonction de calcul des statistiques pour une personne donnée
  const getUserStats = (person) => {
    // On cherche les indicateurs où la personne est désignée comme responsable (par son Nom ou Email)
    const userCriteres = criteres.filter(c => 
      c.responsables && c.responsables.some(resp => 
        resp.toLowerCase().includes(person.nom.toLowerCase()) || 
        (person.email && resp.toLowerCase().includes(person.email.toLowerCase()))
      )
    );
    
    const total = userCriteres.length;
    const conf = userCriteres.filter(c => c.statut === "conforme").length;
    const ec = userCriteres.filter(c => c.statut === "en-cours").length;
    const nc = userCriteres.filter(c => c.statut === "non-conforme").length;
    const pct = total > 0 ? Math.round((conf / total) * 100) : 0;
    
    return { total, conf, ec, nc, pct };
  };

  const safeMembers = allIfsiMembers.map(m => ({
    ...m, stats: getUserStats(m)
  })).filter(m => !m.archived); // Masquer les archivés de l'arbre principal

  const selectedPerson = allIfsiMembers.find(m => m.id === selectedPersonId);
  const unassigned = safeMembers.filter(m => m.roles.length === 0);

  // Hiérarchie de l'arbre
  const getRoleLevel = (role) => {
    const rLower = role.toLowerCase();
    if (rLower.includes("direction") || rLower.includes("directeur")) return 1;
    if (rLower.includes("qualité") || rLower.includes("stage") || rLower.includes("administration")) return 2;
    return 3;
  };

  const level1Roles = orgRoles.filter(r => getRoleLevel(r) === 1);
  const level2Roles = orgRoles.filter(r => getRoleLevel(r) === 2);
  const level3Roles = orgRoles.filter(r => getRoleLevel(r) === 3);

  // Fallback si la direction n'est pas identifiée
  if (level1Roles.length === 0 && orgRoles.length > 0) {
    level1Roles.push(orgRoles[0]);
    const idx = level3Roles.indexOf(orgRoles[0]);
    if (idx > -1) level3Roles.splice(idx, 1);
  }

  // --- GLISSER-DÉPOSER ---
  const handleDragStart = (e, member) => {
    e.dataTransfer.setData("memberId", member.id);
    e.dataTransfer.setData("memberType", member.type);
    e.dataTransfer.setData("currentRoles", JSON.stringify(member.roles));
  };

  const handleDropOnRole = (e, targetRole) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData("memberId");
    const memberType = e.dataTransfer.getData("memberType");
    if (!memberId) return;
    const currentRoles = JSON.parse(e.dataTransfer.getData("currentRoles") || "[]");
    
    if (!currentRoles.includes(targetRole)) {
      handleUpdateUserDetail(memberId, memberType, { roles: [...currentRoles, targetRole] });
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  // --- ACTIONS PANNEAU LATÉRAL ---
  const handleArchiveUser = async () => {
    if (window.confirm(`Archiver ${selectedPerson.prenom} ${selectedPerson.nom} ? Cette personne n'apparaîtra plus dans l'organigramme.`)) {
      await handleUpdateUserDetail(selectedPerson.id, selectedPerson.type, { archived: true });
      setSelectedPersonId(null);
    }
  };

  // --- RENDU D'UN NOEUD DE L'ARBRE (Carte Utilisateur) ---
  const renderRoleGroup = (role) => {
    const roleMembers = safeMembers.filter(m => m.roles.includes(role));
    const rc = getRoleColor(role);

    return (
      <div 
        key={role} 
        onDragOver={handleDragOver}
        onDrop={(e) => handleDropOnRole(e, role)}
        className="tree-node"
        style={{ display:"flex", flexDirection:"column", alignItems:"center", margin:"0 15px", position:"relative" }}
      >
        {/* Le connecteur vertical vers le haut (pour l'arbre CSS) */}
        <div className="connector-top" style={{ width:"1px", height:"24px", background:t.border, opacity: getRoleLevel(role) === 1 ? 0 : 1 }}/>

        {/* Le bloc du rôle */}
        <div style={{ background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"12px", width:"260px", padding:"12px", minHeight:"100px", display:"flex", flexDirection:"column", gap:"12px", boxShadow:t.shadowSm, zIndex:2 }}>
          
          {/* Header du Rôle (Vide ou DragTarget) */}
          <div style={{ fontSize:"11px", fontWeight:"800", color:rc.text, textTransform:"uppercase", letterSpacing:"1px", textAlign:"center" }}>
            {role}
          </div>

          {roleMembers.length === 0 ? (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", border:`1px dashed ${rc.bd}`, borderRadius:"8px", background:rc.bg, color:rc.text, fontSize:"11px", fontStyle:"italic", opacity:0.7 }}>
              Glissez un collaborateur
            </div>
          ) : (
            roleMembers.map(m => {
              const stColor = m.status === "ACTIF" ? t.green : t.amber;
              const stBg = m.status === "ACTIF" ? t.greenBg : t.amberBg;

              return (
                <div 
                  key={m.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, m)}
                  onClick={() => setSelectedPersonId(m.id)}
                  style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"10px", padding:"16px", cursor:"pointer", transition:"all 0.2s", boxShadow:"0 2px 6px rgba(0,0,0,0.04)" }}
                  onMouseOver={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.borderColor=rc.bd; e.currentTarget.style.boxShadow=`0 6px 16px ${rc.bg}`; }}
                  onMouseOut={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor=t.border; e.currentTarget.style.boxShadow="0 2px 6px rgba(0,0,0,0.04)"; }}
                >
                  <div style={{ display:"flex", alignItems:"flex-start", gap:"12px", marginBottom:"16px" }}>
                    <div style={{ width:"42px", height:"42px", borderRadius:"12px", background:rc.bg, border:`1px solid ${rc.bd}`, color:rc.text, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:"800", flexShrink:0 }}>
                      {m.prenom.charAt(0)}{m.nom ? m.nom.charAt(0) : ""}
                    </div>
                    <div>
                      <div style={{ fontSize:"14px", fontWeight:"800", color:t.text, lineHeight:"1.2" }}>{m.prenom} {m.nom}</div>
                      <div style={{ fontSize:"11px", color:t.text2, marginTop:"2px", fontWeight:"500" }}>{m.jobTitle}</div>
                      <div style={{ display:"inline-block", background:stBg, color:stColor, border:`1px solid ${stColor}40`, padding:"2px 6px", borderRadius:"4px", fontSize:"9px", fontWeight:"800", marginTop:"6px", textTransform:"uppercase" }}>
                        {m.status}
                      </div>
                    </div>
                  </div>

                  {/* Barre d'indicateurs de la personne */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"10px", fontWeight:"700", color:t.text3, marginBottom:"4px" }}>
                    <span>{m.stats.total} ind.</span>
                    <span>{m.stats.pct}%</span>
                  </div>
                  <div style={{ height:"4px", background:t.surface2, borderRadius:"2px", display:"flex", gap:"2px", overflow:"hidden" }}>
                    {m.stats.conf > 0 && <div style={{ width:`${(m.stats.conf/m.stats.total)*100}%`, background:t.green, height:"100%" }}/>}
                    {m.stats.ec > 0 && <div style={{ width:`${(m.stats.ec/m.stats.total)*100}%`, background:t.amber, height:"100%" }}/>}
                    {m.stats.nc > 0 && <div style={{ width:`${(m.stats.nc/m.stats.total)*100}%`, background:t.red, height:"100%" }}/>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Le connecteur vertical vers le bas (sauf pour le dernier niveau) */}
        <div className="connector-bottom" style={{ width:"1px", height:"24px", background:t.border, opacity: getRoleLevel(role) === 3 ? 0 : 1 }}/>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display:"flex", gap:"24px", height:"100%" }}>
      <style>{`
        .tree-level { display: flex; justify-content: center; position: relative; }
        /* La barre horizontale qui relie les enfants */
        .tree-level-children::before { content: ''; position: absolute; top: 0; left: 150px; right: 150px; height: 1px; background: ${t.border}; }
      `}</style>
      
      {/* ── ZONE GAUCHE : L'Organigramme ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"20px", overflow:"hidden" }}>
        
        {/* LÉGENDES ET BOUTONS */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          
          <div style={{ display:"flex", alignItems:"center", gap:"10px", background:t.surface, padding:"12px 16px", borderRadius:"12px", border:`1px solid ${t.border}`, boxShadow:t.shadowSm, flexWrap:"wrap", maxWidth:"600px" }}>
            <span style={{ fontSize:"11px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginRight:"8px" }}>Pôles :</span>
            {orgRoles.map(r => {
              const rc = getRoleColor(r);
              return (
                <div key={r} style={{ display:"flex", alignItems:"center", gap:"6px", background:rc.bg, border:`1px solid ${rc.bd}`, padding:"4px 10px", borderRadius:"20px" }}>
                  <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:rc.text }}/>
                  <span style={{ fontSize:"11px", fontWeight:"700", color:rc.text }}>{r}</span>
                </div>
              )
            })}
          </div>

          <div style={{ display:"flex", gap:"12px" }}>
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, padding:"10px 16px", borderRadius:"12px", boxShadow:t.shadowSm, display:"flex", alignItems:"center", gap:"12px" }}>
               <span style={{ fontSize:"12px", fontWeight:"700", color:t.text2 }}>Effectif :</span>
               <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:t.text, lineHeight:1 }}>{safeMembers.length}</span>
            </div>

            {isAdminOrSuper && (
              <>
                <button onClick={() => { const p = prompt("Prénom :"); const n = prompt("Nom :"); if(p&&n) handleAddManualUser(p,n); }} style={{ background:t.surface2, border:`1px solid ${t.border}`, color:t.text, padding:"10px 16px", borderRadius:"12px", fontSize:"13px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm }}>
                  👤 Nouveau collaborateur
                </button>
                <button onClick={() => { const r = prompt("Nom du nouveau rôle :"); if(r) handleAddOrgRole(r); }} style={{ background:t.accentBg, border:`1px solid ${t.accentBd}`, color:t.accent, padding:"10px 16px", borderRadius:"12px", fontSize:"13px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm }}>
                  + Pôle
                </button>
              </>
            )}
          </div>
        </div>

        {/* L'ARBRE CSS */}
        <div style={{ flex:1, overflow:"auto", padding:"40px 20px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"16px", display:"flex", flexDirection:"column", alignItems:"center", boxShadow:t.shadowSm }}>
          
          {/* Niveau 1 */}
          {level1Roles.length > 0 && (
            <div className="tree-level">
              {level1Roles.map(r => renderRoleGroup(r))}
            </div>
          )}

          {/* Niveau 2 */}
          {level2Roles.length > 0 && (
            <div className="tree-level tree-level-children" style={{ width:"100%" }}>
              {level2Roles.map((r) => renderRoleGroup(r))}
            </div>
          )}

          {/* Niveau 3 */}
          {level3Roles.length > 0 && (
            <div className="tree-level tree-level-children" style={{ width:"100%", flexWrap:"wrap" }}>
              {level3Roles.map(r => renderRoleGroup(r))}
            </div>
          )}

          {/* Légende Barres bas de page */}
          <div style={{ marginTop:"auto", paddingTop:"60px", width:"100%", display:"flex", justifyContent:"flex-start" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"16px", background:t.surface2, padding:"10px 16px", borderRadius:"8px", border:`1px solid ${t.border}` }}>
              <span style={{ fontSize:"10px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"0.5px" }}>Barres d'indicateurs :</span>
              <div style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"11px", color:t.text, fontWeight:"600" }}><div style={{ width:"12px", height:"4px", background:t.green, borderRadius:"2px" }}/> Conforme</div>
              <div style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"11px", color:t.text, fontWeight:"600" }}><div style={{ width:"12px", height:"4px", background:t.amber, borderRadius:"2px" }}/> En cours</div>
              <div style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"11px", color:t.text, fontWeight:"600" }}><div style={{ width:"12px", height:"4px", background:t.red, borderRadius:"2px" }}/> Non conforme</div>
            </div>
          </div>

          {/* Non Assignés flottants */}
          {unassigned.length > 0 && (
            <div style={{ marginTop:"40px", padding:"24px", border:`1px dashed ${t.border}`, borderRadius:"12px", background:t.surface2, width:"100%", maxWidth:"800px" }}>
              <div style={{ fontSize:"11px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"16px", textAlign:"center" }}>Personnel non assigné (Prenez et Glissez)</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"12px", justifyContent:"center" }}>
                {unassigned.map(m => (
                  <div 
                    key={m.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, m)}
                    onClick={() => setSelectedPersonId(m.id)} 
                    style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"8px", padding:"10px 16px", display:"flex", alignItems:"center", gap:"12px", cursor:"grab", boxShadow:t.shadowSm }}
                  >
                    <div style={{ width:"28px", height:"28px", borderRadius:"6px", background:t.surface3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:"800", color:t.text3 }}>
                      {m.prenom.charAt(0)}{m.nom ? m.nom.charAt(0) : ""}
                    </div>
                    <div style={{ fontSize:"13px", fontWeight:"600", color:t.text2 }}>{m.prenom} {m.nom}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ZONE DROITE : Détail de la Personne (Façon Outlook / Modal) ── */}
      {selectedPerson && (
        <div className="animate-fade-in" style={{ width:"380px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"16px", display:"flex", flexDirection:"column", boxShadow:t.shadow, flexShrink:0, overflow:"hidden" }}>
          
          {/* Header */}
          <div style={{ padding:"24px 20px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
            <div style={{ display:"flex", gap:"16px", alignItems:"center" }}>
              <div style={{ width:"64px", height:"64px", borderRadius:"16px", background:t.goldBg, border:`1px solid ${t.goldBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", fontWeight:"800", color:t.gold }}>
                {selectedPerson.prenom.charAt(0)}{selectedPerson.nom ? selectedPerson.nom.charAt(0) : ""}
              </div>
              <div>
                <div style={{ fontSize:"20px", fontWeight:"800", color:t.text }}>{selectedPerson.prenom} {selectedPerson.nom}</div>
                {isAdminOrSuper ? (
                   <input type="text" value={selectedPerson.jobTitle} onChange={e => handleUpdateUserDetail(selectedPerson.id, selectedPerson.type, {jobTitle: e.target.value})} style={{ background:"transparent", border:"none", borderBottom:`1px dashed ${t.border}`, color:t.text2, fontSize:"13px", outline:"none", width:"100%", marginTop:"4px" }} placeholder="Fonction..." />
                ) : (
                   <div style={{ fontSize:"13px", color:t.text2, marginTop:"4px" }}>{selectedPerson.jobTitle}</div>
                )}
                
                <div style={{ marginTop:"8px", cursor:isAdminOrSuper?"pointer":"default" }} onClick={() => isAdminOrSuper && handleUpdateUserDetail(selectedPerson.id, selectedPerson.type, {status: selectedPerson.status === "ACTIF" ? "CONGÉ" : "ACTIF"})}>
                  <span style={{ background:selectedPerson.status==="ACTIF"?t.greenBg:t.amberBg, color:selectedPerson.status==="ACTIF"?t.green:t.amber, border:`1px solid ${selectedPerson.status==="ACTIF"?t.greenBd:t.amberBd}`, fontSize:"10px", fontWeight:"800", padding:"3px 10px", borderRadius:"12px" }}>
                    {selectedPerson.status}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedPersonId(null)} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"8px", color:t.text3, fontSize:"16px", cursor:"pointer", width:"32px", height:"32px", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          </div>

          <div style={{ padding:"24px 20px", flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:"24px" }}>
            
            {/* Contact */}
            <div>
              <div style={{ fontSize:"11px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>Contact</div>
              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px", color:t.text2, fontSize:"14px" }}>
                  <span>✉️</span>
                  {selectedPerson.email ? <span style={{ fontFamily:"'DM Mono',monospace" }}>{selectedPerson.email}</span> : <span style={{ fontStyle:"italic", opacity:0.5 }}>Non renseigné</span>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"12px", color:t.text2, fontSize:"14px" }}>
                  <span>📞</span>
                  {isAdminOrSuper ? (
                    <input type="text" value={selectedPerson.phone || ""} onChange={e => handleUpdateUserDetail(selectedPerson.id, selectedPerson.type, {phone: e.target.value})} placeholder="Ajouter un numéro..." style={{ background:"transparent", border:"none", borderBottom:`1px dashed ${t.border}`, color:t.text, fontFamily:"'DM Mono',monospace", outline:"none" }} />
                  ) : (
                    <span style={{ fontFamily:"'DM Mono',monospace" }}>{selectedPerson.phone || "Non renseigné"}</span>
                  )}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"12px", color:t.text2, fontSize:"14px" }}>
                  <span>🏢</span>
                  <span style={{ fontWeight:"600", color:t.text }}>{selectedPerson.roles.join(', ') || "Aucun pôle"}</span>
                </div>
              </div>
            </div>

            <hr style={{ border:0, borderTop:`1px solid ${t.border}` }}/>

            {/* Indicateurs Qualiopi Personnels */}
            <div>
              <div style={{ fontSize:"11px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>Indicateurs Qualiopi</div>
              
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"16px" }}>
                <div style={{ border:`1px solid ${t.greenBd}`, background:t.greenBg, borderRadius:"8px", padding:"12px", textAlign:"center", color:t.green }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"26px", lineHeight:1 }}>{selectedPerson.stats.conf}</div>
                  <div style={{ fontSize:"10px", fontWeight:"700", marginTop:"4px" }}>Conformes</div>
                </div>
                <div style={{ border:`1px solid ${t.amberBd}`, background:t.amberBg, borderRadius:"8px", padding:"12px", textAlign:"center", color:t.amber }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"26px", lineHeight:1 }}>{selectedPerson.stats.ec}</div>
                  <div style={{ fontSize:"10px", fontWeight:"700", marginTop:"4px" }}>En cours</div>
                </div>
                <div style={{ border:`1px solid ${t.redBd}`, background:t.redBg, borderRadius:"8px", padding:"12px", textAlign:"center", color:t.red }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"26px", lineHeight:1 }}>{selectedPerson.stats.nc}</div>
                  <div style={{ fontSize:"10px", fontWeight:"700", marginTop:"4px" }}>Non conf.</div>
                </div>
              </div>

              <div style={{ background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"8px", padding:"12px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", fontWeight:"700", color:t.text2, marginBottom:"8px" }}>
                  <span>Taux de conformité</span>
                  <span style={{ color:t.text }}>{selectedPerson.stats.pct}%</span>
                </div>
                <div style={{ height:"6px", background:t.border, borderRadius:"3px", display:"flex", gap:"2px", overflow:"hidden" }}>
                  {selectedPerson.stats.conf > 0 && <div style={{ width:`${(selectedPerson.stats.conf/selectedPerson.stats.total)*100}%`, background:t.green, height:"100%" }}/>}
                  {selectedPerson.stats.ec > 0 && <div style={{ width:`${(selectedPerson.stats.ec/selectedPerson.stats.total)*100}%`, background:t.amber, height:"100%" }}/>}
                  {selectedPerson.stats.nc > 0 && <div style={{ width:`${(selectedPerson.stats.nc/selectedPerson.stats.total)*100}%`, background:t.red, height:"100%" }}/>}
                </div>
              </div>
            </div>

            {/* Boutons Actions */}
            <div style={{ display:"flex", gap:"12px", marginTop:"auto" }}>
              <button 
                onClick={() => selectedPerson.email ? (window.location.href = `mailto:${selectedPerson.email}`) : alert("Aucune adresse mail renseignée.")}
                style={{ flex:1, background:t.surface2, border:`1px solid ${t.border}`, color:t.text, padding:"12px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", transition:"all 0.2s" }}
                onMouseOver={e=>e.currentTarget.style.borderColor=t.accent} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}
              >
                ✉️ Contacter
              </button>
              <button 
                onClick={() => alert(`Bientôt : Ouvre le tableau filtré avec les ${selectedPerson.stats.total} indicateurs de ${selectedPerson.prenom}.`)}
                style={{ flex:1, background:t.goldBg, border:`1px solid ${t.goldBd}`, color:t.gold, padding:"12px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", transition:"all 0.2s" }}
              >
                📋 Indicateurs
              </button>
            </div>

            {/* Actions SuperAdmin Critiques */}
            {isAdminOrSuper && (
               <div style={{ marginTop:"10px", textAlign:"center" }}>
                 <button onClick={handleArchiveUser} style={{ background:"transparent", border:"none", color:t.red, fontSize:"11px", fontWeight:"700", cursor:"pointer", textDecoration:"underline" }}>
                   Archiver ce collaborateur
                 </button>
               </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
