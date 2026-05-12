import { db } from "../firebase";
import { 
    doc, setDoc, getDoc, collection, addDoc, getDocs, query, where, updateDoc, deleteDoc
} from "firebase/firestore";

//CLUBS
export async function createClub(name, userId) {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const clubRef = doc(collection(db, "clubs"));
  await setDoc(clubRef, {
    name,
    code,
    creatorId: userId,
    members: { [userId]: "admin" },
    createdIn: new Date()
  });
  await setDoc(doc(db, "users", userId), { clubId: clubRef.id, role: "admin" });
  return { clubId: clubRef.id, code };
}

export async function joinClub(code, userId) {
  const q = query(collection(db, "clubs"), where("code", "==", code));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Club not found");
  const clubDoc = snap.docs[0];
  const currentMembers = clubDoc.data().members;
  await updateDoc(doc(db, "clubs", clubDoc.id), {
    members: { ...currentMembers, [userId]: "member" }
  });
  await setDoc(doc(db, "users", userId), { clubId: clubDoc.id, role: "member" });
  return clubDoc.id;
}

export async function getUserClub(userId) {
    const userSnap = await getDoc(doc(db, "users", userId));
    if (!userSnap.exists()) {
        return null;
    }
    const {clubId} = userSnap.data();
    const clubSnap = await getDoc(doc(db, "clubs", clubId));
    return { clubId, ...clubSnap.data() };
}

//PLAYERS
export async function createPlayer(clubId, playerData) {
    return addDoc(collection(db, "players"), { ...playerData, clubId, createdIn: new Date() });
}

export async function getClubPlayers(clubId) {
    const q = query(collection(db, "players"), where("clubId", "==", clubId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function deletePlayer(playerId) {
  await deleteDoc(doc(db, "players", playerId));
}

//MATCHES
export async function createMatch(clubId, matchData) {
    return addDoc(collection(db, "matches"), { ...matchData, clubId, createdIn: new Date() });
}

export async function getClubMatches(clubId) {
    const q = query(collection(db, "matches"), where("clubId", "==", clubId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

//STATS
export async function setStats(matchId, statsData) {
    await setDoc(doc(db, "stats", matchId), { ...statsData, updatedIn: new Date() });
}

export async function getStats(matchId) {
    const snap = await getDoc(doc(db, "stats", matchId));
    return snap.exists() ? snap.data() : null;
}

//PLAYBOOK
export async function createPlay(clubId, playData) {
    return addDoc(collection(db, "playbook"), { ...playData, clubId, createdIn: new Date() });
}

export async function getClubPlaybook(clubId) {
    const q = query(collection(db, "playbook"), where("clubId", "==", clubId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function deletePlay(playId) {
    await deleteDoc(doc(db, "playbook", playId));
}

//ROLES
export async function updateMemberRole(clubId, targetUserId, newRole) {
  await updateDoc(doc(db, "clubs", clubId), {
    [`members.${targetUserId}`]: newRole
  });
  await updateDoc(doc(db, "users", targetUserId), { role: newRole });
}