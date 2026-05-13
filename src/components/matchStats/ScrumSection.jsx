const TYPES = [
    { type: "scrum_won",    label: "Won",    color: "#16a34a" },
    { type: "scrum_lost",   label: "Lost",   color: "#dc2626" },
    { type: "scrum_stolen", label: "Stolen", color: "#2563eb" },
];

export default function ScrumSection({ stats, events, addEvent, deleteEvent, canEdit }) {
    const s = stats?.scrums || { ours: 0, won: 0, lost: 0, stolen: 0 };
    const recent = (events || []).filter(e => e.type.startsWith("scrum_")).slice(-5).reverse();

    return (
        <div>
            <p>Ours: <strong>{s.ours}</strong> · Won: <strong>{s.won}</strong> · Lost: <strong>{s.lost}</strong> · Stolen: <strong>{s.stolen}</strong></p>
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
