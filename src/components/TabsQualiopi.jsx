import React, { useState } from "react";
import { CRITERES_LABELS, STATUT_CONFIG } from "../data";

// ----------------------------------------------------------------------
// 🛠️ COMPOSANTS UTILITAIRES
// ----------------------------------------------------------------------
const ProgressBar = ({ pct, color, bg }) => (
  <div style={{ height:"4px", background: bg || "rgba(255,255,255,0.1)", borderRadius:"2px", overflow:"hidden", width:"100%" }}>
    <div style={{ width:`${Math.min(100, Math.max(0, pct))}%`, height:"100%", background:color, borderRadius:"2px", transition:"width 0.3s ease" }}/>
  </div>
);

// ----------------------------------------------------------------------
// 🎯 ONGLET : INDICATEURS (CriteresTab)
// ----------------------------------------------------------------------
export function CriteresTab({ searchTerm, setSearchTerm, filterStatut, setFilterStatut, filterCritere, setFilterCritere, filtered, days, today, dayColor, setModalCritere, isArchive, t }) {
  
  const statsCounts = {
    tous: filtered.length,
    conforme: filtered.filter(c => c.statut === "conforme").length,
    "en-cours": filtered.filter(c => c.statut === "en-cours").length,
    "non-conforme": filtered.filter(c => c.statut === "non-conforme").length
  };

  return (
    <div className="animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"16px", height:"100%" }}>
      <style>{`
        .crit-card { transition: all 0.2s ease; cursor: pointer; border-left: 4px solid transparent; }
        .crit-card:hover { transform: translateY(-2px); box-shadow: ${t.shadowMd} !important; background: ${t.surface2} !important; }
      `}</style>

      {/* En-tête et Filtres */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"16px 20px", boxShadow:t.shadowSm }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
          <div>
            <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"26px", color:t.text, margin:0 }}>Indicateurs Qualiopi</h2>
            <div style={{ fontSize:"12px", color:t.text3, marginTop:"2px" }}>{filtered.length} indicateur(s) filtré(s)</div>
          </div>
          <div style={{ display:"flex", gap:"10px" }}>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:"12px", top:"10px", fontSize:"12px", color:t.text3 }}>🔍</span>
              <input 
                type="text" placeholder="Chercher un indicateur..." 
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background:t.bg, border:`1px solid ${t.border}`, color:t.text, padding:"8px 12px 8px 32px", borderRadius:"8px", fontSize:"13px", width:"220px", outline:"none" }}
              />
            </div>
            <select value={filterCritere} onChange={(e) => setFilterCritere(e.target.value)} style={{ background:t.bg, border:`1px solid ${t.border}`, color:t.text, padding:"8px 12px", borderRadius:"8px", fontSize:"13px", outline:"none", cursor:"pointer" }}>
              <option value="tous">Tous les critères (1 à 7)</option>
              {[1,2,3,4,5,6,7].map(num => <option key={num} value={num}>Critère {num}</option>)}
            </select>
          </div>
        </div>

        {/* Pilules de filtres rapides */}
        <div style={{ display:"flex", gap:"8px" }}>
          {[
            { id:"tous", l:"Tous", c:t.text, bg:t.surface3, bd:t.border },
            { id:"conforme", l:"Conformes", c:t.green, bg:t.greenBg, bd:t.greenBd },
            { id:"en-cours", l:"En cours", c:t.amber, bg:t.amberBg, bd:t.amberBd },
            { id:"non-conforme", l:"Écarts", c:t.red, bg:t.redBg, bd:t.redBd },
          ].map(f => (
            <button 
              key={f.id} onClick={() => setFilterStatut(f.id)}
              style={{ background: filterStatut === f.id ? f.bg : "transparent", border:`1px solid ${filterStatut === f.id ? f.bd : t.border}`, color: filterStatut === f.id ? f.c : t.text3, padding:"6px 14px", borderRadius:"20px", fontSize:"12px", fontWeight:"600", cursor:"pointer", transition:"all 0.2s" }}
            >
              {f.l} <span style={{ opacity:0.7, marginLeft:"4px" }}>({statsCounts[f.id]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Liste des indicateurs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:"16px" }}>
        {filtered.map(c => {
          const sConf = STATUT_CONFIG[c.statut] || STATUT_CONFIG["non-evalue"];
          const themeStatut = {
            "conforme": { c:t.green, bg:t.greenBg, bd:t.greenBd },
            "non-conforme": { c:t.red, bg:t.redBg, bd:t.redBd },
            "en-cours": { c:t.amber, bg:t.amberBg, bd:t.amberBd },
            "non-concerne": { c:t.text3, bg:t.surface3, bd:t.border },
            "non-evalue": { c:t.text2, bg:t.surface2, bd:t.border }
          }[c.statut] || { c:t.text2, bg:t.surface2, bd:t.border };

          const d = days(c.delai);
          const hasAlert = d < 30 && c.statut !== "conforme" && c.statut !== "non-concerne";
          const preuvesCount = (c.fichiers?.length||0) + (c.chemins_reseau?.length||0) + (c.preuves ? 1 : 0);

          return (
            <div key={c.id} className="crit-card" onClick={() => setModalCritere(c)} style={{ background:t.surface, border:`1px solid ${t.border}`, borderLeftColor: themeStatut.c, borderRadius:"10px", padding:"16px", boxShadow:t.shadowSm, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
                <div style={{ background:t.surface3, border:`1px solid ${t.border}`, padding:"4px 8px", borderRadius:"6px", fontSize:"12px", fontWeight:"800", color:t.text }}>{c.num}</div>
                <div style={{ background:themeStatut.bg, border:`1px solid ${themeStatut.bd}`, color:themeStatut.c, fontSize:"10px", fontWeight:"700", padding:"3px 8px", borderRadius:"5px", textTransform:"uppercase", letterSpacing:"0.5px" }}>
                  {sConf.label}
                </div>
              </div>
              
              <div style={{ fontSize:"13px", color:t.text, fontWeight:"500", lineHeight:"1.4", flex:1, marginBottom:"14px" }}>
                {c.titre}
              </div>

              <div style={{ borderTop:`1px solid ${t.border2}`, paddingTop:"12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                  <span style={{ fontSize:"14px" }}>👥</span>
                  <span style={{ fontSize:"11px", color:t.text2, maxWidth:"100px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {c.responsables?.length > 0 ? c.responsables.join(", ") : "Non assigné"}
                  </span>
                </div>
                
                <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                  {preuvesCount > 0 && (
                    <span style={{ fontSize:"10px", background:t.accentBg, color:t.accent, padding:"2px 6px", borderRadius:"4px", fontWeight:"600" }}>{preuvesCount} preuve{preuvesCount>1?"s":""}</span>
                  )}
                  {hasAlert && (
                    <span style={{ fontSize:"11px", fontWeight:"800", color: d < 0 ? t.danger : t.amber }}>
                      {d < 0 ? "DÉPASSÉ" : `J-${d}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:"40px", color:t.text3, background:t.surface, border:`1px dashed ${t.border}`, borderRadius:"12px" }}>
          Aucun indicateur ne correspond à vos filtres.
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 🔥 ONGLET : PRIORITÉS (AxesTab)
// ----------------------------------------------------------------------
export function AxesTab({ axes, days, today, dayColor, setModalCritere, isArchive, isAuditMode, t }) {
  return (
    <div className="animate-fade-in" style={{ maxWidth:"900px", margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:"32px", padding:"30px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:"16px", boxShadow:t.shadowSm }}>
        <div style={{ fontSize:"40px", marginBottom:"10px" }}>🔥</div>
        <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"28px", color:t.text, margin:"0 0 8px 0" }}>Plan d'action & Priorités</h2>
        <p style={{ color:t.text2, fontSize:"14px", margin:0 }}>Liste des indicateurs en écart ou en cours, triés par urgence.</p>
      </div>

      {axes.length === 0 ? (
        <div style={{ background:t.greenBg, border:`1px solid ${t.greenBd}`, padding:"40px", textAlign:"center", borderRadius:"16px", color:t.green }}>
          <div style={{ fontSize:"40px", marginBottom:"10px" }}>🏆</div>
          <h3 style={{ margin:"0 0 8px 0" }}>Félicitations !</h3>
          <p style={{ fontSize:"14px" }}>Aucun indicateur n'est en statut "Écart" ou "En cours". Votre établissement est parfaitement à jour.</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          {axes.map(c => {
            const d = days(c.delai);
            const sConf = STATUT_CONFIG[c.statut] || STATUT_CONFIG["non-evalue"];
            const isNC = c.statut === "non-conforme";
            
            return (
              <div key={c.id} onClick={() => setModalCritere(c)} style={{ background:t.surface, border:`1px solid ${isNC ? t.redBd : t.border}`, borderLeft:`4px solid ${isNC ? t.red : t.amber}`, borderRadius:"10px", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", transition:"all 0.2s", boxShadow:t.shadowSm }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                <div style={{ flex:1, paddingRight:"20px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"6px" }}>
                    <span style={{ fontSize:"14px", fontWeight:"800", color:t.accent }}>{c.num}</span>
                    <span style={{ background:isNC ? t.redBg : t.amberBg, color:isNC ? t.red : t.amber, fontSize:"9px", fontWeight:"800", padding:"2px 8px", borderRadius:"4px", textTransform:"uppercase" }}>{sConf.label}</span>
                  </div>
                  <div style={{ fontSize:"13px", color:t.text, lineHeight:"1.4" }}>{c.titre}</div>
                </div>
                <div style={{ textAlign:"right", minWidth:"100px" }}>
                  <div style={{ fontSize:"10px", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"4px" }}>Échéance</div>
                  <div style={{ fontSize:"16px", fontWeight:"800", color: dayColor(c.delai) }}>
                     {d < 0 ? "DÉPASSÉ" : `J-${d}`}
                  </div>
                  <div style={{ fontSize:"10px", color:t.text2, marginTop:"4px" }}>{c.responsables?.[0] || "Non assigné"}</div>
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
// 👤 ONGLET : RESPONSABLES (ResponsablesTab)
// ----------------------------------------------------------------------
export function ResponsablesTab({ byPerson, setModalCritere, isArchive, getRoleColor, t }) {
  return (
    <div className="animate-fade-in" style={{ maxWidth:"1000px", margin:"0 auto" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:"20px" }}>
        {byPerson.map(person => {
          const total = person.items.length;
          const conf = person.items.filter(i => i.statut === "conforme" || i.statut === "non-concerne").length;
          const pct = total === 0 ? 0 : Math.round((conf / total) * 100);

          return (
            <div key={person.id} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"20px", boxShadow:t.shadowSm }}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px" }}>
                <div style={{ width:"40px", height:"40px", borderRadius:"10px", background:t.surface3, border:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:"800", color:t.text }}>
                  {person.name.substring(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"15px", fontWeight:"700", color:t.text }}>{person.name}</div>
                  <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginTop:"4px" }}>
                    {person.roles.length === 0 && <span style={{ fontSize:"10px", color:t.text3 }}>Aucun rôle métier</span>}
                    {person.roles.map(r => {
                      const rc = getRoleColor(r);
                      return <span key={r} style={{ background:rc.bg, color:rc.text, border:`1px solid ${rc.border}`, fontSize:"9px", fontWeight:"700", padding:"2px 6px", borderRadius:"4px" }}>{r}</span>;
                    })}
                  </div>
                </div>
              </div>

              <div style={{ background:t.surface2, borderRadius:"8px", padding:"12px", marginBottom:"16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                  <span style={{ fontSize:"11px", color:t.text2, fontWeight:"600" }}>Avancement</span>
                  <span style={{ fontSize:"12px", fontWeight:"800", color: pct===100 ? t.green : t.text }}>{pct}%</span>
                </div>
                <ProgressBar pct={pct} color={pct===100 ? t.green : t.accent} bg={t.border} />
                <div style={{ fontSize:"10px", color:t.text3, marginTop:"6px", textAlign:"right" }}>{conf} / {total} indicateur(s)</div>
              </div>

              {total > 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                  {person.items.map(c => {
                    const sConf = STATUT_CONFIG[c.statut] || STATUT_CONFIG["non-evalue"];
                    return (
                      <div key={c.id} onClick={() => setModalCritere(c)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", border:`1px solid ${t.border}`, borderRadius:"6px", cursor:"pointer", transition:"all 0.15s" }} onMouseOver={e=>e.currentTarget.style.background=t.surface2} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px", overflow:"hidden" }}>
                           <span style={{ fontSize:"11px", fontWeight:"800", color:t.accent }}>{c.num}</span>
                           <span style={{ fontSize:"11px", color:t.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.titre}</span>
                        </div>
                        <div style={{ width:"8px", height:"8px", borderRadius:"50%", background: sConf.bg, border:`1px solid ${sConf.bd}`, flexShrink:0 }} title={sConf.label}/>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize:"11px", color:t.text3, fontStyle:"italic", textAlign:"center", padding:"10px" }}>Aucun indicateur assigné.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 📖 ONGLET : LIVRE BLANC (LivreBlancTab)
// ----------------------------------------------------------------------
export function LivreBlancTab({ currentIfsiName, currentCampaign, criteres, t }) {
  const handlePrint = () => window.print();

  return (
    <div className="animate-fade-in" style={{ maxWidth:"1000px", margin:"0 auto", paddingBottom:"40px" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-after: always; }
          .print-card { border: 1px solid #ccc !important; box-shadow: none !important; margin-bottom: 20px !important; break-inside: avoid; }
          body { background: white !important; color: black !important; }
        }
      `}</style>

      {/* En-tête Livre Blanc */}
      <div className="no-print" style={{ background: `linear-gradient(135deg, ${t.nav}, ${t.surface})`, border:`1px solid ${t.border}`, borderRadius:"16px", padding:"40px", textAlign:"center", marginBottom:"32px", boxShadow:t.shadow }}>
        <div style={{ fontSize:"50px", marginBottom:"16px" }}>📖</div>
        <h1 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"36px", color:t.text, margin:"0 0 10px 0" }}>Livre Blanc Qualiopi</h1>
        <p style={{ fontSize:"15px", color:t.text2, margin:"0 0 24px 0", maxWidth:"600px", marginLeft:"auto", marginRight:"auto" }}>
          Ce document compile officiellement toutes vos justifications, preuves et processus pour l'établissement <strong>{currentIfsiName}</strong>. Idéal pour l'auditeur.
        </p>
        <button onClick={handlePrint} style={{ background:t.accent, color:"white", border:"none", padding:"12px 24px", borderRadius:"8px", fontSize:"14px", fontWeight:"700", cursor:"pointer", boxShadow:`0 4px 14px ${t.accentBd}` }}>
          🖨️ Imprimer / Exporter en PDF
        </button>
      </div>

      {/* Rendu Documentaire */}
      <div style={{ display:"flex", flexDirection:"column", gap:"24px" }}>
        {criteres.filter(c => c.statut !== "non-concerne").map(c => {
          const sConf = STATUT_CONFIG[c.statut] || STATUT_CONFIG["non-evalue"];
          return (
            <div key={c.id} className="print-card" style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"24px", boxShadow:t.shadowSm }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px", borderBottom:`1px solid ${t.border2}`, paddingBottom:"16px" }}>
                <div>
                  <div style={{ fontSize:"12px", fontWeight:"800", color:t.accent, letterSpacing:"1px", marginBottom:"6px" }}>INDICATEUR {c.num}</div>
                  <div style={{ fontSize:"16px", fontWeight:"600", color:t.text, lineHeight:"1.4" }}>{c.titre}</div>
                </div>
                <div style={{ background:sConf.bg, border:`1px solid ${sConf.bd}`, color:sConf.c, fontSize:"10px", fontWeight:"800", padding:"4px 10px", borderRadius:"6px", textTransform:"uppercase" }}>
                  {sConf.label}
                </div>
              </div>

              {/* Justification & Preuves */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
                <div>
                  <div style={{ fontSize:"11px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"8px" }}>📝 Ce que nous faisons (Justification)</div>
                  <div style={{ fontSize:"13px", color:t.text2, lineHeight:"1.6", whiteSpace:"pre-wrap", background:t.surface2, padding:"12px", borderRadius:"8px", minHeight:"80px" }}>
                    {c.preuves || <span style={{ fontStyle:"italic", opacity:0.6 }}>Aucune justification rédigée.</span>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:"11px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"8px" }}>📎 Preuves & Documents liés</div>
                  <div style={{ background:t.surface2, padding:"12px", borderRadius:"8px", minHeight:"80px" }}>
                    {c.fichiers?.length > 0 || c.chemins_reseau?.length > 0 ? (
                      <ul style={{ margin:0, paddingLeft:"16px", fontSize:"13px", color:t.text2, lineHeight:"1.6" }}>
                        {c.fichiers?.map((f,i) => <li key={i}>{f.name} {f.validated ? "✅" : "🚧"}</li>)}
                        {c.chemins_reseau?.map((cr,i) => <li key={i}>Lien : {cr.nom} {cr.validated ? "✅" : "🚧"}</li>)}
                      </ul>
                    ) : (
                      <span style={{ fontSize:"13px", color:t.text2, fontStyle:"italic", opacity:0.6 }}>Aucun document joint.</span>
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
