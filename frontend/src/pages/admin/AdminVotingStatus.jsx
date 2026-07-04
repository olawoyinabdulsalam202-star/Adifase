import { useEffect, useState } from "react";
import { db } from "../../lib/db";
import { IconToggle, IconLock, IconPlus } from "../../components/icons";
import ConfirmModal from "../../components/ConfirmModal";
import Toast from "../../components/Toast";
import "./AdminShared.css";

const STATUS_META = {
  ongoing: { label: "Open voting", desc: "Voting is currently open. Voters can cast their votes." },
  closed: { label: "Voting closed", desc: "Voting has ended. Results are pending admin review." },
  published: { label: "Results published", desc: "Official results are visible to all voters." }
};

function toInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminVotingStatus() {
  const [status, setStatus] = useState("ongoing");
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [seasonLabel, setSeasonLabel] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const [currentStatus, dates] = await Promise.all([db.getElectionStatus(), db.getElectionDates()]);
      setStatus(currentStatus);
      setStartsAt(toInputValue(dates.startsAt));
      setEndsAt(toInputValue(dates.endsAt));
      setSeasonLabel(`Season ${new Date().getFullYear()}`);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function saveDates() {
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setToast({ type: "error", message: "End date must be after the start date." });
      return;
    }
    try {
      await db.setElectionDates(
        startsAt ? new Date(startsAt).toISOString() : null,
        endsAt ? new Date(endsAt).toISOString() : null
      );
      setToast({ type: "success", message: "Election schedule saved." });
    } catch (err) {
      setToast({ type: "error", message: err.message });
    }
  }

  function requestAction(action) {
    setPendingAction(action);
  }

  async function confirmAction() {
    setBusy(true);
    try {
      if (pendingAction === "close") {
        await db.setElectionStatus("closed");
        setStatus("closed");
        setToast({ type: "success", message: "Voting closed." });
      } else if (pendingAction === "open") {
        await db.setElectionStatus("ongoing");
        setStatus("ongoing");
        setToast({ type: "success", message: "Voting opened." });
      } else if (pendingAction === "publish") {
        await db.setElectionStatus("published");
        setStatus("published");
        setToast({ type: "success", message: "Results published." });
      } else if (pendingAction === "new-season") {
        const label = seasonLabel.trim() || `Season ${new Date().getFullYear()}`;
        // archiveSeason snapshots roles/participants/votes, clears votes,
        // and resets status + dates — all server-side in one transaction.
        // No follow-up calls needed; just reflect the known result locally.
        await db.archiveSeason(label);
        setStatus("ongoing");
        setStartsAt("");
        setEndsAt("");
        setSeasonLabel(`Season ${new Date().getFullYear() + 1}`);
        setToast({ type: "success", message: `"${label}" archived. New season started.` });
      }
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  const meta = STATUS_META[status];

  if (loading) {
    return (
      <div>
        <div className="admin-page-header">
          <h1 className="admin-page-title">Voting Status</h1>
        </div>
        <p className="admin-empty-row" style={{ textAlign: "left", padding: "32px 0" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Voting Status</h1>
        <p className="admin-page-subtitle">Control the election lifecycle: schedule, open, close, then publish results.</p>
      </div>

      <div className="card" style={{ padding: 22, maxWidth: 460, marginBottom: 18 }}>
        <p className="stat-label">Election schedule</p>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-700)", marginBottom: 16 }}>
          The landing page countdown is driven by the start date below.
        </p>
        <div className="field">
          <label htmlFor="starts-at">Voting starts</label>
          <input id="starts-at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ends-at">Voting ends</label>
          <input id="ends-at" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <button className="btn btn-outline btn-sm" onClick={saveDates}>
          Save schedule
        </button>
      </div>

      <div className="card" style={{ padding: 22, maxWidth: 460 }}>
        <p className="stat-label">Current status</p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--green-800)", margin: "4px 0 4px" }}>
          {meta.label}
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--ink-700)", marginBottom: 20 }}>{meta.desc}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {status === "ongoing" && (
            <button className="btn btn-outline voting-toggle-btn" onClick={() => requestAction("close")}>
              <IconLock />
              Close voting
            </button>
          )}

          {status === "closed" && (
            <>
              <button className="btn btn-primary voting-toggle-btn" onClick={() => requestAction("open")}>
                <IconToggle />
                Open voting
              </button>
              <button className="btn btn-gold" onClick={() => requestAction("publish")}>
                Publish results
              </button>
            </>
          )}

          {status === "published" && (
            <>
              <p style={{ fontSize: "0.85rem", color: "var(--ink-700)" }}>
                Results are live. Reopen voting if a correction is needed.
              </p>
              <button className="btn btn-outline voting-toggle-btn" onClick={() => requestAction("open")}>
                <IconToggle />
                Open voting
              </button>
            </>
          )}

          <div className="new-season-divider" />

          <div className="field" style={{ marginBottom: 8 }}>
            <label htmlFor="season-label">Season label</label>
            <input
              id="season-label"
              value={seasonLabel}
              onChange={(e) => setSeasonLabel(e.target.value)}
              placeholder="e.g. Season 2026"
            />
          </div>

          <button className="btn btn-outline voting-toggle-btn new-season-btn" onClick={() => requestAction("new-season")}>
            <IconPlus />
            Start new voting season
          </button>
        </div>
      </div>

      <ConfirmModal
        open={!!pendingAction}
        title={
          pendingAction === "close"
            ? "Close voting"
            : pendingAction === "publish"
            ? "Publish results"
            : pendingAction === "new-season"
            ? "Start new voting season"
            : "Open voting"
        }
        message={
          pendingAction === "close"
            ? "Voters will no longer be able to cast votes. The leaderboard will show a pending state until results are published."
            : pendingAction === "publish"
            ? "This action will make election results visible to all voters, including vote counts and winners per role."
            : pendingAction === "new-season"
            ? `This will archive the current season as "${seasonLabel.trim() || `Season ${new Date().getFullYear()}`}", clear all votes, and reset the leaderboard. Candidates and roles are kept. This cannot be undone.`
            : "Voting will open and voters can cast or resume casting votes."
        }
        confirmLabel={
          busy
            ? "Working..."
            : pendingAction === "publish"
            ? "Publish results"
            : pendingAction === "close"
            ? "Close voting"
            : pendingAction === "new-season"
            ? "Archive & start new"
            : "Open voting"
        }
        danger={pendingAction === "close" || pendingAction === "new-season"}
        onConfirm={confirmAction}
        onCancel={() => setPendingAction(null)}
      />

      {toast && (
        <div className="toast">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}