// ─────────────────────────────────────────────────────────────────────────────
//  LivreBlancTab.jsx  —  Viewer Livre Blanc Qualiopi + Organigramme
//  QualiForma · Production
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useMemo } from "react";
import { CRITERES_LABELS } from "../data";

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTES DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────

// Dimensions A4 en pixels à 96dpi (standard navigateur)
const A4_W = 794;
const A4_H = 1123;

// Palette critique fixe (indépendante du thème UI)
const CRIT_PALETTE = {
  1: { c: "#1e40af", light: "#dbeafe", dot: "#3b82f6" },
  2: { c: "#6d28d9", light: "#ede9fe", dot: "#8b5cf6" },
  3: { c: "#be185d", light: "#fce7f3", dot: "#ec4899" },
  4: { c: "#b45309", light: "#fef3c7", dot: "#f59e0b" },
  5: { c: "#065f46", light: "#d1fae5", dot: "#10b981" },
  6: { c: "#0e7490", light: "#cffafe", dot: "#06b6d4" },
  7: { c: "#b91c1c", light: "#fee2e2", dot: "#ef4444" },
};

// Noms officiels des critères Qualiopi
const CRIT_TITRES = {
  1: "Information des publics",
  2: "Identification des objectifs",
  3: "Adaptation aux publics",
  4: "Adéquation des moyens",
  5: "Qualification des intervenants",
  6: "Inscription dans l'environnement",
  7: "Recueil et prise en compte",
};

// Statut → style document (toujours papier, jamais dark)
const STATUT_DOC = {
  "conforme":     { label: "Conforme",     c: "#065f46", bg: "#d1fae5", bd: "#6ee7b7", dot: "#10b981", icon: "✓" },
  "en-cours":     { label: "En cours",     c: "#92400e", bg: "#fef3c7", bd: "#fcd34d", dot: "#f59e0b", icon: "◔" },
  "non-conforme": { label: "Non conforme", c: "#991b1b", bg: "#fee2e2", bd: "#fca5a5", dot: "#ef4444", icon: "✕" },
  "non-evalue":   { label: "Non évalué",   c: "#6b7280", bg: "#f3f4f6", bd: "#d1d5db", dot: "#9ca3af", icon: "○" },
  "non-concerne": { label: "Non concerné", c: "#475569", bg: "#e2e8f0", bd: "#cbd5e1", dot: "#94a3b8", icon: "—" },
};

// Extraire le numéro entier de "Indicateur 12" → 12
function indNum(numStr) {
  if (typeof numStr === "number") return numStr;
  const m = String(numStr).match(/\d+/);
  return m ? parseInt(m[0]) : 0;
}

// Formatter date FR depuis AAAA-MM-JJ
function dateFR(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

const DATE_DOC = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANTS DOCUMENT  (fond blanc « papier »)
// ─────────────────────────────────────────────────────────────────────────────

function DocHeader({ ifsiName, certif, auditDate, critPalette }) {
  return (
    <div style={{ borderBottom: "2px solid #1e3a6e", paddingBottom: "10px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "28px", height: "28px", background: "#1e3a6e", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "16px", color: "#d4a030", fontStyle: "italic" }}>Q</span>
        </div>
        <div>
          <div style={{ fontSize: "8.5px", fontWeight: "800", color: "#9a8f88", textTransform: "uppercase", letterSpacing: "1px" }}>
            QualiForma — {ifsiName}
          </div>
          {critPalette && (
            <div style={{ fontSize: "10px", fontWeight: "700", color: critPalette.c, marginTop: "1px" }}>
              {critPalette.titre}
            </div>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "9.5px", color: "#9a8f88" }}>Audit Qualiopi · {auditDate}</div>
        {certif && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: "#b8b0a8", marginTop: "1px" }}>{certif}</div>}
      </div>
    </div>
  );
}

function DocFooter({ pageNum, mode, certif }) {
  return (
    <div style={{ borderTop: "1px solid #e2ddd8", paddingTop: "8px", marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontSize: "7.5px", color: "#b8b0a8" }}>
        Document {mode === "audit" ? "confidentiel — usage interne" : "établissement"} · {certif || "Qualiopi"}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div style={{ width: "14px", height: "1px", background: "#d4a030" }} />
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "8px", color: "#9a8f88" }}>{pageNum}</span>
        <div style={{ width: "14px", height: "1px", background: "#d4a030" }} />
      </div>
      <div style={{ fontSize: "7.5px", color: "#b8b0a8" }}>Généré le {DATE_DOC} — QualiForma</div>
    </div>
  );
}

