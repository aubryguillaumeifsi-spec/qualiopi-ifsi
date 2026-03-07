import React, { useState } from "react";

export default function OrganigrammeTab({ currentIfsiName, orgRoles, orgJobTitles, allIfsiMembers, criteres, userProfile, getRoleColor, handleAddJobTitle, handleRemoveJobTitle, handleAddManualUser, handleUpdateUserDetail, t }) {
  
  const [editForm, setEditForm] = useState(null);

  const isAdminOrSuper = userProfile?.role === "admin" || userProfile?.role === "superadmin";
  const isSuperAdmin = userProfile?.role === "superadmin";

  const getUserStats = (person) => {
    const userCriteres = criteres.filter(c => 
      c.responsables && c.responsables.some(resp => 
        resp.toLowerCase().includes(person.nom.toLowerCase()) || 
        (person.email && resp.toLowerCase().includes(person.email.toLowerCase()))
      )
    );
    
    const total = userCriteres.length;
    const conf = userCriteres.filter(c => c.statut === "conforme").length;
    const ec = userCriteres.filter(c => c.statut === "en-cours").length;
    const nc = userCriteres.filter(c => c.statut === "non-conforme").length;
    const pct = total > 0 ? Math.round((conf / total) * 100) : 0;
    
    return { total, conf, ec, nc, pct };
  };

  const safeMembers = allIfsiMembers.map(m => ({
    ...m, 
    prenom: m.prenom || "Membre", 
    nom: m.nom || "", 
    roles: m.roles || [],
    jobTitles: Array.isArray(m.jobTitles) ? m.jobTitles : [],
    stats: getUserStats(m)
  })).filter(m => !m.archived);

  // Le membre actuellement visualisé ou édité
  const selectedPerson = editForm?.id ? safeMembers.find(m => m.id === editForm.id) : null;

  const handleArchiveUser = async () => {
    if (window.confirm(`Archiver ${selectedPerson.prenom} ${selectedPerson.nom} ? Cette personne n'apparaîtra plus dans la liste.`)) {
      await handleUpdateUserDetail(selectedPerson.id, selectedPerson.type, { archived: true });
      setEditForm(null);
    }
  };

  const openViewPanel = (m) => {
    setEditForm({ ...m, isEditing: false });
  };

  const openCreatePanel = () => {
    setEditForm({ isNew: true, isEditing: true, prenom: "", nom: "", email: "", phone: "", jobTitles: [], roles: [], status: "ACTIF" });
  };

  const toggleArrayItem = (array, item) => array.includes(item) ? array.filter(i => i !== item) : [...array, item];

  const submitForm = async () => {
    if (!editForm.prenom || !editForm.nom) return alert("Le Prénom et le Nom sont requis.");
    
    if (editForm.isNew) {
      handleAddManualUser(editForm);
    } else {
      await handleUpdateUserDetail(editForm.id, editForm.type, {
        prenom: editForm.prenom,
        nom: editForm.nom,
        email: editForm.email,
        phone: editForm.phone,
        jobTitles: editForm.jobTitles,
        roles: editForm.roles,
        status: editForm.status
      });
    }
    // On repasse en mode Vue
    setEditForm(editForm.isNew ? null : { ...editForm, isEditing: false });
  };

  return (
    <div className="animate-fade-in" style={{ display:"flex", gap:"24px", height:"100%" }}>
      
      {/* ── ZONE GAUCHE : La Grille des collaborateurs ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"20px", overflow:"hidden" }}>
        
        {/* LÉGENDES ET BOUTONS */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", background:t.surface, padding:"12px 16px", borderRadius:"12px", border:`1px solid ${t.border}`, boxShadow:t.shadowSm, flexWrap:"wrap", maxWidth:"700px" }}>
              <span style={{ fontSize:"11px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginRight:"8px" }}>Pôles :</span>
              {orgRoles.map(r => {
                const rc = getRoleColor(r);
                return (
                  <div key={r} style={{ display:"flex", alignItems:"center", gap:"6px", background:rc.bg, border:`1px solid ${rc.bd}`, padding:"4px 10px", borderRadius:"20px" }}>
                    <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:rc.text }}/>
                    <span style={{ fontSize:"11px", fontWeight:"700", color:rc.text }}>{r}</span>
                  </div>
                )
              })}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:"16px", background:t.surface, padding:"10px 16px", borderRadius:"8px", border:`1px solid ${t.border}`, boxShadow:t.shadowSm, alignSelf:"flex-start" }}>
              <span style={{ fontSize:"10px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"0.5px" }}>Barres d'indicateurs :</span>
              <div style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"11px", color:t.text, fontWeight:"600" }}><div style={{ width:"12px", height:"4px", background:t.green, borderRadius:"2px" }}/> Conforme</div>
              <div style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"11px", color:t.text, fontWeight:"600" }}><div style={{ width:"12px", height:"4px", background:t.amber, borderRadius:"2px" }}/> En cours</div>
              <div style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"11px", color:t.text, fontWeight:"600" }}><div style={{ width:"12px", height:"4px", background:t.red, borderRadius:"2px" }}/> Non conforme</div>
            </div>
          </div>

          <div style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, padding:"10px 16px", borderRadius:"12px", boxShadow:t.shadowSm, display:"flex", alignItems:"center", gap:"12px" }}>
               <span style={{ fontSize:"12px", fontWeight:"700", color:t.text2 }}>Effectif :</span>
               <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:t.text, lineHeight:1 }}>{safeMembers.length}</span>
            </div>

            {isAdminOrSuper && (
              <button onClick={openCreatePanel} style={{ background:t.surface2, border:`1px solid ${t.border}`, color:t.text, padding:"10px 16px", borderRadius:"12px", fontSize:"13px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm }}>
                👤 Nouveau collaborateur
              </button>
            )}
          </div>
        </div>

        {/* LA GRILLE DES CARTES */}
        <div className="scroll-container" style={{ flex:1, overflowY:"auto", paddingRight:"8px", paddingBottom:"20px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:"20px" }}>
            
            {safeMembers.map(m => {
              const primaryRole = m.roles[0];
              const rc = getRoleColor(primaryRole);
              const stColor = m.status === "ACTIF" ? t.green : t.amber;
              const stBg = m.status === "ACTIF" ? t.greenBg : t.amberBg;

              return (
                <div 
                  key={m.id}
                  onClick={() => openViewPanel(m)}
                  style={{ background:t.surface, border:`1px solid ${editForm?.id === m.id ? rc.text : t.border}`, borderRadius:"12px", padding:"16px", cursor:"pointer", transition:"all 0.2s", boxShadow: editForm?.id === m.id ? `0 4px 12px ${rc.bg}` : t.shadowSm, display:"flex", flexDirection:"column" }}
                  onMouseOver={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 6px 16px ${rc.bg}`; }}
                  onMouseOut={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=editForm?.id === m.id ? `0 4px 12px ${rc.bg}` : t.shadowSm; }}
                >
                  <div style={{ fontSize:"10px", fontWeight:"800", color:rc.text, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>
                    {primaryRole || "Non assigné"}
                  </div>

                  <div style={{ display:"flex", alignItems:"flex-start", gap:"16px", marginBottom:"24px" }}>
                    <div style={{ width:"48px", height:"48px", borderRadius:"12px", background:rc.bg, border:`1px solid ${rc.bd}`, color:rc.text, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:"800", flexShrink:0 }}>
                      {m.prenom.charAt(0)}{m.nom ? m.nom.charAt(0) : ""}
                    </div>
                    <div style={{ overflow:"hidden" }}>
                      <div style={{ fontSize:"15px", fontWeight:"800", color:t.text, lineHeight:"1.2" }}>{m.prenom} <br/>{m.nom}</div>
                      <div style={{ fontSize:"11px", color:t.text2, marginTop:"4px", fontWeight:"500", whiteSpace:"nowrap", textOverflow:"ellipsis", overflow:"hidden" }}>{m.jobTitles.join(', ') || "Aucune fonction"}</div>
                      <div style={{ display:"inline-block", background:stBg, color:stColor, border:`1px solid ${stColor}40`, padding:"2px 8px", borderRadius:"4px", fontSize:"9px", fontWeight:"800", marginTop:"6px", textTransform:"uppercase" }}>
                        {m.status}
                      </div>
                    </div>
                  </div>

                  {/* Barre d'indicateurs de la personne (en bas de carte) */}
                  <div style={{ marginTop:"auto" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"11px", fontWeight:"700", color:t.text3, marginBottom:"6px" }}>
                      <span>{m.stats.total > 0 ? `${m.stats.conf}/${m.stats.total} ind.` : "Aucun ind."}</span>
                      <span style={{ color: m.stats.pct >= 90 ? t.green : m.stats.pct >= 50 ? t.amber : t.text3 }}>{m.stats.pct}%</span>
                    </div>
                    <div style={{ height:"6px", background:t.surface2, borderRadius:"3px", display:"flex", gap:"2px", overflow:"hidden", border:`1px solid ${t.border}` }}>
                      {m.stats.conf > 0 && <div style={{ width:`${(m.stats.conf/m.stats.total)*100}%`, background:t.green, height:"100%" }}/>}
                      {m.stats.ec > 0 && <div style={{ width:`${(m.stats.ec/m.stats.total)*100}%`, background:t.amber, height:"100%" }}/>}
                      {m.stats.nc > 0 && <div style={{ width:`${(m.stats.nc/m.stats.total)*100}%`, background:t.red, height:"100%" }}/>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ZONE DROITE : PANNEAU LATÉRAL (Vue / Création / Édition) ── */}
      {editForm && (
        <div className="animate-fade-in" style={{ width:"380px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"16px", display:"flex", flexDirection:"column", boxShadow:t.shadow, flexShrink:0, overflow:"hidden" }}>
          
          {/* HEADER DU PANNEAU */}
          <div style={{ padding:"24px 20px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
            <div style={{ display:"flex", gap:"16px", alignItems:"center", width:"100%" }}>
              <div style={{ width:"64px", height:"64px", borderRadius:"16px", background:getRoleColor(editForm.roles[0]).bg, border:`1px solid ${getRoleColor(editForm.roles[0]).bd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", fontWeight:"800", color:getRoleColor(editForm.roles[0]).text, flexShrink:0 }}>
                {editForm.prenom ? editForm.prenom.charAt(0) : ""}{editForm.nom ? editForm.nom.charAt(0) : ""}
              </div>
              <div style={{ flex:1 }}>
                {editForm.isEditing ? (
                   <div style={{ display:"flex", gap:"8px", marginBottom:"4px" }}>
                     <input type="text" value={editForm.prenom} onChange={e=>setEditForm({...editForm, prenom: e.target.value})} placeholder="Prénom" style={{ width:"100%", border:`1px dashed ${t.border}`, background:"transparent", color:t.text, fontSize:"16px", fontWeight:"800", outline:"none" }} />
                     <input type="text" value={editForm.nom} onChange={e=>setEditForm({...editForm, nom: e.target.value})} placeholder="Nom" style={{ width:"100%", border:`1px dashed ${t.border}`, background:"transparent", color:t.text, fontSize:"16px", fontWeight:"800", outline:"none" }} />
                   </div>
                ) : (
                   <div style={{ fontSize:"20px", fontWeight:"800", color:t.text }}>{editForm.prenom} {editForm.nom}</div>
                )}
                
                <div style={{ fontSize:"13px", color:t.text2, marginTop:"4px" }}>{editForm.jobTitles.join(', ') || "Aucune fonction"}</div>
                
                {!editForm.isNew && (
                  <div style={{ marginTop:"8px" }}>
                    <span onClick={() => editForm.isEditing && setEditForm({...editForm, status: editForm.status === "ACTIF" ? "CONGÉ" : "ACTIF"})} style={{ background:editForm.status==="ACTIF"?t.greenBg:t.amberBg, color:editForm.status==="ACTIF"?t.green:t.amber, border:`1px solid ${editForm.status==="ACTIF"?t.greenBd:t.amberBd}`, fontSize:"10px", fontWeight:"800", padding:"3px 10px", borderRadius:"12px", cursor:editForm.isEditing?"pointer":"default" }}>
                      {editForm.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display:"flex", gap:"8px", flexShrink:0 }}>
              {isAdminOrSuper && !editForm.isEditing && (
                 <button onClick={() => setEditForm({...editForm, isEditing: true})} style={{ background:"transparent", border:"none", color:t.text3, fontSize:"16px", cursor:"pointer", width:"32px", height:"32px", display:"flex", alignItems:"center", justifyContent:"center" }} title="Éditer">✏️</button>
              )}
              <button onClick={() => setEditForm(null)} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"8px", color:t.text3, fontSize:"16px", cursor:"pointer", width:"32px", height:"32px", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>
          </div>

          <div style={{ padding:"24px 20px", flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:"24px" }}>
            
            {/* CONTACT */}
            <div>
              <div style={{ fontSize:"11px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>Contact</div>
              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px", color:t.text2, fontSize:"14px" }}>
                  <span>✉️</span>
                  {editForm.isEditing ? (
                    <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder="Email pro..." style={{ background:"transparent", border:"none", borderBottom:`1px dashed ${t.border}`, color:t.text, fontFamily:"'DM Mono',monospace", outline:"none", width:"100%" }} />
                  ) : (
                    editForm.email ? <span style={{ fontFamily:"'DM Mono',monospace", color:t.text }}>{editForm.email}</span> : <span style={{ fontStyle:"italic", opacity:0.5 }}>Non renseigné</span>
                  )}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"12px", color:t.text2, fontSize:"14px" }}>
                  <span>📞</span>
                  {editForm.isEditing ? (
                    <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="Numéro..." style={{ background:"transparent", border:"none", borderBottom:`1px dashed ${t.border}`, color:t.text, fontFamily:"'DM Mono',monospace", outline:"none", width:"100%" }} />
                  ) : (
                    <span style={{ fontFamily:"'DM Mono',monospace", color:t.text }}>{editForm.phone || "Non renseigné"}</span>
                  )}
                </div>
                {!editForm.isEditing && (
                  <div style={{ display:"flex", alignItems:"center", gap:"12px", color:t.text2, fontSize:"14px" }}>
                    <span>🏢</span>
                    <span style={{ fontWeight:"600", color:t.text }}>{editForm.roles.join(', ') || "Aucun pôle"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* FORMULAIRE PÔLES & FONCTIONS (En mode Édition) */}
            {editForm.isEditing && (
              <>
                <hr style={{ border:0, borderTop:`1px solid ${t.border}` }}/>
                
                <div>
                  <div style={{ fontSize:"11px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>Pôles (Équipes)</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                     {orgRoles.map(r => (
                       <label key={r} style={{ display:"flex", alignItems:"center", gap:"8px", background:editForm.roles.includes(r)?getRoleColor(r).bg:t.surface2, border:`1px solid ${editForm.roles.includes(r)?getRoleColor(r).bd:t.border}`, padding:"6px 12px", borderRadius:"20px", cursor:"pointer", fontSize:"12px", color:editForm.roles.includes(r)?getRoleColor(r).text:t.text }}>
                         <input type="checkbox" checked={editForm.roles.includes(r)} onChange={()=>setEditForm({...editForm, roles: toggleArrayItem(editForm.roles, r)})} style={{ display:"none" }} />
                         {r}
                       </label>
                     ))}
                  </div>
                </div>

                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                    <div style={{ fontSize:"11px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px" }}>Fonctions (Titre)</div>
                    {isSuperAdmin && (
                      <button onClick={() => { const f = prompt("Nouvelle fonction pour cet établissement ?"); if(f) handleAddJobTitle(f); }} style={{ background:"transparent", border:"none", color:t.accent, fontSize:"11px", fontWeight:"700", cursor:"pointer" }}>+ Créer fonction</button>
                    )}
                  </div>
                  
                  {/* On s'assure d'afficher toutes les fonctions de l'établissement + celles que l'utilisateur aurait déjà (même si supprimées globalement) */}
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                     {[...new Set([...orgJobTitles, ...editForm.jobTitles])].map(jt => (
                       <div key={jt} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:editForm.jobTitles.includes(jt)?t.accentBg:t.surface2, border:`1px solid ${editForm.jobTitles.includes(jt)?t.accentBd:t.border}`, padding:"8px 12px", borderRadius:"8px" }}>
                         <label style={{ display:"flex", alignItems:"center", gap:"10px", cursor:"pointer", flex:1 }}>
                           <input type="checkbox" checked={editForm.jobTitles.includes(jt)} onChange={()=>setEditForm({...editForm, jobTitles: toggleArrayItem(editForm.jobTitles, jt)})} style={{ width:"16px", height:"16px", accentColor:t.accent }} />
                           <span style={{ fontSize:"13px", color:editForm.jobTitles.includes(jt)?t.accent:t.text, fontWeight:editForm.jobTitles.includes(jt)?"700":"500" }}>{jt}</span>
                         </label>
                         {isSuperAdmin && !editForm.jobTitles.includes(jt) && orgJobTitles.includes(jt) && (
                           <button onClick={() => handleRemoveJobTitle(jt)} title="Supprimer cette fonction de l'établissement" style={{ background:"transparent", border:"none", color:t.red, fontSize:"14px", cursor:"pointer", padding:"0 4px" }}>🗑️</button>
                         )}
                       </div>
                     ))}
                  </div>
                </div>

                <button onClick={submitForm} style={{ width:"100%", background:t.accent, color:"white", border:"none", padding:"14px", borderRadius:"8px", fontSize:"14px", fontWeight:"700", cursor:"pointer", boxShadow:`0 4px 12px ${t.accentBd}` }}>
                  💾 Enregistrer le profil
                </button>
              </>
            )}

            {/* INDICATEURS & BOUTONS (En mode Vue) */}
            {!editForm.isEditing && selectedPerson && (
              <>
                <hr style={{ border:0, borderTop:`1px solid ${t.border}` }}/>

                <div>
                  <div style={{ fontSize:"11px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>Indicateurs Qualiopi</div>
                  
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"16px" }}>
                    <div style={{ border:`1px solid ${t.greenBd}`, background:t.surface, borderRadius:"8px", padding:"12px", textAlign:"center", color:t.green, boxShadow:t.shadowSm }}>
                      <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"32px", lineHeight:1 }}>{selectedPerson.stats.conf}</div>
                      <div style={{ fontSize:"11px", fontWeight:"700", marginTop:"6px", color:t.text2 }}>Conformes</div>
                    </div>
                    <div style={{ border:`1px solid ${t.amberBd}`, background:t.surface, borderRadius:"8px", padding:"12px", textAlign:"center", color:t.amber, boxShadow:t.shadowSm }}>
                      <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"32px", lineHeight:1 }}>{selectedPerson.stats.ec}</div>
                      <div style={{ fontSize:"11px", fontWeight:"700", marginTop:"6px", color:t.text2 }}>En cours</div>
                    </div>
                    <div style={{ border:`1px solid ${t.redBd}`, background:t.surface, borderRadius:"8px", padding:"12px", textAlign:"center", color:t.red, boxShadow:t.shadowSm }}>
                      <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"32px", lineHeight:1 }}>{selectedPerson.stats.nc}</div>
                      <div style={{ fontSize:"11px", fontWeight:"700", marginTop:"6px", color:t.text2 }}>Non conf.</div>
                    </div>
                  </div>

                  <div style={{ background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"8px", padding:"16px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", fontWeight:"700", color:t.text2, marginBottom:"12px" }}>
                      <span>Taux de conformité</span>
                      <span style={{ color:t.text, fontSize:"14px" }}>{selectedPerson.stats.pct}%</span>
                    </div>
                    <div style={{ height:"8px", background:t.border, borderRadius:"4px", display:"flex", gap:"2px", overflow:"hidden" }}>
                      {selectedPerson.stats.conf > 0 && <div style={{ width:`${(selectedPerson.stats.conf/selectedPerson.stats.total)*100}%`, background:t.green, height:"100%" }}/>}
                      {selectedPerson.stats.ec > 0 && <div style={{ width:`${(selectedPerson.stats.ec/selectedPerson.stats.total)*100}%`, background:t.amber, height:"100%" }}/>}
                      {selectedPerson.stats.nc > 0 && <div style={{ width:`${(selectedPerson.stats.nc/selectedPerson.stats.total)*100}%`, background:t.red, height:"100%" }}/>}
                    </div>
                  </div>
                </div>

                <div style={{ display:"flex", gap:"12px", marginTop:"auto" }}>
                  <button 
                    onClick={() => selectedPerson.email ? (window.location.href = `mailto:${selectedPerson.email}`) : alert("Aucune adresse mail renseignée.")}
                    style={{ flex:1, background:t.surface2, border:`1px solid ${t.border}`, color:t.text, padding:"12px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", transition:"all 0.2s", boxShadow:t.shadowSm }}
                    onMouseOver={e=>e.currentTarget.style.borderColor=t.accent} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}
                  >
                    ✉️ Contacter
                  </button>
                  <button 
                    onClick={() => alert(`Bientôt : Ouvre le tableau filtré avec les ${selectedPerson.stats.total} indicateurs de ${selectedPerson.prenom}.`)}
                    style={{ flex:1, background:t.goldBg, border:`1px solid ${t.goldBd}`, color:t.gold, padding:"12px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", transition:"all 0.2s", boxShadow:t.shadowSm }}
                  >
                    📋 Indicateurs
                  </button>
                </div>

                {isAdminOrSuper && (
                   <div style={{ marginTop:"10px", textAlign:"center" }}>
                     <button onClick={handleArchiveUser} style={{ background:"transparent", border:"none", color:t.red, fontSize:"11px", fontWeight:"700", cursor:"pointer", textDecoration:"underline" }}>
                       Archiver ce collaborateur
                     </button>
                   </div>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
