import { useEffect, useState } from "react";
import { db } from "../../lib/db";
import { IconDownload } from "../../components/icons";
import "./AdminShared.css";

function downloadCsv(rows) {
  const header = "Role,Candidate,Votes\n";
  const body = rows.map((r) => `${r.role},${r.candidate},${r.votes}`).join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "adifase97-results.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function downloadExcel(rows) {
  const header = "Role\tCandidate\tVotes\n";
  const body = rows.map((r) => `${r.role}\t${r.candidate}\t${r.votes}`).join("\n");
  const blob = new Blob([header + body], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "adifase97-results.xls";
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminResults() {
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("ongoing");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      // Single bulk call — one pre-joined roles/candidates/votes list,
      // instead of a request per candidate.
      const [adminResults, currentStatus] = await Promise.all([
        db.getAdminResults(),
        db.getElectionStatus(),
      ]);
      setResults(adminResults);
      setStatus(currentStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const rows = results.flatMap((role) =>
    [...role.candidates]
      .sort((a, b) => b.votes - a.votes)
      .map((c) => ({ role: role.roleName, candidate: c.name, votes: c.votes }))
  );

  const totalRoles = results.length;
  const totalCandidates = results.reduce((sum, role) => sum + role.candidates.length, 0);
  const totalVotes = results.reduce((sum, role) => sum + role.totalVotes, 0);

  if (loading) {
    return (
      <div>
        <div className="admin-page-header">
          <h1 className="admin-page-title">Results Overview</h1>
        </div>
        <p className="admin-empty-row" style={{ textAlign: "left", padding: "32px 0" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Results Overview</h1>
        <p className="admin-page-subtitle">
          {status === "published" ? "Official results are live for all voters." : "Visible only to admins until published."}
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat-card card">
          <p className="stat-label">Total roles</p>
          <p className="stat-value">{totalRoles}</p>
        </div>
        <div className="stat-card card">
          <p className="stat-label">Total candidates</p>
          <p className="stat-value">{totalCandidates}</p>
        </div>
        <div className="stat-card card">
          <p className="stat-label">Total votes cast</p>
          <p className="stat-value">{totalVotes}</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <span />
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={() => downloadCsv(rows)}>
            <IconDownload />
            Export CSV
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => downloadExcel(rows)}>
            <IconDownload />
            Export Excel
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Candidate</th>
              <th>Votes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="admin-empty-row">
                  No results yet.
                </td>
              </tr>
            )}
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td>{r.role}</td>
                <td>{r.candidate}</td>
                <td>{r.votes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}