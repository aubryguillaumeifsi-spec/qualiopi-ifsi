import React, { useMemo } from "react";

export default function DashboardTab({ campaigns, activeCampaignId, t }) {
  
  // 1. Récupération intelligente des données (Le travail que faisait App.jsx avant)
  const currentCampaign = useMemo(() => campaigns?.find(c => c.id === activeCampaignId) || campaigns?.[0], [campaigns, activeCampaignId]);
  const criteres = useMemo(() => currentCampaign?.liste || [], [currentCampaign]);
  const auditDate = currentCampaign?.auditDate || "2026-10-15";

  // 2. Calcul des KPI
  const stats = useMemo(() => {
    const total = criteres.filter(c => c.statut !== "non-concerne").length || 1;
    return {
      total,
      conforme: criteres.filter(c => c.statut === "conforme").length,
      enCours: criteres.filter(c => c.statut === "en-cours").length,
      nonConforme: criteres.filter(c => c.statut === "non-conforme").length
    };
  }, [criteres]);

  const pct = Math.round((stats.conforme / stats.total) * 100);

  // 3. Calcul des Urgences & Jours restants
  const today = new Date();
  const days = d => { if (!d) return NaN; const p = new Date(d); return isNaN(p.getTime()) ? NaN : Math.round((p - today) / 86400000); };
  const urgents = useMemo(() => criteres.filter(c => days(c.delai) <= 30 && c.statut !== "conforme" && c.statut !== "non-concerne").sort((a,b) => days(a.delai) - days(b.delai)), [criteres]);
  
  // 4. Historique et Preuves
  const hist = useMemo(() => [...criteres].flatMap(c => c.historique?.map(h => ({ ...h, num: c.num })) || []).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5), [criteres]);
  const preuvesCount = useMemo(() => criteres.filter(c => c.preuves || c.preuves_encours || (c.fichiers && c.fichiers.length > 0)).length, [criteres]);

  // Mathématiques pour la Jauge SVG
  const r = 38; 
  const circ = 2 * Math.PI * r; 
  const offset = circ - (pct / 100) * circ;

  // Formateur de temps (ex: "il y a 4 min")
  const timeAgo = (dateString) => {
    const diff = Math.floor((new Date() - new Date(dateString)) / 60000);
    if (diff < 60) return `${diff} min`;
    if (diff < 1440) return `${Math.floor(diff/60)} h`;
    return `${Math.floor(diff/1440)} j`;
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth:"1200px", margin:"0 auto" }}>
      
      {/* 🟢 EN-TÊTE DU DASHBOARD */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"24px" }}>
        <div>
          <div style={{ fontSize:"11px", fontWeight:"700", color:t.accent, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px" }}>
            {currentCampaign?.name || "Audit Qualiopi"}
          </div>
          <h1 style={{ fontFamily:"'Instrument Serif', serif", fontSize:"38px", color:t.text, margin:0, fontWeight:"normal" }}>
            Vue Globale
          </h1>
        </div>
        <div style={{ display:"flex", gap:"10px", alignItems:"center", background:t.surface2, padding:"8px 16px", borderRadius:"10px", border:`1px solid ${t.border}` }}>
          <span style={{ fontSize:"20px" }}>🗓️</span>
          <div>
            <div style={{ fontSize:"10px", color:t.text3, textTransform:"uppercase", fontWeight:"700" }}>Date d'audit</div>
            <div style={{ fontSize:"14px", fontWeight:"600", color:t.text }}>{new Date(auditDate).toLocaleDateString("fr-FR")}</div>
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:"24px" }}>
        
        {/* 🔵 COLONNE GAUCHE (KPI PRINCIPAUX) */}
        <div style={{ display:"flex", flexDirection:"column", gap:"24px" }}>
          
          {/* GRANDE CARTE DE CONFORMITÉ */}
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"14px", padding:"28px", display:"flex", alignItems:"center", gap:"32px", boxShadow:t.shadow }}>
            
            {/* Jauge Circulaire */}
            <div style={{ position:"relative", width:"100px", height:"100px", flexShrink:0 }}>
              <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform:"rotate(-90deg)" }}>
                <circle cx="50" cy="50" r={r} fill="transparent" stroke={t.border2} strokeWidth="8"/>
                <circle cx="50" cy="50" r={r} fill="transparent" stroke={pct === 100 ? t.green : pct >= 50 ? t.gold : t.red} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s ease-out" }}/>
              </svg>
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontFamily:"'Instrument Serif', serif", fontSize:"32px", color:t.text, lineHeight:1 }}>{pct}%</span>
              </div>
            </div>

            {/* Blocs de stats */}
            <div style={{ display:"flex", gap:"16px", flex:1 }}>
              <div style={{ flex:1, background:t.greenBg, border:`1px solid ${t.greenBd}`, borderRadius:"10px", padding:"16px" }}>
                <div style={{ fontSize:"10px", fontWeight:"700", color:t.green, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"4px" }}>Conformes</div>
                <div style={{ fontFamily:"'Instrument Serif', serif", fontSize:"36px", color:t.text, lineHeight:1 }}>{stats.conforme}</div>
              </div>
              <div style={{ flex:1, background:t.amberBg, border:`1px solid ${t.amberBd}`, borderRadius:"10px", padding:"16px" }}>
                <div style={{ fontSize:"10px", fontWeight:"700", color:t.amber, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"4px" }}>En cours</div>
                <div style={{ fontFamily:"'Instrument Serif', serif", fontSize:"36px", color:t.text, lineHeight:1 }}>{stats.enCours}</div>
              </div>
              <div style={{ flex:1, background:t.redBg, border:`1px solid ${t.redBd}`, borderRadius:"10px", padding:"16px" }}>
                <div style={{ fontSize:"10px", fontWeight:"700", color:t.red, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"4px" }}>Écarts</div>
                <div style={{ fontFamily:"'Instrument Serif', serif", fontSize:"36px", color:t.text, lineHeight:1 }}>{stats.nonConforme}</div>
              </div>
            </div>
          </div>

          {/* Ici, on pourra rajouter plus tard un beau tableau des indicateurs urgents ou des graphiques ! */}

        </div>

        {/* 🟠 COLONNE DROITE (WIDGETS) */}
        <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
          
          {/* URGENCES */}
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"16px", boxShadow:t.shadowSm }}>
            <div style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>⚠️ Urgences & Délais</div>
            {urgents.length === 0 ? (
              <div style={{ fontSize:"12px", color:t.text2, fontStyle:"italic" }}>Aucune échéance proche.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {urgents.slice(0, 4).map(u => (
                  <div key={u.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", background:t.redBg, border:`1px solid ${t.redBd}`, borderRadius:"6px" }}>
                    <span style={{ fontSize:"12px", fontWeight:"600", color:t.text }}>{u.num}</span>
                    <span style={{ fontSize:"10px", color:t.red, fontWeight:"700" }}>{days(u.delai) < 0 ? "DÉPASSÉ" : `J-${days(u.delai)}`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTIVITÉ RÉCENTE */}
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", padding:"16px", boxShadow:t.shadowSm, flex:1 }}>
            <div style={{ fontSize:"10px", fontWeight:"700", color:t.text3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"16px" }}>⚡ Activité récente</div>
            {hist.length === 0 ? (
              <div style={{ fontSize:"12px", color:t.text2, fontStyle:"italic" }}>Aucune activité enregistrée.</div>
            ) : (
              hist.map((h, i) => (
                <div key={i} style={{ display:"flex", gap:"10px", marginBottom:"14px", alignItems:"flex-start" }}>
                  <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:t.gold, marginTop:"5px", flexShrink:0, opacity:0.8 }}/>
                  <div>
                    <div style={{ fontSize:"11px", color:t.text2, lineHeight:"1.45" }}>
                      <strong style={{ color:t.text }}>{h.user.split('@')[0]}</strong> sur <strong style={{ color:t.accent }}>{h.num}</strong>
                    </div>
                    <div style={{ fontFamily:"'DM Mono', monospace", fontSize:"9px", color:t.text3, marginTop:"2px" }}>{h.msg} ({timeAgo(h.date)})</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PREUVES GLOBALES */}
          <div style={{ background:t.accentBg, border:`1px solid ${t.accentBd}`, borderRadius:"12px", padding:"16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:"9px", fontWeight:"700", color:t.accent, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"4px" }}>Preuves déposées</div>
                <div style={{ fontFamily:"'Instrument Serif', serif", fontSize:"28px", color:t.text, lineHeight:1 }}>{preuvesCount}</div>
              </div>
              <div style={{ width:"40px", height:"40px", borderRadius:"10px", background:t.accentBg, border:`1px solid ${t.accentBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px" }}>📎</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
