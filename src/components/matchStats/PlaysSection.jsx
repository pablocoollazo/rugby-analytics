import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getClubPlaybook } from "../../utils/firestore";
import { slotName } from "../../utils/positions";

const RESULTS = ["try", "penalty", "turnover", "other"];

export default function PlaysSection({ stats, addEvent, deleteEvent, canEdit, players, squad = [] }) {
    const { club } = useAuth();
    const [playbook, setPlaybook] = useState([]);
    const [selectedPlay, setSelectedPlay] = useState(null);
    const [playersBySlot, setPlayersBySlot] = useState({});
    const [result, setResult] = useState("try");

    useEffect(() => {
        if (club?.clubId) getClubPlaybook(club.clubId).then(setPlaybook);
    }, [club]);

    const plays = stats?.plays || [];

    // squad is effectiveSquad: [{ playerId, slot, position }]
    // Auto-fill: for each slot in the play, find who covers that slot
    function buildPrefilled(slots) {
        const used = new Set();
        const prefilled = {};
        (slots || []).forEach(slot => {
            const key = String(slot);
            const entry = squad.find(s => String(s.slot) === key && !used.has(s.playerId));
            prefilled[key] = entry?.playerId || "";
            if (entry?.playerId) used.add(entry.playerId);
        });
        return prefilled;
    }

    function handlePlaySelect(playId) {
        const play = playbook.find(p => p.id === playId) || null;
        setSelectedPlay(play);
        const slots = play?.slots || play?.jerseys; // backwards compat with old plays
        setPlayersBySlot(slots ? buildPrefilled(slots) : {});
    }

    async function handleAdd(e) {
        e.preventDefault();
        if (!selectedPlay) return;
        await addEvent({ type: "play", playbookId: selectedPlay.id, name: selectedPlay.name, playersBySlot, result });
        setSelectedPlay(null);
        setPlayersBySlot({});
        setResult("try");
    }

    function describePlay(play) {
        const bySlot = play.playersBySlot || play.playersByJersey;
        if (!bySlot) return null;
        return Object.entries(bySlot)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([slot, pid]) => {
                const p = players?.find(pl => pl.id === pid);
                return `${slotName(slot) || `#${slot}`}: ${p?.displayName || "—"}`;
            }).join(", ");
    }

    const playSlots = selectedPlay?.slots || selectedPlay?.jerseys || [];

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

                            {playSlots.length > 0 && (
                                <div style={{ marginBottom: 10 }}>
                                    <label style={{ display: "block", marginBottom: 6 }}>Players</label>
                                    {playSlots.map(slot => {
                                        const key = String(slot);
                                        return (
                                            <div key={slot} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                                <span style={{ fontWeight: 600, width: 160, flexShrink: 0, fontSize: 13 }}>
                                                    {slotName(slot)}
                                                </span>
                                                <select
                                                    value={playersBySlot[key] || ""}
                                                    onChange={e => setPlayersBySlot(prev => ({ ...prev, [key]: e.target.value }))}
                                                    style={{ flex: 1, fontSize: 13 }}
                                                >
                                                    <option value="">— none —</option>
                                                    {players?.map(p => {
                                                        const usedElsewhere = Object.entries(playersBySlot)
                                                            .some(([s, pid]) => s !== key && pid === p.id);
                                                        return (
                                                            <option key={p.id} value={p.id} disabled={usedElsewhere}>
                                                                {p.displayName}{usedElsewhere ? " (already assigned)" : ""}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                        );
                                    })}
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
