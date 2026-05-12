import { useState } from "react";
import { setStats } from "../../utils/firestore";

export default function KickSection({ stats, setStatsState, matchId, canEdit, players }) {
    const kickers = players?.filter(p => p.isKicker) || [];

    const [kicks, setKicks] = useState(() => {
        const map = {};
        kickers.forEach(p => {
            map[p.id] = {
                attempts: stats?.playerStats?.[p.id]?.kicksAtGoal?.attempts || 0,
                successful: stats?.playerStats?.[p.id]?.kicksAtGoal?.successful || 0,
            };
        });
        return map;
    });
    const [saving, setSaving] = useState(false);

    function setField(playerId, field, value) {
        setKicks(prev => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }));
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        const updatedPlayerStats = { ...stats?.playerStats };
        kickers.forEach(p => {
            updatedPlayerStats[p.id] = {
                ...updatedPlayerStats[p.id],
                kicksAtGoal: {
                    attempts: Number(kicks[p.id]?.attempts || 0),
                    successful: Number(kicks[p.id]?.successful || 0),
                },
            };
        });
        await setStats(matchId, { ...stats, playerStats: updatedPlayerStats });
        setStatsState(prev => ({ ...prev, playerStats: updatedPlayerStats }));
        setSaving(false);
    }

    if (!kickers.length) return <p style={{ color: "#999", fontSize: 13 }}>No kickers assigned. Mark players as Kicker in the Players page.</p>;

    return (
        <div>
            {!canEdit && stats?.playerStats && (
                <div style={{ marginBottom: 12 }}>
                    {kickers.filter(p => stats.playerStats?.[p.id]?.kicksAtGoal).map(p => {
                        const k = stats.playerStats[p.id].kicksAtGoal;
                        const pct = k.attempts > 0 ? Math.round((k.successful / k.attempts) * 100) : 0;
                        return <p key={p.id}>{p.name}: <strong>{k.successful}/{k.attempts}</strong> ({pct}%)</p>;
                    })}
                </div>
            )}
            {canEdit && (
                <form onSubmit={handleSave}>
                    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: "left", paddingBottom: 6 }}>Player</th>
                                <th>Attempts</th>
                                <th>Successful</th>
                                <th>Accuracy</th>
                            </tr>
                        </thead>
                        <tbody>
                            {kickers.map(p => {
                                const attempts = Number(kicks[p.id]?.attempts || 0);
                                const successful = Number(kicks[p.id]?.successful || 0);
                                const pct = attempts > 0 ? Math.round((successful / attempts) * 100) : 0;
                                return (
                                    <tr key={p.id}>
                                        <td style={{ paddingRight: 12, paddingBottom: 6 }}>{p.name}</td>
                                        <td><input type="number" value={kicks[p.id]?.attempts ?? 0} onChange={e => setField(p.id, "attempts", e.target.value)} min="0" style={{ width: 60 }} /></td>
                                        <td><input type="number" value={kicks[p.id]?.successful ?? 0} onChange={e => setField(p.id, "successful", e.target.value)} min="0" style={{ width: 60 }} /></td>
                                        <td style={{ color: "#666", paddingLeft: 8 }}>{pct}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Kicks"}</button>
                </form>
            )}
        </div>
    );
}
