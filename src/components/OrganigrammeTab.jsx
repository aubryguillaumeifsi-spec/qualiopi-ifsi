import React, { useState, useEffect } from "react";

export default function OrganigrammeTab({ currentIfsiName, orgRoles, allIfsiMembers, getRoleColor, handleAddOrgRole, handleAddManualUser, handleUpdateUserRoles, t }) {
  const [editingPersonId, setEditingPersonId] = useState(null);
  const [tempRoles, setTempRoles] = useState([]);

  // Sécurisation
  const safeMembers = allIfsiMembers.map(m => ({
    ...m, prenom: m.prenom || "Membre", nom: m.nom || "", roles: m.roles || []
  }));

  const editingPerson = safeMembers.find(m => m.id === editingPersonId);
  const unassigned = safeMembers.filter(m => m.roles.length === 0);

  // Hiérarchie
  const getRoleLevel = (role) => {
    const rLower = role.toLowerCase();
    if (rLower.includes("direction") || rLower.includes("directeur")) return 1;
    if (rLower.includes("qualité") || rLower.includes("coordinat") || rLower.includes("stage")) return 2;
    return 3;
  };

  const level1Roles = orgRoles.filter(r => getRoleLevel(r) === 1);
  const level2Roles = orgRoles.filter(r => getRoleLevel(r) === 2);
  const level3Roles = orgRoles.filter(r => getRoleLevel(r) === 3);

  if (level1Roles.length === 0 && orgRoles.length > 0) {
    level1Roles.push(orgRoles[0]);
    const idx = level3Roles.indexOf(orgRoles[0]);
    if (idx > -1) level3Roles.splice(idx, 1);
  }

  // --- LOGIQUE GLISSER / DÉPOSER ---
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
    
    // Si la personne n'a pas déjà ce rôle, on l'ajoute
    if (!currentRoles.includes(targetRole)) {
      handleUpdateUserRoles(memberId, memberType, [...currentRoles, targetRole]);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  // --- LOGIQUE DU PANNEAU LATÉRAL ---
  const openPanel = (m) => {
    setEditingPersonId(m.id);
    setTempRoles(m.roles || []);
  };

  const toggleTempRole = (r) => {
    setTempRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  const saveRoles = async () => {
    if (editingPerson) {
      await handleUpdateUserRoles(editingPerson.id, editingPerson.type, tempRoles);
      setEditingPersonId(null);
    }
  };


  const renderRoleNode = (role) => {
    const roleMembers = safeMembers.filter(m => m.roles.includes(role));
    const rc = getRoleColor(role);

    return (
      <div key={role} style={{ display:"flex", flexDirection:"column", alignItems:"center", margin:"0 12px" }}>
        
        {/* Le bloc entier prend les couleurs du rôle et devient la zone de "Drop" */}
        <div 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropOnRole(e, role)}
          style={{ background:rc.bg, border:`1px solid ${rc.bd}`, borderRadius:"12px", width:"260px", boxShadow:t.shadowSm, overflow:"hidden", zIndex:2, position:"relative" }}
        >
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${rc.bd}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:"13px", fontWeight:"800", color:rc.text, textTransform:"uppercase", letterSpacing:"0.5px" }}>{role}</span>
            <span style={{ background:"white", fontSize:"11px", fontWeight:"800", color:rc.text, padding:"3px 10px", borderRadius:"12px", border:`1px solid ${rc.bd}`, boxShadow:"0 2px 4px rgba(0,0,0,0.05)" }}>
              {roleMembers.length}
            </span>
          </div>
          
          <div style={{ padding:"12px", display:"flex", flexDirection:"column", gap:"8px" }}>
            {roleMembers.map(m => (
              <div 
                key={m.id} 
                draggable 
                onDragStart={(e) => handleDragStart(e, m)}
                onClick={() => openPanel(m)} 
                style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"8px", padding:"10px 12px", cursor:"grab", transition:"all 0.2s", display:"flex", alignItems:"center", gap:"12px", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }} 
                onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"} 
                onMouseOut={e=>e.currentTarget.style.transform="translateY(0)"}
              >
                <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:t.surface3, color:t.text, border:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"800", flexShrink:0 }}>
                  {m.prenom.charAt(0)}{m.nom ? m.nom.charAt(0) : ""}
                </div>
                <div style={{ overflow:"hidden" }}>
                  <div style={{ fontSize:"13px", fontWeight:"700", color:t.text, whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{m.prenom} {m.nom}</div>
                </div>
              </div>
            ))}
            {roleMembers.length === 0 && (
              <div style={{ padding:"24px", textAlign:"center", fontSize:"12px", color:rc.text, fontStyle:"italic", opacity:0.7, border:`1px dashed ${rc.bd}`, borderRadius:"8px" }}>
                Glissez un membre ici
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display:"flex", gap:"24px", height:"100%" }}>
      
      {/* ── ZONE GAUCHE : L'Arbre Hiérarchique ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"20px", overflow:"hidden" }}>
        
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"20px 24px", boxShadow:t.shadowSm, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"26px", color:t.text, margin:"0 0 4px 0" }}>Équipe & Rôles</h2>
            <div style={{ fontSize:"13px", color:t.text2 }}>Cartographie modulaire. Glissez un utilisateur dans un rôle pour l'assigner.</div>
          </div>
          <div style={{ display:"flex", gap:"12px" }}>
            <button onClick={() => { const p = prompt("Prénom :"); const n = prompt("Nom :"); if(p&&n) handleAddManualUser(p,n); }} style={{ background:t.surface2, border:`1px solid ${t.border}`, color:t.text, padding:"10px 16px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm }}>
              👤 Créer un collaborateur
            </button>
            <button onClick={() => { const r = prompt("Nom du nouveau rôle :"); if(r) handleAddOrgRole(r); }} style={{ background:t.accentBg, border:`1px solid ${t.accentBd}`, color:t.accent, padding:"10px 16px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm }}>
              + Ajouter un rôle
            </button>
          </div>
        </div>

        <div style={{ flex:1, overflow:"auto", padding:"40px 20px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", display:"flex", flexDirection:"column", alignItems:"center", position:"relative" }}>
          
          {level1Roles.length > 0 && (
            <div style={{ display:"flex", justifyContent:"center", marginBottom:"60px", position:"relative" }}>
              {level1Roles.map(r => renderRoleNode(r))}
              {(level2Roles.length > 0 || level3Roles.length > 0) && (
                <div style={{ position:"absolute", bottom:"-60px", left:"50%", width:"2px", height:"60px", background:t.border }}/>
              )}
            </div>
          )}

          {level2Roles.length > 0 && (
            <div style={{ display:"flex", justifyContent:"center", marginBottom:"60px", position:"relative" }}>
              {level2Roles.length > 1 && (
                <div style={{ position:"absolute", top:"-30px", left:"20%", right:"20%", height:"2px", background:t.border }}/>
              )}
              {level2Roles.map((r) => (
                <div key={r} style={{ position:"relative" }}>
                  <div style={{ position:"absolute", top:"-30px", left:"50%", width:"2px", height:"30px", background:t.border }}/>
                  {renderRoleNode(r)}
                  {level3Roles.length > 0 && <div style={{ position:"absolute", bottom:"-60px", left:"50%", width:"2px", height:"60px", background:t.border }}/>}
                </div>
              ))}
            </div>
          )}

          {level3Roles.length > 0 && (
            <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap", gap:"20px", position:"relative" }}>
              {level3Roles.length > 1 && (
                <div style={{ position:"absolute", top:"-30px", left:"10%", right:"10%", height:"2px", background:t.border }}/>
              )}
              {level3Roles.map(r => (
                <div key={r} style={{ position:"relative" }}>
                  <div style={{ position:"absolute", top:"-30px", left:"50%", width:"2px", height:"30px", background:t.border }}/>
                  {renderRoleNode(r)}
                </div>
              ))}
            </div>
          )}

          {/* Non Assignés flottants */}
          {unassigned.length > 0 && (
            <div style={{ marginTop:"60px", padding:"24px", border:`1px dashed ${t.border}`, borderRadius:"12px", background:t.surface2, width:"100%", maxWidth:"800px" }}>
              <div style={{ fontSize:"13px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"16px", textAlign:"center" }}>Personnel non assigné (Prenez et Glissez)</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"12px", justifyContent:"center" }}>
                {unassigned.map(m => (
                  <div 
                    key={m.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, m)}
                    onClick={() => openPanel(m)} 
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

      {/* ── ZONE DROITE : Détail & Gestion des Rôles (Panneau de validation) ── */}
      {editingPerson && (
        <div className="animate-fade-in" style={{ width:"360px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", display:"flex", flexDirection:"column", boxShadow:t.shadowSm, flexShrink:0, overflow:"hidden" }}>
          <div style={{ padding:"24px 20px", borderBottom:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", background:t.surface2 }}>
            <div style={{ display:"flex", gap:"16px", alignItems:"center" }}>
              <div style={{ width:"56px", height:"56px", borderRadius:"12px", background:t.accentBg, border:`1px solid ${t.accentBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px", fontWeight:"800", color:t.accent }}>
                {editingPerson.prenom.charAt(0)}{editingPerson.nom ? editingPerson.nom.charAt(0) : ""}
              </div>
              <div>
                <div style={{ fontSize:"18px", fontWeight:"800", color:t.text }}>{editingPerson.prenom} {editingPerson.nom}</div>
                <div style={{ fontSize:"12px", color:t.text2, marginTop:"4px" }}>{editingPerson.type === 'account' ? 'Compte Utilisateur' : 'Profil Manuel'}</div>
              </div>
            </div>
            <button onClick={() => setEditingPersonId(null)} style={{ background:"transparent", border:"none", color:t.text3, fontSize:"18px", cursor:"pointer" }}>✕</button>
          </div>

          <div style={{ padding:"24px 20px", flex:1, overflowY:"auto" }}>
            
            <div style={{ fontSize:"11px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>Affectation des rôles</div>
            
            {/* Liste de cases à cocher */}
            <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"24px" }}>
              {orgRoles.map(r => {
                const hasRole = tempRoles.includes(r);
                const rc = getRoleColor(r);
                return (
                  <label key={r} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 14px", background:hasRole?rc.bg:t.surface2, border:`1px solid ${hasRole?rc.bd:t.border}`, borderRadius:"8px", cursor:"pointer", transition:"all 0.2s" }}>
                    <input type="checkbox" checked={hasRole} onChange={() => toggleTempRole(r)} style={{ width:"18px", height:"18px", accentColor:rc.text }} />
                    <span style={{ fontSize:"13px", color:hasRole?rc.text:t.text, fontWeight:hasRole?"700":"500" }}>{r}</span>
                  </label>
                )
              })}
            </div>

            {/* Bouton de validation du menu */}
            <button onClick={saveRoles} style={{ width:"100%", background:t.accent, color:"white", border:"none", padding:"14px", borderRadius:"8px", fontSize:"14px", fontWeight:"700", cursor:"pointer", boxShadow:`0 4px 12px ${t.accentBd}`, marginBottom:"32px" }}>
              💾 Enregistrer les rôles
            </button>

            <div style={{ fontSize:"11px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>Missions & Indicateurs</div>
            <div style={{ background:t.surface2, border:`1px dashed ${t.border}`, borderRadius:"8px", padding:"24px", textAlign:"center", color:t.text2, fontSize:"13px", lineHeight:"1.5" }}>
              Cette personne n'est responsable d'aucun indicateur en souffrance.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
