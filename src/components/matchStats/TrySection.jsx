import { useState } from "react";
import { setStats } from "../../utils/firestore";

export default function TrySection({ stats, setStatsState, matchId, canEdit, players }) {
    const [tries, setTries] = useState(stats?.tries || []);
    const [playerId, setPlayerId] = useState(players?.[0]?.id || "");
    const [fromPlay, setFromPlay] = useState(false);
    const [minute, setMinute] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleAdd(e) {
        e.preventDefault();
        setSaving(true);
        const entry = { playerId, fromPlay, ...(minute !== "" ? { minute: Number(minute) } : {}) };
        const updated = [...tries, entry];
        await setStats(matchId, { ...stats, tries: updated });
        setStatsState(prev => ({ ...prev, tries: updated }));
        setTries(updated);
        setFromPlay(false);
        setMinute("");
        setSaving(false);
    }

    async function handleDelete(idx) {
        setSaving(true);
        const updated = tries.filter((_, i) => i !== idx);
        await setStats(matchId, { ...stats, tries: updated });
        setStatsState(prev => ({ ...prev, tries: updated }));
        setTries(updated);
        setSaving(false);
    }

    function playerName(id) {
        return players?.find(p => p.id === id)?.name || id;
    }

    return (
        <div>
            {tries.length === 0 && <p style={{ color: "#999" }}>No tries recorded yet.</p>}
            {tries.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, padding: "6px 12px", background: "#eee", borderRadius: 6 }}>
                    <span style={{ flex: 1 }}>
                        <strong>{playerName(t.playerId)}</strong>
                        {t.fromPlay && <span style={{ marginLeft: 8, fontSize: 12, color: "#555" }}>(set play)</span>}
                        {t.minute !== undefined && <span style={{ marginLeft: 8, fontSize: 12, color: "#777" }}>min. {t.minute}</span>}
                    </span>
                    {canEdit && (
                        <button type="button" onClick={() => handleDelete(i)} disabled={saving} style={{ fontSize: 11, padding: "2px 6px" }}>✕</button>
                    )}
                </div>
            ))}
            {canEdit && players?.length > 0 && (
                <form onSubmit={handleAdd} style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <select value={playerId} onChange={e => setPlayerId(e.target.value)} required>
                        {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                        <input type="checkbox" checked={fromPlay} onChange={e => setFromPlay(e.target.checked)} />
                        Set play
                    </label>
                    <input type="number" placeholder="Min. (opt.)" value={minute} onChange={e => setMinute(e.target.value)} min="1" max="80" style={{ width: 90 }} />
                    <button type="submit" disabled={saving}>{saving ? "..." : "Add Try"}</button>
                </form>
            )}
        </div>
    );
}
