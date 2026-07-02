import { useEffect, useState } from "react";
import { db } from "../../lib/db";
import { IconDownload, IconTrash, IconCrown } from "../../components/icons";
import ConfirmModal from "../../components/ConfirmModal";
import Toast from "../../components/Toast";
import "./AdminShared.css";
import "./AdminHistory.css";

function exportSeasonCsv(season) {
  const rows = [];
  season.snapshot.forEach((role) => {
    role.candidates.forEach((c) => {
      rows.push(`${role.roleName},${c.name},${c.votes}`);
    });
  });
  const content = "Role,Candidate,Votes\n" + rows.join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `adifase97-${season.label.replace(/\s+/g, "-").toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportSeasonExcel(season) {
  const rows = [];
  season.snapshot.forEach((role) => {
    role.candidates.forEach((c) => {
      rows.push(`${role.roleName}\t${c.name}\t${c.votes}`);
    });
  });
  const content = "Role\tCandidate\tVotes\n" + rows.join("\n");
  const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `adifase97-${season.label.replace(/\s+/g, "-").toLowerCase()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminHistory() {
  const [seasons, setSeasons] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setSeasons(db.getSeasons());
  }, []);

  function handleDelete() {
    db.deleteSeason(deleteTarget.id);
    setSeasons(db.getSeasons());
    if (expandedId === deleteTarget.id) setExpandedId(null);
    setToast({ type: "success", message: `"${deleteTarget.label}" deleted from history.` });
    setDeleteTarget(null);
  }

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  if (seasons.length === 0) {
    return (
      <div>
        <div className="admin-page-header">
          <h1 className="admin-page-title">Voting History</h1>
          <p className="admin-page-subtitle">Archived results from past election seasons.</p>
        </div>
        <p className="admin-empty-row" style={{ textAlign: "left", padding: "32px 0" }}>
          No seasons archived yet. Use "Start new voting season" in Voting Status to archive the current season before resetting.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Voting History</h1>
        <p className="admin-page-subtitle">Archived results from past election seasons.</p>
      </div>

      <div className="history-list">
        {seasons.map((season) => {
          const isExpanded = expandedId === season.id;
          return (
            <div key={season.id} className="history-card card">
              <div className="history-card-header" onClick={() => toggleExpand(season.id)}>
                <div className="history-card-meta">
                  <span className="history-label">{season.label}</span>
                  <span className="history-date">
                    Archived {new Date(season.archivedAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric"
                    })}
                  </span>
                  <span className="history-votes">{season.totalVotesCast} total votes</span>
                </div>
                <div className="history-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-outline btn-sm" onClick={() => exportSeasonCsv(season)}>
                    <IconDownload />
                    CSV
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => exportSeasonExcel(season)}>
                    <IconDownload />
                    Excel
                  </button>
                  <button className="btn-icon" onClick={() => setDeleteTarget(season)} aria-label="Delete season">
                    <IconTrash />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="history-body">
                  {season.snapshot.map((role) => {
                    const topVotes = role.candidates[0]?.votes ?? 0;
                    const total = role.totalVotes;
                    return (
                      <div key={role.roleId} className="history-role-block">
                        <h3 className="history-role-title">{role.roleName}</h3>
                        <div className="history-candidates">
                          {role.candidates.map((c) => {
                            const pct = total ? ((c.votes / total) * 100).toFixed(1) : "0.0";
                            const isWinner = c.votes === topVotes && topVotes > 0;
                            return (
                              <div key={c.id} className={`history-candidate ${isWinner ? "history-winner" : ""}`}>
                                <div className="history-candidate-top">
                                  {isWinner && (
                                    <span className="history-crown">
                                      <IconCrown />
                                    </span>
                                  )}
                                  <span className="history-candidate-name">{c.name}</span>
                                  <span className="history-candidate-votes">{c.votes} votes</span>
                                  <span className="history-candidate-pct">{pct}%</span>
                                </div>
                                <div className="history-bar-track">
                                  <div
                                    className={`history-bar-fill ${isWinner ? "history-bar-winner" : ""}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete season record"
        message={
          deleteTarget && (
            <>
              Permanently delete <strong>{deleteTarget.label}</strong> from history? This cannot be undone.
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