import { useState } from "react";

const PENALTY_REASONS = ["scrum", "ruck", "offside", "knock-on", "illegal tackle", "other"];

const JERSEY_POSITION = {
    1: "Prop Left", 2: "Hooker", 3: "Prop Right", 4: "Lock", 5: "Lock",
    6: "Flanker", 7: "Flanker", 8: "Number 8", 9: "Scrum Half", 10: "Fly-half",
    11: "Wing", 12: "Inside Center", 13: "Outside Center", 14: "Wing", 15: "Full-back",
};

export default function PlayerEvents({ stats, events, addEvent, deleteEvent, canEdit, players, squad = [] }) {
    const [selectedId, setSelectedId] = useState(null);
    const [tryForm, setTryForm] = useState({ fromPlay: false, minute: "" });
    const [penaltyReason, setPenaltyReason] = useState("scrum");
    const [kickForm, setKickForm] = useState({ rating: "good", distance: "" });

    if (!players?.length) return <p style={{ color: "#999" }}>No players in squad.</p>;

    const onFieldIds = new Set((squad || []).map(s => s.playerId));
    const onField = players.filter(p => onFieldIds.has(p.id));
    const offField = players.filter(p => !onFieldIds.has(p.id));

    const selectedPlayer = players.find(p => p.id === selectedId) || null;
    const selectedIsOnField = onFieldIds.has(selectedId);

    function select(id) {
        setSelectedId(prev => prev === id ? null : id);
        setTryForm({ fromPlay: false, minute: "" });
        setPenaltyReason("scrum");
        setKickForm({ rating: "good", distance: "" });
    }

    async function addTry() {
        await addEvent({
            type: "try",
            playerId: selectedId,
            fromPlay: tryForm.fromPlay,
            ...(tryForm.minute !== "" ? { minute: Number(tryForm.minute) } : {}),
        });
        setTryForm({ fromPlay: false, minute: "" });
    }

    async function addPlayKick() {
        if (!kickForm.distance) return;
        await addEvent({ type: "play_kick", playerId: selectedId, rating: kickForm.rating, distance: Number(kickForm.distance) });
        setKickForm({ rating: "good", distance: "" });
    }

    function summaryLabel(p) {
        const ps = stats?.playerStats?.[p.id] || {};
        const tries = (stats?.tries || []).filter(t => t.playerId === p.id).length;
        const pens = (ps.penalties || []).length;
        const tw = ps.tacklesWon || 0;
        const tl = ps.tacklesLost || 0;
        const tm = ps.tacklesMissed || 0;
        const kg = ps.kicksAtGoal;
        const parts = [];
        if (tw + tl + tm > 0) parts.push(`T ${tw}/${tl}/${tm}`);
        if (tries > 0) parts.push(`${tries} try`);
        if (pens > 0) parts.push(`${pens} pen`);
        if (kg?.attempts > 0) parts.push(`${kg.successful}/${kg.attempts} kicks`);
        return parts.join(" · ") || "—";
    }

    const recentEvents = (events || [])
        .filter(e => e.playerId === selectedId)
        .slice(-4)
        .reverse();

    return (
        <div>
            {/* On-field players grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {onField.map(p => {
                    const isSelected = selectedId === p.id;
                    const entry = squad.find(s => s.playerId === p.id);
                    return (
                        <div key={p.id}
                            onClick={() => canEdit ? select(p.id) : null}
                            style={{
                                padding: "10px 12px",
                                background: isSelected ? "#1d4ed8" : "#e8e8e8",
                                color: isSelected ? "#fff" : "#000",
                                borderRadius: 8,
                                cursor: canEdit ? "pointer" : "default",
                                userSelect: "none",
                            }}
                        >
                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                                {entry?.jersey ? <span style={{ opacity: 0.7, marginRight: 5 }}>#{entry.jersey}</span> : null}
                                {p.displayName}
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 1 }}>
                                {JERSEY_POSITION[Number(entry?.jersey)] || entry?.position || p.mainPosition}
                            </div>
                            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85 }}>{summaryLabel(p)}</div>
                        </div>
                    );
                })}
            </div>

            {/* Off-field players (substituted out) — undo only */}
            {offField.length > 0 && (
                <div style={{ marginTop: 12 }}>
                    <small style={{ color: "#888", fontWeight: 600 }}>FUERA DEL CAMPO</small>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                        {offField.map(p => {
                            const isSelected = selectedId === p.id;
                            return (
                                <div key={p.id}
                                    onClick={() => select(p.id)}
                                    style={{
                                        padding: "10px 12px",
                                        background: isSelected ? "#6b7280" : "#d1d5db",
                                        color: isSelected ? "#fff" : "#555",
                                        borderRadius: 8,
                                        cursor: "pointer",
                                        userSelect: "none",
                                        opacity: 0.85,
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.displayName}</div>
                                    <div style={{ fontSize: 11, marginTop: 4 }}>{summaryLabel(p)}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Undo-only panel for off-field players */}
            {selectedPlayer && !selectedIsOnField && (
                <div style={{ marginTop: 10, padding: "14px 16px", background: "#f3f4f6", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <strong>{selectedPlayer.displayName}</strong>
                        <button type="button" onClick={() => setSelectedId(null)}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#555" }}>✕</button>
                    </div>
                    <small style={{ color: "#888" }}>Fuera del campo — solo se pueden deshacer eventos.</small>
                    {recentEvents.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                            {recentEvents.map(ev => (
                                <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                    <span style={{ fontSize: 13, flex: 1 }}>{formatEventLabel(ev)}</span>
                                    <button type="button" onClick={() => deleteEvent(ev.id)}
                                        style={{ fontSize: 11, padding: "2px 8px" }}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                    {recentEvents.length === 0 && <p style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>Sin eventos recientes.</p>}
                </div>
            )}

            {/* Action panel for selected player */}
            {selectedPlayer && canEdit && selectedIsOnField && (
                <div style={{ marginTop: 10, padding: "14px 16px", background: "#dbeafe", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <strong>{selectedPlayer.displayName}</strong>
                        <button type="button" onClick={() => setSelectedId(null)}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#555" }}>✕</button>
                    </div>

                    {/* Tackles */}
                    <div style={{ marginBottom: 12 }}>
                        <small style={{ color: "#1e40af", fontWeight: 700, letterSpacing: 0.5 }}>TACKLES</small>
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                            {[
                                { type: "tackle_won",    label: "Won",    color: "#16a34a" },
                                { type: "tackle_lost",   label: "Lost",   color: "#dc2626" },
                                { type: "tackle_missed", label: "Missed", color: "#d97706" },
                            ].map(({ type, label, color }) => (
                                <button key={type} type="button"
                                    onClick={() => addEvent({ type, playerId: selectedId })}
                                    style={{ flex: 1, padding: "10px 0", background: color, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Try */}
                    <div style={{ marginBottom: 12 }}>
                        <small style={{ color: "#1e40af", fontWeight: 700, letterSpacing: 0.5 }}>TRY</small>
                        <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                                <input type="checkbox" checked={tryForm.fromPlay}
                                    onChange={e => setTryForm(f => ({ ...f, fromPlay: e.target.checked }))} />
                                Set play
                            </label>
                            <input type="number" placeholder="Min. (opt.)" value={tryForm.minute}
                                onChange={e => setTryForm(f => ({ ...f, minute: e.target.value }))}
                                min="1" max="80" style={{ width: 80, fontSize: 13 }} />
                            <button type="button" onClick={addTry}
                                style={{ padding: "8px 16px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                + Try
                            </button>
                        </div>
                    </div>

                    {/* Penalty */}
                    <div style={{ marginBottom: 12 }}>
                        <small style={{ color: "#1e40af", fontWeight: 700, letterSpacing: 0.5 }}>PENALTY</small>
                        <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                            <select value={penaltyReason} onChange={e => setPenaltyReason(e.target.value)}
                                style={{ fontSize: 13, flex: 1 }}>
                                {PENALTY_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <button type="button" onClick={() => addEvent({ type: "penalty", playerId: selectedId, reason: penaltyReason })}
                                style={{ padding: "8px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                + Add
                            </button>
                        </div>
                    </div>

                    {/* Play kick */}
                    <div style={{ marginBottom: selectedPlayer.isKicker || selectedPlayer.isThrower ? 12 : 0 }}>
                        <small style={{ color: "#1e40af", fontWeight: 700, letterSpacing: 0.5 }}>PLAY KICK</small>
                        <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                            <select value={kickForm.rating} onChange={e => setKickForm(f => ({ ...f, rating: e.target.value }))}
                                style={{ fontSize: 13 }}>
                                <option value="good">Good</option>
                                <option value="bad">Bad</option>
                            </select>
                            <input type="number" placeholder="m" value={kickForm.distance}
                                onChange={e => setKickForm(f => ({ ...f, distance: e.target.value }))}
                                min="0" style={{ width: 65, fontSize: 13 }} />
                            <button type="button" onClick={addPlayKick} disabled={!kickForm.distance}
                                style={{ padding: "8px 16px", background: "#0891b2", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                + Add
                            </button>
                        </div>
                    </div>

                    {/* Kick at goal — kickers only */}
                    {selectedPlayer.isKicker && (
                        <div style={{ marginBottom: selectedPlayer.isThrower ? 12 : 0 }}>
                            <small style={{ color: "#1e40af", fontWeight: 700, letterSpacing: 0.5 }}>KICK AT GOAL</small>
                            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                <button type="button" onClick={() => addEvent({ type: "kick_at_goal_made", playerId: selectedId })}
                                    style={{ flex: 1, padding: "10px 0", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                    Made
                                </button>
                                <button type="button" onClick={() => addEvent({ type: "kick_at_goal_missed", playerId: selectedId })}
                                    style={{ flex: 1, padding: "10px 0", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                    Missed
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Lineout error — throwers only */}
                    {selectedPlayer.isThrower && (
                        <div>
                            <small style={{ color: "#1e40af", fontWeight: 700, letterSpacing: 0.5 }}>LINEOUT</small>
                            <div style={{ marginTop: 6 }}>
                                <button type="button" onClick={() => addEvent({ type: "lineout_error", playerId: selectedId })}
                                    style={{ padding: "8px 16px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                    + Throwing error
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Recent events for this player */}
                    {recentEvents.length > 0 && (
                        <div style={{ marginTop: 12, borderTop: "1px solid #bfdbfe", paddingTop: 10 }}>
                            <small style={{ color: "#555" }}>Recent — tap ✕ to undo:</small>
                            {recentEvents.map(ev => (
                                <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                    <span style={{ fontSize: 13, flex: 1 }}>{formatEventLabel(ev)}</span>
                                    <button type="button" onClick={() => deleteEvent(ev.id)}
                                        style={{ fontSize: 11, padding: "2px 8px" }}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function formatEventLabel(ev) {
    const labels = {
        try:                 `Try${ev.fromPlay ? " (set play)" : ""}${ev.minute ? ` min. ${ev.minute}` : ""}`,
        tackle_won:          "Tackle won",
        tackle_lost:         "Tackle lost",
        tackle_missed:       "Tackle missed",
        kick_at_goal_made:   "Kick at goal — made",
        kick_at_goal_missed: "Kick at goal — missed",
        play_kick:           `Play kick — ${ev.rating}, ${ev.distance}m`,
        penalty:             `Penalty — ${ev.reason}`,
        lineout_error:       "Lineout throwing error",
    };
    return labels[ev.type] || ev.type;
}
