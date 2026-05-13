import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getClubPlaybook } from "../../utils/firestore";

const RESULTS = ["try", "penalty", "turnover", "other"];

export default function PlaysSection({ stats, addEvent, deleteEvent, canEdit, players, squad = [] }) {
    const { club } = useAuth();
    const [playbook, setPlaybook] = useState([]);
    const [selectedPlay, setSelectedPlay] = useState(null);
    const [playersByJersey, setPlayersByJersey] = useState({});
    const [result, setResult] = useState("try");

    useEffect(() => {
        if (club?.clubId) getClubPlaybook(club.clubId).then(setPlaybook);
    }, [club]);

    const plays = stats?.plays || [];

    function playerForJersey(jersey) {
        const entry = squad.find(s => String(s.jersey) === String(jersey));
        return entry?.playerId || "";
    }

    function handlePlaySelect(playId) {
        const play = playbook.find(p => p.id === playId) || null;
        setSelectedPlay(play);
        if (play?.jerseys) {
            const prefilled = {};
            play.jerseys.forEach(n => { prefilled[n] = playerForJersey(n); });
            setPlayersByJersey(prefilled);
        } else {
            setPlayersByJersey({});
        }
    }

    async function handleAdd(e) {
        e.preventDefault();
        if (!selectedPlay) return;
        await addEvent({ type: "play", playbookId: selectedPlay.id, name: selectedPlay.name, playersByJersey, result });
        setSelectedPlay(null);
        setPlayersByJersey({});
        setResult("try");
    }

    function describePlay(play) {
        if (!play.playersByJersey) return null;
        return Object.entries(play.playersByJersey)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([jersey, pid]) => {
                const p = players?.find(pl => pl.id === pid);
                return `#${jersey}: ${p?.displayName || "—"}`;
            }).join(", ");
    }

    return (
        <div>
            {plays.length === 0 && <p style={{ color: "#999" }}>No plays recorded yet.</p>}
            {plays.map(play => (
                <div key={play.id} className="card"
                    style={{ background: "#eee", padding: "8px 12px", borderRadius: 6, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <strong>{play.name}</strong>
                        <span style={{ marginLeft: 8, fontSize: 13, color: "#555" }}>{play.result}</span>
                        {describePlay(play) && (
                            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#777" }}>{describePlay(play)}</p>
                        )}
                    </div>
                    {canEdit && (
                        <button type="button" onClick={() => deleteEvent(play.id)}
                            style={{ fontSize: 11, padding: "2px 6px", marginLeft: 8 }}>✕</button>
                    )}
                </div>
            ))}

            {canEdit && (
                <form onSubmit={handleAdd} style={{ marginTop: 12 }}>
                    {playbook.length === 0 ? (
                        <p style={{ fontSize: 13, color: "#999" }}>No plays in the playbook.</p>
                    ) : (
                        <>
                            <div style={{ marginBottom: 10 }}>
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

                            {selectedPlay?.jerseys?.length > 0 && (
                                <div style={{ marginBottom: 10 }}>
                                    <label style={{ display: "block", marginBottom: 6 }}>Players</label>
                                    {selectedPlay.jerseys.map(n => (
                                        <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                            <span style={{ fontWeight: 700, width: 32, flexShrink: 0 }}>#{n}</span>
                                            <select
                                                value={playersByJersey[n] || ""}
                                                onChange={e => setPlayersByJersey(prev => ({ ...prev, [n]: e.target.value }))}
                                                style={{ flex: 1, fontSize: 13 }}
                                            >
                                                <option value="">— none —</option>
                                                {players?.map(p => {
                                                    const usedElsewhere = Object.entries(playersByJersey)
                                                        .some(([slot, pid]) => String(slot) !== String(n) && pid === p.id);
                                                    return (
                                                        <option key={p.id} value={p.id} disabled={usedElsewhere}>
                                                            {p.displayName}{usedElsewhere ? " (ya asignado)" : ""}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ marginBottom: 10 }}>
                                <label>Result</label>
                                <select value={result} onChange={e => setResult(e.target.value)}
                                    style={{ display: "block", marginTop: 4 }}>
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
