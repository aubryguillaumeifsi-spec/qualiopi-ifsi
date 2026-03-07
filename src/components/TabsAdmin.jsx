import React from "react";

// ----------------------------------------------------------------------
// ⚙️ ONGLET : ADMINISTRATION (Équipe)
// ----------------------------------------------------------------------
export function EquipeTab({ userProfile, newMember, setNewMember, isCreatingUser, handleCreateUser, selectedIfsi, ifsiList, teamSearchTerm, setTeamSearchTerm, sortedTeamUsers, handleDeleteUser, handleSendResetEmail, t }) {
  
  // Sécurité anti-crash et filtrage du Super Admin pour la confidentialité
  const safeUsers = Array.isArray(sortedTeamUsers) ? sortedTeamUsers : [];
  const displayUsers = safeUsers.filter(u => u.role !== "superadmin");

  return (
    <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"20px", maxWidth:"1000px", margin:"0 auto" }}>
      
      {/* HEADER ADMINISTRATION */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"24px 32px", boxShadow:t.shadowSm, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
          <div style={{ width:"48px", height:"48px", borderRadius:"12px", background:t.accentBg, border:`1px solid ${t.accentBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px" }}>👥</div>
          <div>
            <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"26px", color:t.text, margin:"0 0 4px 0" }}>Gestion des accès</h2>
            <div style={{ fontSize:"13px", color:t.text2 }}>Gérez les utilisateurs autorisés à se connecter à l'application.</div>
          </div>
        </div>
      </div>

      {/* TABLEAU DES MEMBRES */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
        <div style={{ padding:"16px 24px", borderBottom:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:t.surface2 }}>
          <span style={{ fontSize:"14px", fontWeight:"800", color:t.text }}>Membres du réseau</span>
          <input 
            type="text" placeholder="Rechercher un email..." 
            value={teamSearchTerm} onChange={(e) => setTeamSearchTerm(e.target.value)}
            style={{ background:t.surface, border:`1px solid ${t.border}`, color:t.text, padding:"8px 14px", borderRadius:"8px", fontSize:"13px", outline:"none", width:"220px", transition:"all 0.2s" }}
          />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"minmax(200px, 1fr) 120px 200px 100px", padding:"12px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
          {["Utilisateur", "Rôle", "Établissement", "Actions"].map(h => (
            <span key={h} style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"0.8px" }}>{h}</span>
          ))}
        </div>

        <div style={{ overflowY:"auto", maxHeight:"400px" }}>
          {displayUsers.length === 0 ? (
            <div style={{ padding:"40px", textAlign:"center", color:t.text3, fontSize:"13px", fontStyle:"italic" }}>Aucun utilisateur trouvé.</div>
          ) : (
            displayUsers.map(u => {
              const ifsiName = ifsiList.find(i => i.id === u.etablissementId)?.name || u.etablissementId;
              const roleColor = u.role === "admin" ? t.accent : t.green;
              const roleBg = u.role === "admin" ? t.accentBg : t.greenBg;

              return (
                <div key={u.id} className="ro" style={{ display:"grid", gridTemplateColumns:"minmax(200px, 1fr) 120px 200px 100px", alignItems:"center", gap:"10px", padding:"16px 24px", borderBottom:`1px solid ${t.border2}`, transition:"background 0.2s" }} onMouseOver={e=>e.currentTarget.style.background=t.surface2} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                    <div style={{ width:"36px", height:"36px", borderRadius:"8px", background:t.surface3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:"800", color:t.text }}>
                      {u.email ? u.email.charAt(0).toUpperCase() : "?"}
                    </div>
                    <span style={{ fontSize:"13px", fontWeight:"600", color:t.text }}>{u.email}</span>
                  </div>
                  
                  <div>
                    <span style={{ background:roleBg, color:roleColor, border:`1px solid ${roleColor}40`, padding:"4px 10px", borderRadius:"6px", fontSize:"10px", fontWeight:"800", textTransform:"uppercase" }}>
                      {u.role}
                    </span>
                  </div>

                  <span style={{ fontSize:"12px", color:t.text2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {ifsiName}
                  </span>

                  <div style={{ display:"flex", gap:"8px" }}>
                    <button onClick={() => handleSendResetEmail(u.email)} title="Réinitialiser le mot de passe" style={{ background:t.surface2, border:`1px solid ${t.border}`, padding:"8px", borderRadius:"6px", cursor:"pointer", color:t.text2, transition:"all 0.2s" }} onMouseOver={e=>e.currentTarget.style.borderColor=t.accent} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}>🔑</button>
                    {userProfile?.role === "superadmin" && (
                      <button onClick={() => handleDeleteUser(u.id)} title="Supprimer l'accès" style={{ background:t.redBg, border:`1px solid ${t.redBd}`, padding:"8px", borderRadius:"6px", cursor:"pointer", color:t.red, transition:"all 0.2s" }} onMouseOver={e=>e.currentTarget.style.background=t.red} onMouseOut={e=>e.currentTarget.style.background=t.redBg}>🗑️</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* AJOUTER UN MEMBRE */}
      {userProfile?.role === "superadmin" && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"24px 32px", boxShadow:t.shadowSm }}>
          <div style={{ fontSize:"15px", fontWeight:"800", color:t.text, marginBottom:"16px" }}>+ Inviter un nouveau membre</div>
          <div style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
            <input type="email" placeholder="Adresse e-mail" value={newMember.email} onChange={e=>setNewMember({...newMember, email:e.target.value})} style={{ flex:1, minWidth:"200px", padding:"12px 16px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"13px" }}/>
            <input type="password" placeholder="Mot de passe temporaire" value={newMember.pwd} onChange={e=>setNewMember({...newMember, pwd:e.target.value})} style={{ flex:1, minWidth:"150px", padding:"12px 16px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"13px" }}/>
            <select value={newMember.role} onChange={e=>setNewMember({...newMember, role:e.target.value})} style={{ padding:"12px 16px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"13px", cursor:"pointer" }}>
              <option value="user">Éditeur (Standard)</option>
              <option value="admin">Administrateur IFSI</option>
            </select>
            <button onClick={handleCreateUser} disabled={isCreatingUser} style={{ background:t.accent, color:"white", border:"none", padding:"12px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:isCreatingUser?"not-allowed":"pointer", boxShadow:`0 4px 12px ${t.accentBd}`, transition:"transform 0.2s" }} onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e=>e.currentTarget.style.transform="translateY(0)"}>
              {isCreatingUser ? "Création..." : "Envoyer l'invitation"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 👤 ONGLET : COMPTE PERSONNEL (Profil)
// ----------------------------------------------------------------------
export function CompteTab({ auth, userProfile, pwdUpdate, setPwdUpdate, handleChangePassword, isDarkMode, setIsDarkMode, isColorblindMode, setIsColorblindMode, t }) {
  return (
    <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"20px", maxWidth:"800px", margin:"0 auto", paddingBottom:"40px" }}>
      
      {/* Header Profil */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"16px", padding:"32px", display:"flex", alignItems:"center", gap:"24px", boxShadow:t.shadowSm }}>
        <div style={{ width:"80px", height:"80px", borderRadius:"20px", background:t.accentBg, border:`2px solid ${t.accentBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"32px", fontWeight:"800", color:t.accent, flexShrink:0 }}>
          {auth.currentUser?.email?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"36px", color:t.text, margin:"0 0 8px 0" }}>Mon Profil</h2>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <span style={{ fontSize:"15px", color:t.text2, fontWeight:"500" }}>{auth.currentUser?.email}</span>
            <span style={{ background:t.surface2, border:`1px solid ${t.border}`, color:t.text3, fontSize:"11px", fontWeight:"800", padding:"4px 10px", borderRadius:"6px", textTransform:"uppercase" }}>
              {userProfile?.role || "Utilisateur"}
            </span>
          </div>
        </div>
      </div>

      {/* Apparence */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"16px", overflow:"hidden", boxShadow:t.shadowSm }}>
        <div style={{ padding:"20px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
          <span style={{ fontSize:"16px", fontWeight:"800", color:t.text }}>🎨 Apparence & Accessibilité</span>
        </div>
        <div style={{ padding:"24px", display:"flex", flexDirection:"column", gap:"20px" }}>
          
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingBottom:"20px", borderBottom:`1px solid ${t.border2}` }}>
            <div>
              <div style={{ fontSize:"15px", fontWeight:"700", color:t.text, marginBottom:"6px" }}>Thème sombre (Midnight)</div>
              <div style={{ fontSize:"13px", color:t.text2 }}>Protège les yeux et réduit la fatigue visuelle.</div>
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ background:isDarkMode?t.accent:t.surface2, color:isDarkMode?"white":t.text, border:`1px solid ${isDarkMode?t.accentBd:t.border}`, padding:"10px 20px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", transition:"all 0.2s" }}>
              {isDarkMode ? "Activé" : "Désactivé"}
            </button>
          </div>
          
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:"15px", fontWeight:"700", color:t.text, marginBottom:"6px" }}>Mode Daltonien</div>
              <div style={{ fontSize:"13px", color:t.text2 }}>Remplace le rouge/vert par des couleurs à fort contraste.</div>
            </div>
            <button onClick={() => setIsColorblindMode(!isColorblindMode)} style={{ background:isColorblindMode?t.accent:t.surface2, color:isColorblindMode?"white":t.text, border:`1px solid ${isColorblindMode?t.accentBd:t.border}`, padding:"10px 20px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", transition:"all 0.2s" }}>
              {isColorblindMode ? "Activé" : "Désactivé"}
            </button>
          </div>

        </div>
      </div>

      {/* Sécurité */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"16px", overflow:"hidden", boxShadow:t.shadowSm }}>
        <div style={{ padding:"20px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
          <span style={{ fontSize:"16px", fontWeight:"800", color:t.text }}>🔒 Sécurité du compte</span>
        </div>
        <div style={{ padding:"24px" }}>
          <div style={{ fontSize:"14px", color:t.text2, marginBottom:"20px" }}>Changer votre mot de passe (Minimum 6 caractères)</div>
          <form onSubmit={handleChangePassword} style={{ display:"flex", gap:"16px", alignItems:"flex-start", flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:"250px" }}>
              <input type="password" placeholder="Nouveau mot de passe" value={pwdUpdate.p1} onChange={e=>setPwdUpdate({...pwdUpdate, p1:e.target.value})} style={{ width:"100%", padding:"12px 16px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"14px" }} required minLength={6}/>
            </div>
            <button type="submit" disabled={pwdUpdate.loading} style={{ background:t.accent, color:"white", border:"none", padding:"13px 24px", borderRadius:"8px", fontSize:"14px", fontWeight:"700", cursor:pwdUpdate.loading?"not-allowed":"pointer", boxShadow:`0 4px 12px ${t.accentBd}`, whiteSpace:"nowrap" }}>
              {pwdUpdate.loading ? "Mise à jour..." : "Mettre à jour"}
            </button>
          </form>
          {pwdUpdate.error && <div style={{ color:t.red, fontSize:"13px", marginTop:"16px", fontWeight:"600", padding:"12px", background:t.redBg, borderRadius:"8px", border:`1px solid ${t.redBd}` }}>{pwdUpdate.error}</div>}
          {pwdUpdate.success && <div style={{ color:t.green, fontSize:"13px", marginTop:"16px", fontWeight:"600", padding:"12px", background:t.greenBg, borderRadius:"8px", border:`1px solid ${t.greenBd}` }}>{pwdUpdate.success}</div>}
        </div>
      </div>

      {/* Zone Danger */}
      <div style={{ background:t.surface, border:`1px solid ${t.dangerBd}`, borderRadius:"16px", overflow:"hidden", boxShadow:t.shadowSm }}>
        <div style={{ padding:"24px 32px" }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"26px", color:t.danger, marginBottom:"8px" }}>⚠️ Zone dangereuse</div>
          <div style={{ fontSize:"13px", color:t.text2, marginBottom:"24px" }}>Ces actions sont définitives et ne peuvent pas être annulées.</div>
          
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"10px" }}>
              <div>
                <div style={{ fontSize:"14px", fontWeight:"700", color:t.text, marginBottom:"4px" }}>Exporter mes données</div>
                <div style={{ fontSize:"12px", color:t.text3 }}>Télécharger toutes mes données au format JSON</div>
              </div>
              <button onClick={()=>alert("Export en cours...")} style={{ background:t.accentBg, border:`1px solid ${t.accentBd}`, color:t.accent, padding:"10px 20px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer" }}>Exporter</button>
            </div>
            
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", background:t.dangerBg, border:`1px solid ${t.dangerBd}`, borderRadius:"10px" }}>
              <div>
                <div style={{ fontSize:"14px", fontWeight:"700", color:t.danger, marginBottom:"4px" }}>Désactiver mon compte</div>
                <div style={{ fontSize:"12px", color:t.danger, opacity:0.8 }}>Votre accès sera suspendu immédiatement</div>
              </div>
              <button onClick={()=>alert("Contactez votre Super Admin pour désactiver votre compte.")} style={{ background:t.danger, border:"none", color:"white", padding:"10px 20px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", boxShadow:`0 4px 12px ${t.dangerBd}` }}>Désactiver</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
