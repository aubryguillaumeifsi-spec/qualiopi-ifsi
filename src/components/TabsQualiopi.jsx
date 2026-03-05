import React, { useState } from "react";
import { CRITERES_LABELS, STATUT_CONFIG } from "../data";

// ----------------------------------------------------------------------
// 🎯 ONGLET : INDICATEURS
// ----------------------------------------------------------------------
export function CriteresTab({ searchTerm, setSearchTerm, filterStatut, setFilterStatut, filterCritere, setFilterCritere, filtered, days, setModalCritere, t }) {
  
  const [vue, setVue] = useState("table"); 

  const statsCounts = {
    conforme: filtered.filter(c => c.statut === "conforme").length,
    "en-cours": filtered.filter(c => c.statut === "en-cours").length,
    "non-conforme": filtered.filter(c => c.statut === "non-conforme").length,
    "non-concerne": filtered.filter(c => c.statut === "non-concerne").length
  };

  return (
    <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"24px", height:"100%" }}>
      <style>{`
        .ro { transition:background 0.15s; cursor:pointer; }
        .ro:hover { background:${t.surface2}!important; }
        .stat-card { transition:all 0.2s; cursor:pointer; border:1px solid ${t.border}; }
        .stat-card:hover { transform:translateY(-2px); box-shadow:${t.shadowMd}!important; }
        .fil:hover { border-color:${t.accent}!important; background:${t.accentBg}!important; color:${t.accent}!important; }
      `}</style>

      {/* ── 4 CARTES KPI (Sans bulles pour les points) ── */}
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
              <div style={{ width:"14px", height:"14px", borderRadius:"50%", background:s.c, boxShadow:`0 0 10px ${s.bd}` }}/>
            </div>
          );
        })}
      </div>

      {/* ── BARRE DE RECHERCHE ET FILTRES ── */}
      <div style={{ display:"flex", gap:"16px", alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:"250px", maxWidth:"400px" }}>
          <span style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", fontSize:"14px", color:t.text3 }}>🔍</span>
          <input 
            type="text" placeholder="Rechercher par N°, libellé..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width:"100%", background:t.surface, border:`1px solid ${t.border}`, color:t.text, padding:"10px 14px 10px 40px", fontSize:"13px", outline:"none", borderRadius:"8px", transition:"all 0.2s", boxShadow:t.shadowSm }}
          />
        </div>
        
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
          <button onClick={() => setFilterCritere("tous")} className="fil" style={{ padding:"8px 14px", borderRadius:"8px", border:`1px solid ${filterCritere==="tous"?t.accent:t.border}`, background:filterCritere==="tous"?t.accentBg:t.surface, color:filterCritere==="tous"?t.accent:t.text2, fontSize:"12px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm }}>
            Tous les critères
          </button>
          {[1,2,3,4,5,6,7].map(num => (
            <button key={num} onClick={() => setFilterCritere(num)} className="fil" style={{ padding:"8px 12px", borderRadius:"8px", border:`1px solid ${filterCritere===num?t.accent:t.border}`, background:filterCritere===num?t.accentBg:t.surface, color:filterCritere===num?t.accent:t.text2, fontSize:"12px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm }}>
              C{num}
            </button>
          ))}
        </div>

        {/* Toggle d'Affichage (Grille / Liste) */}
        <div style={{ display:"flex", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"8px", padding:"4px", boxShadow:t.shadowSm, marginLeft:"auto" }}>
          <button onClick={() => setVue("table")} style={{ padding:"6px 12px", borderRadius:"6px", border:"none", background: vue==="table"?t.surface2:"transparent", color: vue==="table"?t.text:t.text3, cursor:"pointer", fontSize:"14px", boxShadow: vue==="table"?t.shadowSm:"none" }}>
            ☰
          </button>
          <button onClick={() => setVue("cards")} style={{ padding:"6px 12px", borderRadius:"6px", border:"none", background: vue==="cards"?t.surface2:"transparent", color: vue==="cards"?t.text:t.text3, cursor:"pointer", fontSize:"14px", boxShadow: vue==="cards"?t.shadowSm:"none" }}>
            ⊞
          </button>
        </div>

        <div style={{ fontSize:"13px", color:t.text3, whiteSpace:"nowrap" }}><strong>{filtered.length}</strong> résultats</div>
      </div>

      {/* ── VUE TABLEAU (Superposition corrigée & Polices) ── */}
      {vue === "table" && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"visible", boxShadow:t.shadowSm, flex:1, display:"flex", flexDirection:"column" }}>
          <div style={{ display:"grid", gridTemplateColumns:"120px minmax(200px, 1fr) 140px 120px 120px 80px", padding:"12px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
            {["N°", "Indicateur", "Critère", "Statut", "Responsable", "Échéance"].map(h => (
              <span key={h} style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"0.8px" }}>{h}</span>
            ))}
          </div>
          
          <div style={{ paddingBottom:"10px" }}>
            {filtered.length === 0 ? (
              <div style={{ padding:"40px", textAlign:"center", color:t.text3, fontStyle:"italic", fontSize:"14px" }}>Aucun indicateur.</div>
            ) : (
              filtered.map(c => {
                 const cConf = CRITERES_LABELS[c.critere] || { color: t.text };
                 const sConf = STATUT_CONFIG[c.statut] || STATUT_CONFIG["non-evalue"];
                 const themeStatut = { "conforme": { c:t.green, bg:t.greenBg, bd:t.greenBd }, "non-conforme": { c:t.red, bg:t.redBg, bd:t.redBd }, "en-cours": { c:t.amber, bg:t.amberBg, bd:t.amberBd } }[c.statut] || { c:t.text2, bg:t.surface2, bd:t.border };
                 const d = days(c.delai);

                 return (
                   <div key={c.id} className="ro" onClick={() => setModalCritere(c)} style={{ display:"grid", gridTemplateColumns:"120px minmax(200px, 1fr) 140px 120px 120px 80px", alignItems:"center", gap:"12px", padding:"16px 24px", borderBottom:`1px solid ${t.border2}` }}>
                      
                      <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"22px", color:cConf.color, whiteSpace:"nowrap" }}>
                        Indicateur {c.num.replace('C', '')}
                      </div>
                      
                      <span style={{ fontSize:"14px", color:t.text, paddingRight:"16px", fontWeight:"600", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {c.titre}
                      </span>
                      
                      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                        <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:cConf.color }}/>
                        <span style={{ fontSize:"12px", color:t.text2 }}>Critère {c.critere}</span>
                      </div>
                      
                      <div>
                        <span style={{ background:themeStatut.bg, border:`1px solid ${themeStatut.bd}`, color:themeStatut.c, fontSize:"11px", fontWeight:"800", padding:"4px 10px", borderRadius:"6px" }}>
                          {sConf.label}
                        </span>
                      </div>
                      
                      <span style={{ fontSize:"13px", color:t.text2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {c.responsables?.[0] || "—"}
                      </span>
                      
                      <span style={{ fontSize:"13px", fontWeight:"700", color: d < 0 && c.statut !== "conforme" && c.statut !== "non-concerne" ? t.red : t.text3, fontFamily:"'DM Mono',monospace" }}>
                        {c.delai ? new Date(c.delai).toLocaleDateString("fr-FR").substring(0,5) : "—"}
                      </span>
                   </div>
                 )
              })
            )}
          </div>
        </div>
      )}

      {/* ── VUE VIGNETTES (MOCKUP REPRODUIT À L'IDENTIQUE) ── */}
      {vue === "cards" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"32px", overflow:"visible", paddingBottom:"40px" }}>
          {[1,2,3,4,5,6,7].map(num => {
            const inds = filtered.filter(c => c.critere === num);
            if (inds.length === 0) return null;
            const cConf = CRITERES_LABELS[num];

            return (
              <div key={num}>
                {/* En-tête du Critère façon Mockup */}
                <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px", paddingBottom:"8px" }}>
                   <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:cConf.bg, border:`1px solid ${cConf.bd}`, display:"flex", alignItems:"center", justifyContent:"center", color:cConf.color, fontWeight:"800", fontSize:"14px" }}>C{num}</div>
                   <div>
                     <div style={{ fontSize:"16px", fontWeight:"800", color:cConf.color }}>Critère {num}</div>
                     <div style={{ fontSize:"11px", color:t.text3 }}>{inds.length} indicateurs filtrés</div>
                   </div>
                </div>
                
                {/* Grille des cartes */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:"16px" }}>
                   {inds.map(c => {
                      const sConf = STATUT_CONFIG[c.statut] || STATUT_CONFIG["non-evalue"];
                      const themeStatut = { "conforme": { c:t.green, bg:t.surface }, "non-conforme": { c:t.red, bg:t.surface }, "en-cours": { c:t.amber, bg:t.surface }, "non-concerne": { c:t.text3, bg:t.surface } }[c.statut] || { c:t.text2, bg:t.surface };
                      
                      const preuvesCount = (c.fichiers?.length||0) + (c.chemins_reseau?.length||0) + (c.preuves ? 1 : 0);
                      const isComplete = preuvesCount > 0 && c.statut === "conforme";

                      return (
                         <div key={c.id} onClick={()=>setModalCritere(c)} className="stat-card" style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"16px", display:"flex", flexDirection:"column", justifyContent:"space-between", boxShadow:t.shadowSm }}>
                            <div>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                                 <span style={{ fontSize:"14px", fontWeight:"800", color:cConf.color, fontFamily:"'DM Mono',monospace" }}>{c.num}</span>
                                 <span style={{ background:t.surface, border:`1px solid ${themeStatut.c}`, color:themeStatut.c, fontSize:"10px", fontWeight:"800", padding:"3px 8px", borderRadius:"4px" }}>{sConf.label}</span>
                              </div>
                              <div style={{ fontSize:"13px", color:t.text, fontWeight:"600", lineHeight:"1.4", marginBottom:"16px" }}>{c.titre}</div>
                            </div>
                            
                            <div style={{ marginTop:"auto" }}>
                               <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"12px", marginBottom:"8px" }}>
                                 <span style={{ color:t.text2 }}>👤 {c.responsables?.[0]||"—"}</span>
                                 <span style={{ fontWeight:"800", color: isComplete ? t.green : preuvesCount === 0 ? t.red : t.text }}>
                                   {preuvesCount}/{preuvesCount>0?preuvesCount:1} preuves
                                 </span>
                               </div>
                               <div style={{ height:"3px", background:t.border, borderRadius:"2px" }}>
                                 <div style={{ width: isComplete ? "100%" : preuvesCount>0 ? "50%" : "0%", height:"100%", background: isComplete ? t.green : t.amber, borderRadius:"2px" }}/>
                               </div>
                            </div>
                         </div>
                      )
                   })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}

