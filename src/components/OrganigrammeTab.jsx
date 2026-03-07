import React, { useState } from "react";

export default function OrganigrammeTab({ currentIfsiName, orgRoles, orgJobTitles, allIfsiMembers, criteres, userProfile, getRoleColor, handleManageStructure, handleAddManualUser, handleUpdateUserDetail, t }) {
  
  const [editForm, setEditForm] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
  const [panelMode, setPanelMode] = useState('profile'); 

  const isAdminOrSuper = userProfile?.role === "admin" || userProfile?.role === "superadmin";
  const isSuperAdmin = userProfile?.role === "superadmin";

  const getUserStats = (person) => {
    const p_prenom = (person.prenom || "").toLowerCase().trim();
    const p_nom = (person.nom || "").toLowerCase().trim();
    const p_email = (person.email || "").toLowerCase().trim();

    const userCriteres = criteres.filter(c => 
      c.responsables && c.responsables.some(resp => {
        const r = resp.toLowerCase().trim();
        if (!r) return false;
        if (p_email && r.includes(p_email)) return true;
        const fn1 = `${p_prenom} ${p_nom}`.trim();
        const fn2 = `${p_nom} ${p_prenom}`.trim();
        if (fn1 && fn1.length > 2 && r.includes(fn1)) return true;
        if (fn2 && fn2.length > 2 && r.includes(fn2)) return true;
        if (p_prenom && p_nom && r.includes(p_prenom) && r.includes(p_nom)) return true;
        const words = r.split(/[\s,;-]+/);
        if (p_nom && p_nom.length > 1 && words.includes(p_nom)) return true;
        if (p_prenom && p_prenom.length > 1 && words.includes(p_prenom)) return true;
        return false;
      })
    );
    
    const total = userCriteres.length;
    const conf = userCriteres.filter(c => c.statut === "conforme").length;
    const ec = userCriteres.filter(c => c.statut === "en-cours").length;
    const nc = userCriteres.filter(c => c.statut === "non-conforme").length;
    const pct = total > 0 ? Math.round((conf / total) * 100) : 0;
    
    return { total, conf, ec, nc, pct };
  };

  // Définition automatique du niveau hiérarchique si non défini
  const getDefaultLevel = (jobTitles) => {
    const titles = jobTitles.join(' ').toLowerCase();
    if (titles.includes("direct")) return 1;
    if (titles.includes("resp") || titles.includes("coord")) return 2;
    return 3;
  };

  const safeMembers = allIfsiMembers.map(m => ({
    ...m, 
    prenom: m.prenom || "Membre", 
    nom: m.nom || "", 
    roles: m.roles || [],
    jobTitles: Array.isArray(m.jobTitles) ? m.jobTitles : [],
    orgLevel: m.orgLevel || getDefaultLevel(Array.isArray(m.jobTitles) ? m.jobTitles : []),
    stats: getUserStats(m)
  }));

  const displayMembers = safeMembers.filter(m => showArchived ? m.archived : !m.archived);
  const selectedPerson = editForm?.id ? safeMembers.find(m => m.id === editForm.id) : null;
  const selectedPersonCriteres = getUserStats(selectedPerson); // Juste pour vérifier, la fonction complète est au dessus

  // --- ACTIONS ---
  const handleArchiveUser = async () => {
    if (window.confirm(`Archiver ${selectedPerson.prenom} ${selectedPerson.nom} ?`)) {
      await handleUpdateUserDetail(selectedPerson.id, selectedPerson.type, { archived: true });
      setEditForm(null);
    }
  };

  const handleRestoreUser = async () => {
    await handleUpdateUserDetail(selectedPerson.id, selectedPerson.type, { archived: false });
    setEditForm(null);
    setShowArchived(false);
  };

  const openViewPanel = (m) => {
    setEditForm({ ...m, isEditing: false });
    setPanelMode('profile');
  };

  const openCreatePanel = () => {
    setEditForm({ isNew: true, isEditing: true, prenom: "", nom: "", email: "", phone: "", jobTitles: [], roles: [], status: "ACTIF" });
    setPanelMode('profile');
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
    setEditForm(editForm.isNew ? null : { ...editForm, isEditing: false });
  };

  // --- DRAG AND DROP ---
  const handleDragStart = (e, member) => {
    e.dataTransfer.setData("memberId", member.id);
    e.dataTransfer.setData("memberType", member.type);
  };

  const handleDropOnLevel = (e, level) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData("memberId");
    const memberType = e.dataTransfer.getData("memberType");
    if (memberId) {
      handleUpdateUserDetail(memberId, memberType, { orgLevel: level });
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  // --- SEPARATION PAR NIVEAU ---
  const level1 = displayMembers.filter(m => m.orgLevel === 1);
  const level2 = displayMembers.filter(m => m.orgLevel === 2);
  const level3 = displayMembers.filter(m => m.orgLevel === 3);

  // --- SOUS-COMPOSANT : CARTE CARRÉE ---
  const SquareCard = ({ m }) => {
    const rc = getRoleColor(m.roles[0]);
    const isSelected = editForm?.id === m.id;
    return (
      <div 
        draggable={isAdminOrSuper}
        onDragStart={(e) => handleDragStart(e, m)}
        onClick={() => openViewPanel(m)}
        style={{
          width: "150px", height: "150px",
          background: t.surface, border: `1px solid ${isSelected ? rc.text : t.border}`, borderRadius: "16px",
          padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center",
          cursor: isAdminOrSuper ? "grab" : "pointer", 
          boxShadow: isSelected ? `0 4px 16px ${rc.bg}` : t.shadowSm, 
          transition: "all 0.2s", position: "relative", zIndex: 10,
          backgroundClip: "padding-box"
        }}
        onMouseOver={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 8px 20px ${rc.bg}`; }}
        onMouseOut={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=isSelected ? `0 4px 16px ${rc.bg}` : t.shadowSm; }}
      >
         <div style={{ width:"42px", height:"42px", borderRadius:"12px", background: rc.bg, border:`1px solid ${rc.bd}`, color: rc.text, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"800", fontSize:"14px", flexShrink:0 }}>
           {m.prenom?.charAt(0).toUpperCase()}{m.nom ? m.nom.charAt(0).toUpperCase() : ""}
         </div>
         
         <div style={{ fontSize:"13px", fontWeight:"800", color:t.text, marginTop:"10px", textAlign:"center", lineHeight:"1.15", width:"100%", overflow:"hidden", textOverflow:"ellipsis" }}>
           {m.prenom} {m.nom}
         </div>
         
         <div style={{ fontSize:"10px", color:t.text2, marginTop:"4px", textAlign:"center", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", width:"100%", fontWeight:"500" }}>
           {m.jobTitles[0] || "—"}
         </div>
         
         {/* Mini Barre d'indicateurs en bas */}
         <div style={{ marginTop:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"9px", fontWeight:"700", color:t.text3, marginBottom:"4px" }}>
              <span>{m.stats.total} ind.</span>
              <span style={{ color: m.stats.pct >= 90 ? t.green : m.stats.pct >= 50 ? t.amber : t.text3 }}>{m.stats.pct}%</span>
            </div>
            <div style={{ height:"4px", background:t.surface2, borderRadius:"2px", display:"flex", gap:"1px", overflow:"hidden", border:`1px solid ${t.border}` }}>
                {m.stats.conf > 0 && <div style={{ width:`${(m.stats.conf/m.stats.total)*100}%`, background:t.green, height:"100%" }}/>}
                {m.stats.ec > 0 && <div style={{ width:`${(m.stats.ec/m.stats.total)*100}%`, background:t.amber, height:"100%" }}/>}
                {m.stats.nc > 0 && <div style={{ width:`${(m.stats.nc/m.stats.total)*100}%`, background:t.red, height:"100%" }}/>}
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display:"flex", gap:"24px", height:"100%" }}>
      
      {/* ── MODAL : CONFIGURATION (SUPER ADMIN) ── */}
      {isSettingsOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>
          <div className="animate-fade-in" style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"16px", padding:"32px", width:"700px", boxShadow:t.shadowLg, display:"flex", flexDirection:"column", maxHeight:"80vh" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
              <div>
                <h3 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"28px", color:t.text, margin:0 }}>Configuration de l'équipe</h3>
                <div style={{ fontSize:"13px", color:t.text2 }}>Modifiez ou supprimez les pôles et les fonctions (titres) de l'établissement.</div>
              </div>
              <button onClick={()=>setIsSettingsOpen(false)} style={{ background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"8px", padding:"8px", cursor:"pointer", color:t.text }}>✕</button>
            </div>
            
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"32px", overflowY:"auto", paddingBottom:"10px" }} className="scroll-container">
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                  <div style={{ fontSize:"12px", fontWeight:"800", color:t.text, textTransform:"uppercase", letterSpacing:"1px" }}>Pôles (Équipes)</div>
                  <button onClick={() => { const v = prompt("Nouveau Pôle ?"); if(v) handleManageStructure('role', 'add', null, v); }} style={{ background:t.accentBg, border:`1px solid ${t.accentBd}`, color:t.accent, padding:"4px 10px", borderRadius:"6px", fontSize:"11px", fontWeight:"800", cursor:"pointer" }}>+ Ajouter</button>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {orgRoles.map(r => {
                    const rc = getRoleColor(r);
                    return (
                      <div key={r} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:rc.bg, border:`1px solid ${rc.bd}`, padding:"8px 12px", borderRadius:"8px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                          <div style={{ width:"10px", height:"10px", borderRadius:"50%", background:rc.text }}/>
                          <span style={{ fontSize:"13px", color:rc.text, fontWeight:"700" }}>{r}</span>
                        </div>
                        <div style={{ display:"flex", gap:"8px" }}>
                          <button onClick={() => { const v = prompt("Renommer le pôle (Met à jour tous les membres) :", r); if(v && v!==r) handleManageStructure('role', 'edit', r, v); }} style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:"14px" }}>✏️</button>
                          <button onClick={() => { if(window.confirm(`Supprimer le pôle "${r}" pour tout le monde ?`)) handleManageStructure('role', 'delete', r); }} style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:"14px" }}>🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                  <div style={{ fontSize:"12px", fontWeight:"800", color:t.text, textTransform:"uppercase", letterSpacing:"1px" }}>Fonctions (Titres)</div>
                  <button onClick={() => { const v = prompt("Nouvelle Fonction ?"); if(v) handleManageStructure('jobTitle', 'add', null, v); }} style={{ background:t.accentBg, border:`1px solid ${t.accentBd}`, color:t.accent, padding:"4px 10px", borderRadius:"6px", fontSize:"11px", fontWeight:"800", cursor:"pointer" }}>+ Ajouter</button>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {orgJobTitles.map(j => (
                    <div key={j} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:t.surface2, border:`1px solid ${t.border}`, padding:"8px 12px", borderRadius:"8px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                        <div style={{ width:"10px", height:"10px", borderRadius:"50%", background:t.text3 }}/>
                        <span style={{ fontSize:"13px", color:t.text, fontWeight:"600" }}>{j}</span>
                      </div>
                      <div style={{ display:"flex", gap:"8px" }}>
                        <button onClick={() => { const v = prompt("Renommer la fonction (Met à jour tous les membres) :", j); if(v && v!==j) handleManageStructure('jobTitle', 'edit', j, v); }} style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:"14px" }}>✏️</button>
                        <button onClick={() => { if(window.confirm(`Supprimer la fonction "${j}" pour tout le monde ?`)) handleManageStructure('jobTitle', 'delete', j); }} style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:"14px" }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ZONE GAUCHE : L'Arbre Organigramme ── */}
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
          </div>

          <div style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, padding:"10px 16px", borderRadius:"12px", boxShadow:t.shadowSm, display:"flex", alignItems:"center", gap:"12px" }}>
               <span style={{ fontSize:"12px", fontWeight:"700", color:t.text2 }}>Effectif :</span>
               <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:t.text, lineHeight:1 }}>{safeMembers.length}</span>
            </div>

            {isAdminOrSuper && (
              <>
                <button onClick={() => setShowArchived(!showArchived)} style={{ background:showArchived?t.surface3:t.surface, border:`1px solid ${t.border}`, color:t.text, padding:"10px 16px", borderRadius:"12px", fontSize:"13px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm }}>
                  📦 {showArchived ? "Retour" : "Archives"}
                </button>
                <button onClick={openCreatePanel} style={{ background:t.surface2, border:`1px solid ${t.border}`, color:t.text, padding:"10px 16px", borderRadius:"12px", fontSize:"13px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm, transition:"all 0.2s" }} onMouseOver={e=>e.currentTarget.style.borderColor=t.accent} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}>
                  👤 Nouveau
                </button>
                {isSuperAdmin && (
                  <button onClick={() => setIsSettingsOpen(true)} style={{ background:t.surface, border:`1px solid ${t.border}`, color:t.text, padding:"10px 16px", borderRadius:"12px", fontSize:"13px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm, transition:"all 0.2s" }} onMouseOver={e=>e.currentTarget.style.borderColor=t.accent} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}>
                    ⚙️ Configurer
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* L'ARBORESCENCE (Scrollable verticalement et horizontalement) */}
        <div className="scroll-container" style={{ flex:1, overflow:"auto", padding:"20px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"16px", display:"flex", flexDirection:"column", alignItems:"center", boxShadow:t.shadowSm, minHeight:"600px" }}>
          
          {showArchived ? (
            <div style={{ display:"flex", flexWrap:"wrap", gap:"20px", justifyContent:"center", padding:"40px" }}>
              {displayMembers.length === 0 ? <div style={{ color:t.text3, fontStyle:"italic" }}>Aucun archivé.</div> : displayMembers.map(m => <SquareCard key={m.id} m={m} />)}
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%", paddingBottom:"40px", minWidth:"max-content" }}>
              
              {/* === NIVEAU 1 : DIRECTION === */}
              <div 
                onDragOver={handleDragOver} onDrop={(e) => handleDropOnLevel(e, 1)}
                style={{ display:"flex", justifyContent:"center", gap:"30px", position:"relative", paddingBottom:"40px", minWidth:"200px", minHeight:"150px", border: isAdminOrSuper ? `2px dashed transparent` : "none", transition:"all 0.2s" }}
                onDragEnter={e=>e.currentTarget.style.borderColor=t.border} onDragLeave={e=>e.currentTarget.style.borderColor="transparent"}
              >
                {level1.length === 0 && isAdminOrSuper && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:t.text3, fontSize:"12px", fontWeight:"800", textTransform:"uppercase", letterSpacing:"1px", opacity:0.5 }}>Glisser Niveau 1</div>}
                
                {/* Ligne Horizontale Connecteur N1 */}
                {level1.length > 1 && <div style={{ position:"absolute", top:"75px", left:"75px", right:"75px", height:"2px", background:t.border, zIndex:1 }}/>}

                {level1.map(m => (
                  <div key={m.id} style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center" }}>
                    {/* Trait descendant N1 -> N2 */}
                    {level2.length > 0 && <div style={{ position:"absolute", top:"150px", width:"2px", height:"40px", background:t.border, zIndex:1 }}/>}
                    <SquareCard m={m} />
                  </div>
                ))}
              </div>

              {/* === NIVEAU 2 : RESPONSABLES === */}
              <div 
                onDragOver={handleDragOver} onDrop={(e) => handleDropOnLevel(e, 2)}
                style={{ display:"flex", justifyContent:"center", gap:"40px", position:"relative", paddingBottom:"40px", minWidth:"400px", minHeight:"150px", border: isAdminOrSuper ? `2px dashed transparent` : "none", transition:"all 0.2s" }}
                onDragEnter={e=>e.currentTarget.style.borderColor=t.border} onDragLeave={e=>e.currentTarget.style.borderColor="transparent"}
              >
                {level2.length === 0 && isAdminOrSuper && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:t.text3, fontSize:"12px", fontWeight:"800", textTransform:"uppercase", letterSpacing:"1px", opacity:0.5 }}>Glisser Niveau 2</div>}

                {/* Ligne Horizontale Supérieure N2 (reliée à N1) */}
                {level2.length > 1 && level1.length > 0 && <div style={{ position:"absolute", top:"-40px", left:"75px", right:"75px", height:"2px", background:t.border, zIndex:1 }}/>}

                {level2.map(m => (
                  <div key={m.id} style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center" }}>
                    {/* Trait ascendant N2 -> N1 */}
                    {level1.length > 0 && <div style={{ position:"absolute", top:"-40px", width:"2px", height:"40px", background:t.border, zIndex:1 }}/>}
                    {/* Trait descendant N2 -> N3 */}
                    {level3.length > 0 && <div style={{ position:"absolute", top:"150px", width:"2px", height:"40px", background:t.border, zIndex:1 }}/>}
                    <SquareCard m={m} />
                  </div>
                ))}
              </div>

              {/* === NIVEAU 3 : ÉQUIPES === */}
              <div 
                onDragOver={handleDragOver} onDrop={(e) => handleDropOnLevel(e, 3)}
                style={{ display:"flex", justifyContent:"center", gap:"20px", position:"relative", minWidth:"600px", minHeight:"150px", border: isAdminOrSuper ? `2px dashed transparent` : "none", transition:"all 0.2s", padding:"0 40px" }}
                onDragEnter={e=>e.currentTarget.style.borderColor=t.border} onDragLeave={e=>e.currentTarget.style.borderColor="transparent"}
              >
                {level3.length === 0 && isAdminOrSuper && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:t.text3, fontSize:"12px", fontWeight:"800", textTransform:"uppercase", letterSpacing:"1px", opacity:0.5 }}>Glisser Niveau 3</div>}

                {/* Ligne Horizontale Supérieure N3 (reliée à N2) */}
                {level3.length > 1 && level2.length > 0 && <div style={{ position:"absolute", top:"-40px", left:"115px", right:"115px", height:"2px", background:t.border, zIndex:1 }}/>}

                {level3.map(m => (
                  <div key={m.id} style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center" }}>
                    {/* Trait ascendant N3 -> N2 */}
                    {level2.length > 0 && <div style={{ position:"absolute", top:"-40px", width:"2px", height:"40px", background:t.border, zIndex:1 }}/>}
                    <SquareCard m={m} />
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ── ZONE DROITE : PANNEAU LATÉRAL (Adapté) ── */}
      {editForm && (
        <div className="animate-fade-in" style={{ width:"380px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"16px", display:"flex", flexDirection:"column", boxShadow:t.shadow, flexShrink:0, overflow:"hidden", height:"max-content", maxHeight:"100%" }}>
          
          {/* HEADER DU PANNEAU */}
          <div style={{ padding:"24px 20px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
            
            {panelMode === 'indicators' ? (
               <div style={{ display:"flex", alignItems:"center", gap:"12px", width:"100%" }}>
                 <button onClick={() => setPanelMode('profile')} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"8px", width:"36px", height:"36px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:t.text, flexShrink:0, boxShadow:t.shadowSm }}>
                   ⬅️
                 </button>
                 <div>
                   <div style={{ fontSize:"16px", fontWeight:"800", color:t.text, lineHeight:1.2 }}>Indicateurs assignés</div>
                   <div style={{ fontSize:"12px", color:t.text2, marginTop:"4px" }}>{selectedPerson.prenom} {selectedPerson.nom} • {selectedPerson.stats.total} résultats</div>
                 </div>
               </div>
            ) : (
               <div style={{ display:"flex", gap:"16px", alignItems:"center", width:"100%" }}>
                 <div style={{ width:"64px", height:"64px", borderRadius:"16px", background:getRoleColor(editForm.roles[0]).bg, border:`1px solid ${getRoleColor(editForm.roles[0]).bd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", fontWeight:"800", color:getRoleColor(editForm.roles[0]).text, flexShrink:0 }}>
                   {editForm.prenom ? editForm.prenom.charAt(0).toUpperCase() : ""}{editForm.nom ? editForm.nom.charAt(0).toUpperCase() : ""}
                 </div>
                 <div style={{ flex:1 }}>
                   {editForm.isEditing ? (
                      <div style={{ display:"flex", gap:"8px", marginBottom:"4px" }}>
                        <input type="text" value={editForm.prenom} onChange={e=>setEditForm({...editForm, prenom: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)})} placeholder="Prénom" style={{ width:"100%", border:`1px dashed ${t.border}`, background:"transparent", color:t.text, fontSize:"16px", fontWeight:"800", outline:"none" }} />
                        <input type="text" value={editForm.nom} onChange={e=>setEditForm({...editForm, nom: e.target.value.toUpperCase()})} placeholder="Nom" style={{ width:"100%", border:`1px dashed ${t.border}`, background:"transparent", color:t.text, fontSize:"16px", fontWeight:"800", outline:"none" }} />
                      </div>
                   ) : (
                      <div style={{ fontSize:"20px", fontWeight:"800", color:t.text }}>{editForm.prenom} {editForm.nom}</div>
                   )}
                   
                   <div style={{ fontSize:"13px", color:t.text2, marginTop:"4px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                     {editForm.jobTitles.join(', ') || "Aucune fonction"}
                   </div>
                   
                   {!editForm.isNew && (
                     <div style={{ marginTop:"8px" }}>
                       <span onClick={() => editForm.isEditing && setEditForm({...editForm, status: editForm.status === "ACTIF" ? "CONGÉ" : "ACTIF"})} style={{ background:editForm.status==="ACTIF"?t.greenBg:t.amberBg, color:editForm.status==="ACTIF"?t.green:t.amber, border:`1px solid ${editForm.status==="ACTIF"?t.greenBd:t.amberBd}`, fontSize:"10px", fontWeight:"800", padding:"3px 10px", borderRadius:"12px", cursor:editForm.isEditing?"pointer":"default" }}>
                         {editForm.status}
                       </span>
                     </div>
                   )}
                 </div>
               </div>
            )}
            
            <div style={{ display:"flex", gap:"8px", flexShrink:0 }}>
              {isAdminOrSuper && !editForm.isEditing && panelMode === 'profile' && (
                 <button onClick={() => setEditForm({...editForm, isEditing: true})} style={{ background:"transparent", border:"none", color:t.text3, fontSize:"16px", cursor:"pointer", width:"32px", height:"32px", display:"flex", alignItems:"center", justifyContent:"center" }} title="Éditer">✏️</button>
              )}
              <button onClick={() => setEditForm(null)} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"8px", color:t.text3, fontSize:"16px", cursor:"pointer", width:"32px", height:"32px", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>
          </div>

          <div className="scroll-container" style={{ padding:"24px 20px", overflowY:"auto", display:"flex", flexDirection:"column", gap:"24px" }}>
            
            {/* 🔴 VUE : LISTE DES INDICATEURS */}
            {panelMode === 'indicators' && (
               <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                  {criteres.filter(c => 
                      c.responsables && c.responsables.some(resp => {
                        const r = resp.toLowerCase().trim();
                        const p_email = (selectedPerson.email || "").toLowerCase().trim();
                        const fn1 = `${selectedPerson.prenom} ${selectedPerson.nom}`.toLowerCase().trim();
                        const fn2 = `${selectedPerson.nom} ${selectedPerson.prenom}`.toLowerCase().trim();
                        if (!r) return false;
                        if (p_email && r.includes(p_email)) return true;
                        if (fn1 && fn1.length > 2 && r.includes(fn1)) return true;
                        if (fn2 && fn2.length > 2 && r.includes(fn2)) return true;
                        if (selectedPerson.prenom && selectedPerson.nom && r.includes(selectedPerson.prenom.toLowerCase()) && r.includes(selectedPerson.nom.toLowerCase())) return true;
                        const words = r.split(/[\s,;-]+/);
                        if (selectedPerson.nom && selectedPerson.nom.length > 1 && words.includes(selectedPerson.nom.toLowerCase())) return true;
                        if (selectedPerson.prenom && selectedPerson.prenom.length > 1 && words.includes(selectedPerson.prenom.toLowerCase())) return true;
                        return false;
                      })
                    ).length === 0 ? (
                    <div style={{ padding:"40px", textAlign:"center", color:t.text3, fontStyle:"italic", fontSize:"13px" }}>Aucun indicateur assigné.</div>
                  ) : (
                    criteres.filter(c => 
                      c.responsables && c.responsables.some(resp => {
                        const r = resp.toLowerCase().trim();
                        const p_email = (selectedPerson.email || "").toLowerCase().trim();
                        const fn1 = `${selectedPerson.prenom} ${selectedPerson.nom}`.toLowerCase().trim();
                        const fn2 = `${selectedPerson.nom} ${selectedPerson.prenom}`.toLowerCase().trim();
                        if (!r) return false;
                        if (p_email && r.includes(p_email)) return true;
                        if (fn1 && fn1.length > 2 && r.includes(fn1)) return true;
                        if (fn2 && fn2.length > 2 && r.includes(fn2)) return true;
                        if (selectedPerson.prenom && selectedPerson.nom && r.includes(selectedPerson.prenom.toLowerCase()) && r.includes(selectedPerson.nom.toLowerCase())) return true;
                        const words = r.split(/[\s,;-]+/);
                        if (selectedPerson.nom && selectedPerson.nom.length > 1 && words.includes(selectedPerson.nom.toLowerCase())) return true;
                        if (selectedPerson.prenom && selectedPerson.prenom.length > 1 && words.includes(selectedPerson.prenom.toLowerCase())) return true;
                        return false;
                      })
                    ).map(c => {
                       const isConforme = c.statut === "conforme";
                       const isNC = c.statut === "non-conforme";
                       const labelStatut = isConforme ? "Conforme" : isNC ? "Non conforme" : c.statut === "en-cours" ? "En cours" : "Non évalué";
                       const themeStatut = { "conforme": { c:t.green, bg:t.greenBg, bd:t.greenBd }, "non-conforme": { c:t.red, bg:t.redBg, bd:t.redBd }, "en-cours": { c:t.amber, bg:t.amberBg, bd:t.amberBd }, "non-concerne": { c:t.text3, bg:t.surface3, bd:t.border } }[c.statut] || { c:t.text2, bg:t.surface2, bd:t.border };
                       const cConf = CRITERES_LABELS[c.critere] || { bg:t.surface2, bd:t.border, color:t.text };
                       const d = days(c.delai);

                       return (
                         <div key={c.id} onClick={() => setModalCritere(c)} style={{ background:t.surface2, border:`1px solid ${themeStatut.bd}`, borderRadius:"10px", padding:"16px", cursor:"pointer", transition:"all 0.2s", boxShadow:t.shadowSm }} onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e=>e.currentTarget.style.transform="translateY(0)"}>
                           <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
                             <span style={{ display:"inline-block", background: cConf.bg, border: `1px solid ${cConf.bd}`, color: cConf.color, padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "800" }}>
                               {formatInd(c.critere, c.num)}
                             </span>
                             <span style={{ background:themeStatut.bg, border:`1px solid ${themeStatut.bd}`, color:themeStatut.c, fontSize:"9px", fontWeight:"800", padding:"3px 8px", borderRadius:"5px" }}>{labelStatut}</span>
                           </div>
                           <div style={{ fontSize:"13px", fontWeight:"600", color:t.text, lineHeight:"1.4", marginBottom:"12px" }}>{c.titre}</div>
                           <div style={{ display:"flex", justifyContent:"flex-end" }}>
                             <span style={{ fontSize:"11px", fontWeight:"800", color: d < 0 ? t.red : t.text3 }}>{d < 0 ? "DÉPASSÉ" : `Échéance J-${d}`}</span>
                           </div>
                         </div>
                       )
                    })
                  )}
               </div>
            )}

            {/* 🔵 VUE : PROFIL COMPLET OU EDITION */}
            {panelMode === 'profile' && (
              <>
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
                      </div>
                      
                      <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                         {[...new Set([...orgJobTitles, ...editForm.jobTitles])].map(jt => (
                           <label key={jt} style={{ display:"flex", alignItems:"center", gap:"10px", background:editForm.jobTitles.includes(jt)?t.accentBg:t.surface2, border:`1px solid ${editForm.jobTitles.includes(jt)?t.accentBd:t.border}`, padding:"8px 12px", borderRadius:"8px", cursor:"pointer" }}>
                             <input type="checkbox" checked={editForm.jobTitles.includes(jt)} onChange={()=>setEditForm({...editForm, jobTitles: toggleArrayItem(editForm.jobTitles, jt)})} style={{ width:"16px", height:"16px", accentColor:t.accent }} />
                             <span style={{ fontSize:"13px", color:editForm.jobTitles.includes(jt)?t.accent:t.text, fontWeight:editForm.jobTitles.includes(jt)?"700":"500" }}>{jt}</span>
                           </label>
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

                    <div style={{ display:"flex", gap:"12px", marginTop:"16px" }}>
                      <button 
                        onClick={() => selectedPerson.email ? (window.location.href = `mailto:${selectedPerson.email}`) : alert("Aucune adresse mail renseignée.")}
                        style={{ flex:1, background:t.surface2, border:`1px solid ${t.border}`, color:t.text, padding:"12px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", transition:"all 0.2s", boxShadow:t.shadowSm }}
                        onMouseOver={e=>e.currentTarget.style.borderColor=t.accent} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}
                      >
                        ✉️ Contacter
                      </button>
                      <button 
                        onClick={() => setPanelMode('indicators')}
                        style={{ flex:1, background:t.goldBg, border:`1px solid ${t.goldBd}`, color:t.gold, padding:"12px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", transition:"all 0.2s", boxShadow:t.shadowSm }}
                      >
                        📋 Indicateurs
                      </button>
                    </div>

                    {isAdminOrSuper && (
                       <div style={{ marginTop:"16px", textAlign:"center", paddingBottom:"8px" }}>
                         {selectedPerson.archived ? (
                            <button onClick={handleRestoreUser} style={{ background:"transparent", border:"none", color:t.green, fontSize:"11px", fontWeight:"700", cursor:"pointer", textDecoration:"underline" }}>
                              Restaurer ce collaborateur
                            </button>
                         ) : (
                            <button onClick={handleArchiveUser} style={{ background:"transparent", border:"none", color:t.red, fontSize:"11px", fontWeight:"700", cursor:"pointer", textDecoration:"underline" }}>
                              Archiver ce collaborateur
                            </button>
                         )}
                       </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
