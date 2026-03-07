import React, { useState, useEffect, useRef, useCallback } from "react";
import { CRITERES_LABELS } from "../data";

export default function OrganigrammeTab({ currentIfsiName, orgRoles, orgJobTitles, orgTags, allIfsiMembers, criteres, userProfile, getRoleColor, handleManageStructure, handleAddManualUser, handleUpdateUserDetail, orgConnections, handleUpdateConnections, setModalCritere, days, t }) {
  
  const [editForm, setEditForm] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
  const [panelMode, setPanelMode] = useState('profile'); 
  const [zoom, setZoom] = useState(1); 
  const [filtreRole, setFiltreRole] = useState(null); 

  // --- SYSTEME DE LIAISON ---
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [linkSourceId, setLinkSourceId] = useState(null);
  const [activeLinkColor, setActiveLinkColor] = useState('#3b82f6'); // Par défaut Bleu
  const [cardPositions, setCardPositions] = useState({});
  const containerRef = useRef(null);
  const contentRef = useRef(null); // CORRECTION ICI : La variable est bien déclarée !

  const LINE_COLORS = [
    { label: 'Bleu IFSI', color: '#3b82f6' },
    { label: 'Vert IFAS', color: '#10b981' },
    { label: 'Gris Admin', color: '#94a3b8' },
    { label: 'Violet Qualité', color: '#8b5cf6' },
    { label: 'Orange Transv.', color: '#f59e0b' }
  ];

  const isAdminOrSuper = userProfile?.role === "admin" || userProfile?.role === "superadmin";
  const isSuperAdmin = userProfile?.role === "superadmin";

  const getUserCriteres = (person) => {
    if (!person) return []; 
    const p_prenom = (person.prenom || "").toLowerCase().trim();
    const p_nom = (person.nom || "").toLowerCase().trim();
    const p_email = (person.email || "").toLowerCase().trim();

    return criteres.filter(c => 
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
  };

  const getUserStats = (person) => {
    if (!person) return { total: 0, conf: 0, ec: 0, nc: 0, pct: 0 }; 
    const userCriteres = getUserCriteres(person);
    const total = userCriteres.length;
    const conf = userCriteres.filter(c => c.statut === "conforme").length;
    const ec = userCriteres.filter(c => c.statut === "en-cours").length;
    const nc = userCriteres.filter(c => c.statut === "non-conforme").length;
    const pct = total > 0 ? Math.round((conf / total) * 100) : 0;
    return { total, conf, ec, nc, pct };
  };

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
    tags: Array.isArray(m.tags) ? m.tags : [],
    orgLevel: m.orgLevel || getDefaultLevel(Array.isArray(m.jobTitles) ? m.jobTitles : []),
    stats: getUserStats(m)
  }));

  const displayMembers = safeMembers.filter(m => showArchived ? m.archived : !m.archived);
  const selectedPerson = editForm?.id ? safeMembers.find(m => m.id === editForm.id) : null;
  const selectedPersonCriteres = selectedPerson ? getUserCriteres(selectedPerson) : [];

  // --- CALCUL DES POSITIONS POUR LES LIGNES SVG ---
  const updatePositions = useCallback(() => {
    const wrapper = document.getElementById("zoom-wrapper");
    if (!wrapper || !containerRef.current) return;
    const wRect = wrapper.getBoundingClientRect();
    
    const newPos = {};
    displayMembers.forEach(m => {
      const el = document.getElementById(`card-${m.id}`);
      if (el) {
        const cRect = el.getBoundingClientRect();
        // Calcul des positions relatives dézoomées
        const left = (cRect.left - wRect.left) / zoom;
        const top = (cRect.top - wRect.top) / zoom;
        const width = cRect.width / zoom;
        const height = cRect.height / zoom;

        newPos[m.id] = {
          bottomX: left + width / 2,
          bottomY: top + height,
          topX: left + width / 2,
          topY: top,
          midX: left + width / 2,
          midY: top + height / 2,
        };
      }
    });
    setCardPositions(newPos);
  }, [displayMembers, zoom]);

  useEffect(() => {
    const timer = setTimeout(updatePositions, 300);
    window.addEventListener('resize', updatePositions);
    return () => { clearTimeout(timer); window.removeEventListener('resize', updatePositions); };
  }, [updatePositions, showArchived, editForm, isLinkingMode, zoom]);

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
    if (isLinkingMode) {
      if (!linkSourceId) {
        setLinkSourceId(m.id);
      } else if (linkSourceId === m.id) {
        setLinkSourceId(null);
      } else {
        const existing = orgConnections.find(c => c.source === linkSourceId && c.target === m.id);
        if (existing) {
          handleUpdateConnections(orgConnections.filter(c => c.id !== existing.id));
        } else {
          const newConns = [...orgConnections, { id: `conn_${Date.now()}`, source: linkSourceId, target: m.id, color: activeLinkColor }];
          handleUpdateConnections(newConns);
        }
      }
      return; 
    }
    setEditForm({ ...m, isEditing: false });
    setPanelMode('profile');
  };

  const openCreatePanel = () => {
    setEditForm({ isNew: true, isEditing: true, prenom: "", nom: "", email: "", phone: "", jobTitles: [], roles: [], tags: [], status: "ACTIF" });
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
        tags: editForm.tags,
        status: editForm.status
      });
    }
    setEditForm(editForm.isNew ? null : { ...editForm, isEditing: false });
  };

  const handleDragStart = (e, member) => {
    if (isLinkingMode) { e.preventDefault(); return; }
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

  const removeConnection = (connId) => {
    handleUpdateConnections(orgConnections.filter(c => c.id !== connId));
  };
  
  const clearAllConnections = () => {
    if(window.confirm("Voulez-vous vraiment effacer TOUTES les lignes de connexion ?")) {
      handleUpdateConnections([]);
    }
  };

  const formatInd = (critere, num) => {
    const match = String(num).match(/(\d+)$/);
    const n = match ? match[1] : String(num).replace(/\D/g, '');
    return `${critere}.${n}`;
  };

  // --- SEPARATION PAR NIVEAU ---
  const level1 = displayMembers.filter(m => m.orgLevel === 1);
  const level2 = displayMembers.filter(m => m.orgLevel === 2);
  const level3 = displayMembers.filter(m => m.orgLevel === 3);

  const groupMembersByJob = (membersArray) => {
    const groups = {};
    membersArray.forEach(m => {
      const job = m.jobTitles[0] || "Sans fonction";
      if (!groups[job]) groups[job] = [];
      groups[job].push(m);
    });
    return groups;
  };

  // --- SOUS-COMPOSANT : LA VIGNETTE ULTRA-COMPACTE ---
  const CompactCard = ({ m }) => {
    const rc = getRoleColor(m.roles[0]);
    const isSelected = editForm?.id === m.id;
    const isLinkingSource = isLinkingMode && linkSourceId === m.id;
    const isActif = m.status === "ACTIF";
    const isFilteredOut = filtreRole && m.roles[0] !== filtreRole;
    const initials = `${(m.prenom || "?")[0]}${(m.nom || "?")[0]}`.toUpperCase();

    return (
      <div 
        id={`card-${m.id}`}
        draggable={isAdminOrSuper && !isLinkingMode}
        onDragStart={(e) => handleDragStart(e, m)}
        onClick={() => openViewPanel(m)}
        style={{
          width: "116px", 
          minHeight: "114px", 
          background: isSelected ? rc.bg : t.surface, 
          border: `1px solid ${isLinkingSource ? activeLinkColor : isSelected ? rc.text : t.border}`, 
          borderLeft: `4px solid ${isLinkingSource ? activeLinkColor : rc.text}`,
          borderRadius: "8px",
          padding: "12px 10px 10px", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center",
          gap: "8px",
          cursor: isLinkingMode ? "crosshair" : isAdminOrSuper ? "grab" : "pointer", 
          boxShadow: isLinkingSource ? `0 0 14px ${activeLinkColor}70` : isSelected ? `0 4px 16px ${rc.bg}` : t.shadowSm, 
          transition: "all 0.15s ease", 
          position: "relative", 
          zIndex: 10,
          opacity: isFilteredOut ? 0.15 : (isActif ? 1 : 0.5)
        }}
        onMouseOver={e => { 
          if(isFilteredOut) return;
          e.currentTarget.style.transform="translateY(-2px) scale(1.02)"; 
          e.currentTarget.style.boxShadow=isLinkingSource ? `0 0 16px ${activeLinkColor}` : `0 6px 16px rgba(0,0,0,0.1)`; 
        }}
        onMouseOut={e => { 
          if(isFilteredOut) return;
          e.currentTarget.style.transform="translateY(0) scale(1)"; 
          e.currentTarget.style.boxShadow=isLinkingSource ? `0 0 14px ${activeLinkColor}70` : isSelected ? `0 4px 16px ${rc.bg}` : t.shadowSm; 
        }}
      >
         <div style={{ width:"32px", height:"32px", borderRadius:"6px", background: rc.bg, border:`1px solid ${rc.bd}`, color: rc.text, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"800", fontSize:"11px", flexShrink:0 }}>
           {initials}
         </div>
         
         <div style={{ width:"100%", textAlign:"center", lineHeight:"1.2" }}>
           <div style={{ fontSize:"11px", fontWeight:"700", color:t.text, wordBreak:"break-word" }}>{m.prenom}</div>
           <div style={{ fontSize:"10px", fontWeight:"800", color:t.text2, textTransform:"uppercase", wordBreak:"break-word", marginTop:"2px" }}>{m.nom}</div>
         </div>

         {m.tags && m.tags.length > 0 && (
           <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"2px", width:"100%", marginTop:"2px" }}>
             {m.tags.slice(0, 2).map(tag => (
               <span key={tag} style={{ background:t.accentBg, color:t.accent, fontSize:"6.5px", fontWeight:"800", padding:"2px 5px", borderRadius:"4px", textTransform:"uppercase" }}>
                 {tag.length > 10 ? tag.slice(0,9)+"…" : tag}
               </span>
             ))}
           </div>
         )}
         
         <div style={{ width:"100%", marginTop:"auto", paddingTop:"6px" }}>
            <div style={{ height:"4px", background:t.surface2, borderRadius:"2px", display:"flex", gap:"1px", overflow:"hidden", border:`1px solid ${t.border}` }}>
                {m.stats.total > 0 ? (
                  <>
                    {m.stats.conf > 0 && <div style={{ width:`${(m.stats.conf/m.stats.total)*100}%`, background:t.green, height:"100%" }}/>}
                    {m.stats.ec > 0 && <div style={{ width:`${(m.stats.ec/m.stats.total)*100}%`, background:t.amber, height:"100%" }}/>}
                    {m.stats.nc > 0 && <div style={{ width:`${(m.stats.nc/m.stats.total)*100}%`, background:t.red, height:"100%" }}/>}
                  </>
                ) : (
                  <div style={{ width:"100%", background:t.surface3, height:"100%" }} />
                )}
            </div>
            <div style={{ fontSize:"8px", fontWeight:"700", color:m.stats.total > 0 ? t.text2 : t.text3, textAlign:"center", marginTop:"4px" }}>
              {m.stats.total > 0 ? `${m.stats.pct}% conf.` : "0 ind."}
            </div>
         </div>
      </div>
    );
  };

  // --- SOUS-COMPOSANT : LA BOÎTE DE GROUPE (Flottante) ---
  const JobGroupBox = ({ jobTitle, members }) => {
    const groupColor = members.length > 0 ? getRoleColor(members[0].roles[0]) : { bg: t.surface2, bd: t.border, text: t.text3 };
    
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center",
        gap: "12px",
        zIndex: 2
      }}>
        {/* Titre Pilule flottante */}
        <div style={{ 
          display: "flex", alignItems: "center", gap: "6px",
          background: t.surface, border: `1px solid ${t.border}`, borderTop: `3px solid ${groupColor.text}`,
          borderRadius: "8px", padding: "6px 14px",
          boxShadow: t.shadowSm
        }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: groupColor.text }} />
          <span style={{ fontSize: "10px", fontWeight: "800", color: t.text2, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {jobTitle}
          </span>
        </div>
        
        {/* Grille de cartes */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", maxWidth: "380px" }}>
          {members.map(m => <CompactCard key={m.id} m={m} />)}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display:"flex", gap:"24px", height:"100%" }}>
      
      {/* ── MODAL : CONFIGURATION (SUPER ADMIN) ── */}
      {isSettingsOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>
          <div className="animate-fade-in" style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"16px", padding:"32px", width:"900px", maxWidth:"90vw", boxShadow:t.shadowLg, display:"flex", flexDirection:"column", maxHeight:"80vh" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
              <div>
                <h3 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"28px", color:t.text, margin:0 }}>Configuration de l'équipe</h3>
                <div style={{ fontSize:"13px", color:t.text2 }}>Gérez les pôles, les fonctions (titres) et les étiquettes (missions transverses).</div>
              </div>
              <button onClick={()=>setIsSettingsOpen(false)} style={{ background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"8px", padding:"8px", cursor:"pointer", color:t.text }}>✕</button>
            </div>
            
            {/* Grid 3 Colonnes */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"32px", overflowY:"auto", paddingBottom:"10px" }} className="scroll-container">
              
              {/* Colonne 1 : Pôles */}
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

              {/* Colonne 2 : Fonctions */}
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

              {/* Colonne 3 : Étiquettes */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                  <div style={{ fontSize:"12px", fontWeight:"800", color:t.text, textTransform:"uppercase", letterSpacing:"1px" }}>Étiquettes (Missions)</div>
                  <button onClick={() => { const v = prompt("Nouvelle Étiquette ?"); if(v) handleManageStructure('tag', 'add', null, v); }} style={{ background:t.accentBg, border:`1px solid ${t.accentBd}`, color:t.accent, padding:"4px 10px", borderRadius:"6px", fontSize:"11px", fontWeight:"800", cursor:"pointer" }}>+ Ajouter</button>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {orgTags.map(tag => (
                    <div key={tag} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:t.surface2, border:`1px solid ${t.border}`, padding:"8px 12px", borderRadius:"8px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                        <span style={{ background:t.accentBg, color:t.accent, fontSize:"10px", fontWeight:"800", padding:"2px 6px", borderRadius:"4px", textTransform:"uppercase" }}>{tag}</span>
                      </div>
                      <div style={{ display:"flex", gap:"8px" }}>
                        <button onClick={() => { const v = prompt("Renommer l'étiquette (Met à jour tous les membres) :", tag); if(v && v!==tag) handleManageStructure('tag', 'edit', tag, v); }} style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:"14px" }}>✏️</button>
                        <button onClick={() => { if(window.confirm(`Supprimer l'étiquette "${tag}" pour tout le monde ?`)) handleManageStructure('tag', 'delete', tag); }} style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:"14px" }}>🗑️</button>
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
          
          {/* Menu Filtre par Pôles Interactif */}
          <div style={{ display:"flex", alignItems:"center", gap:"10px", background:t.surface, padding:"10px 14px", borderRadius:"12px", border:`1px solid ${t.border}`, boxShadow:t.shadowSm, flexWrap:"wrap" }}>
            <span style={{ fontSize:"11px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginRight:"4px" }}>Filtre :</span>
            {orgRoles.map(r => {
              const rc = getRoleColor(r);
              const isActive = filtreRole === r;
              const isFaded = filtreRole && !isActive;
              return (
                <div 
                  key={r} 
                  onClick={() => setFiltreRole(isActive ? null : r)}
                  style={{ display:"flex", alignItems:"center", gap:"6px", background:isActive ? rc.bg : t.surface2, border:`1px solid ${isActive ? rc.bd : t.border}`, padding:"4px 10px", borderRadius:"20px", cursor:"pointer", transition:"all 0.2s", opacity: isFaded ? 0.4 : 1 }}
                >
                  <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:rc.text }}/>
                  <span style={{ fontSize:"11px", fontWeight:"700", color:isActive ? rc.text : t.text2 }}>{r}</span>
                </div>
              )
            })}
          </div>

          <div style={{ display:"flex", gap:"12px", alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
            
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, padding:"8px 14px", borderRadius:"10px", boxShadow:t.shadowSm, display:"flex", alignItems:"center", gap:"10px" }}>
               <span style={{ fontSize:"11px", fontWeight:"700", color:t.text2 }}>Effectif :</span>
               <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:"18px", color:t.text, lineHeight:1 }}>{safeMembers.length}</span>
            </div>

            {/* CONTROLE DE ZOOM MAGIQUE */}
            <div style={{ display:"flex", alignItems:"center", background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"10px", overflow:"hidden", boxShadow:t.shadowSm }}>
               <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} style={{ padding:"8px 12px", border:"none", background:"transparent", cursor:"pointer", color:t.text, fontWeight:"800", fontSize:"14px", transition:"background 0.2s" }} onMouseOver={e=>e.currentTarget.style.background=t.surface3} onMouseOut={e=>e.currentTarget.style.background="transparent"}>-</button>
               <div style={{ fontSize:"11px", fontWeight:"800", width:"45px", textAlign:"center", color:t.text }}>{Math.round(zoom * 100)}%</div>
               <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} style={{ padding:"8px 12px", border:"none", background:"transparent", cursor:"pointer", color:t.text, fontWeight:"800", fontSize:"14px", transition:"background 0.2s" }} onMouseOver={e=>e.currentTarget.style.background=t.surface3} onMouseOut={e=>e.currentTarget.style.background="transparent"}>+</button>
            </div>

            {isAdminOrSuper && (
              <>
                <button 
                  onClick={() => { setIsLinkingMode(!isLinkingMode); setLinkSourceId(null); setPanelMode('profile'); setEditForm(null); updatePositions(); }} 
                  style={{ background:isLinkingMode?t.accentBg:t.surface, border:`1px solid ${isLinkingMode?t.accentBd:t.border}`, color:isLinkingMode?t.accent:t.text, padding:"10px 14px", borderRadius:"10px", fontSize:"12px", fontWeight:"800", cursor:"pointer", boxShadow:t.shadowSm }}
                >
                  🔗 {isLinkingMode ? "Annuler liaison" : "Lier"}
                </button>
                <button onClick={openCreatePanel} style={{ background:t.surface2, border:`1px solid ${t.border}`, color:t.text, padding:"10px 14px", borderRadius:"10px", fontSize:"12px", fontWeight:"800", cursor:"pointer", boxShadow:t.shadowSm, transition:"all 0.2s" }} onMouseOver={e=>e.currentTarget.style.borderColor=t.accent} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}>
                  👤 Nouveau
                </button>
                {isSuperAdmin && (
                  <button onClick={() => setIsSettingsOpen(true)} style={{ background:t.surface, border:`1px solid ${t.border}`, color:t.text, padding:"10px 14px", borderRadius:"10px", fontSize:"12px", fontWeight:"800", cursor:"pointer", boxShadow:t.shadowSm, transition:"all 0.2s" }} onMouseOver={e=>e.currentTarget.style.borderColor=t.accent} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}>
                    ⚙️ Configurer
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* OUTIL DE LIAISON (Lignes) */}
        {isAdminOrSuper && isLinkingMode && !showArchived && (
          <div className="animate-fade-in" style={{ background: t.accentBg, border:`1px solid ${t.accentBd}`, padding:"12px 16px", borderRadius:"12px", display:"flex", alignItems:"center", gap:"16px", boxShadow:t.shadowSm }}>
             <div style={{ fontSize:"13px", color:t.text, fontWeight:"600" }}>
               {!linkSourceId ? "1. Cliquez sur la carte Parent ➔" : "2. Cliquez sur les Enfants pour relier (ou retirer) ➔"}
             </div>
             <div style={{ display:"flex", gap:"8px", marginLeft:"auto", alignItems:"center" }}>
                {LINE_COLORS.map(c => (
                  <div 
                    key={c.color} 
                    onClick={() => setActiveLinkColor(c.color)}
                    title={c.label}
                    style={{ width:"24px", height:"24px", borderRadius:"50%", background:c.color, border: activeLinkColor === c.color ? `3px solid ${t.text}` : `2px solid transparent`, cursor:"pointer", transition:"all 0.2s", transform: activeLinkColor === c.color ? "scale(1.2)" : "scale(1)" }}
                  />
                ))}
                <div style={{ width:"1px", height:"20px", background:t.border, margin:"0 10px" }} />
                <button onClick={clearAllConnections} style={{ background:"transparent", border:"none", color:t.red, fontSize:"12px", fontWeight:"800", cursor:"pointer" }}>🗑️ Tout effacer</button>
             </div>
          </div>
        )}

        {/* L'ARBORESCENCE (Conteneur Scrollable Fixe + Zone SVG/Zoom Compensée) */}
        <div ref={containerRef} className="scroll-container" style={{ flex:1, overflow:"auto", background: t.bg, border:`1px solid ${t.border}`, borderRadius:"16px", boxShadow:t.shadowSm, position:"relative" }}>
          
          <div id="zoom-wrapper" ref={contentRef} style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100/zoom}%`, minHeight: `${100/zoom}%`, position: "relative", padding: "60px 40px", display: "flex", flexDirection: "column", gap: "60px", alignItems: "center" }}>
            
            {/* CALQUE DES LIGNES SVG */}
            {!showArchived && (
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                {orgConnections.map(conn => {
                  const posA = cardPositions[conn.source];
                  const posB = cardPositions[conn.target];
                  if(!posA || !posB) return null;

                  // Ligne simple de bord à bord (courbe douce)
                  const path = `M ${posA.midX},${posA.midY} C ${posA.midX},${(posA.midY+posB.midY)/2} ${posB.midX},${(posA.midY+posB.midY)/2} ${posB.midX},${posB.midY}`;

                  return (
                    <path key={conn.id} d={path} fill="none" stroke={conn.color || t.border} strokeWidth="3" opacity={isLinkingMode ? "1" : "0.5"} strokeLinecap="round" strokeLinejoin="round" />
                  );
                })}
              </svg>
            )}

            {/* BOUTONS SUPPRESSION DES LIGNES */}
            {isLinkingMode && !showArchived && orgConnections.map(conn => {
              const posA = cardPositions[conn.source];
              const posB = cardPositions[conn.target];
              if(!posA || !posB) return null;
              
              const midX = (posA.x + posB.x) / 2;
              const midY = (posA.y + posB.y) / 2;

              return (
                <button 
                  key={`del-${conn.id}`} onClick={() => removeConnection(conn.id)}
                  style={{ position: 'absolute', left: midX - 12, top: midY - 12, width: 24, height: 24, borderRadius:"50%", background:t.red, color:"white", border:"none", cursor:"pointer", zIndex: 20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", boxShadow:t.shadowSm }}
                >✕</button>
              )
            })}

            {/* LE CORPS DE L'ORGANIGRAMME (Structure 3 niveaux horizontaux) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "60px", width: "100%", position: "relative", zIndex: 10 }}>
              
              {showArchived ? (
                <div style={{ display:"flex", flexWrap:"wrap", gap:"20px", justifyContent:"center" }}>
                  {displayMembers.length === 0 ? <div style={{ color:t.text3, fontStyle:"italic" }}>Aucun archivé.</div> : displayMembers.map(m => <CompactCard key={m.id} m={m} />)}
                </div>
              ) : (
                <>
                  {/* === NIVEAU 1 : DIRECTION === */}
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                    <div style={{ fontSize: "10px", fontWeight: "800", color: t.text3, letterSpacing: "2px", textTransform: "uppercase", opacity:0.6 }}>Niveau 1 — Direction</div>
                    <div 
                      onDragOver={handleDragOver} onDrop={(e) => handleDropOnLevel(e, 1)}
                      style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", alignItems:"flex-start", gap:"16px", minWidth:"200px", minHeight:"80px", border: isAdminOrSuper && !isLinkingMode ? `2px dashed ${t.border}` : "2px dashed transparent", borderRadius:"16px", padding:"10px", transition:"background 0.2s" }}
                    >
                      {level1.length === 0 && isAdminOrSuper && !isLinkingMode && <div style={{ display:"flex", alignItems:"center", justifyContent:"center", color:t.text3, fontSize:"12px", fontWeight:"800", textTransform:"uppercase", letterSpacing:"1px", opacity:0.4, width:"100%", border:`2px dashed ${t.border}`, borderRadius:"12px", padding:"24px" }}>Glisser un membre ici (Niveau 1 – Direction)</div>}
                      {Object.entries(groupMembersByJob(level1)).map(([job, members]) => (
                         <JobGroupBox key={job} jobTitle={job} members={members} />
                      ))}
                    </div>
                  </div>

                  {/* === NIVEAU 2 : RESPONSABLES === */}
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                    <div style={{ fontSize: "10px", fontWeight: "800", color: t.text3, letterSpacing: "2px", textTransform: "uppercase", opacity:0.6 }}>Niveau 2 — Responsables</div>
                    <div 
                      onDragOver={handleDragOver} onDrop={(e) => handleDropOnLevel(e, 2)}
                      style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", alignItems:"flex-start", gap:"16px", minWidth:"400px", minHeight:"80px", border: isAdminOrSuper && !isLinkingMode ? `2px dashed ${t.border}` : "2px dashed transparent", borderRadius:"16px", padding:"10px", transition:"background 0.2s" }}
                    >
                      {level2.length === 0 && isAdminOrSuper && !isLinkingMode && <div style={{ display:"flex", alignItems:"center", justifyContent:"center", color:t.text3, fontSize:"12px", fontWeight:"800", textTransform:"uppercase", letterSpacing:"1px", opacity:0.4, width:"100%", border:`2px dashed ${t.border}`, borderRadius:"12px", padding:"24px" }}>Glisser un membre ici (Niveau 2 – Responsables)</div>}
                      {Object.entries(groupMembersByJob(level2)).map(([job, members]) => (
                         <JobGroupBox key={job} jobTitle={job} members={members} />
                      ))}
                    </div>
                  </div>

                  {/* === NIVEAU 3 : ÉQUIPES === */}
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                    <div style={{ fontSize: "10px", fontWeight: "800", color: t.text3, letterSpacing: "2px", textTransform: "uppercase", opacity:0.6 }}>Niveau 3 — Équipes</div>
                    <div 
                      onDragOver={handleDragOver} onDrop={(e) => handleDropOnLevel(e, 3)}
                      style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", alignItems:"flex-start", gap:"16px", minWidth:"600px", minHeight:"80px", border: isAdminOrSuper && !isLinkingMode ? `2px dashed ${t.border}` : "2px dashed transparent", borderRadius:"16px", padding:"10px", transition:"background 0.2s" }}
                    >
                      {level3.length === 0 && isAdminOrSuper && !isLinkingMode && <div style={{ display:"flex", alignItems:"center", justifyContent:"center", color:t.text3, fontSize:"12px", fontWeight:"800", textTransform:"uppercase", letterSpacing:"1px", opacity:0.4, width:"100%", border:`2px dashed ${t.border}`, borderRadius:"12px", padding:"24px" }}>Glisser un membre ici (Niveau 3 – Équipes)</div>}
                      {Object.entries(groupMembersByJob(level3)).map(([job, members]) => (
                         <JobGroupBox key={job} jobTitle={job} members={members} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── ZONE DROITE : PANNEAU LATÉRAL (Adapté au contenu) ── */}
      {editForm && (
        <div className="animate-fade-in" style={{ width:"380px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"16px", display:"flex", flexDirection:"column", boxShadow:t.shadow, flexShrink:0, overflow:"hidden", height:"max-content", maxHeight:"100%" }}>
          
          {/* HEADER DU PANNEAU */}
          <div style={{ padding:"24px 20px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
            {panelMode === 'indicators' && selectedPerson ? (
               <div style={{ display:"flex", alignItems:"center", gap:"12px", width:"100%" }}>
                 <button onClick={() => setPanelMode('profile')} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"8px", width:"36px", height:"36px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:t.text, flexShrink:0, boxShadow:t.shadowSm, transition:"all 0.2s" }} onMouseOver={e=>e.currentTarget.style.background=t.surface3} onMouseOut={e=>e.currentTarget.style.background=t.surface}>
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
                 <div style={{ flex:1, overflow:"hidden" }}>
                   {editForm.isEditing ? (
                      <div style={{ display:"flex", gap:"8px", marginBottom:"4px" }}>
                        <input type="text" value={editForm.prenom} onChange={e=>setEditForm({...editForm, prenom: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)})} placeholder="Prénom" style={{ width:"100%", border:`1px dashed ${t.border}`, background:"transparent", color:t.text, fontSize:"16px", fontWeight:"800", outline:"none" }} />
                        <input type="text" value={editForm.nom} onChange={e=>setEditForm({...editForm, nom: e.target.value.toUpperCase()})} placeholder="Nom" style={{ width:"100%", border:`1px dashed ${t.border}`, background:"transparent", color:t.text, fontSize:"16px", fontWeight:"800", outline:"none" }} />
                      </div>
                   ) : (
                      <div style={{ fontSize:"20px", fontWeight:"800", color:t.text, whiteSpace:"nowrap", textOverflow:"ellipsis", overflow:"hidden" }}>{editForm.prenom} {editForm.nom}</div>
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
              <button onClick={() => { setEditForm(null); setPanelMode('profile'); updatePositions(); }} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"8px", color:t.text3, fontSize:"16px", cursor:"pointer", width:"32px", height:"32px", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>
          </div>

          <div className="scroll-container" style={{ padding:"24px 20px", overflowY:"auto", display:"flex", flexDirection:"column", gap:"24px" }}>
            
            {panelMode === 'indicators' && selectedPerson && (
               <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                  {selectedPersonCriteres.length === 0 ? (
                    <div style={{ padding:"40px", textAlign:"center", color:t.text3, fontStyle:"italic", fontSize:"13px" }}>Aucun indicateur assigné.</div>
                  ) : (
                    selectedPersonCriteres.map(c => {
                       const isConforme = c.statut === "conforme";
                       const isNC = c.statut === "non-conforme";
                       const labelStatut = isConforme ? "Conforme" : isNC ? "Non conforme" : c.statut === "en-cours" ? "En cours" : "Non évalué";
                       const themeStatut = { "conforme": { c:t.green, bg:t.greenBg, bd:t.greenBd }, "non-conforme": { c:t.red, bg:t.redBg, bd:t.redBd }, "en-cours": { c:t.amber, bg:t.amberBg, bd:t.amberBd }, "non-concerne": { c:t.text3, bg:t.surface3, bd:t.border } }[c.statut] || { c:t.text2, bg:t.surface2, bd:t.border };
                       const cConf = CRITERES_LABELS[c.critere] || { bg:t.surface2, bd:t.border, color:t.text };
                       const d = days(c.delai);

                       return (
                         <div key={c.id} onClick={() => setModalCritere(c)} style={{ background:t.surface, border:`1px solid ${themeStatut.bd}`, borderRadius:"10px", padding:"16px", cursor:"pointer", transition:"all 0.2s", boxShadow:t.shadowSm }} onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e=>e.currentTarget.style.transform="translateY(0)"}>
                           <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
                             <span style={{ display:"inline-block", background: cConf.bg, border: `1px solid ${cConf.bd}`, color: cConf.color, padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "800" }}>
                               {formatInd(c.critere, c.num)}
                             </span>
                             <span style={{ background:themeStatut.bg, border:`1px solid ${themeStatut.bd}`, color:themeStatut.c, fontSize:"9px", fontWeight:"800", padding:"3px 8px", borderRadius:"5px" }}>{labelStatut}</span>
                           </div>
                           <div style={{ fontSize:"13px", fontWeight:"600", color:t.text, lineHeight:"1.4", marginBottom:"12px" }}>{c.titre}</div>
                           <div style={{ display:"flex", justifyContent:"flex-end" }}>
                             <span style={{ fontSize:"11px", fontWeight:"800", color: d < 0 && !isConforme && c.statut !== "non-concerne" ? t.red : t.text3 }}>{d < 0 && !isConforme && c.statut !== "non-concerne" ? "DÉPASSÉ" : `Échéance J-${d}`}</span>
                           </div>
                         </div>
                       )
                    })
                  )}
               </div>
            )}

            {panelMode === 'profile' && (
              <>
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

                {/* Affichage des Étiquettes en mode VUE */}
                {!editForm.isEditing && editForm.tags && editForm.tags.length > 0 && (
                   <div style={{ marginTop:"8px" }}>
                     <div style={{ fontSize:"11px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>Missions</div>
                     <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                       {editForm.tags.map(tag => (
                          <span key={tag} style={{ background:t.accentBg, color:t.accent, border:`1px solid ${t.accentBd}`, padding:"4px 10px", borderRadius:"8px", fontSize:"11px", fontWeight:"800" }}>{tag}</span>
                       ))}
                     </div>
                   </div>
                )}

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

                    {/* SELECTION DES ETIQUETTES EN MODE EDITION */}
                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                        <div style={{ fontSize:"11px", fontWeight:"800", color:t.text3, textTransform:"uppercase", letterSpacing:"1px" }}>Étiquettes (Missions transverses)</div>
                      </div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                         {[...new Set([...orgTags, ...editForm.tags])].map(tag => (
                           <label key={tag} style={{ display:"flex", alignItems:"center", gap:"8px", background:editForm.tags.includes(tag)?t.accentBg:t.surface2, border:`1px solid ${editForm.tags.includes(tag)?t.accentBd:t.border}`, padding:"6px 12px", borderRadius:"20px", cursor:"pointer", fontSize:"12px", color:editForm.tags.includes(tag)?t.accent:t.text }}>
                             <input type="checkbox" checked={editForm.tags.includes(tag)} onChange={()=>setEditForm({...editForm, tags: toggleArrayItem(editForm.tags, tag)})} style={{ display:"none" }} />
                             {tag}
                           </label>
                         ))}
                      </div>
                    </div>

                    <button onClick={submitForm} style={{ width:"100%", background:t.accent, color:"white", border:"none", padding:"14px", borderRadius:"8px", fontSize:"14px", fontWeight:"700", cursor:"pointer", boxShadow:`0 4px 12px ${t.accentBd}` }}>
                      💾 Enregistrer le profil
                    </button>
                  </>
                )}

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
                        onClick={() => { setPanelMode('indicators'); updatePositions(); }}
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
