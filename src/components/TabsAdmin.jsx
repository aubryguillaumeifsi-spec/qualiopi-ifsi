import React from "react";

const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
const input = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box" };
const btn = { width: "100%", padding: "10px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "14px", transition: "transform 0.1s" };
const th = { textAlign: "left", padding: "12px 14px", fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", borderBottom: "2px solid #e2e8f0", cursor: "pointer", background: "#f8fafc" };
const td = { padding: "12px 14px", fontSize: "13px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle", color: "#334155" };

export function EquipeTab({ userProfile, newMember, setNewMember, isCreatingUser, handleCreateUser, selectedIfsi, ifsiList, teamSearchTerm, setTeamSearchTerm, sortedTeamUsers, teamSortConfig, handleSortTeam, handleDeleteUser, auth, handleSendResetEmail }) {
  return (
    <div className="animate-fade-in responsive-grid-2">
      {/* Formulaire de création (Réservé Admin/Superadmin) */}
      {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
        <div style={card}>
          <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 16px" }}>Ajouter un compte</h2>
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
            <p style={{ fontSize: "11px", color: "#64748b", margin: 0, textAlign: "center" }}>À sa première connexion, l'utilisateur devra obligatoirement changer ce mot de passe.</p>
          </div>
        </div>
      )}

      {/* Liste des comptes */}
      <div style={{ ...card, gridColumn: (userProfile?.role === "admin" || userProfile?.role === "superadmin") ? "span 1" : "1 / -1", overflow: "hidden" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 16px" }}>Annuaire de l'équipe</h2>
        <input type="text" placeholder="Rechercher par email..." value={teamSearchTerm} onChange={e => setTeamSearchTerm(e.target.value)} style={{ ...input, marginBottom: "16px" }} />
        
        <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
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
                <tr key={u.id} className="td-dash" style={{ background: "white", transition: "background 0.2s" }}>
                  <td style={{ ...td, fontWeight: "600", color: "#1e3a5f" }}>
                    {u.email} 
                    {u.id === auth.currentUser?.uid && <span style={{fontSize:"10px", background:"#d1fae5", border:"1px solid #6ee7b7", color:"#065f46", padding:"2px 6px", borderRadius:"4px", marginLeft:"8px"}}>Vous</span>}
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: "11px", fontWeight: "800", background: u.role==="superadmin"?"#fef3c7":u.role==="admin"?"#e0e7ff":"#f1f5f9", color: u.role==="superadmin"?"#92400e":u.role==="admin"?"#1e40af":"#475569", padding: "4px 10px", borderRadius: "6px", border: `1px solid ${u.role==="superadmin"?"#fde68a":u.role==="admin"?"#bfdbfe":"#cbd5e1"}` }}>
                      {u.role === "superadmin" ? "Superadmin" : u.role === "admin" ? "Admin" : "User"}
                    </span>
                  </td>
                  {userProfile?.role === "superadmin" && <td style={{...td, fontSize:"12px", color:"#64748b", fontStyle: u.role==="superadmin"?"italic":"normal"}}>{u.role === "superadmin" ? "Accès global Réseau" : (ifsiList.find(i=>i.id===u.etablissementId)?.name || "Aucun")}</td>}
                  <td style={{ ...td, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      {/* BOUTON ENVOI EMAIL RESET */}
                      {(userProfile?.role === "superadmin" || userProfile?.role === "admin") && (
                         <button onClick={() => handleSendResetEmail(u.email)} title="Envoyer le lien de changement de mot de passe" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontSize:"12px", fontWeight:"700", transition:"all 0.2s" }} onMouseOver={e=>e.currentTarget.style.background="#dbeafe"} onMouseOut={e=>e.currentTarget.style.background="#eff6ff"}>✉️ Lien de Reset</button>
                      )}
                      {/* BOUTON SUPPRIMER (Caché si on tente de supprimer un superadmin) */}
                      {userProfile?.role === "superadmin" && u.role !== "superadmin" && (
                         <button onClick={() => handleDeleteUser(u.id)} style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#ef4444", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontWeight: "700", fontSize:"12px", transition:"all 0.2s" }} onMouseOver={e=>e.currentTarget.style.background="#fee2e2"} onMouseOut={e=>e.currentTarget.style.background="#fef2f2"}>Supprimer</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sortedTeamUsers.length === 0 && <tr><td colSpan={userProfile?.role === "superadmin" ? "4" : "3"} style={{...td, textAlign:"center", color:"#9ca3af", fontStyle:"italic", padding: "30px"}}>Aucun utilisateur trouvé correspondant à cette recherche.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CompteTab({ auth, userProfile, pwdUpdate, setPwdUpdate, handleChangePassword }) {
  return (
    <div className="animate-fade-in" style={{ maxWidth: "500px", margin: "0 auto" }}>
      <div style={card}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
           <div style={{ width: "60px", height: "60px", background: "#f1f5f9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: "24px" }}>👤</div>
           <h2 style={{ fontSize: "20px", fontWeight: "900", color: "#1e3a5f", margin: "0 0 4px" }}>Mon Profil</h2>
           <div style={{ color: "#64748b", fontSize: "14px" }}>Connecté avec <strong style={{ color: "#1d4ed8" }}>{auth.currentUser?.email}</strong></div>
        </div>
        
        <form onSubmit={(e) => handleChangePassword(e, false)} style={{ display: "flex", flexDirection: "column", gap: "14px", background: "#f8fafc", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "800", margin: "0 0 4px", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}><span>🔐</span> Changer mon mot de passe</h3>
          
          {pwdUpdate.error && <div style={{ color: "#ef4444", fontSize: "13px", background: "#fef2f2", padding: "10px", borderRadius: "8px", border: "1px solid #fca5a5" }}>{pwdUpdate.error}</div>}
          {pwdUpdate.success && <div style={{ color: "#10b981", fontSize: "13px", background: "#f0fdf4", padding: "10px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>{pwdUpdate.success}</div>}
          
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "4px", display: "block" }}>Nouveau mot de passe</label>
            <input type="password" placeholder="8 caractères, 1 majuscule, 1 chiffre" value={pwdUpdate.p1} onChange={e => setPwdUpdate({ ...pwdUpdate, p1: e.target.value })} required style={input} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "4px", display: "block" }}>Confirmez le mot de passe</label>
            <input type="password" placeholder="Retapez le même mot de passe" value={pwdUpdate.p2} onChange={e => setPwdUpdate({ ...pwdUpdate, p2: e.target.value })} required style={input} />
          </div>
          
          <button type="submit" disabled={pwdUpdate.loading} style={{ ...btn, marginTop: "10px", padding: "12px" }}>
            {pwdUpdate.loading ? "Mise à jour en cours..." : "Valider le nouveau mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
