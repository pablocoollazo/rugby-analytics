import { useState } from "react";

const JERSEYS = Array.from({ length: 15 }, (_, i) => i + 1);

export default function SubstitutionSection({ stats, addEvent, deleteEvent, canEdit, allPlayers, squad }) {
    const [minute, setMinute] = useState("");
    const [rows, setRows] = useState([{ jersey: "", playerId: "" }]);

    const subs = stats?.subs || [];

    function addRow() {
        setRows(prev => [...prev, { jersey: "", playerId: "" }]);
    }

    function updateRow(i, field, value) {
        setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
    }

    function removeRow(i) {
        setRows(prev => prev.filter((_, idx) => idx !== i));
    }

    async function handleAdd(e) {
        e.preventDefault();
        const changes = {};
        for (const row of rows) {
            if (row.jersey !== "") changes[String(row.jersey)] = row.playerId;
        }
        if (Object.keys(changes).length === 0) return;
        await addEvent({ type: "sub", minute: minute ? Number(minute) : null, changes });
        setMinute("");
        setRows([{ jersey: "", playerId: "" }]);
    }

    function describeChange(jersey, playerId, allPlayers) {
        if (!playerId) return `#${jersey} → (baja)`;
        const p = allPlayers?.find(pl => pl.id === playerId);
        return `#${jersey} → ${p?.displayName || "—"}`;
    }

    return (
        <div>
            {subs.length === 0 && <p style={{ color: "#999" }}>No substitutions recorded.</p>}
            {subs.map(sub => (
                <div key={sub.id} className="card"
                    style={{ background: "#eee", padding: "8px 12px", borderRadius: 6, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        {sub.minute && <small style={{ color: "#555" }}>Min. {sub.minute} — </small>}
                        <span style={{ fontSize: 13 }}>
                            {Object.entries(sub.changes || {}).map(([j, pid]) =>
                                describeChange(j, pid, allPlayers)
                            ).join(" · ")}
                        </span>
                    </div>
                    {canEdit && (
                        <button type="button" onClick={() => deleteEvent(sub.id)}
                            style={{ fontSize: 11, padding: "2px 6px", marginLeft: 8 }}>✕</button>
                    )}
                </div>
            ))}

            {canEdit && (
                <form onSubmit={handleAdd} style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <label style={{ whiteSpace: "nowrap" }}>Min.</label>
                        <input type="number" value={minute} onChange={e => setMinute(e.target.value)}
                            min="1" max="80" style={{ width: 60, fontSize: 13 }} placeholder="opt." />
                    </div>

                    {rows.map((row, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                            <select value={row.jersey} onChange={e => updateRow(i, "jersey", e.target.value)}
                                style={{ width: 70, fontSize: 13 }}>
                                <option value="">Dorsal</option>
                                {JERSEYS.map(n => <option key={n} value={n}>#{n}</option>)}
                            </select>
                            <select value={row.playerId} onChange={e => updateRow(i, "playerId", e.target.value)}
                                style={{ flex: 1, fontSize: 13 }}>
                                <option value="">— baja —</option>
                                {allPlayers?.map(p => (
                                    <option key={p.id} value={p.id}>{p.displayName}</option>
                                ))}
                            </select>
                            {rows.length > 1 && (
                                <button type="button" onClick={() => removeRow(i)}
                                    style={{ fontSize: 11, padding: "2px 6px" }}>✕</button>
                            )}
                        </div>
                    ))}

                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button type="button" onClick={addRow} style={{ fontSize: 13 }}>+ fila</button>
                        <button type="submit">Guardar cambio</button>
                    </div>
                </form>
            )}
        </div>
    );
}
