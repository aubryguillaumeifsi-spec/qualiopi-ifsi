import React from "react";

export default function OrganigrammeTab({
  currentIfsiName, orgRoles, allIfsiMembers, getRoleColor,
  handleDragOverOrg, handleDropOrg, handleDragStartOrg, removeRoleFromUser,
  editOrgRole, editManualUser, deleteManualUser, addManualUser,
  addOrgRole, newManualUser, setNewManualUser, newRoleInput,
  setNewRoleInput, deleteOrgRole, applyDefaultRoles
}) {
  
  return (
    <div className="animate-fade-in">
      
      {/* 🟢 EN-TÊTE */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "900", color: "#1e3a5f", margin: "0 0 4px" }}>🌳 Organigramme</h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>Gérez l'équipe de <strong style={{ color: "#1d4ed8" }}>{currentIfsiName}</strong> par glisser-déposer.</p>
        </div>
        <button onClick={applyDefaultRoles} style={{ background: "white", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", color: "#475569", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", display: "flex", gap: "8px", alignItems: "center" }}>
          <span>🔄</span> Restaurer les colonnes par défaut
        </button>
      </div>

      {/* 🟡 FORMULAIRES SÉPARÉS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "20px" }}>
        
        {/* Boîte 1 : Ajouter une personne */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#1e3a5f" }}>👤 Créer un collaborateur manuel</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <input type="text" placeholder="Prénom" value={newManualUser.prenom} onChange={e => setNewManualUser({...newManualUser, prenom: e.target.value})} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }} />
            <input type="text" placeholder="NOM" value={newManualUser.nom} onChange={e => setNewManualUser({...newManualUser, nom: e.target.value})} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", textTransform: "uppercase" }} />
            <button onClick={addManualUser} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "0 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", color: "#334155" }}>Ajouter</button>
          </div>
        </div>

        {/* Boîte 2 : Ajouter une colonne */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#1e3a5f" }}>🗂️ Créer une nouvelle mission / colonne</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <input type="text" placeholder="Ex: Informatique" value={newRoleInput} onChange={e => setNewRoleInput(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }} />
            <button onClick={addOrgRole} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "0 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", color: "#334155" }}>Ajouter</button>
          </div>
        </div>

      </div>

      {/* 🟠 EFFECTIFS DE L'AUDIT (Le "Hub" Central) */}
      <div style={{ background: "#f8fafc", border: "2px dashed #cbd5e1", borderRadius: "16px", padding: "20px", marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#64748b", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>👥</span> Liste des effectifs (Glissez vers les colonnes pour attribuer une mission)
        </h3>
        
        {allIfsiMembers.length === 0 ? (
          <div style={{ textAlign: "center", color: "#9ca3af", fontStyle: "italic", fontSize: "14px", marginTop: "10px" }}>Aucun membre dans l'équipe.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            {allIfsiMembers.map(u => (
              <div key={u.id} draggable onDragStart={(e) => handleDragStartOrg(e, u.type, u.id)} className="org-card" style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px 14px", background: "white", cursor: "grab", minWidth: "180px", flex: "1 1 auto", maxWidth: "300px" }}>
                
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#9ca3af" }}>⋮⋮</span>
                    <span style={{ fontWeight: "800", color: "#1e3a5f", fontSize: "14px" }}>{u.name}</span>
                  </div>
                  {u.type === "manual" && (
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => editManualUser(u.id, u.name)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", opacity: 0.5 }} title="Renommer">✏️</button>
                      <button onClick={() => deleteManualUser(u.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", opacity: 0.5 }} title="Supprimer">🗑️</button>
                    </div>
                  )}
                </div>

                {/* Badges des rôles actuels */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {u.roles && u.roles.length > 0 ? (
                    u.roles.map(r => {
                      const rCol = getRoleColor(r);
                      return <span key={r} style={{ fontSize: "10px", background: rCol.bg, color: rCol.text, padding: "2px 6px", borderRadius: "4px", border: `1px solid ${rCol.border}`, whiteSpace: "nowrap" }}>{r}</span>
                    })
                  ) : (
                    <span style={{ fontSize: "10px", color: "#9ca3af", fontStyle: "italic", padding: "2px 0" }}>Aucune mission</span>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔵 TABLEAU KANBAN (Les Colonnes) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", paddingBottom: "20px", alignItems: "flex-start" }}>
        {orgRoles.map(role => {
          const membersInRole = allIfsiMembers.filter(m => m.roles.includes(role));
          const colorCfg = getRoleColor(role);

          return (
            <div 
              key={role} 
              onDragOver={handleDragOverOrg} 
              onDrop={(e) => handleDropOrg(e, role)} 
              style={{ background: "#f1f5f9", borderRadius: "16px", flex: "1 1 280px", minWidth: "280px", maxWidth: "100%", display: "flex", flexDirection: "column", border: "1px solid #e2e8f0", overflow: "hidden" }}
            >
              <div style={{ background: colorCfg.bg, borderBottom: `2px solid ${colorCfg.border}`, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: "800", color: colorCfg.text, fontSize: "15px" }}>{role}</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => editOrgRole(role)} style={{ background: "white", border: `1px solid ${colorCfg.border}`, borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px", color: colorCfg.text }} title="Renommer">✏️</button>
                  <button onClick={() => deleteOrgRole(role)} style={{ background: "white", border: `1px solid ${colorCfg.border}`, borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px", color: "#ef4444" }} title="Supprimer">🗑️</button>
                </div>
              </div>

              <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "12px", minHeight: "80px" }}>
                {membersInRole.map(u => (
                  <div key={u.id} className="org-card" style={{ position: "relative", cursor: "default" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "800", color: "#1e3a5f", fontSize: "14px" }}>{u.name}</span>
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", background: u.type==="account" ? "#dcfce7" : "#f1f5f9", color: u.type==="account" ? "#166534" : "#64748b", padding: "4px 8px", borderRadius: "6px" }}>
                        {u.type === "account" ? "👤 Compte" : "📝 Manuel"}
                      </span>
                      <button onClick={() => removeRoleFromUser(u.type, u.id, role)} style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#ef4444", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", padding: "4px 8px", cursor: "pointer" }} title={`Retirer de ${role}`}>
                        Retirer
                      </button>
                    </div>
                  </div>
                ))}
                
                {membersInRole.length === 0 && (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed #cbd5e1", borderRadius: "10px", color: "#9ca3af", fontSize: "13px", fontWeight: "600", minHeight: "60px" }}>
                    Glissez ici
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
