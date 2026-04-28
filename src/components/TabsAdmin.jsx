// ─────────────────────────────────────────────────────────────────────────────
//  TabsAdmin.jsx  —  Administration + Compte utilisateur
//  QualiForma · Production
// ─────────────────────────────────────────────────────────────────────────────
//
//  CHANGEMENTS DANS App.jsx (5 lignes) :
//  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  1. Ajouter le handler (après handleSendResetEmail ~ligne 193) :
//
//     const handleSaveEtab = async (fields) => {
//       await setDoc(doc(db, "etablissements", selectedIfsi), fields, { merge: true });
//     };
//
//  2. Modifier la ligne de rendu EquipeTab (~ligne 673) — ajouter 3 props :
//
//     {activeTab === "equipe" && <EquipeTab
//       ...props existants...
//       ifsiData={ifsiData}                          // ← NEW
//       handleSaveEtab={handleSaveEtab}              // ← NEW
//       isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}          // ← NEW
//       isColorblindMode={isColorblindMode} setIsColorblindMode={setIsColorblindMode} // déjà dans CompteTab, réutiliser
//     />}
//
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";

// Firebase — imports directs (pas de props, le composant gère ses propres appels)
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, setDoc, serverTimestamp, query, orderBy, limit
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { db, auth, storage } from "../firebase";

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const sc = (t, k) => ({ c: t[k], bg: t[k + "Bg"], bd: t[k + "Bd"] });

const ROLE_CFG = {
  admin:      { label: "Admin",    icon: "⚙", colorKey: "accent"  },
  user:       { label: "Éditeur",  icon: "✏", colorKey: "green"   },
  guest:      { label: "Lecteur",  icon: "👁", colorKey: "purple"  },
  superadmin: { label: "Super",    icon: "◈", colorKey: "gold"    },
};

const STATUS_CFG = {
  ACTIF:   { label: "Actif",   colorKey: "green"  },
  INACTIF: { label: "Inactif", colorKey: "amber"  },
  INVITE:  { label: "Invité",  colorKey: "purple" },
};

const LOG_CFG = {
  auth:    { icon: "🔐", colorKey: "accent"  },
  data:    { icon: "✏️", colorKey: "green"   },
  admin:   { icon: "⚙️", colorKey: "gold"    },
  export:  { icon: "📤", colorKey: "purple"  },
  alert:   { icon: "⚠️", colorKey: "red"     },
  upload:  { icon: "📎", colorKey: "teal"    },
};

const DOC_CATS = ["Qualité", "Communication", "Pédagogie", "RH", "Partenariats", "Autre"];
const CAT_COLORS = {
  "Qualité":       { c: "#4f80f0", bg: "rgba(79,128,240,0.1)"  },
  "Communication": { c: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  "Pédagogie":     { c: "#2dd4bf", bg: "rgba(45,212,191,0.1)"  },
  "RH":            { c: "#f0a030", bg: "rgba(240,160,48,0.1)"  },
  "Partenariats":  { c: "#f07070", bg: "rgba(240,112,112,0.1)" },
  "Autre":         { c: "#a0a0b0", bg: "rgba(160,160,176,0.1)" },
};

// Calcule le temps écoulé en français depuis une date ISO
function timeAgo(isoString) {
  if (!isoString) return "—";
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60)    return "À l'instant";
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return new Date(isoString).toLocaleDateString("fr-FR");
}