// ── PAGE 1 : COUVERTURE ──────────────────────────────────────────────────────
function PageCover({ ifsiData, ifsiName, auditDate, stats, mode }) {
  const pct = stats.total > 0 ? Math.round((stats.conforme / stats.total) * 100) : 0;
  const circumference = 2 * Math.PI * 28;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f8f7f4", fontFamily: "'Albert Sans',sans-serif", position: "relative", overflow: "hidden", boxSizing: "border-box" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "8px", background: "linear-gradient(180deg,#1e3a6e,#d4a030)" }} />
      <div style={{ height: "6px", background: "#d4a030", marginLeft: "8px" }} />

      <div style={{ background: "#1e3a6e", marginLeft: "8px", padding: "40px 52px 36px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9.5px", color: "rgba(255,255,255,0.45)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>
              {mode === "audit" ? "Document confidentiel — Usage interne équipe qualité" : "Dossier de présentation — Démarche qualité"}
            </div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "36px", color: "white", lineHeight: "1.15", marginBottom: "10px" }}>
              Livre Blanc<br /><span style={{ color: "#d4a030" }}>Qualiopi</span>
            </div>
            <div style={{ fontSize: "13.5px", color: "rgba(255,255,255,0.65)", lineHeight: "1.6" }}>
              {ifsiName}<br />
              {mode === "audit"
                ? `Audit de renouvellement · ${auditDate}`
                : "Dossier de préparation à l'audit de renouvellement"}
            </div>
          </div>

          <div style={{ textAlign: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "18px 22px", flexShrink: 0 }}>
            <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
              <circle cx="36" cy="36" r="28" fill="none" stroke="#d4a030" strokeWidth="7"
                strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct / 100)}
                strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "26px", color: "white", lineHeight: 1, marginTop: "-6px" }}>
              {pct}<span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>%</span>
            </div>
            <div style={{ fontSize: "8.5px", color: "rgba(255,255,255,0.45)", letterSpacing: "0.5px", marginTop: "4px" }}>
              CONFORMITÉ<br />GLOBALE
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginLeft: "8px", padding: "28px 52px", flex: 1, display: "flex", flexDirection: "column", gap: "22px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[
            { label: "Établissement",               value: ifsiName },
            { label: "N° NDA",                      value: ifsiData?.nda || "—" },
            { label: "N° Certification Qualiopi",   value: ifsiData?.certif || "—" },
            { label: "Date d'audit",                value: auditDate },
            { label: "Directeur·rice",              value: ifsiData?.directrice || "—" },
            { label: "Contact qualité",             value: ifsiData?.email || "—" },
          ].map(f => (
            <div key={f.label} style={{ background: "white", border: "1px solid #e2ddd8", borderRadius: "6px", padding: "9px 13px" }}>
              <div style={{ fontSize: "8px", fontWeight: "800", color: "#9a8f88", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "3px" }}>{f.label}</div>
              <div style={{ fontSize: "11.5px", fontWeight: "600", color: "#1a1410" }}>{f.value}</div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize: "8.5px", fontWeight: "800", color: "#9a8f88", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "9px" }}>
            Synthèse de conformité — {stats.total} indicateurs évalués
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px", marginBottom: "8px" }}>
            {[
              { v: stats.conforme,   l: "Conformes",     bg: "#d1fae5", c: "#065f46", bd: "#6ee7b7" },
              { v: stats.enCours,    l: "En cours",      bg: "#fef3c7", c: "#92400e", bd: "#fcd34d" },
              { v: stats.nc,         l: "Non conformes", bg: "#fee2e2", c: "#991b1b", bd: "#fca5a5" },
              { v: stats.ncMajeur,   l: "NC majeures",   bg: "#fff1f2", c: "#881337", bd: "#fda4af" },
            ].map(s => (
              <div key={s.l} style={{ background: s.bg, border: `1px solid ${s.bd}`, borderRadius: "7px", padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "28px", color: s.c, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: "8.5px", fontWeight: "700", color: s.c, marginTop: "3px", opacity: 0.85 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ height: "5px", background: "#e2ddd8", borderRadius: "3px", overflow: "hidden", display: "flex" }}>
            <div style={{ width: `${(stats.conforme / stats.total) * 100}%`, background: "#10b981", transition: "width 0.6s" }} />
            <div style={{ width: `${(stats.enCours  / stats.total) * 100}%`, background: "#f59e0b", transition: "width 0.6s" }} />
            <div style={{ width: `${(stats.nc       / stats.total) * 100}%`, background: "#ef4444", transition: "width 0.6s" }} />
          </div>
        </div>

        {mode === "audit" && (
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderLeft: "3px solid #f97316", borderRadius: "6px", padding: "11px 14px" }}>
            <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>
              ⚠ Document à usage exclusif de l'équipe qualité
            </div>
            <div style={{ fontSize: "10.5px", color: "#7c2d12", lineHeight: "1.5" }}>
              Ce document contient des notes internes, des indicateurs de progression et des commentaires confidentiels. Il ne doit pas être remis à l'évaluateur externe en l'état.
            </div>
          </div>
        )}
      </div>

      <div style={{ marginLeft: "8px", padding: "0 52px 18px" }}>
        <DocFooter pageNum="1" mode={mode} certif={ifsiData?.certif} />
      </div>
    </div>
  );
}

