import React, { useState } from "react";

export default function OrganigrammeTab({ currentIfsiName, orgRoles, allIfsiMembers, getRoleColor, t }) {
  const [selectedPerson, setSelectedPerson] = useState(null);

  // Sécurité absolue : on s'assure que les membres ont bien un prénom/nom valide pour ne pas crasher
  const safeMembers = allIfsiMembers.map(m => ({
    ...m,
    prenom: m.prenom || "Membre",
    nom: m.nom || "",
    roles: m.roles || []
  }));

  const unassigned = safeMembers.filter(m => m.roles.length === 0);

  return (
    <div className="animate-fade-in" style={{ display:"flex", gap:"24px", height:"100%" }}>
      <style>{`
        .person-card { transition:all 0.2s; cursor:pointer; }
        .person-card:hover { transform:translateY(-2px); box-shadow:${t.shadowMd}!important; border-color:${t.accentBd}!important; }
      `}</style>

      {/* ZONE GAUCHE : L'Organigramme (Colonnes) */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"20px" }}>
        
        {/* En-tête Organigramme */}
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"20px 24px", boxShadow:t.shadowSm, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"24px", color:t.text, margin:"0 0 4px 0" }}>Équipe & Rôles</h2>
            <div style={{ fontSize:"13px", color:t.text2 }}>Cartographie des responsabilités Qualiopi pour {currentIfsiName}.</div>
          </div>
          <div style={{ display:"flex", gap:"10px" }}>
            <button style={{ background:t.surface2, border:`1px solid ${t.border}`, color:t.text, padding:"8px 16px", borderRadius:"8px", fontSize:"12px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm }}>
              + Ajouter un rôle
            </button>
          </div>
        </div>

        {/* Grille des Rôles (Colonnes) */}
        <div style={{ display:"flex", gap:"16px", overflowX:"auto", paddingBottom:"10px" }}>
          
          {orgRoles.map(role => {
            const roleMembers = safeMembers.filter(m => m.roles.includes(role));
            const rc = getRoleColor(role);

            return (
              <div key={role} style={{ minWidth:"260px", background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"10px", display:"flex", flexDirection:"column", maxHeight:"600px" }}>
                <div style={{ padding:"14px", borderBottom:`2px solid ${rc.bg}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:"13px", fontWeight:"800", color:t.text }}>{role}</span>
                  <span style={{ background:t.surface, border:`1px solid ${t.border}`, fontSize:"10px", fontWeight:"700", color:t.text2, padding:"2px 8px", borderRadius:"12px" }}>
                    {roleMembers.length}
                  </span>
                </div>
                
                <div style={{ padding:"12px", display:"flex", flexDirection:"column", gap:"10px", overflowY:"auto", flex:1 }}>
                  {roleMembers.map(m => (
                    <div key={m.id} onClick={() => setSelectedPerson(m)} className="person-card" style={{ background:t.surface, border:`1px solid ${selectedPerson?.id === m.id ? t.accent : t.border}`, borderRadius:"8px", padding:"12px", boxShadow:t.shadowSm, display:"flex", alignItems:"center", gap:"12px" }}>
                      <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:t.surface3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"800", color:t.text }}>
                        {m.prenom.charAt(0)}{m.nom ? m.nom.charAt(0) : ""}
                      </div>
                      <div style={{ overflow:"hidden" }}>
                        <div style={{ fontSize:"13px", fontWeight:"700", color:t.text, whiteSpace:"nowrap", textOverflow:"ellipsis", overflow:"hidden" }}>
                          {m.prenom} {m.nom}
                        </div>
                        <div style={{ fontSize:"10px", color:t.text3, marginTop:"2px" }}>Cliquez pour voir les missions</div>
                      </div>
                    </div>
                  ))}
                  {roleMembers.length === 0 && (
                    <div style={{ padding:"20px", textAlign:"center", fontSize:"11px", color:t.text3, fontStyle:"italic", border:`1px dashed ${t.border2}`, borderRadius:"6px" }}>
                      Glissez un membre ici
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Colonne "Non assignés" */}
          {unassigned.length > 0 && (
            <div style={{ minWidth:"260px", background:t.surface2, border:`1px dashed ${t.border}`, borderRadius:"10px", display:"flex", flexDirection:"column", opacity:0.8 }}>
              <div style={{ padding:"14px", borderBottom:`1px dashed ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:"13px", fontWeight:"800", color:t.text3 }}>Sans rôle défini</span>
                <span style={{ background:t.surface, border:`1px solid ${t.border}`, fontSize:"10px", fontWeight:"700", color:t.text2, padding:"2px 8px", borderRadius:"12px" }}>{unassigned.length}</span>
              </div>
              <div style={{ padding:"12px", display:"flex", flexDirection:"column", gap:"10px", overflowY:"auto", flex:1 }}>
                {unassigned.map(m => (
                  <div key={m.id} onClick={() => setSelectedPerson(m)} className="person-card" style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"8px", padding:"12px", display:"flex", alignItems:"center", gap:"12px" }}>
                    <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:t.surface3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"800", color:t.text3 }}>
                      {m.prenom.charAt(0)}{m.nom ? m.nom.charAt(0) : ""}
                    </div>
                    <div style={{ overflow:"hidden" }}>
                      <div style={{ fontSize:"13px", fontWeight:"600", color:t.text2, whiteSpace:"nowrap", textOverflow:"ellipsis", overflow:"hidden" }}>{m.prenom} {m.nom}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ZONE DROITE : Détail de la personne (Panneau latéral) */}
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
                <span style={{ fontSize:"12px", color:t.text3, fontStyle:"italic" }}>Aucun rôle</span>
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
              Le suivi individuel des indicateurs sera affiché ici.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
