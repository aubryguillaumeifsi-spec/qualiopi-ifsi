import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase"; 
// On n'importe plus NOM_ETABLISSEMENT ici !

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !pwd) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pwd);
    } catch (err) {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setError(false), 3000);
      setPwd("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f0f4ff,#e8f0fe,#f0f4ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Outfit,sans-serif" }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "48px 44px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.08)", animation: shake ? "shake 0.4s ease" : "none" }}>
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "6px" }}>
          
          {/* LE VRAI LOGO "Q VALIDÉ" */}
          <div style={{ width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="gradLogin" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#1d4ed8"/>
                  <stop offset="1" stopColor="#3b82f6"/>
                </linearGradient>
              </defs>
              <path fillRule="evenodd" clipRule="evenodd" d="M11 2C6.02944 2 2 6.02944 2 11C2 15.9706 6.02944 20 11 20C13.125 20 15.078 19.2635 16.6177 18.0319L20.2929 21.7071C20.6834 22.0976 21.3166 22.0976 21.7071 21.7071C22.0976 21.3166 22.0976 20.6834 21.7071 20.2929L18.0319 16.6177C19.2635 15.078 20 13.125 20 11C20 6.02944 15.9706 2 11 2ZM4 11C4 7.13401 7.13401 4 11 4C14.866 4 18 7.13401 18 11C18 14.866 14.866 18 11 18C7.13401 18 4 14.866 4 11Z" fill="url(#gradLogin)"/>
              <path d="M10.5 15.5L7 12L8.41 10.59L10.5 12.67L14.59 8.59L16 10L10.5 15.5Z" fill="url(#gradLogin)"/>
            </svg>
          </div>
          
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#1e3a5f" }}>QualiForma</div>
        </div>
        
        {/* TEXTE NEUTRE ICI ! */}
        <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "6px", fontWeight: "600" }}>Portail de pilotage qualité</div>
        <div style={{ fontSize: "11px", color: "#9ca3af", background: "#f9fafb", borderRadius: "6px", padding: "6px 12px", marginBottom: "32px", border: "1px solid #f3f4f6" }}>Accès sécurisé</div>
        
        <div style={{ textAlign: "left", marginBottom: "16px" }}>
          <label style={{ fontSize: "12px", color: "#374151", fontWeight: "600", display: "block", marginBottom: "6px" }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre.email@ifsi.fr" autoFocus
            style={{ width: "100%", background: "white", border: "1.5px solid #d1d5db", borderRadius: "8px", color: "#1e3a5f", padding: "11px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ textAlign: "left", marginBottom: "24px" }}>
          <label style={{ fontSize: "12px", color: "#374151", fontWeight: "600", display: "block", marginBottom: "6px" }}>Mot de passe</label>
          <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••••••"
            style={{ width: "100%", background: "white", border: `1.5px solid ${error ? "#ef4444" : "#d1d5db"}`, borderRadius: "8px", color: "#1e3a5f", padding: "11px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
          {error && <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "6px" }}>Identifiants incorrects</div>}
        </div>

        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "none", borderRadius: "8px", color: "white", fontSize: "14px", fontWeight: "700", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </div>
    </div>
  );
}
