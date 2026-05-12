import { useState } from "react";
import { setStats } from "../../utils/firestore";

const REASONS = ["scrum", "ruck", "offside", "knock-on", "illegal tackle", "other"];

export default function PenaltySection({ stats, setStatsState, matchId, canEdit, players }) {
    const [pensByPlayer, setPensByPlayer] = useState(() => {
        const map = {};
        players?.forEach(p => { map[p.id] = stats?.playerStats?.[p.id]?.penalties || []; });
        return map;
    });
    const [newReason, setNewReason] = useState(() => {
        const map = {};
        players?.forEach(p => { map[p.id] = "scrum"; });
        return map;
    });
    const [saving, setSaving] = useState(null);

    async function savePlayer(playerId, updatedPens) {
        const updatedPlayerStats = {
            ...stats?.playerStats,
            [playerId]: { ...stats?.playerStats?.[playerId], penalties: updatedPens },
        };
        await setStats(matchId, { ...stats, playerStats: updatedPlayerStats });
        setStatsState(prev => ({ ...prev, playerStats: updatedPlayerStats }));
    }

    async function handleAdd(e, playerId) {
        e.preventDefault();
        setSaving(playerId);
        const updated = [...(pensByPlayer[playerId] || []), { reason: newReason[playerId] }];
        setPensByPlayer(prev => ({ ...prev, [playerId]: updated }));
        await savePlayer(playerId, updated);
        setSaving(null);
    }

    async function handleDelete(playerId, idx) {
        setSaving(playerId);
        const updated = pensByPlayer[playerId].filter((_, i) => i !== idx);
        setPensByPlayer(prev => ({ ...prev, [playerId]: updated }));
        await savePlayer(playerId, updated);
        setSaving(null);
    }

    if (!players?.length) return <p>No players registered.</p>;

    return (
        <div>
            {players.map(p => {
                const list = pensByPlayer[p.id] || [];
                return (
                    <div key={p.id} style={{ marginBottom: 16 }}>
                        <strong>{p.name}</strong>
                        {list.length === 0 && <span style={{ color: "#999", marginLeft: 8 }}>—</span>}
                        {list.map((pen, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                                <span style={{ fontSize: 13 }}>{pen.reason}</span>
                                {canEdit && (
                                    <button type="button" onClick={() => handleDelete(p.id, i)} disabled={saving === p.id} style={{ fontSize: 11, padding: "2px 6px" }}>✕</button>
                                )}
                            </div>
                        ))}
                        {canEdit && (
                            <form onSubmit={e => handleAdd(e, p.id)} style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                                <select
                                    value={newReason[p.id]}
                                    onChange={e => setNewReason(prev => ({ ...prev, [p.id]: e.target.value }))}
                                >
                                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <button type="submit" disabled={saving === p.id}>{saving === p.id ? "..." : "Add"}</button>
                            </form>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
