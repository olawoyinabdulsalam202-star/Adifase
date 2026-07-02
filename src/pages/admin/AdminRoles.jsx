import { useEffect, useState } from "react";
import { db } from "../../lib/db";
import { IconPlus, IconEdit, IconTrash, IconClose } from "../../components/icons";
import ConfirmModal from "../../components/ConfirmModal";
import Toast from "../../components/Toast";
import "./AdminShared.css";

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setRoles(db.getRoles());
  }

  function openAdd() {
    setEditingRole(null);
    setName("");
    setDrawerOpen(true);
  }

  function openEdit(role) {
    setEditingRole(role);
    setName(role.name);
    setDrawerOpen(true);
  }

  function handleSave() {
    if (!name.trim()) {
      setToast({ type: "error", message: "Role name is required." });
      return;
    }
    if (editingRole) {
      db.updateRole(editingRole.id, name);
      setToast({ type: "success", message: "Role updated." });
    } else {
      db.addRole(name);
      setToast({ type: "success", message: "Role added." });
    }
    setDrawerOpen(false);
    refresh();
  }

  function handleDelete() {
    try {
      db.deleteRole(deleteTarget.id);
      setToast({ type: "success", message: "Role deleted." });
      refresh();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setDeleteTarget(null);
    }
  }

  function candidateCount(roleId) {
    return db.getParticipantsByRole(roleId).length;
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Manage Roles</h1>
        <p className="admin-page-subtitle">Create, edit and manage election positions.</p>
      </div>

      <div className="admin-toolbar">
        <span />
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <IconPlus />
          Add role
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Role name</th>
              <th>Candidates</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-empty-row">
                  No roles yet. Add your first election position.
                </td>
              </tr>
            )}
            {roles.map((role, idx) => (
              <tr key={role.id}>
                <td>{idx + 1}</td>
                <td>{role.name}</td>
                <td>{candidateCount(role.id)}</td>
                <td>{new Date(role.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="admin-row-actions">
                    <button className="btn-icon" onClick={() => openEdit(role)} aria-label={`Edit ${role.name}`}>
                      <IconEdit />
                    </button>
                    <button className="btn-icon" onClick={() => setDeleteTarget(role)} aria-label={`Delete ${role.name}`}>
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
              <h2>{editingRole ? "Edit role" : "Add new role"}</h2>
              <button className="btn-icon" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <IconClose />
              </button>
            </div>
            <div className="field">
              <label htmlFor="role-name">Role name</label>
              <input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. President"
              />
            </div>
            <div className="drawer-actions">
              <button className="btn btn-outline" onClick={() => setDrawerOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Save role
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete role"
        message={
          deleteTarget && (
            <>
              Delete <strong>{deleteTarget.name}</strong>? This cannot be undone. Roles with assigned
              candidates cannot be deleted.
            </>
          )
        }
        confirmLabel="Delete"
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