// Écrit un log dans la sous-collection logs de l'établissement
async function writeLog(ifsiId, action, detail, type = "admin") {
  if (!ifsiId || !auth.currentUser) return;
  try {
    await addDoc(collection(db, "etablissements", ifsiId, "logs"), {
      action, detail, type,
      user: auth.currentUser.email,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    // Log silencieux — ne pas bloquer l'UX
    console.warn("writeLog:", e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANTS PARTAGÉS (internes)
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({ val, onChange, colorKey = "accent", t }) {
  const { c, bd } = sc(t, colorKey);
  return (
    <div
      onClick={onChange}
      role="switch" aria-checked={val}
      style={{
        width: "36px", height: "20px", borderRadius: "10px", flexShrink: 0,
        background: val ? c : t.surface3,
        border: `1px solid ${val ? bd : t.border}`,
        cursor: "pointer", position: "relative", transition: "all 0.2s",
      }}
    >
      <div style={{
        position: "absolute", top: "2px", left: val ? "17px" : "2px",
        width: "16px", height: "16px", borderRadius: "50%", background: "white",
        transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      }} />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", hint = "", readOnly = false, t }) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <label style={{ fontSize: "9px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: "5px" }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        readOnly={readOnly}
        style={{
          width: "100%", padding: "9px 12px", fontFamily: "inherit",
          background: readOnly ? t.surface2 : t.surface,
          border: `1px solid ${focus ? t.accent : t.border}`,
          borderRadius: "8px", fontSize: "12px", color: t.text, outline: "none",
          transition: "border-color 0.15s", colorScheme: "inherit",
        }}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
      />
      {hint && <div style={{ fontSize: "9px", color: t.text3, marginTop: "3px" }}>{hint}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  EquipeTab  —  5 onglets
// ─────────────────────────────────────────────────────────────────────────────

export function EquipeTab({
  // Props existants (inchangés depuis App.jsx)
  userProfile, newMember, setNewMember, isCreatingUser, handleCreateUser,
  selectedIfsi, ifsiList, teamSearchTerm, setTeamSearchTerm,
  sortedTeamUsers, handleDeleteUser, handleSendResetEmail, t,
  // Nouveaux props (à ajouter dans App.jsx — voir header)
  ifsiData, handleSaveEtab,
  isDarkMode, setIsDarkMode, isColorblindMode, setIsColorblindMode,
}) {

  const [tab, setTab]                 = useState("membres");
  const [roleFilter, setRoleFilter]   = useState("tous");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [showInvite, setShowInvite]   = useState(false);
  const [confirmDel, setConfirmDel]   = useState(null); // user object à supprimer
  const [deleting, setDeleting]       = useState(false);

  // ── Établissement ──────────────────────────────────
  const [etabForm, setEtabForm]   = useState(null); // initialisé quand ifsiData arrive
  const [etabDirty, setEtabDirty] = useState(false);
  const [etabSaving, setEtabSaving] = useState(false);
  const [etabSaved, setEtabSaved]  = useState(false);

  useEffect(() => {
    if (ifsiData && !etabForm) {
      setEtabForm({
        nom:        ifsiData.name        || "",
        nda:        ifsiData.nda         || "",
        certif:     ifsiData.certif      || "",
        adresse:    ifsiData.adresse     || "",
        tel:        ifsiData.tel         || "",
        email:      ifsiData.email       || "",
        directrice: ifsiData.directrice  || "",
        dateAudit:  ifsiData.dateAudit   || "",
      });
    }
  }, [ifsiData]);

  const updateEtabField = (key, val) => {
    setEtabForm(f => ({ ...f, [key]: val }));
    setEtabDirty(true);
    setEtabSaved(false);
  };

  const saveEtab = async () => {
    if (!handleSaveEtab || !etabForm) return;
    setEtabSaving(true);
    await handleSaveEtab({
      name:        etabForm.nom,
      nda:         etabForm.nda,
      certif:      etabForm.certif,
      adresse:     etabForm.adresse,
      tel:         etabForm.tel,
      email:       etabForm.email,
      directrice:  etabForm.directrice,
      dateAudit:   etabForm.dateAudit,
    });
    await writeLog(selectedIfsi, "Paramètres établissement modifiés", "Identité mise à jour");
    setEtabSaving(false);
    setEtabDirty(false);
    setEtabSaved(true);
    setTimeout(() => setEtabSaved(false), 3000);
  };

  // ── Médiathèque ────────────────────────────────────
  // Les documents sont stockés dans etablissements/{selectedIfsi}.documents
  // (tableau de métadonnées ; les fichiers sont dans Storage)
  const documents = useMemo(() => ifsiData?.documents || [], [ifsiData]);
  const [docCatFilter, setDocCatFilter] = useState("tous");
  const [docSearch, setDocSearch]       = useState("");
  const [uploadProgress, setUploadProgress] = useState(null); // 0-100 | null
  const [uploadCat, setUploadCat]       = useState("Qualité");
  const fileInputRef                    = useRef();

  const filteredDocs = useMemo(() =>
    documents.filter(d => {
      if (docCatFilter !== "tous" && d.cat !== docCatFilter) return false;
      if (docSearch && !d.name.toLowerCase().includes(docSearch.toLowerCase())) return false;
      return true;
    }),
    [documents, docCatFilter, docSearch]
  );

  const handleFileUpload = async (file) => {
    if (!file || !selectedIfsi) return;
    const path = `ifsi/${selectedIfsi}/documents/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    task.on("state_changed",
      (snap) => setUploadProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      (err)  => { console.error(err); setUploadProgress(null); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        const newDoc = {
          id:          `d_${Date.now()}`,
          name:        file.name.replace(/\.[^/.]+$/, ""),
          cat:         uploadCat,
          size:        file.size > 1048576
                         ? `${(file.size / 1048576).toFixed(1)} Mo`
                         : `${Math.round(file.size / 1024)} Ko`,
          date:        new Date().toISOString().slice(0, 10),
          author:      auth.currentUser?.email || "—",
          tags:        [],
          validated:   false,
          storagePath: path,
          downloadURL: url,
        };
        const updated = [...documents, newDoc];
        await setDoc(doc(db, "etablissements", selectedIfsi), { documents: updated }, { merge: true });
        await writeLog(selectedIfsi, "Document déposé", file.name, "upload");
        setUploadProgress(null);
      }
    );
  };

  const handleDeleteDoc = async (docMeta) => {
    if (!window.confirm(`Supprimer "${docMeta.name}" ?`)) return;
    try {
      await deleteObject(ref(storage, docMeta.storagePath));
    } catch (_) { /* Le fichier est peut-être déjà supprimé */ }
    const updated = documents.filter(d => d.id !== docMeta.id);
    await setDoc(doc(db, "etablissements", selectedIfsi), { documents: updated }, { merge: true });
    await writeLog(selectedIfsi, "Document supprimé", docMeta.name, "admin");
  };

  const handleValidateDoc = async (docMeta) => {
    const updated = documents.map(d => d.id === docMeta.id ? { ...d, validated: true } : d);
    await setDoc(doc(db, "etablissements", selectedIfsi), { documents: updated }, { merge: true });
    await writeLog(selectedIfsi, "Document validé", docMeta.name, "admin");
  };

  // ── Journal ────────────────────────────────────────
  // Sous-collection : etablissements/{selectedIfsi}/logs
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!selectedIfsi) return;
    const q = query(
      collection(db, "etablissements", selectedIfsi, "logs"),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [selectedIfsi]);

  // ── Paramètres / Notifications ─────────────────────
  // Stockés dans etablissements/{selectedIfsi}.notifPrefs
  const [notifPrefs, setNotifPrefs] = useState({
    connexion:    true,
    modification: true,
    export:       false,
    alerte:       true,
  });

  useEffect(() => {
    if (ifsiData?.notifPrefs) setNotifPrefs(ifsiData.notifPrefs);
  }, [ifsiData?.notifPrefs]);

  const toggleNotif = async (key) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    await setDoc(doc(db, "etablissements", selectedIfsi), { notifPrefs: updated }, { merge: true });
  };

  // ── KPIs membres ───────────────────────────────────
  const displayUsers = sortedTeamUsers.filter(u => u.role !== "superadmin");
  const stats = {
    total:   displayUsers.length,
    actifs:  displayUsers.filter(u => u.status === "ACTIF").length,
    admins:  displayUsers.filter(u => u.role === "admin").length,
    invites: displayUsers.filter(u => u.status === "INVITE").length,
  };

  const filteredUsers = displayUsers.filter(u => {
    if (roleFilter   !== "tous" && u.role   !== roleFilter)   return false;
    if (statusFilter !== "tous" && u.status !== statusFilter) return false;
    if (teamSearchTerm) {
      const q = teamSearchTerm.toLowerCase();
      if (!`${u.email} ${u.prenom || ""} ${u.nom || ""}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ── Suppression confirmée ──────────────────────────
  const doDeleteUser = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    await handleDeleteUser(confirmDel.id);
    await writeLog(selectedIfsi, "Utilisateur supprimé", confirmDel.email, "admin");
    setDeleting(false);
    setConfirmDel(null);
  };

  // ── Tabs config ────────────────────────────────────
  const TABS = [
    { id: "membres",      label: "Membres",         icon: "👥", badge: stats.invites || null, bc: "purple"  },
    { id: "etablissement",label: "Établissement",   icon: "🏛",  badge: null                                },
    { id: "mediatheque",  label: "Médiathèque",     icon: "📁",  badge: documents.filter(d => !d.validated).length || null, bc: "amber" },
    { id: "journal",      label: "Journal d'accès", icon: "📋",  badge: null                                },
    { id: "parametres",   label: "Paramètres",      icon: "⚙",  badge: null                                },
  ];

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* ── MODALE CONFIRMATION SUPPRESSION ─────────────── */}
      {confirmDel && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: t.surface, border: `1px solid ${t.redBd}`, borderRadius: "14px",
            padding: "28px 30px", width: "380px", boxShadow: t.shadow,
          }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "22px", color: t.red, marginBottom: "8px" }}>
              Révoquer l'accès
            </div>
            <div style={{ fontSize: "12px", color: t.text2, lineHeight: "1.65", marginBottom: "22px" }}>
              Voulez-vous vraiment supprimer l'accès de&nbsp;
              <strong style={{ color: t.text }}>{confirmDel.email}</strong>&nbsp;?
              Cette action est irréversible.
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDel(null)}
                style={{ padding: "9px 18px", background: "transparent", border: `1px solid ${t.border}`, borderRadius: "7px", color: t.text2, fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
              >Annuler</button>
              <button
                onClick={doDeleteUser} disabled={deleting}
                style={{ padding: "9px 18px", background: t.red, border: "none", borderRadius: "7px", color: "white", fontSize: "12px", fontWeight: "700", cursor: "pointer", opacity: deleting ? 0.6 : 1 }}
              >{deleting ? "Suppression…" : "Supprimer"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "28px", color: t.text, margin: 0 }}>
            Gestion des accès
          </h2>
          <div style={{ fontSize: "12px", color: t.text2, marginTop: "3px" }}>
            {ifsiList.find(i => i.id === selectedIfsi)?.name || "Établissement"}
          </div>
        </div>
        {(userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
          <button
            onClick={() => { setShowInvite(v => !v); setTab("membres"); }}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "9px 16px",
              background: showInvite ? t.surface2 : t.accentBg,
              border: `1px solid ${showInvite ? t.border : t.accentBd}`,
              borderRadius: "9px", fontSize: "12px", fontWeight: "700",
              color: showInvite ? t.text2 : t.accent, cursor: "pointer",
            }}
          >
            {showInvite ? "✕ Fermer" : "+ Inviter un membre"}
          </button>
        )}
      </div>

      {/* ── BARRE D'ONGLETS ───────────────────────────── */}
      <div style={{
        display: "flex", background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: "12px", padding: "4px", gap: "2px", boxShadow: t.shadowSm,
      }}>
        {TABS.map(tb => {
          const active = tab === tb.id;
          const bSc    = tb.bc ? sc(t, tb.bc) : null;
          return (
            <button
              key={tb.id} onClick={() => setTab(tb.id)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "9px 8px", borderRadius: "9px", border: "none",
                background: active ? t.accentBg : "transparent",
                color: active ? t.accent : t.text2,
                fontSize: "12px", fontWeight: active ? "700" : "500",
                cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: "14px", opacity: active ? 1 : 0.6 }}>{tb.icon}</span>
              {tb.label}
              {tb.badge > 0 && bSc && (
                <span style={{
                  background: bSc.bg, border: `1px solid ${bSc.bd}`, color: bSc.c,
                  fontSize: "8px", fontWeight: "800", padding: "1px 5px", borderRadius: "20px",
                }}>{tb.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════
          ONGLET 1 — MEMBRES
      ══════════════════════════════════════════════════ */}
      {tab === "membres" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* KPI */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px" }}>
            {[
              { v: stats.total,   l: "Total",          k: "accent"  },
              { v: stats.actifs,  l: "Actifs",          k: "green"   },
              { v: stats.admins,  l: "Admins",          k: "gold"    },
              { v: stats.invites, l: "Invitations att.",k: "purple"  },
            ].map(({ v, l, k }) => {
              const { c, bg, bd } = sc(t, k);
              return (
                <div key={l} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "11px", padding: "14px 16px", boxShadow: t.shadowSm, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: "3px", height: "100%", background: c, borderRadius: "3px 0 0 3px" }} />
                  <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "30px", color: t.text, lineHeight: 1, marginBottom: "5px" }}>{v}</div>
                  <div style={{ fontSize: "10px", color: t.text3, fontWeight: "600" }}>{l}</div>
                </div>
              );
            })}
          </div>

          {/* Tableau */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>

            {/* Filtres */}
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${t.border}`, display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", background: t.surface2 }}>
              <input
                value={teamSearchTerm} onChange={e => setTeamSearchTerm(e.target.value)}
                placeholder="Nom, email…"
                style={{
                  width: "200px", padding: "6px 10px", background: t.surface,
                  border: `1px solid ${t.border}`, borderRadius: "7px",
                  fontSize: "12px", color: t.text, outline: "none", fontFamily: "inherit",
                }}
              />
              {/* Filtre rôle */}
              <div style={{ display: "flex", gap: "4px" }}>
                {["tous", "admin", "user"].map(r => {
                  const rSc = r !== "tous" ? sc(t, ROLE_CFG[r]?.colorKey || "green") : null;
                  return (
                    <button key={r} onClick={() => setRoleFilter(r)} style={{
                      padding: "5px 10px", borderRadius: "6px", cursor: "pointer",
                      border: `1px solid ${roleFilter === r ? (rSc?.bd || t.accentBd) : t.border}`,
                      background: roleFilter === r ? (rSc?.bg || t.accentBg) : "transparent",
                      color: roleFilter === r ? (rSc?.c || t.accent) : t.text2,
                      fontSize: "10px", fontWeight: "700", transition: "all 0.12s",
                    }}>
                      {r === "tous" ? "Tous" : ROLE_CFG[r]?.label}
                    </button>
                  );
                })}
              </div>
              {/* Filtre statut */}
              <div style={{ display: "flex", gap: "4px" }}>
                {["tous", "ACTIF", "INACTIF"].map(s => {
                  const sSc = s !== "tous" ? sc(t, STATUS_CFG[s]?.colorKey || "green") : null;
                  return (
                    <button key={s} onClick={() => setStatusFilter(s)} style={{
                      padding: "5px 10px", borderRadius: "6px", cursor: "pointer",
                      border: `1px solid ${statusFilter === s ? (sSc?.bd || t.border) : t.border}`,
                      background: statusFilter === s ? sSc?.bg : "transparent",
                      color: statusFilter === s ? sSc?.c : t.text2,
                      fontSize: "10px", fontWeight: "700", transition: "all 0.12s",
                    }}>
                      {s === "tous" ? "Tous statuts" : STATUS_CFG[s]?.label}
                    </button>
                  );
                })}
              </div>
              <span style={{ marginLeft: "auto", fontSize: "10px", color: t.text3 }}>
                <strong style={{ color: t.text2 }}>{filteredUsers.length}</strong> membres
              </span>
            </div>

            {/* En-tête colonnes */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 90px 140px 90px", padding: "8px 18px", background: t.surface2, borderBottom: `1px solid ${t.border}` }}>
              {["Membre", "Rôle", "Statut", "Dernière connexion", "Actions"].map(h => (
                <span key={h} style={{ fontSize: "9px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "0.7px" }}>{h}</span>
              ))}
            </div>

            {/* Lignes */}
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              {filteredUsers.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: t.text3, fontSize: "13px", fontStyle: "italic" }}>
                  Aucun utilisateur trouvé.
                </div>
              ) : filteredUsers.map(u => {
                const rCfg  = ROLE_CFG[u.role]   || ROLE_CFG.user;
                const sCfg  = STATUS_CFG[u.status] || STATUS_CFG.ACTIF;
                const rSc   = sc(t, rCfg.colorKey);
                const sSc   = sc(t, sCfg.colorKey);
                const init  = (u.email || "?").charAt(0).toUpperCase();
                const lastLogin = u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Jamais";

                return (
                  <div
                    key={u.id}
                    style={{ display: "grid", gridTemplateColumns: "2fr 100px 90px 140px 90px", padding: "11px 18px", borderBottom: `1px solid ${t.border2}`, alignItems: "center", transition: "background 0.1s" }}
                    onMouseOver={e => e.currentTarget.style.background = t.surface2}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Avatar + email */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${rSc.c}20`, border: `1px solid ${rSc.bd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", color: rSc.c, flexShrink: 0 }}>
                        {init}
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: t.text }}>{u.email}</div>
                        {u.etablissementId && u.etablissementId !== selectedIfsi && (
                          <div style={{ fontSize: "9px", color: t.text3 }}>
                            {ifsiList.find(i => i.id === u.etablissementId)?.name || u.etablissementId}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rôle */}
                    <span style={{ background: rSc.bg, border: `1px solid ${rSc.bd}`, color: rSc.c, fontSize: "9px", fontWeight: "800", padding: "2px 8px", borderRadius: "20px", width: "fit-content" }}>
                      {rCfg.icon} {rCfg.label}
                    </span>

                    {/* Statut */}
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: sSc.c, boxShadow: u.status === "ACTIF" ? `0 0 6px ${sSc.c}` : "none" }} />
                      <span style={{ fontSize: "10px", fontWeight: "600", color: sSc.c }}>{sCfg.label}</span>
                    </div>

                    {/* Dernière connexion */}
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: t.text3 }}>
                      {lastLogin}
                    </span>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "5px" }}>
                      <button
                        onClick={() => handleSendResetEmail(u.email)}
                        title="Réinitialiser le mot de passe"
                        style={{ width: "26px", height: "26px", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: "6px", cursor: "pointer", fontSize: "11px", color: t.text2, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = t.accentBd; e.currentTarget.style.color = t.accent; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.text2; }}
                      >🔑</button>
                      {userProfile?.role === "superadmin" && (
                        <button
                          onClick={() => setConfirmDel(u)}
                          title="Supprimer l'accès"
                          style={{ width: "26px", height: "26px", background: t.redBg, border: `1px solid ${t.redBd}`, borderRadius: "6px", cursor: "pointer", fontSize: "11px", color: t.red, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >✕</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formulaire invitation */}
          {showInvite && (userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
            <div style={{ background: t.surface, border: `1px solid ${t.accentBd}`, borderLeft: `3px solid ${t.accent}`, borderRadius: "12px", padding: "20px 22px", boxShadow: t.shadow }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "17px", color: t.text }}>Inviter un nouveau membre</div>
                  <div style={{ fontSize: "10px", color: t.text3, marginTop: "2px" }}>
                    {userProfile?.role === "superadmin"
                      ? "Un mot de passe temporaire est défini — l'utilisateur devra le changer à la première connexion."
                      : <>Le membre sera ajouté à <strong style={{ color: t.accent }}>{ifsiList.find(i => i.id === selectedIfsi)?.name || "votre établissement"}</strong>. Mot de passe temporaire à changer à la première connexion.</>
                    }
                  </div>
                </div>
                <button onClick={() => setShowInvite(false)} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: "6px", width: "26px", height: "26px", cursor: "pointer", color: t.text3, fontSize: "12px" }}>✕</button>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: userProfile?.role === "superadmin"
                  ? "1fr 1fr 140px 150px 160px"
                  : "1fr 1fr 140px 160px",
                gap: "10px", alignItems: "end",
              }}>
                <Field label="Email" value={newMember.email} type="email" onChange={e => setNewMember({ ...newMember, email: e.target.value })} placeholder="email@ifsi.fr" t={t} />
                <Field label="Mot de passe temporaire" value={newMember.pwd} type="password" onChange={e => setNewMember({ ...newMember, pwd: e.target.value })} placeholder="Min. 6 caractères" t={t} />
                <div>
                  <label style={{ fontSize: "9px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: "5px" }}>Rôle</label>
                  <select
                    value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                    style={{ width: "100%", padding: "9px 10px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "12px", color: t.text, outline: "none", cursor: "pointer" }}
                  >
                    <option value="user">Éditeur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                {/* Sélecteur IFSI visible uniquement pour le superadmin */}
                {userProfile?.role === "superadmin" && (
                  <div>
                    <label style={{ fontSize: "9px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: "5px" }}>Établissement</label>
                    <select
                      value={newMember.ifsi || selectedIfsi} onChange={e => setNewMember({ ...newMember, ifsi: e.target.value })}
                      style={{ width: "100%", padding: "9px 10px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "12px", color: t.text, outline: "none", cursor: "pointer" }}
                    >
                      {ifsiList.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                )}
                <button
                  onClick={handleCreateUser} disabled={isCreatingUser || !newMember.email || !newMember.pwd}
                  style={{
                    padding: "9px 14px", background: t.accent, border: "none", borderRadius: "8px",
                    color: "white", fontSize: "11px", fontWeight: "700",
                    cursor: isCreatingUser || !newMember.email || !newMember.pwd ? "not-allowed" : "pointer",
                    opacity: !newMember.email || !newMember.pwd ? 0.55 : 1,
                    boxShadow: `0 4px 12px ${t.accentBd}`, transition: "all 0.15s",
                  }}
                >
                  {isCreatingUser ? "Création…" : "Créer le compte"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ONGLET 2 — ÉTABLISSEMENT
      ══════════════════════════════════════════════════ */}
      {tab === "etablissement" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "14px", alignItems: "start" }}>

          {/* Formulaire identité */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
            <div style={{ padding: "13px 18px", borderBottom: `1px solid ${t.border}`, background: t.surface2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "15px", color: t.text }}>Identité de l'établissement</span>
              {etabDirty && !etabSaved && (
                <span style={{ background: t.amberBg, border: `1px solid ${t.amberBd}`, color: t.amber, fontSize: "9px", fontWeight: "800", padding: "2px 7px", borderRadius: "5px" }}>
                  Non sauvegardé
                </span>
              )}
              {etabSaved && (
                <span style={{ background: t.greenBg, border: `1px solid ${t.greenBd}`, color: t.green, fontSize: "9px", fontWeight: "800", padding: "2px 7px", borderRadius: "5px" }}>
                  ✓ Sauvegardé
                </span>
              )}
            </div>

            {etabForm ? (
              <div style={{ padding: "18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <Field label="Nom de l'établissement" value={etabForm.nom} onChange={e => updateEtabField("nom", e.target.value)} t={t} />
                </div>
                <Field label="N° NDA"                    value={etabForm.nda}        onChange={e => updateEtabField("nda",        e.target.value)} t={t} />
                <Field label="N° Certification Qualiopi" value={etabForm.certif}     onChange={e => updateEtabField("certif",     e.target.value)} t={t} />
                <div style={{ gridColumn: "1/-1" }}>
                  <Field label="Adresse"                 value={etabForm.adresse}    onChange={e => updateEtabField("adresse",    e.target.value)} t={t} />
                </div>
                <Field label="Téléphone"                 value={etabForm.tel}        onChange={e => updateEtabField("tel",        e.target.value)} type="tel" t={t} />
                <Field label="Email"                     value={etabForm.email}      onChange={e => updateEtabField("email",      e.target.value)} type="email" t={t} />
                <Field label="Directrice / Directeur"    value={etabForm.directrice} onChange={e => updateEtabField("directrice", e.target.value)} t={t} />
                <Field label="Date d'audit prévue"       value={etabForm.dateAudit}  onChange={e => updateEtabField("dateAudit",  e.target.value)} type="date" t={t} />

                <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "6px", borderTop: `1px solid ${t.border}` }}>
                  <button
                    onClick={() => { setEtabForm(null); setEtabDirty(false); }}
                    style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${t.border}`, borderRadius: "7px", color: t.text2, fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
                  >Annuler</button>
                  <button
                    onClick={saveEtab} disabled={!etabDirty || etabSaving}
                    style={{ padding: "8px 16px", background: t.accent, border: "none", borderRadius: "7px", color: "white", fontSize: "11px", fontWeight: "700", cursor: !etabDirty ? "not-allowed" : "pointer", opacity: !etabDirty ? 0.5 : 1, boxShadow: `0 4px 10px ${t.accentBd}` }}
                  >{etabSaving ? "Sauvegarde…" : "💾 Enregistrer"}</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: t.text3, fontSize: "12px" }}>Chargement…</div>
            )}
          </div>

          {/* Colonne droite : Qualiopi + agréments */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ background: t.goldBg, border: `1px solid ${t.goldBd}`, borderRadius: "12px", padding: "16px 18px", boxShadow: `0 4px 16px ${t.goldBd}` }}>
              <div style={{ fontSize: "9px", fontWeight: "800", color: t.gold, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Certification Qualiopi</div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "15px", color: t.text, marginBottom: "4px" }}>{etabForm?.certif || "—"}</div>
              <div style={{ fontSize: "10px", color: t.text3, marginBottom: "10px" }}>Valide jusqu'au 15 oct. 2027</div>
              <div style={{ height: "4px", background: `rgba(212,160,48,0.15)`, borderRadius: "2px", marginBottom: "4px" }}>
                <div style={{ width: "62%", height: "100%", background: `linear-gradient(90deg,${t.gold},#f0c060)`, borderRadius: "2px" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: t.gold, fontWeight: "700" }}>
                <span>Délivré oct. 2021</span><span>Renouvellement oct. 2027</span>
              </div>
            </div>

            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "14px 16px", boxShadow: t.shadowSm }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "14px", color: t.text, marginBottom: "11px" }}>Agréments</div>
              {[
                { l: "DREETS AuRA",          v: "Agrément actif",    k: "green" },
                { l: "ARS — Autorisation",   v: "150 places",        k: "green" },
                { l: "Ministère Santé",      v: "IFAS · 35 places",  k: "green" },
                { l: "HAS — Simulation",     v: "⚠ À renouveler",   k: "amber" },
              ].map(ag => {
                const { c, bg, bd } = sc(t, ag.k);
                return (
                  <div key={ag.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${t.border2}` }}>
                    <span style={{ fontSize: "11px", color: t.text2 }}>{ag.l}</span>
                    <span style={{ background: bg, border: `1px solid ${bd}`, color: c, fontSize: "9px", fontWeight: "700", padding: "2px 7px", borderRadius: "4px" }}>{ag.v}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ONGLET 3 — MÉDIATHÈQUE
          Fichiers → Firebase Storage
          Métadonnées → etablissements/{id}.documents
      ══════════════════════════════════════════════════ */}
      {tab === "mediatheque" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Filtres + bouton déposer */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={docSearch} onChange={e => setDocSearch(e.target.value)}
              placeholder="Rechercher un document…"
              style={{ width: "220px", padding: "6px 10px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "7px", fontSize: "12px", color: t.text, outline: "none", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: "4px" }}>
              {["tous", ...DOC_CATS].map(c => {
                const cc = CAT_COLORS[c];
                return (
                  <button key={c} onClick={() => setDocCatFilter(c)} style={{
                    padding: "5px 10px", borderRadius: "6px", cursor: "pointer",
                    border: `1px solid ${docCatFilter === c ? (cc ? cc.c + "60" : t.accentBd) : t.border}`,
                    background: docCatFilter === c ? (cc ? cc.bg : t.accentBg) : "transparent",
                    color: docCatFilter === c ? (cc ? cc.c : t.accent) : t.text2,
                    fontSize: "10px", fontWeight: "700", transition: "all 0.12s",
                  }}>{c === "tous" ? "Tout" : c}</button>
                );
              })}
            </div>

            {/* Sélecteur catégorie avant upload */}
            <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
              <select value={uploadCat} onChange={e => setUploadCat(e.target.value)}
                style={{ padding: "5px 9px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "6px", fontSize: "11px", color: t.text2, cursor: "pointer" }}>
                {DOC_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: "6px 13px", background: t.accentBg, border: `1px solid ${t.accentBd}`, color: t.accent, borderRadius: "7px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
              >+ Déposer</button>
              <input ref={fileInputRef} type="file" hidden accept=".pdf,.docx,.xlsx,.pptx,.jpg,.png"
                onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); e.target.value = ""; }} />
            </div>
          </div>

          {/* Barre de progression upload */}
          {uploadProgress !== null && (
            <div style={{ background: t.accentBg, border: `1px solid ${t.accentBd}`, borderRadius: "8px", padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: t.accent, marginBottom: "6px" }}>
                <span>Envoi en cours…</span><span>{uploadProgress}%</span>
              </div>
              <div style={{ height: "4px", background: t.border, borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: `${uploadProgress}%`, height: "100%", background: `linear-gradient(90deg,${t.accent},${t.teal || t.accent})`, transition: "width 0.3s", borderRadius: "2px" }} />
              </div>
            </div>
          )}

          {/* Zone drag-and-drop visuelle */}
          <div
            style={{ background: t.surface2, border: `2px dashed ${t.border}`, borderRadius: "10px", padding: "16px", textAlign: "center", cursor: "pointer", transition: "all 0.15s" }}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = t.accentBd; }}
            onDragLeave={e => e.currentTarget.style.borderColor = t.border}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = t.border; const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <span style={{ fontSize: "20px" }}>📂</span>
            <div style={{ fontSize: "11px", fontWeight: "600", color: t.text2, marginTop: "5px" }}>Glisser-déposer ou cliquer pour déposer</div>
            <div style={{ fontSize: "9px", color: t.text3, marginTop: "2px" }}>PDF, DOCX, XLSX, PPTX — 20 Mo max</div>
          </div>

          {/* Grille documents */}
          {filteredDocs.length === 0 ? (
            <div style={{ textAlign: "center", color: t.text3, fontSize: "12px", padding: "30px", fontStyle: "italic" }}>Aucun document déposé.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "10px" }}>
              {filteredDocs.map(docMeta => {
                const cc = CAT_COLORS[docMeta.cat] || CAT_COLORS["Autre"];
                return (
                  <div key={docMeta.id}
                    style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "13px 14px", boxShadow: t.shadowSm, transition: "all 0.15s" }}
                    onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = t.shadow; }}
                    onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = t.shadowSm; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <span style={{ background: cc.bg, color: cc.c, border: `1px solid ${cc.c}30`, fontSize: "8px", fontWeight: "800", padding: "2px 6px", borderRadius: "4px" }}>{docMeta.cat}</span>
                      {docMeta.validated
                        ? <span style={{ background: t.greenBg, border: `1px solid ${t.greenBd}`, color: t.green, fontSize: "8px", fontWeight: "800", padding: "2px 6px", borderRadius: "4px" }}>✓ Validé</span>
                        : <span style={{ background: t.amberBg, border: `1px solid ${t.amberBd}`, color: t.amber, fontSize: "8px", fontWeight: "800", padding: "2px 6px", borderRadius: "4px" }}>En attente</span>
                      }
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: t.text, lineHeight: "1.35", marginBottom: "5px" }}>{docMeta.name}</div>
                    <div style={{ fontSize: "9px", color: t.text3, marginBottom: "8px" }}>{docMeta.author} · {docMeta.size} · {docMeta.date}</div>
                    <div style={{ display: "flex", gap: "5px" }}>
                      <a href={docMeta.downloadURL} target="_blank" rel="noreferrer"
                        style={{ flex: 1, padding: "5px", background: t.accentBg, border: `1px solid ${t.accentBd}`, borderRadius: "5px", color: t.accent, fontSize: "9px", fontWeight: "700", cursor: "pointer", textAlign: "center", textDecoration: "none" }}>
                        👁 Ouvrir
                      </a>
                      {!docMeta.validated && (
                        <button onClick={() => handleValidateDoc(docMeta)}
                          style={{ flex: 1, padding: "5px", background: t.greenBg, border: `1px solid ${t.greenBd}`, borderRadius: "5px", color: t.green, fontSize: "9px", fontWeight: "700", cursor: "pointer" }}>
                          ✓ Valider
                        </button>
                      )}
                      <button onClick={() => handleDeleteDoc(docMeta)}
                        style={{ width: "28px", padding: "5px", background: t.redBg, border: `1px solid ${t.redBd}`, borderRadius: "5px", color: t.red, fontSize: "9px", cursor: "pointer" }}>
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ONGLET 4 — JOURNAL D'ACCÈS
          Source : sous-collection etablissements/{id}/logs
      ══════════════════════════════════════════════════ */}
      {tab === "journal" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Alerte connexions échouées */}
          {logs.some(l => l.type === "alert") && (
            <div style={{ background: t.redBg, border: `1px solid ${t.redBd}`, borderLeft: `3px solid ${t.red}`, borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "14px" }}>⚠️</span>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: t.red }}>Tentative(s) de connexion suspecte(s) détectée(s)</div>
                <div style={{ fontSize: "9.5px", color: t.text3, marginTop: "1px" }}>Vérifiez le journal ci-dessous.</div>
              </div>
            </div>
          )}

          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${t.border}`, background: t.surface2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "15px", color: t.text }}>Journal d'activité</span>
              <span style={{ fontSize: "10px", color: t.text3 }}>{logs.length} événements récents</span>
            </div>

            {logs.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: t.text3, fontSize: "12px", fontStyle: "italic" }}>Aucun événement enregistré.</div>
            ) : logs.map((log, i) => {
              const cfg = LOG_CFG[log.type] || LOG_CFG.admin;
              const { c, bg, bd } = sc(t, cfg.colorKey);
              return (
                <div key={log.id}
                  style={{ display: "grid", gridTemplateColumns: "28px 1fr 180px 110px", gap: "10px", padding: "10px 18px", borderBottom: i < logs.length - 1 ? `1px solid ${t.border2}` : "none", alignItems: "center", transition: "background 0.1s" }}
                  onMouseOver={e => e.currentTarget.style.background = t.surface2}
                  onMouseOut={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: bg, border: `1px solid ${bd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", flexShrink: 0 }}>
                    {cfg.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: t.text }}>{log.action}</div>
                    <div style={{ fontSize: "10px", color: t.text3, marginTop: "1px" }}>{log.detail}</div>
                  </div>
                  <div style={{ fontSize: "10px", color: t.text2 }}>{log.user}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: t.text3, textAlign: "right" }}>
                    {log.createdAt?.toDate ? timeAgo(log.createdAt.toDate().toISOString()) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ONGLET 5 — PARAMÈTRES
      ══════════════════════════════════════════════════ */}
      {tab === "parametres" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

          {/* Notifications */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "16px 18px", boxShadow: t.shadowSm }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "15px", color: t.text, marginBottom: "12px" }}>🔔 Notifications email</div>
            {[
              { k: "connexion",    l: "Nouvelles connexions",       sub: "Alerte à chaque login"    },
              { k: "modification", l: "Modifications indicateurs",  sub: "Changement de statut"     },
              { k: "export",       l: "Exports PDF",                sub: "Après chaque export"      },
              { k: "alerte",       l: "Alertes de sécurité",        sub: "Connexions échouées", colorKey: "red" },
            ].map(n => (
              <div key={n.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.border2}` }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: t.text }}>{n.l}</div>
                  <div style={{ fontSize: "9px", color: t.text3 }}>{n.sub}</div>
                </div>
                <Toggle val={notifPrefs[n.k]} onChange={() => toggleNotif(n.k)} colorKey={n.colorKey || "accent"} t={t} />
              </div>
            ))}
          </div>

          {/* Affichage */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "16px 18px", boxShadow: t.shadowSm }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "15px", color: t.text, marginBottom: "12px" }}>🎨 Affichage</div>
            {[
              { l: "Thème sombre",   sub: "Interface Midnight Authority", val: isDarkMode,      set: () => setIsDarkMode(v => !v)      },
              { l: "Mode daltonien", sub: "Remplace rouge/vert",          val: isColorblindMode, set: () => setIsColorblindMode(v => !v) },
            ].map(p => (
              <div key={p.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.border2}` }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: t.text }}>{p.l}</div>
                  <div style={{ fontSize: "9px", color: t.text3 }}>{p.sub}</div>
                </div>
                <Toggle val={p.val} onChange={p.set} t={t} />
              </div>
            ))}
            <div style={{ paddingTop: "10px" }}>
              <label style={{ fontSize: "9px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: "6px" }}>Langue</label>
              <select style={{ width: "100%", padding: "8px 10px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "7px", fontSize: "12px", color: t.text, outline: "none" }}>
                <option>Français</option>
                <option>English</option>
              </select>
            </div>
          </div>

          {/* Exports */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "16px 18px", boxShadow: t.shadowSm }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "15px", color: t.text, marginBottom: "12px" }}>📤 Exports & sauvegardes</div>
            {[
              { l: "Export JSON complet",     sub: "Toutes les données Qualiopi", k: "accent" },
              { l: "Export Excel indicateurs",sub: "Tableau de suivi",            k: "green"  },
              { l: "Sauvegarde complète",     sub: "Archive ZIP",                 k: "gold"   },
            ].map(e => {
              const { c, bg, bd } = sc(t, e.k);
              return (
                <div key={e.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${t.border2}` }}>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: t.text }}>{e.l}</div>
                    <div style={{ fontSize: "9px", color: t.text3 }}>{e.sub}</div>
                  </div>
                  <button style={{ padding: "5px 11px", background: bg, border: `1px solid ${bd}`, color: c, borderRadius: "6px", fontSize: "9px", fontWeight: "700", cursor: "pointer" }}>Exporter</button>
                </div>
              );
            })}
          </div>

          {/* Zone danger */}
          <div style={{ background: t.surface, border: `1px solid ${t.redBd}`, borderRadius: "12px", padding: "16px 18px", boxShadow: t.shadowSm }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "15px", color: t.red, marginBottom: "6px" }}>⚠ Zone dangereuse</div>
            <div style={{ fontSize: "10px", color: t.text3, marginBottom: "12px" }}>Actions irréversibles — nécessitent confirmation</div>
            {[
              { l: "Réinitialiser les indicateurs", sub: "Remet à zéro la campagne active", k: "amber" },
              { l: "Supprimer l'établissement",     sub: "Supprime toutes les données",     k: "red"   },
            ].map(a => {
              const { c, bg, bd } = sc(t, a.k);
              return (
                <div key={a.l} style={{ padding: "9px 11px", background: bg, border: `1px solid ${bd}`, borderRadius: "7px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: c }}>{a.l}</div>
                    <div style={{ fontSize: "9px", color: t.text3 }}>{a.sub}</div>
                  </div>
                  <button style={{ padding: "5px 11px", background: "transparent", border: `1px solid ${bd}`, color: c, borderRadius: "6px", fontSize: "9px", fontWeight: "700", cursor: "pointer", flexShrink: 0, marginLeft: "8px" }}>
                    Exécuter
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CompteTab  —  inchangé dans App.jsx, améliorations internes uniquement
// ─────────────────────────────────────────────────────────────────────────────

export function CompteTab({
  auth: firebaseAuth, userProfile,
  pwdUpdate, setPwdUpdate, handleChangePassword,
  isDarkMode, setIsDarkMode, isColorblindMode, setIsColorblindMode,
  t,
}) {

  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew]         = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdError, setPwdError]     = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [showPwd, setShowPwd]       = useState(false);

  // Force password strength
  const pwdStrength = useMemo(() => {
    if (!pwdNew) return 0;
    let s = 0;
    if (pwdNew.length >= 8)         s++;
    if (pwdNew.length >= 12)        s++;
    if (/[A-Z]/.test(pwdNew))       s++;
    if (/[0-9]/.test(pwdNew))       s++;
    if (/[^A-Za-z0-9]/.test(pwdNew)) s++;
    return s;
  }, [pwdNew]);

  const strengthColors = ["", t.red, t.red, t.amber, t.green, t.accent];
  const strengthLabels = ["", "Très faible", "Faible", "Moyen", "Fort", "Très fort"];

  const changePwd = async () => {
    setPwdError(""); setPwdSuccess(false);
    if (!pwdCurrent || !pwdNew || !pwdConfirm) return setPwdError("Tous les champs sont requis.");
    if (pwdNew !== pwdConfirm) return setPwdError("Les mots de passe ne correspondent pas.");
    if (pwdNew.length < 6) return setPwdError("Minimum 6 caractères.");
    setLoading(true);
    try {
      const cred = EmailAuthProvider.credential(firebaseAuth.currentUser.email, pwdCurrent);
      await reauthenticateWithCredential(firebaseAuth.currentUser, cred);
      await updatePassword(firebaseAuth.currentUser, pwdNew);
      setPwdSuccess(true);
      setPwdCurrent(""); setPwdNew(""); setPwdConfirm("");
    } catch (e) {
      const msgs = {
        "auth/wrong-password":       "Mot de passe actuel incorrect.",
        "auth/too-many-requests":    "Trop de tentatives. Réessayez dans quelques minutes.",
        "auth/requires-recent-login":"Reconnectez-vous avant de changer le mot de passe.",
      };
      setPwdError(msgs[e.code] || e.message);
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "800px", margin: "0 auto", paddingBottom: "40px" }}>

      {/* Header profil */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "28px 32px", display: "flex", alignItems: "center", gap: "24px", boxShadow: t.shadowSm }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "18px", background: `linear-gradient(135deg, ${t.accent}, ${t.accentBd ? "#7c3aed" : t.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "800", color: "white", flexShrink: 0 }}>
          {firebaseAuth.currentUser?.email?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "28px", color: t.text, margin: "0 0 6px 0" }}>
            Mon compte
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", color: t.text2, fontWeight: "500" }}>{firebaseAuth.currentUser?.email}</span>
            <span style={{ background: t.accentBg, border: `1px solid ${t.accentBd}`, color: t.accent, fontSize: "10px", fontWeight: "800", padding: "3px 9px", borderRadius: "6px", textTransform: "capitalize" }}>
              {userProfile?.role || "Utilisateur"}
            </span>
          </div>
        </div>
      </div>

      {/* Apparence */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden", boxShadow: t.shadowSm }}>
        <div style={{ padding: "16px 24px", background: t.surface2, borderBottom: `1px solid ${t.border}` }}>
          <span style={{ fontSize: "14px", fontWeight: "800", color: t.text }}>🎨 Apparence & Accessibilité</span>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            { l: "Thème sombre (Midnight)",sub: "Protège les yeux, réduit la fatigue visuelle.", val: isDarkMode,      set: () => setIsDarkMode(v => !v)      },
            { l: "Mode Daltonien",          sub: "Remplace le rouge/vert par des couleurs à fort contraste.", val: isColorblindMode, set: () => setIsColorblindMode(v => !v) },
          ].map(p => (
            <div key={p.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", borderBottom: `1px solid ${t.border2}` }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: t.text, marginBottom: "4px" }}>{p.l}</div>
                <div style={{ fontSize: "12px", color: t.text2 }}>{p.sub}</div>
              </div>
              <Toggle val={p.val} onChange={p.set} t={t} />
            </div>
          ))}
        </div>
      </div>

      {/* Sécurité — mot de passe avec ré-authentification */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden", boxShadow: t.shadowSm }}>
        <div style={{ padding: "16px 24px", background: t.surface2, borderBottom: `1px solid ${t.border}` }}>
          <span style={{ fontSize: "14px", fontWeight: "800", color: t.text }}>🔒 Sécurité du compte</span>
        </div>
        <div style={{ padding: "24px" }}>
          <div style={{ fontSize: "12px", color: t.text2, marginBottom: "18px" }}>La réauthentification avec votre mot de passe actuel est requise.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "480px" }}>

            {/* MdP actuel */}
            <div>
              <label style={{ fontSize: "10px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: "5px" }}>Mot de passe actuel</label>
              <input
                type="password" value={pwdCurrent} onChange={e => setPwdCurrent(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.surface2, color: t.text, outline: "none", fontSize: "13px", fontFamily: "inherit" }}
              />
            </div>

            {/* Nouveau MdP avec barre de force */}
            <div>
              <label style={{ fontSize: "10px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: "5px" }}>Nouveau mot de passe</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"} value={pwdNew} onChange={e => setPwdNew(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  style={{ width: "100%", padding: "10px 38px 10px 14px", borderRadius: "8px", border: `1px solid ${pwdNew && pwdStrength >= 3 ? t.greenBd : t.border}`, background: t.surface2, color: t.text, outline: "none", fontSize: "13px", fontFamily: "inherit", transition: "border-color 0.2s" }}
                />
                <button onClick={() => setShowPwd(v => !v)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: t.text3, fontSize: "14px" }}>
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
              {pwdNew && (
                <div style={{ marginTop: "6px" }}>
                  <div style={{ display: "flex", gap: "3px", marginBottom: "3px" }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: i <= pwdStrength ? strengthColors[pwdStrength] : t.border, transition: "background 0.2s" }} />
                    ))}
                  </div>
                  <span style={{ fontSize: "9px", fontWeight: "700", color: strengthColors[pwdStrength] }}>{strengthLabels[pwdStrength]}</span>
                </div>
              )}
            </div>

            {/* Confirmation */}
            <div>
              <label style={{ fontSize: "10px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: "5px" }}>Confirmer le nouveau mot de passe</label>
              <input
                type="password" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)}
                placeholder="Répéter"
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1px solid ${pwdConfirm && pwdNew !== pwdConfirm ? t.redBd : pwdConfirm && pwdNew === pwdConfirm ? t.greenBd : t.border}`, background: t.surface2, color: t.text, outline: "none", fontSize: "13px", fontFamily: "inherit", transition: "border-color 0.2s" }}
              />
              {pwdConfirm && pwdNew !== pwdConfirm && <div style={{ fontSize: "10px", color: t.red, marginTop: "3px" }}>Les mots de passe ne correspondent pas.</div>}
              {pwdConfirm && pwdNew === pwdConfirm && <div style={{ fontSize: "10px", color: t.green, marginTop: "3px" }}>✓ Identiques.</div>}
            </div>

            <button
              onClick={changePwd} disabled={loading}
              style={{ padding: "11px 22px", background: pwdSuccess ? t.greenBg : t.accent, border: `1px solid ${pwdSuccess ? t.greenBd : t.accentBd}`, borderRadius: "8px", color: pwdSuccess ? t.green : "white", fontSize: "13px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", boxShadow: pwdSuccess ? "none" : `0 4px 12px ${t.accentBd}`, transition: "all 0.2s", alignSelf: "flex-start" }}
            >
              {loading ? "Mise à jour…" : pwdSuccess ? "✓ Mot de passe modifié !" : "Mettre à jour"}
            </button>

            {pwdError && (
              <div style={{ color: t.red, fontSize: "12px", fontWeight: "600", padding: "10px 14px", background: t.redBg, borderRadius: "8px", border: `1px solid ${t.redBd}` }}>
                {pwdError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zone danger */}
      <div style={{ background: t.surface, border: `1px solid ${t.redBd}`, borderRadius: "16px", overflow: "hidden", boxShadow: t.shadowSm }}>
        <div style={{ padding: "24px 32px" }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "24px", color: t.red, marginBottom: "6px" }}>⚠️ Zone dangereuse</div>
          <div style={{ fontSize: "12px", color: t.text2, marginBottom: "20px" }}>Ces actions sont définitives et ne peuvent pas être annulées.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: "10px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: t.text, marginBottom: "3px" }}>Exporter mes données</div>
                <div style={{ fontSize: "11px", color: t.text3 }}>Télécharger toutes mes données au format JSON</div>
              </div>
              <button onClick={() => alert("Export en cours…")} style={{ background: t.accentBg, border: `1px solid ${t.accentBd}`, color: t.accent, padding: "9px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                Exporter
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: t.redBg, border: `1px solid ${t.redBd}`, borderRadius: "10px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: t.red, marginBottom: "3px" }}>Désactiver mon compte</div>
                <div style={{ fontSize: "11px", color: t.red, opacity: 0.75 }}>Votre accès sera suspendu immédiatement</div>
              </div>
              <button onClick={() => alert("Contactez votre Super Admin.")} style={{ background: t.red, border: "none", color: "white", padding: "9px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer", boxShadow: `0 4px 12px ${t.redBd}` }}>
                Désactiver
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
