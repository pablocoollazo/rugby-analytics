import { useState, useEffect } from "react";
import { POSITION_SLOTS, slotName } from "../../utils/positions";

export default function SquadSection({ squad, allPlayers, canEdit, onSave }) {
    // squad: [{ playerId, slot (1-15 or null for bench), isStarter }]
    const [slotMap, setSlotMap] = useState({});  // { [slot]: playerId }
    const [bench, setBench] = useState([]);       // [playerId, ...]
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const sm = {};
        const b = [];
        (squad || []).forEach(s => {
            if (s.slot) sm[String(s.slot)] = s.playerId;
            else if (s.playerId) b.push(s.playerId);
        });
        setSlotMap(sm);
        setBench(b);
    }, [squad]);

    function playerName(id) {
        return allPlayers.find(p => p.id === id)?.displayName || "—";
    }

    const assignedIds = new Set([...Object.values(slotMap), ...bench].filter(Boolean));

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        const newSquad = [];
        POSITION_SLOTS.forEach(({ slot }) => {
            if (slotMap[slot]) newSquad.push({ playerId: slotMap[slot], slot, isStarter: true });
        });
        bench.forEach(pid => { if (pid) newSquad.push({ playerId: pid, slot: null, isStarter: false }); });
        await onSave(newSquad);
        setSaving(false);
    }

    const starterSlots = POSITION_SLOTS.filter(p => slotMap[p.slot]);
    const benchPlayers = bench.filter(Boolean);

    if (!canEdit) {
        if (starterSlots.length === 0 && benchPlayers.length === 0)
            return <p style={{ color: "#999" }}>No squad defined.</p>;
        return (
            <div style={{ fontSize: 13 }}>
                {starterSlots.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                        <strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#374151" }}>Starters</strong>
                        {POSITION_SLOTS.filter(p => slotMap[p.slot]).map(p => (
                            <div key={p.slot} style={{ display: "flex", gap: 12, padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
                                <span style={{ color: "#6b7280", width: 160, flexShrink: 0 }}>{p.name}</span>
                                <span style={{ fontWeight: 500 }}>{playerName(slotMap[p.slot])}</span>
                            </div>
                        ))}
                    </div>
                )}
                {benchPlayers.length > 0 && (
                    <div>
                        <strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#374151" }}>Bench</strong>
                        <p style={{ marginTop: 4, color: "#555" }}>{benchPlayers.map(playerName).join(", ")}</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <form onSubmit={handleSave}>
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#374151", marginBottom: 8 }}>
                    Starters
                </div>
                {POSITION_SLOTS.map(({ slot, name }) => {
                    const assigned = slotMap[slot] || "";
                    return (
                        <div key={slot} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ width: 160, flexShrink: 0, fontSize: 13, color: "#555" }}>{name}</span>
                            <select
                                value={assigned}
                                onChange={e => setSlotMap(prev => {
                                    const next = { ...prev };
                                    if (e.target.value) next[slot] = e.target.value;
                                    else delete next[slot];
                                    return next;
                                })}
                                style={{ flex: 1, fontSize: 13 }}
                            >
                                <option value="">— empty —</option>
                                {allPlayers
                                    .filter(p => !assignedIds.has(p.id) || p.id === assigned)
                                    .map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                            </select>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#374151", marginBottom: 8 }}>
                    Bench
                </div>
                {bench.map((pid, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                        <select
                            value={pid || ""}
                            onChange={e => setBench(prev => prev.map((p, j) => j === i ? e.target.value : p))}
                            style={{ flex: 1, fontSize: 13 }}
                        >
                            <option value="">— select player —</option>
                            {allPlayers
                                .filter(p => !assignedIds.has(p.id) || p.id === pid)
                                .map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                        </select>
                        <button type="button" onClick={() => setBench(prev => prev.filter((_, j) => j !== i))}
                            style={{ fontSize: 13, background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}>✕</button>
                    </div>
                ))}
                <button type="button" onClick={() => setBench(prev => [...prev, ""])}
                    style={{ fontSize: 13, marginTop: 4 }}>+ Add bench player</button>
            </div>

            <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save squad"}</button>
        </form>
    );
}
