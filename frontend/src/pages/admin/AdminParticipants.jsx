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
  // participantId -> vote count, from the bulk admin results endpoint.
  const [voteCounts, setVoteCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const [allParticipants, allRoles, results] = await Promise.all([
        db.getParticipants(),
        db.getRoles(),
        db.getAdminResults(),
      ]);
      setParticipants(allParticipants);
      setRoles(allRoles);

      const counts = {};
      results.forEach((role) => {
        role.candidates.forEach((c) => {
          counts[c.id] = c.votes;
        });
      });
      setVoteCounts(counts);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
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

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show an instant local preview while the real upload is in flight.
    const previewUrl = URL.createObjectURL(file);
    setForm((f) => ({ ...f, photoUrl: previewUrl }));
    setUploadingPhoto(true);
    try {
      const { photoUrl } = await db.uploadPhoto(file);
      setForm((f) => ({ ...f, photoUrl }));
    } catch (err) {
      setToast({ type: "error", message: err.message || "Photo upload failed." });
      setForm((f) => ({ ...f, photoUrl: "" }));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.roleId) {
      setToast({ type: "error", message: "Name and role are required." });
      return;
    }
    if (uploadingPhoto) {
      setToast({ type: "error", message: "Please wait for the photo to finish uploading." });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await db.updateParticipant(editingId, form);
        setToast({ type: "success", message: "Participant updated." });
      } else {
        await db.addParticipant(form);
        setToast({ type: "success", message: "Participant added." });
      }
      setDrawerOpen(false);
      await refresh();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await db.deleteParticipant(deleteTarget.id);
      setToast({ type: "success", message: "Participant removed." });
      await refresh();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setDeleteTarget(null);
    }
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

      {roles.length === 0 && !loading && (
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
            {loading && (
              <tr>
                <td colSpan={6} className="admin-empty-row">
                  Loading participants...
                </td>
              </tr>
            )}
            {!loading && participants.length === 0 && (
              <tr>
                <td colSpan={6} className="admin-empty-row">
                  No participants yet.
                </td>
              </tr>
            )}
            {!loading &&
              participants.map((p) => (
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
                  <td>{voteCounts[p.id] ?? 0}</td>
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
              <input id="participant-photo" type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} />
              {uploadingPhoto && <p style={{ fontSize: "0.8rem", color: "var(--ink-700)", marginTop: 4 }}>Uploading photo...</p>}
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
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || uploadingPhoto}>
                {saving ? "Saving..." : "Save participant"}
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