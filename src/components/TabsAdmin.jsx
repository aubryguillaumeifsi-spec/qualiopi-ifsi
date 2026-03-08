import React, { useState, useMemo, useEffect, useRef } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, setDoc, serverTimestamp, query, orderBy, limit } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { db, auth, storage } from "../firebase";

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS & CONSTANTES
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

const DOC_CATS = ["Qualité", "Communication", "Pédagogie", "RH", "Partenariats", "Indicateur", "Autre"];
const CAT_COLORS = {
  "Qualité":       { c: "#4f80f0", bg: "rgba(79,128,240,0.1)"  },
  "Communication": { c: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  "Pédagogie":     { c: "#2dd4bf", bg: "rgba(45,212,191,0.1)"  },
  "RH":            { c: "#f0a030", bg: "rgba(240,160,48,0.1)"  },
  "Partenariats":  { c: "#f07070", bg: "rgba(240,112,112,0.1)" },
  "Indicateur":    { c: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  "Autre":         { c: "#a0a0b0", bg: "rgba(160,160,176,0.1)" },
};

const STANDARD_DOCS = [
  "Livret d'accueil", "Règlement intérieur", "Plan de formation", 
  "Plaquette IFSI", "Rapport d'activité", "Bilan pédagogique", 
  "Organigramme", "Projet pédagogique"
];

function timeAgo(isoString) {
  if (!isoString) return "—";
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60)    return "À l'instant";
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return new Date(isoString).toLocaleDateString("fr-FR");
}

function formatMonthYear(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

async function writeLog(ifsiId, action, detail, type = "admin") {
  if (!ifsiId || !auth.currentUser) return;
  try {
    await addDoc(collection(db, "etablissements", ifsiId, "logs"), {
      action, detail, type,
      user: auth.currentUser.email,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("writeLog:", e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANTS PARTAGÉS
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({ val, onChange, colorKey = "accent", t }) {
  const { c, bd } = sc(t, colorKey);
  return (
    <div
      onClick={onChange}
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
//  EquipeTab (Administration Globale)
// ─────────────────────────────────────────────────────────────────────────────

export function EquipeTab({
  userProfile, newMember, setNewMember, isCreatingUser, handleCreateUser,
  selectedIfsi, ifsiList, teamSearchTerm, setTeamSearchTerm,
  sortedTeamUsers, handleDeleteUser, handleSendResetEmail, t,
  ifsiData, handleSaveEtab, criteres, 
  isDarkMode, setIsDarkMode
}) {

  const [tab, setTab]                 = useState("parametres"); // Ouvert par défaut sur paramètres pour te montrer
  const [roleFilter, setRoleFilter]   = useState("tous");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [showInvite, setShowInvite]   = useState(false);
  const [confirmDel, setConfirmDel]   = useState(null); 
  const [deleting, setDeleting]       = useState(false);

  // ── Établissement ──────────────────────────────────
  const [etabForm, setEtabForm]   = useState(null); 
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
        dateCertif: ifsiData.dateCertif  || "",
        dateAudit:  ifsiData.dateAudit   || "",
        agrements:  ifsiData.agrements   || [
          { l: "DREETS AuRA",          v: "Agrément actif",    k: "green" },
          { l: "ARS — Autorisation",   v: "150 places",        k: "green" },
          { l: "Ministère Santé",      v: "IFAS · 35 places",  k: "green" },
          { l: "HAS — Simulation",     v: "⚠ À renouveler",   k: "amber" },
        ]
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
      dateCertif:  etabForm.dateCertif,
      dateAudit:   etabForm.dateAudit,
      agrements:   etabForm.agrements
    });
    await writeLog(selectedIfsi, "Paramètres établissement modifiés", "Identité mise à jour");
    setEtabSaving(false);
    setEtabDirty(false);
    setEtabSaved(true);
    setTimeout(() => setEtabSaved(false), 3000);
  };

  // ── Médiathèque ────────────────────────────────────
  const documents = useMemo(() => ifsiData?.documents || [], [ifsiData]);
  const [docCatFilter, setDocCatFilter] = useState("tous");
  const [docSearch, setDocSearch]       = useState("");
  const [uploadProgress, setUploadProgress] = useState(null); 
  const [uploadModal, setUploadModal]   = useState(null);
  const [editDocModal, setEditDocModal] = useState(null);
  const fileInputRef = useRef();

  const allMergedDocs = useMemo(() => {
    const baseDocs = [...documents];
    const preuveDocs = [];

    if (criteres) {
      criteres.forEach(crit => {
        if (crit.preuves && Array.isArray(crit.preuves)) {
          crit.preuves.forEach((p, idx) => {
            preuveDocs.push({
              id: `preuve_${crit.id}_${idx}`,
              name: p.nom || p.name || `Preuve Indicateur ${crit.num}`,
              cat: "Indicateur",
              size: "Preuve",
              date: p.date || crit.dateModif || "—",
              author: p.auteur || p.author || "Système",
              downloadURL: p.url || p.downloadURL || p.lien,
              isPreuve: true,
              indicNum: crit.num
            });
          });
        }
      });
    }
    return [...baseDocs, ...preuveDocs].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [documents, criteres]);

  const filteredDocs = useMemo(() =>
    allMergedDocs.filter(d => {
      if (docCatFilter !== "tous" && d.cat !== docCatFilter) return false;
      if (docSearch && !d.name.toLowerCase().includes(docSearch.toLowerCase())) return false;
      return true;
    }),
    [allMergedDocs, docCatFilter, docSearch]
  );

  const handleFileSelect = (file) => {
    if (!file) return;
    setUploadModal({ file: file, name: file.name.replace(/\.[^/.]+$/, ""), cat: "Qualité" });
  };

  const confirmUpload = async () => {
    if (!uploadModal || !selectedIfsi) return;
    const { file, name, cat } = uploadModal;
    setUploadModal(null);

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
          name:        name.trim() || file.name,
          cat:         cat,
          size:        file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} Mo` : `${Math.round(file.size / 1024)} Ko`,
          date:        new Date().toISOString().slice(0, 10),
          author:      auth.currentUser?.email || "—",
          tags:        [],
          validated:   false,
          storagePath: path,
          downloadURL: url,
        };
        const updated = [...documents, newDoc];
        await setDoc(doc(db, "etablissements", selectedIfsi), { documents: updated }, { merge: true });
        await writeLog(selectedIfsi, "Document déposé", newDoc.name, "upload");
        setUploadProgress(null);
      }
    );
  };

  const confirmEditDoc = async () => {
    if (!editDocModal || !editDocModal.name.trim()) return alert("Le nom du document est requis.");
    const updated = documents.map(d => d.id === editDocModal.id ? { ...d, name: editDocModal.name.trim(), cat: editDocModal.cat } : d);
    await setDoc(doc(db, "etablissements", selectedIfsi), { documents: updated }, { merge: true });
    await writeLog(selectedIfsi, "Document modifié", editDocModal.name, "admin");
    setEditDocModal(null);
  };

  const handleDeleteDoc = async (docMeta) => {
    if (docMeta.isPreuve) return alert("Les preuves doivent être supprimées depuis l'indicateur Qualiopi correspondant.");
    if (!window.confirm(`Supprimer "${docMeta.name}" ?`)) return;
    try { await deleteObject(ref(storage, docMeta.storagePath)); } catch (_) { }
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
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    if (!selectedIfsi) return;
    const q = query(collection(db, "etablissements", selectedIfsi, "logs"), orderBy("createdAt", "desc"), limit(30));
    const unsub = onSnapshot(q, (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [selectedIfsi]);

  // ── EXPORTS & PARAMÈTRES ───────────────────────────
  const [notifPrefs, setNotifPrefs] = useState({ connexion: true, modification: true, alerte: true });
  useEffect(() => { if (ifsiData?.notifPrefs) setNotifPrefs(ifsiData.notifPrefs); }, [ifsiData?.notifPrefs]);

  const toggleNotif = async (key) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    await setDoc(doc(db, "etablissements", selectedIfsi), { notifPrefs: updated }, { merge: true });
  };

  // 🎯 EXPORT JSON
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(criteres, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `Qualiopi_Export_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
  };

  // 🎯 SUPERBE EXPORT EXCEL (HTML to XLS)
  const handleExportExcel = () => {
    if (!criteres || criteres.length === 0) return alert("Aucun indicateur disponible à l'export.");

    const sortedCriteres = [...criteres].sort((a,b) => (a.critere === b.critere ? a.num - b.num : a.critere - b.critere));

    // Construction d'une page HTML stylisée compréhensible par Excel
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; width: 100%; }
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; text-align: left; padding: 12px; border: 1px solid #cbd5e1; font-size: 14px; }
          td { padding: 10px; border: 1px solid #cbd5e1; vertical-align: top; font-size: 13px; color: #1e293b; }
          .bg-conforme { background-color: #d1fae5; color: #065f46; font-weight: bold; text-align: center; }
          .bg-encours { background-color: #fef3c7; color: #92400e; font-weight: bold; text-align: center; }
          .bg-nonconforme { background-color: #fee2e2; color: #991b1b; font-weight: bold; text-align: center; }
          .bg-nonconcerne { background-color: #f1f5f9; color: #475569; font-weight: bold; text-align: center; }
          .titre { font-size: 14px; font-weight: bold; color: #0f172a; }
        </style>
      </head>
      <body>
        <h2 style="color: #0f172a; font-family: 'Segoe UI', Arial, sans-serif;">Tableau de suivi Qualiopi</h2>
        <p style="color: #64748b; font-family: 'Segoe UI', Arial, sans-serif; margin-bottom: 20px;">Export généré le : ${new Date().toLocaleDateString('fr-FR')}</p>
        <table>
          <thead>
            <tr>
              <th style="width: 80px; text-align:center;">Numéro</th>
              <th style="width: 130px; text-align:center;">Statut</th>
              <th style="width: 500px;">Intitulé de l'indicateur</th>
              <th style="width: 250px;">Responsables</th>
              <th style="width: 120px; text-align:center;">Échéance</th>
            </tr>
          </thead>
          <tbody>
            ${sortedCriteres.map(c => {
              const statutClass = c.statut === "conforme" ? "bg-conforme" : c.statut === "en-cours" ? "bg-encours" : c.statut === "non-conforme" ? "bg-nonconforme" : "bg-nonconcerne";
              const statutLabel = c.statut === "conforme" ? "Conforme" : c.statut === "en-cours" ? "En cours" : c.statut === "non-conforme" ? "Non conforme" : c.statut === "non-concerne" ? "Non concerné" : "Non évalué";
              
              const escapeHtml = (text) => (text||"").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
              const titre = escapeHtml(c.titre);
              const resp = escapeHtml(Array.isArray(c.responsables) ? c.responsables.join(", ") : (c.responsables || ""));

              return `
                <tr>
                  <td style="text-align: center; font-weight: bold; font-size: 14px;">${c.critere}.${c.num}</td>
                  <td class="${statutClass}">${statutLabel}</td>
                  <td><div class="titre">${titre}</div></td>
                  <td>${resp}</td>
                  <td style="text-align: center;">${escapeHtml(c.delai)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Suivi_Qualiopi_${new Date().toISOString().slice(0,10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    writeLog(selectedIfsi, "Export Excel généré", "Téléchargement base indicateurs", "export");
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

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === "ACTIF" ? "INACTIF" : "ACTIF";
    if (window.confirm(`Voulez-vous vraiment passer le compte de ${user.email} en statut ${newStatus} ?`)) {
      await setDoc(doc(db, "users", user.id), { status: newStatus }, { merge: true });
    }
  };

  const doDeleteUser = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    await handleDeleteUser(confirmDel.id);
    await writeLog(selectedIfsi, "Utilisateur supprimé", confirmDel.email, "admin");
    setDeleting(false);
    setConfirmDel(null);
  };

  const TABS = [
    { id: "membres",      label: "Membres",         icon: "👥", badge: stats.invites || null, bc: "purple"  },
    { id: "etablissement",label: "Établissement",   icon: "🏛",  badge: null                                },
    { id: "mediatheque",  label: "Médiathèque",     icon: "📁",  badge: documents.filter(d => !d.validated).length || null, bc: "amber" },
    { id: "journal",      label: "Journal d'accès", icon: "📋",  badge: null                                },
    { id: "parametres",   label: "Paramètres",      icon: "⚙",  badge: null                                },
  ];

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      <style>{`
        @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        .animate-slide-down { animation: slideDown 0.2s ease-out forwards; }
      `}</style>

      {/* ── MODALE CONFIRMATION SUPPRESSION ─────────────── */}
      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="animate-slide-down" style={{ background: t.surface, border: `1px solid ${t.redBd}`, borderRadius: "14px", padding: "28px 30px", width: "380px", boxShadow: t.shadow }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "22px", color: t.red, marginBottom: "8px" }}>Révoquer l'accès</div>
            <div style={{ fontSize: "12px", color: t.text2, lineHeight: "1.65", marginBottom: "22px" }}>Voulez-vous vraiment supprimer l'accès de <strong style={{ color: t.text }}>{confirmDel.email}</strong> ? Cette action est irréversible.</div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDel(null)} style={{ padding: "9px 18px", background: "transparent", border: `1px solid ${t.border}`, borderRadius: "7px", color: t.text2, fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Annuler</button>
              <button onClick={doDeleteUser} disabled={deleting} style={{ padding: "9px 18px", background: t.red, border: "none", borderRadius: "7px", color: "white", fontSize: "12px", fontWeight: "700", cursor: "pointer", opacity: deleting ? 0.6 : 1 }}>{deleting ? "Suppression…" : "Supprimer"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE UPLOAD & CATÉGORISATION ─────────────── */}
      {uploadModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="animate-slide-down" style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "32px", width: "500px", boxShadow: t.shadowLg }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "26px", color: t.text, marginBottom: "16px" }}>Détails du document</div>
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", display: "block" }}>Nom du document</label>
              <input 
                type="text" value={uploadModal.name} onChange={e => setUploadModal({ ...uploadModal, name: e.target.value })}
                style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.surface2, color: t.text, outline: "none", fontSize: "14px" }}
                autoFocus
              />
              
              <div style={{ marginTop: "12px" }}>
                <div style={{ fontSize: "10px", color: t.text3, marginBottom: "6px" }}>Suggestions :</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {STANDARD_DOCS.map(docName => (
                    <span 
                      key={docName} onClick={() => setUploadModal({ ...uploadModal, name: docName })}
                      style={{ background: t.surface3, color: t.text2, fontSize: "10px", fontWeight: "600", padding: "4px 10px", borderRadius: "20px", cursor: "pointer", transition: "all 0.2s" }}
                      onMouseOver={e=>e.currentTarget.style.background=t.accentBg} onMouseOut={e=>e.currentTarget.style.background=t.surface3}
                    >
                      {docName}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "32px" }}>
              <label style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", display: "block" }}>Catégorie</label>
              <select 
                value={uploadModal.cat} onChange={e => setUploadModal({ ...uploadModal, cat: e.target.value })}
                style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.surface2, color: t.text, outline: "none", fontSize: "14px", cursor: "pointer" }}
              >
                {DOC_CATS.filter(c => c !== "Indicateur").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setUploadModal(null)} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${t.border}`, borderRadius: "8px", color: t.text2, fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Annuler</button>
              <button onClick={confirmUpload} style={{ padding: "10px 24px", background: t.accent, border: "none", borderRadius: "8px", color: "white", fontSize: "13px", fontWeight: "700", cursor: "pointer", boxShadow: `0 4px 12px ${t.accentBd}` }}>Valider et Uploader</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE ÉDITION DOCUMENT ─────────────── */}
      {editDocModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="animate-slide-down" style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "32px", width: "420px", boxShadow: t.shadowLg }}>
            <h3 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "26px", color: t.text, margin: "0 0 20px 0" }}>Modifier le document</h3>
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", display: "block" }}>Nom</label>
              <input 
                type="text" value={editDocModal.name} onChange={e => setEditDocModal({ ...editDocModal, name: e.target.value })}
                style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.surface2, color: t.text, outline: "none", fontSize: "14px" }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: "32px" }}>
              <label style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", display: "block" }}>Catégorie</label>
              <select 
                value={editDocModal.cat} onChange={e => setEditDocModal({ ...editDocModal, cat: e.target.value })}
                style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.surface2, color: t.text, outline: "none", fontSize: "14px", cursor: "pointer" }}
              >
                {DOC_CATS.filter(c => c !== "Indicateur").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setEditDocModal(null)} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${t.border}`, borderRadius: "8px", color: t.text2, fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Annuler</button>
              <button onClick={confirmEditDoc} style={{ padding: "10px 24px", background: t.accent, border: "none", borderRadius: "8px", color: "white", fontSize: "13px", fontWeight: "700", cursor: "pointer", boxShadow: `0 4px 12px ${t.accentBd}` }}>Enregistrer</button>
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
        {userProfile?.role === "superadmin" && (
          <button
            onClick={() => { setShowInvite(!showInvite); setTab("membres"); }}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "9px 16px", background: showInvite ? t.surface2 : t.accentBg, border: showInvite ? `1px solid ${t.border}` : `1px solid ${t.accentBd}`,
              borderRadius: "9px", fontSize: "12px", fontWeight: "700", color: showInvite ? t.text : t.accent, cursor: "pointer", transition: "all 0.2s"
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
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {showInvite && userProfile?.role === "superadmin" && (
            <div className="animate-slide-down" style={{ background: t.surface, border: `1px dashed ${t.accentBd}`, borderLeft: `3px solid ${t.accent}`, borderRadius: "12px", padding: "20px 22px", boxShadow: t.shadowSm }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "17px", color: t.text }}>Inviter un nouveau membre</div>
                  <div style={{ fontSize: "10px", color: t.text3, marginTop: "2px" }}>Un mot de passe temporaire est défini — l'utilisateur devra le changer à la première connexion.</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px 150px 160px", gap: "10px", alignItems: "end" }}>
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
                <div>
                  <label style={{ fontSize: "9px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: "5px" }}>Établissement</label>
                  <select
                    value={newMember.ifsi || selectedIfsi} onChange={e => setNewMember({ ...newMember, ifsi: e.target.value })}
                    style={{ width: "100%", padding: "9px 10px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "12px", color: t.text, outline: "none", cursor: "pointer" }}
                  >
                    {ifsiList.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleCreateUser} disabled={isCreatingUser || !newMember.email || !newMember.pwd}
                  style={{
                    padding: "9px 14px", background: t.accent, border: "none", borderRadius: "8px",
                    color: "white", fontSize: "11px", fontWeight: "700", height: "35px",
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

          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${t.border}`, display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", background: t.surface2 }}>
              <input
                value={teamSearchTerm} onChange={e => setTeamSearchTerm(e.target.value)}
                placeholder="Nom, email…"
                style={{ width: "200px", padding: "6px 10px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "7px", fontSize: "12px", color: t.text, outline: "none", fontFamily: "inherit" }}
              />
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
                    }}>{r === "tous" ? "Tous" : ROLE_CFG[r]?.label}</button>
                  );
                })}
              </div>
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
                    }}>{s === "tous" ? "Tous statuts" : STATUS_CFG[s]?.label}</button>
                  );
                })}
              </div>
              <span style={{ marginLeft: "auto", fontSize: "10px", color: t.text3 }}>
                <strong style={{ color: t.text2 }}>{filteredUsers.length}</strong> membres
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 90px 140px 110px", padding: "8px 18px", background: t.surface2, borderBottom: `1px solid ${t.border}` }}>
              {["Membre", "Rôle", "Statut", "Dernière connexion", "Actions"].map(h => (
                <span key={h} style={{ fontSize: "9px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "0.7px", textAlign: h==="Actions"?"right":"left" }}>{h}</span>
              ))}
            </div>

            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              {filteredUsers.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: t.text3, fontSize: "13px", fontStyle: "italic" }}>Aucun utilisateur trouvé.</div>
              ) : filteredUsers.map(u => {
                const rCfg  = ROLE_CFG[u.role]   || ROLE_CFG.user;
                const sCfg  = STATUS_CFG[u.status] || STATUS_CFG.ACTIF;
                const rSc   = sc(t, rCfg.colorKey);
                const sSc   = sc(t, sCfg.colorKey);
                const init  = (u.email || "?").charAt(0).toUpperCase();
                const lastLogin = u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Jamais";

                return (
                  <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2fr 100px 90px 140px 110px", padding: "11px 18px", borderBottom: `1px solid ${t.border2}`, alignItems: "center", transition: "background 0.1s" }} onMouseOver={e => e.currentTarget.style.background = t.surface2} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${rSc.c}20`, border: `1px solid ${rSc.bd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", color: rSc.c, flexShrink: 0 }}>{init}</div>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: t.text }}>{u.email}</div>
                        {u.etablissementId && u.etablissementId !== selectedIfsi && (
                          <div style={{ fontSize: "9px", color: t.text3 }}>{ifsiList.find(i => i.id === u.etablissementId)?.name || u.etablissementId}</div>
                        )}
                      </div>
                    </div>
                    <span style={{ background: rSc.bg, border: `1px solid ${rSc.bd}`, color: rSc.c, fontSize: "9px", fontWeight: "800", padding: "2px 8px", borderRadius: "20px", width: "fit-content" }}>{rCfg.icon} {rCfg.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: sSc.c, boxShadow: u.status === "ACTIF" ? `0 0 6px ${sSc.c}` : "none" }} />
                      <span style={{ fontSize: "10px", fontWeight: "600", color: sSc.c }}>{sCfg.label}</span>
                    </div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: t.text3 }}>{lastLogin}</span>
                    <div style={{ display: "flex", gap: "5px", justifyContent: "flex-end" }}>
                      <button onClick={() => handleSendResetEmail(u.email)} title="Réinitialiser le mot de passe" style={{ width: "26px", height: "26px", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: "6px", cursor: "pointer", fontSize: "11px", color: t.text2, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }} onMouseOver={e => { e.currentTarget.style.borderColor = t.accentBd; e.currentTarget.style.color = t.accent; }} onMouseOut={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.text2; }}>🔑</button>
                      <button onClick={() => handleToggleStatus(u)} title={u.status === "ACTIF" ? "Suspendre le compte" : "Réactiver le compte"} style={{ width: "26px", height: "26px", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: "6px", cursor: "pointer", fontSize: "11px", color: t.text2, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }} onMouseOver={e => { e.currentTarget.style.borderColor = t.amberBd; e.currentTarget.style.color = t.amber; }} onMouseOut={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.text2; }}>{u.status === "ACTIF" ? "⏸️" : "▶️"}</button>
                      {userProfile?.role === "superadmin" && (
                        <button onClick={() => setConfirmDel(u)} title="Supprimer l'accès" style={{ width: "26px", height: "26px", background: t.redBg, border: `1px solid ${t.redBd}`, borderRadius: "6px", cursor: "pointer", fontSize: "11px", color: t.red, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ONGLET 2 — ÉTABLISSEMENT 
      ══════════════════════════════════════════════════ */}
      {tab === "etablissement" && (
        <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>

          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: t.shadowSm }}>
            <div style={{ padding: "13px 18px", borderBottom: `1px solid ${t.border}`, background: t.surface2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "16px", color: t.text }}>Identité & Configurations</span>
              {etabDirty && !etabSaved && (
                <span style={{ background: t.amberBg, border: `1px solid ${t.amberBd}`, color: t.amber, fontSize: "9px", fontWeight: "800", padding: "2px 7px", borderRadius: "5px" }}>
                  Modifications non sauvegardées
                </span>
              )}
              {etabSaved && (
                <span style={{ background: t.greenBg, border: `1px solid ${t.greenBd}`, color: t.green, fontSize: "9px", fontWeight: "800", padding: "2px 7px", borderRadius: "5px" }}>
                  ✓ Sauvegardé
                </span>
              )}
            </div>

            {etabForm ? (
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "24px" }}>
                
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Informations générales</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ gridColumn: "1/-1" }}>
                      <Field label="Nom de l'établissement" value={etabForm.nom} onChange={e => updateEtabField("nom", e.target.value)} t={t} />
                    </div>
                    <Field label="Directrice / Directeur"    value={etabForm.directrice} onChange={e => updateEtabField("directrice", e.target.value)} t={t} />
                    <Field label="Téléphone"                 value={etabForm.tel}        onChange={e => updateEtabField("tel",        e.target.value)} type="tel" t={t} />
                    <div style={{ gridColumn: "1/-1" }}>
                      <Field label="Adresse email contact"   value={etabForm.email}      onChange={e => updateEtabField("email",      e.target.value)} type="email" t={t} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <Field label="Adresse postale complète"value={etabForm.adresse}    onChange={e => updateEtabField("adresse",    e.target.value)} t={t} />
                    </div>
                  </div>
                </div>

                <hr style={{ border:0, borderTop:`1px dashed ${t.border}` }} />

                <div>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Qualiopi</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ gridColumn: "1/-1" }}>
                      <Field label="N° NDA (Numéro de Déclaration d'Activité)" value={etabForm.nda} onChange={e => updateEtabField("nda", e.target.value)} t={t} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <Field label="N° Certification Qualiopi" value={etabForm.certif} onChange={e => updateEtabField("certif", e.target.value)} t={t} />
                    </div>
                    <Field label="Date d'obtention initiale" value={etabForm.dateCertif} onChange={e => updateEtabField("dateCertif", e.target.value)} type="date" t={t} />
                    <Field label="Date d'audit prévue"       value={etabForm.dateAudit}  onChange={e => updateEtabField("dateAudit",  e.target.value)} type="date" t={t} />
                  </div>
                </div>

                <hr style={{ border:0, borderTop:`1px dashed ${t.border}` }} />

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "800", color: t.text3, textTransform: "uppercase", letterSpacing: "1px" }}>
                      Agréments & Autorisations
                    </span>
                    <button onClick={() => updateEtabField("agrements", [...etabForm.agrements, { l: "", v: "", k: "green" }])}
                      style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text, padding: "4px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: "700", cursor: "pointer" }}
                    >
                      + Ajouter
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {etabForm.agrements.map((ag, i) => (
                      <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input value={ag.l} onChange={e => { const newAg = [...etabForm.agrements]; newAg[i].l = e.target.value; updateEtabField("agrements", newAg); }}
                          placeholder="Nom (ex: ARS)"
                          style={{ flex: 1, padding: "8px 10px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "6px", fontSize: "11px", color: t.text, outline: "none" }}
                        />
                        <input value={ag.v} onChange={e => { const newAg = [...etabForm.agrements]; newAg[i].v = e.target.value; updateEtabField("agrements", newAg); }}
                          placeholder="Valeur (ex: 150 places)"
                          style={{ flex: 1, padding: "8px 10px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "6px", fontSize: "11px", color: t.text, outline: "none" }}
                        />
                        <select value={ag.k} onChange={e => { const newAg = [...etabForm.agrements]; newAg[i].k = e.target.value; updateEtabField("agrements", newAg); }}
                          style={{ width: "95px", padding: "8px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "6px", fontSize: "11px", color: t.text, outline: "none", cursor:"pointer" }}
                        >
                          <option value="green">Succès</option>
                          <option value="amber">Alerte</option>
                          <option value="red">Erreur</option>
                        </select>
                        <button onClick={() => { const newAg = etabForm.agrements.filter((_, idx) => idx !== i); updateEtabField("agrements", newAg); }}
                          style={{ background: t.redBg, border: `1px solid ${t.redBd}`, color: t.red, width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink:0 }}
                        >✕</button>
                      </div>
                    ))}
                    {etabForm.agrements.length === 0 && (
                       <div style={{ fontSize: "11px", color: t.text3, fontStyle: "italic", padding:"10px 0" }}>Aucun agrément configuré. Cliquez sur + Ajouter.</div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "16px", borderTop: `1px solid ${t.border}` }}>
                  <button
                    onClick={() => { setEtabForm(null); setEtabDirty(false); setTimeout(() => setEtabForm({...ifsiData}), 10); }}
                    style={{ padding: "10px 18px", background: "transparent", border: `1px solid ${t.border}`, borderRadius: "8px", color: t.text2, fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                  >Annuler</button>
                  <button
                    onClick={saveEtab} disabled={!etabDirty || etabSaving}
                    style={{ padding: "10px 24px", background: t.accent, border: "none", borderRadius: "8px", color: "white", fontSize: "12px", fontWeight: "700", cursor: !etabDirty ? "not-allowed" : "pointer", opacity: !etabDirty ? 0.5 : 1, boxShadow: `0 4px 12px ${t.accentBd}` }}
                  >{etabSaving ? "Sauvegarde…" : "💾 Enregistrer les modifications"}</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: t.text3, fontSize: "12px" }}>Chargement des données…</div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: t.goldBg, border: `1px solid ${t.goldBd}`, borderRadius: "12px", padding: "20px", boxShadow: `0 4px 16px ${t.goldBd}` }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: t.gold, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Certification Qualiopi</div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "18px", color: t.text, marginBottom: "4px" }}>{etabForm?.certif || "Non renseigné"}</div>
              <div style={{ fontSize: "11px", color: t.text3, marginBottom: "12px" }}>
                Prochain audit prévu le {etabForm?.dateAudit ? new Date(etabForm.dateAudit).toLocaleDateString("fr-FR", {day:'numeric', month:'long', year:'numeric'}) : "—"}
              </div>
              <div style={{ height: "4px", background: `rgba(212,160,48,0.15)`, borderRadius: "2px", marginBottom: "6px" }}>
                <div style={{ width: "62%", height: "100%", background: `linear-gradient(90deg,${t.gold},#f0c060)`, borderRadius: "2px" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: t.gold, fontWeight: "700" }}>
                <span>Délivré {etabForm?.dateCertif ? formatMonthYear(etabForm.dateCertif) : "—"}</span>
                <span>Renouvellement {etabForm?.dateAudit ? formatMonthYear(etabForm.dateAudit) : "—"}</span>
              </div>
            </div>

            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "16px", boxShadow: t.shadowSm }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "16px", color: t.text, marginBottom: "12px" }}>Agréments & Autorisations</div>
              
              {etabForm?.agrements?.length === 0 ? (
                 <div style={{ fontSize:"11px", color:t.text3, fontStyle:"italic" }}>Aucun agrément à afficher.</div>
              ) : (
                etabForm?.agrements?.map((ag, idx) => {
                  const { c, bg, bd } = sc(t, ag.k || "green");
                  return (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: idx === etabForm.agrements.length - 1 ? "none" : `1px solid ${t.border2}` }}>
                      <span style={{ fontSize: "12px", color: t.text2, fontWeight:"500" }}>{ag.l || "Sans nom"}</span>
                      <span style={{ background: bg, border: `1px solid ${bd}`, color: c, fontSize: "10px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px" }}>{ag.v || "—"}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ONGLET 3 — MÉDIATHÈQUE 
      ══════════════════════════════════════════════════ */}
      {tab === "mediatheque" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div style={{ background: t.accentBg, border: `1px solid ${t.accentBd}`, borderRadius: "10px", padding: "14px 18px", display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "20px" }}>🛡️</span>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "800", color: t.accent, marginBottom: "2px" }}>Rappel de Confidentialité & RGPD</div>
              <div style={{ fontSize: "11px", color: t.text2, lineHeight: "1.4" }}>
                Cet espace est partagé avec toute l'équipe. Veillez à ne déposer <strong>aucune donnée personnelle sensible, médicale ou non anonymisée</strong> (dossiers de patients, notes nominatives d'étudiants, etc.).
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={docSearch} onChange={e => setDocSearch(e.target.value)}
              placeholder="Rechercher un document…"
              style={{ width: "220px", padding: "8px 12px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "12px", color: t.text, outline: "none", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: "6px", flexWrap:"wrap" }}>
              {["tous", ...DOC_CATS].map(c => {
                const cc = CAT_COLORS[c];
                return (
                  <button key={c} onClick={() => setDocCatFilter(c)} style={{
                    padding: "6px 12px", borderRadius: "6px", cursor: "pointer",
                    border: `1px solid ${docCatFilter === c ? (cc ? cc.c + "60" : t.accentBd) : t.border}`,
                    background: docCatFilter === c ? (cc ? cc.bg : t.surface) : "transparent",
                    color: docCatFilter === c ? (cc ? cc.c : t.text2) : t.text2,
                    fontSize: "11px", fontWeight: "700", transition: "all 0.12s",
                  }}>{c === "tous" ? "Tout" : c}</button>
                );
              })}
            </div>

            <div style={{ marginLeft: "auto" }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: "8px 16px", background: t.accent, color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer", boxShadow: `0 4px 12px ${t.accentBd}` }}
              >+ Déposer un document</button>
              <input ref={fileInputRef} type="file" hidden accept=".pdf,.docx,.xlsx,.pptx,.jpg,.png"
                onChange={e => { if (e.target.files[0]) handleFileSelect(e.target.files[0]); e.target.value = ""; }} />
            </div>
          </div>

          {uploadProgress !== null && (
            <div style={{ background: t.accentBg, border: `1px solid ${t.accentBd}`, borderRadius: "8px", padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: t.accent, marginBottom: "6px", fontWeight:"700" }}>
                <span>Envoi en cours…</span><span>{uploadProgress}%</span>
              </div>
              <div style={{ height: "4px", background: t.border, borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: `${uploadProgress}%`, height: "100%", background: `linear-gradient(90deg,${t.accent},${t.accent})`, transition: "width 0.3s", borderRadius: "2px" }} />
              </div>
            </div>
          )}

          {filteredDocs.length === 0 ? (
            <div style={{ textAlign: "center", color: t.text3, fontSize: "13px", padding: "40px", background:t.surface, borderRadius:"12px", border:`1px dashed ${t.border}` }}>
              Aucun document ne correspond à vos critères.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "12px" }}>
              {filteredDocs.map(docMeta => {
                const cc = CAT_COLORS[docMeta.cat] || CAT_COLORS["Autre"];
                return (
                  <div key={docMeta.id}
                    style={{ background: t.surface, border: `1px solid ${docMeta.isPreuve ? cc.c+"40" : t.border}`, borderRadius: "12px", padding: "16px", boxShadow: t.shadowSm, transition: "all 0.15s", position:"relative", overflow:"hidden" }}
                    onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = t.shadow; }}
                    onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = t.shadowSm; }}
                  >
                    {docMeta.isPreuve && <div style={{ position:"absolute", top:0, left:0, width:"4px", height:"100%", background:cc.c }} />}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <span style={{ background: cc.bg, color: cc.c, border: `1px solid ${cc.c}30`, fontSize: "9px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px" }}>{docMeta.cat}</span>
                      
                      {docMeta.isPreuve ? (
                        <span style={{ fontSize:"9px", fontWeight:"700", color:t.text3 }}>Indicateur {docMeta.indicNum}</span>
                      ) : (
                        docMeta.validated
                          ? <span style={{ background: t.greenBg, border: `1px solid ${t.greenBd}`, color: t.green, fontSize: "9px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px" }}>✓ Validé</span>
                          : <span style={{ background: t.amberBg, border: `1px solid ${t.amberBd}`, color: t.amber, fontSize: "9px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px" }}>En attente</span>
                      )}
                    </div>
                    
                    <div style={{ fontSize: "13px", fontWeight: "700", color: t.text, lineHeight: "1.4", marginBottom: "6px", wordBreak:"break-word" }}>{docMeta.name}</div>
                    <div style={{ fontSize: "10px", color: t.text3, marginBottom: "12px" }}>{docMeta.author} · {docMeta.size} · {formatMonthYear(docMeta.date)}</div>
                    
                    <div style={{ display: "flex", gap: "6px" }}>
                      <a href={docMeta.downloadURL} target="_blank" rel="noreferrer"
                        style={{ flex: 1, padding: "7px", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: "6px", color: t.text, fontSize: "11px", fontWeight: "700", cursor: "pointer", textAlign: "center", textDecoration: "none", transition:"all 0.2s" }}
                        onMouseOver={e=>e.currentTarget.style.borderColor=t.accent} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}
                      >
                        👁 Ouvrir
                      </a>

                      {!docMeta.isPreuve && (
                        <>
                          <button onClick={() => setEditDocModal(docMeta)} title="Renommer / Modifier"
                            style={{ width: "32px", padding: "7px", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: "6px", color: t.text2, fontSize: "12px", cursor: "pointer", transition:"all 0.2s" }}
                            onMouseOver={e=>e.currentTarget.style.borderColor=t.accent} onMouseOut={e=>e.currentTarget.style.borderColor=t.border}
                          >
                            ✏️
                          </button>
                          <button onClick={() => handleDeleteDoc(docMeta)} title="Supprimer"
                            style={{ width: "32px", padding: "7px", background: t.redBg, border: `1px solid ${t.redBd}`, borderRadius: "6px", color: t.red, fontSize: "11px", cursor: "pointer", transition:"all 0.2s" }}
                            onMouseOver={e=>{e.currentTarget.style.background=t.red; e.currentTarget.style.color="white";}} onMouseOut={e=>{e.currentTarget.style.background=t.redBg; e.currentTarget.style.color=t.red;}}
                          >
                            ✕
                          </button>
                        </>
                      )}
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
      ══════════════════════════════════════════════════ */}
      {tab === "journal" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
        <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "16px 18px", boxShadow: t.shadowSm }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "15px", color: t.text, marginBottom: "12px" }}>🎨 Affichage (Local)</div>
            {[
              { l: "Thème sombre",   sub: "Interface Midnight Authority", val: isDarkMode,      set: () => setIsDarkMode(v => !v)      },
            ].map(p => (
              <div key={p.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.border2}` }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: t.text, marginBottom: "4px" }}>{p.l}</div>
                  <div style={{ fontSize: "12px", color: t.text2 }}>{p.sub}</div>
                </div>
                <Toggle val={p.val} onChange={p.set} t={t} />
              </div>
            ))}
          </div>

          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "16px 18px", boxShadow: t.shadowSm }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "15px", color: t.text, marginBottom: "12px" }}>📤 Exports qualitatifs</div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${t.border2}` }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "600", color: t.text }}>Export Excel des indicateurs</div>
                <div style={{ fontSize: "9px", color: t.text3 }}>Tableau de bord complet avec couleurs</div>
              </div>
              <button onClick={handleExportExcel} style={{ padding: "5px 11px", background: t.greenBg, border: `1px solid ${t.greenBd}`, color: t.green, borderRadius: "6px", fontSize: "9px", fontWeight: "700", cursor: "pointer" }}>Exporter XLS</button>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${t.border2}` }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "600", color: t.text }}>Export JSON brut</div>
                <div style={{ fontSize: "9px", color: t.text3 }}>Toutes les données Qualiopi</div>
              </div>
              <button onClick={handleExportJson} style={{ padding: "5px 11px", background: t.accentBg, border: `1px solid ${t.accentBd}`, color: t.accent, borderRadius: "6px", fontSize: "9px", fontWeight: "700", cursor: "pointer" }}>Exporter JSON</button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CompteTab
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

      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden", boxShadow: t.shadowSm }}>
        <div style={{ padding: "16px 24px", background: t.surface2, borderBottom: `1px solid ${t.border}` }}>
          <span style={{ fontSize: "14px", fontWeight: "800", color: t.text }}>🔒 Sécurité du compte</span>
        </div>
        <div style={{ padding: "24px" }}>
          <div style={{ fontSize: "12px", color: t.text2, marginBottom: "18px" }}>La réauthentification avec votre mot de passe actuel est requise.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "480px" }}>

            <div>
              <label style={{ fontSize: "10px", fontWeight: "700", color: t.text3, textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: "5px" }}>Mot de passe actuel</label>
              <input
                type="password" value={pwdCurrent} onChange={e => setPwdCurrent(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.surface2, color: t.text, outline: "none", fontSize: "13px", fontFamily: "inherit" }}
              />
            </div>

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

    </div>
  );
}
