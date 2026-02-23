import { useState, useEffect } from "react";

const MOT_DE_PASSE = "Qualiopi2025!";
const NOM_ETABLISSEMENT = "IFSI du CHAM";

const RESPONSABLES = [
  "Non defini",
  "RETARDATO Clementine (Directrice des soins)",
  "TZOTZIS Christelle (Coordinatrice pedagogique)",
  "AUBRY Guillaume (Formateur 1A)",
  "BRASSINE Deborah (Formatrice 3A)",
  "CHARLES Valerie (Formatrice 2A)",
  "LEROY Sandra (Formatrice 1A)",
  "HEGO Coralie (Formatrice 2A)",
  "KERBIDI Julie (Formatrice 1A)",
  "LAFONT Laura (Formatrice 1A)",
  "MARTIN Audrey (Formatrice 1A - Ref. ABS)",
  "LA GUMINA Samantha (Formatrice 3A)",
  "MONTAINT Sophie (Formatrice 3A)",
  "SONVEAU Marie-Cecile (Formatrice 3A)",
  "JOUBAUD Virginie (Formatrice 2A)",
  "KRYLYSCHIN Virginie (Formatrice 2A)",
  "CARRE Joris (Documentaliste)",
  "QUAAK Jan (Referent TICE)",
  "HURTER Nathalie (Secretaire)",
  "MAITREHUT Irene (Secretaire)",
  "MELITO SAIHI Melanie (Secretaire)",
  "RATTEZ Eva (Secretaire)",
];

