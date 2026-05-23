import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getClubMatches, createMatch, deleteMatch } from "../utils/firestore";

export default function Matches() {
  const { club, role } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rival, setRival] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("Home");
  const [city, setCity] = useState("");
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
      city: city.trim() || null,
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
    setCity("");
    setSaving(false);
    setShowForm(false);
  }

  async function handleDelete(matchId) {
    if (!confirm("Delete this match?")) return;
    await deleteMatch(matchId);
    setMatches(prev => prev.filter(m => m.id !== matchId));
  }

  const canEdit = role === "admin" || role === "coach";

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Matches</h1>
        <button onClick={() => navigate("/")}>Back</button>
      </div>

      {canEdit && (
        <button onClick={() => {
          if (!showForm && club?.city) setCity(club.city);
          setShowForm(!showForm);
        }} style={{ marginBottom: 20 }}>
          {showForm ? "Cancel" : "+ Add Match"}
        </button>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: 20, background: "#f5f5f5", padding: 20, borderRadius: 8 }}>
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
            <select value={location} onChange={e => {
              const loc = e.target.value;
              setLocation(loc);
              if (loc === "Home" && club?.city) setCity(club.city);
              else if (loc !== "Home") setCity("");
            }}>
              <option value="Home">Home</option>
              <option value="Away">Away</option>
              <option value="Neutral">Neutral</option>
            </select>
          </div>
          <div style={{ marginTop: 12 }}>
            <label>City (for weather)</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. A Coruña" />
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
            <div key={m.id} className="card"
              style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ cursor: "pointer" }} onClick={() => navigate(`/matches/${m.id}`)}>
                  vs {m.rival}
                </strong>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span>{m.date}</span>
                  {canEdit && (
                    <button onClick={() => handleDelete(m.id)}
                      style={{ color: "red", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
                      Borrar
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, cursor: "pointer" }}
                onClick={() => navigate(`/matches/${m.id}`)}>
                <small>{m.location}{m.city ? ` · ${m.city}` : ""}</small>
                <small>{m.result || "Pending"}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}