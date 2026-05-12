import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getClubPlayers, getClubPlaybook, createPlay, deletePlay } from "../utils/firestore";

export default function Playbook() {
    const { club, role } = useAuth();
    const navigate = useNavigate();
    const [plays, setPlays] = useState([]);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (club?.clubId) {
            Promise.all([
                getClubPlaybook(club.clubId),
                getClubPlayers(club.clubId),
            ]).then(([pb, pl]) => {
                setPlays(pb);
                setPlayers(pl);
                setLoading(false);
            });
        }
    }, [club]);

    function togglePlayer(id) {
        setSelectedPlayers(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    }

    async function handleCreate(e) {
        e.preventDefault();
        setSaving(true);
        await createPlay(club.clubId, { name, playerIds: selectedPlayers });
        const updated = await getClubPlaybook(club.clubId);
        setPlays(updated);
        setName("");
        setSelectedPlayers([]);
        setShowForm(false);
        setSaving(false);
    }

    async function handleDelete(playId) {
        await deletePlay(playId);
        setPlays(prev => prev.filter(p => p.id !== playId));
    }

    function playerName(id) {
        return players.find(p => p.id === id)?.name || id;
    }

    const canEdit = role === "admin" || role === "coach";

    return (
        <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>Playbook</h1>
                <button onClick={() => navigate("/")}>Back</button>
            </div>

            {canEdit && (
                <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: 20 }}>
                    {showForm ? "Cancel" : "+ Add Play"}
                </button>
            )}

            {showForm && (
                <form onSubmit={handleCreate} style={{ background: "#f5f5f5", padding: 20, borderRadius: 8, marginBottom: 20 }}>
                    <div>
                        <label>Play name</label>
                        <input value={name} onChange={e => setName(e.target.value)} required style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 4 }} />
                    </div>
                    {players.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <label>Default players</label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                                {players.map(p => (
                                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedPlayers.includes(p.id)}
                                            onChange={() => togglePlayer(p.id)}
                                        />
                                        {p.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    <button type="submit" disabled={saving} style={{ marginTop: 12 }}>
                        {saving ? "Saving..." : "Save play"}
                    </button>
                </form>
            )}

            {loading ? (
                <p>Loading...</p>
            ) : plays.length === 0 ? (
                <p>No plays yet. Add your first play!</p>
            ) : (
                <div>
                    {plays.map(play => (
                        <div key={play.id} style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong>{play.name}</strong>
                                {canEdit && (
                                    <button
                                        onClick={() => handleDelete(play.id)}
                                        style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                            {play.playerIds?.length > 0 && (
                                <small style={{ color: "#555" }}>{play.playerIds.map(playerName).join(", ")}</small>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
