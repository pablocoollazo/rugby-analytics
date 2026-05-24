import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getClubPlaybook, createPlay, deletePlay } from "../utils/firestore";

const JERSEYS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];

export default function Playbook() {
    const { club, role } = useAuth();
    const [plays, setPlays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [selectedJerseys, setSelectedJerseys] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (club?.clubId) {
            getClubPlaybook(club.clubId).then(pb => {
                setPlays(pb);
                setLoading(false);
            });
        }
    }, [club]);

    function toggleJersey(n) {
        setSelectedJerseys(prev =>
            prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b)
        );
    }

    async function handleCreate(e) {
        e.preventDefault();
        setSaving(true);
        await createPlay(club.clubId, { name, jerseys: selectedJerseys });
        const updated = await getClubPlaybook(club.clubId);
        setPlays(updated);
        setName("");
        setSelectedJerseys([]);
        setShowForm(false);
        setSaving(false);
    }

    async function handleDelete(playId) {
        await deletePlay(playId);
        setPlays(prev => prev.filter(p => p.id !== playId));
    }

    const canEdit = role === "admin" || role === "coach";

    return (
        <div className="page">
            <h1>Playbook</h1>

            {canEdit && (
                <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: 20 }}>
                    {showForm ? "Cancel" : "+ Add Play"}
                </button>
            )}

            {showForm && (
                <form onSubmit={handleCreate} className="card" style={{ padding: 20, marginBottom: 20 }}>
                    <div>
                        <label>Play name</label>
                        <input value={name} onChange={e => setName(e.target.value)} required
                            style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 4 }} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <label>Jerseys involved</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                            {JERSEYS.map(n => {
                                const selected = selectedJerseys.includes(n);
                                return (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => toggleJersey(n)}
                                        style={{
                                            width: 40, height: 40, borderRadius: 6, border: "2px solid",
                                            borderColor: selected ? "#1d4ed8" : "#ccc",
                                            background: selected ? "#1d4ed8" : "#fff",
                                            color: selected ? "#fff" : "#333",
                                            fontWeight: 600, fontSize: 14, cursor: "pointer",
                                        }}
                                    >
                                        {n}
                                    </button>
                                );
                            })}
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
                        <div key={play.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong>{play.name}</strong>
                                {canEdit && (
                                    <button onClick={() => handleDelete(play.id)}
                                        style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}>
                                        Delete
                                    </button>
                                )}
                            </div>
                            {play.jerseys?.length > 0 && (
                                <small style={{ color: "#555" }}>{play.jerseys.map(n => `#${n}`).join(" · ")}</small>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
