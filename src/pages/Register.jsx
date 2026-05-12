import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { createClub, joinClub, getUnlinkedPlayers, linkPlayerToUser } from "../utils/firestore";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [clubOption, setClubOption] = useState("");
  const [clubName, setClubName] = useState("");
  const [clubCode, setClubCode] = useState("");
  const [joinRole, setJoinRole] = useState("");
  const [clubId, setClubId] = useState("");
  const [unlinkedPlayers, setUnlinkedPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  async function handleAccount(e) {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords do not match");
    setError("");
    setLoading(true);
    try {
      const cred = await register(email, password);
      setUserId(cred.user.uid);
      setStep(2);
    } catch {
      setError("Error creating account. Try another email");
    }
    setLoading(false);
  }

  async function handleClub(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (clubOption === "create") {
        const { code } = await createClub(clubName, userId, email);
        alert(`Club created! Your code is: ${code} — share it with your team`);
        navigate("/");
      } else {
        const id = await joinClub(clubCode.toUpperCase(), userId, email, "coach");
        setClubId(id);
        setStep(3);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleRoleSelect(selectedRole) {
    setJoinRole(selectedRole);
    if (selectedRole === "player") {
      setLoading(true);
      const players = await getUnlinkedPlayers(clubId);
      setUnlinkedPlayers(players);
      setLoading(false);
    }
  }

  async function handlePlayerLink(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (selectedPlayerId) {
        await linkPlayerToUser(selectedPlayerId, userId);
      }
      navigate("/");
    } catch {
      setError("Error linking player profile");
    }
    setLoading(false);
  }

  if (step === 3) {
    return (
      <div style={{ maxWidth: 400, margin: "100px auto", padding: "0 20px" }}>
        <h2>What is your role?</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}

        {!joinRole && (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => handleRoleSelect("coach")}>Coaching staff</button>
            <button onClick={() => handleRoleSelect("player")}>Player</button>
          </div>
        )}

        {joinRole === "coach" && (
          <p>Joined as coaching staff. Your admin can adjust your role if needed.</p>
        )}

        {joinRole === "player" && (
          <form onSubmit={handlePlayerLink}>
            <p>Select your profile from the squad:</p>
            {loading ? (
              <p>Loading players...</p>
            ) : unlinkedPlayers.length === 0 ? (
              <p>No unlinked players found. Ask your coach to add you first.</p>
            ) : (
              <select
                value={selectedPlayerId}
                onChange={e => setSelectedPlayerId(e.target.value)}
                required
                style={{ width: "100%", marginBottom: 12 }}
              >
                <option value="">-- Select your profile --</option>
                {unlinkedPlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.surname} — {p.mainPosition}
                  </option>
                ))}
              </select>
            )}
            {unlinkedPlayers.length > 0 && (
              <button type="submit" disabled={loading || !selectedPlayerId}>
                {loading ? "Saving..." : "Continue"}
              </button>
            )}
          </form>
        )}

        {joinRole === "coach" && (
          <button onClick={() => navigate("/")} style={{ marginTop: 12 }}>
            Continue
          </button>
        )}
      </div>
    );
  }

  if (step === 2) {
    return (
      <div style={{ maxWidth: 400, margin: "100px auto", padding: "0 20px" }}>
        <h2>Join or create a club</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setClubOption("create")}>Create club</button>
          <button onClick={() => setClubOption("join")}>Join club</button>
        </div>

        {clubOption === "create" && (
          <form onSubmit={handleClub}>
            <label>Club name</label>
            <input value={clubName} onChange={e => setClubName(e.target.value)} required />
            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create club"}
            </button>
          </form>
        )}

        {clubOption === "join" && (
          <form onSubmit={handleClub}>
            <label>Club code</label>
            <input
              value={clubCode}
              onChange={e => setClubCode(e.target.value)}
              placeholder="Ex: AB12CD"
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Joining..." : "Join club"}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: "0 20px" }}>
      <h1>Rugby Analytics</h1>
      <h2>Create account</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleAccount}>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <div>
          <label>Confirm password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}
