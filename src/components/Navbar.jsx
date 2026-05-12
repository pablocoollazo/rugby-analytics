import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { role, logout } = useAuth();
  return (
    <nav>
      <Link to="/">Home</Link> |{" "}
      <Link to="/players">Players</Link> |{" "}
      <Link to="/matches">Matches</Link> |{" "}
      <Link to="/playbook">Playbook</Link> |{" "}
      <Link to="/analysis">Analysis</Link>
      {role === "admin" && (
        <> | <Link to="/club">Club</Link></>
      )}
      {" "}| <button onClick={logout} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>Logout</button>
    </nav>
  );
}

export default Navbar;