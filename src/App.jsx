import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useEffect, useState } from "react";
import { getClubPlayers, getUnlinkedPlayers, linkPlayerToUser } from "./utils/firestore";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Players from "./pages/Players";
import PlayerProfile from "./pages/PlayerProfile";
import Matches from "./pages/Matches";
import Analysis from "./pages/Analysis";
import MatchDetails from "./pages/MatchDetails";
import Playbook from "./pages/Playbook";
import ClubMembers from "./pages/ClubMembers";
import Navbar from "./components/Navbar";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, role, clubLoading } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (clubLoading) return null;
  return role === "admin" ? children : <Navigate to="/" />;
}

// Forces players with no linked profile to select one before accessing any page
function ProfileGuard({ children }) {
  const { user, role, club, clubLoading, reloadClub } = useAuth();
  // null = loading, false = linked (pass through), array = unlinked (show selector)
  const [state, setState] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (clubLoading || !user || role !== "player" || !club?.clubId) {
      setState(false); // not a player or not ready — pass through
      return;
    }
    getClubPlayers(club.clubId).then(ps => {
      const linked = ps.find(p => p.userId === user.uid);
      if (linked) {
        setState(false);
      } else {
        getUnlinkedPlayers(club.clubId).then(ul => setState(ul));
      }
    });
  }, [clubLoading, user, role, club?.clubId]);

  // Still checking
  if (state === null) return null;
  // Linked or non-player — pass through (Navbar + routes)
  if (state === false) return children;

  // Player has no linked profile — show selector (no Navbar)
  async function handleLink(e) {
    e.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      await linkPlayerToUser(selectedId, user.uid);
      await reloadClub();
      setState(false);
    } catch {
      setError("Error saving. Try again.");
    }
    setSaving(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100svh", padding: 24, background: "var(--bg)" }}>
      <div className="card" style={{ width: "100%", maxWidth: 400, padding: 28 }}>
        <h2 style={{ marginBottom: 8 }}>Select your profile</h2>
        <p style={{ marginBottom: 20 }}>Link your account to your player profile to continue.</p>
        {error && <p style={{ color: "var(--red)", marginBottom: 14, fontSize: 13 }}>{error}</p>}
        {state.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No unlinked profiles found. Ask your coach to add you to the squad and link your account.</p>
        ) : (
          <form onSubmit={handleLink}>
            <div style={{ marginBottom: 16 }}>
              <label>Your name</label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)} required style={{ width: "100%" }}>
                <option value="">— Select your name —</option>
                {state.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.surname} — {p.mainPosition}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={saving || !selectedId} style={{ width: "100%", padding: "9px 0", background: "var(--blue)", color: "#fff", border: "none", borderRadius: "var(--r-sm)", fontWeight: 600 }}>
              {saving ? "Saving..." : "Confirm"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  return (
    <ProfileGuard>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/players" element={<PrivateRoute><Players /></PrivateRoute>} />
        <Route path="/players/:id" element={<PrivateRoute><PlayerProfile /></PrivateRoute>} />
        <Route path="/matches" element={<PrivateRoute><Matches /></PrivateRoute>} />
        <Route path="/matches/:id" element={<PrivateRoute><MatchDetails /></PrivateRoute>} />
        <Route path="/analysis" element={<PrivateRoute><Analysis /></PrivateRoute>} />
        <Route path="/playbook" element={<PrivateRoute><Playbook /></PrivateRoute>} />
        <Route path="/club" element={<AdminRoute><ClubMembers /></AdminRoute>} />
      </Routes>
    </ProfileGuard>
  );
}
