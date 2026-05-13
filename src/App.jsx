import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Players from "./pages/Players";
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

export default function App() {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/players" element={<PrivateRoute><Players /></PrivateRoute>} />
      <Route path="/matches" element={<PrivateRoute><Matches /></PrivateRoute>} />
      <Route path="/matches/:id" element={<PrivateRoute><MatchDetails /></PrivateRoute>} />
      <Route path="/analysis" element={<PrivateRoute><Analysis /></PrivateRoute>} />
      <Route path="/playbook" element={<PrivateRoute><Playbook /></PrivateRoute>} />
      <Route path="/club" element={<AdminRoute><ClubMembers /></AdminRoute>} />
    </Routes>
    </>
  );
}