const CRITERES_DATA = [
  // CRITERE 1
  { id: 1, num: "1.1", critere: 1, titre: "Publicite des prestations et conditions d'acces", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Informations claires et accessibles sur les prestations, publics vises, prerequis, modalites et delais d'acces.", preuves: "" },
  { id: 2, num: "1.2", critere: 1, titre: "Communication sur les resultats obtenus", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Taux de reussite aux certifications, taux d'insertion professionnelle, taux de satisfaction rendus publics.", preuves: "" },
  { id: 3, num: "1.3", critere: 1, titre: "Information sur l'accessibilite aux personnes handicapees", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Coordonnees du referent handicap diffusees, informations sur les adaptations possibles.", preuves: "" },
  { id: 4, num: "1.4", critere: 1, titre: "Tarifs et modalites de financement", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Tarifs et conditions de financement clairement affiches et accessibles avant toute inscription.", preuves: "" },
  { id: 5, num: "1.5", critere: 1, titre: "Delais d'acces a la formation", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Delais d'acces precises et mis a jour regulierement sur tous les supports de communication.", preuves: "" },
  // CRITERE 2
  { id: 6, num: "2.1", critere: 2, titre: "Analyse des besoins des beneficiaires", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Processus formalisé d'analyse des besoins individuels avant entree en formation (entretien, questionnaire...).", preuves: "" },
  { id: 7, num: "2.2", critere: 2, titre: "Objectifs operationnels et evaluables", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Objectifs de formation clairement definis, mesurables et communicates aux apprenants.", preuves: "" },
  { id: 8, num: "2.3", critere: 2, titre: "Contenus et modalites pedagogiques adaptes", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Programme pedagogique en adequation avec les objectifs, les publics et les modalites d'apprentissage retenues.", preuves: "" },
  { id: 9, num: "2.4", critere: 2, titre: "Modalites d'evaluation des acquis", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Evaluations tout au long du parcours et en fin de formation permettant de mesurer l'atteinte des objectifs.", preuves: "" },
  // CRITERE 3
  { id: 10, num: "3.1", critere: 3, titre: "Positionnement des beneficiaires a l'entree", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Evaluation initiale des acquis et competences de chaque apprenant a l'entree en formation.", preuves: "" },
  { id: 11, num: "3.2", critere: 3, titre: "Adaptation des parcours", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Parcours individualises ou modules adaptes selon les resultats du positionnement.", preuves: "" },
  { id: 12, num: "3.3", critere: 3, titre: "Accompagnement des beneficiaires", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Dispositif d'accompagnement et de suivi tout au long du parcours (referent pedagogique, entretiens...).", preuves: "" },
  { id: 13, num: "3.4", critere: 3, titre: "Accessibilite et compensation du handicap", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Amenagements et compensations mis en place pour les apprenants en situation de handicap.", preuves: "" },
  // CRITERE 4
  { id: 14, num: "4.1", critere: 4, titre: "Coordination pedagogique assuree", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Responsable pedagogique identifie, reunions de coordination, planification des interventions.", preuves: "" },
  { id: 15, num: "4.2", critere: 4, titre: "Ressources pedagogiques mobilisees", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Ressources documentaires, numeriques et materielles suffisantes et accessibles aux apprenants.", preuves: "" },
  { id: 16, num: "4.3", critere: 4, titre: "Environnement numerique adapte", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Outils numeriques disponibles et fonctionnels (ENT, Moodle, visioconference...) adaptes aux besoins.", preuves: "" },
  { id: 17, num: "4.4", critere: 4, titre: "Locaux et equipements adaptes", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Salles de cours, laboratoires, salles de simulation conformes aux exigences de la formation.", preuves: "" },
  { id: 18, num: "4.5", critere: 4, titre: "Encadrement et suivi des stages", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Conventionnement avec les terrains de stage, suivi des apprenants en stage, livret d'encadrement.", preuves: "" },
  { id: 19, num: "4.6", critere: 4, titre: "Sous-traitance et partenariats", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Partenariats formalises, sous-traitants identifies et controles quant a la qualite de leurs interventions.", preuves: "" },
  // CRITERE 5
  { id: 20, num: "5.1", critere: 5, titre: "Qualification des intervenants", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "CV, diplomes et titres des formateurs en adequation avec les modules enseignes, tenus a jour.", preuves: "" },
  { id: 21, num: "5.2", critere: 5, titre: "Developpement des competences des formateurs", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Plan de developpement des competences annuel, formations suivies, traces des actions realisees.", preuves: "" },
  { id: 22, num: "5.3", critere: 5, titre: "Integration des nouveaux intervenants", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Processus d'accueil et d'integration formalise pour tout nouvel intervenant (livret, tutorat...).", preuves: "" },
  { id: 23, num: "5.4", critere: 5, titre: "Veille legale et reglementaire", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Dispositif de veille operationnel, traces des mises a jour effectuees suite a evolutions reglementaires.", preuves: "" },
  // CRITERE 6
  { id: 24, num: "6.1", critere: 6, titre: "Veille sur les evolutions du secteur", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Participation a des instances professionnelles, suivi des evolutions metiers, adaptation des contenus.", preuves: "" },
  { id: 25, num: "6.2", critere: 6, titre: "Partenariats avec l'environnement professionnel", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Conventions de partenariat signees avec etablissements de sante, employeurs, universites...", preuves: "" },
  { id: 26, num: "6.3", critere: 6, titre: "Insertion professionnelle des apprenants", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Suivi de l'insertion a 6 mois, taux d'emploi, outils d'aide a l'insertion mis en place.", preuves: "" },
  { id: 27, num: "6.4", critere: 6, titre: "Contribution a l'environnement", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Actions de rayonnement (journees portes ouvertes, interventions externes, publications...).", preuves: "" },
  { id: 28, num: "6.5", critere: 6, titre: "Pratiques ecoresponsables", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Demarche RSE engagee, bilan carbone, actions en faveur du developpement durable documentees.", preuves: "" },
  // CRITERE 7
  { id: 29, num: "7.1", critere: 7, titre: "Recueil des appreciations", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Enquetes de satisfaction regulieres aupres des apprenants, employeurs et intervenants, resultats analyses.", preuves: "" },
  { id: 30, num: "7.2", critere: 7, titre: "Traitement des reclamations", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Procedure de reclamation formalisee, accessible, tracee et avec suivi des reponses apportees.", preuves: "" },
  { id: 31, num: "7.3", critere: 7, titre: "Mesures d'amelioration mises en oeuvre", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Plan d'amelioration continue documente, actions realisees tracees, bilan annuel qualite produit.", preuves: "" },
  { id: 32, num: "7.4", critere: 7, titre: "Analyse des causes d'abandon", responsable: "Non defini", delai: "2025-12-31", statut: "non-evalue", notes: "", attendus: "Suivi et analyse des ruptures de parcours, actions correctives mises en place et evaluees.", preuves: "" },
];

const CRITERES_LABELS = {
  1: { label: "Information du public", color: "#3B82F6" },
  2: { label: "Identification des objectifs", color: "#8B5CF6" },
  3: { label: "Adaptation aux publics", color: "#EC4899" },
  4: { label: "Moyens pedagogiques", color: "#F59E0B" },
  5: { label: "Qualification du personnel", color: "#10B981" },
  6: { label: "Environnement professionnel", color: "#06B6D4" },
  7: { label: "Appreciations et reclamations", color: "#EF4444" },
};

const STATUT_CONFIG = {
  "non-evalue": { label: "Non evalue", color: "#64748b", bg: "#f1f5f9", icon: "?" },
  "conforme":   { label: "Conforme",   color: "#10B981", bg: "#D1FAE5", icon: "V" },
  "en-cours":   { label: "En cours",   color: "#F59E0B", bg: "#FEF3C7", icon: "~" },
  "non-conforme":{ label: "Non conforme", color: "#EF4444", bg: "#FEE2E2", icon: "X" },
};

// ── LOGIN ──────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  function submit() {
    if (pwd === MOT_DE_PASSE) { onLogin(); }
    else { setError(true); setShake(true); setTimeout(() => setShake(false), 500); setTimeout(() => setError(false), 3000); setPwd(""); }
  }
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#020817,#1e1b4b,#020817)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Outfit,sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
      <div style={{ background:"linear-gradient(135deg,#0f172a,#1a1f3a)", border:"1px solid #1e3a5f", borderRadius:"24px", padding:"48px 40px", width:"100%", maxWidth:"400px", textAlign:"center", animation:shake?"shake 0.4s ease":"none" }}>
        <div style={{ width:"64px", height:"64px", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", borderRadius:"18px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"30px", margin:"0 auto 20px" }}>🎓</div>
        <div style={{ fontSize:"22px", fontWeight:"800", background:"linear-gradient(90deg,#60a5fa,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:"4px" }}>Qualiopi Tracker</div>
        <div style={{ fontSize:"13px", color:"#64748b", marginBottom:"8px" }}>{NOM_ETABLISSEMENT}</div>
        <div style={{ fontSize:"11px", color:"#334155", marginBottom:"32px", background:"#0f172a", borderRadius:"8px", padding:"8px 12px" }}>Acces securise — Donnees confidentielles RGPD</div>
        <div style={{ textAlign:"left", marginBottom:"16px" }}>
          <label style={{ fontSize:"11px", color:"#94a3b8", textTransform:"uppercase", letterSpacing:"1px", fontWeight:"700" }}>Mot de passe</label>
          <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Saisir le mot de passe" autoFocus
            style={{ display:"block", width:"100%", marginTop:"8px", background:"#1e293b", border:`1px solid ${error?"#EF4444":"#334155"}`, borderRadius:"10px", color:"#e2e8f0", padding:"12px 16px", fontSize:"14px", outline:"none", boxSizing:"border-box" }}/>
          {error&&<div style={{ fontSize:"12px", color:"#EF4444", marginTop:"6px" }}>Mot de passe incorrect</div>}
        </div>
        <button onClick={submit} style={{ width:"100%", padding:"13px", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", border:"none", borderRadius:"10px", color:"white", fontSize:"14px", fontWeight:"700", cursor:"pointer" }}>Acceder au tableau de bord</button>
      </div>
    </div>
  );
}

// ── UI COMPONENTS ──────────────────────────────────────────────────────────────
function GaugeChart({ value, max, color }) {
  const pct=(value/max)*100, r=36, circ=2*Math.PI*r;
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="#1e293b" strokeWidth="8"/>
      <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={circ-(pct/100)*circ} strokeLinecap="round" transform="rotate(-90 45 45)" style={{transition:"stroke-dashoffset 1s ease"}}/>
      <text x="45" y="48" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{Math.round(pct)}%</text>
    </svg>
  );
}

function StatusBadge({ statut }) {
  const cfg = STATUT_CONFIG[statut];
  return <span style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}40`, borderRadius:"20px", padding:"3px 10px", fontSize:"11px", fontWeight:"700", whiteSpace:"nowrap" }}>{cfg.icon} {cfg.label}</span>;
}

function ProgressBar({ value, max, color }) {
  return <div style={{ background:"#1e293b", borderRadius:"4px", height:"6px", overflow:"hidden" }}><div style={{ width:`${max?((value/max)*100):0}%`, background:color, height:"100%", transition:"width 0.8s ease" }}/></div>;
}

// ── MODAL DETAIL ───────────────────────────────────────────────────────────────
function DetailModal({ critere, onClose, onSave }) {
  const [data, setData] = useState({ ...critere });
  const col = CRITERES_LABELS[critere.critere].color;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }} onClick={onClose}>
      <div style={{ background:"linear-gradient(135deg,#0f172a,#1a1f3a)", border:`1px solid ${col}40`, borderRadius:"20px", padding:"32px", width:"100%", maxWidth:"680px", maxHeight:"90vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:"14px", marginBottom:"24px" }}>
          <span style={{ minWidth:"48px", padding:"4px 10px", background:`${col}20`, color:col, borderRadius:"8px", fontSize:"14px", fontWeight:"800", textAlign:"center", border:`1px solid ${col}40` }}>{critere.num}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"16px", fontWeight:"700", marginBottom:"4px" }}>{critere.titre}</div>
            <div style={{ fontSize:"12px", color:"#64748b" }}>{CRITERES_LABELS[critere.critere].label}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#64748b", fontSize:"22px", cursor:"pointer", lineHeight:1 }}>x</button>
        </div>

        {/* Statut + Responsable + Delai */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px", marginBottom:"20px" }}>
          <div>
            <label style={labelStyle}>Statut</label>
            <select value={data.statut} onChange={e=>setData({...data,statut:e.target.value})} style={selStyle(STATUT_CONFIG[data.statut].color)}>
              {Object.entries(STATUT_CONFIG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Responsable</label>
            <select value={data.responsable} onChange={e=>setData({...data,responsable:e.target.value})} style={selStyle("#3b82f6")}>
              {RESPONSABLES.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Echeance</label>
            <input type="date" value={data.delai} onChange={e=>setData({...data,delai:e.target.value})} style={{ ...inpStyle, width:"100%", boxSizing:"border-box" }}/>
          </div>
        </div>

        {/* Attendus */}
        <div style={{ marginBottom:"16px" }}>
          <label style={labelStyle}>Ce qu'attend l'evaluateur Qualiopi</label>
          <textarea value={data.attendus} onChange={e=>setData({...data,attendus:e.target.value})} rows={3}
            style={{ ...inpStyle, width:"100%", boxSizing:"border-box", resize:"vertical", lineHeight:"1.5" }}/>
        </div>

        {/* Preuves */}
        <div style={{ marginBottom:"16px" }}>
          <label style={labelStyle}>Ce que nous montrerons a l'evaluateur (preuves)</label>
          <textarea value={data.preuves} onChange={e=>setData({...data,preuves:e.target.value})} rows={3} placeholder="Ex: Livret d'accueil, PV de reunion, tableau de bord..."
            style={{ ...inpStyle, width:"100%", boxSizing:"border-box", resize:"vertical", lineHeight:"1.5", borderColor:"#3b82f640" }}/>
        </div>

        {/* Notes */}
        <div style={{ marginBottom:"24px" }}>
          <label style={labelStyle}>Notes internes / commentaires</label>
          <textarea value={data.notes} onChange={e=>setData({...data,notes:e.target.value})} rows={2} placeholder="Remarques, points de vigilance..."
            style={{ ...inpStyle, width:"100%", boxSizing:"border-box", resize:"vertical", lineHeight:"1.5" }}/>
        </div>

        <div style={{ display:"flex", gap:"10px", justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"10px 20px", background:"transparent", border:"1px solid #334155", borderRadius:"8px", color:"#94a3b8", cursor:"pointer", fontSize:"13px" }}>Annuler</button>
          <button onClick={()=>onSave(data)} style={{ padding:"10px 24px", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", border:"none", borderRadius:"8px", color:"white", fontWeight:"700", cursor:"pointer", fontSize:"13px" }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display:"block", fontSize:"11px", color:"#64748b", textTransform:"uppercase", letterSpacing:"1px", fontWeight:"700", marginBottom:"6px" };
const inpStyle = { background:"#1e293b", border:"1px solid #334155", borderRadius:"8px", color:"#e2e8f0", padding:"8px 12px", fontSize:"13px", outline:"none" };
const selStyle = color => ({ background:"#1e293b", border:`1px solid ${color}40`, borderRadius:"8px", color:"#e2e8f0", padding:"8px 12px", fontSize:"12px", width:"100%", outline:"none" });

// ── MAIN APP ───────────────────────────────────────────────────────────────────
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [criteres, setCriteres] = useState(CRITERES_DATA);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterCritere, setFilterCritere] = useState("tous");
  const [filterResp, setFilterResp] = useState("tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalCritere, setModalCritere] = useState(null);

  useEffect(()=>{ if(sessionStorage.getItem("qualiopi_auth")==="ok") setIsLoggedIn(true); },[]);
  function handleLogin(){ sessionStorage.setItem("qualiopi_auth","ok"); setIsLoggedIn(true); }
  function handleLogout(){ sessionStorage.removeItem("qualiopi_auth"); setIsLoggedIn(false); }
  function openModal(c){ setModalCritere(c); }
  function saveModal(updated){ setCriteres(p=>p.map(c=>c.id===updated.id?updated:c)); setModalCritere(null); }

  if(!isLoggedIn) return <LoginPage onLogin={handleLogin}/>;

  const today = new Date();
  const stats = {
    total: criteres.length,
    conforme: criteres.filter(c=>c.statut==="conforme").length,
    enCours: criteres.filter(c=>c.statut==="en-cours").length,
    nonConforme: criteres.filter(c=>c.statut==="non-conforme").length,
    nonEvalue: criteres.filter(c=>c.statut==="non-evalue").length,
  };
  const evaluated = stats.total - stats.nonEvalue;
  const urgents = criteres.filter(c=>(new Date(c.delai)-today)/86400000<=30 && c.statut!=="conforme" && c.statut!=="non-evalue");
  const filtered = criteres.filter(c=>{
    if(filterStatut!=="tous"&&c.statut!==filterStatut) return false;
    if(filterCritere!=="tous"&&c.critere!==parseInt(filterCritere)) return false;
    if(filterResp!=="tous"&&c.responsable!==filterResp) return false;
    if(searchTerm&&!c.titre.toLowerCase().includes(searchTerm.toLowerCase())&&!c.num.includes(searchTerm)) return false;
    return true;
  });
  const axes = criteres.filter(c=>c.statut==="non-conforme"||c.statut==="en-cours").sort((a,b)=>{
    const o={"non-conforme":0,"en-cours":1};
    return (o[a.statut]??2)-(o[b.statut]??2)||new Date(a.delai)-new Date(b.delai);
  });
  const byResp = RESPONSABLES.filter(r=>r!=="Non defini").map(r=>({
    name:r,
    total:criteres.filter(c=>c.responsable===r).length,
    conforme:criteres.filter(c=>c.responsable===r&&c.statut==="conforme").length,
    nonConforme:criteres.filter(c=>c.responsable===r&&c.statut==="non-conforme").length,
    enCours:criteres.filter(c=>c.responsable===r&&c.statut==="en-cours").length,
  })).filter(r=>r.total>0);

  const days = d=>Math.round((new Date(d)-today)/86400000);
  const dayColor = d=>days(d)<0?"#EF4444":days(d)<30?"#F97316":"#64748b";
  const nb = col=>({ minWidth:"42px", padding:"3px 8px", background:`${col}20`, color:col, borderRadius:"6px", fontSize:"12px", fontWeight:"700", textAlign:"center", border:`1px solid ${col}40` });
  const card = { background:"linear-gradient(135deg,#0f172a,#1a1f3a)", border:"1px solid #1e3a5f", borderRadius:"16px", padding:"24px" };
  const navBtn = active=>({ padding:"8px 16px", borderRadius:"8px", border:"none", cursor:"pointer", fontSize:"13px", fontWeight:"600", background:active?"linear-gradient(135deg,#3b82f6,#8b5cf6)":"transparent", color:active?"white":"#94a3b8" });
  const sel = { background:"#1e293b", border:"1px solid #334155", borderRadius:"6px", color:"#e2e8f0", padding:"6px 10px", fontSize:"12px" };
  const th = { textAlign:"left", padding:"10px 12px", fontSize:"10px", fontWeight:"700", color:"#475569", textTransform:"uppercase", letterSpacing:"1px", borderBottom:"1px solid #1e3a5f" };
  const td = { padding:"10px 12px", fontSize:"12px", borderBottom:"1px solid #0f172a", verticalAlign:"middle" };

  return (
    <div style={{ minHeight:"100vh", background:"#020817", fontFamily:"Outfit,sans-serif", color:"#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {modalCritere && <DetailModal critere={modalCritere} onClose={()=>setModalCritere(null)} onSave={saveModal}/>}

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#0f172a,#1e1b4b,#0f172a)", borderBottom:"1px solid #1e3a5f", padding:"0 32px" }}>
        <div style={{ maxWidth:"1400px", margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
            <div style={{ width:"44px", height:"44px", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px" }}>🎓</div>
            <div>
              <div style={{ fontSize:"19px", fontWeight:"800", background:"linear-gradient(90deg,#60a5fa,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>QUALIOPI TRACKER</div>
              <div style={{ fontSize:"12px", color:"#64748b" }}>{NOM_ETABLISSEMENT} · 32 indicateurs · {new Date().toLocaleDateString("fr-FR")}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:"4px", alignItems:"center", flexWrap:"wrap" }}>
            {[["dashboard","Tableau de bord"],["criteres","Indicateurs"],["axes","Axes prioritaires"],["responsables","Responsables"]].map(([t,l])=>(
              <button key={t} style={navBtn(activeTab===t)} onClick={()=>setActiveTab(t)}>{l}</button>
            ))}
            <button onClick={handleLogout} style={{ ...navBtn(false), color:"#475569", fontSize:"11px", marginLeft:"8px", border:"1px solid #1e3a5f" }}>Deconnexion</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:"1400px", margin:"0 auto", padding:"28px 32px" }}>

        {/* ═══ DASHBOARD ═══ */}
        {activeTab==="dashboard" && <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"14px", marginBottom:"24px" }}>
            {[
              ["#64748b", stats.nonEvalue, "Non evalues"],
              ["#10B981", stats.conforme, "Conformes"],
              ["#F59E0B", stats.enCours, "En cours"],
              ["#EF4444", stats.nonConforme, "Non conformes"],
              ["#F97316", urgents.length, "Urgents moins 30j"],
            ].map(([color,num,label])=>(
              <div key={label} style={{ background:`linear-gradient(135deg,${color}15,${color}05)`, border:`1px solid ${color}30`, borderRadius:"14px", padding:"18px 20px" }}>
                <div style={{ fontSize:"32px", fontWeight:"900", color, lineHeight:1 }}>{num}</div>
                <div style={{ fontSize:"11px", color:"#64748b", marginTop:"4px", textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"24px" }}>
            <div style={card}>
              <div style={{ fontSize:"15px", fontWeight:"700", marginBottom:"16px" }}>Score de conformite global</div>
              <div style={{ display:"flex", alignItems:"center", gap:"20px" }}>
                <GaugeChart value={stats.conforme} max={stats.total} color="#3b82f6"/>
                <div style={{ flex:1 }}>
                  {[["Non evalue",stats.nonEvalue,"#64748b"],["Conforme",stats.conforme,"#10B981"],["En cours",stats.enCours,"#F59E0B"],["Non conforme",stats.nonConforme,"#EF4444"]].map(([l,v,col])=>(
                    <div key={l} style={{ marginBottom:"8px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", color:"#64748b", marginBottom:"3px" }}><span>{l}</span><span>{v}/{stats.total}</span></div>
                      <ProgressBar value={v} max={stats.total} color={col}/>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop:"16px", padding:"10px 14px", background:"#0f172a", borderRadius:"8px", fontSize:"12px", color:"#64748b" }}>
                Avancement de l'evaluation : <span style={{ color:"#60a5fa", fontWeight:"700" }}>{evaluated}/{stats.total}</span> indicateurs evalues
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize:"15px", fontWeight:"700", marginBottom:"16px" }}>Score par critere</div>
              {Object.entries(CRITERES_LABELS).map(([num,cfg])=>{
                const cr=criteres.filter(c=>c.critere===parseInt(num));
                const ok=cr.filter(c=>c.statut==="conforme").length;
                const ev=cr.filter(c=>c.statut!=="non-evalue").length;
                return (
                  <div key={num} style={{ marginBottom:"10px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", color:"#94a3b8", marginBottom:"3px" }}>
                      <span>C{num} — {cfg.label}</span>
                      <span style={{ color:cfg.color }}>{ok}/{cr.length} conforme · {ev} evalues</span>
                    </div>
                    <ProgressBar value={ok} max={cr.length} color={cfg.color}/>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Indicateurs non definis */}
          {criteres.filter(c=>c.responsable==="Non defini").length>0 && (
            <div style={{ ...card, marginBottom:"20px", borderColor:"#92400e" }}>
              <div style={{ fontSize:"14px", fontWeight:"700", color:"#fcd34d", marginBottom:"8px" }}>
                A faire : {criteres.filter(c=>c.responsable==="Non defini").length} indicateur(s) sans responsable assigne
              </div>
              <div style={{ fontSize:"12px", color:"#64748b" }}>Cliquez sur "Indicateurs" pour assigner les responsables a chaque critere.</div>
            </div>
          )}

          {urgents.length>0 && (
            <div style={card}>
              <div style={{ fontSize:"15px", fontWeight:"700", marginBottom:"14px" }}>Indicateurs urgents (moins de 30 jours)</div>
              {urgents.map(c=>(
                <div key={c.id} style={{ background:c.statut==="non-conforme"?"#450a0a":"#1c1917", border:`1px solid ${c.statut==="non-conforme"?"#991b1b":"#292524"}`, borderRadius:"10px", padding:"12px 16px", marginBottom:"8px", display:"flex", alignItems:"center", gap:"12px" }}>
                  <span style={nb(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
                  <div style={{ flex:1 }}><div style={{ fontWeight:"600" }}>{c.titre}</div><div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>{c.responsable}</div></div>
                  <StatusBadge statut={c.statut}/>
                  <span style={{ fontSize:"11px", color:dayColor(c.delai), fontWeight:"700" }}>{days(c.delai)<0?`${Math.abs(days(c.delai))}j depasse`:`J-${days(c.delai)}`}</span>
                  <button onClick={()=>openModal(c)} style={{ background:"#1e3a5f", border:"none", borderRadius:"6px", color:"#60a5fa", padding:"4px 10px", fontSize:"11px", cursor:"pointer" }}>Ouvrir</button>
                </div>
              ))}
            </div>
          )}
        </>}

        {/* ═══ INDICATEURS ═══ */}
        {activeTab==="criteres" && <>
          <div style={{ display:"flex", gap:"10px", marginBottom:"20px", flexWrap:"wrap", alignItems:"center" }}>
            <input placeholder="Rechercher..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"6px", color:"#e2e8f0", padding:"6px 12px", fontSize:"13px", width:"180px", outline:"none" }}/>
            <select value={filterStatut} onChange={e=>setFilterStatut(e.target.value)} style={sel}>
              <option value="tous">Tous statuts</option>
              {Object.entries(STATUT_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterCritere} onChange={e=>setFilterCritere(e.target.value)} style={sel}>
              <option value="tous">Tous criteres</option>
              {Object.entries(CRITERES_LABELS).map(([n,c])=><option key={n} value={n}>C{n} — {c.label}</option>)}
            </select>
            <select value={filterResp} onChange={e=>setFilterResp(e.target.value)} style={sel}>
              <option value="tous">Tous responsables</option>
              {RESPONSABLES.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
            <span style={{ fontSize:"12px", color:"#64748b" }}>{filtered.length} indicateur(s)</span>
          </div>
          <div style={card}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["N","Indicateur / Critere","Responsable","Echeance","Statut","Preuves","Action"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(c=>{
                  const col=CRITERES_LABELS[c.critere].color, d=days(c.delai);
                  const hasPreuves = c.preuves && c.preuves.trim().length>0;
                  return (
                    <tr key={c.id} style={{ cursor:"pointer" }} onMouseOver={e=>e.currentTarget.style.background="#1e293b20"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                      <td style={td}><span style={nb(col)}>{c.num}</span></td>
                      <td style={{ ...td, maxWidth:"280px" }}>
                        <div style={{ fontWeight:"600", marginBottom:"2px" }}>{c.titre}</div>
                        <div style={{ fontSize:"11px", color:"#475569" }}>{CRITERES_LABELS[c.critere].label}</div>
                        {c.attendus&&<div style={{ fontSize:"10px", color:"#334155", marginTop:"4px", fontStyle:"italic" }}>Attendu : {c.attendus.substring(0,60)}{c.attendus.length>60?"...":""}</div>}
                      </td>
                      <td style={{ ...td, maxWidth:"180px" }}>
                        <div style={{ fontSize:"11px", color:c.responsable==="Non defini"?"#EF4444":"#94a3b8" }}>
                          {c.responsable==="Non defini"?"A assigner":c.responsable.split("(")[0].trim()}
                        </div>
                        {c.responsable!=="Non defini"&&<div style={{ fontSize:"10px", color:"#475569" }}>({c.responsable.match(/\(([^)]+)\)/)?.[1]||""})</div>}
                      </td>
                      <td style={td}>
                        <div style={{ fontSize:"12px" }}>{new Date(c.delai).toLocaleDateString("fr-FR")}</div>
                        <div style={{ fontSize:"10px", color:dayColor(c.delai) }}>{d<0?`${Math.abs(d)}j depasse`:`J-${d}`}</div>
                      </td>
                      <td style={td}><StatusBadge statut={c.statut}/></td>
                      <td style={td}>
                        {hasPreuves
                          ? <span style={{ fontSize:"10px", color:"#10B981", background:"#10B98115", padding:"2px 8px", borderRadius:"10px", border:"1px solid #10B98130" }}>Renseignees</span>
                          : <span style={{ fontSize:"10px", color:"#64748b" }}>Vide</span>}
                      </td>
                      <td style={td}>
                        <button onClick={()=>openModal(c)} style={{ background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", border:"none", borderRadius:"6px", color:"white", padding:"5px 12px", fontSize:"11px", fontWeight:"700", cursor:"pointer" }}>Editer</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>}

        {/* ═══ AXES PRIORITAIRES ═══ */}
        {activeTab==="axes" && <>
          <div style={{ marginBottom:"20px" }}>
            <h2 style={{ fontSize:"20px", fontWeight:"800", marginBottom:"4px" }}>Axes prioritaires d'amelioration</h2>
            <p style={{ fontSize:"13px", color:"#64748b" }}>{stats.nonConforme} non conforme(s) · {stats.enCours} en cours · triés par priorite et echeance</p>
          </div>
          {axes.filter(c=>c.statut==="non-conforme").length>0&&<>
            <div style={{ fontSize:"12px", color:"#94a3b8", fontWeight:"700", marginBottom:"10px", textTransform:"uppercase", letterSpacing:"1px" }}>Non conformes — Action immediate</div>
            {axes.filter(c=>c.statut==="non-conforme").map(c=>(
              <div key={c.id} style={{ background:"#450a0a", border:"1px solid #991b1b", borderLeft:"4px solid #EF4444", borderRadius:"12px", padding:"14px 18px", marginBottom:"10px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:"12px" }}>
                  <span style={nb(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"14px", fontWeight:"700", marginBottom:"4px" }}>{c.titre}</div>
                    <div style={{ fontSize:"11px", color:"#94a3b8", marginBottom:"6px" }}>{CRITERES_LABELS[c.critere].label}</div>
                    {c.attendus&&<div style={{ fontSize:"11px", color:"#fca5a5", background:"#7f1d1d30", borderRadius:"6px", padding:"6px 10px", marginBottom:"4px" }}>Attendu : {c.attendus}</div>}
                    {c.preuves&&<div style={{ fontSize:"11px", color:"#86efac", background:"#14532d30", borderRadius:"6px", padding:"6px 10px" }}>Preuves : {c.preuves}</div>}
                    {!c.preuves&&<div style={{ fontSize:"11px", color:"#64748b", fontStyle:"italic" }}>Aucune preuve renseignee — cliquez Editer pour ajouter</div>}
                  </div>
                  <div style={{ textAlign:"right", minWidth:"130px" }}>
                    <StatusBadge statut={c.statut}/>
                    <div style={{ fontSize:"11px", color:"#EF4444", marginTop:"6px" }}>{new Date(c.delai).toLocaleDateString("fr-FR")}</div>
                    <div style={{ fontSize:"10px", color:"#F97316" }}>{days(c.delai)<0?`${Math.abs(days(c.delai))}j depasse`:`J-${days(c.delai)}`}</div>
                    <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"4px" }}>{c.responsable.split("(")[0].trim()}</div>
                    <button onClick={()=>openModal(c)} style={{ marginTop:"8px", background:"#1e3a5f", border:"none", borderRadius:"6px", color:"#60a5fa", padding:"4px 10px", fontSize:"11px", cursor:"pointer" }}>Editer</button>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ height:"20px" }}/>
          </>}
          {axes.filter(c=>c.statut==="en-cours").length>0&&<>
            <div style={{ fontSize:"12px", color:"#94a3b8", fontWeight:"700", marginBottom:"10px", textTransform:"uppercase", letterSpacing:"1px" }}>En cours — A finaliser</div>
            {axes.filter(c=>c.statut==="en-cours").map(c=>(
              <div key={c.id} style={{ background:"#1c1205", border:"1px solid #78350f", borderLeft:"4px solid #F59E0B", borderRadius:"12px", padding:"12px 18px", marginBottom:"8px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:"12px" }}>
                  <span style={nb(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"13px", fontWeight:"600", marginBottom:"3px" }}>{c.titre}</div>
                    <div style={{ fontSize:"11px", color:"#64748b" }}>{CRITERES_LABELS[c.critere].label}</div>
                    {c.preuves&&<div style={{ fontSize:"11px", color:"#fcd34d", marginTop:"4px" }}>Preuves : {c.preuves}</div>}
                  </div>
                  <div style={{ textAlign:"right", minWidth:"130px" }}>
                    <StatusBadge statut={c.statut}/>
                    <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"6px" }}>{new Date(c.delai).toLocaleDateString("fr-FR")}</div>
                    <div style={{ fontSize:"10px", color:dayColor(c.delai) }}>{days(c.delai)<0?`${Math.abs(days(c.delai))}j depasse`:`J-${days(c.delai)}`}</div>
                    <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"4px" }}>{c.responsable.split("(")[0].trim()}</div>
                    <button onClick={()=>openModal(c)} style={{ marginTop:"8px", background:"#1e3a5f", border:"none", borderRadius:"6px", color:"#60a5fa", padding:"4px 10px", fontSize:"11px", cursor:"pointer" }}>Editer</button>
                  </div>
                </div>
              </div>
            ))}
          </>}
          {axes.length===0&&<div style={{ ...card, textAlign:"center", padding:"48px" }}>
            <div style={{ fontSize:"40px", marginBottom:"12px" }}>Tous les indicateurs sont conformes</div>
            <div style={{ fontSize:"14px", color:"#64748b" }}>Excellent travail !</div>
          </div>}
        </>}

        {/* ═══ RESPONSABLES ═══ */}
        {activeTab==="responsables" && <>
          <div style={{ marginBottom:"20px" }}>
            <h2 style={{ fontSize:"20px", fontWeight:"800", marginBottom:"4px" }}>Vue par responsable</h2>
            <p style={{ fontSize:"13px", color:"#64748b" }}>Seuls les responsables ayant au moins un indicateur assigne sont affiches</p>
          </div>

          {/* Non definis */}
          {criteres.filter(c=>c.responsable==="Non defini").length>0&&(
            <div style={{ ...card, marginBottom:"20px", borderColor:"#92400e" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"12px" }}>
                <div style={{ width:"44px", height:"44px", borderRadius:"50%", background:"#78350f", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px" }}>?</div>
                <div>
                  <div style={{ fontSize:"15px", fontWeight:"700", color:"#fcd34d" }}>Non assigne</div>
                  <div style={{ fontSize:"12px", color:"#64748b" }}>{criteres.filter(c=>c.responsable==="Non defini").length} indicateur(s) sans responsable</div>
                </div>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                {criteres.filter(c=>c.responsable==="Non defini").map(c=>(
                  <button key={c.id} onClick={()=>openModal(c)} style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"8px", color:"#94a3b8", padding:"6px 12px", fontSize:"12px", cursor:"pointer" }}>
                    {c.num} — {c.titre.substring(0,35)}...
                  </button>
                ))}
              </div>
            </div>
          )}

          {byResp.length===0&&<div style={{ ...card, textAlign:"center", padding:"40px", color:"#64748b" }}>Aucun responsable assigne pour l'instant. Allez dans "Indicateurs" pour assigner.</div>}

          {byResp.map(r=>{
            const myItems=criteres.filter(c=>c.responsable===r.name).sort((a,b)=>({"non-conforme":0,"en-cours":1,"non-evalue":2,"conforme":3}[a.statut]-({"non-conforme":0,"en-cours":1,"non-evalue":2,"conforme":3}[b.statut])));
            const nom=r.name.split("(")[0].trim();
            const role=r.name.match(/\(([^)]+)\)/)?.[1]||"";
            return (
              <div key={r.name} style={{ ...card, marginBottom:"18px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"14px" }}>
                  <div style={{ width:"44px", height:"44px", borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:"800", color:"white", flexShrink:0 }}>
                    {nom.split(" ").map(n=>n[0]).join("").substring(0,2)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"15px", fontWeight:"700" }}>{nom}</div>
                    <div style={{ fontSize:"11px", color:"#64748b" }}>{role}</div>
                  </div>
                  <div style={{ display:"flex", gap:"6px" }}>
                    {[["#10B981",r.conforme,"OK"],["#F59E0B",r.enCours,"EC"],["#EF4444",r.nonConforme,"KO"]].map(([col,val,label])=>(
                      <span key={label} style={{ background:`${col}15`, border:`1px solid ${col}30`, padding:"4px 10px", borderRadius:"8px", textAlign:"center" }}>
                        <span style={{ fontSize:"16px", fontWeight:"800", color:col }}>{val}</span>
                        <span style={{ fontSize:"9px", color:"#64748b", marginLeft:"3px" }}>{label}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <ProgressBar value={r.conforme} max={r.total} color="#3b82f6"/>
                <div style={{ marginTop:"12px" }}>
                  {myItems.map(c=>{
                    const d=days(c.delai);
                    return (
                      <div key={c.id} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"7px 0", borderBottom:"1px solid #0f172a" }}>
                        <span style={nb(CRITERES_LABELS[c.critere].color)}>{c.num}</span>
                        <div style={{ flex:1, fontSize:"12px" }}>{c.titre}</div>
                        <StatusBadge statut={c.statut}/>
                        <div style={{ fontSize:"10px", color:dayColor(c.delai), minWidth:"70px", textAlign:"right" }}>{new Date(c.delai).toLocaleDateString("fr-FR")}</div>
                        <button onClick={()=>openModal(c)} style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"5px", color:"#60a5fa", padding:"2px 8px", fontSize:"10px", cursor:"pointer" }}>Editer</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>}
      </div>
    </div>
  );
}