export function AxesTab({ axes, days, dayColor, setModalCritere, t }) {
  return (
    <div className="animate-fade-in" style={{ maxWidth:"1000px", margin:"0 auto" }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"24px 32px", marginBottom:"24px", boxShadow:t.shadowSm, display:"flex", alignItems:"center", gap:"20px" }}>
        <div style={{ width:"52px", height:"52px", borderRadius:"14px", background:t.accentBg, border:`1px solid ${t.accentBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px" }}>🎯</div>
        <div>
          <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"28px", color:t.text, margin:"0 0 6px 0" }}>Plan d'action & Priorités</h2>
          <p style={{ color:t.text2, fontSize:"14px", margin:0 }}>Liste des indicateurs nécessitant une attention particulière.</p>
        </div>
      </div>
      {axes.length === 0 ? (
        <div style={{ background:t.greenBg, border:`1px solid ${t.greenBd}`, padding:"40px", textAlign:"center", borderRadius:"12px", color:t.green }}>
          <div style={{ fontSize:"40px", marginBottom:"12px" }}>🏆</div>
          <h3 style={{ margin:"0 0 8px 0", fontSize:"20px" }}>Félicitations !</h3>
          <p style={{ fontSize:"14px" }}>Aucun indicateur n'est en statut "Écart" ou "En cours".</p>
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
                    <span style={{ background:isNC ? t.redBg : t.amberBg, color:isNC ? t.red : t.amber, border:`1px solid ${isNC ? t.redBd : t.amberBd}`, fontSize:"10px", fontWeight:"800", padding:"3px 10px", borderRadius:"6px", textTransform:"uppercase" }}>{sConf.label}</span>
                  </div>
                  <div style={{ fontSize:"15px", color:t.text, fontWeight:"600", lineHeight:"1.4" }}>{c.titre}</div>
                </div>
                <div style={{ textAlign:"right", minWidth:"120px" }}>
                  <div style={{ fontSize:"10px", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px", fontWeight:"700" }}>Échéance</div>
                  <div style={{ fontSize:"18px", fontWeight:"800", color: d < 0 ? t.red : t.amber }}>{d < 0 ? "DÉPASSÉ" : `J-${d}`}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LivreBlancTab({ currentIfsiName, criteres, t }) {
  return (
    <div className="animate-fade-in" style={{ maxWidth:"1000px", margin:"0 auto", paddingBottom:"40px" }}>
      <div className="no-print" style={{ background: t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"40px", textAlign:"center", marginBottom:"32px", boxShadow:t.shadowSm }}>
        <div style={{ fontSize:"48px", marginBottom:"16px" }}>📖</div>
        <h1 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"38px", color:t.text, margin:"0 0 12px 0" }}>Livre Blanc Qualiopi</h1>
        <button onClick={() => window.print()} style={{ background:t.accent, color:"white", border:"none", padding:"12px 24px", borderRadius:"8px", fontSize:"14px", fontWeight:"700", cursor:"pointer", marginTop:"20px" }}>🖨️ Imprimer / PDF</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"24px" }}>
        {criteres.filter(c => c.statut !== "non-concerne").map(c => {
          const sConf = STATUT_CONFIG[c.statut] || STATUT_CONFIG["non-evalue"];
          const cConf = CRITERES_LABELS[c.critere] || { color: t.text2 };
          return (
            <div key={c.id} style={{ background:t.surface, border:`1px solid ${t.border}`, borderTop:`4px solid ${cConf.color}`, borderRadius:"12px", padding:"28px", boxShadow:t.shadowSm }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px", borderBottom:`1px solid ${t.border2}`, paddingBottom:"16px" }}>
                <div>
                  <div style={{ fontSize:"13px", fontWeight:"800", color:cConf.color, letterSpacing:"1px", marginBottom:"8px", fontFamily:"'DM Mono',monospace" }}>INDICATEUR {c.num}</div>
                  <div style={{ fontSize:"18px", fontWeight:"700", color:t.text, lineHeight:"1.4", maxWidth:"750px" }}>{c.titre}</div>
                </div>
                <div style={{ background:sConf.bg, border:`1px solid ${sConf.bd}`, color:sConf.c, fontSize:"11px", fontWeight:"800", padding:"6px 12px", borderRadius:"6px" }}>{sConf.label}</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"24px" }}>
                <div>
                  <div style={{ fontSize:"12px", fontWeight:"800", color:t.text, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"10px" }}>📝 Justification</div>
                  <div style={{ fontSize:"14px", color:t.text2, lineHeight:"1.6", whiteSpace:"pre-wrap", background:t.surface2, border:`1px solid ${t.border}`, padding:"16px", borderRadius:"8px", minHeight:"100px" }}>{c.preuves || "Aucune justification"}</div>
                </div>
                <div>
                  <div style={{ fontSize:"12px", fontWeight:"800", color:t.text, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"10px" }}>📎 Éléments de preuve</div>
                  <div style={{ background:t.surface2, border:`1px solid ${t.border}`, padding:"16px", borderRadius:"8px", minHeight:"100px" }}>
                    {c.fichiers?.length > 0 || c.chemins_reseau?.length > 0 ? (
                      <ul style={{ margin:0, paddingLeft:"20px", fontSize:"14px", color:t.text2, lineHeight:"1.8" }}>
                        {c.fichiers?.map((f,i) => <li key={i}><strong>{f.name}</strong> {f.validated ? "✅" : "🚧"}</li>)}
                        {c.chemins_reseau?.map((cr,i) => <li key={i}><strong>{cr.nom}</strong> {cr.validated ? "✅" : "🚧"}</li>)}
                      </ul>
                    ) : ( <span style={{ fontSize:"14px", color:t.text2, fontStyle:"italic" }}>Aucun document joint.</span> )}
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
