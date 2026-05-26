import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getClubPlaybook, createPlay, deletePlay } from "../utils/firestore";
import { POSITION_SLOTS, slotName } from "../utils/positions";

export default function Playbook() {
    const { club, role } = useAuth();
    const [plays, setPlays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (club?.clubId) {
            getClubPlaybook(club.clubId).then(pb => {
                setPlays(pb);
                setLoading(false);
            });
        }
    }, [club]);

    function toggleSlot(slot) {
        setSelectedSlots(prev =>
            prev.includes(slot) ? prev.filter(x => x !== slot) : [...prev, slot].sort((a, b) => a - b)
        );
    }

    async function handleCreate(e) {
        e.preventDefault();
        setSaving(true);
        await createPlay(club.clubId, { name, slots: selectedSlots });
        const updated = await getClubPlaybook(club.clubId);
        setPlays(updated);
        setName("");
        setSelectedSlots([]);
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
                        <label>Positions involved</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                            {POSITION_SLOTS.map(({ slot, name: posName }) => {
                                const selected = selectedSlots.includes(slot);
                                return (
                                    <button
                                        key={slot}
                                        type="button"
                                        onClick={() => toggleSlot(slot)}
                                        style={{
                                            padding: "8px 14px",
                                            borderRadius: 6,
                                            border: "2px solid",
                                            borderColor: selected ? "#1d4ed8" : "#d1d5db",
                                            background: selected ? "#1d4ed8" : "#fff",
                                            color: selected ? "#fff" : "#374151",
                                            fontWeight: selected ? 600 : 400,
                                            fontSize: 13,
                                            cursor: "pointer",
                                            textAlign: "left",
                                        }}
                                    >
                                        {posName}
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
                            {(play.slots || play.jerseys)?.length > 0 && (
                                <small style={{ color: "#555" }}>
                                    {(play.slots || play.jerseys).map(s => slotName(s)).filter(Boolean).join(" · ")}
                                </small>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
