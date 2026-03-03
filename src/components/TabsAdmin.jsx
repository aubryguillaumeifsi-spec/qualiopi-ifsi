import React from "react";

const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
const th = { textAlign: "left", padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "2px solid #f1f5f9", background: "#fafafa" };
const td = { padding: "11px 14px", fontSize: "13px", borderBottom: "1px solid #f8fafc", verticalAlign: "middle", color: "#374151" };
const inp = { background: "white", border: "1px solid #d1d5db", borderRadius: "8px", outline: "none", boxSizing: "border-box", fontFamily: "Outfit, sans-serif" };

export function EquipeTab({ userProfile, newMember, setNewMember, isCreatingUser, handleCreateUser, selectedIfsi, ifsiList, teamSearchTerm, setTeamSearchTerm, sortedTeamUsers, teamSortConfig, handleSortTeam, handleDeleteUser, auth }) {
  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>👥 Création & Gestion des Comptes</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Créez les identifiants de connexion. Vous pourrez ensuite affecter ces personnes dans l'onglet "Organigramme".</p>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "24px", alignItems: "start" }}>
        <div style={{ ...card, background: "#f8fafc" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 16px 0", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" }}>➕ Nouveau compte</h3>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px", borderRadius: "6px", fontSize: "11px", color: "#1d4ed8", marginBottom: "16px", lineHeight: "1.4" }}>ℹ️ L'utilisateur sera forcé de modifier son mot de passe.</div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Email</label>
            <input type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px" }} placeholder="contact@institut.fr" />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Mot de passe provisoire</label>
            <input type="text" value={newMember.pwd} onChange={e => setNewMember({...newMember, pwd: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px" }} placeholder="Ex: Qualiopi2026!" />
            <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "6px", lineHeight: "1.4" }}>👉 Minimum 6 caractères.</div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Rôle système</label>
            <select value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px", background: "white" }}>
              <option value="user">Membre (lecture & écriture)</option>
              {userProfile.role === "superadmin" && <option value="admin">Admin (création de compte)</option>}
            </select>
          </div>
          {userProfile.role === "superadmin" && (
             <div style={{ marginBottom: "16px", background: "#fffbeb", padding: "10px", borderRadius: "8px", border: "1px dashed #fcd34d" }}>
               <label style={{ fontSize: "11px", fontWeight: "800", color: "#d97706", textTransform: "uppercase" }}>👑 Établissement</label>
               <select value={newMember.ifsi || selectedIfsi} onChange={e => setNewMember({...newMember, ifsi: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #fcd34d", marginTop: "4px", background: "white" }}>
                 {ifsiList.map(ifsi => <option key={ifsi.id} value={ifsi.id}>{ifsi.name}</option>)}
               </select>
             </div>
          )}
          <button onClick={handleCreateUser} disabled={isCreatingUser} style={{ width: "100%", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white", padding: "10px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: isCreatingUser ? "wait" : "pointer" }}>{isCreatingUser ? "Création..." : "Créer le compte"}</button>
        </div>

        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px", background: "#fafafa", borderBottom: "1px solid #e2e8f0" }}>
            <input type="text" placeholder="🔍 Rechercher par email..." value={teamSearchTerm} onChange={e => setTeamSearchTerm(e.target.value)} style={{ ...inp, width: "100%", maxWidth: "400px", padding: "8px 12px", fontSize: "13px" }} />
            {userProfile.role === "superadmin" && (<span style={{ fontSize: "12px", color: "#64748b", marginLeft: "12px", fontWeight: "600" }}>{sortedTeamUsers.length} compte(s) au total</span>)}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{...th, cursor: "pointer", userSelect: "none"}} onClick={() => handleSortTeam('email')} title="Trier par Email">Email {teamSortConfig.key === 'email' ? (teamSortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕'}</th>
                <th style={{...th, cursor: "pointer", userSelect: "none"}} onClick={() => handleSortTeam('role')} title="Trier par Rôle">Rôle Système {teamSortConfig.key === 'role' ? (teamSortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕'}</th>
                {userProfile.role === "superadmin" && (<th style={{...th, cursor: "pointer", userSelect: "none"}} onClick={() => handleSortTeam('ifsi')} title="Trier par Établissement">Établissement {teamSortConfig.key === 'ifsi' ? (teamSortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕'}</th>)}
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeamUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ ...td, fontWeight: "600", color: "#1e3a5f" }}>{u.email || u.id}</td>
                  <td style={td}>
                    {u.role === "superadmin" && <span style={{ background: "#fef2f2", color: "#991b1b", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", border: "1px solid #fca5a5" }}>SUPERADMIN</span>}
                    {u.role === "admin" && <span style={{ background: "#fff7ed", color: "#c2410c", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", border: "1px solid #fed7aa" }}>ADMIN</span>}
                    {(u.role === "user" || !u.role) && <span style={{ background: "#f3f4f6", color: "#4b5563", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", border: "1px solid #d1d5db" }}>MEMBRE</span>}
                  </td>
                  {userProfile.role === "superadmin" && <td style={{ ...td, fontSize: "11px", color: "#6b7280" }}>{ifsiList.find(i => i.id === u.etablissementId)?.name || u.etablissementId}</td>}
                  <td style={td}>
                    {u.id !== auth.currentUser?.uid && u.role !== "superadmin" && (<button onClick={() => handleDeleteUser(u.id, u.email)} style={{ background: "white", color: "#ef4444", border: "1px solid #fca5a5", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>Supprimer</button>)}
                  </td>
                </tr>
              ))}
              {sortedTeamUsers.length === 0 && <tr><td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontStyle: "italic", fontSize: "13px" }}>Aucun compte trouvé.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CompteTab({ auth, userProfile, pwdUpdate, setPwdUpdate, handleChangePassword }) {
  return (
    <div style={{ maxWidth: "500px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>⚙️ Mon compte personnel</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Gérez vos informations de sécurité.</p>
      </div>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
           <div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase" }}>Email de connexion</div>
              <div style={{ fontSize: "15px", fontWeight: "800", color: "#1e3a5f" }}>{auth.currentUser?.email}</div>
           </div>
           <span style={{ fontSize: "10px", fontWeight: "800", background: "#eff6ff", color: "#1d4ed8", padding: "4px 8px", borderRadius: "6px", border: "1px solid #bfdbfe", textTransform: "uppercase" }}>Rôle : {userProfile?.role}</span>
        </div>
        <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f", marginBottom: "12px" }}>Changer mon mot de passe</h3>
        {pwdUpdate.success && <div style={{ color: "#059669", background: "#d1fae5", padding: "10px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px", fontWeight: "600", border: "1px solid #6ee7b7" }}>{pwdUpdate.success}</div>}
        {pwdUpdate.error && <div style={{ color: "#ef4444", background: "#fef2f2", padding: "10px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px", fontWeight: "600", border: "1px solid #fca5a5" }}>{pwdUpdate.error}</div>}
        <form onSubmit={(e) => handleChangePassword(e, false)}>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280" }}>Nouveau mot de passe</label>
            <input type="password" value={pwdUpdate.p1} onChange={e => setPwdUpdate({...pwdUpdate, p1: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px" }} placeholder="8 caractères, 1 majuscule, 1 chiffre" required />
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280" }}>Confirmer le mot de passe</label>
            <input type="password" value={pwdUpdate.p2} onChange={e => setPwdUpdate({...pwdUpdate, p2: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px" }} placeholder="Répétez le mot de passe" required />
          </div>
          <button type="submit" disabled={pwdUpdate.loading} style={{ width: "100%", padding: "10px", background: "#1e3a5f", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: pwdUpdate.loading ? "wait" : "pointer" }}>{pwdUpdate.loading ? "Enregistrement..." : "Mettre à jour"}</button>
        </form>
      </div>
    </div>
  );
}
