import { useState } from "react";
import { slotName } from "../../utils/positions";

export default function SubstitutionSection({ stats, addEvent, deleteEvent, canEdit, allPlayers, squad }) {
    const [recording, setRecording] = useState(false);
    const [minute, setMinute] = useState("");
    const [draft, setDraft] = useState({});

    const subs = stats?.subs || [];

    // Build current slot→playerId map from effectiveSquad
    const currentMap = {};
    (squad || []).forEach(s => { if (s.slot != null) currentMap[String(s.slot)] = s.playerId; });
    const sortedSlots = Object.keys(currentMap).sort((a, b) => Number(a) - Number(b));

    function playerName(id) {
        const p = allPlayers?.find(pl => pl.id === id);
        return p?.displayName || "—";
    }

    function slotLabel(slot) {
        return slotName(slot) || `Slot ${slot}`;
    }

    function openRecording() {
        setDraft({});
        setMinute("");
        setRecording(true);
    }

    function setChange(slot, playerId) {
        setDraft(prev => {
            const next = { ...prev, [slot]: playerId };
            if (playerId) {
                sortedSlots.forEach(s => {
                    if (s === slot) return;
                    const current = next[s] !== undefined ? next[s] : currentMap[s];
                    if (current === playerId) next[s] = "";
                });
            }
            return next;
        });
    }

    const hasPending = sortedSlots.some(s => draft[s] === "");

    async function handleSave() {
        if (hasPending) return;
        const changes = {};
        Object.entries(draft).forEach(([slot, playerId]) => {
            if (String(playerId) !== String(currentMap[slot] || "")) {
                changes[slot] = playerId;
            }
        });
        if (Object.keys(changes).length === 0) { setRecording(false); return; }
        await addEvent({ type: "sub", minute: minute ? Number(minute) : null, changes });
        setRecording(false);
        setDraft({});
        setMinute("");
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
                            {Object.entries(sub.changes || {}).map(([slot, pid], i) => (
                                <span key={slot}>
                                    {i > 0 ? " · " : ""}
                                    <strong>{pid ? playerName(pid) : "—"}</strong>
                                    <span style={{ fontSize: 12, color: "#777", marginLeft: 4 }}>{slotLabel(slot)}</span>
                                </span>
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
                    + Add substitution
                </button>
            )}

            {canEdit && recording && (
                <div style={{ marginTop: 12, padding: "14px 16px", background: "#f0fdf4", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <strong>New substitution</strong>
                        <button type="button" onClick={() => setRecording(false)}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#555" }}>✕</button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <label style={{ whiteSpace: "nowrap", fontSize: 13 }}>Minute (opt.)</label>
                        <input type="number" value={minute} onChange={e => setMinute(e.target.value)}
                            min="1" max="80" style={{ width: 60, fontSize: 13 }} />
                    </div>

                    {sortedSlots.length === 0 && (
                        <p style={{ fontSize: 13, color: "#999" }}>Define the squad first.</p>
                    )}

                    {sortedSlots.map(slot => {
                        const currentPlayerId = currentMap[slot];
                        const draftPlayerId = draft[slot] !== undefined ? draft[slot] : currentPlayerId;
                        const needsFilling = draft[slot] === "";
                        const changed = !needsFilling && draft[slot] !== undefined && String(draft[slot]) !== String(currentPlayerId);
                        return (
                            <div key={slot} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, width: 160, flexShrink: 0, fontSize: 13, color: "#374151" }}>
                                    {slotLabel(slot)}
                                </span>
                                <select
                                    value={draftPlayerId || ""}
                                    onChange={e => setChange(slot, e.target.value)}
                                    style={{ flex: 1, fontSize: 13, background: needsFilling ? "#fee2e2" : changed ? "#dcfce7" : "#fff" }}
                                >
                                    {needsFilling && <option value="" disabled>— select a player —</option>}
                                    {allPlayers?.map(p => (
                                        <option key={p.id} value={p.id}>{p.displayName}</option>
                                    ))}
                                </select>
                                {needsFilling && <span style={{ fontSize: 11, color: "#dc2626", whiteSpace: "nowrap" }}>Assign player</span>}
                            </div>
                        );
                    })}

                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <button type="button" onClick={handleSave} disabled={hasPending}>Save substitution</button>
                        <button type="button" onClick={() => setRecording(false)} style={{ background: "none" }}>Cancel</button>
                    </div>

                    {Object.entries(draft).filter(([s, pid]) => String(pid) !== String(currentMap[s] || "")).length > 0 && (
                        <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
                            {Object.entries(draft)
                                .filter(([s, pid]) => String(pid) !== String(currentMap[s] || ""))
                                .map(([s, pid]) => (
                                    <div key={s}>{slotLabel(s)}: {playerName(currentMap[s])} → {playerName(pid)}</div>
                                ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
