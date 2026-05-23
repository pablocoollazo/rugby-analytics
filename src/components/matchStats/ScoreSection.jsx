import { useMemo, useState } from "react";

const JERSEY_POSITION = {
    1: "Prop Left", 2: "Hooker", 3: "Prop Right", 4: "Lock", 5: "Lock",
    6: "Flanker", 7: "Flanker", 8: "Number 8", 9: "Scrum Half", 10: "Fly-half",
    11: "Wing", 12: "Inside Center", 13: "Outside Center", 14: "Wing", 15: "Full-back",
};

const US_OPTIONS = [
    { type: "try",        label: "Try",        points: 5 },
    { type: "conversion", label: "Conversion", points: 2 },
    { type: "penalty",    label: "Penalty",    points: 3 },
    { type: "dropgoal",   label: "Drop goal",  points: 3 },
];

const THEM_OPTIONS = [
    { label: "Try",    points: 5 },
    { label: "Conv",   points: 2 },
    { label: "Pen/DG", points: 3 },
];

export default function ScoreSection({ events, addEvent, deleteEvent, scoreUs, canEdit, onSave, saving, savedResult, players, squad }) {
    const [pendingUs, setPendingUs] = useState(null);
    const [pendingPlayerId, setPendingPlayerId] = useState("");
    const [tryExtras, setTryExtras] = useState({ fromPlay: false, minute: "" });

    const scoreThem = useMemo(() =>
        (events || []).filter(e => e.type === "opponent_score").reduce((s, e) => s + (e.points || 0), 0)
    , [events]);

    const lastOpponent = useMemo(() =>
        [...(events || [])].reverse().find(e => e.type === "opponent_score")
    , [events]);

    const liveResult = scoreUs > scoreThem ? "Win" : scoreUs < scoreThem ? "Loss" : "Draw";
    const resultColor = { Win: "#16a34a", Loss: "#dc2626", Draw: "#6b7280" }[liveResult];

    const onFieldPlayers = useMemo(() => {
        const ids = new Set((squad || []).map(s => s.playerId));
        return (players || []).filter(p => ids.has(p.id));
    }, [players, squad]);

    function startUsScore(opt) {
        setPendingUs(opt);
        setPendingPlayerId("");
        setTryExtras({ fromPlay: false, minute: "" });
    }

    async function confirmUsScore() {
        const entry = squad?.find(s => s.playerId === pendingPlayerId);
        const position = JERSEY_POSITION[Number(entry?.jersey)] || entry?.position || null;
        const base = { playerId: pendingPlayerId || null, ...(position ? { position } : {}) };

        if (pendingUs.type === "try") {
            await addEvent({
                ...base,
                type: "try",
                fromPlay: tryExtras.fromPlay,
                ...(tryExtras.minute ? { minute: Number(tryExtras.minute) } : {}),
            });
        } else {
            await addEvent({ ...base, type: "kick_at_goal_made", kickType: pendingUs.type });
        }
        setPendingUs(null);
    }

    return (
        <div>
            {/* Scoreboard */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 32, marginBottom: 16 }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>US</div>
                    <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1 }}>{scoreUs}</div>
                </div>
                <div style={{ fontSize: 28, color: "#ccc" }}>—</div>
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>THEM</div>
                    <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1 }}>{scoreThem}</div>
                </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: 20 }}>
                <span style={{ background: resultColor, color: "#fff", padding: "3px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    {liveResult}
                </span>
                {savedResult && savedResult !== liveResult && (
                    <span style={{ marginLeft: 10, fontSize: 12, color: "#999" }}>Saved: {savedResult}</span>
                )}
            </div>

            {canEdit && (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        <div>
                            <small style={{ fontWeight: 700, color: "#555", letterSpacing: 0.5 }}>WE SCORED</small>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                                {US_OPTIONS.map(opt => (
                                    <button key={opt.type} type="button" onClick={() => startUsScore(opt)}
                                        style={{ padding: "9px 0", background: pendingUs?.type === opt.type ? "#15803d" : "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                        +{opt.points} {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <small style={{ fontWeight: 700, color: "#555", letterSpacing: 0.5 }}>THEY SCORED</small>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                                {THEM_OPTIONS.map(({ label, points }) => (
                                    <button key={label} type="button"
                                        onClick={() => addEvent({ type: "opponent_score", points, label })}
                                        style={{ padding: "9px 0", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                        +{points} {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Inline player selector when a US score is pending */}
                    {pendingUs && (
                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <strong style={{ fontSize: 14 }}>+{pendingUs.points} {pendingUs.label} — who scored?</strong>
                                <button type="button" onClick={() => setPendingUs(null)}
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#555" }}>✕</button>
                            </div>
                            <select value={pendingPlayerId} onChange={e => setPendingPlayerId(e.target.value)}
                                style={{ width: "100%", fontSize: 13, marginBottom: 10 }}>
                                <option value="">— Unknown —</option>
                                {onFieldPlayers.map(p => {
                                    const entry = squad?.find(s => s.playerId === p.id);
                                    return (
                                        <option key={p.id} value={p.id}>
                                            {entry?.jersey ? `#${entry.jersey} ` : ""}{p.displayName}
                                        </option>
                                    );
                                })}
                            </select>
                            {pendingUs.type === "try" && (
                                <div style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "center" }}>
                                    <label style={{ fontSize: 13, display: "flex", gap: 4, alignItems: "center" }}>
                                        <input type="checkbox" checked={tryExtras.fromPlay}
                                            onChange={e => setTryExtras(f => ({ ...f, fromPlay: e.target.checked }))} />
                                        Set play
                                    </label>
                                    <input type="number" placeholder="Min. (opt.)" value={tryExtras.minute}
                                        onChange={e => setTryExtras(f => ({ ...f, minute: e.target.value }))}
                                        min="1" max="80" style={{ width: 80, fontSize: 13 }} />
                                </div>
                            )}
                            <button type="button" onClick={confirmUsScore}
                                style={{ width: "100%", padding: "9px 0", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                Confirm
                            </button>
                        </div>
                    )}

                    {/* Undo last opponent score */}
                    {lastOpponent && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 13, color: "#555" }}>
                            <span style={{ flex: 1 }}>Last opponent: +{lastOpponent.points} {lastOpponent.label}</span>
                            <button type="button" onClick={() => deleteEvent(lastOpponent.id)}
                                style={{ fontSize: 11, padding: "3px 10px" }}>✕ Undo</button>
                        </div>
                    )}

                    <button onClick={onSave} disabled={saving}
                        style={{ width: "100%", padding: "11px 0", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                        {saving ? "Saving..." : "Save result"}
                    </button>
                </>
            )}
        </div>
    );
}
