import { useState } from "react";
import { setStats } from "../../utils/firestore";

const RATINGS = ["good", "bad"];

export default function PlayKickSection({ stats, setStatsState, matchId, canEdit, players }) {
    const [kicksByPlayer, setKicksByPlayer] = useState(() => {
        const map = {};
        players?.forEach(p => { map[p.id] = stats?.playerStats?.[p.id]?.playKicks || []; });
        return map;
    });
    const [newEntry, setNewEntry] = useState(() => {
        const map = {};
        players?.forEach(p => { map[p.id] = { rating: "good", distance: "" }; });
        return map;
    });
    const [saving, setSaving] = useState(null);

    async function savePlayer(playerId, updatedKicks) {
        const updatedPlayerStats = {
            ...stats?.playerStats,
            [playerId]: { ...stats?.playerStats?.[playerId], playKicks: updatedKicks },
        };
        await setStats(matchId, { ...stats, playerStats: updatedPlayerStats });
        setStatsState(prev => ({ ...prev, playerStats: updatedPlayerStats }));
    }

    async function handleAdd(e, playerId) {
        e.preventDefault();
        setSaving(playerId);
        const entry = { rating: newEntry[playerId].rating, distance: Number(newEntry[playerId].distance) };
        const updated = [...(kicksByPlayer[playerId] || []), entry];
        setKicksByPlayer(prev => ({ ...prev, [playerId]: updated }));
        await savePlayer(playerId, updated);
        setNewEntry(prev => ({ ...prev, [playerId]: { rating: "good", distance: "" } }));
        setSaving(null);
    }

    async function handleDelete(playerId, idx) {
        setSaving(playerId);
        const updated = kicksByPlayer[playerId].filter((_, i) => i !== idx);
        setKicksByPlayer(prev => ({ ...prev, [playerId]: updated }));
        await savePlayer(playerId, updated);
        setSaving(null);
    }

    if (!players?.length) return <p>No players registered.</p>;

    return (
        <div>
            {players.map(p => {
                const list = kicksByPlayer[p.id] || [];
                return (
                    <div key={p.id} style={{ marginBottom: 16 }}>
                        <strong>{p.name}</strong>
                        {list.length === 0 && <span style={{ color: "#999", marginLeft: 8 }}>—</span>}
                        {list.map((k, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                                <span style={{ fontSize: 13 }}>{k.rating} · {k.distance}m</span>
                                {canEdit && (
                                    <button type="button" onClick={() => handleDelete(p.id, i)} disabled={saving === p.id} style={{ fontSize: 11, padding: "2px 6px" }}>✕</button>
                                )}
                            </div>
                        ))}
                        {canEdit && (
                            <form onSubmit={e => handleAdd(e, p.id)} style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                                <select
                                    value={newEntry[p.id]?.rating}
                                    onChange={e => setNewEntry(prev => ({ ...prev, [p.id]: { ...prev[p.id], rating: e.target.value } }))}
                                >
                                    {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <input
                                    type="number"
                                    placeholder="Distance (m)"
                                    value={newEntry[p.id]?.distance}
                                    onChange={e => setNewEntry(prev => ({ ...prev, [p.id]: { ...prev[p.id], distance: e.target.value } }))}
                                    min="0"
                                    style={{ width: 100 }}
                                    required
                                />
                                <button type="submit" disabled={saving === p.id}>{saving === p.id ? "..." : "Add"}</button>
                            </form>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
