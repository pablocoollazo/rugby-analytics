import { useState } from "react";
import { setStats } from "../../utils/firestore";

export default function LineoutSection({ stats, setStatsState, matchId, canEdit, players }) {
    const lineouts = stats?.lineouts || { ours: 0, won: 0, stolen: 0 };

    const [ours, setOurs] = useState(lineouts.ours || 0);
    const [won, setWon] = useState(lineouts.won || 0);
    const [stolen, setStolen] = useState(lineouts.stolen || 0);

    const throwers = players?.filter(p => p.isThrower) || [];
    const [errors, setErrors] = useState(() => {
        const map = {};
        throwers.forEach(p => { map[p.id] = stats?.playerStats?.[p.id]?.lineoutErrors || 0; });
        return map;
    });
    const [saving, setSaving] = useState(false);

    const computedLost = Number(ours) - Number(won) - Number(stolen);

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        const updatedLineouts = { ours: Number(ours), won: Number(won), stolen: Number(stolen), lost: computedLost };
        const updatedPlayerStats = { ...stats?.playerStats };
        throwers.forEach(p => {
            updatedPlayerStats[p.id] = { ...updatedPlayerStats[p.id], lineoutErrors: Number(errors[p.id] || 0) };
        });
        await setStats(matchId, { ...stats, lineouts: updatedLineouts, playerStats: updatedPlayerStats });
        setStatsState(prev => ({ ...prev, lineouts: updatedLineouts, playerStats: updatedPlayerStats }));
        setSaving(false);
    }

    return (
        <div>
            {stats?.lineouts && (
                <div style={{ marginBottom: 12 }}>
                    <p>Ours: <strong>{stats.lineouts.ours}</strong> · Won: <strong>{stats.lineouts.won}</strong> · Stolen: <strong>{stats.lineouts.stolen}</strong> · Lost: <strong>{stats.lineouts.lost ?? computedLost}</strong></p>
                </div>
            )}
            {canEdit && (
                <form onSubmit={handleSave}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
                        <div>
                            <label>Ours</label>
                            <input type="number" value={ours} onChange={e => setOurs(e.target.value)} min="0" />
                        </div>
                        <div>
                            <label>Won</label>
                            <input type="number" value={won} onChange={e => setWon(e.target.value)} min="0" />
                        </div>
                        <div>
                            <label>Stolen by them</label>
                            <input type="number" value={stolen} onChange={e => setStolen(e.target.value)} min="0" />
                        </div>
                    </div>
                    <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>Lost (auto): {computedLost}</p>
                    {throwers.length > 0 && (
                        <>
                            <h4 style={{ marginBottom: 8 }}>Throwing errors</h4>
                            {throwers.map(p => (
                                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                    <span style={{ flex: 1 }}>{p.name}</span>
                                    <input
                                        type="number"
                                        value={errors[p.id] ?? 0}
                                        onChange={e => setErrors(prev => ({ ...prev, [p.id]: e.target.value }))}
                                        min="0"
                                        style={{ width: 60 }}
                                    />
                                </div>
                            ))}
                        </>
                    )}
                    {throwers.length === 0 && (
                        <p style={{ fontSize: 13, color: "#999" }}>No throwers assigned. Mark players as Thrower in the Players page.</p>
                    )}
                    <button type="submit" disabled={saving} style={{ marginTop: 12 }}>{saving ? "Saving..." : "Save Line-outs"}</button>
                </form>
            )}
        </div>
    );
}
