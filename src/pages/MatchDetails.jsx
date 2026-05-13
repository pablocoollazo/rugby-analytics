import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { getClubPlayers, getStats, setStats } from "../utils/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useMatchEvents } from "../hooks/useMatchEvents";
import SquadSection from "../components/matchStats/SquadSection";
import ScrumSection from "../components/matchStats/ScrumSection";
import LineoutSection from "../components/matchStats/LineoutSection";
import RuckSection from "../components/matchStats/RuckSection";
import PlayerEvents from "../components/matchStats/PlayerEvents";
import PlaysSection from "../components/matchStats/PlaysSection";

export default function MatchDetails() {
    const { id } = useParams();
    const { club, role } = useAuth();
    const navigate = useNavigate();
    const [match, setMatch] = useState(null);
    const [allPlayers, setAllPlayers] = useState([]);
    const [docStats, setDocStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pointsFor, setPointsFor] = useState("");
    const [pointsAgainst, setPointsAgainst] = useState("");

    const { stats: eventStats, events, addEvent, deleteEvent } = useMatchEvents(id);

    useEffect(() => {
        async function load() {
            const matchSnap = await getDoc(doc(db, "matches", id));
            setMatch({ id: matchSnap.id, ...matchSnap.data() });
            const clubPlayers = await getClubPlayers(club.clubId);
            setAllPlayers(clubPlayers);
            const existing = await getStats(id);
            if (existing) {
                setDocStats(existing);
                setPointsFor(existing.pointsFor || "");
                setPointsAgainst(existing.pointsAgainst || "");
            }
            setLoading(false);
        }
        if (club?.clubId) load();
    }, [id, club]);

    async function handleSaveResult(e) {
        e.preventDefault();
        setSaving(true);
        const pf = Number(pointsFor);
        const pa = Number(pointsAgainst);
        const result = pf > pa ? "Win" : pf < pa ? "Loss" : "Draw";
        const updated = { ...(docStats || {}), pointsFor: pf, pointsAgainst: pa, result };
        await setStats(id, updated);
        setDocStats(updated);
        setSaving(false);
    }

    async function handleSquadSave(squad) {
        const updated = { ...(docStats || {}), squad };
        await setStats(id, updated);
        setDocStats(updated);
    }

    const canEdit = role === "admin" || role === "coach";
    // squad: array of { playerId, jersey, position, isStarter } (new format)
    // or array of strings (old format — backwards compat)
    const rawSquad = docStats?.squad || [];
    const squad = rawSquad.length > 0 && typeof rawSquad[0] === "string"
        ? rawSquad.map(id => ({ playerId: id, jersey: "", position: "", isStarter: true }))
        : rawSquad;
    const squadPlayerIds = squad.map(s => s.playerId);
    const squadPlayers = squadPlayerIds.length > 0 ? allPlayers.filter(p => squadPlayerIds.includes(p.id)) : allPlayers;
    const sharedProps = { stats: eventStats, events, addEvent, deleteEvent, canEdit, players: squadPlayers, squad };

    if (loading) return <p>Loading...</p>;

    return (
        <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>{match?.rival}</h1>
                <button onClick={() => navigate("/matches")}>Back</button>
            </div>
            <p>{match?.date} · {match?.location}</p>

            <Section title="Squad">
                <SquadSection squad={squad} allPlayers={allPlayers} canEdit={canEdit} onSave={handleSquadSave} />
            </Section>

            <Section title="Result">
                {docStats?.result && (
                    <p style={{ marginBottom: 12 }}>
                        Result: <strong style={{ color: docStats.result === "Win" ? "green" : docStats.result === "Loss" ? "red" : "gray" }}>{docStats.result}</strong> · Us: <strong>{docStats.pointsFor}</strong> · Them: <strong>{docStats.pointsAgainst}</strong>
                    </p>
                )}
                {canEdit && (
                    <form onSubmit={handleSaveResult} style={{ marginTop: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                            <div>
                                <label>Us</label>
                                <input type="number" value={pointsFor} onChange={e => setPointsFor(e.target.value)} min="0" required />
                            </div>
                            <div>
                                <label>Them</label>
                                <input type="number" value={pointsAgainst} onChange={e => setPointsAgainst(e.target.value)} min="0" required />
                            </div>
                        </div>
                        <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Result"}</button>
                    </form>
                )}
            </Section>

            <Section title="Scrums"><ScrumSection {...sharedProps} /></Section>
            <Section title="Line-outs"><LineoutSection {...sharedProps} /></Section>
            <Section title="Rucks"><RuckSection {...sharedProps} /></Section>
            <Section title="Player events"><PlayerEvents {...sharedProps} /></Section>
            <Section title="Set plays"><PlaysSection {...sharedProps} /></Section>
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
