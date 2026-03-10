// ─────────────────────────────────────────────────────────────────────────────
//  TourControleTab.jsx — SuperAdmin Control Tower
//  QualiForma · Production
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { collectionGroup, query, orderBy, limit, onSnapshot, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS & COMPOSANTS PARTAGÉS
// ─────────────────────────────────────────────────────────────────────────────

function timeAgo(isoString, lang = "fr") {
  if (!isoString) return "—";
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  const isEn = lang === "en";
  if (diff < 60)    return isEn ? "Just now" : "À l'instant";
  if (diff < 3600)  return isEn ? `${Math.floor(diff / 60)} min ago` : `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return isEn ? `${Math.floor(diff / 3600)} hrs ago` : `Il y a ${Math.floor(diff / 3600)} h`;
  return new Date(isoString).toLocaleDateString(isEn ? "en-US" : "fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
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
  setActiveTab, tourSort, setTourSort, language = "fr", t
}) {
  const l = (fr, en) => language === "en" ? en : fr;
  const [subTab, setSubTab] = useState("globale");

  // 1. SIMULATION UTILISATEURS EN LIGNE
  const totalUsers = activeIfsis.reduce((acc, i) => acc + (i.users || 0), 0);
  const [onlineCount, setOnlineCount] = useState(Math.max(1, Math.floor(totalUsers * 0.12)));

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const next = prev + change;
        return next > 0 && next <= totalUsers ? next : prev;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [totalUsers]);

  // 2. RECHERCHE IFSI
  const [ifsiSearch, setIfsiSearch] = useState("");
  const filteredIfsis = sortedTourIfsis.filter(i => 
    i.name.toLowerCase().includes(ifsiSearch.toLowerCase()) || 
    (i.nda && i.nda.includes(ifsiSearch))
  );

  // 3. FETCH JOURNAL GLOBAL (collectionGroup)
  const [globalLogs, setGlobalLogs] = useState([]);
  const [logError, setLogError] = useState(false);

  useEffect(() => {
    if (subTab !== "logs") return;
    const q = query(collectionGroup(db, 'logs'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setGlobalLogs(snap.docs.map(d => ({ id: d.id, path: d.ref.path, ...d.data() })));
      setLogError(false);
    }, (err) => {
      console.warn("Index collectionGroup manquant:", err);
      setLogError(true);
    });
    return () => unsub();
  }, [subTab]);

  // 4. CONFIGURATION SUPER ADMIN (Firestore synchro)
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "superadmin"), (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data());
      } else {
        const defaultCfg = {
          seuils: { cible: 90, alerte: 80, critique: 65 },
          notifs: { j30: true, j15: true, j7: true, nc: true, hebdo: false, login: true }
        };
        setDoc(doc(db, "settings", "superadmin"), defaultCfg);
        setConfig(defaultCfg);
      }
    });
    return () => unsub();
  }, []);

  const updateConfig = async (section, key, value) => {
    if (!config) return;
    const newConfig = { ...config, [section]: { ...config[section], [key]: value } };
    setConfig(newConfig); // Optimistic UI update
    await setDoc(doc(db, "settings", "superadmin"), newConfig, { merge: true });
  };

  // 5. MOCK DATA API HUB
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
        
        /* Custom Sliders for Configuration Tab */
        input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #ffffff; cursor: pointer; margin-top: -6px; box-shadow: 0 1px 3px rgba(0,0,0,0.3); border: 1px solid #cbd5e1; }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: ${t.border}; border-radius: 2px; }
      `}</style>

      {/* HEADER & TABS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "32px", color: t.text, margin: "0 0 8px 0" }}>{l("Tour de Contrôle", "Control Tower")}</h2>
          <div style={{ display: "flex", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "4px", gap: "4px", boxShadow: t.shadowSm }}>
            {[
              { id: "globale", label: l("🌍 Vue Globale", "🌍 Global View") },
              { id: "logs",    label: l("📜 Journal Plateforme", "📜 Platform Log") },
              { id: "apihub",  label: l("🔌 API Hub & Registre", "🔌 API Hub & Registry") },
              { id: "config",  label: l("⚙️ Configuration", "⚙️ Configuration") }
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
            <div style={{ fontSize: "10px", color: t.text2, marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{l("Utilisateurs en ligne", "Users online")}</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 1. VUE GLOBALE                                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === "globale" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <div style={{ background: t.goldBg, border: `1px solid ${t.goldBd}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowGold }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: t.gold, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{l("Score Global Réseau", "Network Global Score")}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "42px", color: t.text, lineHeight: 1 }}>{globalScore}%</span>
                <span style={{ fontSize: "12px", color: t.text3 }}>{l("de conformité moyenne", "average compliance")}</span>
              </div>
            </div>
            
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowSm }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{l("Établissements Actifs", "Active Facilities")}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "42px", color: t.text, lineHeight: 1 }}>{activeIfsis.length}</span>
                <span style={{ fontSize: "12px", color: t.text3 }}>{l("IFSI/IFAS pilotés", "managed IFSI/IFAS")}</span>
              </div>
            </div>

            <div style={{ background: topAlerts.length > 0 ? t.redBg : t.greenBg, border: `1px solid ${topAlerts.length > 0 ? t.redBd : t.greenBd}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowSm }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: topAlerts.length > 0 ? t.red : t.green, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{l("Alertes Critiques", "Critical Alerts")}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "42px", color: topAlerts.length > 0 ? t.red : t.green, lineHeight: 1 }}>{topAlerts.length}</span>
                <span style={{ fontSize: "12px", color: topAlerts.length > 0 ? t.red : t.green }}>{l("nécessitent attention", "require attention")}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", alignItems: "start" }}>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, background: t.surface2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <span style={{ fontSize: "14px", fontWeight: "800", color: t.text }}>{l("Réseau d'établissements", "Facilities Network")}</span>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input type="text" placeholder={l("Rechercher un établissement...", "Search facility...")} value={ifsiSearch} onChange={e => setIfsiSearch(e.target.value)} style={{ padding: "6px 12px", borderRadius: "6px", border: `1px solid ${t.border}`, background: t.surface, color: t.text, fontSize: "11px", outline: "none", width: "160px" }} />
                  <select value={tourSort} onChange={e => setTourSort(e.target.value)} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text, padding: "6px 10px", borderRadius: "6px", fontSize: "11px", outline: "none", cursor: "pointer" }}>
                    <option value="urgence">{l("Trier par Urgence Audit", "Sort by Audit Urgency")}</option>
                    <option value="score_desc">{l("Trier par Score (Décroissant)", "Sort by Score (High to Low)")}</option>
                    <option value="alpha">{l("Trier par Nom (A-Z)", "Sort by Name (A-Z)")}</option>
                  </select>
                </div>
              </div>

              <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                {filteredIfsis.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: t.text3, fontSize: "12px", fontStyle: "italic" }}>{l("Aucun établissement trouvé.", "No facility found.")}</div>
                ) : filteredIfsis.map(i => {
                  const daysLeft = i.auditDate ? Math.round((new Date(i.auditDate) - new Date()) / 86400000) : NaN;
                  const dateColor = isNaN(daysLeft) ? t.text3 : daysLeft < 0 ? t.red : daysLeft < 60 ? t.amber : t.green;

                  return (
                    <div key={i.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 100px", padding: "14px 20px", borderBottom: `1px solid ${t.border2}`, alignItems: "center", transition: "background 0.15s" }} onMouseOver={e=>e.currentTarget.style.background=t.surface2} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ fontSize: "14px", fontWeight: "700", color: t.text }}>{i.name}</div>
                          <button onClick={() => handleRenameIfsi(i.id, i.name)} title={l("Renommer", "Rename")} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "10px", opacity: 0.5, padding: "2px", transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.opacity=1} onMouseOut={e=>e.currentTarget.style.opacity=0.5}>✏️</button>
                        </div>
                        <div style={{ fontSize: "10px", color: t.text3, marginTop: "2px" }}>{i.users} {l("membres", "members")} · {l("N° NDA", "NDA No")} {i.nda || "—"}</div>
                      </div>
                      
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <div style={{ flex: 1, height: "4px", background: t.surface3, borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ width: `${i.pct}%`, height: "100%", background: i.pct === 100 ? t.green : i.pct >= 50 ? t.amber : t.red }} />
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: t.text, width: "30px" }}>{i.pct}%</span>
                        </div>
                        <div style={{ fontSize: "9px", color: t.text3 }}>{i.conforme}/{i.total} {l("conformes", "compliant")}</div>
                      </div>

                      <div style={{ paddingLeft: "15px" }}>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: dateColor }}>{i.auditDate ? new Date(i.auditDate).toLocaleDateString(language==="en"?"en-US":"fr-FR") : l("Non défini", "Not set")}</div>
                        <div style={{ fontSize: "9px", color: t.text3, marginTop: "2px" }}>{isNaN(daysLeft) ? "—" : daysLeft < 0 ? l("Dépassé", "Overdue") : l(`Dans ${daysLeft} j`, `In ${daysLeft} d`)}</div>
                      </div>

                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button onClick={() => { setSelectedIfsi(i.id); setActiveTab("dashboard"); }} title={l("Ouvrir l'IFSI", "Open Facility")} style={{ width: "30px", height: "30px", borderRadius: "8px", background: t.accentBg, color: t.accent, border: `1px solid ${t.accentBd}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "14px", transition: "all 0.2s" }} onMouseOver={e=>{e.currentTarget.style.background=t.accent; e.currentTarget.style.color="white";}} onMouseOut={e=>{e.currentTarget.style.background=t.accentBg; e.currentTarget.style.color=t.accent;}}>→</button>
                        <button onClick={() => handleArchiveIfsi(i.id, i.name, true)} title={l("Archiver", "Archive")} style={{ width: "30px", height: "30px", borderRadius: "8px", background: t.surface, color: t.text2, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px", transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.borderColor=t.accent} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}>📦</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, background: t.surface2 }}>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: t.text }}>🔥 {l("Urgences absolues", "Absolute Emergencies")}</span>
                </div>
                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
                  {topAlerts.length === 0 ? (
                    <div style={{ textAlign: "center", color: t.text3, fontSize: "12px", padding: "20px 0" }}>{l("Aucune alerte majeure.", "No major alerts.")}</div>
                  ) : topAlerts.map(a => (
                    <div key={a.id} onClick={() => { setSelectedIfsi(a.ifsiId); setActiveTab("criteres"); }} style={{ background: t.redBg, border: `1px solid ${t.redBd}`, borderRadius: "8px", padding: "10px 12px", cursor: "pointer", transition: "all 0.15s" }} onMouseOver={e=>e.currentTarget.style.background=t.surface} onMouseOut={e=>e.currentTarget.style.background=t.redBg}>
                      <div style={{ fontSize: "9px", fontWeight: "800", color: t.red, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{a.ifsiName}</div>
                      <div style={{ fontSize: "11px", fontWeight: "600", color: t.text, lineHeight: "1.4" }}>{l("Indicateur", "Indicator")} {a.critere.critere}.{a.critere.num}</div>
                      <div style={{ fontSize: "10px", color: t.red, marginTop: "4px" }}>
                        {a.type === "non-conforme" ? l("Statut NON CONFORME détecté", "NON COMPLIANT status detected") : l(`Échéance dépassée de ${a.days} jours`, `Deadline exceeded by ${a.days} days`)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, background: t.surface2 }}>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: t.text }}>📦 {l("Archives", "Archives")}</span>
                </div>
                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                  {archivedIfsis.length === 0 ? (
                    <div style={{ textAlign: "center", color: t.text3, fontSize: "12px", padding: "20px 0" }}>{l("Aucun établissement archivé.", "No archived facilities.")}</div>
                  ) : archivedIfsis.map(i => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "10px 12px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: t.text2 }}>{i.name}</div>
                        <div style={{ fontSize: "10px", color: t.text3 }}>ID: {i.id}</div>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => handleArchiveIfsi(i.id, i.name, false)} title={l("Restaurer", "Restore")} style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${t.border}`, borderRadius: "4px", color: t.text, cursor: "pointer", fontSize: "10px", transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.borderColor=t.accent} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}>{l("Restaurer", "Restore")}</button>
                        <button onClick={() => handleHardDeleteIfsi(i.id, i.name)} title={l("Détruire", "Delete")} style={{ padding: "4px 8px", background: t.redBg, border: `1px solid ${t.redBd}`, borderRadius: "4px", color: t.red, cursor: "pointer", fontSize: "10px", transition: "all 0.2s" }} onMouseOver={e=>{e.currentTarget.style.background=t.red; e.currentTarget.style.color="white";}} onMouseOut={e=>{e.currentTarget.style.background=t.redBg; e.currentTarget.style.color=t.red;}}>{l("Supprimer", "Delete")}</button>
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
               <div style={{ fontSize: "13px", fontWeight: "700", color: t.amber, marginBottom: "4px" }}>{l("Configuration requise (Firebase Index)", "Configuration required (Firebase Index)")}</div>
               <div style={{ fontSize: "11px", color: t.text2, lineHeight: 1.5 }}>
                 {l("Pour afficher le journal global, Firebase requiert un index de type ", "To display the global log, Firebase requires an index of type ")} <code>collectionGroup</code> {l("sur", "on")} <code>logs</code> {l("trié par", "sorted by")} <code>createdAt DESC</code>. <br/>
                 {l("Ouvrez la console du navigateur (F12), cliquez sur le lien rouge généré par Firebase pour créer cet index automatiquement (cela prend 2-3 minutes).", "Open the browser console (F12), click the red link generated by Firebase to create this index automatically (takes 2-3 minutes).")}
               </div>
             </div>
          )}

          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, background: t.surface2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "16px", fontWeight: "800", color: t.text, display: "block" }}>{l("Flux d'activité de la plateforme", "Platform Activity Feed")}</span>
                <span style={{ fontSize: "11px", color: t.text3, marginTop: "2px" }}>{l("Les 50 dernières actions effectuées sur l'ensemble des IFSI", "The last 50 actions performed across all facilities")}</span>
              </div>
              <button onClick={() => setSubTab("globale")} style={{ padding: "6px 12px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "6px", color: t.text2, fontSize: "11px", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.borderColor=t.accent} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}>↻ {l("Actualiser", "Refresh")}</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "130px 1.5fr 2fr 200px", padding: "10px 20px", background: t.surface3, borderBottom: `1px solid ${t.border2}` }}>
               {[l("Date & Heure", "Date & Time"), l("Événement", "Event"), l("Détail technique", "Technical Detail"), l("Utilisateur", "User")].map(h => <span key={h} style={{ fontSize: "10px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "1px" }}>{h}</span>)}
            </div>

            <div style={{ maxHeight: "600px", overflowY: "auto" }}>
              {globalLogs.length === 0 && !logError ? (
                <div style={{ padding: "60px", textAlign: "center", color: t.text3, fontSize: "13px", fontStyle: "italic" }}>{l("En attente de données...", "Waiting for data...")}</div>
              ) : globalLogs.map((log, i) => {
                const cfg = LOG_CFG[log.type] || LOG_CFG.system;
                const { c, bg, bd } = sc(t, cfg.colorKey);
                const ifsiIdMatch = log.path ? log.path.match(/etablissements\/([^\/]+)/) : null;
                const ifsiId = ifsiIdMatch ? ifsiIdMatch[1] : "Système";
                const ifsiName = activeIfsis.find(ifsi => ifsi.id === ifsiId)?.name || ifsiId;

                return (
                  <div key={log.id} style={{ display: "grid", gridTemplateColumns: "130px 1.5fr 2fr 200px", padding: "12px 20px", borderBottom: i < globalLogs.length - 1 ? `1px solid ${t.border2}` : "none", alignItems: "start", transition: "background 0.1s" }} onMouseOver={e => e.currentTarget.style.background = t.surface2} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: t.text3, paddingTop: "2px" }}>
                      {log.createdAt?.toDate ? timeAgo(log.createdAt.toDate().toISOString(), language) : "—"}
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
                    <div style={{ fontSize: "11px", color: t.text2, lineHeight: "1.4", paddingTop: "2px" }}>{log.detail}</div>
                    <div style={{ fontSize: "11px", color: t.text2, paddingTop: "2px", wordBreak: "break-all" }}>{log.user || l("Système", "System")}</div>
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
              <div style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{l("Volume 24h", "24h Volume")}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "36px", color: t.text, lineHeight: 1 }}>68.9k</span>
                <span style={{ fontSize: "12px", color: t.text3 }}>{l("requêtes gérées", "handled requests")}</span>
              </div>
            </div>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowSm }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{l("Latence Moyenne", "Avg Latency")}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "36px", color: t.text, lineHeight: 1 }}>112<span style={{ fontSize: "20px" }}>ms</span></span>
                <span style={{ fontSize: "12px", color: t.green }}>✓ {l("Optimale", "Optimal")}</span>
              </div>
            </div>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowSm }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{l("Taux de Rejet", "Rejection Rate")}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "36px", color: t.text, lineHeight: 1 }}>0.08%</span>
                <span style={{ fontSize: "12px", color: t.text3 }}>{l("soit 55 requêtes", "i.e. 55 requests")}</span>
              </div>
            </div>
          </div>

          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, background: t.surface2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "16px", fontWeight: "800", color: t.text }}>{l("Registre des Services & Intégrations", "Services & Integrations Registry")}</span>
              <button style={{ padding: "6px 14px", background: t.accent, color: "white", borderRadius: "6px", border: "none", fontSize: "11px", fontWeight: "700", cursor: "pointer", boxShadow: `0 2px 8px ${t.accentBd}`, transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.transform="translateY(-1px)"} onMouseOut={e=>e.currentTarget.style.transform="translateY(0)"}>+ {l("Ajouter une API", "Add an API")}</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 100px", padding: "12px 20px", background: t.surface3, borderBottom: `1px solid ${t.border2}` }}>
               {[l("Service connecté", "Connected Service"), l("Statut", "Status"), l("Appels (24h)", "Calls (24h)"), l("Latence", "Latency"), l("Action", "Action")].map(h => <span key={h} style={{ fontSize: "10px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", textAlign: h===l("Action", "Action")?"right":"left" }}>{h}</span>)}
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
                      <Toggle val={isAct} onChange={() => alert(l("Fonction de suspension API à venir.", "API suspension function coming soon."))} colorKey={isAct ? "green" : "red"} t={t} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 4. CONFIGURATION SUPER ADMIN                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === "config" && config && (
        <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>
          
          {/* SEUILS DE CONFORMITÉ */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowSm }}>
            <h3 style={{ fontSize: "14px", fontWeight: "800", color: t.text, marginBottom: "20px", fontFamily: "'Instrument Serif',serif", fontSize: "20px" }}>{l("Seuils de conformité", "Compliance Thresholds")}</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {[
                { k: "cible", l: l("Objectif cible", "Target objective"), sub: l("Niveau d'excellence", "Excellence level"), color: t.green },
                { k: "alerte", l: l("Seuil d'alerte", "Warning threshold"), sub: l("Dessous = IFSI en alerte", "Below = IFSI warning"), color: t.amber },
                { k: "critique", l: l("Seuil critique", "Critical threshold"), sub: l("Dessous = IFSI critique", "Below = IFSI critical"), color: t.red }
              ].map(s => (
                <div key={s.k}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: t.text }}>{s.l}</div>
                      <div style={{ fontSize: "10px", color: t.text3 }}>{s.sub}</div>
                    </div>
                    <span style={{ fontSize: "16px", fontWeight: "800", color: s.color }}>{config.seuils[s.k]}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={config.seuils[s.k]} onChange={(e) => updateConfig("seuils", s.k, parseInt(e.target.value))} />
                </div>
              ))}
            </div>
          </div>

          {/* NOTIFICATIONS AUTOMATIQUES */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowSm }}>
            <h3 style={{ fontSize: "14px", fontWeight: "800", color: t.text, marginBottom: "20px", fontFamily: "'Instrument Serif',serif", fontSize: "20px" }}>{l("Notifications automatiques", "Automated Notifications")}</h3>
            
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                { k: "j30", l: l("Email J-30 avant audit", "D-30 Email before audit"), sub: l("Rappel préparation", "Preparation reminder") },
                { k: "j15", l: l("Email J-15 avant audit", "D-15 Email before audit"), sub: l("Relance urgente", "Urgent reminder") },
                { k: "j7", l: l("Email J-7 avant audit", "D-7 Email before audit"), sub: l("Alerte critique", "Critical alert") },
                { k: "nc", l: l("Alerte nouvelle NC", "New NC alert"), sub: l("En temps réel", "In real time") },
                { k: "hebdo", l: l("Rapport hebdomadaire", "Weekly report"), sub: l("Synthèse réseau lundi 8h", "Network synthesis Monday 8am") },
                { k: "login", l: l("Alertes connexion", "Login alerts"), sub: l("Tentatives échouées", "Failed attempts") }
              ].map((n, i) => (
                <div key={n.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 5 ? `1px solid ${t.border2}` : "none" }}>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: t.text }}>{n.l}</div>
                    <div style={{ fontSize: "10px", color: t.text3 }}>{n.sub}</div>
                  </div>
                  <Toggle val={config.notifs[n.k]} onChange={() => updateConfig("notifs", n.k, !config.notifs[n.k])} t={t} />
                </div>
              ))}
            </div>
          </div>

          {/* SAUVEGARDES & EXPORTS */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowSm }}>
            <h3 style={{ fontSize: "14px", fontWeight: "800", color: t.text, marginBottom: "20px", fontFamily: "'Instrument Serif',serif", fontSize: "20px" }}>{l("Sauvegardes & exports", "Backups & Exports")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", borderBottom: `1px solid ${t.border2}`, paddingBottom: "10px" }}>
                <span style={{ color: t.text2 }}>{l("Dernière sauvegarde", "Last backup")}</span>
                <span style={{ fontWeight: "700", color: t.green }}>{l("Aujourd'hui 03:00", "Today 03:00")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", borderBottom: `1px solid ${t.border2}`, paddingBottom: "10px" }}>
                <span style={{ color: t.text2 }}>{l("Fréquence", "Frequency")}</span>
                <span style={{ fontWeight: "700", color: t.text }}>{l("Quotidienne 03h00", "Daily 03:00")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", borderBottom: `1px solid ${t.border2}`, paddingBottom: "10px" }}>
                <span style={{ color: t.text2 }}>{l("Rétention", "Retention")}</span>
                <span style={{ fontWeight: "700", color: t.text }}>{l("90 jours", "90 days")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: t.text2 }}>{l("Export auto PDF", "Auto PDF Export")}</span>
                <span style={{ fontWeight: "700", color: t.text }}>{l("1er du mois", "1st of month")}</span>
              </div>
            </div>
            <button onClick={() => alert(l("Sauvegarde déclenchée.", "Backup triggered."))} style={{ width: "100%", padding: "12px", background: t.accentBg, color: t.accent, border: `1px solid ${t.accentBd}`, borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.background=t.accentBd} onMouseOut={e=>e.currentTarget.style.background=t.accentBg}>
              📥 {l("Sauvegarder maintenant", "Backup now")}
            </button>
          </div>

          {/* ZONE CRITIQUE */}
          <div style={{ background: t.redBg, border: `1px solid ${t.redBd}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowSm }}>
            <h3 style={{ fontSize: "14px", fontWeight: "800", color: t.red, marginBottom: "6px", fontFamily: "'Instrument Serif',serif", fontSize: "20px" }}>⚠ {l("Zone critique super-admin", "Super-admin Critical Zone")}</h3>
            <div style={{ fontSize: "11px", color: t.text2, marginBottom: "20px" }}>{l("Actions irréversibles sur l'ensemble du réseau", "Irreversible actions on the entire network")}</div>
            
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                { l: l("Réinitialiser tous les MdP réseau", "Reset all network passwords"), sub: l("Email envoyé à tous les utilisateurs", "Email sent to all users"), k: "amber" },
                { l: l("Purger le journal d'audit", "Purge audit log"), sub: l("Supprime les logs > 1 an", "Deletes logs > 1 year"), k: "amber" },
                { l: l("Export complet réseau", "Full network export"), sub: l("JSON + CSV tous les établissements", "JSON + CSV all facilities"), k: "accent" },
                { l: l("Désactiver un établissement", "Deactivate a facility"), sub: l("Accès suspendu immédiatement", "Access suspended immediately"), k: "red" }
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < 3 ? `1px solid ${t.redBd}` : "none" }}>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: t.text }}>{a.l}</div>
                    <div style={{ fontSize: "10px", color: t.text3 }}>{a.sub}</div>
                  </div>
                  <button onClick={() => window.prompt(l(`Tapez EXECUTER pour ${a.l}`, `Type EXECUTE to ${a.l}`))} style={{ padding: "6px 14px", background: "white", border: `1px solid ${t[a.k]}`, color: t[a.k], borderRadius: "6px", fontSize: "10px", fontWeight: "800", cursor: "pointer" }}>
                    {l("Exécuter", "Execute")}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
