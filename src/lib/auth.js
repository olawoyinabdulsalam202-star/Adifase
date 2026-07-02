import { db, sessionKeys, SESSION_TTL } from "./db";

// Demo-only hash so plaintext passwords never sit in localStorage as-is.
// Replace with bcrypt/argon2 server-side once the real backend is wired in.
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "").toLowerCase();
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "";

function issueSession(key, payload) {
  const session = { ...payload, issuedAt: Date.now(), expiresAt: Date.now() + SESSION_TTL };
  localStorage.setItem(key, JSON.stringify(session));
  return session;
}

function readSession(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session.expiresAt || Date.now() > session.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function voterLogin(email, password) {
  const voter = db.findVoterByEmail(email);
  if (!voter) throw new Error("Invalid email or password.");
  const hash = await hashPassword(password);
  if (hash !== voter.passwordHash) throw new Error("Invalid email or password.");
  return issueSession(sessionKeys.session, { userId: voter.id, name: voter.name, email: voter.email });
}

export function getVoterSession() {
  return readSession(sessionKeys.session);
}

export function voterLogout() {
  localStorage.removeItem(sessionKeys.session);
}

export function adminLogin(email, password) {
  const normalized = email.trim().toLowerCase();
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Admin credentials are not configured. Set VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD.");
  }
  if (normalized !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    throw new Error("Invalid admin credentials.");
  }
  return issueSession(sessionKeys.adminSession, { role: "admin", email: normalized });
}

export function getAdminSession() {
  return readSession(sessionKeys.adminSession);
}

export function adminLogout() {
  localStorage.removeItem(sessionKeys.adminSession);
}
