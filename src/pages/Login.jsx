import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Email or password incorrect");
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100svh", padding: 24, background: "var(--bg)" }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <span style={{ fontSize: 40 }}>🏉</span>
        <h1 style={{ margin: "8px 0 4px" }}>Rugby Analytics</h1>
        <p>Match tracking and analytics</p>
      </div>
      <div className="card" style={{ width: "100%", maxWidth: 380, padding: 28 }}>
        <h2 style={{ marginBottom: 20 }}>Log in</h2>
        {error && <p style={{ color: "var(--red)", marginBottom: 14, fontSize: 13 }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%" }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "9px 0", background: "var(--blue)", color: "#fff", border: "none", borderRadius: "var(--r-sm)", fontWeight: 600 }}>
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: "center" }}>
          No account? <Link to="/register" style={{ color: "var(--blue)" }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
