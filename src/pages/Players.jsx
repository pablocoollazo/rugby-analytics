import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getClubPlayers, createPlayer, updatePlayer, deletePlayer } from "../utils/firestore";

const ALL_POSITIONS = [
  "Prop",
  "Hooker",
  "Lock",
  "Flanker",
  "Number 8",
  "Scrum-half",
  "Fly-half",
  "Inside Centre",
  "Outside Centre",
  "Wing",
  "Fullback"
];

export default function Players() {
  const { club, role } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [nickname, setNickname] = useState("");
  const [mainPosition, setMainPosition] = useState(ALL_POSITIONS[0]);
  const [altPositions, setAltPositions] = useState([]);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isThrower, setIsThrower] = useState(false);
  const [isKicker, setIsKicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (club?.clubId) {
      getClubPlayers(club.clubId).then(p => {
        setPlayers(p);
        setLoading(false);
      });
    }
  }, [club]);

  function toggleAltPosition(pos) {
    if (pos === mainPosition) return;
    setAltPositions(prev =>
      prev.includes(pos)
        ? prev.filter(p => p !== pos)
        : [...prev, pos]
    );
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    await createPlayer(club.clubId, {
      name,
      surname,
      nickname,
      displayName: nickname || name,
      mainPosition,
      altPositions,
      dateOfBirth,
      isThrower,
      isKicker,
    });
    const updated = await getClubPlayers(club.clubId);
    setPlayers(updated);
    setName("");
    setSurname("");
    setNickname("");
    setMainPosition(ALL_POSITIONS[0]);
    setAltPositions([]);
    setDateOfBirth("");
    setIsThrower(false);
    setIsKicker(false);
    setShowForm(false);
    setSaving(false);
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      surname: p.surname,
      nickname: p.nickname || "",
      mainPosition: p.mainPosition,
      altPositions: p.altPositions || [],
      dateOfBirth: p.dateOfBirth || "",
      isThrower: p.isThrower || false,
      isKicker: p.isKicker || false,
    });
  }

  function toggleEditAltPosition(pos) {
    if (pos === editForm.mainPosition) return;
    setEditForm(f => ({
      ...f,
      altPositions: f.altPositions.includes(pos)
        ? f.altPositions.filter(p => p !== pos)
        : [...f.altPositions, pos],
    }));
  }

  async function handleSaveEdit(playerId) {
    setSaving(true);
    const updated = {
      ...editForm,
      displayName: editForm.nickname || editForm.name,
    };
    await updatePlayer(playerId, updated);
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, ...updated } : p));
    setEditingId(null);
    setSaving(false);
  }

  async function handleDelete(playerId) {
    await deletePlayer(playerId);
    setPlayers(prev => prev.filter(p => p.id !== playerId));
  }

  const canEdit = role === "admin" || role === "coach";

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Players</h1>
        <button onClick={() => navigate("/")}>Back</button>
      </div>

      {canEdit && (
        <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: 20 }}>
          {showForm ? "Cancel" : "+ Add Player"}
        </button>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ background: "#f5f5f5", padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <div>
            <label>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Surname</label>
            <input value={surname} onChange={e => setSurname(e.target.value)} required />
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Nickname (optional)</label>
            <input value={nickname} onChange={e => setNickname(e.target.value)} />
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Main position</label>
            <select
              value={mainPosition}
              onChange={e => {
                setMainPosition(e.target.value);
                setAltPositions(prev => prev.filter(p => p !== e.target.value));
              }}
            >
              {ALL_POSITIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Alternative positions (optional)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {ALL_POSITIONS.map(p => {
                const isMain = p === mainPosition;
                const isSelected = altPositions.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleAltPosition(p)}
                    disabled={isMain}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 20,
                      background: isMain ? "#ccc" : isSelected ? "#2563eb" : "#fff",
                      color: isSelected && !isMain ? "#fff" : "#000",
                      border: "1px solid #ccc",
                      cursor: isMain ? "not-allowed" : "pointer"
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Date of birth</label>
            <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} required />
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={isThrower} onChange={e => setIsThrower(e.target.checked)} />
              Thrower
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={isKicker} onChange={e => setIsKicker(e.target.checked)} />
              Kicker
            </label>
          </div>

          <button type="submit" disabled={saving} style={{ marginTop: 12 }}>
            {saving ? "Saving..." : "Save player"}
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading players...</p>
      ) : players.length === 0 ? (
        <p>No players yet. Add your first player!</p>
      ) : (
        <div>
          {players.map(p => (
            <div key={p.id} className="card" style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, marginBottom: 12 }}>
              {editingId === p.id ? (
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Name" style={{ flex: 1, fontSize: 13 }} />
                    <input value={editForm.surname} onChange={e => setEditForm(f => ({ ...f, surname: e.target.value }))}
                      placeholder="Surname" style={{ flex: 1, fontSize: 13 }} />
                  </div>
                  <input value={editForm.nickname} onChange={e => setEditForm(f => ({ ...f, nickname: e.target.value }))}
                    placeholder="Nickname (opcional)" style={{ width: "100%", fontSize: 13, marginBottom: 8, boxSizing: "border-box" }} />
                  <select value={editForm.mainPosition}
                    onChange={e => setEditForm(f => ({ ...f, mainPosition: e.target.value, altPositions: f.altPositions.filter(p => p !== e.target.value) }))}
                    style={{ fontSize: 13, marginBottom: 8, width: "100%" }}>
                    {ALL_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                  </select>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {ALL_POSITIONS.map(pos => {
                      const isMain = pos === editForm.mainPosition;
                      const isSelected = editForm.altPositions.includes(pos);
                      return (
                        <button key={pos} type="button" onClick={() => toggleEditAltPosition(pos)} disabled={isMain}
                          style={{ padding: "3px 8px", borderRadius: 12, fontSize: 12, border: "1px solid #ccc",
                            background: isMain ? "#ccc" : isSelected ? "#2563eb" : "#fff",
                            color: isSelected && !isMain ? "#fff" : "#000", cursor: isMain ? "not-allowed" : "pointer" }}>
                          {pos}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <input type="date" value={editForm.dateOfBirth}
                      onChange={e => setEditForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                      style={{ fontSize: 13, flex: 1 }} />
                    <label style={{ fontSize: 13, display: "flex", gap: 4, alignItems: "center" }}>
                      <input type="checkbox" checked={editForm.isThrower}
                        onChange={e => setEditForm(f => ({ ...f, isThrower: e.target.checked }))} /> Thrower
                    </label>
                    <label style={{ fontSize: 13, display: "flex", gap: 4, alignItems: "center" }}>
                      <input type="checkbox" checked={editForm.isKicker}
                        onChange={e => setEditForm(f => ({ ...f, isKicker: e.target.checked }))} /> Kicker
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleSaveEdit(p.id)} disabled={saving} style={{ fontSize: 13 }}>
                      {saving ? "Guardando..." : "Guardar"}
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ fontSize: 13, background: "none" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{p.displayName}</strong>
                    <span>{p.mainPosition}</span>
                  </div>
                  {p.altPositions?.length > 0 && (
                    <small>Also plays: {p.altPositions.join(", ")}</small>
                  )}
                  <br />
                  <small>DOB: {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString("en-GB") : p.age ?? "—"}</small>
                  {(p.isThrower || p.isKicker) && (
                    <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
                      {p.isThrower && <small style={{ background: "#dbeafe", padding: "1px 6px", borderRadius: 10 }}>Thrower</small>}
                      {p.isKicker && <small style={{ background: "#dcfce7", padding: "1px 6px", borderRadius: 10 }}>Kicker</small>}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                    <button onClick={() => navigate(`/players/${p.id}`)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#2563eb" }}>
                      Ver perfil
                    </button>
                    {canEdit && (
                      <>
                        <button onClick={() => startEdit(p)}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#555" }}>
                          Editar
                        </button>
                        <button onClick={() => handleDelete(p.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "red" }}>
                          Borrar
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
