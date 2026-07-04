import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { IconCrown, IconUserPlaceholder } from "../components/icons";
import { db } from "../lib/db";
import { useAuth } from "../context/AuthContext";
import "./Leaderboard.css";

export default function Leaderboard() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [activeRoleId, setActiveRoleId] = useState(null);
  const [participants, setParticipants] = useState([]);
  // Map of participantId -> vote count. Only ever populated when status is
  // "published" — the backend refuses to return counts otherwise.
  const [voteCounts, setVoteCounts] = useState({});
  const [status, setStatus] = useState("ongoing");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const [allRoles, allParticipants, currentStatus] = await Promise.all([
        db.getRoles(),
        db.getParticipants(),
        db.getElectionStatus(),
      ]);

      setRoles(allRoles);
      setActiveRoleId((prev) => prev || allRoles[0]?.id || null);
      setParticipants(allParticipants);
      setStatus(currentStatus);

      if (currentStatus === "published") {
        // GET /results is public but only returns data once published —
        // 403 otherwise, which we've already avoided by checking status first.
        const results = await db.getResults();
        const counts = {};
        results.forEach((role) => {
          role.candidates.forEach((c) => {
            counts[c.id] = c.votes;
          });
        });
        setVoteCounts(counts);
      } else {
        setVoteCounts({});
      }
    } catch (err) {
      // Non-fatal here — worst case the page just shows candidates with no counts.
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const candidatesForRole = useMemo(
    () => participants.filter((p) => p.roleId === activeRoleId),
    [participants, activeRoleId]
  );

  const tallied = useMemo(() => {
    const withCounts = candidatesForRole.map((c) => ({
      ...c,
      count: voteCounts[c.id] ?? 0,
    }));
    return withCounts.sort((a, b) => b.count - a.count);
  }, [candidatesForRole, voteCounts]);

  const totalVotesForRole = tallied.reduce((sum, c) => sum + c.count, 0);
  const isPublished = status === "published";
  const topCount = tallied[0]?.count ?? 0;

  const banner = {
    ongoing: { text: "Voting in progress", className: "lb-banner-live" },
    closed: { text: "Voting closed — results pending", className: "lb-banner-pending" },
    published: { text: "Official results published", className: "lb-banner-done" },
  }[status];

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
        <div className="poll-empty">No positions have been set up yet.</div>
      </div>
    );
  }

  return (
    <div className="lb-page">
      <NavBar status={status} voterName={session?.name} onLogout={handleLogout} />

      <main className="lb-main">
        <div className={`lb-banner ${banner.className}`}>{banner.text}</div>

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
            </button>
          ))}
        </div>

        {tallied.length === 0 ? (
          <p className="poll-empty">No candidates under this position yet.</p>
        ) : isPublished ? (
          <div className="lb-results-grid">
            {tallied.map((c, idx) => {
              const pct = totalVotesForRole ? ((c.count / totalVotesForRole) * 100).toFixed(1) : "0.0";
              const isWinner = c.count === topCount && topCount > 0;
              return (
                <div key={c.id} className={`lb-result-card card ${isWinner ? "lb-winner" : ""}`}>
                  {isWinner && (
                    <span className="lb-crown">
                      <IconCrown />
                    </span>
                  )}
                  <div className="lb-photo">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt={c.name} />
                    ) : (
                      <span className="candidate-photo-fallback">
                        <IconUserPlaceholder />
                      </span>
                    )}
                  </div>
                  <h3 className="lb-name">{c.name}</h3>
                  <p className="lb-votes">{c.count} votes</p>
                  <div className="lb-bar-track">
                    <div
                      className={`lb-bar-fill ${isWinner ? "lb-bar-fill-winner" : ""}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="lb-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="lb-pending-grid">
            {tallied.map((c) => (
              <div key={c.id} className="lb-pending-card card">
                <div className="lb-photo">
                  {c.photoUrl ? (
                    <img src={c.photoUrl} alt={c.name} />
                  ) : (
                    <span className="candidate-photo-fallback">
                      <IconUserPlaceholder />
                    </span>
                  )}
                </div>
                <h3 className="lb-name">{c.name}</h3>
              </div>
            ))}
          </div>
        )}

        {isPublished && (
          <p className="lb-footnote">Results are displayed per position. Select a position above to view results.</p>
        )}
      </main>
    </div>
  );
}