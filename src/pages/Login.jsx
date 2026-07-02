import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Logo from "../components/Logo";
import { IconEye, IconEyeOff, IconCheck } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (lockedUntil && Date.now() < lockedUntil) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`Too many attempts. Try again in ${secs}s.`);
      return;
    }

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      const redirectTo = location.state?.from || "/poll";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (nextAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        setError("Too many failed attempts. Try again in 60s.");
      } else {
        setError(err.message || "Login failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-header">
          <Logo size={56} withText={false} />
          <h1 className="auth-title">ADIFASE &apos;97</h1>
          <p className="auth-subtitle">Election Portal</p>
          <p className="auth-welcome">Welcome back. Please log in to continue.</p>
        </div>

        {location.state?.registered && (
          <p className="auth-success">
            <IconCheck />
            Account created. You can log in now.
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password-input">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>

          <a href="#forgot-password" className="forgot-link">
            Forgot password?
          </a>

          {error && (
            <p className="field-error" role="alert" style={{ marginTop: 14 }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
      <p className="auth-footer">&copy; 2026 Adifase &apos;97 Alumni Association. All rights reserved.</p>
    </div>
  );
}
