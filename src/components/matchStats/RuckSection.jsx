const TYPES = [
    { type: "ruck_lost",         label: "Ruck Lost",    color: "#dc2626" },
    { type: "ruck_opp_pushover", label: "Opp. Pushover", color: "#7c3aed" },
    { type: "ruck_opp_retained", label: "Opp. Retained", color: "#d97706" },
];

export default function RuckSection({ stats, events, addEvent, deleteEvent, canEdit }) {
    const r = stats?.rucks || { lost: 0, oppRecoveredPushover: 0, oppRecoveredRetained: 0 };
    const recent = (events || []).filter(e => e.type.startsWith("ruck_")).slice(-5).reverse();

    return (
        <div>
            <p>Lost: <strong>{r.lost}</strong> · Opp. Pushover: <strong>{r.oppRecoveredPushover}</strong> · Opp. Retained: <strong>{r.oppRecoveredRetained}</strong></p>
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
                    {recent.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <small style={{ color: "#888" }}>Recent — tap ✕ to undo:</small>
                            {recent.map(ev => (
                                <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                                    <span style={{ fontSize: 13 }}>{TYPES.find(t => t.type === ev.type)?.label}</span>
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
