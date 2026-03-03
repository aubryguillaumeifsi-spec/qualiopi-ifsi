import React from "react";
import { ProgressBar } from "./DashboardTab";
import { CRITERES_LABELS, STATUT_CONFIG } from "../data";

export function StatusBadge({ statut }) {
  const s = STATUT_CONFIG[statut] || STATUT_CONFIG["non-evalue"];
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>{s.label}</span>;
}

const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
const nb = col => ({ padding: "4px 10px", background: `${col}15`, color: col, borderRadius: "6px", fontSize: "12px", fontWeight: "800", textAlign: "center", border: `1px solid ${col}30`, flexShrink: 0, whiteSpace: "nowrap" });
const th = { textAlign: "left", padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "2px solid #f1f5f9", background: "#fafafa" };
const td = { padding: "11px 14px", fontSize: "13px", borderBottom: "1px solid #f8fafc", verticalAlign: "middle", color: "#374151" };
const sel = { background: "white", border: "1px solid #d1d5db", borderRadius: "7px", color: "#374151", padding: "7px 10px", fontSize: "12px", cursor: "pointer" };

export function CriteresTab({ searchTerm, setSearchTerm, filterStatut, setFilterStatut, filterCritere, setFilterCritere, filtered, days, today, dayColor, setModalCritere, isArchive }) {
  return (
    <>
      <div className="no-print" style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ background: "white", border: "1px solid #d1d5db", borderRadius: "7px", padding: "7px 12px", fontSize: "13px", width: "220px", outline: "none" }} />
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={sel}><option value="tous">Tous les statuts</option>{Object.entries(STATUT_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <select value={filterCritere} onChange={e => setFilterCritere(e.target.value)} style={sel}><option value="tous">Tous les critères</option>{Object.entries(CRITERES_LABELS).map(([n,c]) => <option key={n} value={n}>C{n} — {c.label}</option>)}</select>
        <span style={{ fontSize: "12px", color: "#9ca3af" }}>{filtered.length} indicateur(s)</span>
      </div>
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["N°","Indicateur","Responsable(s)","Échéance","Statut","Preuves fournies"].map(h => <th key={h} style={th}>{h}</th>)}<th style={th} className="no-print"></th></tr></thead>
          <tbody>{filtered.map(c => { 
            const cConf = CRITERES_LABELS[c.critere] || { label: "Critère Inconnu", color: "#9ca3af" };
            const d = days(c.delai); 
            const resps = Array.isArray(c.responsables) ? c.responsables : []; 
            const nbFiles = (c.fichiers || []).filter(f => !f.archive).length;
            const nbChemins = (c.chemins_reseau || []).length;
            const hasLink = (c.preuves || "").trim().length > 0;
            return (<tr key={c.id} className="print-break-avoid" onMouseOver={e => e.currentTarget.style.background="#f8fafc"} onMouseOut={e => e.currentTarget.style.background="white"}><td style={{ ...td, width: "110px" }}><span style={nb(cConf.color)}>{c.num || "-"}</span></td><td style={{ ...td, maxWidth: "280px", opacity: c.statut==="non-concerne"?0.6:1 }}><div style={{ fontWeight: "600", color: "#1e3a5f" }}>{c.titre || "-"}</div><div style={{ fontSize: "11px", color: "#9ca3af" }}>{cConf.label}</div></td><td style={{ ...td, maxWidth: "200px" }}>{resps.length === 0 ? <span style={{ fontSize: "11px", color: "#d97706", fontWeight: "600", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "5px", padding: "2px 8px" }}>À assigner</span> : <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>{resps.slice(0,2).map(r => { const rSafe = String(r || ""); return <span key={rSafe} style={{ fontSize: "10px", color: "#1e40af", background: "#eff6ff", border: `1px solid #bfdbfe`, borderRadius: "4px", padding: "2px 6px", fontWeight: "600" }}>{rSafe.split("(")[0].trim()}</span> })}{resps.length > 2 && <span style={{ fontSize: "10px", color: "#6b7280", background: "#f3f4f6", borderRadius: "4px", padding: "2px 6px" }}>+{resps.length-2}</span>}</div>}</td><td style={td}><div style={{ fontSize: "12px" }}>{c.statut==="non-concerne"?"-":new Date(c.delai || today).toLocaleDateString("fr-FR")}</div>{c.statut!=="non-concerne" && !isNaN(d) && <div style={{ fontSize: "10px", color: dayColor(c.delai), fontWeight: "600" }}>{d < 0 ? `${Math.abs(d)}j dépassé` : `J-${d}`}</div>}</td><td style={td}><StatusBadge statut={c.statut} /></td>
            <td style={td}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                {nbChemins > 0 && <span style={{ fontSize: "10px", color: "#065f46", background: "#d1fae5", padding: "2px 6px", borderRadius: "4px", border: "1px solid #6ee7b7", whiteSpace: "nowrap" }}>🔗 {nbChemins} Lien(s)</span>}
                {nbFiles > 0 && <span style={{ fontSize: "10px", color: "#065f46", background: "#d1fae5", padding: "2px 6px", borderRadius: "4px", border: "1px solid #6ee7b7", whiteSpace: "nowrap" }}>☁️ {nbFiles} Upload(s)</span>}
                {hasLink && <span style={{ fontSize: "10px", color: "#1d4ed8", background: "#eff6ff", padding: "2px 6px", borderRadius: "4px", border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>📝 Texte</span>}
                {nbFiles === 0 && nbChemins === 0 && !hasLink && <span style={{ fontSize: "10px", color: "#9ca3af" }}>Vide</span>}
              </div>
            </td>
            <td className="no-print" style={{ ...td, width: "80px" }}><button onClick={() => setModalCritere(c)} style={{ background: isArchive ? "#f1f5f9" : "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: isArchive ? "1px solid #d1d5db" : "none", borderRadius: "6px", color: isArchive ? "#4b5563" : "white", padding: "5px 14px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>{isArchive ? "Consulter" : "Éditer"}</button></td></tr>);})}</tbody>
        </table>
      </div>
    </>
  );
}

export function AxesTab({ axes, days, today, dayColor, setModalCritere, isArchive, isAuditMode }) {
  return (
    <>
      <div style={{ marginBottom: "22px" }}><h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>Axes prioritaires d'amélioration</h2></div>
      {["non-conforme","en-cours"].map(st => {
        const items = axes.filter(c => c.statut === st); if (items.length === 0) return null; const isNC = st === "non-conforme";
        return (<div key={st}><div className="print-break-avoid" style={{ fontSize: "12px", color: isNC?"#991b1b":"#92400e", fontWeight: "700", marginBottom: "10px", textTransform: "uppercase" }}>{isNC ? "🔴 Non conformes — Action immédiate" : "🟠 En cours — À finaliser"}</div>
          {items.map(c => {
            const cConf = CRITERES_LABELS[c.critere] || { label: "Critère", color: "#9ca3af" };
            const d = days(c.delai);
            return (<div key={c.id} className="print-break-avoid" style={{ background: "white", border: `1px solid ${isNC?"#fca5a5":"#fcd34d"}`, borderLeft: `4px solid ${isNC?"#dc2626":"#d97706"}`, borderRadius: "10px", padding: "16px 20px", marginBottom: "10px" }}><div style={{ display: "flex", gap: "12px" }}><span style={nb(cConf.color)}>{c.num || "-"}</span><div style={{ flex: 1 }}><div style={{ fontSize: "14px", fontWeight: "700" }}>{c.titre || "-"}</div><div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "8px" }}>{cConf.label}</div>{(!isAuditMode && (c.attendus||"")) && <div style={{ fontSize: "12px", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "6px", padding: "8px 12px", marginBottom: "6px" }}><span style={{ fontWeight: "700", color: "#92400e" }}>Remarques : </span>{c.attendus}</div>}{((c.fichiers && c.fichiers.length > 0) || (c.preuves||"").trim()) && <div style={{ fontSize: "12px", background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "6px", padding: "8px 12px", marginBottom: "6px" }}><span style={{ fontWeight: "700", color: "#065f46" }}>{isAuditMode ? "Preuves :" : "Preuves finalisées :"} </span>{c.fichiers?.length > 0 ? `${c.fichiers.length} document(s) joint(s). ` : ""}{c.preuves}</div>}{(!isAuditMode && (c.preuves_encours||"").trim()) && <div style={{ fontSize: "12px", background: "#fefce8", border: "1px solid #fde68a", borderRadius: "6px", padding: "8px 12px" }}><span style={{ fontWeight: "700", color: "#d97706" }}>En cours : </span>{c.preuves_encours}</div>}</div><div style={{ textAlign: "right", minWidth: "140px" }}><StatusBadge statut={c.statut} /><div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>{new Date(c.delai || today).toLocaleDateString("fr-FR")}</div>{!isNaN(d) && <div style={{ fontSize: "10px", color: dayColor(c.delai), fontWeight: "700" }}>{d < 0 ? `${Math.abs(d)}j dépassé` : `J-${d}`}</div>}<button onClick={() => setModalCritere(c)} style={{ marginTop: "8px", background: isArchive ? "#f1f5f9" : (isNC?"#fff5f5":"#fffbeb"), border:`1px solid ${isArchive ? "#d1d5db" : (isNC?"#fca5a5":"#fcd34d")}`, borderRadius: "6px", color: isArchive ? "#4b5563" : (isNC?"#dc2626":"#92400e"), padding: "4px 12px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>{isArchive ? "Consulter" : "Éditer"}</button></div></div></div>)
          })}
        </div>);
      })}
    </>
  );
}

export function ResponsablesTab({ byPerson, setModalCritere, isArchive, getRoleColor }) {
  return (
    <>
      <div style={{ marginBottom: "22px" }}><h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>Avancement par Membre de l'équipe</h2></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(420px,1fr))", gap: "16px" }}>
        {byPerson.map(p => {
          const conformes = p.items.filter(c => c.statut==="conforme").length;
          return (
            <div key={p.id} className="print-break-avoid" style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#f1f5f9", border: `2px solid #cbd5e1`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", color: "#475569", flexShrink: 0 }}>{p.name.substring(0,2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                   <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a5f" }}>{p.name}</div>
                   <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                     {p.roles.map(r => {
                        const cCol = getRoleColor(r);
                        return <span key={r} style={{ fontSize: "10px", background: cCol.bg, color: cCol.text, border: `1px solid ${cCol.border}`, padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>{r}</span>
                     })}
                     {p.roles.length === 0 && <span style={{ fontSize: "10px", color: "#9ca3af" }}>Sans rôle défini</span>}
                   </div>
                </div>
              </div>
              {p.items.length > 0 ? (
                <>
                  <ProgressBar value={conformes} max={p.items.length} color="#1d4ed8" />
                  <div style={{ marginTop: "12px" }}>
                    {p.items.sort((a,b) => ({"non-conforme":0,"en-cours":1,"non-evalue":2,"conforme":3,"non-concerne":4}[a.statut])-({"non-conforme":0,"en-cours":1,"non-evalue":2,"conforme":3,"non-concerne":4}[b.statut])).map(c => {
                      const cConf = CRITERES_LABELS[c.critere] || { color: "#9ca3af" };
                      return (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderBottom: "1px solid #f8fafc", opacity: c.statut==="non-concerne"?0.6:1 }}><span style={nb(cConf.color)}>{c.num || "-"}</span><div style={{ flex: 1, fontSize: "12px" }}>{c.titre || "-"}</div><StatusBadge statut={c.statut} /><button onClick={() => setModalCritere(c)} style={{ background: isArchive?"#f1f5f9":"white", border: "1px solid #e2e8f0", borderRadius: "5px", color: isArchive?"#4b5563":"#1d4ed8", padding: "3px 10px", fontSize: "10px", cursor: "pointer", fontWeight: "600" }}>{isArchive?"Vue":"Éditer"}</button></div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}>Aucun indicateur affecté pour le moment.</div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function LivreBlancTab({ currentIfsiName, currentCampaign, criteres }) {
  return (
    <div style={{ background: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.05)", maxWidth: "900px", margin: "0 auto", color: "black", fontFamily: "Arial, sans-serif" }}>
      <div className="no-print" style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#eff6ff", padding: "16px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
        <p style={{ margin: 0, color: "#1d4ed8", fontWeight: "600", fontSize: "14px" }}>Ceci est la vue propre optimisée pour l'impression ou l'export PDF du rapport officiel.</p>
        <button onClick={() => window.print()} style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>🖨️ Générer le PDF</button>
      </div>

      <div style={{ textAlign: "center", marginBottom: "40px", borderBottom: "3px solid #1e3a5f", paddingBottom: "20px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "900", color: "#1e3a5f", margin: "0 0 10px 0" }}>Livre Blanc Qualiopi</h1>
        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#475569", margin: "0 0 10px 0" }}>{currentIfsiName}</h2>
        <div style={{ fontSize: "14px", color: "#64748b" }}>Généré le {new Date().toLocaleDateString('fr-FR')} • Évaluation : {currentCampaign.name}</div>
      </div>

      {criteres.slice().sort((a,b) => parseInt(a.num) - parseInt(b.num)).map(c => {
         const cConf = CRITERES_LABELS[c.critere] || { label: "Critère", color: "#9ca3af" };
         const validFiles = (c.fichiers || []).filter(f => f.validated);
         const validChemins = (c.chemins_reseau || []).filter(ch => ch.validated);
         const hasPreuves = validFiles.length > 0 || validChemins.length > 0 || (c.preuves && c.preuves.trim());
         
         if (c.statut === "non-concerne") return null; 

         return (
           <div key={c.id} className="print-break-avoid" style={{ marginBottom: "30px", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
             <div style={{ background: "#f8fafc", padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                 <span style={{ background: cConf.color, color: "white", padding: "4px 10px", borderRadius: "6px", fontWeight: "900", fontSize: "14px" }}>{c.num}</span>
                 <span style={{ fontWeight: "700", color: "#1e3a5f", fontSize: "15px" }}>{c.titre}</span>
               </div>
               <StatusBadge statut={c.statut} />
             </div>
             <div style={{ padding: "16px" }}>
               <div style={{ marginBottom: "16px", fontSize: "13px" }}>
                 <strong style={{ color: "#475569" }}>Responsable(s) de l'indicateur : </strong>
                 {c.responsables && c.responsables.length > 0 ? (<span style={{ color: "#1e3a5f", fontWeight: "600" }}>{c.responsables.join(', ')}</span>) : (<span style={{ color: "#9ca3af", fontStyle: "italic" }}>Non assigné</span>)}
               </div>
               <div>
                 <strong style={{ color: "#475569", fontSize: "13px", display: "block", marginBottom: "8px" }}>Éléments de preuve présentés :</strong>
                 {!hasPreuves ? (<div style={{ fontSize: "13px", color: "#9ca3af", fontStyle: "italic", background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>Aucune preuve validée.</div>) : (
                   <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px", borderRadius: "8px" }}>
                     {c.preuves && (<div style={{ fontSize: "13px", color: "#166534", whiteSpace: "pre-wrap", marginBottom: (validFiles.length > 0 || validChemins.length > 0) ? "12px" : "0" }}>{c.preuves}</div>)}
                     {validChemins.length > 0 && (<div style={{ marginBottom: validFiles.length > 0 ? "8px" : "0" }}>{validChemins.map((link, i) => (<div key={i} style={{ fontSize: "12px", color: "#065f46", display: "flex", gap: "6px", alignItems: "flex-start", marginBottom: "4px" }}><span>🔗</span> <span style={{ fontWeight: "600" }}>{link.nom}</span> <span style={{ color: "#10b981" }}>({link.chemin})</span></div>))}</div>)}
                     {validFiles.length > 0 && (<div>{validFiles.map((file, i) => (<div key={i} style={{ fontSize: "12px", color: "#065f46", display: "flex", gap: "6px", alignItems: "center", marginBottom: "4px" }}><span>☁️</span> <span style={{ fontWeight: "600" }}>{file.name}</span></div>))}</div>)}
                   </div>
                 )}
               </div>
             </div>
           </div>
         )
      })}
      <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "2px solid #e2e8f0", textAlign: "center", fontSize: "11px", color: "#9ca3af" }}>Document officiel généré par QualiForma</div>
    </div>
  );
}
