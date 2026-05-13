import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getClubPlayers, getClubMatches } from "../utils/firestore";

export default function Home() {
  const { club, role, logout, clubLoading } = useAuth();
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    if (clubLoading) return;
    if (!club) {
      navigate("/register");
      return;
    }
    if (club?.clubId) {
      getClubPlayers(club.clubId).then(p => setPlayerCount(p.length));
      getClubMatches(club.clubId).then(m => setMatchCount(m.length));
    }
  }, [club, clubLoading]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  if (clubLoading) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Rugby Analytics</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>

      {club ? (
        <>
          <div className="card" style={{ background: "#f5f5f5", padding: 20, borderRadius: 8, marginBottom: 20 }}>
            <h2>{club.name}</h2>
            <p>Your role: <strong>{role}</strong></p>
            <p>Club code: <strong>{club.code}</strong></p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div className="card" style={{ background: "#e8f4fd", padding: 20, borderRadius: 8, textAlign: "center" }}>
              <h3>{playerCount}</h3>
              <p>Players</p>
            </div>
            <div className="card" style={{ background: "#e8f4fd", padding: 20, borderRadius: 8, textAlign: "center" }}>
              <h3>{matchCount}</h3>
              <p>Matches</p>
            </div>
          </div>

        </>
      ) : (
        <p>Loading club data...</p>
      )}
    </div>
  );
}