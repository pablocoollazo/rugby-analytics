import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { createClub, joinClub, getUnlinkedPlayers, linkPlayerToUser } from "../utils/firestore";

export default function Register() {
  const { register, reloadClub, user } = useAuth();
  const navigate = useNavigate();
  // If already authenticated (e.g. removed from club), skip account creation
  const [step, setStep] = useState(user ? 2 : 1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(user?.uid || "");
  const [clubOption, setClubOption] = useState("");
  const [clubName, setClubName] = useState("");
  const [clubCode, setClubCode] = useState("");
  const [clubId, setClubId] = useState("");
  const [unlinkedPlayers, setUnlinkedPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  // Keep userId in sync if auth state resolves after render
  useEffect(() => {
    if (user && !userId) {
      setUserId(user.uid);
      setStep(2);
    }
  }, [user]);

  async function handleAccount(e) {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords do not match");
    setError("");
    setLoading(true);
    try {
      const cred = await register(email, password);
      setUserId(cred.user.uid);
      setStep(2);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email already has an account. Log in first, then you'll be able to rejoin the club.");
      } else {
        setError("Error creating account. Try another email.");
      }
    }
    setLoading(false);
  }

  async function handleClub(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (clubOption === "create") {
        const { coachCode, playerCode } = await createClub(clubName, userId, email || user?.email || "");
        alert(`Club created!\n\nCoach code: ${coachCode}\nPlayer code: ${playerCode}\n\nShare the right code with each person.`);
        await reloadClub();
        navigate("/");
      } else {
        const { clubId: id, role } = await joinClub(clubCode.toUpperCase(), userId, email || user?.email || "");
        if (role === "coach") {
          await reloadClub();
          navigate("/");
        } else {
          setClubId(id);
          const players = await getUnlinkedPlayers(id);
          setUnlinkedPlayers(players);
          setStep(3);
        }
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handlePlayerLink(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await linkPlayerToUser(selectedPlayerId, userId);
      await reloadClub();
      navigate("/");
    } catch {
      setError("Error linking player profile.");
    }
    setLoading(false);
  }

  const wrapper = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100svh", padding: 24, background: "var(--bg)" };
  const card    = { width: "100%", maxWidth: 400, padding: 28 };

  if (step === 3) {
    return (
      <div style={wrapper}>
        <div className="card" style={card}>
          <h2 style={{ marginBottom: 6 }}>Select your profile</h2>
          <p style={{ marginBottom: 20 }}>Find your name in the squad and link your account to it.</p>
          {error && <p style={{ color: "var(--red)", marginBottom: 14, fontSize: 13 }}>{error}</p>}
          {unlinkedPlayers.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No unlinked squad profiles found. Ask your coach to add you to the squad first, then register.</p>
          ) : (
            <form onSubmit={handlePlayerLink}>
              <div style={{ marginBottom: 16 }}>
                <label>Your name</label>
                <select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} required style={{ width: "100%" }}>
                  <option value="">— Select your name —</option>
                  {unlinkedPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.surname} — {p.mainPosition}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={loading || !selectedPlayerId} style={{ width: "100%", padding: "9px 0", background: "var(--blue)", color: "#fff", border: "none", borderRadius: "var(--r-sm)", fontWeight: 600 }}>
                {loading ? "Saving..." : "Continue"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div style={wrapper}>
        <div className="card" style={card}>
          <h2 style={{ marginBottom: 20 }}>Join or create a club</h2>
          {error && <p style={{ color: "var(--red)", marginBottom: 14, fontSize: 13 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button onClick={() => setClubOption("create")} style={{ flex: 1, background: clubOption === "create" ? "var(--blue)" : undefined, color: clubOption === "create" ? "#fff" : undefined, border: clubOption === "create" ? "none" : undefined }}>
              Create club
            </button>
            <button onClick={() => setClubOption("join")} style={{ flex: 1, background: clubOption === "join" ? "var(--blue)" : undefined, color: clubOption === "join" ? "#fff" : undefined, border: clubOption === "join" ? "none" : undefined }}>
              Join club
            </button>
          </div>

          {clubOption === "create" && (
            <form onSubmit={handleClub}>
              <div style={{ marginBottom: 16 }}>
                <label>Club name</label>
                <input value={clubName} onChange={e => setClubName(e.target.value)} required style={{ width: "100%" }} />
              </div>
              <button type="submit" disabled={loading} style={{ width: "100%", padding: "9px 0", background: "var(--blue)", color: "#fff", border: "none", borderRadius: "var(--r-sm)", fontWeight: 600 }}>
                {loading ? "Creating..." : "Create club"}
              </button>
            </form>
          )}

          {clubOption === "join" && (
            <form onSubmit={handleClub}>
              <div style={{ marginBottom: 16 }}>
                <label>Club code</label>
                <input value={clubCode} onChange={e => setClubCode(e.target.value)} placeholder="e.g. AB12CD" required style={{ width: "100%" }} />
              </div>
              <button type="submit" disabled={loading} style={{ width: "100%", padding: "9px 0", background: "var(--blue)", color: "#fff", border: "none", borderRadius: "var(--r-sm)", fontWeight: 600 }}>
                {loading ? "Joining..." : "Join club"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={wrapper}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <span style={{ fontSize: 40 }}>🏉</span>
        <h1 style={{ margin: "8px 0 4px" }}>Rugby Analytics</h1>
        <p>Match tracking and analytics</p>
      </div>
      <div className="card" style={card}>
        <h2 style={{ marginBottom: 20 }}>Create account</h2>
        {error && <p style={{ color: "var(--red)", marginBottom: 14, fontSize: 13 }}>{error}</p>}
        <form onSubmit={handleAccount}>
          <div style={{ marginBottom: 14 }}>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label>Confirm password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={{ width: "100%" }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "9px 0", background: "var(--blue)", color: "#fff", border: "none", borderRadius: "var(--r-sm)", fontWeight: 600 }}>
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: "center" }}>
          Already have an account? <Link to="/login" style={{ color: "var(--blue)" }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
