import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { getUserClub } from "../utils/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [club, setClub] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clubLoading, setClubLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setClubLoading(true);
        getUserClub(u.uid).then((clubData) => {
          setClub(clubData);
          setRole(clubData?.members?.[u.uid] || null);
          setClubLoading(false);
          setLoading(false);
        });
      } else {
        setClub(null);
        setRole(null);
        setClubLoading(false);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const register = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  const updateClubData = (data) => setClub(prev => ({ ...prev, ...data }));

  const reloadClub = async () => {
    if (!auth.currentUser) return;
    const clubData = await getUserClub(auth.currentUser.uid);
    setClub(clubData);
    setRole(clubData?.members?.[auth.currentUser.uid] || null);
  };

  return (
    <AuthContext.Provider value={{ user, club, role, loading, clubLoading, login, register, logout, updateClubData, reloadClub }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}