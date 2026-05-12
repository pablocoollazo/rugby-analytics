import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getClubMembersDetails, updateMemberRole, getClubPlayers } from "../utils/firestore";

const ROLES = ["admin", "coach", "player"];

export default function ClubMembers() {
  const { club, role, user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club) return;
    Promise.all([
      getClubMembersDetails(club.members),
      getClubPlayers(club.clubId),
    ]).then(([memberDetails, clubPlayers]) => {
      setMembers(memberDetails);
      setPlayers(clubPlayers);
      setLoading(false);
    });
  }, [club]);

  async function handleRoleChange(uid, newRole) {
    await updateMemberRole(club.clubId, uid, newRole);
    setMembers(prev => prev.map(m => m.uid === uid ? { ...m, role: newRole } : m));
  }

  function getLinkedPlayer(uid) {
    return players.find(p => p.userId === uid);
  }

  if (role !== "admin") return <p style={{ padding: 40 }}>Access denied.</p>;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Club members</h1>
        <button onClick={() => navigate("/")}>Back</button>
      </div>
      <p style={{ color: "#666" }}>Club code: <strong>{club.code}</strong></p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          {members.map(m => {
            const linked = getLinkedPlayer(m.uid);
            const isSelf = m.uid === user.uid;
            return (
              <div key={m.uid} style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{m.email}</strong>
                    {isSelf && <span style={{ marginLeft: 8, color: "#888", fontSize: 12 }}>(you)</span>}
                    {linked && (
                      <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                        Player: {linked.name} {linked.surname} — {linked.mainPosition}
                      </div>
                    )}
                  </div>
                  <select
                    value={m.role}
                    onChange={e => handleRoleChange(m.uid, e.target.value)}
                    disabled={isSelf}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
