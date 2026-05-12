import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { getClubPlayers, getStats, setStats } from "../utils/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import ScrumSection from "../components/matchStats/ScrumSection";
import LineoutSection from "../components/matchStats/LineoutSection";
import RuckSection from "../components/matchStats/RuckSection";
import TackleSection from "../components/matchStats/TackleSection";
import KickSection from "../components/matchStats/KickSection";
import PlayKickSection from "../components/matchStats/PlayKickSection";
import PenaltySection from "../components/matchStats/PenaltySection";
import PlaysSection from "../components/matchStats/PlaysSection";
import TrySection from "../components/matchStats/TrySection";

export default function MatchDetails() {
    const { id } = useParams();
    const { club, role } = useAuth();
    const navigate = useNavigate();
    const [match, setMatch] = useState(null);
    const [players, setPlayers] = useState([]);
    const [stats, setStatsState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [pointsFor, setPointsFor] = useState("");
    const [pointsAgainst, setPointsAgainst] = useState("");

    useEffect(() => {
        async function load() {
            const matchSnap = await getDoc(doc(db, "matches", id));
            setMatch({ id: matchSnap.id, ...matchSnap.data() });
            const clubPlayers = await getClubPlayers(club.clubId);
            setPlayers(clubPlayers);
            const existingStats = await getStats(id);
            if (existingStats) {
                setStatsState(existingStats);
                setPointsFor(existingStats.pointsFor || "");
                setPointsAgainst(existingStats.pointsAgainst || "");
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
        await setStats(id, {
            ...stats,
            pointsFor: pf,
            pointsAgainst: pa,
            result,
        });
        setStatsState(prev => ({ ...prev, pointsFor: pf, pointsAgainst: pa, result }));
        setSaving(false);
    }

    const canEdit = role === "admin" || role === "coach";
    const sharedProps = { stats, setStatsState, matchId: id, canEdit, players };

    if (loading) return <p>Loading...</p>;

    return (
        <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>{match?.rival}</h1>
                <button onClick={() => navigate("/matches")}>Back</button>
            </div>
            <p>{match?.date} · {match?.location}</p>

            <Section title="Result">
                {stats?.result && (
                    <p style={{ marginBottom: 12 }}>
                        Result: <strong style={{ color: stats.result === "Win" ? "green" : stats.result === "Loss" ? "red" : "gray" }}>{stats.result}</strong> · Us: <strong>{stats.pointsFor}</strong> · Them: <strong>{stats.pointsAgainst}</strong>
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

            <Section title="Scrums">
                <ScrumSection {...sharedProps} />
            </Section>

            <Section title="Line-outs">
                <LineoutSection {...sharedProps} />
            </Section>

            <Section title="Rucks">
                <RuckSection {...sharedProps} />
            </Section>

            <Section title="Tackles">
                <TackleSection {...sharedProps} />
            </Section>

            <Section title="Kicks at goal">
                <KickSection {...sharedProps} />
            </Section>

            <Section title="Play kicks">
                <PlayKickSection {...sharedProps} />
            </Section>

            <Section title="Penalties conceded">
                <PenaltySection {...sharedProps} />
            </Section>

            <Section title="Set plays">
                <PlaysSection {...sharedProps} />
            </Section>

            <Section title="Tries">
                <TrySection {...sharedProps} />
            </Section>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ background: "#f5f5f5", padding: 20, borderRadius: 8, marginBottom: 20 }}>
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>{title}</h2>
            {children}
        </div>
    );
}
