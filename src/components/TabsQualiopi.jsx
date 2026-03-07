import React, { useState } from "react";
import { CRITERES_LABELS, STATUT_CONFIG } from "../data";

export function CriteresTab({ searchTerm, setSearchTerm, filterStatut, setFilterStatut, filterCritere, setFilterCritere, filtered, days, setModalCritere, t }) {
  
  const [vue, setVue] = useState("table"); 

  const statsCounts = {
    conforme: filtered.filter(c => c.statut === "conforme").length,
    "en-cours": filtered.filter(c => c.statut === "en-cours").length,
    "non-conforme": filtered.filter(c => c.statut === "non-conforme").length,
    "non-concerne": filtered.filter(c => c.statut === "non-concerne").length
  };

  // FONCTION INTELLIGENTE : Transforme "Indicateur 1" en "1.1"
  const formatInd = (critere, num) => {
    const match = String(num).match(/(\d+)$/);
    const n = match ? match[1] : String(num).replace(/\D/g, '');
    return `${critere}.${n}`;
  };

  return (
    <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"16px", paddingBottom:"40px" }}>
      <style>{`
        .ro { transition:background 0.15s; cursor:pointer; }
        .ro:hover { background:${t.surface2}!important; }
        .stat-card { transition:all 0.2s; cursor:pointer; border:1px solid ${t.border}; }
        .stat-card:hover { transform:translateY(-2px); box-shadow:${t.shadowMd}!important; }
        .fil:hover { border-color:${t.accent}!important; background:${t.accentBg}!important; color:${t.accent}!important; }
        .scroll-container::-webkit-scrollbar { height: 6px; width: 6px; }
        .scroll-container::-webkit-scrollbar-track { background: transparent; }
        .scroll-container::-webkit-scrollbar-thumb { background: ${t.border2}; border-radius: 4px; }
      `}</style>

      {/* ── 4 CARTES KPI ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"12px" }}>
        {[
          { id:"conforme",     l:"Conformes",     v:statsCounts["conforme"],     c:t.green, bg:t.greenBg, bd:t.greenBd },
          { id:"en-cours",     l:"En cours",      v:statsCounts["en-cours"],     c:t.amber, bg:t.amberBg, bd:t.amberBd },
          { id:"non-conforme", l:"Non conformes", v:statsCounts["non-conforme"], c:t.red,   bg:t.redBg,   bd:t.redBd },
          { id:"non-concerne", l:"Non concernés", v:statsCounts["non-concerne"], c:t.text3, bg:t.surface3,bd:t.border },
        ].map(s => {
          const isActive = filterStatut === s.id;
          return (
            <div key={s.id} onClick={() => setFilterStatut(isActive ? "tous" : s.id)} className="stat-card" style={{ background: isActive ? s.bg : t.surface, borderColor: isActive ? s.bd : t.border, borderRadius:"10px", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow: isActive ? t.shadowMd : `0 4px 12px ${s.bg}` }}>
              <div>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"38px", color:t.text, lineHeight:1, letterSpacing:"-1px" }}>{s.v}</div>
                <div style={{ fontSize:"12px", color:t.text2, fontWeight:"600", marginTop:"4px" }}>{s.l}</div>
              </div>
              <div style={{ width:"12px", height:"12px", borderRadius:"50%", background:s.bg, border:`1px solid ${s.bd}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:s.c }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── BARRE DE RECHERCHE ET FILTRES ── */}
      <div style={{ display:"flex", gap:"16px", alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ position:"relative", width:"260px", flexShrink:0 }}>
          <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", fontSize:"12px", color:t.text3 }}>🔍</span>
          <input 
            type="text" placeholder="Rechercher par N°, libellé..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width:"100%", background:t.surface, border:`1px solid ${t.border}`, color:t.text, padding:"8px 12px 8px 34px", fontSize:"12px", outline:"none", borderRadius:"8px", transition:"all 0.2s", boxShadow:t.shadowSm, boxSizing: "border-box" }}
          />
        </div>
        
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
          <button onClick={() => setFilterCritere("tous")} className="fil" style={{ padding:"7px 12px", borderRadius:"7px", border:`1px solid ${filterCritere==="tous"?t.accent:t.border}`, background:filterCritere==="tous"?t.accentBg:t.surface, color:filterCritere==="tous"?t.accent:t.text2, fontSize:"11px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm }}>
            Tous
          </button>
          {[1,2,3,4,5,6,7].map(num => (
            <button key={num} onClick={() => setFilterCritere(num)} className="fil" style={{ padding:"7px 10px", borderRadius:"7px", border:`1px solid ${filterCritere===num?t.accent:t.border}`, background:filterCritere===num?t.accentBg:t.surface, color:filterCritere===num?t.accent:t.text2, fontSize:"11px", fontWeight:"700", cursor:"pointer", boxShadow:t.shadowSm }}>
              C{num}
            </button>
          ))}
        </div>

        {/* Toggle Vue */}
        <div style={{ display:"flex", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"8px", padding:"3px", boxShadow:t.shadowSm, marginLeft:"auto" }}>
          <button onClick={() => setVue("table")} style={{ padding:"5px 10px", borderRadius:"6px", border:"none", background: vue==="table"?t.surface2:"transparent", color: vue==="table"?t.text:t.text3, cursor:"pointer", fontSize:"13px", boxShadow: vue==="table"?t.shadowSm:"none" }}>
            ☰
          </button>
          <button onClick={() => setVue("cards")} style={{ padding:"5px 10px", borderRadius:"6px", border:"none", background: vue==="cards"?t.surface2:"transparent", color: vue==="cards"?t.text:t.text3, cursor:"pointer", fontSize:"13px", boxShadow: vue==="cards"?t.shadowSm:"none" }}>
            ⊞
          </button>
        </div>
        <div style={{ fontSize:"11px", color:t.text3, whiteSpace:"nowrap" }}><strong>{filtered.length}</strong> résultats</div>
      </div>

      {/* ── VUE TABLEAU (Anti-superposition et bulles) ── */}
      {vue === "table" && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"10px", overflow:"hidden", boxShadow:t.shadowSm, flex:1, display:"flex", flexDirection:"column" }}>
          
          <div className="scroll-container" style={{ overflowX: "auto" }}>
            <div style={{ minWidth: "750px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"80px minmax(200px, 1fr) 110px 110px 60px", padding:"8px 24px", background:t.surface2, borderBottom:`1px solid ${t.border}` }}>
                {["N°", "Libellé", "Statut", "Responsable", "Échéance"].map(h => (
                  <span key={h} style={{ fontSize:"9px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"0.8px" }}>{h}</span>
                ))}
              </div>
              
              <div className="scroll-container" style={{ maxHeight:"600px", overflowY:"auto", paddingBottom:"10px" }}>
                {filtered.length === 0 ? (
                  <div style={{ padding:"40px", textAlign:"center", color:t.text3, fontStyle:"italic", fontSize:"13px" }}>Aucun indicateur.</div>
                ) : (
                  filtered.map(c => {
                     const cConf = CRITERES_LABELS[c.critere] || { color: t.text };
                     const isConforme = c.statut === "conforme";
                     const isNC = c.statut === "non-conforme";
                     const labelStatut = isConforme ? "Conforme" : isNC ? "Non conforme" : c.statut === "en-cours" ? "En cours" : "Non évalué";
                     const themeStatut = { "conforme": { c:t.green, bg:t.greenBg, bd:t.greenBd }, "non-conforme": { c:t.red, bg:t.redBg, bd:t.redBd }, "en-cours": { c:t.amber, bg:t.amberBg, bd:t.amberBd }, "non-concerne": { c:t.text3, bg:t.surface3, bd:t.border } }[c.statut] || { c:t.text2, bg:t.surface2, bd:t.border };
                     const d = days(c.delai);

                     return (
                       <div key={c.id} className="ro" onClick={() => setModalCritere(c)} style={{ display:"grid", gridTemplateColumns:"80px minmax(200px, 1fr) 110px 110px 60px", alignItems:"center", gap:"12px", padding:"10px 24px", borderBottom:`1px solid ${t.border2}` }}>
                          
                          <div>
                            <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", background: cConf.bg, border: `1px solid ${cConf.bd}`, color: cConf.color, padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "800", fontFamily: "'Albert Sans', sans-serif", whiteSpace: "nowrap" }}>
                              {formatInd(c.critere, c.num)}
                            </span>
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize:"12px", color:t.text, paddingRight:"16px", fontWeight:"500", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                              {c.titre}
                            </div>
                          </div>
                          
                          <div>
                            <span style={{ background:themeStatut.bg, border:`1px solid ${themeStatut.bd}`, color:themeStatut.c, fontSize:"9px", fontWeight:"800", padding:"3px 8px", borderRadius:"5px" }}>
                              {labelStatut}
                            </span>
                          </div>
                          
                          <span style={{ fontSize:"11px", color:t.text2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {c.responsables?.[0] || "—"}
                          </span>
                          
                          <span style={{ fontSize:"11px", fontWeight:"normal", color: d < 0 && c.statut !== "conforme" && c.statut !== "non-concerne" ? t.red : t.text3, fontFamily:"'DM Mono',monospace", textAlign:"right" }}>
                            {c.delai ? new Date(c.delai).toLocaleDateString("fr-FR").substring(0,5) : "—"}
                          </span>
                       </div>
                     )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VUE VIGNETTES ── */}
      {vue === "cards" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"24px", overflow:"visible", paddingBottom:"40px" }}>
          {[1,2,3,4,5,6,7].map(num => {
            const inds = filtered.filter(c => c.critere === num);
            if (inds.length === 0) return null;
            const cConf = CRITERES_LABELS[num];

            return (
              <div key={num} style={{ background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"20px", boxShadow:t.shadowSm }}>
                
                <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px" }}>
                   <div style={{ width:"28px", height:"28px", borderRadius:"6px", background:cConf.bg, border:`1px solid ${cConf.bd}`, display:"flex", alignItems:"center", justifyContent:"center", color:cConf.color, fontWeight:"800", fontSize:"12px" }}>C{num}</div>
                   <div>
                     <div style={{ fontSize:"14px", fontWeight:"800", color:cConf.color }}>Critère {num}</div>
                     <div style={{ fontSize:"10px", color:t.text3 }}>{cConf.desc}</div>
                   </div>
                </div>
                
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:"12px" }}>
                   {inds.map(c => {
                      const isConforme = c.statut === "conforme";
                      const isNC = c.statut === "non-conforme";
                      const labelStatut = isConforme ? "Conforme" : isNC ? "Non conforme" : c.statut === "en-cours" ? "En cours" : "Non évalué";
                      const themeStatut = { "conforme": { c:t.green, bg:t.greenBg, bd:t.greenBd }, "non-conforme": { c:t.red, bg:t.redBg, bd:t.redBd }, "en-cours": { c:t.amber, bg:t.amberBg, bd:t.amberBd }, "non-concerne": { c:t.text3, bg:t.surface3, bd:t.border } }[c.statut] || { c:t.text2, bg:t.surface2, bd:t.border };
                      
                      const preuvesCount = (c.fichiers?.length||0) + (c.chemins_reseau?.length||0) + (c.preuves ? 1 : 0);
                      const isComplete = preuvesCount > 0 && isConforme;

                      return (
                         <div key={c.id} onClick={()=>setModalCritere(c)} className="stat-card" style={{ background:t.surface, border:`1px solid ${themeStatut.bd}`, borderRadius:"8px", padding:"14px", display:"flex", flexDirection:"column", justifyContent:"space-between", boxShadow:`0 4px 12px ${themeStatut.bg}` }}>
                            <div>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
                                 <span style={{ display:"inline-block", background: cConf.bg, border: `1px solid ${cConf.bd}`, color: cConf.color, padding: "2px 8px", borderRadius:"6px", fontSize: "11px", fontWeight: "800" }}>
                                   {formatInd(c.critere, c.num)}
                                 </span>
                                 <span style={{ background:themeStatut.bg, border:`1px solid ${themeStatut.bd}`, color:themeStatut.c, fontSize:"9px", fontWeight:"800", padding:"3px 8px", borderRadius:"5px" }}>{labelStatut}</span>
                              </div>
                              <div style={{ fontSize:"12px", color:t.text, fontWeight:"500", lineHeight:"1.4", marginBottom:"14px" }}>{c.titre}</div>
                            </div>
                            
                            <div style={{ marginTop:"auto" }}>
                               <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"11px", marginBottom:"6px" }}>
                                 <span style={{ color:t.text2 }}>👤 {c.responsables?.[0]||"—"}</span>
                                 <span style={{ fontWeight:"800", color: isComplete ? t.green : preuvesCount === 0 ? t.text3 : t.text }}>
                                   {preuvesCount} preuve{preuvesCount>1?'s':''}
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
