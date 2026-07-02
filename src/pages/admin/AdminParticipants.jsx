import { useEffect, useState } from "react";
import { db } from "../../lib/db";
import { IconPlus, IconEdit, IconTrash, IconClose, IconUserPlaceholder } from "../../components/icons";
import ConfirmModal from "../../components/ConfirmModal";
import Toast from "../../components/Toast";
import "./AdminShared.css";

const emptyForm = { name: "", roleId: "", manifesto: "", photoUrl: "" };

export default function AdminParticipants() {
  const [participants, setParticipants] = useState([]);
  const [roles, setRoles] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setParticipants(db.getParticipants());
    setRoles(db.getRoles());
  }

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm, roleId: roles[0]?.id || "" });
    setDrawerOpen(true);
  }

  function openEdit(p) {
    setEditingId(p.id);
    setForm({ name: p.name, roleId: p.roleId, manifesto: p.manifesto, photoUrl: p.photoUrl || "" });
    setDrawerOpen(true);
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photoUrl: reader.result }));
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!form.name.trim() || !form.roleId) {
      setToast({ type: "error", message: "Name and role are required." });
      return;
    }
    if (editingId) {
      db.updateParticipant(editingId, form);
      setToast({ type: "success", message: "Participant updated." });
    } else {
      db.addParticipant(form);
      setToast({ type: "success", message: "Participant added." });
    }
    setDrawerOpen(false);
    refresh();
  }

  function handleDelete() {
    db.deleteParticipant(deleteTarget.id);
    setToast({ type: "success", message: "Participant removed." });
    setDeleteTarget(null);
    refresh();
  }

  function roleName(roleId) {
    return roles.find((r) => r.id === roleId)?.name || "Unassigned";
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Manage Participants</h1>
        <p className="admin-page-subtitle">Add candidates and assign them to a role.</p>
      </div>

      <div className="admin-toolbar">
        <span />
        <button className="btn btn-primary btn-sm" onClick={openAdd} disabled={roles.length === 0}>
          <IconPlus />
          Add participant
        </button>
      </div>

      {roles.length === 0 && (
        <div className="banner-note">Create at least one role before adding participants.</div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Votes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-empty-row">
                  No participants yet.
                </td>
              </tr>
            )}
            {participants.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="photo-preview" style={{ width: 40, height: 40, marginBottom: 0 }}>
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} />
                    ) : (
                      <span style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", padding: 8, color: "var(--ink-700)" }}>
                        <IconUserPlaceholder />
                      </span>
                    )}
                  </div>
                </td>
                <td>{p.name}</td>
                <td>{roleName(p.roleId)}</td>
                <td>
                  <span className="status-chip status-chip-voted">Active</span>
                </td>
                <td>{db.getVoteCount(p.id)}</td>
                <td>
                  <div className="admin-row-actions">
                    <button className="btn-icon" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                      <IconEdit />
                    </button>
                    <button className="btn-icon" onClick={() => setDeleteTarget(p)} aria-label={`Delete ${p.name}`}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>{editingId ? "Edit participant" : "Add participant"}</h2>
              <button className="btn-icon" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <IconClose />
              </button>
            </div>

            <div className="photo-preview">
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="Preview" />
              ) : (
                <span style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", padding: 16, color: "var(--ink-700)" }}>
                  <IconUserPlaceholder />
                </span>
              )}
            </div>
            <div className="field">
              <label htmlFor="participant-photo">Photo</label>
              <input id="participant-photo" type="file" accept="image/*" onChange={handlePhotoChange} />
            </div>

            <div className="field">
              <label htmlFor="participant-name">Full name</label>
              <input
                id="participant-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="field">
              <label htmlFor="participant-role">Role</label>
              <select
                id="participant-role"
                value={form.roleId}
                onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="participant-manifesto">Manifesto</label>
              <textarea
                id="participant-manifesto"
                rows={4}
                value={form.manifesto}
                onChange={(e) => setForm((f) => ({ ...f, manifesto: e.target.value }))}
                placeholder="Short candidate statement"
              />
            </div>

            <div className="drawer-actions">
              <button className="btn btn-outline" onClick={() => setDrawerOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Save participant
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Remove participant"
        message={deleteTarget && <>Remove <strong>{deleteTarget.name}</strong> from the ballot?</>}
        confirmLabel="Remove"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && (
        <div className="toast">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
