import LoginPage from "./components/LoginPage";
import DetailModal from "./components/DetailModal";
import { useState, useEffect, useRef } from "react";
import { getDoc, setDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, DOC_REF } from "./firebase";
import { NOM_ETABLISSEMENT, TODAY, RESPONSABLES, DEFAULT_CRITERES, CRITERES_LABELS, STATUT_CONFIG } from "./data";

function GaugeChart({ value, max, color }) {
  const pct = (value / max) * 100, r = 38, circ = 2 * Math.PI * r;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
      <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="9" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} strokeLinecap="round" transform="rotate(-90 48 48)" style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x="48" y="52" textAnchor="middle" fill="#1e3a5f" fontSize="15" fontWeight="700" fontFamily="Outfit">{Math.round(pct)}%</text>
    </svg>
  );
}

function StatusBadge({ statut }) {
  const s = STATUT_CONFIG[statut];
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>{s.label}</span>;
}

function ProgressBar({ value, max, color }) {
  return <div style={{ background: "#f1f5f9", borderRadius: "4px", height: "7px", overflow: "hidden" }}><div style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color, height: "100%", borderRadius: "4px", transition: "width 0.8s ease" }} /></div>;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [criteres, setCriteres] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterCritere, setFilterCritere] = useState("tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalCritere, setModalCritere] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        loadData();
      } else {
        setIsLoggedIn(false);
      }
      setAuthChecked(true);
    });
    
    return () => unsubscribe();
  }, []);

  async function loadData() {
    try {
      const snap = await getDoc(DOC_REF);
      if (snap.exists() && snap.data().liste) {
        setCriteres(snap.data().liste);
      } else {
        setCriteres(DEFAULT_CRITERES);
      }
    } catch (e) {
      console.error("Erreur Firebase:", e);
      setCriteres(DEFAULT_CRITERES);
    }
  }

  async function saveCriteres(newCriteres) {
    setCriteres(newCriteres);
    setSaveStatus("saving");
    try {
      await setDoc(DOC_REF, { liste: newCriteres, updatedAt: new Date().toISOString() });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error("Erreur sauvegarde:", e);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  function handleLogout() { signOut(auth); }
  function saveModal(updated) { saveCriteres(criteres.map(c => c.id === updated.id ? updated : c)); setModalCritere(null); }

  if (!authChecked) return null;
  if (!isLoggedIn) return <LoginPage />;
  if (criteres === null) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Outfit,sans-serif" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div><div style={{ fontSize: "14px", color: "#6b7280" }}>Chargement des donnees...</div></div>
    </div>
  );

  const today = new Date();
  const days = d => Math.round((new Date(d) - today) / 86400000);
  const dayColor = d => days(d) < 0 ? "#dc2626" : days(d) < 30 ? "#d97706" : "#6b7280";
  const stats = {
    total: criteres.length,
    conforme: criteres.filter(c => c.statut === "conforme").length,
    enCours: criteres.filter(c => c.statut === "en-cours").length,
    nonConforme: criteres.filter(c => c.statut === "non-conforme").length,
    nonEvalue: criteres.filter(c => c.statut === "non-evalue").length,
  };
  const urgents = criteres.filter(c => days(c.delai) <= 30 && c.statut !== "conforme" && c.statut !== "non-evalue");
  const filtered = criteres.filter(c => {
    if (filterStatut !== "tous" && c.statut !== filterStatut) return false;
    if (filterCritere !== "tous" && c.critere !== parseInt(filterCritere)) return false;
    if (searchTerm && !c.titre.toLowerCase().includes(searchTerm.toLowerCase()) && !c.num.includes(searchTerm)) return false;
    return true;
  });
  const axes = criteres.filter(c => c.statut === "non-conforme" || c.statut === "en-cours")
    .sort((a, b) => ({ "non-conforme": 0, "en-cours": 1 }[a.statut] - { "non-conforme": 0, "en-cours": 1 }[b.statut] || new Date(a.delai) - new Date(b.delai)));
  const byResp = RESPONSABLES.map(r => ({
    name: r, nom: r.split("(")[0].trim(), role: r.match(/\(([^)]+)\)/)?.[1] || "",
    items: criteres.filter(c => c.responsables.includes(r)),
  })).filter(r => r.items.length > 0);
  const sansResp = criteres.filter(c => !c.responsables || c.responsables.length === 0);

  const navBtn = active => ({ padding: "8px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "Outfit,sans-serif", background: active ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "transparent", color: active ? "white" : "#4b5563" });
  const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const nb = col => ({ minWidth: "44px", padding: "3px 8px", background: `${col}15`, color: col, borderRadius: "6px", fontSize: "12px", fontWeight: "800", textAlign: "center", border: `1px solid ${col}30`, flexShrink: 0 });
  const th = { textAlign: "left", padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "2px solid #f1f5f9", background: "#fafafa" };
  const td = { padding: "11px 14px", fontSize: "13px", borderBottom: "1px solid #f8fafc", verticalAlign: "middle", color: "#374151" };
  const sel = { background: "white", border: "1px solid #d1d5db", borderRadius: "7px", color: "#374151", padding: "7px 10px", fontSize: "12px", cursor: "pointer" };

  const SaveIndicator = () => {
    if (saveStatus === "idle") return null;
    const cfg = { saving: ["#6b7280","Sauvegarde..."], saved: ["#065f46","Sauvegarde"], error: ["#991b1b","Erreur"] }[saveStatus];
    return <span className="no-print" style={{ fontSize: "11px", color: cfg[0], background: saveStatus==="saved"?"#d1fae5":saveStatus==="error"?"#fee2e2":"#f3f4f6", border:`1px solid ${saveStatus==="saved"?"#6ee7b7":saveStatus==="error"?"#fca5a5":"#d1d5db"}`, borderRadius:"6px", padding:"3px 10px", marginLeft:"10px" }}>{saveStatus==="saved"?"✓":saveStatus==="saving"?"⟳":"✕"} {cfg[1]}</span>;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Outfit,sans-serif", color: "#1e3a5f" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      
      {/* RÈGLES D'IMPRESSION PDF */}
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { size: landscape; margin: 10mm; }
            * { box-shadow: none !important; }
            .print-break-avoid { page-break-inside: avoid; }
          }
        `}
      </style>

      {modalCritere && <DetailModal critere={modalCritere} onClose={() => setModalCritere(null)} onSave={saveModal} />}

      {/* BARRE DE NAVIGATION (Cachée à l'impression) */}
      <div className="no-print" style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 32px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ maxWidth: "1440px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "42px", height: "42px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🎓</div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "#1e3a5f", display: "flex", alignItems: "center" }}>
                Qualiopi Tracker — {NOM_ETABLISSEMENT}<SaveIndicator />
              </div>
              <div style={{ fontSize: "11px", color: "#9ca3af" }}>Referentiel National Qualite · 32 indicateurs · {new Date().toLocaleDateString("fr-FR")}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            {[["dashboard","Tableau de bord"],["criteres","Indicateurs"],["axes","Axes prioritaires"],["responsables","Responsables"]].map(([t, l]) => (
              <button key={t} style={navBtn(activeTab === t)} onClick={() => setActiveTab(t)}>{l}</button>
            ))}
            
            {/* BOUTON EXPORTER PDF */}
            <button onClick={() => window.print()} style={{ ...navBtn(false), color: "#1d4ed8", background: "#eff6ff", fontSize: "12px", marginLeft: "16px", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📄</span> Exporter PDF
            </button>
            
            <button onClick={handleLogout} style={{ ...navBtn(false), color: "#9ca3af", fontSize: "12px", marginLeft: "8px", border: "1px solid #e2e8f0" }}>Deconnexion</button>
          </div>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "28px 32px" }}>

        {activeTab === "dashboard" && <>
          <div className="print-break-avoid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "14px", marginBottom: "24px" }}>
            {[["#6b7280","#f3f4f6","#d1d5db",stats.nonEvalue,"Non evalues"],["#065f46","#d1fae5","#6ee7b7",stats.conforme,"Conformes"],["#92400e","#fef3c7","#fcd34d",stats.enCours,"En cours"],["#991b1b","#fee2e2","#fca5a5",stats.nonConforme,"Non conformes"],["#b45309","#fef9c3","#fde68a",urgents.length,"Urgents moins 30j"]].map(([color,bg,border,num,label]) => (
              <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "12px", padding: "20px 22px" }}>
                <div style={{ fontSize: "34px", fontWeight: "900", color, lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: "11px", color, opacity: 0.8, marginTop: "5px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600" }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div className="print-break-avoid" style={card}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>Score de conformite global</div>
              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <GaugeChart value={stats.conforme} max={stats.total} color="#1d4ed8" />
                <div style={{ flex: 1 }}>
                  {[["Non evalue",stats.nonEvalue,"#9ca3af"],["Conforme",stats.conforme,"#059669"],["En cours",stats.enCours,"#d97706"],["Non conforme",stats.nonConforme,"#dc2626"]].map(([l,v,col]) => (
                    <div key={l} style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}><span>{l}</span><span style={{ fontWeight: "600", color: col }}>{v}/{stats.total}</span></div>
                      <ProgressBar value={v} max={stats.total} color={col} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: "14px", background: "#f0f7ff", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>{stats.total - stats.nonEvalue} / {stats.total} indicateurs evalues</div>
            </div>
            <div className="print-break-avoid" style={card}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>Avancement par critere</div>
              {Object.entries(CRITERES_LABELS).map(([num, cfg]) => {
                const cr = criteres.filter(c => c.critere === parseInt(num));
                const ok = cr.filter(c => c.statut === "conforme").length;
                return (
                  <div key={num} style={{ marginBottom: "11px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "600" }}>C{num} — {cfg.label}</span>
                      <span style={{ color: cfg.color, fontWeight: "700" }}>{ok}/{cr.length}</span>
                    </div>
                    <ProgressBar value={ok} max={cr.length} color={cfg.color} />
                  </div>
                );
              })}
            </div>
          </div>
          {sansResp.length > 0 && (
            <div className="no-print" style={{ ...card, marginBottom: "20px", borderLeft: "4px solid #f59e0b", background: "#fffbeb", border: "1px solid #fcd34d" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#92400e", marginBottom: "4px" }}>{sansResp.length} indicateur(s) sans responsable assigne</div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>Allez dans l'onglet "Indicateurs" pour assigner les responsables.</div>
            </div>
          )}
          {urgents.length > 0 && (
            <div className="print-break-avoid" style={card}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f", marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>Indicateurs urgents — moins de 30 jours</div>
              {urgents.map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "8px", background: c.statut==="non-conforme"?"#fff5f5":"#fffbeb", border:`1px solid ${c.statut==="non-conforme"?"#fca5a5":"#fcd34d"}`, marginBottom: "8px" }}>
                  <span style={nb(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: "600", fontSize: "13px" }}>{c.titre}</div><div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>{c.responsables.length > 0 ? c.responsables.map(r => r.split("(")[0].trim()).join(", ") : "Aucun responsable"}</div></div>
                  <StatusBadge statut={c.statut} />
                  <span style={{ fontSize: "11px", color: dayColor(c.delai), fontWeight: "700", minWidth: "70px", textAlign: "right" }}>{days(c.delai) < 0 ? `${Math.abs(days(c.delai))}j depasse` : `J-${days(c.delai)}`}</span>
                  <button className="no-print" onClick={() => setModalCritere(c)} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", color: "#1d4ed8", padding: "4px 12px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>Editer</button>
                </div>
              ))}
            </div>
          )}
        </>}

        {activeTab === "criteres" && <>
          {/* BARRE DE RECHERCHE (Cachée à l'impression) */}
          <div className="no-print" style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ background: "white", border: "1px solid #d1d5db", borderRadius: "7px", color: "#374151", padding: "7px 12px", fontSize: "13px", width: "220px", outline: "none" }} />
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={sel}><option value="tous">Tous les statuts</option>{Object.entries(STATUT_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select>
            <select value={filterCritere} onChange={e => setFilterCritere(e.target.value)} style={sel}><option value="tous">Tous les criteres</option>{Object.entries(CRITERES_LABELS).map(([n,c]) => <option key={n} value={n}>C{n} — {c.label}</option>)}</select>
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>{filtered.length} indicateur(s)</span>
          </div>
          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["N°","Indicateur","Responsable(s)","Echeance","Statut","Preuves"].map(h => <th key={h} style={th}>{h}</th>)}<th style={th} className="no-print"></th></tr></thead>
              <tbody>
                {filtered.map(c => {
                  const col = CRITERES_LABELS[c.critere].color, d = days(c.delai);
                  return (
                    <tr key={c.id} className="print-break-avoid" onMouseOver={e => e.currentTarget.style.background="#f8fafc"} onMouseOut={e => e.currentTarget.style.background="white"}>
                      <td style={{ ...td, width: "52px" }}><span style={nb(col)}>{c.num}</span></td>
                      <td style={{ ...td, maxWidth: "280px" }}><div style={{ fontWeight: "600", color: "#1e3a5f", marginBottom: "2px" }}>{c.titre}</div><div style={{ fontSize: "11px", color: "#9ca3af" }}>{CRITERES_LABELS[c.critere].label}</div></td>
                      <td style={{ ...td, maxWidth: "200px" }}>
                        {c.responsables.length === 0
                          ? <span style={{ fontSize: "11px", color: "#d97706", fontWeight: "600", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "5px", padding: "2px 8px" }}>A assigner</span>
                          : <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>{c.responsables.slice(0,2).map(r => <span key={r} style={{ fontSize: "10px", color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "4px", padding: "2px 6px" }}>{r.split("(")[0].trim()}</span>)}{c.responsables.length > 2 && <span style={{ fontSize: "10px", color: "#6b7280", background: "#f3f4f6", borderRadius: "4px", padding: "2px 6px" }}>+{c.responsables.length-2}</span>}</div>}
                      </td>
                      <td style={td}><div style={{ fontSize: "12px" }}>{new Date(c.delai).toLocaleDateString("fr-FR")}</div><div style={{ fontSize: "10px", color: dayColor(c.delai), fontWeight: "600" }}>{d < 0 ? `${Math.abs(d)}j depasse` : `J-${d}`}</div></td>
                      <td style={td}><StatusBadge statut={c.statut} /></td>
                      <td style={td}>{c.preuves?.trim() ? <span style={{ fontSize: "10px", color: "#065f46", background: "#d1fae5", padding: "2px 8px", borderRadius: "5px", border: "1px solid #6ee7b7" }}>Renseignees</span> : <span style={{ fontSize: "10px", color: "#9ca3af" }}>Vide</span>}</td>
                      <td className="no-print" style={{ ...td, width: "80px" }}><button onClick={() => setModalCritere(c)} style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "none", borderRadius: "6px", color: "white", padding: "5px 14px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>Editer</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>}

        {activeTab === "axes" && <>
          <div style={{ marginBottom: "22px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>Axes prioritaires d'amelioration</h2>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>{stats.nonConforme} non conforme(s) · {stats.enCours} en cours</p>
          </div>
          {["non-conforme","en-cours"].map(st => {
            const items = axes.filter(c => c.statut === st);
            if (items.length === 0) return null;
            const isNC = st === "non-conforme";
            return (
              <div key={st}>
                <div className="print-break-avoid" style={{ fontSize: "12px", color: isNC?"#991b1b":"#92400e", fontWeight: "700", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: isNC?"#dc2626":"#d97706" }} />
                  {isNC ? "Non conformes — Action immediate" : "En cours — A finaliser"}
                </div>
                {items.map(c => (
                  <div key={c.id} className="print-break-avoid" style={{ background: "white", border: `1px solid ${isNC?"#fca5a5":"#fcd34d"}`, borderLeft: `4px solid ${isNC?"#dc2626":"#d97706"}`, borderRadius: "10px", padding: "16px 20px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <span style={nb(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f", marginBottom: "4px" }}>{c.titre}</div>
                        <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "8px" }}>{CRITERES_LABELS[c.critere].label}</div>
                        {c.attendus && <div style={{ fontSize: "12px", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "6px", padding: "8px 12px", marginBottom: "6px" }}><span style={{ fontWeight: "700", color: "#92400e" }}>Attendu : </span>{c.attendus}</div>}
                        {c.preuves ? <div style={{ fontSize: "12px", background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "6px", padding: "8px 12px" }}><span style={{ fontWeight: "700", color: "#065f46" }}>Preuves : </span>{c.preuves}</div> : <div style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic" }}>Aucune preuve renseignee</div>}
                      </div>
                      <div style={{ textAlign: "right", minWidth: "140px", flexShrink: 0 }}>
                        <StatusBadge statut={c.statut} />
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>{new Date(c.delai).toLocaleDateString("fr-FR")}</div>
                        <div style={{ fontSize: "10px", color: dayColor(c.delai), fontWeight: "700" }}>{days(c.delai) < 0 ? `${Math.abs(days(c.delai))}j depasse` : `J-${days(c.delai)}`}</div>
                        <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>{c.responsables.length > 0 ? c.responsables.map(r => r.split("(")[0].trim()).join(", ") : "Non assigne"}</div>
                        <button className="no-print" onClick={() => setModalCritere(c)} style={{ marginTop: "8px", background: isNC?"#fff5f5":"#fffbeb", border:`1px solid ${isNC?"#fca5a5":"#fcd34d"}`, borderRadius: "6px", color: isNC?"#dc2626":"#92400e", padding: "4px 12px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>Editer</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ height: "16px" }} />
              </div>
            );
          })}
          {axes.length === 0 && <div style={{ ...card, textAlign: "center", padding: "60px" }}><div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div><div style={{ fontSize: "16px", fontWeight: "700", color: "#1e3a5f" }}>Tous les indicateurs evalues sont conformes !</div></div>}
        </>}

        {activeTab === "responsables" && <>
          <div style={{ marginBottom: "22px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>Vue par responsable</h2>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Membres ayant au moins un indicateur assigne</p>
          </div>
          {sansResp.length > 0 && (
            <div className="no-print print-break-avoid" style={{ ...card, marginBottom: "20px", borderLeft: "4px solid #f59e0b", background: "#fffbeb", border: "1px solid #fcd34d" }}>
              <div style={{ fontWeight: "700", color: "#92400e", marginBottom: "8px" }}>{sansResp.length} indicateur(s) sans responsable</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>{sansResp.map(c => <button key={c.id} onClick={() => setModalCritere(c)} style={{ background: "white", border: "1px solid #fcd34d", borderRadius: "6px", color: "#92400e", padding: "5px 12px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>{c.num} — {c.titre.substring(0,38)}{c.titre.length>38?"...":""}</button>)}</div>
            </div>
          )}
          {byResp.length === 0 && <div style={{ ...card, textAlign: "center", padding: "48px", color: "#9ca3af" }}>Aucun responsable assigne. Allez dans "Indicateurs" pour commencer.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(420px,1fr))", gap: "16px" }}>
            {byResp.map(r => {
              const conformes = r.items.filter(c => c.statut==="conforme").length;
              const nonConformes = r.items.filter(c => c.statut==="non-conforme").length;
              const enCours = r.items.filter(c => c.statut==="en-cours").length;
              return (
                <div key={r.name} className="print-break-avoid" style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", color: "white", flexShrink: 0 }}>{r.nom.split(" ").map(n=>n[0]).join("").substring(0,2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f" }}>{r.nom}</div><div style={{ fontSize: "11px", color: "#9ca3af" }}>{r.role}</div></div>
                    <div style={{ display: "flex", gap: "5px" }}>
                      {[["#065f46","#d1fae5","#6ee7b7",conformes,"OK"],["#92400e","#fef3c7","#fcd34d",enCours,"EC"],["#991b1b","#fee2e2","#fca5a5",nonConformes,"KO"]].map(([col,bg,border,val,label]) => (
                        <span key={label} style={{ background: bg, border:`1px solid ${border}`, padding: "4px 9px", borderRadius: "7px", textAlign: "center" }}>
                          <span style={{ fontSize: "14px", fontWeight: "800", color: col, display: "block", lineHeight: 1 }}>{val}</span>
                          <span style={{ fontSize: "9px", color: col, opacity: 0.7 }}>{label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <ProgressBar value={conformes} max={r.items.length} color="#1d4ed8" />
                  <div style={{ marginTop: "12px" }}>
                    {r.items.sort((a,b) => ({"non-conforme":0,"en-cours":1,"non-evalue":2,"conforme":3}[a.statut])-({"non-conforme":0,"en-cours":1,"non-evalue":2,"conforme":3}[b.statut])).map(c => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderBottom: "1px solid #f8fafc" }}>
                        <span style={nb(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
                        <div style={{ flex: 1, fontSize: "12px", color: "#374151" }}>{c.titre}</div>
                        <StatusBadge statut={c.statut} />
                        <button className="no-print" onClick={() => setModalCritere(c)} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "5px", color: "#1d4ed8", padding: "3px 10px", fontSize: "10px", cursor: "pointer", fontWeight: "600" }}>Editer</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>}
      </div>
    </div>
  );
}
