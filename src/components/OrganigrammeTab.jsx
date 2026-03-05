import React, { useState } from "react";

export default function OrganigrammeTab({ currentIfsiName, orgRoles, allIfsiMembers, getRoleColor, t }) {
  const [selectedPerson, setSelectedPerson] = useState(null);

  // Sécurisation des données
  const safeMembers = allIfsiMembers.map(m => ({
    ...m,
    prenom: m.prenom || "Membre",
    nom: m.nom || "",
    roles: m.roles || []
  }));

  const unassigned = safeMembers.filter(m => m.roles.length === 0);

  // Construction d'une hiérarchie basique pour l'arbre visuel
  // 1. Direction au sommet
  // 2. Qualité / Pôle Stages au milieu
  // 3. Formateurs et autres en bas
  const getRoleLevel = (role) => {
    const rLower = role.toLowerCase();
    if (rLower.includes("direction") || rLower.includes("directeur")) return 1;
    if (rLower.includes("qualité") || rLower.includes("coordinat") || rLower.includes("stage")) return 2;
    return 3;
  };

  const level1Roles = orgRoles.filter(r => getRoleLevel(r) === 1);
  const level2Roles = orgRoles.filter(r => getRoleLevel(r) === 2);
  const level3Roles = orgRoles.filter(r => getRoleLevel(r) === 3);

  // Fallback si la répartition ne donne rien au niveau 1
  if (level1Roles.length === 0 && orgRoles.length > 0) {
    level1Roles.push(orgRoles[0]);
    const idx = level3Roles.indexOf(orgRoles[0]);
    if (idx > -1) level3Roles.splice(idx, 1);
  }

  const renderRoleNode = (role) => {
    const roleMembers = safeMembers.filter(m => m.roles.includes(role));
    const rc = getRoleColor(role);

    return (
      <div key={role} style={{ display:"flex", flexDirection:"column", alignItems:"center", margin:"0 10px" }}>
        <div style={{ background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"12px", width:"240px", boxShadow:t.shadowSm, overflow:"hidden", zIndex:2, position:"relative" }}>
          <div style={{ padding:"10px 14px", borderBottom:`2px solid ${rc.bg}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:t.surface }}>
            <span style={{ fontSize:"12px", fontWeight:"800", color:t.text, textTransform:"uppercase", letterSpacing:"0.5px" }}>{role}</span>
            <span style={{ background:t.surface3, fontSize:"10px", fontWeight:"800", color:t.text2, padding:"2px 8px", borderRadius:"12px" }}>{roleMembers.length}</span>
          </div>
          
          <div style={{ padding:"10px", display:"flex", flexDirection:"column", gap:"8px", background:t.surface2 }}>
            {roleMembers.map(m => (
              <div key={m.id} onClick={() => setSelectedPerson(m)} style={{ background:t.surface, border:`1px solid ${selectedPerson?.id === m.id ? t.accent : t.border}`, borderRadius:"8px", padding:"10px", cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", gap:"10px" }} onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e=>e.currentTarget.style.transform="translateY(0)"}>
                <div style={{ width:"28px", height:"28px", borderRadius:"6px", background:rc.bg, color:rc.text, border:`1px solid ${rc.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:"800", flexShrink:0 }}>
                  {m.prenom.charAt(0)}{m.nom ? m.nom.charAt(0) : ""}
                </div>
                <div style={{ overflow:"hidden" }}>
                  <div style={{ fontSize:"12px", fontWeight:"700", color:t.text, whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{m.prenom} {m.nom}</div>
                </div>
              </div>
            ))}
            {roleMembers.length === 0 && (
              <div style={{ padding:"10px", textAlign:"center", fontSize:"11px", color:t.text3, fontStyle:"italic" }}>Aucun membre</div>
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
            <div style={{ fontSize:"13px", color:t.text2 }}>Cartographie des responsabilités Qualiopi pour {currentIfsiName}.</div>
          </div>
          <div style={{ display:"flex", gap:"10px" }}>
            <button style={{ background:t.surface2, border:`1px solid ${t.border}`, color:t.text, padding:"8px 16px", borderRadius:"8px", fontSize:"12px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm }}>
              + Ajouter un rôle
            </button>
          </div>
        </div>

        {/* Conteneur de l'Arbre Visuel */}
        <div style={{ flex:1, overflow:"auto", padding:"20px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", display:"flex", flexDirection:"column", alignItems:"center", position:"relative" }}>
          
          {/* Niveau 1 : Direction */}
          {level1Roles.length > 0 && (
            <div style={{ display:"flex", justifyContent:"center", marginBottom:"40px", position:"relative" }}>
              {level1Roles.map(r => renderRoleNode(r))}
              {/* Ligne verticale descendante */}
              {(level2Roles.length > 0 || level3Roles.length > 0) && (
                <div style={{ position:"absolute", bottom:"-40px", left:"50%", width:"2px", height:"40px", background:t.border }}/>
              )}
            </div>
          )}

          {/* Niveau 2 : Qualité / Pôle Stages */}
          {level2Roles.length > 0 && (
            <div style={{ display:"flex", justifyContent:"center", marginBottom:"40px", position:"relative" }}>
              {/* Ligne horizontale de connexion si plusieurs éléments */}
              {level2Roles.length > 1 && (
                <div style={{ position:"absolute", top:"-20px", left:"20%", right:"20%", height:"2px", background:t.border }}/>
              )}
              {level2Roles.map((r, i) => (
                <div key={r} style={{ position:"relative" }}>
                  {/* Ligne verticale montante */}
                  <div style={{ position:"absolute", top:"-20px", left:"50%", width:"2px", height:"20px", background:t.border }}/>
                  {renderRoleNode(r)}
                  {/* Ligne verticale descendante si niveau 3 existe */}
                  {level3Roles.length > 0 && <div style={{ position:"absolute", bottom:"-40px", left:"50%", width:"2px", height:"40px", background:t.border }}/>}
                </div>
              ))}
            </div>
          )}

          {/* Niveau 3 : Formateurs / Opérationnels */}
          {level3Roles.length > 0 && (
            <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap", gap:"20px", position:"relative" }}>
              {/* Ligne horizontale */}
              {level3Roles.length > 1 && (
                <div style={{ position:"absolute", top:"-20px", left:"10%", right:"10%", height:"2px", background:t.border }}/>
              )}
              {level3Roles.map(r => (
                <div key={r} style={{ position:"relative" }}>
                  <div style={{ position:"absolute", top:"-20px", left:"50%", width:"2px", height:"20px", background:t.border }}/>
                  {renderRoleNode(r)}
                </div>
              ))}
            </div>
          )}

          {/* Non Assignés flottants */}
          {unassigned.length > 0 && (
            <div style={{ marginTop:"60px", padding:"20px", border:`1px dashed ${t.border}`, borderRadius:"12px", background:t.surface2, width:"100%", maxWidth:"800px" }}>
              <div style={{ fontSize:"12px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"16px", textAlign:"center" }}>Personnel non assigné</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"12px", justifyContent:"center" }}>
                {unassigned.map(m => (
                  <div key={m.id} onClick={() => setSelectedPerson(m)} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"8px", padding:"8px 12px", display:"flex", alignItems:"center", gap:"10px", cursor:"pointer", boxShadow:t.shadowSm }}>
                    <div style={{ width:"24px", height:"24px", borderRadius:"6px", background:t.surface3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:"800", color:t.text3 }}>
                      {m.prenom.charAt(0)}{m.nom ? m.nom.charAt(0) : ""}
                    </div>
                    <div style={{ fontSize:"12px", fontWeight:"600", color:t.text2 }}>{m.prenom} {m.nom}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ZONE DROITE : Détail de la personne (Panneau latéral) ── */}
      {selectedPerson && (
        <div className="animate-fade-in" style={{ width:"320px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", display:"flex", flexDirection:"column", boxShadow:t.shadowSm, flexShrink:0, overflow:"hidden" }}>
          <div style={{ padding:"20px", borderBottom:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", background:t.surface2 }}>
            <div style={{ display:"flex", gap:"12px", alignItems:"center" }}>
              <div style={{ width:"46px", height:"46px", borderRadius:"12px", background:t.accentBg, border:`1px solid ${t.accentBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", fontWeight:"800", color:t.accent }}>
                {selectedPerson.prenom.charAt(0)}{selectedPerson.nom ? selectedPerson.nom.charAt(0) : ""}
              </div>
              <div>
                <div style={{ fontSize:"16px", fontWeight:"800", color:t.text }}>{selectedPerson.prenom} {selectedPerson.nom}</div>
                <div style={{ fontSize:"11px", color:t.text2, marginTop:"2px" }}>{selectedPerson.type === 'account' ? 'Compte Utilisateur' : 'Profil Manuel'}</div>
              </div>
            </div>
            <button onClick={() => setSelectedPerson(null)} style={{ background:"transparent", border:"none", color:t.text3, fontSize:"16px", cursor:"pointer" }}>✕</button>
          </div>

          <div style={{ padding:"20px", flex:1, overflowY:"auto" }}>
            <div style={{ fontSize:"10px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>Rôles attribués</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginBottom:"24px" }}>
              {selectedPerson.roles.length === 0 ? (
                <span style={{ fontSize:"12px", color:t.text3, fontStyle:"italic" }}>Aucun rôle assigné</span>
              ) : (
                selectedPerson.roles.map(r => {
                  const rc = getRoleColor(r);
                  return (
                    <span key={r} style={{ background:rc.bg, color:rc.text, border:`1px solid ${rc.border}`, fontSize:"11px", fontWeight:"700", padding:"4px 10px", borderRadius:"6px" }}>
                      {r}
                    </span>
                  );
                })
              )}
            </div>

            <div style={{ fontSize:"10px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>Missions & Indicateurs</div>
            <div style={{ background:t.surface2, border:`1px dashed ${t.border}`, borderRadius:"8px", padding:"20px", textAlign:"center", color:t.text2, fontSize:"12px" }}>
              Aucun indicateur spécifique ne nécessite une attention immédiate pour ce membre.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
