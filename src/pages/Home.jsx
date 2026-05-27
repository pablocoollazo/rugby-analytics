import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getClubPlayers, getClubMatches } from "../utils/firestore";

const ROLE_COLOR = { admin: "#7c3aed", coach: "#2563eb", player: "#16a34a" };

export default function Home() {
  const { club, role, user, clubLoading } = useAuth();
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(null);
  const [lastMatch, setLastMatch] = useState(null);
  const [linkedPlayer, setLinkedPlayer] = useState(undefined); // undefined = not checked yet

  useEffect(() => {
    if (clubLoading) return;
    if (!club) { navigate("/register"); return; }
    getClubPlayers(club.clubId).then(p => {
      setPlayerCount(p.length);
      if (role === "player" && user) {
        setLinkedPlayer(p.find(pl => pl.userId === user.uid) || null);
      }
    });
    getClubMatches(club.clubId).then(m => {
      const completed = m.filter(x => x.result);
      if (completed.length) setLastMatch(completed[0]);
    });
  }, [club, clubLoading]);

  if (clubLoading) return <p style={{ padding: 40 }}>Loading...</p>;

  return (
    <div className="page">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ marginBottom: 6 }}>{club?.name}</h1>
        <span style={{
          display: "inline-block", fontSize: 12, fontWeight: 600, letterSpacing: .4,
          background: ROLE_COLOR[role] || "#64748b", color: "#fff",
          padding: "2px 10px", borderRadius: 20, textTransform: "capitalize",
        }}>{role}</span>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        <StatBox label="Players" value={playerCount ?? "—"} />
        <StatBox
          label="Last result"
          value={lastMatch ? `${lastMatch.pointsFor}–${lastMatch.pointsAgainst}` : "—"}
          sub={lastMatch ? `vs ${lastMatch.rival}` : undefined}
          color={lastMatch?.result === "Win" ? "#16a34a" : lastMatch?.result === "Loss" ? "#dc2626" : undefined}
        />
        <StatBox
          label="Outcome"
          value={lastMatch?.result || "No matches"}
          color={lastMatch?.result === "Win" ? "#16a34a" : lastMatch?.result === "Loss" ? "#dc2626" : "#64748b"}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        <QuickLink to="/matches"  title="Matches"  desc="Manage and record matches" />
        {role !== "player" && <QuickLink to="/players"  title="Players"  desc="Club squad" />}
        <QuickLink to="/analysis" title="Analysis" desc="Season statistics" />
        {role !== "player" && <QuickLink to="/playbook" title="Playbook" desc="Club plays library" />}
        {role === "player" && linkedPlayer && (
          <QuickLink to={`/players/${linkedPlayer.id}`} title="My profile" desc="Your stats and career" />
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: .5, marginBottom: 6, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "var(--text)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function QuickLink({ to, title, desc }) {
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div className="card" style={{ padding: "18px 20px", cursor: "pointer", transition: "box-shadow .15s" }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,.1)"}
        onMouseLeave={e => e.currentTarget.style.boxShadow = ""}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{desc}</div>
      </div>
    </Link>
  );
}
