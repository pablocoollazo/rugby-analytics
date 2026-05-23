import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getClubMembersDetails, updateMemberRole, getClubPlayers, relinkPlayer } from "../utils/firestore";

const ROLES = ["admin", "coach", "player"];

export default function ClubMembers() {
  const { club, role, user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [relinkingUid, setRelinkingUid] = useState(null);
  const [selectedNewPlayer, setSelectedNewPlayer] = useState("");

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

  async function handleRelink(uid) {
    const currentPlayer = getLinkedPlayer(uid);
    await relinkPlayer(currentPlayer?.id || null, selectedNewPlayer || null, uid);
    const updated = await getClubPlayers(club.clubId);
    setPlayers(updated);
    setRelinkingUid(null);
    setSelectedNewPlayer("");
  }

  const unlinkedPlayers = players.filter(p => !p.userId);

  // Players available to re-link: unlinked + the one currently linked to this member
  function availableForRelink(uid) {
    const current = getLinkedPlayer(uid);
    return players.filter(p => !p.userId || p.id === current?.id);
  }

  if (role !== "admin") return <p style={{ padding: 40 }}>Access denied.</p>;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Club members</h1>
        <button onClick={() => navigate("/")}>Back</button>
      </div>

      {/* Codes */}
      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "14px 18px", marginBottom: 20, fontSize: 14 }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ color: "#555" }}>Coach code: </span>
          <strong style={{ fontFamily: "monospace", fontSize: 16 }}>{club.coachCode}</strong>
          <span style={{ marginLeft: 8, color: "#888", fontSize: 12 }}>— share with coaching staff</span>
        </div>
        <div>
          <span style={{ color: "#555" }}>Player code: </span>
          <strong style={{ fontFamily: "monospace", fontSize: 16 }}>{club.playerCode}</strong>
          <span style={{ marginLeft: 8, color: "#888", fontSize: 12 }}>— share with squad members</span>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Members */}
          <h2 style={{ fontSize: 15, marginBottom: 10 }}>Members ({members.length})</h2>
          <div style={{ marginBottom: 24 }}>
            {members.map(m => {
              const linked = getLinkedPlayer(m.uid);
              const isSelf = m.uid === user.uid;
              const isRelinking = relinkingUid === m.uid;
              return (
                <div key={m.uid} className="card" style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 14 }}>{m.email}</strong>
                      {isSelf && <span style={{ marginLeft: 8, color: "#888", fontSize: 12 }}>(you)</span>}
                      {linked && !isRelinking && (
                        <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                          Player: {linked.name} {linked.surname} — {linked.mainPosition}
                          <button
                            onClick={() => { setRelinkingUid(m.uid); setSelectedNewPlayer(""); }}
                            style={{ marginLeft: 10, fontSize: 11, background: "none", border: "none", color: "#2563eb", cursor: "pointer" }}
                          >
                            Re-link
                          </button>
                        </div>
                      )}
                      {!linked && m.role === "player" && (
                        <div style={{ fontSize: 12, color: "#d97706", marginTop: 2 }}>
                          No profile linked
                          <button
                            onClick={() => { setRelinkingUid(m.uid); setSelectedNewPlayer(""); }}
                            style={{ marginLeft: 8, fontSize: 11, background: "none", border: "none", color: "#2563eb", cursor: "pointer" }}
                          >
                            Link
                          </button>
                        </div>
                      )}
                      {isRelinking && (
                        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                          <select
                            value={selectedNewPlayer}
                            onChange={e => setSelectedNewPlayer(e.target.value)}
                            style={{ fontSize: 13, flex: 1 }}
                          >
                            <option value="">-- Unlink --</option>
                            {availableForRelink(m.uid).map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.surname} — {p.mainPosition}
                              </option>
                            ))}
                          </select>
                          <button onClick={() => handleRelink(m.uid)} style={{ fontSize: 12 }}>Save</button>
                          <button onClick={() => setRelinkingUid(null)} style={{ fontSize: 12, background: "none" }}>Cancel</button>
                        </div>
                      )}
                    </div>
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.uid, e.target.value)}
                      disabled={isSelf}
                      style={{ marginLeft: 12 }}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unlinked players */}
          {unlinkedPlayers.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, marginBottom: 10 }}>Squad without account ({unlinkedPlayers.length})</h2>
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "12px 16px" }}>
                {unlinkedPlayers.map(p => (
                  <div key={p.id} style={{ fontSize: 13, padding: "4px 0", color: "#555" }}>
                    {p.name} {p.surname} — {p.mainPosition}
                  </div>
                ))}
                <p style={{ fontSize: 12, color: "#92400e", marginTop: 8, marginBottom: 0 }}>
                  These players haven't registered yet. Share the player code with them.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
