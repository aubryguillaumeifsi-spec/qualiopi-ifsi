import React, { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("Identifiants incorrects ou compte inexistant.");
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true); setError(""); setResetMessage("");
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage("✅ Un lien de réinitialisation a été envoyé sur votre boîte mail.");
    } catch (err) {
      setError("Erreur : Vérifiez que l'adresse email est correcte.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "Outfit, sans-serif" }}>
      <div className="animate-fade-in" style={{ background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ width: "60px", height: "60px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <span style={{ fontSize: "28px", color: "white" }}>Q</span>
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "900", color: "#1e3a5f", margin: "0 0 8px" }}>QualiForma</h1>
          <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>Portail de pilotage Qualiopi</p>
        </div>

        {error && <div style={{ background: "#fef2f2", color: "#ef4444", padding: "12px", borderRadius: "8px", fontSize: "13px", marginBottom: "20px", border: "1px solid #fca5a5", textAlign: "center" }}>{error}</div>}
        {resetMessage && <div style={{ background: "#f0fdf4", color: "#166534", padding: "12px", borderRadius: "8px", fontSize: "13px", marginBottom: "20px", border: "1px solid #bbf7d0", textAlign: "center" }}>{resetMessage}</div>}

        {!isResetMode ? (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>Adresse Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", boxSizing: "border-box" }} placeholder="prenom.nom@ifsi.fr" />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#475569" }}>Mot de passe</label>
                <span onClick={() => setIsResetMode(true)} style={{ fontSize: "12px", color: "#1d4ed8", cursor: "pointer", fontWeight: "600" }}>Oublié ?</span>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", boxSizing: "border-box" }} placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer", marginTop: "10px", boxShadow: "0 4px 6px rgba(29, 78, 216, 0.2)" }}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>Email de votre compte</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", boxSizing: "border-box" }} placeholder="Saisissez votre email" />
            </div>
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", background: "#1d4ed8", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>
            <button type="button" onClick={() => { setIsResetMode(false); setResetMessage(""); setError(""); }} style={{ width: "100%", padding: "12px", background: "transparent", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}>
              Retour à la connexion
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
