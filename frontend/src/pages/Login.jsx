import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Logo from "../components/Logo";
import FlagMotif from "../components/FlagMotif";
import { IconEye, IconEyeOff, IconCheck } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;
const LOCKOUT_KEY_PREFIX = "adifase_login_lockout:";

function lockoutKey(email) {
  return `${LOCKOUT_KEY_PREFIX}${email.trim().toLowerCase()}`;
}

function readLockout(email) {
  try {
    const raw = localStorage.getItem(lockoutKey(email));
    return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: null };
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

function writeLockout(email, record) {
  localStorage.setItem(lockoutKey(email), JSON.stringify(record));
}

function clearLockout(email) {
  localStorage.removeItem(lockoutKey(email));
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Which email is currently locked, and how many seconds are left —
  // both scoped to a single account, never the whole form.
  const [lockedEmail, setLockedEmail] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Live countdown: ticks every second while the currently-locked email
  // is still within its lockout window, and self-clears once it expires.
  useEffect(() => {
    if (!lockedEmail) return;

    const tick = () => {
      const record = readLockout(lockedEmail);
      if (!record.lockedUntil || Date.now() >= record.lockedUntil) {
        clearLockout(lockedEmail);
        setLockedEmail(null);
        setSecondsLeft(0);
        setError("");
        return;
      }
      setSecondsLeft(Math.ceil((record.lockedUntil - Date.now()) / 1000));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedEmail]);

  const normalizedTypedEmail = email.trim().toLowerCase();
  // Only show the lockout message while the field still holds the email
  // that's actually locked — switching to a different account clears it.
  const isShowingLock = lockedEmail && normalizedTypedEmail === lockedEmail && secondsLeft > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const record = readLockout(normalizedEmail);

    if (record.lockedUntil && Date.now() < record.lockedUntil) {
      setLockedEmail(normalizedEmail);
      setSecondsLeft(Math.ceil((record.lockedUntil - Date.now()) / 1000));
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      clearLockout(normalizedEmail);
      const redirectTo = location.state?.from || "/poll";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const nextAttempts = record.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        const lockedUntil = Date.now() + LOCKOUT_MS;
        writeLockout(normalizedEmail, { attempts: nextAttempts, lockedUntil });
        setLockedEmail(normalizedEmail);
        setSecondsLeft(Math.ceil(LOCKOUT_MS / 1000));
      } else {
        writeLockout(normalizedEmail, { attempts: nextAttempts, lockedUntil: null });
        setError(err.message || "Login failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  const displayError = isShowingLock
    ? `Too many failed attempts. Try again in ${secondsLeft}s.`
    : error;

  return (
    <div className="auth-page">
      <div className="auth-split-bg" aria-hidden="true" />
      <FlagMotif className="auth-flag" />
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
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
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

          {displayError && (
            <p className="field-error" role="alert" style={{ marginTop: 14 }}>
              {displayError}
            </p>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading || isShowingLock}>
            {loading ? "Logging in..." : isShowingLock ? `Try again in ${secondsLeft}s` : "Login"}
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