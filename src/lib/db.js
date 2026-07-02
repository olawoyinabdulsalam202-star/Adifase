const KEYS = {
  roles: "adifase_roles",
  participants: "adifase_participants",
  voters: "adifase_voters",
  votes: "adifase_votes",
  electionStatus: "adifase_election_status",
  electionDates: "adifase_election_dates",
  session: "adifase_session",
  adminSession: "adifase_admin_session"
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 4;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const SEED_ROLES = [
  { id: "role_president", name: "President", createdAt: Date.now() },
  { id: "role_vp", name: "Vice President", createdAt: Date.now() },
  { id: "role_treasurer", name: "Treasurer", createdAt: Date.now() }
];

const SEED_PARTICIPANTS = [
  { id: uid("p"), name: "John Doe", roleId: "role_president", manifesto: "To promote unity, transparency, and sustainable development for every member of Adifase '97.", photoUrl: "" },
  { id: uid("p"), name: "Mary Okoro", roleId: "role_president", manifesto: "Together we can build a stronger alumni community that supports, empowers, and uplifts every member.", photoUrl: "" },
  { id: uid("p"), name: "James Adeyemi", roleId: "role_president", manifesto: "Experienced leadership with a passion for service, accountability, and continuous improvement.", photoUrl: "" }
];

function seedIfEmpty() {
  if (!localStorage.getItem(KEYS.roles)) write(KEYS.roles, SEED_ROLES);
  if (!localStorage.getItem(KEYS.participants)) write(KEYS.participants, SEED_PARTICIPANTS);
  if (!localStorage.getItem(KEYS.voters)) write(KEYS.voters, []);
  if (!localStorage.getItem(KEYS.votes)) write(KEYS.votes, []);
  if (!localStorage.getItem(KEYS.electionStatus)) write(KEYS.electionStatus, "ongoing");
}

seedIfEmpty();

export const db = {
  getRoles() {
    return read(KEYS.roles, []);
  },
  addRole(name) {
    const roles = read(KEYS.roles, []);
    const role = { id: uid("role"), name: name.trim(), createdAt: Date.now() };
    roles.push(role);
    write(KEYS.roles, roles);
    return role;
  },
  updateRole(id, name) {
    const roles = read(KEYS.roles, []).map((r) => (r.id === id ? { ...r, name: name.trim() } : r));
    write(KEYS.roles, roles);
  },
  deleteRole(id) {
    const hasParticipants = read(KEYS.participants, []).some((p) => p.roleId === id);
    if (hasParticipants) {
      throw new Error("Reassign or remove participants under this role before deleting it.");
    }
    write(KEYS.roles, read(KEYS.roles, []).filter((r) => r.id !== id));
  },

  getParticipants() {
    return read(KEYS.participants, []);
  },
  getParticipantsByRole(roleId) {
    return this.getParticipants().filter((p) => p.roleId === roleId);
  },
  addParticipant(data) {
    const participants = read(KEYS.participants, []);
    const participant = { id: uid("p"), ...data };
    participants.push(participant);
    write(KEYS.participants, participants);
    return participant;
  },
  updateParticipant(id, data) {
    const participants = read(KEYS.participants, []).map((p) => (p.id === id ? { ...p, ...data } : p));
    write(KEYS.participants, participants);
  },
  deleteParticipant(id) {
    write(KEYS.participants, read(KEYS.participants, []).filter((p) => p.id !== id));
  },

  getVoters() {
    return read(KEYS.voters, []);
  },
  findVoterByEmail(email) {
    return this.getVoters().find((v) => v.email.toLowerCase() === email.toLowerCase());
  },
  addVoter({ name, email, passwordHash }) {
    if (this.findVoterByEmail(email)) {
      throw new Error("A voter with this email already exists.");
    }
    const voters = read(KEYS.voters, []);
    const voter = { id: uid("voter"), name, email: email.toLowerCase(), passwordHash, createdAt: Date.now() };
    voters.push(voter);
    write(KEYS.voters, voters);
    return voter;
  },
  deleteVoter(id) {
    write(KEYS.voters, read(KEYS.voters, []).filter((v) => v.id !== id));
  },

  getElectionStatus() {
    return read(KEYS.electionStatus, "ongoing");
  },
  setElectionStatus(status) {
    write(KEYS.electionStatus, status);
  },

  getElectionDates() {
    return read(KEYS.electionDates, { startsAt: null, endsAt: null });
  },
  setElectionDates(startsAt, endsAt) {
    write(KEYS.electionDates, { startsAt, endsAt });
  },

  getVotes() {
    return read(KEYS.votes, []);
  },
  hasVoted(userId, roleId) {
    return this.getVotes().some((v) => v.userId === userId && v.roleId === roleId);
  },
  castVote(userId, participantId, roleId) {
    if (this.getElectionStatus() !== "ongoing") {
      throw new Error("Voting is not currently open.");
    }
    if (this.hasVoted(userId, roleId)) {
      throw new Error("You have already voted for this position.");
    }
    const votes = read(KEYS.votes, []);
    votes.push({ id: uid("vote"), userId, participantId, roleId, timestamp: Date.now() });
    write(KEYS.votes, votes);
  },
  getVoteCount(participantId) {
    return this.getVotes().filter((v) => v.participantId === participantId).length;
  },
  getTotalVotesCast() {
    return this.getVotes().length;
  },
  hasVotedAny(userId) {
    return this.getVotes().some((v) => v.userId === userId);
  },
  resetVotes() {
    write(KEYS.votes, []);
  },
  getSeasons() {
  return read("adifase_seasons", []);
},
archiveSeason(label) {
  const seasons = read("adifase_seasons", []);
  const roles = this.getRoles();
  const participants = this.getParticipants();
  const votes = this.getVotes();

  const snapshot = roles.map((role) => {
    const candidates = participants
      .filter((p) => p.roleId === role.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        photoUrl: p.photoUrl || "",
        votes: votes.filter((v) => v.participantId === p.id).length
      }))
      .sort((a, b) => b.votes - a.votes);

    const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
    return { roleId: role.id, roleName: role.name, candidates, totalVotes };
  });

  const season = {
    id: uid("season"),
    label,
    archivedAt: Date.now(),
    totalVotesCast: votes.length,
    snapshot
  };

  seasons.unshift(season);
  write("adifase_seasons", seasons);
  return season;
},
deleteSeason(id) {
  write("adifase_seasons", read("adifase_seasons", []).filter((s) => s.id !== id));
},
};

export const sessionKeys = KEYS;
export const SESSION_TTL = SESSION_TTL_MS;
export { uid, read, write };
