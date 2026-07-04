import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import FlagMotif from "../components/FlagMotif";
import { IconLock } from "../components/icons";
import { db } from "../lib/db";
import "./Home.css";

function getTimeParts(target) {
  if (!target) return null;
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    mins: Math.floor((diff / (1000 * 60)) % 60),
    secs: Math.floor((diff / 1000) % 60)
  };
}

export default function Home() {
  const [dates, setDates] = useState({ startsAt: null, endsAt: null });
  const [time, setTime] = useState(null);

  useEffect(() => {
    let cancelled = false;
    db.getElectionDates()
      .then((d) => {
        if (!cancelled) setDates(d);
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const target = dates.startsAt ? new Date(dates.startsAt) : null;
    setTime(getTimeParts(target));
    const interval = setInterval(() => setTime(getTimeParts(target)), 1000);
    return () => clearInterval(interval);
  }, [dates]);

  const votingHasOpened = !dates.startsAt || new Date(dates.startsAt).getTime() <= Date.now();

  return (
    <div className="home-page">
      <div className="home-split-bg" aria-hidden="true" />
      <div className="home-bg" aria-hidden="true" />
      <FlagMotif className="home-flag" />
      <div className="home-content">
        <div className="home-crest">
          <Logo size={84} withText={false} />
        </div>
        <h1 className="home-title">ADIFASE &apos;97</h1>
        <p className="home-subtitle">Class Elections 2026</p>
        <p className="home-tagline">Official Alumni Leadership Election Portal</p>

        {votingHasOpened ? (
          <div className="countdown countdown-live">
            <span className="status-dot" />
            Voting is open now
          </div>
        ) : (
          <div className="countdown" role="timer" aria-label="Time until voting opens">
            <div className="countdown-label">Voting opens in</div>
            <div className="countdown-grid">
              <div className="countdown-unit">
                <span className="countdown-value">{String(time?.days ?? 0).padStart(2, "0")}</span>
                <span className="countdown-tag">Days</span>
              </div>
              <div className="countdown-unit">
                <span className="countdown-value">{String(time?.hours ?? 0).padStart(2, "0")}</span>
                <span className="countdown-tag">Hrs</span>
              </div>
              <div className="countdown-unit">
                <span className="countdown-value">{String(time?.mins ?? 0).padStart(2, "0")}</span>
                <span className="countdown-tag">Mins</span>
              </div>
              <div className="countdown-unit">
                <span className="countdown-value">{String(time?.secs ?? 0).padStart(2, "0")}</span>
                <span className="countdown-tag">Secs</span>
              </div>
            </div>
          </div>
        )}

        <Link to="/login" className="btn btn-primary home-cta">
          <IconLock />
          Login to Vote
        </Link>

        <p className="home-footnote">&copy; 2026 Adifase &apos;97 Alumni Association. All rights reserved.</p>
      </div>
    </div>
  );
}