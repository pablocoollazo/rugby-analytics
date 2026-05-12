import { useState } from "react";
import { setStats } from "../../utils/firestore";

export default function RuckSection({ stats, setStatsState, matchId, canEdit }) {
    const rucks = stats?.rucks || { lost: 0, oppRecoveredPushover: 0, oppRecoveredRetained: 0 };

    const [lost, setLost] = useState(rucks.lost || 0);
    const [oppPushover, setOppPushover] = useState(rucks.oppRecoveredPushover || 0);
    const [oppRetained, setOppRetained] = useState(rucks.oppRecoveredRetained || 0);
    const [saving, setSaving] = useState(false);

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        const updatedRucks = {
            lost: Number(lost),
            oppRecoveredPushover: Number(oppPushover),
            oppRecoveredRetained: Number(oppRetained),
        };
        await setStats(matchId, { ...stats, rucks: updatedRucks });
        setStatsState(prev => ({ ...prev, rucks: updatedRucks }));
        setSaving(false);
    }

    return (
        <div>
            {stats?.rucks && (
                <div style={{ marginBottom: 12 }}>
                    <p>Lost: <strong>{stats.rucks.lost}</strong> · Opp. pushover: <strong>{stats.rucks.oppRecoveredPushover}</strong> · Opp. retained: <strong>{stats.rucks.oppRecoveredRetained}</strong></p>
                </div>
            )}
            {canEdit && (
                <form onSubmit={handleSave}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
                        <div>
                            <label>Ours lost</label>
                            <input type="number" value={lost} onChange={e => setLost(e.target.value)} min="0" />
                        </div>
                        <div>
                            <label>Opp. pushover</label>
                            <input type="number" value={oppPushover} onChange={e => setOppPushover(e.target.value)} min="0" />
                        </div>
                        <div>
                            <label>Opp. retained</label>
                            <input type="number" value={oppRetained} onChange={e => setOppRetained(e.target.value)} min="0" />
                        </div>
                    </div>
                    <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Rucks"}</button>
                </form>
            )}
        </div>
    );
}
