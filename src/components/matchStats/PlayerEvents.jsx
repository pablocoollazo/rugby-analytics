import { useState } from "react";

const PENALTY_REASONS = ["scrum", "ruck", "offside", "knock-on", "illegal tackle", "other"];


export default function PlayerEvents({ events, addEvent, deleteEvent, canEdit, players, squad = [] }) {
    const [selectedId, setSelectedId] = useState(null);
    const [tryForm, setTryForm] = useState({ fromPlay: false, minute: "" });
    const [penaltyReason, setPenaltyReason] = useState("scrum");
    const [kickForm, setKickForm] = useState({ rating: "good", inTouch: false, is5022: false, distance: "" });
    const [kickGoalType, setKickGoalType] = useState("conversion");

    if (!players?.length) return <p style={{ color: "#999" }}>No players in squad.</p>;

    const onFieldIds = new Set((squad || []).map(s => s.playerId));
    const onField = players.filter(p => onFieldIds.has(p.id));
    const offField = players.filter(p => !onFieldIds.has(p.id));

    const selectedPlayer = players.find(p => p.id === selectedId) || null;
    const selectedIsOnField = onFieldIds.has(selectedId);

    function addWithPosition(data) {
        const position = squad.find(s => s.playerId === data.playerId)?.position || null;
        return addEvent(position ? { ...data, position } : data);
    }

    function select(id) {
        setSelectedId(prev => prev === id ? null : id);
        setTryForm({ fromPlay: false, minute: "" });
        setPenaltyReason("scrum");
        setKickForm({ rating: "good", inTouch: false, is5022: false, distance: "" });
    }

    async function addTry() {
        await addWithPosition({
            type: "try",
            playerId: selectedId,
            fromPlay: tryForm.fromPlay,
            ...(tryForm.minute !== "" ? { minute: Number(tryForm.minute) } : {}),
        });
        setTryForm({ fromPlay: false, minute: "" });
    }

    async function addPlayKick() {
        if (!kickForm.distance) return;
        await addWithPosition({
            type: "play_kick",
            playerId: selectedId,
            rating: kickForm.rating,
            distance: Number(kickForm.distance),
            inTouch: kickForm.inTouch,
            is5022: kickForm.is5022,
        });
        setKickForm({ rating: "good", inTouch: false, is5022: false, distance: "" });
    }

    function summaryLabel(p) {
        const playerEvents = (events || []).filter(e => e.playerId === p.id);

        const byPos = {};
        playerEvents.forEach(ev => {
            const pos = ev.position || "?";
            if (!byPos[pos]) byPos[pos] = { tw: 0, tl: 0, tm: 0, tries: 0, penReasons: {}, kMade: 0, kTotal: 0, pkGood: 0, pkTotal: 0, pkDist: 0, pkIn: 0, pk5022: 0, le: 0 };
            const s = byPos[pos];
            if (ev.type === "tackle_won")          s.tw++;
            if (ev.type === "tackle_lost")          s.tl++;
            if (ev.type === "tackle_missed")        s.tm++;
            if (ev.type === "try")                  s.tries++;
            if (ev.type === "penalty")              s.penReasons[ev.reason] = (s.penReasons[ev.reason] || 0) + 1;
            if (ev.type === "kick_at_goal_made")    { s.kMade++; s.kTotal++; }
            if (ev.type === "kick_at_goal_missed")  s.kTotal++;
            if (ev.type === "play_kick")            {
                if (ev.rating === "good") s.pkGood++;
                s.pkTotal++;
                s.pkDist += ev.distance || 0;
                if (ev.inTouch)  s.pkIn++;
                if (ev.is5022)   s.pk5022++;
            }
            if (ev.type === "lineout_error")        s.le++;
        });

        const positions = Object.keys(byPos);
        if (positions.length === 0) return "—";

        function posStats(s) {
            const parts = [];
            if (s.tw + s.tl + s.tm > 0) parts.push(`T ${s.tw}/${s.tl}/${s.tm}`);
            if (s.tries > 0)            parts.push(`${s.tries} try`);
            const penEntries = Object.entries(s.penReasons);
            if (penEntries.length > 0)  parts.push(`pen: ${penEntries.map(([r, n]) => `${n} ${r}`).join(", ")}`);
            if (s.kTotal > 0)           parts.push(`${s.kMade}/${s.kTotal} KG`);
            if (s.pkTotal > 0) {
                let pk = `${s.pkGood}/${s.pkTotal} PK`;
                if (s.pkDist > 0) pk += ` ${s.pkDist}m`;
                if (s.pkIn > 0)   pk += ` ${s.pkIn}T`;
                if (s.pk5022 > 0) pk += ` ${s.pk5022}×50/22`;
                parts.push(pk);
            }
            if (s.le > 0)               parts.push(`${s.le} LE`);
            return parts.join(" · ");
        }

        if (positions.length === 1) return posStats(byPos[positions[0]]) || "—";

        return positions
            .map(pos => { const s = posStats(byPos[pos]); return s ? `${pos}: ${s}` : null; })
            .filter(Boolean)
            .join("  |  ") || "—";
    }

    const recentEvents = (events || [])
        .filter(e => e.playerId === selectedId)
        .slice(-4)
        .reverse();

    return (
        <div>
            <select
                value={selectedId || ""}
                onChange={e => e.target.value ? select(e.target.value) : setSelectedId(null)}
                style={{ width: "100%", fontSize: 14, marginBottom: selectedPlayer ? 10 : 0 }}
            >
                <option value="">— Select player —</option>
                <optgroup label="On the field">
                    {onField.map(p => {
                        const entry = squad.find(s => s.playerId === p.id);
                        const pos = entry?.position || p.mainPosition;
                        return (
                            <option key={p.id} value={p.id}>
                                {p.displayName}{pos ? ` — ${pos}` : ""}
                            </option>
                        );
                    })}
                </optgroup>
                {offField.length > 0 && (
                    <optgroup label="Off the field">
                        {offField.map(p => (
                            <option key={p.id} value={p.id}>{p.displayName}</option>
                        ))}
                    </optgroup>
                )}
            </select>

            {/* Panel for off-field players — view stats + undo only if canEdit */}
            {selectedPlayer && !selectedIsOnField && (
                <div style={{ marginTop: 10, padding: "14px 16px", background: "#f3f4f6", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <strong>{selectedPlayer.displayName}</strong>
                        <button type="button" onClick={() => setSelectedId(null)}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#555" }}>✕</button>
                    </div>
                    <div style={{ marginBottom: 10, fontSize: 13, color: "#555" }}>
                        {summaryLabel(selectedPlayer)}
                    </div>
                    <small style={{ color: "#888" }}>Off the field{canEdit ? " — undo only." : "."}</small>
                    {recentEvents.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                            {recentEvents.map(ev => (
                                <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                    <span style={{ fontSize: 13, flex: 1 }}>{formatEventLabel(ev)}</span>
                                    {canEdit && (
                                        <button type="button" onClick={() => deleteEvent(ev.id)}
                                            style={{ fontSize: 11, padding: "2px 8px" }}>✕</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {recentEvents.length === 0 && <p style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>No recent events.</p>}
                </div>
            )}

            {/* Action panel for selected on-field player */}
            {selectedPlayer && canEdit && selectedIsOnField && (
                <div style={{ marginTop: 10, padding: "14px 16px", background: "#dbeafe", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <strong>{selectedPlayer.displayName}</strong>
                        <button type="button" onClick={() => setSelectedId(null)}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#555" }}>✕</button>
                    </div>

                    <div style={{ fontSize: 13, color: "#1e40af", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #bfdbfe" }}>
                        {summaryLabel(selectedPlayer)}
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
                                    onClick={() => addWithPosition({ type, playerId: selectedId })}
                                    style={{ flex: 1, padding: "10px 0", background: color, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                    {label}
                                </button>
                            ))}
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
                            <button type="button" onClick={() => addWithPosition({ type: "penalty", playerId: selectedId, reason: penaltyReason })}
                                style={{ padding: "8px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                + Add
                            </button>
                        </div>
                    </div>

                    {/* Play kick */}
                    <div style={{ marginBottom: 12 }}>
                        <small style={{ color: "#1e40af", fontWeight: 700, letterSpacing: 0.5 }}>PLAY KICK</small>
                        <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <select value={kickForm.rating} onChange={e => setKickForm(f => ({ ...f, rating: e.target.value }))}
                                style={{ fontSize: 13 }}>
                                <option value="good">Good</option>
                                <option value="bad">Bad</option>
                            </select>
                            <input type="number" placeholder="m" value={kickForm.distance}
                                onChange={e => setKickForm(f => ({ ...f, distance: e.target.value }))}
                                min="0" style={{ width: 65, fontSize: 13 }} />
                            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                                <input type="checkbox" checked={kickForm.inTouch}
                                    onChange={e => setKickForm(f => ({ ...f, inTouch: e.target.checked, is5022: e.target.checked ? f.is5022 : false }))} />
                                Touch
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                                <input type="checkbox" checked={kickForm.is5022} disabled={!kickForm.inTouch}
                                    onChange={e => setKickForm(f => ({ ...f, is5022: e.target.checked }))} />
                                50/22
                            </label>
                            <button type="button" onClick={addPlayKick} disabled={!kickForm.distance}
                                style={{ padding: "8px 16px", background: "#0891b2", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                + Add
                            </button>
                        </div>
                    </div>


                    {/* Lineout error — throwers only */}
                    {selectedPlayer.isThrower && (
                        <div>
                            <small style={{ color: "#1e40af", fontWeight: 700, letterSpacing: 0.5 }}>LINEOUT</small>
                            <div style={{ marginTop: 6 }}>
                                <button type="button" onClick={() => addWithPosition({ type: "lineout_error", playerId: selectedId })}
                                    style={{ padding: "8px 16px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                    + Throwing error
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Recent events */}
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
        kick_at_goal_made:   `Kick at goal — made (${ev.kickType || "conversion"})`,
        kick_at_goal_missed: `Kick at goal — missed (${ev.kickType || "conversion"})`,
        play_kick:           `Play kick — ${ev.rating}, ${ev.distance}m${ev.inTouch ? (ev.is5022 ? " (50/22)" : " touch") : ""}`,
        penalty:             `Penalty — ${ev.reason}`,
        lineout_error:       "Lineout throwing error",
    };
    return labels[ev.type] || ev.type;
}
