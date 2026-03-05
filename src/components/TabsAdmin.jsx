import React from "react";

// ----------------------------------------------------------------------
// ⚙️ ONGLET : ADMINISTRATION (Équipe)
// ----------------------------------------------------------------------
export function EquipeTab({ userProfile, newMember, setNewMember, isCreatingUser, handleCreateUser, selectedIfsi, ifsiList, teamSearchTerm, setTeamSearchTerm, sortedTeamUsers, handleDeleteUser, handleSendResetEmail, t }) {
  
  const safeUsers = Array.isArray(sortedTeamUsers) ? sortedTeamUsers : [];

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
            style={{ background:t.surface, border:`1px solid ${t.border}`, color:t.text, padding:"8px 14px", borderRadius:"6px", fontSize:"12px", outline:"none", width:"200px" }}
          />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"minmax(200px, 1fr) 120px 200px 100px", padding:"12px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
          {["Utilisateur", "Rôle", "Établissement rattaché", "Actions"].map(h => (
            <span key={h} style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"0.8px" }}>{h}</span>
          ))}
        </div>

        <div style={{ overflowY:"auto", maxHeight:"400px" }}>
          {safeUsers.length === 0 ? (
            <div style={{ padding:"40px", textAlign:"center", color:t.text3, fontSize:"13px", fontStyle:"italic" }}>Aucun utilisateur trouvé.</div>
          ) : (
            safeUsers.map(u => {
              const ifsiName = ifsiList.find(i => i.id === u.etablissementId)?.name || u.etablissementId;
              const isSuper = u.role === "superadmin";
              const roleColor = isSuper ? t.gold : u.role === "admin" ? t.accent : t.green;
              const roleBg = isSuper ? t.goldBg : u.role === "admin" ? t.accentBg : t.greenBg;

              return (
                <div key={u.id} style={{ display:"grid", gridTemplateColumns:"minmax(200px, 1fr) 120px 200px 100px", alignItems:"center", gap:"10px", padding:"12px 24px", borderBottom:`1px solid ${t.border2}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                    <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:t.surface3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"800", color:t.text }}>
                      {u.email ? u.email.charAt(0).toUpperCase() : "?"}
                    </div>
                    <span style={{ fontSize:"13px", fontWeight:"600", color:t.text }}>{u.email}</span>
                  </div>
                  
                  <div>
                    <span style={{ background:roleBg, color:roleColor, border:`1px solid ${roleColor}40`, padding:"3px 8px", borderRadius:"6px", fontSize:"10px", fontWeight:"800", textTransform:"uppercase" }}>
                      {u.role}
                    </span>
                  </div>

                  <span style={{ fontSize:"12px", color:t.text2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {isSuper ? "Tous (Réseau global)" : ifsiName}
                  </span>

                  <div style={{ display:"flex", gap:"8px" }}>
                    <button onClick={() => handleSendResetEmail(u.email)} title="Reset Mdp" style={{ background:t.surface2, border:`1px solid ${t.border}`, padding:"6px", borderRadius:"6px", cursor:"pointer", color:t.text2 }}>🔑</button>
                    {userProfile?.role === "superadmin" && !isSuper && (
                      <button onClick={() => handleDeleteUser(u.id)} title="Supprimer" style={{ background:t.redBg, border:`1px solid ${t.redBd}`, padding:"6px", borderRadius:"6px", cursor:"pointer", color:t.red }}>🗑️</button>
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
          <div style={{ fontSize:"14px", fontWeight:"800", color:t.text, marginBottom:"16px" }}>+ Inviter un nouveau membre</div>
          <div style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
            <input type="email" placeholder="Adresse e-mail" value={newMember.email} onChange={e=>setNewMember({...newMember, email:e.target.value})} style={{ flex:1, minWidth:"200px", padding:"10px 14px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"13px" }}/>
            <input type="password" placeholder="Mot de passe temporaire" value={newMember.pwd} onChange={e=>setNewMember({...newMember, pwd:e.target.value})} style={{ flex:1, minWidth:"150px", padding:"10px 14px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"13px" }}/>
            <select value={newMember.role} onChange={e=>setNewMember({...newMember, role:e.target.value})} style={{ padding:"10px 14px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"13px", cursor:"pointer" }}>
              <option value="user">Éditeur (Standard)</option>
              <option value="admin">Administrateur IFSI</option>
            </select>
            <button onClick={handleCreateUser} disabled={isCreatingUser} style={{ background:t.accent, color:"white", border:"none", padding:"10px 20px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:isCreatingUser?"not-allowed":"pointer", boxShadow:`0 4px 10px ${t.accentBd}` }}>
              {isCreatingUser ? "Création..." : "Envoyer l'invitation"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 👤 ONGLET : COMPTE PERSONNEL (Design Parfait Claude)
// ----------------------------------------------------------------------
export function CompteTab({ auth, userProfile, pwdUpdate, setPwdUpdate, handleChangePassword, isDarkMode, setIsDarkMode, isColorblindMode, setIsColorblindMode, t }) {
  return (
    <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"20px", maxWidth:"800px", margin:"0 auto", paddingBottom:"40px" }}>
      
      {/* Header Profil */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"32px", display:"flex", alignItems:"center", gap:"24px", boxShadow:t.shadowSm }}>
        <div style={{ width:"80px", height:"80px", borderRadius:"20px", background:t.accentBg, border:`2px solid ${t.accentBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"32px", fontWeight:"800", color:t.accent, flexShrink:0 }}>
          {auth.currentUser?.email?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"32px", color:t.text, margin:"0 0 6px 0" }}>Mon Profil</h2>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <span style={{ fontSize:"14px", color:t.text2, fontWeight:"500" }}>{auth.currentUser?.email}</span>
            <span style={{ background:t.surface2, border:`1px solid ${t.border}`, color:t.text3, fontSize:"10px", fontWeight:"800", padding:"3px 8px", borderRadius:"6px", textTransform:"uppercase" }}>
              {userProfile?.role || "Utilisateur"}
            </span>
          </div>
        </div>
      </div>

      {/* Paramètres d'interface */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
        <div style={{ padding:"16px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
          <span style={{ fontSize:"14px", fontWeight:"800", color:t.text }}>🎨 Apparence & Accessibilité</span>
        </div>
        <div style={{ padding:"24px", display:"flex", flexDirection:"column", gap:"16px" }}>
          
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingBottom:"16px", borderBottom:`1px solid ${t.border2}` }}>
            <div>
              <div style={{ fontSize:"14px", fontWeight:"600", color:t.text, marginBottom:"4px" }}>Thème sombre (Midnight)</div>
              <div style={{ fontSize:"12px", color:t.text2 }}>Protège les yeux et réduit la fatigue visuelle.</div>
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ background:isDarkMode?t.accent:t.surface2, color:isDarkMode?"white":t.text, border:`1px solid ${isDarkMode?t.accentBd:t.border}`, padding:"8px 16px", borderRadius:"8px", fontSize:"12px", fontWeight:"700", cursor:"pointer", transition:"all 0.2s" }}>
              {isDarkMode ? "Activé" : "Désactivé"}
            </button>
          </div>
          
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:"14px", fontWeight:"600", color:t.text, marginBottom:"4px" }}>Mode Daltonien</div>
              <div style={{ fontSize:"12px", color:t.text2 }}>Remplace le rouge/vert par des couleurs à fort contraste.</div>
            </div>
            <button onClick={() => setIsColorblindMode(!isColorblindMode)} style={{ background:isColorblindMode?t.accent:t.surface2, color:isColorblindMode?"white":t.text, border:`1px solid ${isColorblindMode?t.accentBd:t.border}`, padding:"8px 16px", borderRadius:"8px", fontSize:"12px", fontWeight:"700", cursor:"pointer", transition:"all 0.2s" }}>
              {isColorblindMode ? "Activé" : "Désactivé"}
            </button>
          </div>

        </div>
      </div>

      {/* Notifications (Factice pour UI) */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
        <div style={{ padding:"16px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
          <span style={{ fontSize:"14px", fontWeight:"800", color:t.text }}>🔔 Notifications</span>
        </div>
        <div style={{ padding:"24px", display:"flex", flexDirection:"column", gap:"16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingBottom:"16px", borderBottom:`1px solid ${t.border2}` }}>
            <div>
              <div style={{ fontSize:"14px", fontWeight:"600", color:t.text, marginBottom:"4px" }}>Alerte d'échéance proche (J-30)</div>
              <div style={{ fontSize:"12px", color:t.text2 }}>Recevoir un email quand un indicateur approche de sa date butoir.</div>
            </div>
            <input type="checkbox" defaultChecked style={{ width:"20px", height:"20px", accentColor:t.accent }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:"14px", fontWeight:"600", color:t.text, marginBottom:"4px" }}>Rapport mensuel</div>
              <div style={{ fontSize:"12px", color:t.text2 }}>Résumé de la conformité du réseau le 1er du mois.</div>
            </div>
            <input type="checkbox" defaultChecked style={{ width:"20px", height:"20px", accentColor:t.accent }} />
          </div>
        </div>
      </div>

      {/* Sécurité (Mot de passe) */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
        <div style={{ padding:"16px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
          <span style={{ fontSize:"14px", fontWeight:"800", color:t.text }}>🔒 Sécurité du compte</span>
        </div>
        <div style={{ padding:"24px" }}>
          <div style={{ fontSize:"13px", color:t.text2, marginBottom:"16px" }}>Changer votre mot de passe (Minimum 6 caractères)</div>
          <form onSubmit={handleChangePassword} style={{ display:"flex", gap:"12px", alignItems:"flex-start", flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:"200px" }}>
              <input type="password" placeholder="Nouveau mot de passe" value={pwdUpdate.p1} onChange={e=>setPwdUpdate({...pwdUpdate, p1:e.target.value})} style={{ width:"100%", padding:"10px 14px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"13px" }} required minLength={6}/>
            </div>
            <button type="submit" disabled={pwdUpdate.loading} style={{ background:t.accent, color:"white", border:"none", padding:"11px 20px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:pwdUpdate.loading?"not-allowed":"pointer", boxShadow:`0 4px 10px ${t.accentBd}`, whiteSpace:"nowrap" }}>
              {pwdUpdate.loading ? "Mise à jour..." : "Mettre à jour"}
            </button>
          </form>
          {pwdUpdate.error && <div style={{ color:t.red, fontSize:"12px", marginTop:"10px", fontWeight:"600", padding:"8px", background:t.redBg, borderRadius:"6px" }}>{pwdUpdate.error}</div>}
          {pwdUpdate.success && <div style={{ color:t.green, fontSize:"12px", marginTop:"10px", fontWeight:"600", padding:"8px", background:t.greenBg, borderRadius:"6px" }}>{pwdUpdate.success}</div>}
        </div>
      </div>

      {/* Zone Danger */}
      <div style={{ background:t.surface, border:`1px solid ${t.dangerBd}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm }}>
        <div style={{ padding:"20px 24px" }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"20px", color:t.danger, marginBottom:"6px" }}>⚠️ Zone dangereuse</div>
          <div style={{ fontSize:"12px", color:t.text2, marginBottom:"20px" }}>Ces actions sont définitives et ne peuvent pas être annulées.</div>
          
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"8px" }}>
              <div>
                <div style={{ fontSize:"13px", fontWeight:"700", color:t.text, marginBottom:"4px" }}>Exporter mes données</div>
                <div style={{ fontSize:"11px", color:t.text3 }}>Télécharger toutes mes données au format JSON</div>
              </div>
              <button onClick={()=>alert("Export en cours...")} style={{ background:t.accentBg, border:`1px solid ${t.accentBd}`, color:t.accent, padding:"8px 16px", borderRadius:"6px", fontSize:"12px", fontWeight:"700", cursor:"pointer" }}>Exporter</button>
            </div>
            
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:t.dangerBg, border:`1px solid ${t.dangerBd}`, borderRadius:"8px" }}>
              <div>
                <div style={{ fontSize:"13px", fontWeight:"700", color:t.danger, marginBottom:"4px" }}>Désactiver mon compte</div>
                <div style={{ fontSize:"11px", color:t.danger, opacity:0.8 }}>Votre accès sera suspendu immédiatement</div>
              </div>
              <button onClick={()=>alert("Contactez votre Super Admin pour désactiver votre compte.")} style={{ background:t.danger, border:"none", color:"white", padding:"8px 16px", borderRadius:"6px", fontSize:"12px", fontWeight:"700", cursor:"pointer", boxShadow:`0 2px 8px ${t.dangerBd}` }}>Désactiver</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
