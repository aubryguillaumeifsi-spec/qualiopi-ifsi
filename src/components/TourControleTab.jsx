// ─────────────────────────────────────────────────────────────────────────────
//  TourControleTab.jsx — SuperAdmin Control Tower
//  QualiForma · Production
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { collectionGroup, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS & COMPOSANTS PARTAGÉS
// ─────────────────────────────────────────────────────────────────────────────

function timeAgo(isoString) {
  if (!isoString) return "—";
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60)    return "À l'instant";
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return new Date(isoString).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const sc = (t, k) => ({ c: t[k], bg: t[k + "Bg"], bd: t[k + "Bd"] });

const LOG_CFG = {
  auth:    { icon: "🔐", colorKey: "accent"  },
  data:    { icon: "✏️", colorKey: "green"   },
  admin:   { icon: "⚙️", colorKey: "gold"    },
  export:  { icon: "📤", colorKey: "purple"  },
  alert:   { icon: "⚠️", colorKey: "red"     },
  upload:  { icon: "📎", colorKey: "teal"    },
  system:  { icon: "⚡", colorKey: "amber"   }
};

// Le fameux composant Toggle qui manquait pour l'onglet API
function Toggle({ val, onChange, colorKey = "accent", t }) {
  const { c, bd } = sc(t, colorKey);
  return (
    <div onClick={onChange} style={{ width: "36px", height: "20px", borderRadius: "10px", flexShrink: 0, background: val ? c : t.surface3, border: `1px solid ${val ? bd : t.border}`, cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
      <div style={{ position: "absolute", top: "2px", left: val ? "17px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function TourControleTab({
  globalScore, activeIfsis, topAlerts, sortedTourIfsis, setSelectedIfsi,
  archivedIfsis, handleArchiveIfsi, handleHardDeleteIfsi, handleRenameIfsi,
  setActiveTab, tourSort, setTourSort, t
}) {
  const [subTab, setSubTab] = useState("globale");

  // 1. SIMULATION UTILISATEURS EN LIGNE
  const totalUsers = activeIfsis.reduce((acc, i) => acc + (i.users || 0), 0);
  const [onlineCount, setOnlineCount] = useState(Math.max(1, Math.floor(totalUsers * 0.12)));

  useEffect(() => {
    // Fait fluctuer légèrement le nombre d'utilisateurs en ligne pour l'effet "Live"
    const interval = setInterval(() => {
      setOnlineCount(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const next = prev + change;
        return next > 0 && next <= totalUsers ? next : prev;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [totalUsers]);

  // 2. FETCH JOURNAL GLOBAL (Toutes les collections "logs" de tous les IFSI)
  const [globalLogs, setGlobalLogs] = useState([]);
  const [logError, setLogError] = useState(false);

  useEffect(() => {
    if (subTab !== "logs") return;
    
    // Requête qui va chercher tous les sous-dossiers "logs" sur la base de données
    const q = query(collectionGroup(db, 'logs'), orderBy('createdAt', 'desc'), limit(50));
    
    const unsub = onSnapshot(q, (snap) => {
      setGlobalLogs(snap.docs.map(d => ({ id: d.id, path: d.ref.path, ...d.data() })));
      setLogError(false);
    }, (err) => {
      console.warn("Index collectionGroup manquant ou erreur permissions:", err);
      setLogError(true);
    });

    return () => unsub();
  }, [subTab]);

  // 3. MOCK DATA POUR API HUB
  const apiServices = [
    { id: "api-qualiopi", name: "DGEFP / Qualiopi Sync", status: "active", calls: "14,205", latency: "124ms", err: "0.02%", tag: "Gouvernement" },
    { id: "api-siaf", name: "SIAF (Achats Formation)", status: "active", calls: "8,430", latency: "85ms", err: "0.00%", tag: "Finance" },
    { id: "api-moodle", name: "Connecteur LMS Moodle", status: "warning", calls: "45,112", latency: "840ms", err: "2.14%", tag: "Pédagogie" },
    { id: "api-export", name: "Moteur Export PDF", status: "active", calls: "1,204", latency: "1.2s", err: "0.50%", tag: "Interne" },
  ];

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      <style>{`
        @keyframes pulseDot { 0% { box-shadow: 0 0 0 0 rgba(44, 200, 128, 0.7); } 70% { box-shadow: 0 0 0 8px rgba(44, 200, 128, 0); } 100% { box-shadow: 0 0 0 0 rgba(44, 200, 128, 0); } }
        .live-dot { width: 8px; height: 8px; background: ${t.green}; border-radius: 50%; animation: pulseDot 2s infinite; }
      `}</style>

      {/* HEADER & TABS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "32px", color: t.text, margin: "0 0 8px 0" }}>Tour de Contrôle</h2>
          <div style={{ display: "flex", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "4px", gap: "4px", boxShadow: t.shadowSm }}>
            {[
              { id: "globale", label: "🌍 Vue Globale" },
              { id: "logs",    label: "📜 Journal Plateforme" },
              { id: "apihub",  label: "🔌 API Hub & Registre" }
            ].map(tab => (
              <button key={tab.id} onClick={() => setSubTab(tab.id)}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: subTab === tab.id ? t.surface2 : "transparent", color: subTab === tab.id ? t.text : t.text2, fontSize: "12px", fontWeight: subTab === tab.id ? "700" : "600", cursor: "pointer", transition: "all 0.2s" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* KPI LIVE */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "12px", boxShadow: t.shadowSm }}>
          <div className="live-dot" />
          <div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: t.text, lineHeight: 1 }}>{onlineCount} <span style={{ fontSize: "12px", color: t.text3, fontWeight: "600" }}>/ {totalUsers}</span></div>
            <div style={{ fontSize: "10px", color: t.text2, marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Utilisateurs en ligne</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 1. VUE GLOBALE (Établissements & Alertes RESTAURÉS COMPLÈTEMENT)       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === "globale" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* KPI CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <div style={{ background: t.goldBg, border: `1px solid ${t.goldBd}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowGold }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: t.gold, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Score Global Réseau</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "42px", color: t.text, lineHeight: 1 }}>{globalScore}%</span>
                <span style={{ fontSize: "12px", color: t.text3 }}>de conformité moyenne</span>
              </div>
            </div>
            
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowSm }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Établissements Actifs</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "42px", color: t.text, lineHeight: 1 }}>{activeIfsis.length}</span>
                <span style={{ fontSize: "12px", color: t.text3 }}>IFSI/IFAS pilotés</span>
              </div>
            </div>

            <div style={{ background: topAlerts.length > 0 ? t.redBg : t.greenBg, border: `1px solid ${topAlerts.length > 0 ? t.redBd : t.greenBd}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowSm }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: topAlerts.length > 0 ? t.red : t.green, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Alertes Critiques</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "42px", color: topAlerts.length > 0 ? t.red : t.green, lineHeight: 1 }}>{topAlerts.length}</span>
                <span style={{ fontSize: "12px", color: topAlerts.length > 0 ? t.red : t.green }}>nécessitent attention</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", alignItems: "start" }}>
            
            {/* LISTE DES IFSI */}
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, background: t.surface2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "14px", fontWeight: "800", color: t.text }}>Réseau d'établissements</span>
                <select value={tourSort} onChange={e => setTourSort(e.target.value)} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text, padding: "6px 10px", borderRadius: "6px", fontSize: "11px", outline: "none", cursor: "pointer" }}>
                  <option value="urgence">Trier par Urgence Audit</option>
                  <option value="score_desc">Trier par Score (Décroissant)</option>
                  <option value="alpha">Trier par Nom (A-Z)</option>
                </select>
              </div>

              <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                {sortedTourIfsis.map(i => {
                  const daysLeft = i.auditDate ? Math.round((new Date(i.auditDate) - new Date()) / 86400000) : NaN;
                  const dateColor = isNaN(daysLeft) ? t.text3 : daysLeft < 0 ? t.red : daysLeft < 60 ? t.amber : t.green;

                  return (
                    <div key={i.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 100px", padding: "14px 20px", borderBottom: `1px solid ${t.border2}`, alignItems: "center", transition: "background 0.15s" }} onMouseOver={e=>e.currentTarget.style.background=t.surface2} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ fontSize: "14px", fontWeight: "700", color: t.text }}>{i.name}</div>
                          <button onClick={() => handleRenameIfsi(i.id, i.name)} title="Renommer l'IFSI" style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "10px", opacity: 0.5, padding: "2px" }}>✏️</button>
                        </div>
                        <div style={{ fontSize: "10px", color: t.text3, marginTop: "2px" }}>{i.users} membres · N° NDA {i.nda || "—"}</div>
                      </div>
                      
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <div style={{ flex: 1, height: "4px", background: t.surface3, borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ width: `${i.pct}%`, height: "100%", background: i.pct === 100 ? t.green : i.pct >= 50 ? t.amber : t.red }} />
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: t.text, width: "30px" }}>{i.pct}%</span>
                        </div>
                        <div style={{ fontSize: "9px", color: t.text3 }}>{i.conforme}/{i.total} conformes</div>
                      </div>

                      <div style={{ paddingLeft: "15px" }}>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: dateColor }}>
                          {i.auditDate ? new Date(i.auditDate).toLocaleDateString("fr-FR") : "Non défini"}
                        </div>
                        <div style={{ fontSize: "9px", color: t.text3, marginTop: "2px" }}>{isNaN(daysLeft) ? "—" : daysLeft < 0 ? "Dépassé" : `Dans ${daysLeft} j`}</div>
                      </div>

                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button onClick={() => { setSelectedIfsi(i.id); setActiveTab("dashboard"); }} title="Ouvrir l'IFSI" style={{ width: "30px", height: "30px", borderRadius: "8px", background: t.accentBg, color: t.accent, border: `1px solid ${t.accentBd}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "14px" }}>→</button>
                        <button onClick={() => handleArchiveIfsi(i.id, i.name, true)} title="Archiver" style={{ width: "30px", height: "30px", borderRadius: "8px", background: t.surface, color: t.text2, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px" }}>📦</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLONNE DROITE : ALERTES & ARCHIVES */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* ALERTES CRITIQUES */}
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, background: t.surface2 }}>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: t.text }}>🔥 Urgences absolues</span>
                </div>
                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
                  {topAlerts.length === 0 ? (
                    <div style={{ textAlign: "center", color: t.text3, fontSize: "12px", padding: "20px 0" }}>Aucune alerte majeure.</div>
                  ) : topAlerts.map(a => (
                    <div key={a.id} onClick={() => { setSelectedIfsi(a.ifsiId); setActiveTab("criteres"); }} style={{ background: t.redBg, border: `1px solid ${t.redBd}`, borderRadius: "8px", padding: "10px 12px", cursor: "pointer", transition: "all 0.15s" }} onMouseOver={e=>e.currentTarget.style.background=t.surface} onMouseOut={e=>e.currentTarget.style.background=t.redBg}>
                      <div style={{ fontSize: "9px", fontWeight: "800", color: t.red, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{a.ifsiName}</div>
                      <div style={{ fontSize: "11px", fontWeight: "600", color: t.text, lineHeight: "1.4" }}>Indicateur {a.critere.critere}.{a.critere.num}</div>
                      <div style={{ fontSize: "10px", color: t.red, marginTop: "4px" }}>
                        {a.type === "non-conforme" ? "Statut NON CONFORME détecté" : `Échéance dépassée de ${a.days} jours`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ÉTABLISSEMENTS ARCHIVÉS */}
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, background: t.surface2 }}>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: t.text }}>📦 Archives</span>
                </div>
                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                  {archivedIfsis.length === 0 ? (
                    <div style={{ textAlign: "center", color: t.text3, fontSize: "12px", padding: "20px 0" }}>Aucun établissement archivé.</div>
                  ) : archivedIfsis.map(i => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "10px 12px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: t.text2 }}>{i.name}</div>
                        <div style={{ fontSize: "10px", color: t.text3 }}>ID: {i.id}</div>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => handleArchiveIfsi(i.id, i.name, false)} title="Restaurer" style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${t.border}`, borderRadius: "4px", color: t.text, cursor: "pointer", fontSize: "10px" }}>Restaurer</button>
                        <button onClick={() => handleHardDeleteIfsi(i.id, i.name)} title="Détruire" style={{ padding: "4px 8px", background: t.redBg, border: `1px solid ${t.redBd}`, borderRadius: "4px", color: t.red, cursor: "pointer", fontSize: "10px" }}>Supprimer</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 2. JOURNAL DE LOG GLOBAL                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === "logs" && (
        <div className="animate-fade-in">
          {logError && (
             <div style={{ background: t.amberBg, border: `1px solid ${t.amberBd}`, borderLeft: `4px solid ${t.amber}`, padding: "14px 20px", borderRadius: "8px", marginBottom: "20px" }}>
               <div style={{ fontSize: "13px", fontWeight: "700", color: t.amber, marginBottom: "4px" }}>Configuration requise (Firebase Index)</div>
               <div style={{ fontSize: "11px", color: t.text2, lineHeight: 1.5 }}>
                 Pour afficher le journal global, Firebase requiert un index de type <code>collectionGroup</code> sur <code>logs</code> trié par <code>createdAt DESC</code>. <br/>
                 Ouvrez la console du navigateur, cliquez sur le lien généré par Firebase pour créer cet index automatiquement (cela prend 2-3 minutes).
               </div>
             </div>
          )}

          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, background: t.surface2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "16px", fontWeight: "800", color: t.text, display: "block" }}>Flux d'activité de la plateforme</span>
                <span style={{ fontSize: "11px", color: t.text3, marginTop: "2px" }}>Les 50 dernières actions effectuées sur l'ensemble des IFSI</span>
              </div>
              <button onClick={() => setSubTab("globale")} style={{ padding: "6px 12px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "6px", color: t.text2, fontSize: "11px", cursor: "pointer" }}>↻ Actualiser</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "130px 1.5fr 2fr 200px", padding: "10px 20px", background: t.surface3, borderBottom: `1px solid ${t.border2}` }}>
               {["Date & Heure", "Événement", "Détail technique", "Utilisateur"].map(h => <span key={h} style={{ fontSize: "10px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "1px" }}>{h}</span>)}
            </div>

            <div style={{ maxHeight: "600px", overflowY: "auto" }}>
              {globalLogs.length === 0 && !logError ? (
                <div style={{ padding: "60px", textAlign: "center", color: t.text3, fontSize: "13px", fontStyle: "italic" }}>En attente de données...</div>
              ) : globalLogs.map((log, i) => {
                const cfg = LOG_CFG[log.type] || LOG_CFG.system;
                const { c, bg, bd } = sc(t, cfg.colorKey);
                
                // Extraire l'ID de l'IFSI depuis le chemin du document Firebase (etablissements/ID_IFSI/logs/ID_LOG)
                const ifsiIdMatch = log.path ? log.path.match(/etablissements\/([^\/]+)/) : null;
                const ifsiId = ifsiIdMatch ? ifsiIdMatch[1] : "Système";
                const ifsiName = activeIfsis.find(ifsi => ifsi.id === ifsiId)?.name || ifsiId;

                return (
                  <div key={log.id} style={{ display: "grid", gridTemplateColumns: "130px 1.5fr 2fr 200px", padding: "12px 20px", borderBottom: i < globalLogs.length - 1 ? `1px solid ${t.border2}` : "none", alignItems: "start", transition: "background 0.1s" }} onMouseOver={e => e.currentTarget.style.background = t.surface2} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: t.text3, paddingTop: "2px" }}>
                      {log.createdAt?.toDate ? timeAgo(log.createdAt.toDate().toISOString()) : "—"}
                    </div>
                    
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: bg, border: `1px solid ${bd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: 0 }}>
                        {cfg.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: t.text, marginBottom: "2px" }}>{log.action}</div>
                        <div style={{ fontSize: "9px", fontWeight: "800", color: c, background: bg, padding: "2px 6px", borderRadius: "4px", width: "fit-content", textTransform: "uppercase" }}>{ifsiName}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: "11px", color: t.text2, lineHeight: "1.4", paddingTop: "2px" }}>
                      {log.detail}
                    </div>

                    <div style={{ fontSize: "11px", color: t.text2, paddingTop: "2px", wordBreak: "break-all" }}>
                      {log.user || "Système"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 3. API HUB & REGISTRE                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === "apihub" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowSm }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Volume 24h</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "36px", color: t.text, lineHeight: 1 }}>68.9k</span>
                <span style={{ fontSize: "12px", color: t.text3 }}>requêtes gérées</span>
              </div>
            </div>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowSm }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Latence Moyenne</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "36px", color: t.text, lineHeight: 1 }}>112<span style={{ fontSize: "20px" }}>ms</span></span>
                <span style={{ fontSize: "12px", color: t.green }}>✓ Optimale</span>
              </div>
            </div>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowSm }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Taux de Rejet</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "36px", color: t.text, lineHeight: 1 }}>0.08%</span>
                <span style={{ fontSize: "12px", color: t.text3 }}>soit 55 requêtes</span>
              </div>
            </div>
          </div>

          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, background: t.surface2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "16px", fontWeight: "800", color: t.text }}>Registre des Services & Intégrations</span>
              <button style={{ padding: "6px 14px", background: t.accent, color: "white", borderRadius: "6px", border: "none", fontSize: "11px", fontWeight: "700", cursor: "pointer", boxShadow: `0 2px 8px ${t.accentBd}` }}>+ Ajouter une API</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 100px", padding: "12px 20px", background: t.surface3, borderBottom: `1px solid ${t.border2}` }}>
               {["Service connecté", "Statut", "Appels (24h)", "Latence", "Action"].map(h => <span key={h} style={{ fontSize: "10px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", textAlign: h==="Action"?"right":"left" }}>{h}</span>)}
            </div>

            <div>
              {apiServices.map((api, i) => {
                const isAct = api.status === "active";
                const isWarn = api.status === "warning";
                const dotColor = isAct ? t.green : isWarn ? t.amber : t.red;
                
                return (
                  <div key={api.id} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 100px", padding: "18px 20px", borderBottom: i < apiServices.length - 1 ? `1px solid ${t.border2}` : "none", alignItems: "center", transition: "background 0.1s" }} onMouseOver={e=>e.currentTarget.style.background=t.surface2} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                    
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "14px", fontWeight: "700", color: t.text }}>{api.name}</span>
                        <span style={{ fontSize: "9px", fontWeight: "800", background: t.surface3, border: `1px solid ${t.border}`, color: t.text2, padding: "2px 6px", borderRadius: "4px", textTransform: "uppercase" }}>{api.tag}</span>
                      </div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: t.text3 }}>ID: {api.id}</div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor, boxShadow: `0 0 6px ${dotColor}80` }} />
                      <span style={{ fontSize: "11px", fontWeight: "700", color: dotColor, textTransform: "capitalize" }}>{api.status}</span>
                    </div>

                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "12px", color: t.text2 }}>{api.calls}</div>
                    
                    <div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "12px", color: isWarn ? t.amber : t.text2 }}>{api.latency}</div>
                      <div style={{ fontSize: "9px", color: t.text3, marginTop: "2px" }}>Err: {api.err}</div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <Toggle val={isAct} onChange={() => alert("Fonction de suspension API à venir.")} colorKey={isAct ? "green" : "red"} t={t} />
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
