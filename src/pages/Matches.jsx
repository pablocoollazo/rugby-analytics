import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getClubMatches, createMatch } from "../utils/firestore";

export default function Matches() {
  const { club, role } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rival, setRival] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("Home");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (club?.clubId) {
      getClubMatches(club.clubId).then(m => {
        setMatches(m);
        setLoading(false);
      });
    }
  }, [club]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    await createMatch(club.clubId, {
      rival,
      date,
      location,
      result: null,
      pointsFor: null,
      pointsAgainst: null,
      status: "pending",
    });
    const updated = await getClubMatches(club.clubId);
    setMatches(updated);
    setRival("");
    setDate("");
    setLocation("Home");
    setSaving(false);
    setShowForm(false);
  }

  const canEdit = role === "admin" || role === "coach";

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Matches</h1>
        <button onClick={() => navigate("/")}>Back</button>
      </div>

      {canEdit && (
        <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: 20 }}>
          {showForm ? "Cancel" : "+ Add Match"}
        </button>
      )}

      {showForm && (
        <form onSubmit={handleCreate} style={{ marginBottom: 20, background: "#f5f5f5", padding: 20, borderRadius: 8 }}>
          <div>
            <label>Rival</label>
            <input value={rival} onChange={(e) => setRival(e.target.value)} required />
          </div>
          <div style={{ marginTop: 12}}>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div style={{ marginTop: 12}}>
            <label>Location</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="Home">Home</option>
              <option value="Away">Away</option>
              <option value="Neutral">Neutral</option>
            </select>
          </div>
          <button type="submit" disabled={saving} style={{ marginTop: 12 }}>
            {saving ? "Saving..." : "Save Match"}
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : matches.length === 0 ? (
        <p>No matches yet. Add your first match!</p>
      ) : (
        <div>
          {matches.map(m => (
            <div 
              key={m.id} 
              style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, marginBottom: 12, cursor: "pointer" }} 
              onClick={() => navigate(`/matches/${m.id}`)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>vs {m.rival}</strong>
                <span>{m.date}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4}}>
                <small>{m.location}</small>
                <small>{m.result || "Pending"}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}