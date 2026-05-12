import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getClubPlaybook, setStats } from "../../utils/firestore";

const RESULTS = ["try", "penalty", "turnover", "other"];

export default function PlaysSection({ stats, setStatsState, matchId, canEdit, players }) {
    const { club } = useAuth();
    const [playbook, setPlaybook] = useState([]);
    const [plays, setPlays] = useState(stats?.plays || []);

    const [selectedPlay, setSelectedPlay] = useState(null);
    const [activePlayers, setActivePlayers] = useState([]);
    const [result, setResult] = useState("try");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (club?.clubId) {
            getClubPlaybook(club.clubId).then(setPlaybook);
        }
    }, [club]);

    function handlePlaySelect(playId) {
        const play = playbook.find(p => p.id === playId) || null;
        setSelectedPlay(play);
        setActivePlayers(play?.playerIds || []);
    }

    function togglePlayer(id) {
        setActivePlayers(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    }

    async function handleAdd(e) {
        e.preventDefault();
        if (!selectedPlay) return;
        setSaving(true);
        const entry = {
            playbookId: selectedPlay.id,
            name: selectedPlay.name,
            playerIds: activePlayers,
            result,
        };
        const updated = [...plays, entry];
        await setStats(matchId, { ...stats, plays: updated });
        setStatsState(prev => ({ ...prev, plays: updated }));
        setPlays(updated);
        setSelectedPlay(null);
        setActivePlayers([]);
        setResult("try");
        setSaving(false);
    }

    async function handleDelete(idx) {
        setSaving(true);
        const updated = plays.filter((_, i) => i !== idx);
        await setStats(matchId, { ...stats, plays: updated });
        setStatsState(prev => ({ ...prev, plays: updated }));
        setPlays(updated);
        setSaving(false);
    }

    function playerName(id) {
        return players?.find(p => p.id === id)?.name || id;
    }

    return (
        <div>
            {plays.length === 0 && <p style={{ color: "#999" }}>No plays recorded yet.</p>}
            {plays.map((play, i) => (
                <div key={i} style={{ background: "#eee", padding: "8px 12px", borderRadius: 6, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <strong>{play.name}</strong>
                        <span style={{ marginLeft: 8, fontSize: 13, color: "#555" }}>{play.result}</span>
                        {play.playerIds?.length > 0 && (
                            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#777" }}>{play.playerIds.map(playerName).join(", ")}</p>
                        )}
                    </div>
                    {canEdit && (
                        <button type="button" onClick={() => handleDelete(i)} disabled={saving} style={{ fontSize: 11, padding: "2px 6px" }}>✕</button>
                    )}
                </div>
            ))}

            {canEdit && (
                <form onSubmit={handleAdd} style={{ marginTop: 12 }}>
                    {playbook.length === 0 ? (
                        <p style={{ fontSize: 13, color: "#999" }}>No plays in the playbook. Add some in the <a href="/playbook">Playbook</a> page.</p>
                    ) : (
                        <>
                            <div style={{ marginBottom: 8 }}>
                                <label>Play</label>
                                <select
                                    value={selectedPlay?.id || ""}
                                    onChange={e => handlePlaySelect(e.target.value)}
                                    style={{ display: "block", marginTop: 4, width: "100%" }}
                                    required
                                >
                                    <option value="" disabled>Select a play...</option>
                                    {playbook.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedPlay && players?.length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                    <label>Players involved</label>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                                        {players.map(p => (
                                            <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={activePlayers.includes(p.id)}
                                                    onChange={() => togglePlayer(p.id)}
                                                />
                                                {p.name}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ marginBottom: 8 }}>
                                <label>Result</label>
                                <select value={result} onChange={e => setResult(e.target.value)} style={{ display: "block", marginTop: 4 }}>
                                    {RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>

                            <button type="submit" disabled={saving || !selectedPlay}>{saving ? "Saving..." : "Add Play"}</button>
                        </>
                    )}
                </form>
            )}
        </div>
    );
}
