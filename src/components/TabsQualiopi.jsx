import React from "react";
import { CRITERES_LABELS, STATUT_CONFIG } from "../data";

// ----------------------------------------------------------------------
// 🎯 ONGLET : INDICATEURS (CriteresTab)
// ----------------------------------------------------------------------
export function CriteresTab({ searchTerm, setSearchTerm, filterStatut, setFilterStatut, filterCritere, setFilterCritere, filtered, days, dayColor, setModalCritere, isArchive, t }) {
  
  // Calcul des stats contextuelles basées sur la vue actuelle
  const statsCounts = {
    conforme: filtered.filter(c => c.statut === "conforme").length,
    "en-cours": filtered.filter(c => c.statut === "en-cours").length,
    "non-conforme": filtered.filter(c => c.statut === "non-conforme").length,
    "non-concerne": filtered.filter(c => c.statut === "non-concerne").length
  };

  return (
    <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"20px", height:"100%" }}>
      <style>{`
        .ro { transition:background 0.15s; cursor:pointer; }
        .ro:hover { background:${t.surface2}!important; }
        .stat-card { transition:all 0.2s; cursor:pointer; border:1px solid ${t.border}; }
        .stat-card:hover { transform:translateY(-2px); box-shadow:${t.shadowMd}!important; }
      `}</style>

      {/* ── 4 CARTES KPI (Design Claude) ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"16px" }}>
        {[
          { id:"conforme",     l:"Conformes",     v:statsCounts["conforme"],     c:t.green, bg:t.greenBg, bd:t.greenBd },
          { id:"en-cours",     l:"En cours",      v:statsCounts["en-cours"],     c:t.amber, bg:t.amberBg, bd:t.amberBd },
          { id:"non-conforme", l:"Non conformes", v:statsCounts["non-conforme"], c:t.red,   bg:t.redBg,   bd:t.redBd },
          { id:"non-concerne", l:"Non concernés", v:statsCounts["non-concerne"], c:t.text3, bg:t.surface3,bd:t.border },
        ].map(s => {
          const isActive = filterStatut === s.id;
          return (
            <div key={s.id} onClick={() => setFilterStatut(isActive ? "tous" : s.id)} className="stat-card" style={{ background: isActive ? s.bg : t.surface, borderColor: isActive ? s.bd : t.border, borderRadius:"12px", padding:"20px", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow: isActive ? t.shadowMd : t.shadowSm }}>
              <div>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"42px", color:t.text, lineHeight:1, letterSpacing:"-1px" }}>{s.v}</div>
                <div style={{ fontSize:"13px", color:t.text2, fontWeight:"600", marginTop:"6px" }}>{s.l}</div>
              </div>
              <div style={{ width:"40px", height:"40px", borderRadius:"12px", background:s.bg, border:`1px solid ${s.bd}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ width:"12px", height:"12px", borderRadius:"50%", background:s.c, boxShadow:`0 0 10px ${s.bd}` }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── BARRE DE RECHERCHE ET FILTRES CRITÈRES ── */}
      <div style={{ display:"flex", gap:"12px", alignItems:"center", background:t.surface, padding:"12px 16px", borderRadius:"12px", border:`1px solid ${t.border}`, boxShadow:t.shadowSm, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:"250px" }}>
          <span style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", fontSize:"14px", color:t.text3 }}>🔍</span>
          <input 
            type="text" placeholder="Rechercher par N°, libellé, responsable..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width:"100%", background:t.surface2, border:`1px solid ${t.border2}`, color:t.text, padding:"10px 14px 10px 40px", fontSize:"13px", outline:"none", borderRadius:"8px", transition:"all 0.2s" }}
          />
        </div>
        <div style={{ width:"1px", height:"28px", background:t.border }}/>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
          <button onClick={() => setFilterCritere("tous")} style={{ padding:"8px 14px", borderRadius:"8px", border:`1px solid ${filterCritere==="tous"?t.accent:t.border}`, background:filterCritere==="tous"?t.accentBg:t.surface, color:filterCritere==="tous"?t.accent:t.text2, fontSize:"12px", fontWeight:"700", cursor:"pointer", transition:"all 0.15s" }}>
            Tous les critères
          </button>
          {[1,2,3,4,5,6,7].map(num => (
            <button key={num} onClick={() => setFilterCritere(num)} style={{ padding:"8px 12px", borderRadius:"8px", border:`1px solid ${filterCritere===num?t.accent:t.border}`, background:filterCritere===num?t.accentBg:t.surface, color:filterCritere===num?t.accent:t.text2, fontSize:"12px", fontWeight:"700", cursor:"pointer", transition:"all 0.15s" }}>
              C{num}
            </button>
          ))}
        </div>
        <div style={{ width:"1px", height:"28px", background:t.border }}/>
        <div style={{ fontSize:"12px", color:t.text3 }}><strong>{filtered.length}</strong> résultats</div>
      </div>

      {/* ── TABLEAU DES INDICATEURS EN LISTE ── */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:t.shadowSm, flex:1, display:"flex", flexDirection:"column" }}>
        <div style={{ display:"grid", gridTemplateColumns:"60px 1fr 180px 130px 140px 100px", padding:"12px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
          {["N°", "Indicateur", "Critère d'appartenance", "Statut", "Responsable", "Échéance"].map(h => (
            <span key={h} style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"0.8px" }}>{h}</span>
          ))}
        </div>
        
        <div style={{ overflowY:"auto", flex:1, paddingBottom:"10px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding:"40px", textAlign:"center", color:t.text3, fontStyle:"italic", fontSize:"14px" }}>Aucun indicateur ne correspond à vos critères.</div>
          ) : (
            filtered.map(c => {
               const cConf = CRITERES_LABELS[c.critere] || { color: t.text, bg: t.surface2, bd: t.border };
               const sConf = STATUT_CONFIG[c.statut] || STATUT_CONFIG["non-evalue"];
               const themeStatut = {
                 "conforme": { c:t.green, bg:t.greenBg, bd:t.greenBd },
                 "non-conforme": { c:t.red, bg:t.redBg, bd:t.redBd },
                 "en-cours": { c:t.amber, bg:t.amberBg, bd:t.amberBd },
                 "non-concerne": { c:t.text3, bg:t.surface3, bd:t.border },
                 "non-evalue": { c:t.text2, bg:t.surface2, bd:t.border }
               }[c.statut] || { c:t.text2, bg:t.surface2, bd:t.border };
               const d = days(c.delai);

               return (
                 <div key={c.id} className="ro" onClick={() => setModalCritere(c)} style={{ display:"grid", gridTemplateColumns:"60px 1fr 180px 130px 140px 100px", alignItems:"center", gap:"10px", padding:"16px 24px", borderBottom:`1px solid ${t.border2}` }}>
                    
                    {/* Numéro avec couleur du critère */}
                    <span style={{ fontSize:"14px", fontWeight:"800", color:cConf.color, fontFamily:"'DM Mono',monospace" }}>
                      {c.num}
                    </span>
                    
                    {/* Libellé */}
                    <span style={{ fontSize:"14px", color:t.text, paddingRight:"16px", fontWeight:"600", lineHeight:"1.4" }}>
                      {c.titre}
                    </span>
                    
                    {/* Critère Label */}
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:cConf.color }}/>
                      <span style={{ fontSize:"12px", color:t.text2 }}>Critère {c.critere}</span>
                    </div>
                    
                    {/* Statut Badge */}
                    <div>
                      <span style={{ background:themeStatut.bg, border:`1px solid ${themeStatut.bd}`, color:themeStatut.c, fontSize:"11px", fontWeight:"800", padding:"4px 10px", borderRadius:"6px" }}>
                        {sConf.label}
                      </span>
                    </div>
                    
                    {/* Responsable */}
                    <span style={{ fontSize:"13px", color:t.text2 }}>
                      {c.responsables?.[0] || "—"}
                    </span>
                    
                    {/* Délai (Rouge si dépassé) */}
                    <span style={{ fontSize:"13px", fontWeight:"700", color: d < 0 && c.statut !== "conforme" && c.statut !== "non-concerne" ? t.red : t.text3, fontFamily:"'DM Mono',monospace" }}>
                      {c.delai ? new Date(c.delai).toLocaleDateString("fr-FR").substring(0,5) : "—"}
                    </span>
                 </div>
               )
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 🔥 ONGLET : PRIORITÉS (AxesTab) -> Design Pro
// ----------------------------------------------------------------------
export function AxesTab({ axes, days, dayColor, setModalCritere, isArchive, isAuditMode, t }) {
  return (
    <div className="animate-fade-in" style={{ maxWidth:"1000px", margin:"0 auto" }}>
      
      {/* En-tête Pro */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"24px 32px", marginBottom:"24px", boxShadow:t.shadowSm, display:"flex", alignItems:"center", gap:"20px" }}>
        <div style={{ width:"52px", height:"52px", borderRadius:"14px", background:t.accentBg, border:`1px solid ${t.accentBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px" }}>
          🎯
        </div>
        <div>
          <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"28px", color:t.text, margin:"0 0 6px 0" }}>Plan d'action & Priorités</h2>
          <p style={{ color:t.text2, fontSize:"14px", margin:0 }}>Liste des indicateurs nécessitant une attention particulière (En écart ou En cours), triés par urgence.</p>
        </div>
      </div>

      {axes.length === 0 ? (
        <div style={{ background:t.greenBg, border:`1px solid ${t.greenBd}`, padding:"40px", textAlign:"center", borderRadius:"12px", color:t.green }}>
          <div style={{ fontSize:"40px", marginBottom:"12px" }}>🏆</div>
          <h3 style={{ margin:"0 0 8px 0", fontSize:"20px" }}>Félicitations !</h3>
          <p style={{ fontSize:"14px" }}>Aucun indicateur n'est en statut "Écart" ou "En cours". Votre établissement est parfaitement à jour.</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          {axes.map(c => {
            const d = days(c.delai);
            const sConf = STATUT_CONFIG[c.statut] || STATUT_CONFIG["non-evalue"];
            const cConf = CRITERES_LABELS[c.critere] || { color: t.text2 };
            const isNC = c.statut === "non-conforme";
            
            return (
              <div key={c.id} onClick={() => setModalCritere(c)} style={{ background:t.surface, border:`1px solid ${isNC ? t.redBd : t.border}`, borderLeft:`4px solid ${isNC ? t.red : t.amber}`, borderRadius:"10px", padding:"18px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", transition:"all 0.2s", boxShadow:t.shadowSm }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                <div style={{ flex:1, paddingRight:"20px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"8px" }}>
                    <span style={{ fontSize:"15px", fontWeight:"800", color:cConf.color, fontFamily:"'DM Mono',monospace" }}>{c.num}</span>
                    <span style={{ background:isNC ? t.redBg : t.amberBg, color:isNC ? t.red : t.amber, border:`1px solid ${isNC ? t.redBd : t.amberBd}`, fontSize:"10px", fontWeight:"800", padding:"3px 10px", borderRadius:"6px", textTransform:"uppercase", letterSpacing:"0.5px" }}>
                      {sConf.label}
                    </span>
                  </div>
                  <div style={{ fontSize:"15px", color:t.text, fontWeight:"600", lineHeight:"1.4" }}>{c.titre}</div>
                  <div style={{ fontSize:"12px", color:t.text2, marginTop:"6px", display:"flex", alignItems:"center", gap:"6px" }}>
                    <span style={{ fontSize:"14px" }}>👤</span> {c.responsables?.[0] || "Non assigné"}
                  </div>
                </div>
                <div style={{ textAlign:"right", minWidth:"120px" }}>
                  <div style={{ fontSize:"10px", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px", fontWeight:"700" }}>Échéance</div>
                  <div style={{ fontSize:"18px", fontWeight:"800", color: d < 0 ? t.red : t.amber }}>
                     {d < 0 ? "DÉPASSÉ" : `J-${d}`}
                  </div>
                  {d < 0 && <div style={{ fontSize:"11px", color:t.red, marginTop:"4px", fontWeight:"600" }}>Action immédiate requise</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 📖 ONGLET : LIVRE BLANC (LivreBlancTab) -> Haut contraste
// ----------------------------------------------------------------------
export function LivreBlancTab({ currentIfsiName, currentCampaign, criteres, t }) {
  const handlePrint = () => window.print();

  return (
    <div className="animate-fade-in" style={{ maxWidth:"1000px", margin:"0 auto", paddingBottom:"40px" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-after: always; }
          .print-card { border: 1px solid #000 !important; box-shadow: none !important; margin-bottom: 20px !important; break-inside: avoid; background: white !important; }
          .print-text { color: black !important; }
          .print-bg { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>

      {/* En-tête Livre Blanc */}
      <div className="no-print" style={{ background: t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"40px", textAlign:"center", marginBottom:"32px", boxShadow:t.shadowSm }}>
        <div style={{ fontSize:"48px", marginBottom:"16px" }}>📖</div>
        <h1 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"38px", color:t.text, margin:"0 0 12px 0" }}>Livre Blanc Qualiopi</h1>
        <p style={{ fontSize:"15px", color:t.text2, margin:"0 0 24px 0", maxWidth:"650px", marginLeft:"auto", marginRight:"auto", lineHeight:"1.6" }}>
          Ce document compile officiellement toutes vos justifications, preuves et processus pour l'établissement <strong style={{color:t.text}}>{currentIfsiName}</strong>. 
          Il est optimisé pour être lu directement par l'auditeur Qualiopi.
        </p>
        <button onClick={handlePrint} style={{ background:t.accent, color:"white", border:"none", padding:"12px 24px", borderRadius:"8px", fontSize:"14px", fontWeight:"700", cursor:"pointer", boxShadow:`0 4px 14px ${t.accentBd}`, transition:"transform 0.2s" }} onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e=>e.currentTarget.style.transform="translateY(0)"}>
          🖨️ Imprimer / Sauvegarder en PDF
        </button>
      </div>

      {/* Rendu Documentaire Haut Contraste */}
      <div style={{ display:"flex", flexDirection:"column", gap:"24px" }}>
        {criteres.filter(c => c.statut !== "non-concerne").map(c => {
          const sConf = STATUT_CONFIG[c.statut] || STATUT_CONFIG["non-evalue"];
          const cConf = CRITERES_LABELS[c.critere] || { color: t.text2 };
          
          return (
            <div key={c.id} className="print-card" style={{ background:t.surface, border:`1px solid ${t.border}`, borderTop:`4px solid ${cConf.color}`, borderRadius:"12px", padding:"28px", boxShadow:t.shadowSm }}>
              
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px", borderBottom:`1px solid ${t.border2}`, paddingBottom:"16px" }}>
                <div>
                  <div style={{ fontSize:"13px", fontWeight:"800", color:cConf.color, letterSpacing:"1px", marginBottom:"8px", fontFamily:"'DM Mono',monospace" }}>
                    INDICATEUR {c.num}
                  </div>
                  <div className="print-text" style={{ fontSize:"18px", fontWeight:"700", color:t.text, lineHeight:"1.4", maxWidth:"750px" }}>
                    {c.titre}
                  </div>
                </div>
                <div style={{ background:sConf.bg, border:`1px solid ${sConf.bd}`, color:sConf.c, fontSize:"11px", fontWeight:"800", padding:"6px 12px", borderRadius:"6px", textTransform:"uppercase" }}>
                  {sConf.label}
                </div>
              </div>

              {/* Justification & Preuves - Amélioration du contraste */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"24px" }}>
                
                {/* Colonne Justification */}
                <div>
                  <div style={{ fontSize:"12px", fontWeight:"800", color:t.text, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"10px", display:"flex", alignItems:"center", gap:"8px" }}>
                    <span style={{fontSize:"16px"}}>📝</span> Ce que nous faisons
                  </div>
                  <div className="print-bg print-text" style={{ fontSize:"14px", color:t.text2, lineHeight:"1.6", whiteSpace:"pre-wrap", background:t.surface2, border:`1px solid ${t.border}`, padding:"16px", borderRadius:"8px", minHeight:"100px" }}>
                    {c.preuves || <span style={{ fontStyle:"italic", opacity:0.6 }}>Aucune justification n'a été rédigée pour le moment.</span>}
                  </div>
                </div>
                
                {/* Colonne Documents */}
                <div>
                  <div style={{ fontSize:"12px", fontWeight:"800", color:t.text, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"10px", display:"flex", alignItems:"center", gap:"8px" }}>
                    <span style={{fontSize:"16px"}}>📎</span> Éléments de preuve
                  </div>
                  <div className="print-bg print-text" style={{ background:t.surface2, border:`1px solid ${t.border}`, padding:"16px", borderRadius:"8px", minHeight:"100px" }}>
                    {c.fichiers?.length > 0 || c.chemins_reseau?.length > 0 ? (
                      <ul style={{ margin:0, paddingLeft:"20px", fontSize:"14px", color:t.text2, lineHeight:"1.8" }}>
                        {c.fichiers?.map((f,i) => (
                          <li key={i} style={{ marginBottom:"6px" }}>
                            <strong>{f.name}</strong> {f.validated ? <span title="Preuve validée">✅</span> : <span title="En cours de travail">🚧</span>}
                          </li>
                        ))}
                        {c.chemins_reseau?.map((cr,i) => (
                          <li key={i} style={{ marginBottom:"6px" }}>
                            Lien réseau : <strong>{cr.nom}</strong> {cr.validated ? "✅" : "🚧"}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span style={{ fontSize:"14px", color:t.text2, fontStyle:"italic", opacity:0.6 }}>Aucun document joint.</span>
                    )}
                  </div>
                </div>
                
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 👤 ONGLET : RESPONSABLES (Conservé pour compatibilité avant fusion)
// ----------------------------------------------------------------------
export function ResponsablesTab({ byPerson, setModalCritere, isArchive, getRoleColor, t }) {
  return (
    <div className="animate-fade-in" style={{ padding:"40px", textAlign:"center" }}>
      <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"28px", color:t.text }}>Pôle Utilisateurs</h2>
      <p style={{ color:t.text2 }}>Cet onglet va fusionner avec le nouvel Organigramme.</p>
    </div>
  );
}
