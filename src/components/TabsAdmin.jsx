import React from "react";

const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
const th = { textAlign: "left", padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "2px solid #f1f5f9", background: "#fafafa" };
const td = { padding: "11px 14px", fontSize: "13px", borderBottom: "1px solid #f8fafc", verticalAlign: "middle", color: "#374151" };
const inp = { background: "white", border: "1px solid #d1d5db", borderRadius: "8px", outline: "none", boxSizing: "border-box", fontFamily: "Outfit, sans-serif" };

export function EquipeTab({ userProfile, newMember, setNewMember, isCreatingUser, handleCreateUser, selectedIfsi, ifsiList, teamSearchTerm, setTeamSearchTerm, sortedTeamUsers, teamSortConfig, handleSortTeam, handleDeleteUser, auth }) {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>👥 Création & Gestion des Comptes</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Créez les identifiants de connexion. Vous pourrez ensuite affecter ces personnes dans l'onglet "Organigramme".</p>
      </div>
      
      {/* 👉 Utilisation de FlexWrap au lieu de CSS Grid pour que ça passe sur mobile */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "start" }}>
        
        {/* Colonne Gauche : Création (rétrécit ou prend toute la largeur sur mobile) */}
        <div style={{ ...card, background: "#f8fafc", flex: "1 1 300px", maxWidth: "450px" }}>
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
             <div style={{ marginBottom: "16px", background: "#fffbeb", padding: "12px", borderRadius: "8px", border: "1px dashed #fcd34d" }}>
               <label style={{ fontSize: "11px", fontWeight: "800", color: "#d97706", textTransform: "uppercase" }}>👑 Affectation Établissement</label>
               <select value={newMember.ifsi || selectedIfsi} onChange={e => setNewMember({...newMember, ifsi: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #fcd34d", marginTop: "6px", background: "white", fontWeight: "bold", color: "#92400e" }}>
                 {ifsiList.map(ifsi => <option key={ifsi.id} value={ifsi.id}>{ifsi.name}</option>)}
               </select>
             </div>
          )}
          
          <button onClick={handleCreateUser} disabled={isCreatingUser} style={{ width: "100%", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white", padding: "12px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: isCreatingUser ? "wait" : "pointer", boxShadow: "0 4px 6px rgba(29, 78, 216, 0.2)" }}>{isCreatingUser ? "Création en cours..." : "Créer le compte"}</button>
        </div>

        {/* Colonne Droite : Liste (Prend toute la largeur restante, avec scroll horizontal si besoin) */}
        <div style={{ ...card, padding: 0, flex: "2 1 500px", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px", background: "#fafafa", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <input type="text" placeholder="🔍 Rechercher par email..." value={teamSearchTerm} onChange={e => setTeamSearchTerm(e.target.value)} style={{ ...inp, width: "100%", maxWidth: "300px", padding: "8px 12px", fontSize: "13px" }} />
            {userProfile.role === "superadmin" && (<span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700", background: "#f1f5f9", padding: "4px 10px", borderRadius: "6px" }}>{sortedTeamUsers.length} compte(s) actif(s)</span>)}
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
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
                  <tr key={u.id} className="td-dash" style={{ borderBottom: "1px solid #f1f5f9", background: "white" }}>
                    <td style={{ ...td, fontWeight: "700", color: "#1e3a5f" }}>{u.email || u.id}</td>
                    <td style={td}>
                      {u.role === "superadmin" && <span style={{ background: "#fef2f2", color: "#991b1b", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "900", border: "1px solid #fca5a5" }}>SUPERADMIN</span>}
                      {u.role === "admin" && <span style={{ background: "#fff7ed", color: "#c2410c", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "900", border: "1px solid #fed7aa" }}>ADMIN</span>}
                      {(u.role === "user" || !u.role) && <span style={{ background: "#f3f4f6", color: "#4b5563", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "800", border: "1px solid #d1d5db" }}>MEMBRE</span>}
                    </td>
                    {userProfile.role === "superadmin" && <td style={{ ...td, fontSize: "12px", color: "#64748b", fontWeight: "600" }}>{ifsiList.find(i => i.id === u.etablissementId)?.name || u.etablissementId}</td>}
                    <td style={td}>
                      {u.id !== auth.currentUser?.uid && u.role !== "superadmin" && (<button onClick={() => handleDeleteUser(u.id, u.email)} style={{ background: "#fff5f5", color: "#ef4444", border: "1px solid #fca5a5", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "bold", transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.background="#fee2e2"} onMouseOut={e=>e.currentTarget.style.background="#fff5f5"}>Révoquer</button>)}
                    </td>
                  </tr>
                ))}
                {sortedTeamUsers.length === 0 && <tr><td colSpan="4" style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontStyle: "italic", fontSize: "13px" }}>Aucun compte trouvé correspondant à votre recherche.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompteTab({ auth, userProfile, pwdUpdate, setPwdUpdate, handleChangePassword }) {
  return (
    <div className="animate-fade-in" style={{ maxWidth: "500px", margin: "0 auto", marginTop: "40px" }}>
      <div style={{ marginBottom: "24px", textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>🛡️</div>
        <h2 style={{ fontSize: "24px", fontWeight: "900", color: "#1e3a5f", margin: "0 0 8px" }}>Mon compte personnel</h2>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>Gérez vos identifiants de sécurité.</p>
      </div>
      
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #f1f5f9", paddingBottom: "16px", marginBottom: "20px" }}>
           <div>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#9ca3af", textTransform: "uppercase", marginBottom: "4px" }}>Adresse de connexion</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#1e3a5f" }}>{auth.currentUser?.email}</div>
           </div>
           <span style={{ fontSize: "11px", fontWeight: "900", background: "#eff6ff", color: "#1d4ed8", padding: "6px 12px", borderRadius: "8px", border: "1px solid #bfdbfe", textTransform: "uppercase" }}>{userProfile?.role}</span>
        </div>
        
        <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#1e3a5f", marginBottom: "16px" }}>Modifier mon mot de passe</h3>
        
        {pwdUpdate.success && <div style={{ color: "#065f46", background: "#d1fae5", padding: "12px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px", fontWeight: "700", border: "1px solid #6ee7b7", display: "flex", alignItems: "center", gap: "8px" }}><span>✅</span> {pwdUpdate.success}</div>}
        {pwdUpdate.error && <div style={{ color: "#991b1b", background: "#fef2f2", padding: "12px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px", fontWeight: "700", border: "1px solid #fca5a5", display: "flex", alignItems: "center", gap: "8px" }}><span>⚠️</span> {pwdUpdate.error}</div>}
        
        <form onSubmit={(e) => handleChangePassword(e, false)}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Nouveau mot de passe</label>
            <input type="password" value={pwdUpdate.p1} onChange={e => setPwdUpdate({...pwdUpdate, p1: e.target.value})} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "6px", fontSize: "14px" }} placeholder="8 caractères minimum, 1 majuscule, 1 chiffre" required />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Confirmer le mot de passe</label>
            <input type="password" value={pwdUpdate.p2} onChange={e => setPwdUpdate({...pwdUpdate, p2: e.target.value})} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "6px", fontSize: "14px" }} placeholder="Répétez le mot de passe à l'identique" required />
          </div>
          <button type="submit" disabled={pwdUpdate.loading} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#1e3a5f,#334155)", color: "white", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "14px", cursor: pwdUpdate.loading ? "wait" : "pointer", boxShadow: "0 4px 6px rgba(30, 58, 138, 0.2)" }}>
            {pwdUpdate.loading ? "Enregistrement en cours..." : "Mettre à jour mon accès"}
          </button>
        </form>
      </div>
    </div>
  );
}
