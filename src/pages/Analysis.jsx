import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { getClubMatches, getClubPlayers, getMatchEvents } from "../utils/firestore";
import {
    ResponsiveContainer, LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export default function Analysis() {
    const { club, role, user } = useAuth();
    const isPlayer = role === "player";
    const [matches, setMatches] = useState([]);
    const [allPlayers, setAllPlayers] = useState([]);
    const [eventsMap, setEventsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedPlayerId, setSelectedPlayerId] = useState("");

    useEffect(() => {
        async function load() {
            const [ms, ps] = await Promise.all([
                getClubMatches(club.clubId),
                getClubPlayers(club.clubId),
            ]);
            setMatches(ms);
            setAllPlayers(ps);
            const map = {};
            await Promise.all(ms.map(async m => { map[m.id] = await getMatchEvents(m.id); }));
            setEventsMap(map);
            setLoading(false);
        }
        if (club?.clubId) load();
    }, [club]);

    const completed = matches.filter(m => m.result);

    // Auto-select own player profile for player role
    const myPlayer = useMemo(() =>
        isPlayer ? allPlayers.find(p => p.userId === user?.uid) : null
    , [isPlayer, allPlayers, user?.uid]);

    useEffect(() => {
        if (myPlayer) setSelectedPlayerId(myPlayer.id);
    }, [myPlayer?.id]);

    // --- Season record ---
    const record = useMemo(() => {
        let w = 0, l = 0, d = 0, pf = 0, pa = 0;
        completed.forEach(m => {
            if (m.result === "Win") w++;
            else if (m.result === "Loss") l++;
            else d++;
            pf += m.pointsFor || 0;
            pa += m.pointsAgainst || 0;
        });
        return { w, l, d, pf, pa, n: completed.length };
    }, [completed]);

    // --- Progression line chart ---
    const progressionData = useMemo(() =>
        [...completed]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(m => ({
                name: `vs ${m.rival}`,
                "Us":        m.pointsFor || 0,
                "Opponents": m.pointsAgainst || 0,
            }))
    , [completed]);

    // --- Per-player aggregate ---
    const playerAgg = useMemo(() => {
        const agg = {};
        Object.values(eventsMap).flat().forEach(ev => {
            if (!ev.playerId) return;
            if (!agg[ev.playerId]) agg[ev.playerId] = {
                tw: 0, tl: 0, tm: 0, tries: 0,
                kMade: 0, kTotal: 0,
                pkTotal: 0, pkGood: 0, pkDist: 0, pkIn: 0, pk5022: 0,
                penCount: 0, le: 0,
            };
            const s = agg[ev.playerId];
            if (ev.type === "tackle_won")         s.tw++;
            if (ev.type === "tackle_lost")         s.tl++;
            if (ev.type === "tackle_missed")       s.tm++;
            if (ev.type === "try")                 s.tries++;
            if (ev.type === "kick_at_goal_made")   { s.kMade++; s.kTotal++; }
            if (ev.type === "kick_at_goal_missed") s.kTotal++;
            if (ev.type === "play_kick") {
                s.pkTotal++;
                if (ev.rating === "good") s.pkGood++;
                s.pkDist += ev.distance || 0;
                if (ev.inTouch) s.pkIn++;
                if (ev.is5022)  s.pk5022++;
            }
            if (ev.type === "penalty")             s.penCount++;
            if (ev.type === "lineout_error")       s.le++;
        });
        return agg;
    }, [eventsMap]);

    // --- Tackles chart (admin/coach) ---
    const tacklesData = useMemo(() =>
        allPlayers
            .map(p => ({
                name: p.displayName,
                Won:    playerAgg[p.id]?.tw || 0,
                Lost:   playerAgg[p.id]?.tl || 0,
                Missed: playerAgg[p.id]?.tm || 0,
            }))
            .filter(p => p.Won + p.Lost + p.Missed > 0)
            .sort((a, b) => (b.Won + b.Lost + b.Missed) - (a.Won + a.Lost + a.Missed))
    , [allPlayers, playerAgg]);

    // --- Team aggregate (player role) ---
    const teamAgg = useMemo(() => {
        const t = { tw: 0, tl: 0, tm: 0, tries: 0, kMade: 0, kTotal: 0, penCount: 0 };
        Object.values(playerAgg).forEach(s => {
            t.tw += s.tw; t.tl += s.tl; t.tm += s.tm;
            t.tries += s.tries; t.kMade += s.kMade; t.kTotal += s.kTotal;
            t.penCount += s.penCount;
        });
        return t;
    }, [playerAgg]);

    // --- Per-match data for selected player ---
    const playerMatchData = useMemo(() => {
        if (!selectedPlayerId) return [];
        return [...completed]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(m => {
                const evs = (eventsMap[m.id] || []).filter(e => e.playerId === selectedPlayerId);
                return {
                    name: `vs ${m.rival}`,
                    Won:         evs.filter(e => e.type === "tackle_won").length,
                    Lost:        evs.filter(e => e.type === "tackle_lost").length,
                    Missed:      evs.filter(e => e.type === "tackle_missed").length,
                    Tries:       evs.filter(e => e.type === "try").length,
                    "KG Made":   evs.filter(e => e.type === "kick_at_goal_made").length,
                    "KG Missed": evs.filter(e => e.type === "kick_at_goal_missed").length,
                };
            });
    }, [completed, eventsMap, selectedPlayerId]);

    const selectedPlayerAgg  = selectedPlayerId ? playerAgg[selectedPlayerId] : null;
    const selectedPlayerInfo = allPlayers.find(p => p.id === selectedPlayerId);

    const hasTackleData = playerMatchData.some(d => d.Won + d.Lost + d.Missed > 0);
    const hasKickData   = playerMatchData.some(d => d["KG Made"] + d["KG Missed"] > 0);

    // --- Play analysis ---
    const playAnalysis = useMemo(() => {
        const agg = {};
        Object.values(eventsMap).flat().forEach(ev => {
            if (ev.type !== "play") return;
            const key = ev.playbookId || ev.name;
            if (!agg[key]) agg[key] = { name: ev.name, total: 0, try: 0, penalty: 0, turnover: 0, other: 0, players: {} };
            const s = agg[key];
            s.total++;
            if (ev.result) s[ev.result] = (s[ev.result] || 0) + 1;
            const bySlot = ev.playersBySlot || ev.playersByJersey || {};
            Object.values(bySlot).forEach(pid => {
                if (pid) s.players[pid] = (s.players[pid] || 0) + 1;
            });
        });
        return Object.values(agg).sort((a, b) => b.total - a.total);
    }, [eventsMap]);

    // --- Player's personal play involvement ---
    const myPlayAnalysis = useMemo(() => {
        if (!myPlayer) return [];
        return playAnalysis
            .filter(play => (play.players[myPlayer.id] || 0) > 0)
            .map(play => ({
                name:     play.name,
                appeared: play.players[myPlayer.id],
                total:    play.total,
                try:      play.try      || 0,
                penalty:  play.penalty  || 0,
                turnover: play.turnover || 0,
            }))
            .sort((a, b) => b.appeared - a.appeared);
    }, [playAnalysis, myPlayer]);

    // --- Weather correlation ---
    const weatherCorrelation = useMemo(() => {
        const by = {};
        completed.forEach(m => {
            const cond = m.weather?.condition || "No data";
            if (!by[cond]) by[cond] = {
                condition: cond, matches: 0, wins: 0, pf: 0, pa: 0,
                scrumWon: 0, scrumTotal: 0, lineoutWon: 0, lineoutTotal: 0,
            };
            const s = by[cond];
            s.matches++;
            if (m.result === "Win") s.wins++;
            s.pf += m.pointsFor || 0;
            s.pa += m.pointsAgainst || 0;
            (eventsMap[m.id] || []).forEach(ev => {
                if (ev.type === "scrum_won")    { s.scrumWon++;   s.scrumTotal++; }
                if (ev.type === "scrum_lost")   s.scrumTotal++;
                if (ev.type === "lineout_won")  { s.lineoutWon++; s.lineoutTotal++; }
                if (ev.type === "lineout_lost") s.lineoutTotal++;
            });
        });
        return Object.values(by).map(s => ({
            ...s,
            winPct:     Math.round(s.wins / s.matches * 100),
            pfAvg:      (s.pf / s.matches).toFixed(1),
            scrumPct:   s.scrumTotal   ? Math.round(s.scrumWon   / s.scrumTotal   * 100) : null,
            lineoutPct: s.lineoutTotal ? Math.round(s.lineoutWon / s.lineoutTotal * 100) : null,
        }));
    }, [completed, eventsMap]);

    const hasWeather = weatherCorrelation.some(w => w.condition !== "No data");

    if (loading) return <p style={{ padding: 40 }}>Loading stats...</p>;
    if (completed.length === 0) return <p style={{ padding: 40 }}>No completed matches yet.</p>;

    return (
        <div className="page">
            <h1>Analysis</h1>

            {/* Season summary */}
            <Section title="Season summary">
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatCard label="Wins"       value={record.w} color="#16a34a" />
                    <StatCard label="Losses"     value={record.l} color="#dc2626" />
                    <StatCard label="Draws"      value={record.d} color="#6b7280" />
                    <StatCard label="Pts for"    value={record.pf} />
                    <StatCard label="Pts against" value={record.pa} />
                    <StatCard label="Average"    value={`${(record.pf / record.n).toFixed(1)} – ${(record.pa / record.n).toFixed(1)}`} />
                </div>
            </Section>

            {/* Points progression */}
            {progressionData.length > 1 && (
                <Section title="Points progression">
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={progressionData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="Us"        stroke="#2563eb" strokeWidth={2} dot />
                            <Line type="monotone" dataKey="Opponents" stroke="#dc2626" strokeWidth={2} dot />
                        </LineChart>
                    </ResponsiveContainer>
                </Section>
            )}

            {/* Tackles — per player (admin/coach) or team total (player) */}
            {!isPlayer ? (
                tacklesData.length > 0 && (
                    <Section title="Tackles per player">
                        <ResponsiveContainer width="100%" height={Math.max(180, tacklesData.length * 36)}>
                            <BarChart data={tacklesData} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Won"    stackId="a" fill="#16a34a" name="Won" />
                                <Bar dataKey="Lost"   stackId="a" fill="#dc2626" name="Lost" />
                                <Bar dataKey="Missed" stackId="a" fill="#d97706" name="Missed" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Section>
                )
            ) : (
                (teamAgg.tw + teamAgg.tl + teamAgg.tm > 0) && (
                    <Section title="Team tackles">
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <StatCard label="Won"    value={teamAgg.tw} color="#16a34a" />
                            <StatCard label="Lost"   value={teamAgg.tl} color="#dc2626" />
                            <StatCard label="Missed" value={teamAgg.tm} color="#d97706" />
                            <StatCard label="Total"  value={teamAgg.tw + teamAgg.tl + teamAgg.tm} />
                        </div>
                    </Section>
                )
            )}

            {/* Stats table — admin/coach only; player gets team totals */}
            {!isPlayer ? (
                <Section title="Individual stats">
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#e5e7eb", textAlign: "left" }}>
                                    <th style={TH}>Player</th>
                                    <th style={TH}>Tackles W/L/M</th>
                                    <th style={TH}>Tries</th>
                                    <th style={TH}>Kicks at goal</th>
                                    <th style={TH}>Play kicks</th>
                                    <th style={TH}>Penalties</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allPlayers
                                    .filter(p => playerAgg[p.id])
                                    .sort((a, b) => {
                                        const ta = playerAgg[a.id], tb = playerAgg[b.id];
                                        return (tb.tw + tb.tl + tb.tm) - (ta.tw + ta.tl + ta.tm);
                                    })
                                    .map(p => {
                                        const s = playerAgg[p.id];
                                        return (
                                            <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                                <td style={TD}>{p.displayName}</td>
                                                <td style={TD}>{s.tw}/{s.tl}/{s.tm}</td>
                                                <td style={TD}>{s.tries || "—"}</td>
                                                <td style={TD}>
                                                    {s.kTotal > 0
                                                        ? `${s.kMade}/${s.kTotal} (${Math.round(s.kMade / s.kTotal * 100)}%)`
                                                        : "—"}
                                                </td>
                                                <td style={TD}>
                                                    {s.pkTotal > 0
                                                        ? `${s.pkGood}/${s.pkTotal} · ${s.pkDist}m${s.pkIn > 0 ? ` · ${s.pkIn}T` : ""}${s.pk5022 > 0 ? ` · ${s.pk5022}×50/22` : ""}`
                                                        : "—"}
                                                </td>
                                                <td style={TD}>{s.penCount || "—"}</td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </Section>
            ) : (
                <Section title="Team stats">
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <StatCard label="Tries"              value={teamAgg.tries} />
                        <StatCard label="Kicks at goal"      value={teamAgg.kTotal > 0 ? `${teamAgg.kMade}/${teamAgg.kTotal} (${Math.round(teamAgg.kMade / teamAgg.kTotal * 100)}%)` : "—"} />
                        <StatCard label="Penalties conceded" value={teamAgg.penCount} color="#dc2626" />
                    </div>
                </Section>
            )}

            {/* Player analysis — selector for admin/coach, auto-own for player */}
            <Section title={isPlayer ? "My stats" : "Player analysis"}>
                {!isPlayer && (
                    <select
                        value={selectedPlayerId}
                        onChange={e => setSelectedPlayerId(e.target.value)}
                        style={{ width: "100%", marginBottom: 16, fontSize: 13 }}
                    >
                        <option value="">— Select a player —</option>
                        {allPlayers
                            .filter(p => playerAgg[p.id])
                            .sort((a, b) => a.displayName?.localeCompare(b.displayName))
                            .map(p => (
                                <option key={p.id} value={p.id}>{p.displayName}</option>
                            ))}
                    </select>
                )}

                {isPlayer && !selectedPlayerId && (
                    <p style={{ color: "#999", fontSize: 13 }}>Your player profile is not linked yet.</p>
                )}

                {!isPlayer && !selectedPlayerId && (
                    <p style={{ color: "#999", fontSize: 13 }}>Select a player to see their progression.</p>
                )}

                {selectedPlayerId && (
                    <>
                        {selectedPlayerInfo && (
                            <div style={{ fontSize: 13, color: "#555", marginBottom: 14 }}>
                                <strong>{selectedPlayerInfo.displayName}</strong>
                                {selectedPlayerInfo.mainPosition ? ` · ${selectedPlayerInfo.mainPosition}` : ""}
                            </div>
                        )}

                        {!selectedPlayerAgg ? (
                            <p style={{ color: "#999", fontSize: 13 }}>No events recorded yet.</p>
                        ) : (
                            <>
                                {/* Season totals */}
                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
                                    {(selectedPlayerAgg.tw + selectedPlayerAgg.tl + selectedPlayerAgg.tm > 0) && (
                                        <>
                                            <StatCard label="Tackles Won"    value={selectedPlayerAgg.tw} color="#16a34a" />
                                            <StatCard label="Tackles Lost"   value={selectedPlayerAgg.tl} color="#dc2626" />
                                            <StatCard label="Tackles Missed" value={selectedPlayerAgg.tm} color="#d97706" />
                                        </>
                                    )}
                                    {selectedPlayerAgg.tries > 0 && (
                                        <StatCard label="Tries" value={selectedPlayerAgg.tries} color="#7c3aed" />
                                    )}
                                    {selectedPlayerAgg.kTotal > 0 && (
                                        <StatCard label="Kicks at goal" value={`${selectedPlayerAgg.kMade}/${selectedPlayerAgg.kTotal} (${Math.round(selectedPlayerAgg.kMade / selectedPlayerAgg.kTotal * 100)}%)`} />
                                    )}
                                    {selectedPlayerAgg.pkTotal > 0 && (
                                        <StatCard label="Play kicks" value={`${selectedPlayerAgg.pkGood}/${selectedPlayerAgg.pkTotal}`} />
                                    )}
                                    {selectedPlayerAgg.penCount > 0 && (
                                        <StatCard label="Penalties" value={selectedPlayerAgg.penCount} color="#dc2626" />
                                    )}
                                </div>

                                {/* Tackles per match */}
                                {hasTackleData && (
                                    <>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Tackles per match</div>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart data={playerMatchData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="Won"    stackId="t" fill="#16a34a" name="Won" />
                                                <Bar dataKey="Lost"   stackId="t" fill="#dc2626" name="Lost" />
                                                <Bar dataKey="Missed" stackId="t" fill="#d97706" name="Missed" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </>
                                )}

                                {/* Kicks at goal per match */}
                                {hasKickData && (
                                    <>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, marginTop: 20, textTransform: "uppercase", letterSpacing: 0.5 }}>Kicks at goal per match</div>
                                        <ResponsiveContainer width="100%" height={180}>
                                            <BarChart data={playerMatchData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="KG Made"   fill="#2563eb" name="Made" />
                                                <Bar dataKey="KG Missed" fill="#93c5fd" name="Missed" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}
            </Section>

            {/* Play analysis */}
            {!isPlayer && playAnalysis.length > 0 && (
                <Section title="Set play analysis">
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#e5e7eb", textAlign: "left" }}>
                                    <th style={TH}>Play</th>
                                    <th style={TH}>Used</th>
                                    <th style={TH}>Try %</th>
                                    <th style={TH}>Penalty %</th>
                                    <th style={TH}>Turnover %</th>
                                    <th style={TH}>Top players</th>
                                </tr>
                            </thead>
                            <tbody>
                                {playAnalysis.map(play => {
                                    const tryPct      = Math.round((play.try      || 0) / play.total * 100);
                                    const penaltyPct  = Math.round((play.penalty  || 0) / play.total * 100);
                                    const turnoverPct = Math.round((play.turnover || 0) / play.total * 100);
                                    const topPlayers  = Object.entries(play.players)
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 3)
                                        .map(([pid, n]) => {
                                            const p = allPlayers.find(pl => pl.id === pid);
                                            return p ? `${p.displayName} (${n})` : null;
                                        })
                                        .filter(Boolean)
                                        .join(", ");
                                    return (
                                        <tr key={play.name} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                            <td style={TD}><strong>{play.name}</strong></td>
                                            <td style={TD}>{play.total}</td>
                                            <td style={{ ...TD, color: tryPct >= 50 ? "#16a34a" : undefined }}>{tryPct}%</td>
                                            <td style={TD}>{penaltyPct}%</td>
                                            <td style={{ ...TD, color: turnoverPct >= 40 ? "#dc2626" : undefined }}>{turnoverPct}%</td>
                                            <td style={{ ...TD, fontSize: 11, color: "#555" }}>{topPlayers || "—"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Player — personal play involvement */}
            {isPlayer && myPlayAnalysis.length > 0 && (
                <Section title="My set plays">
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#e5e7eb", textAlign: "left" }}>
                                    <th style={TH}>Play</th>
                                    <th style={TH}>Times in</th>
                                    <th style={TH}>Try %</th>
                                    <th style={TH}>Penalty %</th>
                                    <th style={TH}>Turnover %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myPlayAnalysis.map(play => {
                                    const tryPct      = Math.round(play.try      / play.total * 100);
                                    const penaltyPct  = Math.round(play.penalty  / play.total * 100);
                                    const turnoverPct = Math.round(play.turnover / play.total * 100);
                                    return (
                                        <tr key={play.name} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                            <td style={TD}><strong>{play.name}</strong></td>
                                            <td style={TD}>{play.appeared} / {play.total}</td>
                                            <td style={{ ...TD, color: tryPct >= 50 ? "#16a34a" : undefined }}>{tryPct}%</td>
                                            <td style={TD}>{penaltyPct}%</td>
                                            <td style={{ ...TD, color: turnoverPct >= 40 ? "#dc2626" : undefined }}>{turnoverPct}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Weather performance */}
            {hasWeather && (
                <Section title="Performance by weather conditions">
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#e5e7eb", textAlign: "left" }}>
                                    <th style={TH}>Condition</th>
                                    <th style={TH}>Matches</th>
                                    <th style={TH}>Win %</th>
                                    <th style={TH}>Pts/match</th>
                                    <th style={TH}>Scrum %</th>
                                    <th style={TH}>Line-out %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weatherCorrelation.map(w => (
                                    <tr key={w.condition} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                        <td style={TD}>{w.condition}</td>
                                        <td style={TD}>{w.matches}</td>
                                        <td style={TD}>{w.winPct}%</td>
                                        <td style={TD}>{w.pfAvg}</td>
                                        <td style={TD}>{w.scrumPct   !== null ? `${w.scrumPct}%`   : "—"}</td>
                                        <td style={TD}>{w.lineoutPct !== null ? `${w.lineoutPct}%` : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}
        </div>
    );
}

const TH = { padding: "8px 10px", fontWeight: 600, fontSize: 12 };
const TD = { padding: "7px 10px" };

function Section({ title, children }) {
    return (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ marginBottom: 14 }}>{title}</h2>
            {children}
        </div>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 18px", textAlign: "center", minWidth: 80 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: color || "#111" }}>{value}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{label}</div>
        </div>
    );
}
