import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getClubPlaybook, createPlay, deletePlay } from "../utils/firestore";

const ALL_POSITIONS = [
    "Prop", "Hooker", "Lock", "Flanker", "Number 8",
    "Scrum-half", "Fly-half", "Inside Centre", "Outside Centre", "Wing", "Fullback"
];

export default function Playbook() {
    const { club, role } = useAuth();
    const navigate = useNavigate();
    const [plays, setPlays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [selectedPositions, setSelectedPositions] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (club?.clubId) {
            getClubPlaybook(club.clubId).then(pb => {
                setPlays(pb);
                setLoading(false);
            });
        }
    }, [club]);

    function togglePosition(pos) {
        setSelectedPositions(prev =>
            prev.includes(pos) ? prev.filter(x => x !== pos) : [...prev, pos]
        );
    }

    async function handleCreate(e) {
        e.preventDefault();
        setSaving(true);
        await createPlay(club.clubId, { name, positions: selectedPositions });
        const updated = await getClubPlaybook(club.clubId);
        setPlays(updated);
        setName("");
        setSelectedPositions([]);
        setShowForm(false);
        setSaving(false);
    }

    async function handleDelete(playId) {
        await deletePlay(playId);
        setPlays(prev => prev.filter(p => p.id !== playId));
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
                <form onSubmit={handleCreate} className="card" style={{ background: "#f5f5f5", padding: 20, borderRadius: 8, marginBottom: 20 }}>
                    <div>
                        <label>Play name</label>
                        <input value={name} onChange={e => setName(e.target.value)} required
                            style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 4 }} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <label>Positions involved</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                            {ALL_POSITIONS.map(pos => (
                                <label key={pos} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedPositions.includes(pos)}
                                        onChange={() => togglePosition(pos)}
                                    />
                                    {pos}
                                </label>
                            ))}
                        </div>
                    </div>
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
                        <div key={play.id} className="card" style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong>{play.name}</strong>
                                {canEdit && (
                                    <button onClick={() => handleDelete(play.id)}
                                        style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}>
                                        Delete
                                    </button>
                                )}
                            </div>
                            {play.positions?.length > 0 && (
                                <small style={{ color: "#555" }}>{play.positions.join(" · ")}</small>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
