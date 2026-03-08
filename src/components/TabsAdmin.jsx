import React, { useState, useMemo } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ONGLET ADMINISTRATION (Regroupe Membres, Établissement, Médiathèque...)
// ─────────────────────────────────────────────────────────────────────────────
export function EquipeTab({ 
  userProfile, newMember, setNewMember, isCreatingUser, handleCreateUser, 
  sortedTeamUsers, handleDeleteUser, handleSendResetEmail, t 
}) {
  const [subTab, setSubTab] = useState("membres");
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("Tous");
  const [filterStatus, setFilterStatus] = useState("Tous");

  const TABS = [
    { id: "membres", label: "Membres" },
    { id: "etablissement", label: "Établissement" },
    { id: "mediatheque", label: "Médiathèque" },
    { id: "journal", label: "Journal d'accès" },
    { id: "parametres", label: "Paramètres" }
  ];

  // Filtrage des membres
  const filteredUsers = useMemo(() => {
    return sortedTeamUsers.filter(u => {
      if (u.role === "superadmin") return false; // On cache le superadmin
      
      const matchSearch = (u.email || "").toLowerCase().includes(search.toLowerCase()) || 
                          (u.prenom || "").toLowerCase().includes(search.toLowerCase()) || 
                          (u.nom || "").toLowerCase().includes(search.toLowerCase());
      
      const matchRole = filterRole === "Tous" || u.role === filterRole || (u.orgRoles && u.orgRoles.includes(filterRole));
      const matchStatus = filterStatus === "Tous" || u.status === filterStatus;
      
      return matchSearch && matchRole && matchStatus;
    });
  }, [sortedTeamUsers, search, filterRole, filterStatus]);

  // Action : Suspendre / Activer un compte
  const handleToggleStatus = async (user) => {
    const newStatus = user.status === "ACTIF" ? "INACTIF" : "ACTIF";
    if (window.confirm(`Voulez-vous vraiment passer le compte de ${user.email} en statut ${newStatus} ?`)) {
      await setDoc(doc(db, "users", user.id), { status: newStatus }, { merge: true });
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", animation:"fadeIn 0.3s ease" }}>
      <style>{`
        @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        .animate-slide-down { animation: slideDown 0.2s ease-out forwards; }
      `}</style>

      {/* HEADER & NAVIGATION */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"32px", color:t.text, margin:"0 0 24px 0" }}>Administration</h2>
        <div style={{ display:"flex", gap:"32px", borderBottom:`1px solid ${t.border}` }}>
          {TABS.map(tab => {
            const isActive = subTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setSubTab(tab.id)}
                style={{ 
                  padding:"0 0 12px 0", background:"transparent", border:"none", 
                  borderBottom: isActive ? `2px solid ${t.accent}` : "2px solid transparent",
                  color: isActive ? t.text : t.text3, fontSize:"14px", fontWeight: isActive ? "700" : "500",
                  cursor:"pointer", transition:"all 0.2s", marginBottom:"-1px"
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── SOUS-ONGLET : MEMBRES ─── */}
      {subTab === "membres" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"20px", flex:1, overflow:"hidden" }}>
          
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:"18px", fontWeight:"800", color:t.text }}>Membres de l'équipe</div>
              <div style={{ fontSize:"12px", color:t.text2, marginTop:"4px" }}>Gérez les accès et les rôles de vos collaborateurs</div>
            </div>
            <button 
              onClick={() => setShowInvite(!showInvite)}
              style={{ background:showInvite?t.surface2:t.accent, color:showInvite?t.text:"white", border:showInvite?`1px solid ${t.border}`:"none", padding:"10px 18px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", display:"flex", alignItems:"center", gap:"8px", transition:"all 0.2s", boxShadow:showInvite?"none":`0 4px 12px ${t.accentBd}` }}
            >
              {showInvite ? "✕ Fermer" : "➕ Inviter un membre"}
            </button>
          </div>

          {/* PANNEAU D'INVITATION ANIMÉ */}
          {showInvite && (
            <div className="animate-slide-down" style={{ background:t.surface, border:`1px dashed ${t.accentBd}`, borderRadius:"12px", padding:"20px", display:"flex", alignItems:"flex-end", gap:"16px", boxShadow:t.shadowSm }}>
              <div style={{ flex:1 }}>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px" }}>Email professionnel</label>
                <input type="email" value={newMember.email} onChange={e=>setNewMember({...newMember, email:e.target.value})} placeholder="jean.dupont@ifps.fr" style={{ width:"100%", padding:"10px 12px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"13px", fontFamily:"'DM Mono', monospace" }} />
              </div>
              <div style={{ flex:1 }}>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px" }}>Mot de passe initial</label>
                <input type="password" value={newMember.pwd} onChange={e=>setNewMember({...newMember, pwd:e.target.value})} placeholder="••••••••" style={{ width:"100%", padding:"10px 12px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"13px" }} />
              </div>
              <div style={{ width:"200px" }}>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px" }}>Niveau d'accès</label>
                <select value={newMember.role} onChange={e=>setNewMember({...newMember, role:e.target.value})} style={{ width:"100%", padding:"10px 12px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"13px", cursor:"pointer" }}>
                  <option value="user">Utilisateur (Lecteur)</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <button onClick={handleCreateUser} disabled={isCreatingUser} style={{ background:t.accent, color:"white", border:"none", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", height:"40px", display:"flex", alignItems:"center", boxShadow:`0 4px 12px ${t.accentBd}` }}>
                {isCreatingUser ? "Création..." : "Envoyer l'invitation"}
              </button>
            </div>
          )}

          {/* BARRE DE FILTRES */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:t.surface, padding:"12px 16px", borderRadius:"12px", border:`1px solid ${t.border}`, boxShadow:t.shadowSm }}>
            <div style={{ display:"flex", gap:"16px", alignItems:"center" }}>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", color:t.text3, fontSize:"14px" }}>🔍</span>
                <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher par nom, email..." style={{ width:"240px", padding:"8px 12px 8px 36px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"13px" }} />
              </div>
              
              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                <span style={{ fontSize:"11px", fontWeight:"700", color:t.text3, textTransform:"uppercase" }}>Rôle :</span>
                <select value={filterRole} onChange={e=>setFilterRole(e.target.value)} style={{ padding:"8px 12px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"12px", cursor:"pointer" }}>
                  <option value="Tous">Tous les rôles</option>
                  <option value="admin">Administrateur</option>
                  <option value="user">Utilisateur</option>
                </select>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                <span style={{ fontSize:"11px", fontWeight:"700", color:t.text3, textTransform:"uppercase" }}>Statut :</span>
                <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ padding:"8px 12px", borderRadius:"8px", border:`1px solid ${t.border}`, background:t.surface2, color:t.text, outline:"none", fontSize:"12px", cursor:"pointer" }}>
                  <option value="Tous">Tous les statuts</option>
                  <option value="ACTIF">Actif</option>
                  <option value="INACTIF">Inactif</option>
                  <option value="CONGÉ">En congé</option>
                </select>
              </div>
            </div>

            <div style={{ background:t.surface2, border:`1px solid ${t.border}`, padding:"6px 12px", borderRadius:"20px", fontSize:"11px", fontWeight:"800", color:t.text2 }}>
              {filteredUsers.length} MEMBRE{filteredUsers.length > 1 ? 'S' : ''}
            </div>
          </div>

          {/* TABLEAU DES MEMBRES */}
          <div className="scroll-container" style={{ flex:1, overflowY:"auto", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", boxShadow:t.shadowSm }}>
            <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left" }}>
              <thead style={{ background:t.surface2, position:"sticky", top:0, zIndex:10 }}>
                <tr>
                  <th style={{ padding:"14px 20px", fontSize:"10px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", borderBottom:`1px solid ${t.border}` }}>Membre</th>
                  <th style={{ padding:"14px 20px", fontSize:"10px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", borderBottom:`1px solid ${t.border}` }}>Rôle (Accès)</th>
                  <th style={{ padding:"14px 20px", fontSize:"10px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", borderBottom:`1px solid ${t.border}` }}>Statut</th>
                  <th style={{ padding:"14px 20px", fontSize:"10px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", borderBottom:`1px solid ${t.border}` }}>Dernier Accès</th>
                  <th style={{ padding:"14px 20px", fontSize:"10px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", borderBottom:`1px solid ${t.border}`, textAlign:"right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding:"40px", textAlign:"center", color:t.text3, fontStyle:"italic", fontSize:"13px" }}>Aucun membre ne correspond à votre recherche.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const initials = `${(u.prenom || "?")[0]}${(u.nom || "?")[0]}`.toUpperCase();
                    const isActif = u.status === "ACTIF";
                    
                    return (
                      <tr key={u.id} style={{ borderBottom:`1px solid ${t.border}`, transition:"background 0.2s" }} onMouseOver={e=>e.currentTarget.style.background=t.surface2} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                        {/* IDENTITÉ */}
                        <td style={{ padding:"12px 20px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                            <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:t.surface3, border:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:t.text, fontSize:"12px", fontWeight:"800" }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontSize:"13px", fontWeight:"700", color:t.text }}>{u.prenom} {u.nom}</div>
                              <div style={{ fontSize:"11px", color:t.text3, fontFamily:"'DM Mono', monospace", marginTop:"2px" }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        
                        {/* RÔLE SYSTEME */}
                        <td style={{ padding:"12px 20px" }}>
                          <span style={{ 
                            background: u.role === "admin" ? t.goldBg : t.surface3, 
                            color: u.role === "admin" ? t.gold : t.text2, 
                            border: `1px solid ${u.role === "admin" ? t.goldBd : t.border}`, 
                            padding:"4px 10px", borderRadius:"6px", fontSize:"10px", fontWeight:"800", textTransform:"uppercase" 
                          }}>
                            {u.role === "admin" ? "Administrateur" : "Utilisateur"}
                          </span>
                        </td>

                        {/* STATUT */}
                        <td style={{ padding:"12px 20px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                            <div style={{ width:"8px", height:"8px", borderRadius:"50%", background: isActif ? t.green : (u.status === "CONGÉ" ? t.amber : t.text3) }} />
                            <span style={{ fontSize:"12px", fontWeight:"600", color: isActif ? t.text : t.text2 }}>{u.status || "ACTIF"}</span>
                          </div>
                        </td>

                        {/* DERNIER ACCÈS */}
                        <td style={{ padding:"12px 20px", fontSize:"12px", color:t.text3 }}>
                           {/* Placeholder : Cette data devra être injectée via le Auth tracking plus tard */}
                           Il y a 2 jours
                        </td>

                        {/* ACTIONS */}
                        <td style={{ padding:"12px 20px", textAlign:"right" }}>
                          <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
                            <button onClick={() => handleSendResetEmail(u.email)} title="Envoyer lien de réinitialisation de mot de passe" style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"6px", width:"28px", height:"28px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:t.text, transition:"all 0.2s", boxShadow:t.shadowSm }} onMouseOver={e=>e.currentTarget.style.borderColor=t.accent} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}>
                              🔑
                            </button>
                            <button onClick={() => handleToggleStatus(u)} title={isActif ? "Suspendre l'accès" : "Réactiver l'accès"} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"6px", width:"28px", height:"28px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:t.text, transition:"all 0.2s", boxShadow:t.shadowSm }} onMouseOver={e=>e.currentTarget.style.borderColor=t.amber} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}>
                              {isActif ? "⏸️" : "▶️"}
                            </button>
                            <button onClick={() => handleDeleteUser(u.id)} title="Supprimer définitivement" style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"6px", width:"28px", height:"28px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:t.red, transition:"all 0.2s", boxShadow:t.shadowSm }} onMouseOver={e=>e.currentTarget.style.borderColor=t.red} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}>
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PLACHOLDERS POUR LES PROCHAINS ONGLETS */}
      {subTab === "etablissement" && <div style={{ padding:"40px", textAlign:"center", color:t.text3 }}>Paramètres de l'établissement à venir...</div>}
      {subTab === "mediatheque"   && <div style={{ padding:"40px", textAlign:"center", color:t.text3 }}>Gestion des documents à venir...</div>}
      {subTab === "journal"       && <div style={{ padding:"40px", textAlign:"center", color:t.text3 }}>Historique de connexion à venir...</div>}
      {subTab === "parametres"    && <div style={{ padding:"40px", textAlign:"center", color:t.text3 }}>Paramètres avancés à venir...</div>}

    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// 2. ONGLET COMPTE (Mon Profil, Sécurité, etc.) - Gardé intact pour l'instant
// ─────────────────────────────────────────────────────────────────────────────
export function CompteTab({ auth, userProfile, pwdUpdate, setPwdUpdate, handleChangePassword, isDarkMode, setIsDarkMode, isColorblindMode, setIsColorblindMode, t }) {
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", animation:"fadeIn 0.3s ease" }}>
      <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "32px", color: t.text, marginBottom: "24px" }}>Mon Compte</h2>
      
      {/* IDENTITÉ */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "24px", marginBottom: "24px", boxShadow:t.shadowSm }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: t.accentBg, border:`1px solid ${t.accentBd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "800", color: t.accent }}>
            {auth.currentUser?.email?.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: t.text }}>{auth.currentUser?.email?.split('@')[0]}</div>
            <div style={{ fontSize: "14px", color: t.text2, marginTop: "4px", fontFamily: "'DM Mono', monospace" }}>{auth.currentUser?.email}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <span style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text, padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "700" }}>
            Rôle : {userProfile?.role || "Utilisateur"}
          </span>
        </div>
      </div>

      {/* PRÉFÉRENCES */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "24px", marginBottom: "24px", boxShadow:t.shadowSm }}>
        <h3 style={{ fontSize: "14px", fontWeight: "800", color: t.text, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "20px" }}>Préférences d'affichage</h3>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: "8px", marginBottom: "12px" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: t.text }}>Thème sombre</div>
            <div style={{ fontSize: "12px", color: t.text3, marginTop:"4px" }}>Interface optimisée pour la fatigue visuelle</div>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ background: isDarkMode ? t.accent : t.surface, border: `1px solid ${isDarkMode ? t.accent : t.border}`, color: isDarkMode ? "white" : t.text, padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}>
            {isDarkMode ? "Activé" : "Désactivé"}
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: "8px" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: t.text }}>Mode Daltonien</div>
            <div style={{ fontSize: "12px", color: t.text3, marginTop:"4px" }}>Modifie les couleurs de conformité</div>
          </div>
          <button onClick={() => setIsColorblindMode(!isColorblindMode)} style={{ background: isColorblindMode ? t.accent : t.surface, border: `1px solid ${isColorblindMode ? t.accent : t.border}`, color: isColorblindMode ? "white" : t.text, padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}>
            {isColorblindMode ? "Activé" : "Désactivé"}
          </button>
        </div>
      </div>

      {/* SÉCURITÉ */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "24px", boxShadow:t.shadowSm }}>
        <h3 style={{ fontSize: "14px", fontWeight: "800", color: t.text, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "20px" }}>Sécurité</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: t.text2, marginBottom: "8px" }}>Nouveau mot de passe</label>
            <input type="password" value={pwdUpdate.p1} onChange={e => setPwdUpdate({ ...pwdUpdate, p1: e.target.value })} placeholder="••••••••" style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.surface2, color: t.text, outline: "none", fontSize: "14px" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: t.text2, marginBottom: "8px" }}>Confirmer le mot de passe</label>
            <input type="password" value={pwdUpdate.p2} onChange={e => setPwdUpdate({ ...pwdUpdate, p2: e.target.value })} placeholder="••••••••" style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.surface2, color: t.text, outline: "none", fontSize: "14px" }} />
          </div>
          
          {pwdUpdate.error && <div style={{ color: t.red, fontSize: "12px", fontWeight: "600", padding:"10px", background:t.redBg, borderRadius:"6px" }}>{pwdUpdate.error}</div>}
          {pwdUpdate.success && <div style={{ color: t.green, fontSize: "12px", fontWeight: "600", padding:"10px", background:t.greenBg, borderRadius:"6px" }}>{pwdUpdate.success}</div>}
          
          <button onClick={handleChangePassword} disabled={pwdUpdate.loading} style={{ background: t.accent, color: "white", border: "none", padding: "14px", borderRadius: "8px", fontSize: "14px", fontWeight: "700", cursor: "pointer", marginTop: "8px", boxShadow:`0 4px 12px ${t.accentBd}` }}>
            {pwdUpdate.loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
          </button>
        </div>
      </div>

    </div>
  );
}
