import { useState } from "react";
import { setStats } from "../../utils/firestore";

export default function ScrumSection({ stats, setStatsState, matchId, canEdit }) {
    const scrums = stats?.scrums || { ours: 0, won: 0, stolen: 0 };

    const [ours, setOurs] = useState(scrums.ours || 0);
    const [won, setWon] = useState(scrums.won || 0);
    const [stolen, setStolen] = useState(scrums.stolen || 0);
    const [saving, setSaving] = useState(false);

    const computedLost = Number(ours) - Number(won);

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        const updatedScrums = { ours: Number(ours), won: Number(won), lost: computedLost, stolen: Number(stolen) };
        await setStats(matchId, { ...stats, scrums: updatedScrums });
        setStatsState(prev => ({ ...prev, scrums: updatedScrums }));
        setSaving(false);
    }

    return (
        <div>
            {stats?.scrums && (
                <div style={{ marginBottom: 12 }}>
                    <p>Ours: <strong>{stats.scrums.ours}</strong> · Won: <strong>{stats.scrums.won}</strong> · Lost: <strong>{stats.scrums.lost ?? (stats.scrums.ours - stats.scrums.won)}</strong> · Stolen: <strong>{stats.scrums.stolen}</strong></p>
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
                            <label>Stolen</label>
                            <input type="number" value={stolen} onChange={e => setStolen(e.target.value)} min="0" />
                        </div>
                    </div>
                    <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>Lost (auto): {computedLost}</p>
                    <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Scrums"}</button>
                </form>
            )}
        </div>
    );
}