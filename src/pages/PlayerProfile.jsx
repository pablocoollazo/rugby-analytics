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
    const { club } = useAuth();
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
            const found = players.find(p => p.id === id);
            setPlayer(found || null);
            setMatches(ms);
            const map = {};
            await Promise.all(ms.map(async m => { map[m.id] = await getMatchEvents(m.id); }));
            setEventsMap(map);
            setLoading(false);
        }
        if (club?.clubId) load();
    }, [id, club]);

    // Partidos en los que el jugador tiene al menos un evento
    const playerMatches = useMemo(() =>
        matches.filter(m => (eventsMap[m.id] || []).some(ev => ev.playerId === id))
            .sort((a, b) => a.date.localeCompare(b.date))
    , [matches, eventsMap, id]);

    // Stats acumuladas totales
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

    // Datos por partido para la gráfica de progresión de placajes
    const tackleProgression = useMemo(() =>
        playerMatches.map(m => {
            const evs = (eventsMap[m.id] || []).filter(ev => ev.playerId === id);
            return {
                name: `vs ${m.rival}`,
                Ganados:  evs.filter(e => e.type === "tackle_won").length,
                Perdidos: evs.filter(e => e.type === "tackle_lost").length,
                Fallados: evs.filter(e => e.type === "tackle_missed").length,
            };
        })
    , [playerMatches, eventsMap, id]);

    if (loading) return <p style={{ padding: 40 }}>Cargando...</p>;
    if (!player)  return <p style={{ padding: 40 }}>Jugador no encontrado.</p>;

    const totalTackles = totals.tw + totals.tl + totals.tm;

    return (
        <div style={{ maxWidth: 700, margin: "40px auto", padding: "0 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>{player.displayName}</h1>
                <button onClick={() => navigate("/players")}>Volver</button>
            </div>

            {/* Info básica */}
            <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "14px 18px", marginBottom: 20, fontSize: 14 }}>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                    <span><strong>Posición:</strong> {player.mainPosition}</span>
                    {player.altPositions?.length > 0 && (
                        <span><strong>También:</strong> {player.altPositions.join(", ")}</span>
                    )}
                    {player.dateOfBirth && (
                        <span><strong>Fecha nac.:</strong> {new Date(player.dateOfBirth).toLocaleDateString("es-ES")}</span>
                    )}
                    <span><strong>Partidos:</strong> {playerMatches.length}</span>
                </div>
                {(player.isThrower || player.isKicker) && (
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        {player.isThrower && <Tag label="Lanzador" color="#dbeafe" />}
                        {player.isKicker && <Tag label="Pateador" color="#dcfce7" />}
                    </div>
                )}
            </div>

            {playerMatches.length === 0 && (
                <p style={{ color: "#999" }}>Sin eventos registrados aún.</p>
            )}

            {playerMatches.length > 0 && (
                <>
                    {/* Resumen de stats */}
                    <Section title="Resumen">
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            {totalTackles > 0 && (
                                <StatCard label="Placajes W/L/M" value={`${totals.tw}/${totals.tl}/${totals.tm}`} />
                            )}
                            {totals.tries > 0 && (
                                <StatCard label="Ensayos" value={totals.tries} color="#7c3aed" />
                            )}
                            {totals.kTotal > 0 && (
                                <StatCard
                                    label="Patadas al palo"
                                    value={`${totals.kMade}/${totals.kTotal} (${Math.round(totals.kMade / totals.kTotal * 100)}%)`}
                                />
                            )}
                            {totals.pkTotal > 0 && (
                                <StatCard
                                    label="Pat. juego"
                                    value={`${totals.pkGood}/${totals.pkTotal} · ${totals.pkDist}m`}
                                />
                            )}
                            {totals.penCount > 0 && (
                                <StatCard label="Penalties" value={totals.penCount} color="#dc2626" />
                            )}
                            {totals.le > 0 && (
                                <StatCard label="Err. line-out" value={totals.le} color="#d97706" />
                            )}
                        </div>
                    </Section>

                    {/* Gráfica de placajes por partido */}
                    {tackleProgression.length > 1 && totalTackles > 0 && (
                        <Section title="Placajes por partido">
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={tackleProgression}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="Ganados"  stroke="#16a34a" strokeWidth={2} dot />
                                    <Line type="monotone" dataKey="Perdidos" stroke="#dc2626" strokeWidth={2} dot />
                                    <Line type="monotone" dataKey="Fallados" stroke="#d97706" strokeWidth={2} dot />
                                </LineChart>
                            </ResponsiveContainer>
                        </Section>
                    )}

                    {/* Tabla por partido */}
                    <Section title="Detalle por partido">
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#e5e7eb", textAlign: "left" }}>
                                        <th style={TH}>Partido</th>
                                        <th style={TH}>Fecha</th>
                                        <th style={TH}>Placajes</th>
                                        <th style={TH}>Ensayos</th>
                                        <th style={TH}>Patadas palo</th>
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
                                            <tr key={m.id} style={{ borderBottom: "1px solid #e5e7eb", cursor: "pointer" }}
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
        <div style={{ background: "#f5f5f5", padding: 20, borderRadius: 8, marginBottom: 20 }}>
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 16 }}>{title}</h2>
            {children}
        </div>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 18px", textAlign: "center", minWidth: 90 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: color || "#111" }}>{value}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{label}</div>
        </div>
    );
}

function Tag({ label, color }) {
    return (
        <small style={{ background: color, padding: "2px 8px", borderRadius: 10, fontSize: 12 }}>{label}</small>
    );
}
