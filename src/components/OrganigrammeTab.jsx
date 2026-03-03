import React from "react";

export default function OrganigrammeTab({
  currentIfsiName, orgRoles, applyDefaultRoles, handleDragOverOrg, handleDropOrg,
  deleteOrgRole, allIfsiMembers, handleDragStartOrg, editManualUser, deleteManualUser,
  getRoleColor, newManualUserInput, setNewManualUserInput, addManualUser,
  removeRoleFromUser, editOrgRole, newRoleInput, setNewRoleInput, addOrgRole
}) {
  const inp = { background: "white", border: "1px solid #d1d5db", borderRadius: "8px", outline: "none", boxSizing: "border-box", fontFamily: "Outfit, sans-serif" };

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>🌳 Organigramme & Rôles ({currentIfsiName})</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Glissez le personnel dans les colonnes. Une personne peut avoir une double casquette.</p>
      </div>

      {orgRoles.length === 0 && (
        <button onClick={applyDefaultRoles} style={{ marginBottom: "20px", background: "#10b981", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}>✨ Générer les rôles standards (Direction, Qualité...)</button>
      )}

      {orgRoles.includes("Direction") && (
        <div style={{ background: "#1e3a5f", borderRadius: "12px", padding: "16px", marginBottom: "24px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }} onDragOver={handleDragOverOrg} onDrop={(e) => handleDropOrg(e, "Direction")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #334155", paddingBottom: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: "800", color: "white", textTransform: "uppercase" }}>👑 Direction de l'Institut</span>
            <button onClick={() => deleteOrgRole("Direction")} style={{ background:"transparent", border:"1px solid #475569", color: "#94a3b8", borderRadius:"6px", cursor:"pointer", padding:"2px 6px", fontSize:"10px" }}>Supprimer</button>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", minHeight: "45px" }}>
            {allIfsiMembers.filter(m => m.roles.includes("Direction")).map(m => (
              <div key={m.id} style={{ background: "white", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: "700", color: "#1e3a5f" }}>
                <span>{m.type==="account"?"👤":"👻"} {m.name}</span>
                <button onClick={() => removeRoleFromUser(m.type, m.id, "Direction")} style={{ border: "none", background: "#fef2f2", color: "#ef4444", borderRadius: "50%", width: "18px", height: "18px", cursor: "pointer" }}>×</button>
              </div>
            ))}
            {allIfsiMembers.filter(m => m.roles.includes("Direction")).length === 0 && <span style={{ color: "#64748b", fontSize: "12px", fontStyle: "italic", alignSelf: "center" }}>Glissez le directeur / la directrice ici.</span>}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", paddingBottom: "20px" }}>
        
        {/* VIVIER */}
        <div style={{ width: "280px", flexShrink: 0, background: "#f8fafc", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0", minHeight: "60vh" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "800", color: "#475569", marginBottom: "16px", textTransform: "uppercase", borderBottom: "2px solid #cbd5e1", paddingBottom: "8px" }}>👥 Équipe globale</h3>
          
          {allIfsiMembers.map(m => (
            <div key={m.id} className="org-card" draggable onDragStart={(e) => handleDragStartOrg(e, m.type, m.id)} style={{ borderLeft: m.roles.length===0 ? "4px solid #f59e0b" : "1px solid #d1d5db" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                 <span style={{ fontWeight: "700", color: "#1e3a5f" }}>{m.type==="account" ? "👤" : "👻"} {m.name}</span>
                 {m.type === "manual" && (
                   <div style={{ display: "flex", gap: "4px" }}>
                     <button onClick={() => editManualUser(m.id, m.name)} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", padding:"0 2px" }} title="Renommer">✏️</button>
                     <button onClick={() => deleteManualUser(m.id)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", padding:"0 2px" }} title="Supprimer">🗑️</button>
                   </div>
                 )}
              </div>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                 {m.roles.length === 0 && <span style={{ fontSize: "10px", color: "#d97706", background: "#fffbeb", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>À assigner</span>}
                 {m.roles.map(r => {
                    const col = getRoleColor(r);
                    return <span key={r} style={{ fontSize: "10px", background: col.bg, color: col.text, border: `1px solid ${col.border}`, padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>{r}</span>
                 })}
              </div>
            </div>
          ))}

          <div style={{ marginTop: "24px", background: "white", padding: "12px", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", display: "block", marginBottom: "6px" }}>+ AJOUTER MANUELLEMENT</label>
            <input type="text" value={newManualUserInput} onChange={e => setNewManualUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManualUser()} placeholder="Ex: Secrétariat..." style={{ ...inp, padding: "8px", fontSize: "12px", marginBottom: "8px", width: "100%" }} />
            <button onClick={addManualUser} disabled={!newManualUserInput.trim()} style={{ width: "100%", background: "#f59e0b", color: "white", border: "none", padding: "6px", borderRadius: "6px", fontWeight: "bold", cursor: newManualUserInput.trim() ? "pointer" : "not-allowed" }}>Créer l'entité</button>
          </div>
        </div>

        {/* COLONNES ROLES */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", flex: 1, alignContent: "flex-start" }}>
          {orgRoles.filter(r => r !== "Direction").map((role) => {
            const colConf = getRoleColor(role);
            const peopleInRole = allIfsiMembers.filter(m => m.roles.includes(role));

            return (
              <div key={role} style={{ width: "260px", background: "white", borderRadius: "12px", border: `2px solid ${colConf.border}`, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }} onDragOver={handleDragOverOrg} onDrop={(e) => handleDropOrg(e, role)}>
                <div style={{ background: colConf.bg, padding: "12px 16px", borderRadius: "10px 10px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${colConf.border}` }}>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: colConf.text, textTransform: "uppercase" }}>{role}</span>
                  <div>
                    <button onClick={() => editOrgRole(role)} style={{ background:"white", border:`1px solid ${colConf.border}`, color: colConf.text, borderRadius:"6px", cursor:"pointer", padding:"2px 6px", fontSize:"10px", fontWeight:"bold", marginRight: "4px" }} title="Renommer la colonne">✏️</button>
                    <button onClick={() => deleteOrgRole(role)} style={{ background:"white", border:`1px solid ${colConf.border}`, color: colConf.text, borderRadius:"6px", cursor:"pointer", padding:"2px 6px", fontSize:"10px", fontWeight:"bold" }}>X</button>
                  </div>
                </div>
                
                <div style={{ padding: "16px", minHeight: "150px" }}>
                  {peopleInRole.map(m => (
                    <div key={m.id} style={{ background: "white", border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: "8px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", fontWeight: "600", color: "#1e3a5f" }}>
                      <span>{m.type==="account"?"👤":"👻"} {m.name}</span>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        {m.type === "manual" && <button onClick={() => editManualUser(m.id, m.name)} style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: "12px" }} title="Renommer">✏️</button>}
                        <button onClick={() => removeRoleFromUser(m.type, m.id, role)} style={{ border: "none", background: "#fef2f2", color: "#ef4444", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px" }}>×</button>
                      </div>
                    </div>
                  ))}
                  {peopleInRole.length === 0 && <div style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic", textAlign: "center", marginTop: "20px" }}>Glissez une personne ici</div>}
                </div>
              </div>
            );
          })}

          <div style={{ width: "260px", background: "#f1f5f9", borderRadius: "12px", padding: "16px", border: "1px dashed #cbd5e1" }}>
            <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "12px" }}>+ NOUVEAU RÔLE / COLONNE</span>
            <input type="text" value={newRoleInput} onChange={e => setNewRoleInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOrgRole()} placeholder="Ex: Qualité..." style={{ ...inp, padding: "8px", fontSize: "12px", marginBottom: "8px", width: "100%" }} />
            <button onClick={addOrgRole} disabled={!newRoleInput.trim()} style={{ width: "100%", background: "#1d4ed8", color: "white", border: "none", padding: "8px", borderRadius: "6px", fontWeight: "bold", cursor: newRoleInput.trim() ? "pointer" : "not-allowed" }}>Créer la colonne</button>
          </div>
        </div>
      </div>
    </div>
  );
}
