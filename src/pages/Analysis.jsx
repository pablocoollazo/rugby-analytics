import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { getClubMatches, getClubPlayers, getMatchEvents } from "../utils/firestore";
import {
    ResponsiveContainer, LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export default function Analysis() {
    const { club } = useAuth();
    const [matches, setMatches] = useState([]);
    const [allPlayers, setAllPlayers] = useState([]);
    const [eventsMap, setEventsMap] = useState({});
    const [loading, setLoading] = useState(true);

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
                "Nosotros": m.pointsFor || 0,
                "Rivales": m.pointsAgainst || 0,
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

    // --- Tackles chart ---
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

    // --- Weather correlation ---
    const weatherCorrelation = useMemo(() => {
        const by = {};
        completed.forEach(m => {
            const cond = m.weather?.condition || "Sin datos";
            if (!by[cond]) by[cond] = {
                condition: cond, partidos: 0, victorias: 0, pf: 0, pa: 0,
                scrumWon: 0, scrumTotal: 0, lineoutWon: 0, lineoutTotal: 0,
            };
            const s = by[cond];
            s.partidos++;
            if (m.result === "Win") s.victorias++;
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
            winPct:     Math.round(s.victorias / s.partidos * 100),
            pfAvg:      (s.pf / s.partidos).toFixed(1),
            scrumPct:   s.scrumTotal   ? Math.round(s.scrumWon   / s.scrumTotal   * 100) : null,
            lineoutPct: s.lineoutTotal ? Math.round(s.lineoutWon / s.lineoutTotal * 100) : null,
        }));
    }, [completed, eventsMap]);

    const hasWeather = weatherCorrelation.some(w => w.condition !== "Sin datos");

    if (loading) return <p style={{ padding: 40 }}>Cargando estadísticas...</p>;
    if (completed.length === 0) return <p style={{ padding: 40 }}>No hay partidos completados aún.</p>;

    return (
        <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px" }}>
            <h1>Analysis</h1>

            {/* Resumen */}
            <Section title="Resumen de temporada">
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatCard label="Victorias"  value={record.w} color="#16a34a" />
                    <StatCard label="Derrotas"   value={record.l} color="#dc2626" />
                    <StatCard label="Empates"    value={record.d} color="#6b7280" />
                    <StatCard label="Pts favor"  value={record.pf} />
                    <StatCard label="Pts contra" value={record.pa} />
                    <StatCard label="Promedio"   value={`${(record.pf / record.n).toFixed(1)} – ${(record.pa / record.n).toFixed(1)}`} />
                </div>
            </Section>

            {/* Progresión */}
            {progressionData.length > 1 && (
                <Section title="Progresión de puntos">
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={progressionData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="Nosotros" stroke="#2563eb" strokeWidth={2} dot />
                            <Line type="monotone" dataKey="Rivales"  stroke="#dc2626" strokeWidth={2} dot />
                        </LineChart>
                    </ResponsiveContainer>
                </Section>
            )}

            {/* Placajes */}
            {tacklesData.length > 0 && (
                <Section title="Placajes por jugador">
                    <ResponsiveContainer width="100%" height={Math.max(180, tacklesData.length * 36)}>
                        <BarChart data={tacklesData} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Won"    stackId="a" fill="#16a34a" name="Ganados" />
                            <Bar dataKey="Lost"   stackId="a" fill="#dc2626" name="Perdidos" />
                            <Bar dataKey="Missed" stackId="a" fill="#d97706" name="Fallados" />
                        </BarChart>
                    </ResponsiveContainer>
                </Section>
            )}

            {/* Tabla estadísticas individuales */}
            <Section title="Estadísticas individuales">
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#e5e7eb", textAlign: "left" }}>
                                <th style={TH}>Jugador</th>
                                <th style={TH}>Placajes W/L/M</th>
                                <th style={TH}>Ensayos</th>
                                <th style={TH}>Patadas al palo</th>
                                <th style={TH}>Patadas juego</th>
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

            {/* Correlación clima */}
            {hasWeather && (
                <Section title="Rendimiento por condiciones climáticas">
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#e5e7eb", textAlign: "left" }}>
                                    <th style={TH}>Condición</th>
                                    <th style={TH}>Partidos</th>
                                    <th style={TH}>% Victorias</th>
                                    <th style={TH}>Pts/partido</th>
                                    <th style={TH}>% Melés</th>
                                    <th style={TH}>% Line-outs</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weatherCorrelation.map(w => (
                                    <tr key={w.condition} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                        <td style={TD}>{w.condition}</td>
                                        <td style={TD}>{w.partidos}</td>
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
        <div style={{ background: "#f5f5f5", padding: 20, borderRadius: 8, marginBottom: 20 }}>
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 16 }}>{title}</h2>
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
