import { NavLink, useNavigate, Outlet } from "react-router-dom";
import Logo from "../../components/Logo";
import {
  IconDashboard,
  IconBallot,
  IconUsers,
  IconToggle,
  IconChart,
  IconLogout
} from "../../components/icons";
import { useAdminAuth } from "../../context/AdminAuthContext";
import "./AdminLayout.css";

export default function AdminLayout() {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/admin/login", { replace: true });
  }

  const navItems = [
    { to: "/admin/dashboard", label: "Dashboard", icon: IconDashboard, end: true },
    { to: "/admin/roles", label: "Roles", icon: IconBallot },
    { to: "/admin/participants", label: "Participants", icon: IconUsers },
    { to: "/admin/voters", label: "Voters", icon: IconUsers },
    { to: "/admin/voting-status", label: "Voting Status", icon: IconToggle },
    { to: "/admin/results", label: "Results", icon: IconChart },
    { to: "/admin/history", label: "History", icon: IconChart }
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Logo size={32} withText={false} />
          <div>
            <div className="admin-sidebar-title">ADIFASE &apos;97</div>
            <div className="admin-sidebar-subtitle">Admin Panel</div>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `admin-nav-link ${isActive ? "admin-nav-link-active" : ""}`}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <button className="admin-nav-link admin-logout" onClick={handleLogout}>
          <IconLogout />
          Logout
        </button>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
