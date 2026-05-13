import { useState } from "react";

export default function SquadSection({ squad, allPlayers, canEdit, onSave }) {
    const [selected, setSelected] = useState(squad);
    const [saving, setSaving] = useState(false);

    function toggle(id) {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        await onSave(selected);
        setSaving(false);
    }

    const squadPlayers = allPlayers.filter(p => selected.includes(p.id));

    return (
        <div>
            {squadPlayers.length > 0 && (
                <p style={{ marginBottom: 12, fontSize: 13, color: "#555" }}>
                    {squadPlayers.map(p => p.displayName).join(", ")}
                </p>
            )}
            {canEdit && (
                <form onSubmit={handleSave}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        {allPlayers.map(p => (
                            <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                                <input
                                    type="checkbox"
                                    checked={selected.includes(p.id)}
                                    onChange={() => toggle(p.id)}
                                />
                                {p.displayName}
                            </label>
                        ))}
                    </div>
                    <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Squad"}</button>
                </form>
            )}
            {!canEdit && squadPlayers.length === 0 && (
                <p style={{ color: "#999" }}>No squad defined.</p>
            )}
        </div>
    );
}
