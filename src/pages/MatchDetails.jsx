import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { getClubPlayers, getStats, setStats, updateMatch } from "../utils/firestore";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { getWeatherForMatch } from "../utils/weather";
import { requestPermission, notify } from "../utils/notifications";
import { useMatchEvents } from "../hooks/useMatchEvents";
import SquadSection from "../components/matchStats/SquadSection";
import ScrumSection from "../components/matchStats/ScrumSection";
import LineoutSection from "../components/matchStats/LineoutSection";
import RuckSection from "../components/matchStats/RuckSection";
import PlayerEvents from "../components/matchStats/PlayerEvents";
import PlaysSection from "../components/matchStats/PlaysSection";
import SubstitutionSection from "../components/matchStats/SubstitutionSection";
import ScoreSection from "../components/matchStats/ScoreSection";

export default function MatchDetails() {
    const { id } = useParams();
    const { club, role } = useAuth();
    const navigate = useNavigate();
    const [match, setMatch] = useState(null);
    const [allPlayers, setAllPlayers] = useState([]);
    const [docStats, setDocStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [closing, setClosing] = useState(false);
    const [weather, setWeather] = useState(null);

    const { stats: eventStats, events, addEvent, deleteEvent } = useMatchEvents(id);

    useEffect(() => {
        async function load() {
            const matchSnap = await getDoc(doc(db, "matches", id));
            const matchData = { id: matchSnap.id, ...matchSnap.data() };
            setMatch(matchData);

            if (matchData.weather) {
                setWeather(matchData.weather);
            } else if (matchData.city && matchData.date) {
                const w = await getWeatherForMatch(matchData.city, matchData.date);
                if (w) {
                    setWeather(w);
                    await updateMatch(id, { weather: w });
                }
            }

            const clubPlayers = await getClubPlayers(club.clubId);
            setAllPlayers(clubPlayers);
            const existing = await getStats(id);
            if (existing) setDocStats(existing);
            setLoading(false);
        }
        if (club?.clubId) load();
    }, [id, club]);

    const scoreUs = useMemo(() =>
        (events || []).reduce((sum, ev) => {
            if (ev.type === "try") return sum + 5;
            if (ev.type === "kick_at_goal_made") {
                return sum + (ev.kickType === "penalty" || ev.kickType === "dropgoal" ? 3 : 2);
            }
            return sum;
        }, 0)
    , [events]);

    async function handleCloseMatch() {
        if (!confirm("¿Cerrar partido? Los jugadores recibirán una notificación.")) return;
        setClosing(true);
        const scoreThem = (events || [])
            .filter(e => e.type === "opponent_score")
            .reduce((s, e) => s + (e.points || 0), 0);
        const result = scoreUs > scoreThem ? "Win" : scoreUs < scoreThem ? "Loss" : "Draw";
        const updated = { ...(docStats || {}), pointsFor: scoreUs, pointsAgainst: scoreThem, result };
        await Promise.all([
            setStats(id, updated),
            updateMatch(id, { pointsFor: scoreUs, pointsAgainst: scoreThem, result, status: "completed" }),
        ]);
        setDocStats(updated);
        setMatch(prev => ({ ...prev, pointsFor: scoreUs, pointsAgainst: scoreThem, result, status: "completed" }));
        setClosing(false);
    }

    async function handleSquadSave(squad) {
        const updated = { ...(docStats || {}), squad };
        await setStats(id, updated);
        setDocStats(updated);
    }

    const canEdit = role === "admin" || role === "coach";

    useEffect(() => {
        if (canEdit) requestPermission();
    }, [canEdit]);

    const prevStatusRef = useRef(undefined);
    useEffect(() => {
        if (!id) return;
        const unsub = onSnapshot(doc(db, "matches", id), (snap) => {
            const data = snap.data();
            const status = data?.status || null;
            if (prevStatusRef.current === undefined) {
                prevStatusRef.current = status;
                return;
            }
            if (status === "completed" && prevStatusRef.current !== "completed") {
                prevStatusRef.current = "completed";
                notify(
                    "📊 Partido finalizado",
                    `vs ${data?.rival || ""} · ${data?.result || ""} ${data?.pointsFor ?? "?"}–${data?.pointsAgainst ?? "?"}`
                );
            }
        });
        return () => unsub();
    }, [id]);

    // squad: array of { playerId, jersey, position, isStarter } (new format)
    // or array of strings (old format — backwards compat)
    const rawSquad = docStats?.squad || [];
    const squad = rawSquad.length > 0 && typeof rawSquad[0] === "string"
        ? rawSquad.map(id => ({ playerId: id, jersey: "", position: "", isStarter: true }))
        : rawSquad;

    // Apply substitution events on top of initial squad to get current jersey map
    const effectiveSquad = useMemo(() => {
        const jerseyMap = {};
        squad.forEach(s => { const n = Number(s.jersey); if (n >= 1 && n <= 15) jerseyMap[String(n)] = s.playerId; });
        (eventStats.subs || []).forEach(sub => {
            Object.entries(sub.changes || {}).forEach(([jersey, playerId]) => {
                if (playerId) jerseyMap[jersey] = playerId;
                else delete jerseyMap[jersey];
            });
        });
        return Object.entries(jerseyMap).map(([jersey, playerId]) => {
            const original = squad.find(s => s.playerId === playerId) || {};
            return { ...original, playerId, jersey };
        });
    }, [squad, eventStats.subs]);

    const effectivePlayerIds = effectiveSquad.map(s => s.playerId);
    // Include all player IDs referenced in any event, including playersByJersey in play events
    const eventPlayerIds = [...new Set(events.flatMap(e => {
        const ids = [];
        if (e.playerId) ids.push(e.playerId);
        if (e.playersByJersey) ids.push(...Object.values(e.playersByJersey).filter(Boolean));
        return ids;
    }))];
    const allMatchPlayerIds = [...new Set([...effectivePlayerIds, ...eventPlayerIds])];
    const matchPlayers = allMatchPlayerIds.length > 0 ? allPlayers.filter(p => allMatchPlayerIds.includes(p.id)) : allPlayers;
    const sharedProps = { stats: eventStats, events, addEvent, deleteEvent, canEdit, players: matchPlayers, squad: effectiveSquad };

    if (loading) return <p>Loading...</p>;

    return (
        <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>{match?.rival}</h1>
                <button onClick={() => navigate("/matches")}>Back</button>
            </div>
            <p>{match?.date} · {match?.location}{match?.city ? ` · ${match.city}` : ""}</p>
            {weather && <WeatherBadge weather={weather} />}

            <Section title="Squad">
                <SquadSection squad={squad} allPlayers={allPlayers} canEdit={canEdit} onSave={handleSquadSave} />
            </Section>

            <Section title="Result">
                <ScoreSection
                    events={events}
                    addEvent={addEvent}
                    deleteEvent={deleteEvent}
                    scoreUs={scoreUs}
                    canEdit={canEdit && match?.status !== "completed"}
                    players={matchPlayers}
                    squad={effectiveSquad}
                />
            </Section>

            <Section title="Scrums"><ScrumSection {...sharedProps} /></Section>
            <Section title="Line-outs"><LineoutSection {...sharedProps} /></Section>
            <Section title="Rucks"><RuckSection {...sharedProps} /></Section>
            <Section title="Substitutions">
                <SubstitutionSection {...sharedProps} allPlayers={allPlayers} />
            </Section>
            <Section title="Player events"><PlayerEvents {...sharedProps} /></Section>
            <Section title="Set plays"><PlaysSection {...sharedProps} /></Section>

            {canEdit && match?.status !== "completed" && (
                <button onClick={handleCloseMatch} disabled={closing}
                    style={{ width: "100%", padding: "14px 0", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, cursor: closing ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 700, marginBottom: 40 }}>
                    {closing ? "Cerrando..." : "Cerrar partido"}
                </button>
            )}
            {match?.status === "completed" && (
                <div style={{ textAlign: "center", padding: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, marginBottom: 40, fontSize: 14, color: "#15803d", fontWeight: 600 }}>
                    ✓ Partido cerrado
                </div>
            )}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div className="card" style={{ background: "#f5f5f5", padding: 20, borderRadius: 8, marginBottom: 20 }}>
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>{title}</h2>
            {children}
        </div>
    );
}

function WeatherBadge({ weather }) {
    const icon = {
        "Lluvia": "🌧",
        "Llovizna": "🌦",
        "Viento fuerte": "💨",
        "Ventoso": "🌬",
        "Despejado": "☀️",
    }[weather.condition] ?? "🌤";

    return (
        <div style={{ display: "flex", gap: 16, alignItems: "center", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 14px", marginBottom: 16, fontSize: 13, flexWrap: "wrap" }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span><strong>{weather.condition}</strong></span>
            <span>🌡 {weather.tempMin}–{weather.temp}°C</span>
            {weather.rain > 0 && <span>🌧 {weather.rain} mm</span>}
            <span>💨 {weather.wind} km/h</span>
            <span style={{ color: "#64748b" }}>{weather.city}{weather.country ? `, ${weather.country}` : ""}</span>
        </div>
    );
}
