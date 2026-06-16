import React, { useState, useRef } from "react";
import { CRITERES_LABELS, STATUT_CONFIG } from "../data";

// ----------------------------------------------------------------------
// 🎯 ONGLET : INDICATEURS — 4 vues (Tableau / Cartes / Kanban / Chronologie)
// ----------------------------------------------------------------------
// Props (inchangées, AUCUNE modif App.jsx requise) :
//   searchTerm/setSearchTerm, filterStatut/setFilterStatut,
//   filterCritere/setFilterCritere, filtered, days, setModalCritere,
//   handleAutoSave, t
//
// Contrat de données réel (data.js) :
//   - c.delai      : date "AAAA-MM-JJ"  -> days(c.delai) = nb de jours (négatif = dépassé)
//   - c.responsables : tableau de noms  -> on affiche responsables[0]
//   - preuves      : agrégat c.fichiers[] + c.chemins_reseau[] + c.preuves (texte)
//   - CRITERES_LABELS[n] = { label, color } UNIQUEMENT -> bg/bd dérivés via hexToRgba()
// ----------------------------------------------------------------------
export function CriteresTab({ searchTerm, setSearchTerm, filterStatut, setFilterStatut, filterCritere, setFilterCritere, filtered, days, setModalCritere, handleAutoSave, t }) {

  const [vue, setVue]           = useState("table");   // table | cards | kanban | timeline
  const [expanded, setExpanded] = useState(null);      // ligne dépliée (vue tableau)
  const [sortBy, setSortBy]     = useState(null);      // tri colonne (vue tableau)
  const [sortDir, setSortDir]   = useState("asc");
  const [selected, setSelected] = useState(new Set()); // sélection multiple (vue tableau)
  const [dragOver, setDragOver] = useState(null);      // colonne survolée (vue kanban)
  const draggedRef = useRef(null);                     // indicateur en cours de glissement

  // ── Helpers couleurs ──────────────────────────────────────────────
  // CRITERES_LABELS ne fournit qu'une couleur pleine : on dérive bg/bd translucides.
  const hexToRgba = (hex, a) => {
    if (!hex || hex[0] !== "#") return hex || t.text2;
    const h = hex.slice(1);
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };
  const critTheme = (num) => {
    const cl = CRITERES_LABELS[num] || { label: "—", color: t.text2 };
    return { tag: `C${num}`, desc: cl.label, color: cl.color, bg: hexToRgba(cl.color, 0.12), bd: hexToRgba(cl.color, 0.30) };
  };
  // Thème d'un statut, basé exclusivement sur des tokens garantis présents.
  const statutTheme = (st) => ({
    "conforme":     { c: t.green, bg: t.greenBg, bd: t.greenBd, label: "Conforme" },
    "en-cours":     { c: t.amber, bg: t.amberBg, bd: t.amberBd, label: "En cours" },
    "non-conforme": { c: t.red,   bg: t.redBg,   bd: t.redBd,   label: "Non conforme" },
    "non-evalue":   { c: t.text3, bg: t.surface3, bd: t.border, label: "Non évalué" },
    "non-concerne": { c: t.text2, bg: t.surface3, bd: t.border, label: "Non concerné" },
  }[st] || { c: t.text2, bg: t.surface2, bd: t.border, label: st || "—" });

  // ── Helpers données ───────────────────────────────────────────────
  const formatInd = (critere, num) => `${critere}.${String(num).replace(/\D/g, '')}`;

  const preuvesInfo = (c) => {
    const total = (c.fichiers?.length || 0) + (c.chemins_reseau?.length || 0) + (c.preuves ? 1 : 0);
    const valid = (c.fichiers?.filter(f => f.validated)?.length || 0) + (c.chemins_reseau?.filter(cr => cr.validated)?.length || 0) + (c.preuves ? 1 : 0);
    return { total, valid, complete: total > 0 && valid === total, color: total === 0 ? t.text3 : (valid === total ? t.green : t.amber) };
  };

  const dInfo = (c) => {
    const n = days(c.delai);
    if (isNaN(n)) return { n: null, label: "—", color: t.text3 };
    if (n < 0)   return { n, label: "Dépassé", color: t.red };
    return { n, label: `J‑${n}`, color: n <= 15 ? t.red : n <= 30 ? t.amber : t.text3 };
  };

  const statsCounts = {
    conforme:       filtered.filter(c => c.statut === "conforme").length,
    "en-cours":     filtered.filter(c => c.statut === "en-cours").length,
    "non-conforme": filtered.filter(c => c.statut === "non-conforme").length,
    "non-concerne": filtered.filter(c => c.statut === "non-concerne").length,
  };

  // ── Tri local (vue tableau uniquement) ────────────────────────────
  const sortToggle = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };
  const SortIcon = ({ col }) => sortBy === col
    ? <span style={{ fontSize: "9px", color: t.accent }}>{sortDir === "asc" ? "↑" : "↓"}</span>
    : <span style={{ fontSize: "9px", color: t.text3, opacity: 0.4 }}>↕</span>;

  const displayed = (() => {
    if (!sortBy) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va, vb;
      if (sortBy === "num") { va = parseFloat(formatInd(a.critere, a.num)); vb = parseFloat(formatInd(b.critere, b.num)); }
      else if (sortBy === "delai") { va = days(a.delai); vb = days(b.delai); if (isNaN(va)) va = Infinity; if (isNaN(vb)) vb = Infinity; }
      else { va = a[sortBy] ?? ""; vb = b[sortBy] ?? ""; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  })();

  // ── Sélection multiple + actions groupées ─────────────────────────
  const toggleSelect = (id) => { const ns = new Set(selected); ns.has(id) ? ns.delete(id) : ns.add(id); setSelected(ns); };
  const selectAll    = () => setSelected(selected.size === displayed.length && displayed.length > 0 ? new Set() : new Set(displayed.map(c => c.id)));
  const bulkSet      = (statut) => { displayed.filter(c => selected.has(c.id)).forEach(c => handleAutoSave({ ...c, statut })); setSelected(new Set()); };

  // ── Badge de statut cliquable (cycle via handleAutoSave) ──────────
  const STATUT_CYCLE = ["non-evalue", "en-cours", "non-conforme", "conforme"];
  const StatutBadge = ({ c, size = "sm" }) => {
    const th = statutTheme(c.statut);
    const cycle = () => { const i = STATUT_CYCLE.indexOf(c.statut); handleAutoSave({ ...c, statut: STATUT_CYCLE[(i + 1) % STATUT_CYCLE.length] }); };
    return (
      <span onClick={(e) => { e.stopPropagation(); cycle(); }} title="Cliquer pour changer le statut"
        style={{ background: th.bg, border: `1px solid ${th.bd}`, color: th.c, fontSize: size === "sm" ? "9px" : "11px", fontWeight: "800", padding: size === "sm" ? "3px 8px" : "5px 11px", borderRadius: "5px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
        {th.label}
      </span>
    );
  };

  // ── Drag & drop (vue kanban) — branché sur handleAutoSave ──────────
  const onCardDragStart = (e, c) => { draggedRef.current = c; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(c.id)); };
  const onColDrop = (e, statut) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const c = draggedRef.current || filtered.find(x => String(x.id) === id);
    if (c && c.statut !== statut) handleAutoSave({ ...c, statut });
    draggedRef.current = null;
    setDragOver(null);
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "40px" }}>
      <style>{`
        .ro { transition:background 0.15s; cursor:pointer; }
        .ro:hover { background:${t.surface2}!important; }
        .stat-card { transition:all 0.2s; cursor:pointer; border:1px solid ${t.border}; }
        .stat-card:hover { transform:translateY(-2px); box-shadow:${t.shadow}!important; }
        .fil:hover { border-color:${t.accent}!important; background:${t.accentBg}!important; color:${t.accent}!important; }
        .kcard:hover { transform:translateY(-1px); box-shadow:${t.shadow}!important; }
        .scroll-container::-webkit-scrollbar { height:6px; width:6px; }
        .scroll-container::-webkit-scrollbar-track { background:transparent; }
        .scroll-container::-webkit-scrollbar-thumb { background:${t.border2}; border-radius:4px; }
      `}</style>

      {/* ── 4 CARTES KPI ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { id: "conforme",     l: "Conformes",     v: statsCounts["conforme"],     c: t.green, bg: t.greenBg, bd: t.greenBd },
          { id: "en-cours",     l: "En cours",      v: statsCounts["en-cours"],     c: t.amber, bg: t.amberBg, bd: t.amberBd },
          { id: "non-conforme", l: "Non conformes", v: statsCounts["non-conforme"], c: t.red,   bg: t.redBg,   bd: t.redBd },
          { id: "non-concerne", l: "Non concernés", v: statsCounts["non-concerne"], c: t.text3, bg: t.surface3, bd: t.border },
        ].map(s => {
          const isActive = filterStatut === s.id;
          return (
            <div key={s.id} onClick={() => setFilterStatut(isActive ? "tous" : s.id)} className="stat-card" style={{ background: isActive ? s.bg : t.surface, border: `1px solid ${isActive ? s.c : s.bd}`, borderRadius: "10px", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: isActive ? t.shadow : `0 4px 12px ${s.bg}` }}>
              <div>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "38px", color: t.text, lineHeight: 1, letterSpacing: "-1px" }}>{s.v}</div>
                <div style={{ fontSize: "12px", color: t.text2, fontWeight: "600", marginTop: "4px" }}>{s.l}</div>
              </div>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: s.bg, border: `1px solid ${s.bd}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: s.c }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── RECHERCHE + FILTRES + TOGGLE 4 VUES ── */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: "260px", flexShrink: 0 }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: t.text3 }}>🔍</span>
          <input type="text" placeholder="Rechercher par N°, libellé..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", background: t.surface, border: `1px solid ${t.border}`, color: t.text, padding: "8px 12px 8px 34px", fontSize: "12px", outline: "none", borderRadius: "8px", boxShadow: t.shadowSm, boxSizing: "border-box" }} />
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button onClick={() => setFilterCritere("tous")} className="fil" style={{ padding: "7px 12px", borderRadius: "7px", border: `1px solid ${filterCritere === "tous" ? t.accent : t.border}`, background: filterCritere === "tous" ? t.accentBg : t.surface, color: filterCritere === "tous" ? t.accent : t.text2, fontSize: "11px", fontWeight: "700", cursor: "pointer", boxShadow: t.shadowSm }}>Tous</button>
          {[1, 2, 3, 4, 5, 6, 7].map(num => (
            <button key={num} onClick={() => setFilterCritere(num)} className="fil" style={{ padding: "7px 10px", borderRadius: "7px", border: `1px solid ${filterCritere === num ? t.accent : t.border}`, background: filterCritere === num ? t.accentBg : t.surface, color: filterCritere === num ? t.accent : t.text2, fontSize: "11px", fontWeight: "700", cursor: "pointer", boxShadow: t.shadowSm }}>C{num}</button>
          ))}
        </div>

        {/* Toggle Vue — 4 vues */}
        <div style={{ display: "flex", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "3px", boxShadow: t.shadowSm, marginLeft: "auto" }}>
          {[
            { id: "table",    icon: "☰", title: "Tableau" },
            { id: "cards",    icon: "⊞", title: "Cartes par critère" },
            { id: "kanban",   icon: "⊟", title: "Kanban (glisser-déposer)" },
            { id: "timeline", icon: "▬", title: "Chronologie" },
          ].map(({ id, icon, title }) => (
            <button key={id} onClick={() => setVue(id)} title={title}
              style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: vue === id ? t.surface2 : "transparent", color: vue === id ? t.text : t.text3, cursor: "pointer", fontSize: "13px", boxShadow: vue === id ? t.shadowSm : "none" }}>{icon}</button>
          ))}
        </div>
        <div style={{ fontSize: "11px", color: t.text3, whiteSpace: "nowrap" }}><strong>{filtered.length}</strong> résultats</div>
      </div>

      {/* ── Barre d'actions groupées (sélection active, vue tableau) ── */}
      {vue === "table" && selected.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: t.accentBg, border: `1px solid ${t.accentBd}`, borderRadius: "8px", padding: "8px 14px" }}>
          <span style={{ fontSize: "12px", fontWeight: "700", color: t.accent }}>{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>
          <span style={{ fontSize: "11px", color: t.text3 }}>Marquer comme :</span>
          {["conforme", "en-cours", "non-conforme", "non-concerne"].map(st => {
            const th = statutTheme(st);
            return <button key={st} onClick={() => bulkSet(st)} style={{ background: th.bg, border: `1px solid ${th.bd}`, color: th.c, fontSize: "10px", fontWeight: "800", padding: "4px 10px", borderRadius: "6px", cursor: "pointer" }}>{th.label}</button>;
          })}
          <button onClick={() => setSelected(new Set())} style={{ marginLeft: "auto", background: "transparent", border: "none", color: t.text3, fontSize: "11px", cursor: "pointer" }}>✕ Annuler</button>
        </div>
      )}

      {/* ════════════════ VUE 1 : TABLEAU ════════════════ */}
      {vue === "table" && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "10px", overflow: "hidden", boxShadow: t.shadowSm }}>
          <div className="scroll-container" style={{ overflowX: "auto" }}>
            <div style={{ minWidth: "760px" }}>
              {/* En-tête */}
              <div style={{ display: "grid", gridTemplateColumns: "34px 70px minmax(200px,1fr) 110px 110px 80px 110px 30px", gap: "12px", padding: "8px 24px", background: t.surface2, borderBottom: `1px solid ${t.border}`, alignItems: "center" }}>
                <input type="checkbox" checked={selected.size === displayed.length && displayed.length > 0} onChange={selectAll} style={{ width: "14px", height: "14px", cursor: "pointer", accentColor: t.accent }} />
                {[{ k: "num", l: "N°" }, { k: "titre", l: "Libellé" }, { k: "statut", l: "Statut" }, { k: null, l: "Responsable" }, { k: null, l: "Preuves" }, { k: "delai", l: "Échéance" }, { k: null, l: "" }].map((h, i) => (
                  <div key={i} onClick={h.k ? () => sortToggle(h.k) : undefined} style={{ display: "flex", alignItems: "center", gap: "4px", cursor: h.k ? "pointer" : "default", userSelect: "none" }}>
                    <span style={{ fontSize: "9px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "0.8px" }}>{h.l}</span>
                    {h.k && <SortIcon col={h.k} />}
                  </div>
                ))}
              </div>
              {/* Lignes */}
              <div className="scroll-container" style={{ maxHeight: "600px", overflowY: "auto", paddingBottom: "10px" }}>
                {displayed.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: t.text3, fontStyle: "italic", fontSize: "13px" }}>Aucun indicateur.</div>
                ) : displayed.map(c => {
                  const ct = critTheme(c.critere);
                  const pv = preuvesInfo(c);
                  const di = dInfo(c);
                  const isExp = expanded === c.id;
                  const isSel = selected.has(c.id);
                  return (
                    <div key={c.id}>
                      <div className="ro" onClick={() => setExpanded(isExp ? null : c.id)} style={{ display: "grid", gridTemplateColumns: "34px 70px minmax(200px,1fr) 110px 110px 80px 110px 30px", gap: "12px", alignItems: "center", padding: "10px 24px", borderBottom: `1px solid ${t.border2}`, background: isSel ? t.accentBg : isExp ? t.surface2 : "transparent", borderLeft: isExp ? `3px solid ${t.accent}` : "3px solid transparent" }}>
                        <input type="checkbox" checked={isSel} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(c.id)} style={{ width: "14px", height: "14px", cursor: "pointer", accentColor: t.accent }} />
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: ct.bg, border: `1px solid ${ct.bd}`, color: ct.color, padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "800", whiteSpace: "nowrap" }}>{formatInd(c.critere, c.num)}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "12px", color: t.text, fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: "12px" }}>{c.titre}</div>
                        </div>
                        <div><StatutBadge c={c} /></div>
                        <span style={{ fontSize: "11px", color: t.text2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.responsables?.[0] || "—"}</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "12px", fontWeight: "800", color: pv.color }}>{pv.total > 0 ? `${pv.valid}/${pv.total}` : "0"}</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", fontWeight: "800", color: di.color }}>{di.label}</span>
                        <span style={{ fontSize: "13px", color: t.text3, textAlign: "center" }}>{isExp ? "▲" : "▼"}</span>
                      </div>
                      {/* Panneau déplié */}
                      {isExp && (
                        <div style={{ background: t.surface2, borderBottom: `1px solid ${t.border}`, padding: "16px 24px 18px 70px", borderLeft: `3px solid ${t.accent}` }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                            {[
                              { label: "Attendus", icon: "📋", val: c.attendus || "Non renseigné" },
                              { label: "Notes / Justification", icon: "📝", val: c.notes || "Aucune note" },
                              { label: "Responsable", icon: "👤", val: c.responsables?.join(", ") || "—" },
                            ].map(f => (
                              <div key={f.label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "11px 13px" }}>
                                <div style={{ fontSize: "9px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "5px" }}>{f.icon} {f.label}</div>
                                <div style={{ fontSize: "11px", color: t.text2, lineHeight: "1.5" }}>{f.val}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <button onClick={(e) => { e.stopPropagation(); setModalCritere(c); }} style={{ padding: "6px 14px", borderRadius: "7px", background: t.accentBg, border: `1px solid ${t.accentBd}`, color: t.accent, fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>📂 Ouvrir la fiche complète</button>
                            <div style={{ marginLeft: "auto" }}><StatutBadge c={c} size="md" /></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ VUE 2 : CARTES PAR CRITÈRE ════════════════ */}
      {vue === "cards" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "40px" }}>
          {[1, 2, 3, 4, 5, 6, 7].map(num => {
            const inds = filtered.filter(c => c.critere === num);
            if (inds.length === 0) return null;
            const ct = critTheme(num);
            const conf = inds.filter(i => i.statut === "conforme").length;
            return (
              <div key={num} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", boxShadow: t.shadowSm }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: ct.bg, border: `1px solid ${ct.bd}`, display: "flex", alignItems: "center", justifyContent: "center", color: ct.color, fontWeight: "800", fontSize: "12px" }}>{ct.tag}</div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: ct.color }}>Critère {num}</div>
                    <div style={{ fontSize: "10px", color: t.text3 }}>{ct.desc}</div>
                  </div>
                  <div style={{ flex: 1, maxWidth: "180px", height: "4px", background: t.border, borderRadius: "2px" }}>
                    <div style={{ width: `${(conf / inds.length) * 100}%`, height: "100%", background: ct.color, borderRadius: "2px", opacity: 0.75 }} />
                  </div>
                  <div style={{ fontSize: "10px", color: t.text3, whiteSpace: "nowrap" }}>{conf}/{inds.length} conformes</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                  {inds.map(c => {
                    const th = statutTheme(c.statut);
                    const pv = preuvesInfo(c);
                    const di = dInfo(c);
                    return (
                      <div key={c.id} onClick={() => setModalCritere(c)} className="stat-card" style={{ background: t.surface, border: `1px solid ${th.bd}`, borderLeft: `3px solid ${ct.color}`, borderRadius: "9px", padding: "14px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: `0 4px 12px ${th.bg}` }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                            <span style={{ background: ct.bg, border: `1px solid ${ct.bd}`, color: ct.color, padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "800" }}>{formatInd(c.critere, c.num)}</span>
                            <StatutBadge c={c} />
                          </div>
                          <div style={{ fontSize: "12px", color: t.text, fontWeight: "500", lineHeight: "1.4", marginBottom: "14px" }}>{c.titre}</div>
                        </div>
                        <div style={{ marginTop: "auto" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", marginBottom: "6px" }}>
                            <span style={{ color: t.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }}>👤 {c.responsables?.[0] || "—"}</span>
                            <span style={{ fontWeight: "800", fontFamily: "'DM Mono',monospace", color: di.color }}>{di.label}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ flex: 1, height: "3px", background: t.border, borderRadius: "2px", marginRight: "10px" }}>
                              <div style={{ width: pv.complete ? "100%" : pv.total > 0 ? "50%" : "0%", height: "100%", background: pv.complete ? t.green : t.amber, borderRadius: "2px" }} />
                            </div>
                            <span style={{ fontSize: "10px", fontWeight: "800", color: pv.color, whiteSpace: "nowrap" }}>{pv.total > 0 ? `${pv.valid}/${pv.total} preuves` : "0 preuve"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════ VUE 3 : KANBAN (drag & drop) ════════════════ */}
      {vue === "kanban" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", minHeight: "400px" }}>
          {[
            { id: "non-evalue",   label: "Non évalués" },
            { id: "en-cours",     label: "En cours" },
            { id: "non-conforme", label: "Non conformes" },
            { id: "conforme",     label: "Conformes" },
          ].map(col => {
            const th = statutTheme(col.id);
            const items = filtered.filter(c => c.statut === col.id);
            const isDO = dragOver === col.id;
            return (
              <div key={col.id}
                onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
                onDragLeave={() => setDragOver(d => d === col.id ? null : d)}
                onDrop={(e) => onColDrop(e, col.id)}>
                <div style={{ background: isDO ? th.bg : t.surface2, border: `1px solid ${isDO ? th.bd : t.border}`, borderTop: `3px solid ${th.c}`, borderRadius: "10px", padding: "10px 12px", marginBottom: "8px", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: "800", color: isDO ? th.c : t.text2 }}>{col.label}</span>
                    <span style={{ background: th.bg, border: `1px solid ${th.bd}`, color: th.c, fontSize: "9px", fontWeight: "800", padding: "1px 7px", borderRadius: "20px" }}>{items.length}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "7px", minHeight: "90px", padding: isDO ? "4px" : "0", background: isDO ? th.bg : "transparent", borderRadius: "8px", border: isDO ? `1px dashed ${th.bd}` : "1px solid transparent", transition: "all 0.15s" }}>
                  {items.map(c => {
                    const ct = critTheme(c.critere);
                    const di = dInfo(c);
                    const pv = preuvesInfo(c);
                    return (
                      <div key={c.id} draggable className="kcard"
                        onDragStart={(e) => onCardDragStart(e, c)}
                        onClick={() => setModalCritere(c)}
                        style={{ background: t.surface, border: `1px solid ${t.border}`, borderLeft: `3px solid ${ct.color}`, borderRadius: "8px", padding: "10px 11px", cursor: "grab", userSelect: "none", boxShadow: t.shadowSm, transition: "all 0.15s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", fontWeight: "800", color: ct.color }}>{formatInd(c.critere, c.num)}</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: di.color, fontWeight: "700" }}>{di.label}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: t.text, lineHeight: "1.3", marginBottom: "7px" }}>{c.titre}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "9px", color: t.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "90px" }}>{c.responsables?.[0] || "—"}</span>
                          <span style={{ fontSize: "9px", color: pv.color, fontWeight: "700" }}>{pv.total > 0 ? `${pv.valid}/${pv.total}` : "0"} 📎</span>
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div style={{ padding: "20px 12px", textAlign: "center", color: t.text3, fontSize: "11px", fontStyle: "italic", opacity: 0.6 }}>Déposer ici</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════ VUE 4 : CHRONOLOGIE ════════════════ */}
      {vue === "timeline" && (() => {
        const withDays = filtered.map(c => ({ c, d: days(c.delai) }));
        const sorted = [...withDays].sort((a, b) => (isNaN(a.d) ? Infinity : a.d) - (isNaN(b.d) ? Infinity : b.d));
        const maxDelay = Math.max(90, ...withDays.map(x => isNaN(x.d) ? 0 : x.d));
        return (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
            {/* Règle de temps */}
            <div style={{ padding: "10px 20px 6px", borderBottom: `1px solid ${t.border}`, background: t.surface2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: t.red, fontWeight: "800" }}>URGENT</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: t.amber, fontWeight: "800" }}>30j</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: t.text3 }}>{Math.round(maxDelay / 2)}j</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: t.green, fontWeight: "800" }}>OK</span>
              </div>
              <div style={{ height: "2px", background: t.border, position: "relative", borderRadius: "1px" }}>
                <div style={{ position: "absolute", left: `${(30 / maxDelay) * 100}%`, top: "-3px", width: "1px", height: "8px", background: t.amber, opacity: 0.6 }} />
                <div style={{ position: "absolute", left: "50%", top: "-3px", width: "1px", height: "8px", background: t.border2 }} />
              </div>
            </div>
            {/* Lignes */}
            <div className="scroll-container" style={{ maxHeight: "520px", overflowY: "auto" }}>
              {sorted.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: t.text3, fontStyle: "italic", fontSize: "13px" }}>Aucun indicateur.</div>}
              {sorted.map(({ c, d }) => {
                const ct = critTheme(c.critere);
                const di = dInfo(c);
                const pct = isNaN(d) ? 100 : Math.min(Math.max(d / maxDelay * 100, 0), 100);
                const barColor = c.statut === "conforme" ? t.green : isNaN(d) ? t.text3 : d <= 15 ? t.red : d <= 30 ? t.amber : t.accent;
                return (
                  <div key={c.id} onClick={() => setModalCritere(c)} className="ro" style={{ display: "grid", gridTemplateColumns: "70px 1fr 110px 90px", alignItems: "center", padding: "9px 20px", borderBottom: `1px solid ${t.border2}`, gap: "12px", cursor: "pointer" }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", fontWeight: "800", color: ct.color, background: ct.bg, border: `1px solid ${ct.bd}`, padding: "2px 5px", borderRadius: "4px", textAlign: "center" }}>{formatInd(c.critere, c.num)}</span>
                    <div style={{ position: "relative" }}>
                      <div style={{ height: "6px", background: t.border, borderRadius: "3px" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: "3px", opacity: 0.8, position: "relative" }}>
                          <div style={{ position: "absolute", right: "-4px", top: "-2px", width: "10px", height: "10px", borderRadius: "50%", background: barColor, border: `2px solid ${t.surface}` }} />
                        </div>
                      </div>
                      <div style={{ fontSize: "9px", color: t.text3, marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.titre}</div>
                    </div>
                    <div><StatutBadge c={c} /></div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", fontWeight: "800", color: di.color, textAlign: "right" }}>{di.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ----------------------------------------------------------------------
// 🔥 ONGLET : PRIORITÉS 
// ----------------------------------------------------------------------
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
