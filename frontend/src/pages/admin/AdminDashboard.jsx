import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../../lib/db";
import { IconBallot, IconUsers, IconToggle, IconChart, IconLogout } from "../../components/icons";
import "./AdminShared.css";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ roles: 0, candidates: 0, voters: 0, voted: 0, notVoted: 0, status: "ongoing" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const [roles, participants, voters, status] = await Promise.all([
        db.getRoles(),
        db.getParticipants(),
        db.getVoters(),
        db.getElectionStatus(),
      ]);

      // GET /voters already includes hasVoted per voter — no separate call needed.
      const voted = voters.filter((v) => v.hasVoted).length;

      setStats({
        roles: roles.length,
        candidates: participants.length,
        voters: voters.length,
        voted,
        notVoted: voters.length - voted,
        status,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const statusLabel = { ongoing: "Open voting", closed: "Voting closed", published: "Results published" }[stats.status];
  const statusDesc = {
    ongoing: "Voting is currently open. Voters can cast their votes.",
    closed: "Voting has ended. Results are pending.",
    published: "Official results are visible to all voters.",
  }[stats.status];

  if (loading) {
    return (
      <div>
        <div className="admin-page-header">
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">Overview of the Adifase &apos;97 election.</p>
        </div>
        <p className="admin-empty-row" style={{ textAlign: "left", padding: "32px 0" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-subtitle">Overview of the Adifase &apos;97 election.</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card card">
          <p className="stat-label">Total roles</p>
          <p className="stat-value">{stats.roles}</p>
        </div>
        <div className="stat-card card">
          <p className="stat-label">Total candidates</p>
          <p className="stat-value">{stats.candidates}</p>
        </div>
        <div className="stat-card card">
          <p className="stat-label">Total voters</p>
          <p className="stat-value">{stats.voters}</p>
        </div>
        <div className="stat-card card">
          <p className="stat-label">Voted</p>
          <p className="stat-value" style={{ color: "var(--success)" }}>{stats.voted}</p>
        </div>
        <div className="stat-card card">
          <p className="stat-label">Not voted</p>
          <p className="stat-value" style={{ color: "var(--warning)" }}>{stats.notVoted}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card" style={{ padding: 20 }}>
          <p className="stat-label" style={{ marginBottom: 8 }}>
            Voting status
          </p>
          <p style={{ fontWeight: 700, color: "var(--green-800)", marginBottom: 4 }}>{statusLabel}</p>
          <p style={{ fontSize: "0.82rem", color: "var(--ink-700)", marginBottom: 16 }}>{statusDesc}</p>
          <Link to="/admin/voting-status" className="btn btn-primary btn-sm">
            Manage voting status
          </Link>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <p className="stat-label" style={{ marginBottom: 12 }}>
            Quick actions
          </p>
          <div className="quick-actions">
            <Link to="/admin/roles" className="quick-action-link">
              <IconBallot />
              Manage roles
            </Link>
            <Link to="/admin/participants" className="quick-action-link">
              <IconUsers />
              Manage participants
            </Link>
            <Link to="/admin/voting-status" className="quick-action-link">
              <IconToggle />
              Voting status
            </Link>
            <Link to="/admin/results" className="quick-action-link">
              <IconChart />
              View results
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}