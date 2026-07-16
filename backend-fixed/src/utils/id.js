const { nanoid } = require('nanoid');

// Generates ids in the same shape the frontend already expects,
// e.g. role_abc123, p_abc123, voter_abc123, vote_abc123, season_abc123
function makeId(prefix) {
  return `${prefix}_${nanoid(10)}`;
}

module.exports = { makeId };
