import React from "react";

export function EquipeTab({ userProfile, newMember, setNewMember, isCreatingUser, handleCreateUser, selectedIfsi, ifsiList, teamSearchTerm, setTeamSearchTerm, sortedTeamUsers, teamSortConfig, handleSortTeam, handleDeleteUser, auth, handleSendResetEmail, isDarkMode }) {
  
  const bgCard = isDarkMode ? "#1e1f20" : "white";
  const bgMain = isDarkMode ? "#131314" : "#f8fafc";
  const textMain = isDarkMode ? "#e3e3e3" : "#1e3a5f";
  const textMuted = isDarkMode ? "#9aa0a6" : "#64748b";
  const borderCol = isDarkMode ? "#333537" : "#e2e8f0";

  const card = { background: bgCard, border: `1px solid ${borderCol}`, borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const input = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${borderCol}`, background: bgMain, color: textMain, fontSize: "13px", outline: "none", boxSizing: "border-box" };
  const btn = { width: "100%", padding: "10px", background: isDarkMode ? "#8ab4f8" : "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: isDarkMode ? "#131314" : "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" };
  const th = { textAlign: "left", padding: "12px 14px", fontSize: "12px", fontWeight: "700", color: textMuted, textTransform: "uppercase", borderBottom: `2px solid ${borderCol}`, cursor: "pointer", background: bgMain };
  const td = { padding: "12px 14px", fontSize: "13px", borderBottom: `1px solid ${borderCol}`, verticalAlign: "middle", color: textMain };

  return (
    <div className="animate-fade-in responsive-grid-2">
      {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
        <div style={card}>
          <h2 style={{ fontSize: "18px", fontWeight: "800", color: textMain, margin: "0 0 16px" }}>Ajouter un compte</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input type="email" placeholder="Adresse email (ex: agent@ifsi.fr)" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} style={input} />
            <input type="password" placeholder="Mot de passe provisoire (6 min.)" value={newMember.pwd} onChange={e => setNewMember({ ...newMember, pwd: e.target.value })} style={input} />
            <select value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })} style={input}>
              <option value="user">Utilisateur (Édition IFSI)</option>
              <option value="admin">Administrateur (Gestion Équipe & IFSI)</option>
              {userProfile?.role === "superadmin" && <option value="superadmin">Super-Administrateur (Réseau complet)</option>}
            </select>
            {userProfile?.role === "superadmin" && newMember.role !== "superadmin" && (
              <select value={newMember.ifsi} onChange={e => setNewMember({ ...newMember, ifsi: e.target.value })} style={input}>
                <option value="">Sélectionner l'établissement d'affectation...</option>
                {ifsiList.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            )}
            <button onClick={handleCreateUser} disabled={isCreatingUser} style={{ ...btn, opacity: isCreatingUser ? 0.7 : 1 }}>
              {isCreatingUser ? "Création en cours..." : "+ Créer le compte"}
            </button>
          </div>
        </div>
      )}

      <div style={{ ...card, gridColumn: (userProfile?.role === "admin" || userProfile?.role === "superadmin") ? "span 1" : "1 / -1", overflow: "hidden" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "800", color: textMain, margin: "0 0 16px" }}>Annuaire de l'équipe</h2>
        <input type="text" placeholder="Rechercher par email..." value={teamSearchTerm} onChange={e => setTeamSearchTerm(e.target.value)} style={{ ...input, marginBottom: "16px" }} />
        
        <div style={{ overflowX: "auto", borderRadius: "8px", border: `1px solid ${borderCol}`, background: bgCard }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "450px" }}>
            <thead>
              <tr>
                <th style={th} onClick={() => handleSortTeam("email")}>Email {teamSortConfig.key==="email"?(teamSortConfig.direction==="asc"?"↑":"↓"):""}</th>
                <th style={th} onClick={() => handleSortTeam("role")}>Rôle {teamSortConfig.key==="role"?(teamSortConfig.direction==="asc"?"↑":"↓"):""}</th>
                {userProfile?.role === "superadmin" && <th style={th} onClick={() => handleSortTeam("ifsi")}>Établissement {teamSortConfig.key==="ifsi"?(teamSortConfig.direction==="asc"?"↑":"↓"):""}</th>}
                <th style={{...th, textAlign:"right"}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeamUsers.map(u => (
                <tr key={u.id} style={{ transition: "background 0.2s" }} onMouseOver={e=>e.currentTarget.style.background=isDarkMode?"#2a2b2f":"#f8fafc"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ ...td, fontWeight: "600" }}>
                    {u.email} 
                    {u.id === auth.currentUser?.uid && <span style={{fontSize:"10px", background: isDarkMode?"#0f382a":"#d1fae5", border:`1px solid ${isDarkMode?"#10b981":"#6ee7b7"}`, color: isDarkMode?"#81c995":"#065f46", padding:"2px 6px", borderRadius:"4px", marginLeft:"8px"}}>Vous</span>}
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: "11px", fontWeight: "800", background: u.role==="superadmin"?(isDarkMode?"#45320b":"#fef3c7"):u.role==="admin"?(isDarkMode?"#1a2332":"#e0e7ff"):(isDarkMode?"#2a2b2f":"#f1f5f9"), color: u.role==="superadmin"?(isDarkMode?"#fdd663":"#92400e"):u.role==="admin"?(isDarkMode?"#8ab4f8":"#1e40af"):(isDarkMode?"#9aa0a6":"#475569"), padding: "4px 10px", borderRadius: "6px", border: `1px solid ${u.role==="superadmin"?(isDarkMode?"#7a5912":"#fde68a"):u.role==="admin"?(isDarkMode?"#3b82f6":"#bfdbfe"):(isDarkMode?"#44474a":"#cbd5e1")}` }}>
                      {u.role === "superadmin" ? "Superadmin" : u.role === "admin" ? "Admin" : "User"}
                    </span>
                  </td>
                  {userProfile?.role === "superadmin" && <td style={{...td, fontSize:"12px", color: textMuted, fontStyle: u.role==="superadmin"?"italic":"normal"}}>{u.role === "superadmin" ? "Accès global Réseau" : (ifsiList.find(i=>i.id===u.etablissementId)?.name || "Aucun")}</td>}
                  <td style={{ ...td, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      {(userProfile?.role === "superadmin" || userProfile?.role === "admin") && (
                         <button onClick={() => handleSendResetEmail(u.email)} style={{ background: isDarkMode?"#1a2332":"#eff6ff", border: `1px solid ${isDarkMode?"#3b82f6":"#bfdbfe"}`, color: isDarkMode?"#8ab4f8":"#1d4ed8", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontSize:"12px", fontWeight:"700" }}>✉️ Reset</button>
                      )}
                      {userProfile?.role === "superadmin" && u.role !== "superadmin" && (
                         <button onClick={() => handleDeleteUser(u.id)} style={{ background: isDarkMode?"#450a0a":"#fef2f2", border: `1px solid ${isDarkMode?"#7f1d1d":"#fca5a5"}`, color: isDarkMode?"#f28b82":"#ef4444", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontWeight: "700", fontSize:"12px" }}>Supprimer</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CompteTab({ auth, userProfile, pwdUpdate, setPwdUpdate, handleChangePassword, isDarkMode, setIsDarkMode, isColorblindMode, setIsColorblindMode }) {
  
  const bgCard = isDarkMode ? "#1e1f20" : "white";
  const bgMain = isDarkMode ? "#131314" : "#f8fafc";
  const textMain = isDarkMode ? "#e3e3e3" : "#1e3a5f";
  const textMuted = isDarkMode ? "#9aa0a6" : "#64748b";
  const borderCol = isDarkMode ? "#333537" : "#e2e8f0";

  const card = { background: bgCard, border: `1px solid ${borderCol}`, borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const input = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${borderCol}`, background: bgMain, color: textMain, fontSize: "13px", outline: "none", boxSizing: "border-box" };
  const btn = { width: "100%", padding: "10px", background: isDarkMode ? "#8ab4f8" : "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: isDarkMode ? "#131314" : "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "500px", margin: "0 auto" }}>
      
      <div style={card}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
           <div style={{ width: "60px", height: "60px", background: bgMain, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: "24px" }}>👤</div>
           <h2 style={{ fontSize: "20px", fontWeight: "900", color: textMain, margin: "0 0 4px" }}>Mon Profil</h2>
           <div style={{ color: textMuted, fontSize: "14px" }}>Connecté avec <strong style={{ color: isDarkMode ? "#8ab4f8" : "#1d4ed8" }}>{auth.currentUser?.email}</strong></div>
        </div>
        
        <form onSubmit={(e) => handleChangePassword(e, false)} style={{ display: "flex", flexDirection: "column", gap: "14px", background: bgMain, padding: "24px", borderRadius: "12px", border: `1px solid ${borderCol}` }}>
          <h3 style={{ fontSize: "15px", fontWeight: "800", margin: "0 0 4px", color: textMain, display: "flex", alignItems: "center", gap: "6px" }}><span>🔐</span> Changer mon mot de passe</h3>
          
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: textMuted, marginBottom: "4px", display: "block" }}>Nouveau mot de passe</label>
            <input type="password" placeholder="8 caractères, 1 majuscule, 1 chiffre" value={pwdUpdate.p1} onChange={e => setPwdUpdate({ ...pwdUpdate, p1: e.target.value })} required style={input} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: textMuted, marginBottom: "4px", display: "block" }}>Confirmez le mot de passe</label>
            <input type="password" placeholder="Retapez le même mot de passe" value={pwdUpdate.p2} onChange={e => setPwdUpdate({ ...pwdUpdate, p2: e.target.value })} required style={input} />
          </div>
          <button type="submit" disabled={pwdUpdate.loading} style={{ ...btn, marginTop: "10px", padding: "12px" }}>
            {pwdUpdate.loading ? "Mise à jour en cours..." : "Valider le nouveau mot de passe"}
          </button>
        </form>
      </div>

      <div style={{ ...card, marginTop: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "900", color: textMain, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ background: isDarkMode?"#1a2332":"#eff6ff", padding: "6px", borderRadius: "8px", fontSize: "18px" }}>🎨</span> Accessibilité & Inclusion
        </h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: bgMain, padding: "12px 16px", borderRadius: "10px", border: `1px solid ${borderCol}` }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: textMain }}>Mode Sombre (Gemini)</div>
              <div style={{ fontSize: "11px", color: textMuted }}>Contraste élevé, idéal en basse lumière.</div>
            </div>
            <input type="checkbox" checked={isDarkMode} onChange={(e) => setIsDarkMode(e.target.checked)} style={{ width: "20px", height: "20px", accentColor: isDarkMode?"#8ab4f8":"#1d4ed8", cursor: "pointer" }} />
          </label>

          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: bgMain, padding: "12px 16px", borderRadius: "10px", border: `1px solid ${borderCol}` }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: textMain }}>Mode Daltonien</div>
              <div style={{ fontSize: "11px", color: textMuted }}>Remplace les couleurs Rouge/Vert par Orange/Bleu.</div>
            </div>
            <input type="checkbox" checked={isColorblindMode} onChange={(e) => setIsColorblindMode(e.target.checked)} style={{ width: "20px", height: "20px", accentColor: isDarkMode?"#8ab4f8":"#1d4ed8", cursor: "pointer" }} />
          </label>

        </div>
      </div>

    </div>
  );
}
