import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getClubPlaybook } from "../../utils/firestore";

const RESULTS = ["try", "penalty", "turnover", "other"];

export default function PlaysSection({ stats, addEvent, deleteEvent, canEdit, players }) {
    const { club } = useAuth();
    const [playbook, setPlaybook] = useState([]);
    const [selectedPlay, setSelectedPlay] = useState(null);
    const [activePlayers, setActivePlayers] = useState([]);
    const [result, setResult] = useState("try");

    useEffect(() => {
        if (club?.clubId) getClubPlaybook(club.clubId).then(setPlaybook);
    }, [club]);

    const plays = stats?.plays || [];

    function handlePlaySelect(playId) {
        const play = playbook.find(p => p.id === playId) || null;
        setSelectedPlay(play);
        setActivePlayers(play?.playerIds || []);
    }

    function togglePlayer(id) {
        setActivePlayers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }

    async function handleAdd(e) {
        e.preventDefault();
        if (!selectedPlay) return;
        await addEvent({
            type: "play",
            playbookId: selectedPlay.id,
            name: selectedPlay.name,
            playerIds: activePlayers,
            result,
        });
        setSelectedPlay(null);
        setActivePlayers([]);
        setResult("try");
    }

    function playerName(id) {
        return players?.find(p => p.id === id)?.displayName || id;
    }

    return (
        <div>
            {plays.length === 0 && <p style={{ color: "#999" }}>No plays recorded yet.</p>}
            {plays.map(play => (
                <div key={play.id} style={{ background: "#eee", padding: "8px 12px", borderRadius: 6, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <strong>{play.name}</strong>
                        <span style={{ marginLeft: 8, fontSize: 13, color: "#555" }}>{play.result}</span>
                        {play.playerIds?.length > 0 && (
                            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#777" }}>{play.playerIds.map(playerName).join(", ")}</p>
                        )}
                    </div>
                    {canEdit && (
                        <button type="button" onClick={() => deleteEvent(play.id)} style={{ fontSize: 11, padding: "2px 6px" }}>✕</button>
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
                                                <input type="checkbox" checked={activePlayers.includes(p.id)} onChange={() => togglePlayer(p.id)} />
                                                {p.displayName}
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
                            <button type="submit" disabled={!selectedPlay}>Add Play</button>
                        </>
                    )}
                </form>
            )}
        </div>
    );
}
