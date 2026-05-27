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
    <div className="page">
      <h1>Matches</h1>

      {canEdit && (
        <button onClick={() => {
          if (!showForm && club?.city) setCity(club.city);
          setShowForm(!showForm);
        }} style={{ marginBottom: 20 }}>
          {showForm ? "Cancel" : "+ Add Match"}
        </button>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: 20, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label>Rival</label>
            <input value={rival} onChange={(e) => setRival(e.target.value)} required style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Location</label>
              <select value={location} onChange={e => {
                const loc = e.target.value;
                setLocation(loc);
                if (loc === "Home" && club?.city) setCity(club.city);
                else if (loc !== "Home") setCity("");
              }} style={{ width: "100%" }}>
                <option value="Home">Home</option>
                <option value="Away">Away</option>
                <option value="Neutral">Neutral</option>
              </select>
            </div>
          </div>
          <div>
            <label>City (for weather)</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. A Coruña" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <button type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
            {saving ? "Saving..." : "Save Match"}
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : matches.length === 0 ? (
        <p>No matches yet. Add your first match!</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {matches.map(m => {
            const resultColor = { Win: "#16a34a", Loss: "#dc2626", Draw: "#6b7280" }[m.result];
            const score = (m.pointsFor != null && m.pointsAgainst != null)
              ? `${m.pointsFor} – ${m.pointsAgainst}` : null;
            return (
              <div key={m.id} className="card"
                style={{ padding: "14px 16px", cursor: "pointer" }}
                onClick={() => navigate(`/matches/${m.id}`)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>vs {m.rival}</strong>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {m.date}{m.location ? ` · ${m.location}` : ""}{m.city ? ` · ${m.city}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {score && (
                      <span style={{ fontSize: 16, fontWeight: 700, color: resultColor || "var(--text)" }}>
                        {score}
                      </span>
                    )}
                    {m.result ? (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
                        background: resultColor, color: "#fff",
                      }}>{m.result}</span>
                    ) : (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
                        background: "#f1f5f9", color: "var(--muted)", border: "1px solid var(--border)",
                      }}>Upcoming</span>
                    )}
                    {canEdit && (
                      <button onClick={e => { e.stopPropagation(); handleDelete(m.id); }}
                        style={{ color: "var(--red)", background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "4px 6px" }}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}