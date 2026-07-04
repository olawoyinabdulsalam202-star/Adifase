import { API_BASE_URL } from "./api";
import { getVoterSession, getAdminSession } from "./auth";

// ---- Low-level request helper ----
// auth: undefined (public), "voter", or "admin" — controls which
// Authorization header (if any) gets attached.
async function request(path, { method = "GET", body, auth, isFormData = false } = {}) {
  const headers = {};
  let payload = body;

  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  if (auth === "voter") {
    const session = getVoterSession();
    if (!session?.token) throw new Error("You must be logged in to do that.");
    headers["Authorization"] = `Bearer ${session.token}`;
  } else if (auth === "admin") {
    const session = getAdminSession();
    if (!session?.token) throw new Error("Admin session required.");
    headers["Authorization"] = `Bearer ${session.token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: payload });
  } catch {
    throw new Error("Could not reach the server. Please check your connection and try again.");
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error((data && data.error) || `Request failed (${response.status}).`);
  }

  return data;
}

export const db = {
  // ---- Roles ----
  getRoles() {
    return request("/roles");
  },
  addRole(name) {
    return request("/roles", { method: "POST", body: { name }, auth: "admin" });
  },
  updateRole(id, name) {
    return request(`/roles/${id}`, { method: "PUT", body: { name }, auth: "admin" });
  },
  deleteRole(id) {
    return request(`/roles/${id}`, { method: "DELETE", auth: "admin" });
  },

  // ---- Participants ----
  getParticipants() {
    return request("/participants");
  },
  async getParticipantsByRole(roleId) {
    return request(`/participants?roleId=${encodeURIComponent(roleId)}`);
  },
  addParticipant(data) {
    return request("/participants", { method: "POST", body: data, auth: "admin" });
  },
  updateParticipant(id, data) {
    return request(`/participants/${id}`, { method: "PUT", body: data, auth: "admin" });
  },
  deleteParticipant(id) {
    return request(`/participants/${id}`, { method: "DELETE", auth: "admin" });
  },

  // ---- Photo upload ----
  // Pass a File/Blob from an <input type="file">. Returns { photoUrl }.
  async uploadPhoto(file) {
    const formData = new FormData();
    formData.append("photo", file);
    return request("/upload/photo", { method: "POST", body: formData, auth: "admin", isFormData: true });
  },

  // ---- Voters (admin only) ----
  getVoters() {
    return request("/voters", { auth: "admin" });
  },
  // NOTE: expects a plaintext { name, email, password } — the server hashes
  // it server-side. Do NOT hash the password before calling this.
  addVoter({ name, email, password }) {
    return request("/voters", { method: "POST", body: { name, email, password }, auth: "admin" });
  },
  deleteVoter(id) {
    return request(`/voters/${id}`, { method: "DELETE", auth: "admin" });
  },

  // ---- Election status & schedule ----
  async getElectionStatus() {
    const { status } = await request("/election/status");
    return status;
  },
  setElectionStatus(status) {
    return request("/election/status", { method: "PUT", body: { status }, auth: "admin" });
  },
  getElectionDates() {
    return request("/election/dates");
  },
  setElectionDates(startsAt, endsAt) {
    return request("/election/dates", { method: "PUT", body: { startsAt, endsAt }, auth: "admin" });
  },

  // ---- Voting ----
  // Roles the CURRENT logged-in voter has already voted for.
  async getMyVotedRoles() {
    const { votedRoleIds } = await request("/votes/my", { auth: "voter" });
    return votedRoleIds;
  },
  // userId is no longer passed — the backend identifies the voter from
  // their auth token, not from a client-supplied id.
  castVote(participantId, roleId) {
    return request("/votes", { method: "POST", body: { participantId, roleId }, auth: "voter" });
  },
  async getVoteCount(participantId) {
    const { count } = await request(`/votes/count/${participantId}`, { auth: "admin" });
    return count;
  },
  async getTotalVotesCast() {
    const { total } = await request("/votes/total", { auth: "admin" });
    return total;
  },

  // ---- Results ----
  // Public — throws (403) if the admin hasn't published results yet.
  getResults() {
    return request("/results");
  },
  // Admin — always visible regardless of election status.
  getAdminResults() {
    return request("/admin/results", { auth: "admin" });
  },

  // ---- Seasons / history (admin only) ----
  getSeasons() {
    return request("/seasons", { auth: "admin" });
  },
  // Archives current roles/participants/votes into a season snapshot,
  // clears votes, and resets status to "ongoing" — all done server-side
  // in one transaction.
  archiveSeason(label) {
    return request("/seasons", { method: "POST", body: { label }, auth: "admin" });
  },
  deleteSeason(id) {
    return request(`/seasons/${id}`, { method: "DELETE", auth: "admin" });
  },
};