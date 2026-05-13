const TYPES = [
    { type: "lineout_won",    label: "Won",    color: "#16a34a" },
    { type: "lineout_lost",   label: "Lost",   color: "#dc2626" },
    { type: "lineout_stolen", label: "Stolen", color: "#2563eb" },
];

export default function LineoutSection({ stats, events, addEvent, deleteEvent, canEdit, players }) {
    const lo = stats?.lineouts || { ours: 0, won: 0, lost: 0, stolen: 0 };
    const throwers = players?.filter(p => p.isThrower) || [];
    const recent = (events || []).filter(e => e.type.startsWith("lineout_")).slice(-5).reverse();

    function labelFor(ev) {
        if (ev.type === "lineout_error") {
            const name = players?.find(p => p.id === ev.playerId)?.displayName || ev.playerId;
            return `${name} — throwing error`;
        }
        return TYPES.find(t => t.type === ev.type)?.label || ev.type;
    }

    return (
        <div>
            <p>Ours: <strong>{lo.ours}</strong> · Won: <strong>{lo.won}</strong> · Lost: <strong>{lo.lost}</strong> · Stolen: <strong>{lo.stolen}</strong></p>
            {canEdit && (
                <>
                    <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                        {TYPES.map(({ type, label, color }) => (
                            <button key={type} type="button" onClick={() => addEvent({ type })}
                                style={{ padding: "12px 20px", background: color, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                                + {label}
                            </button>
                        ))}
                    </div>
                    {throwers.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                            <strong style={{ fontSize: 13 }}>Throwing errors</strong>
                            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                                {throwers.map(p => {
                                    const errors = stats?.playerStats?.[p.id]?.lineoutErrors || 0;
                                    return (
                                        <button key={p.id} type="button"
                                            onClick={() => addEvent({ type: "lineout_error", playerId: p.id })}
                                            style={{ padding: "8px 14px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                                            {p.displayName} {errors > 0 ? `(${errors})` : ""}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {recent.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <small style={{ color: "#888" }}>Recent — tap ✕ to undo:</small>
                            {recent.map(ev => (
                                <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                                    <span style={{ fontSize: 13 }}>{labelFor(ev)}</span>
                                    <button type="button" onClick={() => deleteEvent(ev.id)} style={{ fontSize: 11, padding: "2px 6px" }}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
