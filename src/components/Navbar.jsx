import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { club, role, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <NavLink to="/" end className="nav-brand">
        🏉 {club?.name || "Rugby Analytics"}
      </NavLink>
      <div className="nav-links">
        <NavLink to="/matches">Partidos</NavLink>
        <NavLink to="/players">Jugadores</NavLink>
        <NavLink to="/analysis">Análisis</NavLink>
        <NavLink to="/playbook">Jugadas</NavLink>
        {role === "admin" && <NavLink to="/club">Club</NavLink>}
      </div>
      <div className="nav-right">
        <button onClick={handleLogout} style={{ background: "none", border: "none", color: "var(--muted)", padding: "5px 8px" }}>
          Salir
        </button>
      </div>
    </nav>
  );
}
