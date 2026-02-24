import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase"; // Remarque le "../" pour remonter d'un dossier
import { NOM_ETABLISSEMENT } from "../data";

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
          <div style={{ width: "40px", height: "40px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🎓</div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f" }}>Qualiopi Tracker</div>
        </div>
        <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "6px" }}>{NOM_ETABLISSEMENT}</div>
        <div style={{ fontSize: "11px", color: "#9ca3af", background: "#f9fafb", borderRadius: "6px", padding: "6px 12px", marginBottom: "32px", border: "1px solid #f3f4f6" }}>Accès sécurisé Firebase Auth</div>
        
        <div style={{ textAlign: "left", marginBottom: "16px" }}>
          <label style={{ fontSize: "12px", color: "#374151", fontWeight: "600", display: "block", marginBottom: "6px" }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="direction@ifsi-cham.fr" autoFocus
            style={{ width: "100%", background: "white", border: "1.5px solid #d1d5db", borderRadius: "8px", color: "#1e3a5f", padding: "11px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ textAlign: "left", marginBottom: "24px" }}>
          <label style={{ fontSize: "12px", color: "#374151", fontWeight: "600", display: "block", marginBottom: "6px" }}>Mot de passe</label>
          <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••••••"
            style={{ width: "100%", background: "white", border: `1.5px solid ${error ? "#ef4444" : "#d1d5db"}`, borderRadius: "8px", color: "#1e3a5f", padding: "11px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
          {error && <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "6px" }}>Identifiants incorrects</div>}
        </div>

        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "none", borderRadius: "8px", color: "white", fontSize: "14px", fontWeight: "700", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Connexion..." : "Accéder au tableau de bord"}
        </button>
      </div>
    </div>
  );
}
