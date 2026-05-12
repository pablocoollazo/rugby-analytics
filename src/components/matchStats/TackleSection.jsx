import { useState } from "react";
import { setStats } from "../../utils/firestore";

export default function TackleSection({ stats, setStatsState, matchId, canEdit, players }) {
    const [tackles, setTackles] = useState(() => {
        const map = {};
        players?.forEach(p => {
            map[p.id] = {
                won: stats?.playerStats?.[p.id]?.tacklesWon || 0,
                lost: stats?.playerStats?.[p.id]?.tacklesLost || 0,
                missed: stats?.playerStats?.[p.id]?.tacklesMissed || 0,
            };
        });
        return map;
    });
    const [saving, setSaving] = useState(false);

    function setField(playerId, field, value) {
        setTackles(prev => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }));
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        const updatedPlayerStats = { ...stats?.playerStats };
        players?.forEach(p => {
            updatedPlayerStats[p.id] = {
                ...updatedPlayerStats[p.id],
                tacklesWon: Number(tackles[p.id]?.won || 0),
                tacklesLost: Number(tackles[p.id]?.lost || 0),
                tacklesMissed: Number(tackles[p.id]?.missed || 0),
            };
        });
        await setStats(matchId, { ...stats, playerStats: updatedPlayerStats });
        setStatsState(prev => ({ ...prev, playerStats: updatedPlayerStats }));
        setSaving(false);
    }

    if (!players?.length) return <p>No players registered.</p>;

    return (
        <div>
            {!canEdit && stats?.playerStats && (
                <div style={{ marginBottom: 12 }}>
                    {players.filter(p => stats.playerStats?.[p.id]).map(p => {
                        const t = stats.playerStats[p.id];
                        return <p key={p.id}>{p.name}: Won <strong>{t.tacklesWon || 0}</strong> · Lost <strong>{t.tacklesLost || 0}</strong> · Missed <strong>{t.tacklesMissed || 0}</strong></p>;
                    })}
                </div>
            )}
            {canEdit && (
                <form onSubmit={handleSave}>
                    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: "left", paddingBottom: 6 }}>Player</th>
                                <th>Won</th>
                                <th>Lost</th>
                                <th>Missed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {players.map(p => (
                                <tr key={p.id}>
                                    <td style={{ paddingRight: 12, paddingBottom: 6 }}>{p.name}</td>
                                    <td><input type="number" value={tackles[p.id]?.won ?? 0} onChange={e => setField(p.id, "won", e.target.value)} min="0" style={{ width: 50 }} /></td>
                                    <td><input type="number" value={tackles[p.id]?.lost ?? 0} onChange={e => setField(p.id, "lost", e.target.value)} min="0" style={{ width: 50 }} /></td>
                                    <td><input type="number" value={tackles[p.id]?.missed ?? 0} onChange={e => setField(p.id, "missed", e.target.value)} min="0" style={{ width: 50 }} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Tackles"}</button>
                </form>
            )}
        </div>
    );
}
