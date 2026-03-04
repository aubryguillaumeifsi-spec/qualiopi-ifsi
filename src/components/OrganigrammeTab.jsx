import React from "react";

export default function OrganigrammeTab({
  currentIfsiName, orgRoles, allIfsiMembers, getRoleColor,
  handleDragOverOrg, handleDropOrg, handleDragStartOrg, removeRoleFromUser,
  editOrgRole, editManualUser, deleteManualUser, addManualUser,
  addOrgRole, newManualUserInput, setNewManualUserInput, newRoleInput,
  setNewRoleInput, deleteOrgRole, applyDefaultRoles
}) {
  
  const unassigned = allIfsiMembers.filter(m => !m.roles || m.roles.length === 0);

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
            <input type="text" placeholder="Ex: Jean Dupont" value={newManualUserInput} onChange={e => setNewManualUserInput(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }} />
            <button onClick={addManualUser} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "0 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", color: "#334155" }}>Ajouter</button>
          </div>
        </div>

        {/* Boîte 2 : Ajouter une colonne */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#1e3a5f" }}>🗂️ Créer une nouvelle colonne</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <input type="text" placeholder="Ex: Informatique" value={newRoleInput} onChange={e => setNewRoleInput(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }} />
            <button onClick={addOrgRole} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "0 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", color: "#334155" }}>Ajouter</button>
          </div>
        </div>

      </div>

      {/* 🟠 LA RÉSERVE (Pleine largeur) */}
      <div style={{ background: "#f8fafc", border: "2px dashed #cbd5e1", borderRadius: "16px", padding: "20px", marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#64748b", display: "flex", alignItems: "center", gap: "8px" }}><span>👥</span> Réserve (Membres sans rôle)</h3>
        {unassigned.length === 0 ? (
          <div style={{ textAlign: "center", color: "#9ca3af", fontStyle: "italic", fontSize: "14px", marginTop: "10px" }}>Tous les membres ont un rôle ! 🎉</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {unassigned.map(u => (
              <div key={u.id} draggable onDragStart={(e) => handleDragStartOrg(e, u.type, u.id)} className="org-card" style={{ display: "inline-flex", flexDirection: "row", alignItems: "center", gap: "8px", width: "auto", margin: 0, padding: "6px 12px", background: "white", cursor: "grab" }}>
                <span style={{ color: "#9ca3af" }}>⋮⋮</span>
                <span style={{ fontWeight: "700", color: "#1e3a5f" }}>{u.name}</span>
                {u.type === "manual" && (
                  <div style={{ display: "flex", gap: "4px", marginLeft: "4px" }}>
                    <button onClick={() => editManualUser(u.id, u.name)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", opacity: 0.6 }} title="Renommer">✏️</button>
                    <button onClick={() => deleteManualUser(u.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", opacity: 0.6 }} title="Supprimer">🗑️</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔵 TABLEAU KANBAN (Retour au Wrap !) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", paddingBottom: "20px", alignItems: "flex-start" }}>
        {orgRoles.map(role => {
          const membersInRole = allIfsiMembers.filter(m => m.roles.includes(role));
          const colorCfg = getRoleColor(role);

          return (
            <div 
              key={role} 
              onDragOver={handleDragOverOrg} 
              onDrop={(e) => handleDropOrg(e, role)} 
              // Le flex: "1 1 280px" est la clé magique pour que ça s'adapte et s'empile !
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
                  <div key={u.id} draggable onDragStart={(e) => handleDragStartOrg(e, u.type, u.id)} className="org-card" style={{ position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ color: "#cbd5e1", cursor: "grab" }}>⋮⋮</span>
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
