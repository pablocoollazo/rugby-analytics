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

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/players" element={<PrivateRoute><Players /></PrivateRoute>} />
      <Route path="/matches" element={<PrivateRoute><Matches /></PrivateRoute>} />
      <Route path="/matches/:id" element={<PrivateRoute><MatchDetails /></PrivateRoute>} />
      <Route path="/analysis" element={<PrivateRoute><Analysis /></PrivateRoute>} />
      <Route path="/playbook" element={<PrivateRoute><Playbook /></PrivateRoute>} />
    </Routes>
  );
}