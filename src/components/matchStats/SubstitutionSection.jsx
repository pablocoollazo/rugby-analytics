import { useState } from "react";

const JERSEY_POSITION = {
    1: "Prop L", 2: "Hooker", 3: "Prop R",
    4: "Lock", 5: "Lock",
    6: "Flanker", 7: "Flanker", 8: "N8",
    9: "SH", 10: "FH",
    11: "Wing", 12: "IC", 13: "OC", 14: "Wing", 15: "FB",
};

export default function SubstitutionSection({ stats, addEvent, deleteEvent, canEdit, allPlayers, squad }) {
    const [recording, setRecording] = useState(false);
    const [minute, setMinute] = useState("");
    // draft: { [jersey]: playerId } — only jerseys the coach actually changed
    const [draft, setDraft] = useState({});

    const subs = stats?.subs || [];

    // Build current jersey→player map from squad prop (already has subs applied)
    const currentMap = {};
    (squad || []).forEach(s => { if (s.jersey !== "" && s.jersey != null) currentMap[String(s.jersey)] = s.playerId; });
    const sortedJerseys = Object.keys(currentMap).sort((a, b) => Number(a) - Number(b));

    function playerName(id) {
        const p = allPlayers?.find(pl => pl.id === id);
        return p?.displayName || "—";
    }

    function openRecording() {
        setDraft({});
        setMinute("");
        setRecording(true);
    }

    function setChange(jersey, playerId) {
        setDraft(prev => ({ ...prev, [jersey]: playerId }));
    }

    async function handleSave() {
        const changes = {};
        Object.entries(draft).forEach(([jersey, playerId]) => {
            // Only include jerseys that actually changed
            if (String(playerId) !== String(currentMap[jersey] || "")) {
                changes[jersey] = playerId;
            }
        });
        if (Object.keys(changes).length === 0) { setRecording(false); return; }
        await addEvent({ type: "sub", minute: minute ? Number(minute) : null, changes });
        setRecording(false);
        setDraft({});
        setMinute("");
    }

    function describeChange(jersey, playerId) {
        const prev = currentMap[jersey];
        const prevName = prev ? playerName(prev) : "(vacío)";
        const newName = playerId ? playerName(playerId) : "(baja)";
        return `#${jersey}: ${prevName} → ${newName}`;
    }

    return (
        <div>
            {subs.length === 0 && !recording && <p style={{ color: "#999" }}>No substitutions recorded.</p>}

            {subs.map(sub => (
                <div key={sub.id} className="card"
                    style={{ background: "#eee", padding: "8px 12px", borderRadius: 6, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        {sub.minute != null && <small style={{ color: "#555" }}>Min. {sub.minute} — </small>}
                        <span style={{ fontSize: 13 }}>
                            {Object.entries(sub.changes || {}).map(([j, pid], i) => (
                                <span key={j}>{i > 0 ? " · " : ""}{pid ? playerName(pid) : "(baja)"} #{j}</span>
                            ))}
                        </span>
                    </div>
                    {canEdit && (
                        <button type="button" onClick={() => deleteEvent(sub.id)}
                            style={{ fontSize: 11, padding: "2px 6px", marginLeft: 8 }}>✕</button>
                    )}
                </div>
            ))}

            {canEdit && !recording && (
                <button type="button" onClick={openRecording} style={{ marginTop: 8 }}>
                    + Registrar cambio
                </button>
            )}

            {canEdit && recording && (
                <div style={{ marginTop: 12, padding: "14px 16px", background: "#f0fdf4", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <strong>Nuevo cambio</strong>
                        <button type="button" onClick={() => setRecording(false)}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#555" }}>✕</button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <label style={{ whiteSpace: "nowrap", fontSize: 13 }}>Minuto (opt.)</label>
                        <input type="number" value={minute} onChange={e => setMinute(e.target.value)}
                            min="1" max="80" style={{ width: 60, fontSize: 13 }} />
                    </div>

                    {sortedJerseys.length === 0 && (
                        <p style={{ fontSize: 13, color: "#999" }}>Define la convocatoria primero.</p>
                    )}

                    {sortedJerseys.map(jersey => {
                        const currentPlayerId = currentMap[jersey];
                        const draftPlayerId = draft[jersey] !== undefined ? draft[jersey] : currentPlayerId;
                        const changed = draft[jersey] !== undefined && String(draft[jersey]) !== String(currentPlayerId);
                        return (
                            <div key={jersey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <span style={{ fontWeight: 700, width: 70, flexShrink: 0, fontSize: 13 }}>
                                    #{jersey} <span style={{ fontWeight: 400, color: "#888" }}>{JERSEY_POSITION[Number(jersey)] || ""}</span>
                                </span>
                                <select
                                    value={draftPlayerId || ""}
                                    onChange={e => setChange(jersey, e.target.value)}
                                    style={{ flex: 1, fontSize: 13, background: changed ? "#dcfce7" : "#fff" }}
                                >
                                    <option value="">(baja — sale del campo)</option>
                                    {allPlayers?.map(p => (
                                        <option key={p.id} value={p.id}>{p.displayName}</option>
                                    ))}
                                </select>
                            </div>
                        );
                    })}

                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <button type="button" onClick={handleSave}>Guardar cambio</button>
                        <button type="button" onClick={() => setRecording(false)}
                            style={{ background: "none" }}>Cancelar</button>
                    </div>

                    {Object.entries(draft).filter(([j, pid]) => String(pid) !== String(currentMap[j] || "")).length > 0 && (
                        <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
                            {Object.entries(draft)
                                .filter(([j, pid]) => String(pid) !== String(currentMap[j] || ""))
                                .map(([j, pid]) => <div key={j}>{describeChange(j, pid)}</div>)
                            }
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
