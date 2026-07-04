import { useEffect, useMemo, useState } from "react";
import { db } from "../../lib/db";
import { IconPlus, IconTrash, IconClose } from "../../components/icons";
import ConfirmModal from "../../components/ConfirmModal";
import Toast from "../../components/Toast";
import "./AdminShared.css";

export default function AdminVoters() {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      // GET /voters already returns hasVoted + lastActivity per voter —
      // no separate votes list needed.
      const data = await db.getVoters();
      setVoters(data);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setName("");
    setEmail("");
    setPassword("");
    setDrawerOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !email.trim() || password.length < 6) {
      setToast({ type: "error", message: "Provide a name, email, and password of at least 6 characters." });
      return;
    }
    setSaving(true);
    try {
      // Plaintext password sent over HTTPS — the server hashes it with bcrypt.
      await db.addVoter({ name: name.trim(), email: email.trim(), password });
      setToast({ type: "success", message: "Voter registered." });
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
      await db.deleteVoter(deleteTarget.id);
      setToast({ type: "success", message: "Voter removed." });
      await refresh();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setDeleteTarget(null);
    }
  }

  function votedAt(voter) {
    return voter.lastActivity ? new Date(voter.lastActivity).toLocaleString() : "—";
  }

  const filtered = useMemo(() => {
    return voters.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(search.toLowerCase()) || v.email.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (filter === "voted") return v.hasVoted;
      if (filter === "not-voted") return !v.hasVoted;
      return true;
    });
  }, [voters, filter, search]);

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Voters</h1>
        <p className="admin-page-subtitle">Registered alumni members eligible to vote.</p>
      </div>

      <div className="admin-toolbar">
        <div className="voter-filters">
          <button className={`filter-tab ${filter === "all" ? "filter-tab-active" : ""}`} onClick={() => setFilter("all")}>
            All
          </button>
          <button
            className={`filter-tab ${filter === "voted" ? "filter-tab-active" : ""}`}
            onClick={() => setFilter("voted")}
          >
            Voted
          </button>
          <button
            className={`filter-tab ${filter === "not-voted" ? "filter-tab-active" : ""}`}
            onClick={() => setFilter("not-voted")}
          >
            Not voted
          </button>
          <input
            className="voter-search"
            placeholder="Search voters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <IconPlus />
          Register voter
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Voting status</th>
              <th>Last activity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="admin-empty-row">
                  Loading voters...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-empty-row">
                  No voters match this filter.
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((v) => (
                <tr key={v.id}>
                  <td>{v.name}</td>
                  <td>{v.email}</td>
                  <td>
                    <span className={`status-chip ${v.hasVoted ? "status-chip-voted" : "status-chip-pending"}`}>
                      {v.hasVoted ? "Voted" : "Not voted"}
                    </span>
                  </td>
                  <td>{votedAt(v)}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn-icon" onClick={() => setDeleteTarget(v)} aria-label={`Remove ${v.name}`}>
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
              <h2>Register voter</h2>
              <button className="btn-icon" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <IconClose />
              </button>
            </div>

            <div className="field">
              <label htmlFor="voter-name">Full name</label>
              <input id="voter-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Patricia Udo" />
            </div>
            <div className="field">
              <label htmlFor="voter-email">Email</label>
              <input
                id="voter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voter@example.com"
              />
            </div>
            <div className="field">
              <label htmlFor="voter-password">Temporary password</label>
              <input
                id="voter-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>

            <div className="drawer-actions">
              <button className="btn btn-outline" onClick={() => setDrawerOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Register voter"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Remove voter"
        message={deleteTarget && <>Remove <strong>{deleteTarget.name}</strong>? They will lose access to vote.</>}
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