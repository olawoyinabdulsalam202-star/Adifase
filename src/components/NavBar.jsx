import { Link, NavLink } from "react-router-dom";
import Logo from "./Logo";
import { IconLogout } from "./icons";

export default function NavBar({ status, voterName, onLogout }) {
  const statusLabel = {
    ongoing: "Voting in progress",
    closed: "Voting closed",
    published: "Results published"
  }[status];

  const statusClass = {
    ongoing: "status-live",
    closed: "status-pending",
    published: "status-done"
  }[status];

  return (
    <header className="navbar">
      <Link to="/" className="navbar-logo-link">
        <Logo size={38} />
      </Link>
      {voterName && (
        <nav className="navbar-links">
          <NavLink to="/poll" className={({ isActive }) => (isActive ? "navbar-link-active" : "")}>
            Poll
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => (isActive ? "navbar-link-active" : "")}>
            Leaderboard
          </NavLink>
        </nav>
      )}
      <div className="navbar-right">
        {status && (
          <span className={`status-pill ${statusClass}`}>
            <span className="status-dot" />
            {statusLabel}
          </span>
        )}
        {voterName && (
          <div className="navbar-user">
            <span className="navbar-username">{voterName}</span>
            <button className="btn-icon" onClick={onLogout} aria-label="Log out">
              <IconLogout />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
