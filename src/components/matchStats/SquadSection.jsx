import { useState } from "react";

const ALL_POSITIONS = [
    "Prop", "Hooker", "Lock", "Flanker", "Number 8",
    "Scrum-half", "Fly-half", "Inside Centre", "Outside Centre", "Wing", "Fullback"
];

export default function SquadSection({ squad, allPlayers, canEdit, onSave }) {
    // squad: [{ playerId, jersey, position, isStarter }]
    const [entries, setEntries] = useState(() => {
        const map = {};
        squad.forEach(s => { map[s.playerId] = s; });
        return map;
    });
    const [saving, setSaving] = useState(false);

    function toggle(player) {
        setEntries(prev => {
            if (prev[player.id]) {
                const next = { ...prev };
                delete next[player.id];
                return next;
            }
            return {
                ...prev,
                [player.id]: { playerId: player.id, jersey: "", position: player.mainPosition, isStarter: true },
            };
        });
    }

    function update(playerId, field, value) {
        setEntries(prev => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }));
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        await onSave(Object.values(entries));
        setSaving(false);
    }

    const starters = Object.values(entries).filter(e => e.isStarter).sort((a, b) => Number(a.jersey) - Number(b.jersey));
    const subs = Object.values(entries).filter(e => !e.isStarter).sort((a, b) => Number(a.jersey) - Number(b.jersey));

    function playerName(id) {
        const p = allPlayers.find(p => p.id === id);
        return p ? p.displayName : id;
    }

    return (
        <div>
            {/* Summary */}
            {(starters.length > 0 || subs.length > 0) && (
                <div style={{ marginBottom: 16, fontSize: 13, color: "#555" }}>
                    {starters.length > 0 && (
                        <p><strong>Starters ({starters.length}):</strong> {starters.map(s => `${s.jersey ? `#${s.jersey} ` : ""}${playerName(s.playerId)}`).join(", ")}</p>
                    )}
                    {subs.length > 0 && (
                        <p style={{ marginTop: 4 }}><strong>Subs ({subs.length}):</strong> {subs.map(s => `${s.jersey ? `#${s.jersey} ` : ""}${playerName(s.playerId)}`).join(", ")}</p>
                    )}
                </div>
            )}

            {canEdit && (
                <form onSubmit={handleSave}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {allPlayers.map(p => {
                            const entry = entries[p.id];
                            return (
                                <div key={p.id} className="card"
                                    style={{ background: entry ? "#e8f0fe" : "#efefef", padding: "8px 12px", borderRadius: 6 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <input type="checkbox" checked={!!entry} onChange={() => toggle(p)} />
                                        <span style={{ flex: 1, fontWeight: entry ? 600 : 400 }}>{p.displayName}</span>
                                        <span style={{ fontSize: 12, color: "#888" }}>{p.mainPosition}</span>
                                    </div>
                                    {entry && (
                                        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                                            <input
                                                type="number"
                                                placeholder="Jersey #"
                                                value={entry.jersey}
                                                onChange={e => update(p.id, "jersey", e.target.value)}
                                                min="1" max="99"
                                                style={{ width: 70, fontSize: 13 }}
                                            />
                                            <select
                                                value={entry.position}
                                                onChange={e => update(p.id, "position", e.target.value)}
                                                style={{ fontSize: 13, flex: 1 }}
                                            >
                                                {ALL_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                                            </select>
                                            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={entry.isStarter}
                                                    onChange={e => update(p.id, "isStarter", e.target.checked)}
                                                />
                                                Starter
                                            </label>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <button type="submit" disabled={saving} style={{ marginTop: 12 }}>
                        {saving ? "Saving..." : "Save squad"}
                    </button>
                </form>
            )}

            {!canEdit && starters.length === 0 && subs.length === 0 && (
                <p style={{ color: "#999" }}>No squad defined.</p>
            )}
        </div>
    );
}
