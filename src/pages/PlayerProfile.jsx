import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getClubMatches, getClubPlayers, getMatchEvents } from "../utils/firestore";
import {
    ResponsiveContainer, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export default function PlayerProfile() {
    const { id } = useParams();
    const { club, role, user } = useAuth();
    const navigate = useNavigate();
    const [player, setPlayer] = useState(null);
    const [matches, setMatches] = useState([]);
    const [eventsMap, setEventsMap] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const [ms, players] = await Promise.all([
                getClubMatches(club.clubId),
                getClubPlayers(club.clubId),
            ]);
            if (role === "player") {
                const ownPlayer = players.find(p => p.userId === user.uid);
                if (!ownPlayer) { navigate("/"); return; }
                if (ownPlayer.id !== id) { navigate(`/players/${ownPlayer.id}`, { replace: true }); return; }
            }
            const found = players.find(p => p.id === id);
            setPlayer(found || null);
            setMatches(ms);
            const map = {};
            await Promise.all(ms.map(async m => { map[m.id] = await getMatchEvents(m.id); }));
            setEventsMap(map);
            setLoading(false);
        }
        if (club?.clubId) load();
    }, [id, club, role, user]);

    const playerMatches = useMemo(() =>
        matches.filter(m => (eventsMap[m.id] || []).some(ev => ev.playerId === id))
            .sort((a, b) => a.date.localeCompare(b.date))
    , [matches, eventsMap, id]);

    const totals = useMemo(() => {
        const s = { tw: 0, tl: 0, tm: 0, tries: 0, kMade: 0, kTotal: 0, pkTotal: 0, pkGood: 0, pkDist: 0, pkIn: 0, pk5022: 0, penCount: 0, le: 0 };
        Object.values(eventsMap).flat()
            .filter(ev => ev.playerId === id)
            .forEach(ev => {
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
        return s;
    }, [eventsMap, id]);

    const tackleProgression = useMemo(() =>
        playerMatches.map(m => {
            const evs = (eventsMap[m.id] || []).filter(ev => ev.playerId === id);
            return {
                name: `vs ${m.rival}`,
                Won:    evs.filter(e => e.type === "tackle_won").length,
                Lost:   evs.filter(e => e.type === "tackle_lost").length,
                Missed: evs.filter(e => e.type === "tackle_missed").length,
            };
        })
    , [playerMatches, eventsMap, id]);

    if (loading) return <p style={{ padding: 40 }}>Loading...</p>;
    if (!player)  return <p style={{ padding: 40 }}>Player not found.</p>;

    const totalTackles = totals.tw + totals.tl + totals.tm;

    return (
        <div className="page">
            <h1>{player.displayName}</h1>

            <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 }}>
                    <span><strong>Position:</strong> {player.mainPosition}</span>
                    {player.altPositions?.length > 0 && (
                        <span><strong>Also plays:</strong> {player.altPositions.join(", ")}</span>
                    )}
                    {player.dateOfBirth && (
                        <span><strong>DOB:</strong> {new Date(player.dateOfBirth).toLocaleDateString("en-GB")}</span>
                    )}
                    <span><strong>Matches:</strong> {playerMatches.length}</span>
                </div>
                {(player.isThrower || player.isKicker) && (
                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        {player.isThrower && <Tag label="Thrower" color="#dbeafe" />}
                        {player.isKicker  && <Tag label="Kicker"  color="#dcfce7" />}
                    </div>
                )}
            </div>

            {playerMatches.length === 0 && (
                <p style={{ color: "var(--muted)" }}>No events recorded yet.</p>
            )}

            {playerMatches.length > 0 && (
                <>
                    <Section title="Summary">
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            {totalTackles > 0 && (
                                <StatCard label="Tackles W/L/M" value={`${totals.tw}/${totals.tl}/${totals.tm}`} />
                            )}
                            {totals.tries > 0 && (
                                <StatCard label="Tries" value={totals.tries} color="#7c3aed" />
                            )}
                            {totals.kTotal > 0 && (
                                <StatCard label="Kicks at goal" value={`${totals.kMade}/${totals.kTotal} (${Math.round(totals.kMade / totals.kTotal * 100)}%)`} />
                            )}
                            {totals.pkTotal > 0 && (
                                <StatCard label="Play kicks" value={`${totals.pkGood}/${totals.pkTotal} · ${totals.pkDist}m`} />
                            )}
                            {totals.penCount > 0 && (
                                <StatCard label="Penalties" value={totals.penCount} color="#dc2626" />
                            )}
                            {totals.le > 0 && (
                                <StatCard label="Lineout errors" value={totals.le} color="#d97706" />
                            )}
                        </div>
                    </Section>

                    {tackleProgression.length > 1 && totalTackles > 0 && (
                        <Section title="Tackles per match">
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={tackleProgression}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="Won"    stroke="#16a34a" strokeWidth={2} dot />
                                    <Line type="monotone" dataKey="Lost"   stroke="#dc2626" strokeWidth={2} dot />
                                    <Line type="monotone" dataKey="Missed" stroke="#d97706" strokeWidth={2} dot />
                                </LineChart>
                            </ResponsiveContainer>
                        </Section>
                    )}

                    <Section title="Match breakdown">
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "var(--bg)", textAlign: "left" }}>
                                        <th style={TH}>Match</th>
                                        <th style={TH}>Date</th>
                                        <th style={TH}>Tackles</th>
                                        <th style={TH}>Tries</th>
                                        <th style={TH}>Kicks at goal</th>
                                        <th style={TH}>Penalties</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {playerMatches.map(m => {
                                        const evs = (eventsMap[m.id] || []).filter(ev => ev.playerId === id);
                                        const tw = evs.filter(e => e.type === "tackle_won").length;
                                        const tl = evs.filter(e => e.type === "tackle_lost").length;
                                        const tm = evs.filter(e => e.type === "tackle_missed").length;
                                        const tries = evs.filter(e => e.type === "try").length;
                                        const kMade = evs.filter(e => e.type === "kick_at_goal_made").length;
                                        const kTotal = kMade + evs.filter(e => e.type === "kick_at_goal_missed").length;
                                        const pens = evs.filter(e => e.type === "penalty").length;
                                        return (
                                            <tr key={m.id} style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                                                onClick={() => navigate(`/matches/${m.id}`)}>
                                                <td style={TD}>vs {m.rival}</td>
                                                <td style={TD}>{m.date}</td>
                                                <td style={TD}>{tw + tl + tm > 0 ? `${tw}/${tl}/${tm}` : "—"}</td>
                                                <td style={TD}>{tries || "—"}</td>
                                                <td style={TD}>{kTotal > 0 ? `${kMade}/${kTotal}` : "—"}</td>
                                                <td style={TD}>{pens || "—"}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Section>
                </>
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
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "12px 18px", textAlign: "center", minWidth: 90 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{label}</div>
        </div>
    );
}

function Tag({ label, color }) {
    return (
        <small style={{ background: color, padding: "2px 8px", borderRadius: 10, fontSize: 12 }}>{label}</small>
    );
}
