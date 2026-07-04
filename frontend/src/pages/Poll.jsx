import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";
import { IconCheck, IconUserPlaceholder } from "../components/icons";
import { db } from "../lib/db";
import { useAuth } from "../context/AuthContext";
import "./Poll.css";

export default function Poll() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [activeRoleId, setActiveRoleId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [votedRoles, setVotedRoles] = useState(new Set());
  const [pendingVote, setPendingVote] = useState(null);
  const [toast, setToast] = useState(null);
  const [status, setStatus] = useState("ongoing");
  const [justVotedId, setJustVotedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const [allRoles, allParticipants, currentStatus, votedRoleIds] = await Promise.all([
        db.getRoles(),
        db.getParticipants(),
        db.getElectionStatus(),
        session ? db.getMyVotedRoles() : Promise.resolve([]),
      ]);

      setRoles(allRoles);
      setActiveRoleId((prev) => prev || allRoles[0]?.id || null);
      setParticipants(allParticipants);
      setStatus(currentStatus);
      setVotedRoles(new Set(votedRoleIds));
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  const activeCandidates = useMemo(
    () => participants.filter((p) => p.roleId === activeRoleId),
    [participants, activeRoleId]
  );

  const hasVotedForActiveRole = activeRoleId ? votedRoles.has(activeRoleId) : false;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function requestVote(candidate) {
    if (status !== "ongoing") {
      setToast({ type: "error", message: "Voting is not currently open." });
      return;
    }
    if (hasVotedForActiveRole) return;
    setPendingVote(candidate);
  }

  async function confirmVote() {
    if (!pendingVote) return;
    try {
      // No userId needed — the server identifies the voter from the auth token.
      await db.castVote(pendingVote.id, pendingVote.roleId);
      setVotedRoles((prev) => new Set(prev).add(pendingVote.roleId));
      setJustVotedId(pendingVote.id);
      setToast({ type: "success", message: "Your vote has been recorded successfully." });
      setTimeout(() => setJustVotedId(null), 2200);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setPendingVote(null);
    }
  }

  if (loading) {
    return (
      <div>
        <NavBar status={status} voterName={session?.name} onLogout={handleLogout} />
        <div className="poll-empty">Loading...</div>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div>
        <NavBar status={status} voterName={session?.name} onLogout={handleLogout} />
        <div className="poll-empty">No positions have been set up yet. Check back once the admin adds election roles.</div>
      </div>
    );
  }

  return (
    <div className="poll-page">
      <NavBar status={status} voterName={session?.name} onLogout={handleLogout} />

      <main className="poll-main">
        <h1 className="poll-heading">Cast your vote</h1>
        <p className="poll-subheading">Select a position to view candidates and vote.</p>

        <div className="role-tabs" role="tablist" aria-label="Election positions">
          {roles.map((role) => (
            <button
              key={role.id}
              role="tab"
              aria-selected={activeRoleId === role.id}
              className={`role-tab ${activeRoleId === role.id ? "role-tab-active" : ""}`}
              onClick={() => setActiveRoleId(role.id)}
            >
              {role.name}
              {votedRoles.has(role.id) && <IconCheck className="role-tab-check" />}
            </button>
          ))}
        </div>

        {activeCandidates.length === 0 ? (
          <p className="poll-empty">No candidates have been added for this position yet.</p>
        ) : (
          <div className="candidate-grid">
            {activeCandidates.map((candidate) => {
              const isJustVoted = justVotedId === candidate.id;
              const locked = hasVotedForActiveRole && !isJustVoted;
              return (
                <div key={candidate.id} className={`candidate-card card ${locked ? "candidate-locked" : ""}`}>
                  {isJustVoted && (
                    <span className="candidate-voted-badge">
                      <IconCheck />
                    </span>
                  )}
                  <div className="candidate-photo">
                    {candidate.photoUrl ? (
                      <img src={candidate.photoUrl} alt={candidate.name} />
                    ) : (
                      <span className="candidate-photo-fallback">
                        <IconUserPlaceholder />
                      </span>
                    )}
                  </div>
                  <h3 className="candidate-name">{candidate.name}</h3>
                  <p className="candidate-role-label">
                    {roles.find((r) => r.id === candidate.roleId)?.name} Candidate
                  </p>
                  <p className="candidate-manifesto">{candidate.manifesto}</p>
                  <button
                    className="btn btn-primary candidate-vote-btn"
                    disabled={hasVotedForActiveRole}
                    onClick={() => requestVote(candidate)}
                  >
                    {hasVotedForActiveRole ? "Vote recorded" : "Vote"}
                  </button>
                  {isJustVoted && (
                    <p className="candidate-voted-note">You have voted for this position</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ConfirmModal
        open={!!pendingVote}
        title="Confirm your vote"
        message={
          pendingVote && (
            <>
              You are about to cast your vote for <strong>{pendingVote.name}</strong> as{" "}
              {roles.find((r) => r.id === pendingVote.roleId)?.name}.
              <br />
              This action cannot be changed.
            </>
          )
        }
        confirmLabel="Confirm vote"
        onConfirm={confirmVote}
        onCancel={() => setPendingVote(null)}
      />

      {toast && (
        <div className="toast">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
