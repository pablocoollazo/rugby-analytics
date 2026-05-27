import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { club, role, logout } = useAuth();
  const navigate = useNavigate();
  const isCoachOrAdmin = role === "admin" || role === "coach";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <NavLink to="/" end className="nav-brand">
        {club?.name || "Rugby Analytics"}
      </NavLink>
      <div className="nav-links">
        <NavLink to="/matches">Matches</NavLink>
        {isCoachOrAdmin && <NavLink to="/players">Players</NavLink>}
        <NavLink to="/analysis">Analysis</NavLink>
        {isCoachOrAdmin && <NavLink to="/playbook">Playbook</NavLink>}
        {role === "admin" && <NavLink to="/club">Club</NavLink>}
      </div>
      <div className="nav-right">
        <button onClick={handleLogout} style={{ background: "none", border: "none", color: "var(--muted)", padding: "5px 8px" }}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
