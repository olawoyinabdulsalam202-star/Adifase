import { sessionKeys, SESSION_TTL } from "./session";
import { API_BASE_URL } from "./api";

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

async function postJson(path, body) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach the server. Please check your connection and try again.");
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    // no JSON body — fall through, error message below covers it
  }

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }

  return data;
}

// ---- Voter auth ----

export async function voterSignup(name, email, password) {
  const { token, voter } = await postJson("/auth/signup", { name, email, password });
  return issueSession(sessionKeys.session, {
    token,
    userId: voter.id,
    name: voter.name,
    email: voter.email,
  });
}

export async function voterLogin(email, password) {
  const { token, voter } = await postJson("/auth/login", { email, password });
  return issueSession(sessionKeys.session, {
    token,
    userId: voter.id,
    name: voter.name,
    email: voter.email,
  });
}

export function getVoterSession() {
  return readSession(sessionKeys.session);
}

export function voterLogout() {
  localStorage.removeItem(sessionKeys.session);
}

// ---- Admin auth ----

export async function adminLogin(email, password) {
  const normalized = email.trim().toLowerCase();
  const { token } = await postJson("/auth/admin/login", { email: normalized, password });
  return issueSession(sessionKeys.adminSession, { token, role: "admin", email: normalized });
}

export function getAdminSession() {
  return readSession(sessionKeys.adminSession);
}

export function adminLogout() {
  localStorage.removeItem(sessionKeys.adminSession);
}