// ── PAGE 2 : SOMMAIRE ────────────────────────────────────────────────────────
function PageSommaire({ criteres, ifsiName, ifsiData, auditDate, mode, stats, onNavigate }) {
  const critList = [1, 2, 3, 4, 5, 6, 7];
  const ncTotal = criteres.filter(c => c.statut === "non-conforme");

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "30px 48px", background: "#f8f7f4", fontFamily: "'Albert Sans',sans-serif", position: "relative", boxSizing: "border-box" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "8px", background: "linear-gradient(180deg,#1e3a6e,#d4a030)" }} />
      <div style={{ marginLeft: "8px", flex: 1, display: "flex", flexDirection: "column" }}>
        <DocHeader ifsiName={ifsiName} certif={ifsiData?.certif} auditDate={auditDate} />

        <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "24px", color: "#1a1410", marginBottom: "18px" }}>Sommaire</div>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "16px" }}>
          
          <div
            onClick={() => onNavigate("organigramme")}
            style={{ display: "flex", alignItems: "center", gap: "12px", padding: "9px 13px", background: "white", border: "1px solid #e2ddd8", borderLeft: `4px solid #1e3a6e`, borderRadius: "0 6px 6px 0", cursor: "pointer" }}
          >
             <div style={{ width: "28px", height: "28px", borderRadius: "5px", background: "#f1f5f9", border: `1px solid #cbd5e1`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
               <span style={{ fontSize: "14px" }}>🏢</span>
             </div>
             <div style={{ flex: 1 }}>
               <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#1a1410" }}>Organigramme Fonctionnel</div>
               <div style={{ fontSize: "9px", color: "#9a8f88", marginTop: "1px" }}>Structure de l'établissement</div>
             </div>
             <span style={{ fontSize: "9px", color: "#c8c0b8", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>p.3</span>
          </div>

          {critList.map((cNum, idx) => {
            const meta    = CRIT_PALETTE[cNum];
            const titre   = CRIT_TITRES[cNum];
            const inds    = criteres.filter(c => c.critere === cNum && c.statut !== "non-concerne");
            const conf    = inds.filter(c => c.statut === "conforme").length;
            const nc      = inds.filter(c => c.statut === "non-conforme").length;
            const pctC    = inds.length > 0 ? Math.round((conf / inds.length) * 100) : 0;
            const pctColor = pctC === 100 ? "#065f46" : pctC >= 50 ? "#92400e" : "#991b1b";
            const pctBg    = pctC === 100 ? "#10b981" : pctC >= 50 ? "#f59e0b" : "#ef4444";

            return (
              <div
                key={cNum}
                onClick={() => onNavigate(`crit-${cNum}`)}
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "9px 13px", background: "white", border: "1px solid #e2ddd8", borderLeft: `4px solid ${meta.c}`, borderRadius: "0 6px 6px 0", cursor: "pointer" }}
              >
                <div style={{ width: "28px", height: "28px", borderRadius: "5px", background: meta.light, border: `1px solid ${meta.c}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", fontWeight: "800", color: meta.c }}>C{cNum}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#1a1410" }}>{titre}</div>
                  <div style={{ fontSize: "9px", color: "#9a8f88", marginTop: "1px" }}>{inds.length} indicateurs évalués</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "56px", height: "4px", background: "#f0ece8", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: `${pctC}%`, height: "100%", background: pctBg }} />
                  </div>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "8.5px", fontWeight: "700", color: pctColor, width: "26px", textAlign: "right" }}>{pctC}%</span>
                </div>
                {nc > 0 && (
                  <span style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: "7.5px", fontWeight: "800", padding: "2px 6px", borderRadius: "4px", flexShrink: 0 }}>
                    ⚠ {nc} NC
                  </span>
                )}
                <span style={{ fontSize: "9px", color: "#c8c0b8", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>p.{idx + 4}</span>
              </div>
            );
          })}
        </div>

        {mode === "audit" && ncTotal.length > 0 && (
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "6px", padding: "11px 14px" }}>
            <div style={{ fontSize: "8.5px", fontWeight: "800", color: "#c2410c", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              ⚠ Points de vigilance — {ncTotal.length} non-conformité(s) identifiée(s)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {ncTotal.map(ind => {
                const meta = CRIT_PALETTE[ind.critere];
                const num  = indNum(ind.num);
                return (
                  <div key={ind.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "9.5px", color: "#7c2d12" }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: "800", color: meta?.c || "#991b1b", width: "32px", flexShrink: 0 }}>C{ind.critere}.{num}</span>
                    <span style={{ flex: 1 }}>{ind.titre}</span>
                    {ind.ncType === "majeure" && (
                      <span style={{ background: "#fee2e2", color: "#881337", fontSize: "7px", fontWeight: "800", padding: "1px 5px", borderRadius: "3px", textTransform: "uppercase", flexShrink: 0 }}>MAJEURE</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: "auto" }}>
          <DocFooter pageNum="2" mode={mode} certif={ifsiData?.certif} />
        </div>
      </div>
    </div>
  );
}

// ── PAGE 3 : ORGANIGRAMME ────────────────────────────────────────────────────
function PageOrganigramme({ ifsiName, ifsiData, auditDate, allIfsiMembers, getRoleColor, pageNum, mode }) {
  const members = (allIfsiMembers || []).filter(m => !m.archived && m.status === "ACTIF");
  
  const level1 = members.filter(m => m.orgLevel === 1);
  const level2 = members.filter(m => m.orgLevel === 2);
  const level3 = members.filter(m => m.orgLevel === 3);

  const groupMembersByJob = (membersArray) => {
    const groups = {};
    membersArray.forEach(m => {
      const job = m.jobTitles?.[0] || "Sans fonction";
      if (!groups[job]) groups[job] = [];
      groups[job].push(m);
    });
    return groups;
  };

  const PrintCard = ({ m }) => {
    const rc = getRoleColor ? getRoleColor(m.roles?.[0]) : { bg: "#f3f4f6", bd: "#d1d5db", text: "#374151" };
    const initials = `${(m.prenom || "?")[0]}${(m.nom || "?")[0]}`.toUpperCase();

    return (
      <div style={{ 
        width: "110px", background: "white", border: `1px solid ${rc.bd}`, borderTop: `3px solid ${rc.text}`, 
        borderRadius: "6px", padding: "10px 8px", display: "flex", flexDirection: "column", 
        alignItems: "center", gap: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" 
      }}>
        <div style={{ width: "26px", height: "26px", borderRadius: "4px", background: rc.bg, color: rc.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "800" }}>
          {initials}
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#1a1410", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
            {m.prenom}
          </div>
          <div style={{ fontSize: "9px", fontWeight: "800", color: "#9a8f88", textAlign: "center", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%", marginTop: "2px" }}>
            {m.nom}
          </div>
        </div>
      </div>
    );
  };

  const PrintGroup = ({ jobTitle, members }) => {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
        <div style={{ 
          fontSize: "8.5px", fontWeight: "800", color: "#9a8f88", textTransform: "uppercase", 
          letterSpacing: "0.5px", background: "white", padding: "4px 10px", borderRadius: "4px", 
          border: "1px solid #e2ddd8" 
        }}>
          {jobTitle}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
          {members.map(m => <PrintCard key={m.id} m={m} />)}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "30px 48px", background: "#f8f7f4", fontFamily: "'Albert Sans',sans-serif", position: "relative", boxSizing: "border-box" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "8px", background: "linear-gradient(180deg,#1e3a6e,#d4a030)" }} />
      
      <div style={{ marginLeft: "8px", flex: 1, display: "flex", flexDirection: "column" }}>
        <DocHeader ifsiName={ifsiName} certif={ifsiData?.certif} auditDate={auditDate} />
        
        <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "24px", color: "#1a1410", marginBottom: "30px" }}>
          Organigramme Fonctionnel
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "36px", alignItems: "center" }}>
          
          {level1.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", width: "100%" }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "#1e3a6e", textTransform: "uppercase", letterSpacing: "2px", borderBottom: "1px solid #e2ddd8", paddingBottom: "6px", width: "100%", textAlign: "center" }}>
                Niveau 1 — Direction
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
                {Object.entries(groupMembersByJob(level1)).map(([job, mbrs]) => <PrintGroup key={job} jobTitle={job} members={mbrs} />)}
              </div>
            </div>
          )}

          {level2.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", width: "100%" }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "#1e3a6e", textTransform: "uppercase", letterSpacing: "2px", borderBottom: "1px solid #e2ddd8", paddingBottom: "6px", width: "100%", textAlign: "center" }}>
                Niveau 2 — Encadrement & Responsables
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
                {Object.entries(groupMembersByJob(level2)).map(([job, mbrs]) => <PrintGroup key={job} jobTitle={job} members={mbrs} />)}
              </div>
            </div>
          )}

          {level3.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", width: "100%" }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "#1e3a6e", textTransform: "uppercase", letterSpacing: "2px", borderBottom: "1px solid #e2ddd8", paddingBottom: "6px", width: "100%", textAlign: "center" }}>
                Niveau 3 — Équipes Pédagogiques & Administratives
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
                {Object.entries(groupMembersByJob(level3)).map(([job, mbrs]) => <PrintGroup key={job} jobTitle={job} members={mbrs} />)}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: "auto" }}>
          <DocFooter pageNum={String(pageNum)} mode={mode} certif={ifsiData?.certif} />
        </div>
      </div>
    </div>
  );
}

// ── PAGE CRITÈRE ─────────────────────────────────────────────────────────────
function PageCritere({ critNum, criteres, ifsiName, ifsiData, auditDate, mode, showNotes, showNC, showProgress, pageNum }) {
  const meta   = CRIT_PALETTE[critNum];
  const titre  = CRIT_TITRES[critNum];
  const inds   = criteres.filter(c => c.critere === critNum && c.statut !== "non-concerne");
  const conf   = inds.filter(c => c.statut === "conforme").length;
  const pctC   = inds.length > 0 ? Math.round((conf / inds.length) * 100) : 0;
  const pctColor = pctC === 100 ? "#065f46" : pctC >= 50 ? "#92400e" : "#991b1b";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "26px 42px", background: "#f8f7f4", fontFamily: "'Albert Sans',sans-serif", position: "relative", boxSizing: "border-box", overflowY: "auto" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "8px", background: meta.c }} />

      <div style={{ marginLeft: "8px", flex: 1, display: "flex", flexDirection: "column" }}>
        <DocHeader ifsiName={ifsiName} certif={ifsiData?.certif} auditDate={auditDate} critPalette={{ c: meta.c, titre }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
              <div style={{ background: meta.light, border: `1px solid ${meta.c}40`, borderRadius: "5px", padding: "3px 10px" }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", fontWeight: "800", color: meta.c }}>C{critNum}</span>
              </div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "18px", color: "#1a1410", lineHeight: "1.2" }}>{titre}</div>
            </div>
            <div style={{ fontSize: "9.5px", color: "#9a8f88" }}>{inds.length} indicateurs évalués</div>
          </div>
          <div style={{ textAlign: "center", background: "white", border: `1px solid ${meta.c}30`, borderRadius: "8px", padding: "10px 14px", flexShrink: 0 }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "22px", color: pctColor, lineHeight: 1 }}>
              {pctC}<span style={{ fontSize: "11px", color: "#9a8f88" }}>%</span>
            </div>
            <div style={{ fontSize: "7.5px", color: "#9a8f88", marginTop: "2px" }}>conformité</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
          {inds.map(ind => {
            const sc         = STATUT_DOC[ind.statut] || STATUT_DOC["non-evalue"];
            const num        = indNum(ind.num);
            const docsList   = [
              ...(ind.fichiers?.map(f => f.name || f) || []),
              ...(ind.chemins_reseau?.map(cr => cr.nom || cr) || []),
            ];
            const hasProof   = !!ind.preuves || docsList.length > 0;
            const totalDocs  = docsList.length + (ind.preuves ? 1 : 0);
            const validDocs  = (ind.fichiers?.filter(f => f.validated)?.length || 0) +
                               (ind.chemins_reseau?.filter(cr => cr.validated)?.length || 0) +
                               (ind.preuves ? 1 : 0);
            const pctProof   = totalDocs > 0 ? Math.round((validDocs / totalDocs) * 100) : 0;
            const pctProofColor = pctProof === 100 ? "#065f46" : pctProof >= 50 ? "#92400e" : "#991b1b";
            const pctProofBg    = pctProof === 100 ? "#10b981" : pctProof >= 50 ? "#f59e0b" : "#ef4444";

            return (
              <div key={ind.id} style={{ background: "white", border: "1px solid #e2ddd8", borderLeft: `3px solid ${sc.dot}`, borderRadius: "0 7px 7px 0", padding: "11px 13px" }}>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "7px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "9px", flex: 1 }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "8.5px", fontWeight: "800", color: meta.c, background: meta.light, padding: "2px 6px", borderRadius: "4px", flexShrink: 0, marginTop: "1px" }}>
                      C{critNum}.{num}
                    </span>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "#1a1410", lineHeight: "1.35" }}>{ind.titre}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginLeft: "10px" }}>
                    {mode === "audit" && showNC && ind.ncType && (
                      <span style={{ background: "#fff1f2", border: "1px solid #fda4af", color: "#881337", fontSize: "7px", fontWeight: "800", padding: "2px 6px", borderRadius: "3px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                        NC {ind.ncType}
                      </span>
                    )}
                    <span style={{ background: sc.bg, border: `1px solid ${sc.bd}`, color: sc.c, fontSize: "8.5px", fontWeight: "700", padding: "2px 8px", borderRadius: "4px" }}>
                      {sc.icon} {sc.label}
                    </span>
                  </div>
                </div>

                {ind.attendus && (
                  <div style={{ marginBottom: "6px" }}>
                    <div style={{ fontSize: "7.5px", fontWeight: "800", color: "#9a8f88", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "2px" }}>Attendus</div>
                    <div style={{ fontSize: "9.5px", color: "#4a3f38", lineHeight: "1.5", fontStyle: "italic" }}>{ind.attendus}</div>
                  </div>
                )}

                <div style={{ marginBottom: "7px" }}>
                  <div style={{ fontSize: "7.5px", fontWeight: "800", color: "#9a8f88", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "2px" }}>
                    Justification / Éléments de preuve
                  </div>
                  {ind.preuves
                    ? <div style={{ fontSize: "10px", color: "#1a1410", lineHeight: "1.6" }}>{ind.preuves}</div>
                    : <div style={{ fontSize: "9.5px", color: "#9a8f88", fontStyle: "italic" }}>Aucune justification renseignée.</div>
                  }
                </div>

                {docsList.length > 0 ? (
                  <div style={{ marginBottom: mode === "audit" ? "7px" : 0 }}>
                    <div style={{ fontSize: "7.5px", fontWeight: "800", color: "#9a8f88", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>
                      Documents ({docsList.length})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {docsList.map((d, i) => (
                        <span key={i} style={{ background: "#f0ece8", border: "1px solid #d8d0c8", color: "#4a3f38", fontSize: "8.5px", fontWeight: "500", padding: "2px 8px", borderRadius: "20px" }}>
                          📎 {d}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : !hasProof ? (
                  <div style={{ fontSize: "8.5px", color: "#ef4444", fontStyle: "italic" }}>⚠ Aucun document justificatif.</div>
                ) : null}

                {mode === "audit" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: docsList.length > 0 ? "6px" : "3px" }}>
                    {showProgress && totalDocs > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", background: "#f8f7f4", border: "1px solid #e2ddd8", borderRadius: "4px" }}>
                        <span style={{ fontSize: "7.5px", fontWeight: "700", color: "#9a8f88", width: "80px", flexShrink: 0 }}>Progression preuves</span>
                        <div style={{ flex: 1, height: "3px", background: "#e2ddd8", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${pctProof}%`, height: "100%", background: pctProofBg, transition: "width 0.4s" }} />
                        </div>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "7.5px", fontWeight: "700", color: pctProofColor, width: "24px", textAlign: "right" }}>{pctProof}%</span>
                      </div>
                    )}
                    {showNotes && ind.notes && (
                      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderLeft: "2px solid #f59e0b", borderRadius: "0 4px 4px 0", padding: "5px 9px" }}>
                        <div style={{ fontSize: "7px", fontWeight: "800", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "2px" }}>Note interne</div>
                        <div style={{ fontSize: "9px", color: "#78350f", lineHeight: "1.45", fontStyle: "italic" }}>{ind.notes}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "auto", paddingTop: "14px" }}>
          <DocFooter pageNum={String(pageNum)} mode={mode} certif={ifsiData?.certif} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function LivreBlancTab({ currentIfsiName, criteres, ifsiData, currentAuditDate, allIfsiMembers, getRoleColor, t }) {

  const [mode,         setMode]         = useState("presentation");
  const [activePage,   setActivePage]   = useState("cover");
  const [zoom,         setZoom]         = useState(0.72);
  const [showNotes,    setShowNotes]    = useState(false);
  const [showNC,       setShowNC]       = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const printRef = useRef();

  const auditDate = useMemo(() => dateFR(currentAuditDate), [currentAuditDate]);

  const stats = useMemo(() => {
    const actives = criteres.filter(c => c.statut !== "non-concerne");
    return {
      total:    actives.length || 1,
      conforme: actives.filter(c => c.statut === "conforme").length,
      enCours:  actives.filter(c => c.statut === "en-cours").length,
      nc:       actives.filter(c => c.statut === "non-conforme").length,
      ncMajeur: actives.filter(c => c.ncType === "majeure").length,
    };
  }, [criteres]);

  const critList  = [1, 2, 3, 4, 5, 6, 7];
  
  const pages     = ["cover", "sommaire", "organigramme", ...critList.map(c => `crit-${c}`)];
  const activeCrit = activePage.startsWith("crit-") ? parseInt(activePage.split("-")[1]) : null;

  const prevPage = () => {
    const idx = pages.indexOf(activePage);
    if (idx > 0) setActivePage(pages[idx - 1]);
  };
  const nextPage = () => {
    const idx = pages.indexOf(activePage);
    if (idx < pages.length - 1) setActivePage(pages[idx + 1]);
  };

  const handlePrint = () => window.print();

  const ZOOM_STEPS = [0.35, 0.5, 0.6, 0.72, 0.85, 1.0, 1.2, 1.5, 2.0];
  const zoomIn  = () => { const next = ZOOM_STEPS.find(z => z > zoom); if (next) setZoom(next); };
  const zoomOut = () => { const prev = [...ZOOM_STEPS].reverse().find(z => z < zoom); if (prev) setZoom(prev); };

  const navEntries = [
    { id: "cover",        label: "Couverture",   icon: "📄", color: "#1e3a6e", badge: null },
    { id: "sommaire",     label: "Sommaire",     icon: "≡",  color: "#1e3a6e", badge: null },
    { id: "organigramme", label: "Organigramme", icon: "🏢", color: "#1e3a6e", badge: null },
    ...critList.map(cNum => {
      const meta  = CRIT_PALETTE[cNum];
      const inds  = criteres.filter(c => c.critere === cNum && c.statut !== "non-concerne");
      const conf  = inds.filter(c => c.statut === "conforme").length;
      const nc    = inds.filter(c => c.statut === "non-conforme").length;
      return {
        id:    `crit-${cNum}`,
        label: `C${cNum} · ${CRIT_TITRES[cNum]}`,
        icon:  `C${cNum}`,
        color: meta.c,
        light: meta.light,
        badge: nc > 0 ? nc : null,
        conf,
        total: inds.length,
      };
    }),
  ];

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", height: "calc(100vh - 60px)", overflow: "hidden", margin: "-32px", background: "inherit" }}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-zone, #print-zone * { visibility: visible !important; }
          #print-zone {
            position: fixed !important;
            top: 0; left: 0;
            width: 100%; height: 100%;
            transform: none !important;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      {/* ── PANNEAU NAV GAUCHE ───────────────────────────────────────────── */}
      <div style={{ width: "220px", background: t.surface, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>

        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${t.border}`, background: t.surface2, flexShrink: 0 }}>
          <div style={{ fontSize: "9px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "1px" }}>Pages du document</div>
          <div style={{ fontSize: "9px", color: t.text3, marginTop: "3px" }}>{pages.length} pages · {stats.total} indicateurs</div>
        </div>

        <div style={{ padding: "8px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {navEntries.map((entry, idx) => {
            const isActive = activePage === entry.id;
            const isCrit   = entry.id.startsWith("crit-");
            return (
              <div
                key={entry.id}
                onClick={() => setActivePage(entry.id)}
                style={{
                  padding: "7px 10px", borderRadius: "7px", cursor: "pointer",
                  background: isActive ? t.accentBg : "transparent",
                  border: `1px solid ${isActive ? t.accentBd : "transparent"}`,
                  borderLeft: isCrit ? `3px solid ${entry.color}` : isActive ? `3px solid ${t.accent}` : "3px solid transparent",
                  transition: "all 0.12s",
                }}
                onMouseOver={e => { if (!isActive) e.currentTarget.style.background = t.surface2; }}
                onMouseOut={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isCrit ? "3px" : 0 }}>
                  <span style={{ fontSize: isCrit ? "9px" : "11px", fontWeight: isActive ? "700" : "500", color: isActive ? t.accent : (isCrit ? entry.color : t.text2), lineHeight: 1.3 }}>
                    {isCrit ? entry.label : entry.label}
                  </span>
                  {entry.badge > 0 && (
                    <span style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: "7.5px", fontWeight: "800", padding: "1px 5px", borderRadius: "20px", flexShrink: 0 }}>
                      {entry.badge} NC
                    </span>
                  )}
                </div>
                {isCrit && entry.total > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <div style={{ flex: 1, height: "2px", background: t.border, borderRadius: "1px", overflow: "hidden" }}>
                      <div style={{ width: `${(entry.conf / entry.total) * 100}%`, height: "100%", background: entry.color }} />
                    </div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "7.5px", color: t.text3 }}>
                      {entry.conf}/{entry.total}
                    </span>
                  </div>
                )}
                {!isCrit && (
                  <div style={{ fontSize: "9px", color: t.text3 }}>p.{idx + 1}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ZONE PRINCIPALE ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ height: "48px", background: t.surface, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", padding: "0 18px", gap: "12px", flexShrink: 0, boxShadow: t.shadowSm }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button onClick={zoomOut} disabled={zoom <= ZOOM_STEPS[0]}
              style={{ width: "24px", height: "24px", borderRadius: "5px", border: `1px solid ${t.border}`, background: t.surface2, color: t.text2, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", opacity: zoom <= ZOOM_STEPS[0] ? 0.4 : 1 }}>−</button>
            <button onClick={() => setZoom(0.72)}
              style={{ padding: "3px 9px", borderRadius: "5px", border: `1px solid ${t.border}`, background: t.surface2, color: t.text2, fontSize: "10px", fontFamily: "'DM Mono',monospace", fontWeight: "700", cursor: "pointer", minWidth: "50px", textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={zoomIn} disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
              style={{ width: "24px", height: "24px", borderRadius: "5px", border: `1px solid ${t.border}`, background: t.surface2, color: t.text2, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", opacity: zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1] ? 0.4 : 1 }}>+</button>
          </div>

          <div style={{ width: "1px", height: "22px", background: t.border }} />

          <div style={{ display: "flex", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: "7px", padding: "2px", gap: "2px" }}>
            {[
              { id: "presentation", label: "📋 Présentation" },
              { id: "audit",        label: "🔍 Audit" },
            ].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                style={{ padding: "4px 12px", borderRadius: "5px", border: "none", background: mode === m.id ? (m.id === "audit" ? t.amberBg : t.accentBg) : "transparent", color: mode === m.id ? (m.id === "audit" ? t.amber : t.accent) : t.text2, fontSize: "10px", fontWeight: mode === m.id ? "800" : "500", cursor: "pointer", transition: "all 0.12s", whiteSpace: "nowrap" }}>
                {m.label}
              </button>
            ))}
          </div>

          {mode === "audit" && (
            <>
              <div style={{ width: "1px", height: "22px", background: t.border }} />
              {[
                { label: "Notes",      val: showNotes,    set: setShowNotes,    k: "amber"  },
                { label: "Badges NC",  val: showNC,       set: setShowNC,       k: "red"    },
                { label: "Progression",val: showProgress, set: setShowProgress, k: "accent" },
              ].map(({ label, val, set, k }) => {
                const color = t[k];
                const colorBg = t[k + "Bg"];
                const colorBd = t[k + "Bd"];
                return (
                  <button key={label} onClick={() => set(v => !v)}
                    style={{ padding: "4px 10px", borderRadius: "6px", border: `1px solid ${val ? colorBd : t.border}`, background: val ? colorBg : "transparent", color: val ? color : t.text3, fontSize: "10px", fontWeight: "700", cursor: "pointer", transition: "all 0.12s" }}>
                    {label}
                  </button>
                );
              })}
            </>
          )}

          <div style={{ flex: 1 }} />

          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: t.text3 }}>
            {pages.indexOf(activePage) + 1} / {pages.length}
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            <button onClick={prevPage} disabled={pages.indexOf(activePage) === 0}
              style={{ padding: "4px 10px", borderRadius: "6px", border: `1px solid ${t.border}`, background: t.surface2, color: t.text2, fontSize: "11px", fontWeight: "700", cursor: "pointer", opacity: pages.indexOf(activePage) === 0 ? 0.4 : 1 }}>←</button>
            <button onClick={nextPage} disabled={pages.indexOf(activePage) === pages.length - 1}
              style={{ padding: "4px 10px", borderRadius: "6px", border: `1px solid ${t.border}`, background: t.surface2, color: t.text2, fontSize: "11px", fontWeight: "700", cursor: "pointer", opacity: pages.indexOf(activePage) === pages.length - 1 ? 0.4 : 1 }}>→</button>
          </div>

          <div style={{ width: "1px", height: "22px", background: t.border }} />

          <button onClick={handlePrint}
            style={{ padding: "5px 14px", background: t.accentBg, border: `1px solid ${t.accentBd}`, borderRadius: "7px", color: t.accent, fontSize: "11px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap" }}>
            🖨 Imprimer / PDF
          </button>
        </div>

        <div style={{ padding: "7px 18px", background: mode === "audit" ? t.amberBg : t.accentBg, borderBottom: `1px solid ${mode === "audit" ? t.amberBd : t.accentBd}`, display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <span style={{ fontSize: "13px" }}>{mode === "audit" ? "🔍" : "📋"}</span>
          <div>
            <span style={{ fontSize: "10.5px", fontWeight: "800", color: mode === "audit" ? t.amber : t.accent }}>
              {mode === "audit" ? "Mode Audit — " : "Mode Présentation — "}
            </span>
            <span style={{ fontSize: "10.5px", color: t.text2 }}>
              {mode === "audit"
                ? "Notes internes, NC et progression affichées. Document confidentiel."
                : "Vue épurée — destinée à être remise à l'évaluateur lors de l'audit."}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", background: t.surface === "#ffffff" ? "#c8d0de" : "#07101e", display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 20px", gap: "18px" }}>

          <div
            id="print-zone"
            ref={printRef}
            style={{
              width:  `${A4_W * zoom}px`,
              height: `${A4_H * zoom}px`,
              background: "white",
              boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
              borderRadius: "2px",
              overflow: "hidden",
              flexShrink: 0,
              position: "relative",
            }}
          >
            <div style={{ width: `${A4_W}px`, height: `${A4_H}px`, transformOrigin: "top left", transform: `scale(${zoom})` }}>
              {activePage === "cover" && (
                <PageCover
                  ifsiData={ifsiData}
                  ifsiName={currentIfsiName}
                  auditDate={auditDate}
                  stats={stats}
                  mode={mode}
                />
              )}
              {activePage === "sommaire" && (
                <PageSommaire
                  criteres={criteres}
                  ifsiName={currentIfsiName}
                  ifsiData={ifsiData}
                  auditDate={auditDate}
                  mode={mode}
                  stats={stats}
                  onNavigate={setActivePage}
                />
              )}
              {activePage === "organigramme" && (
                <PageOrganigramme
                  ifsiName={currentIfsiName}
                  ifsiData={ifsiData}
                  auditDate={auditDate}
                  allIfsiMembers={allIfsiMembers || []}
                  getRoleColor={getRoleColor}
                  pageNum={3}
                  mode={mode}
                />
              )}
              {activeCrit && (
                <PageCritere
                  critNum={activeCrit}
                  criteres={criteres}
                  ifsiName={currentIfsiName}
                  ifsiData={ifsiData}
                  auditDate={auditDate}
                  mode={mode}
                  showNotes={showNotes}
                  showNC={showNC}
                  showProgress={showProgress}
                  pageNum={activeCrit + 3} 
                />
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button onClick={prevPage} disabled={pages.indexOf(activePage) === 0}
              style={{ padding: "7px 16px", borderRadius: "7px", background: t.surface, border: `1px solid ${t.border}`, color: t.text2, fontSize: "11px", fontWeight: "700", cursor: "pointer", opacity: pages.indexOf(activePage) === 0 ? 0.4 : 1 }}>
              ← Précédente
            </button>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: t.text3 }}>
              {pages.indexOf(activePage) + 1} / {pages.length}
            </span>
            <button onClick={nextPage} disabled={pages.indexOf(activePage) === pages.length - 1}
              style={{ padding: "7px 16px", borderRadius: "7px", background: t.surface, border: `1px solid ${t.border}`, color: t.text2, fontSize: "11px", fontWeight: "700", cursor: "pointer", opacity: pages.indexOf(activePage) === pages.length - 1 ? 0.4 : 1 }}>
              Suivante →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
