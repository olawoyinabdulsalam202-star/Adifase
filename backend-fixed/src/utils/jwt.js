const jwt = require('jsonwebtoken');

function signVoterToken(voter) {
  return jwt.sign(
    { sub: voter.id, name: voter.name, email: voter.email, role: 'voter' },
    process.env.JWT_VOTER_SECRET,
    { expiresIn: process.env.VOTER_TOKEN_EXPIRES_IN || '4h' }
  );
}

function signAdminToken() {
  return jwt.sign(
    { sub: 'admin', role: 'admin' },
    process.env.JWT_ADMIN_SECRET,
    { expiresIn: process.env.ADMIN_TOKEN_EXPIRES_IN || '2h' }
  );
}

function verifyVoterToken(token) {
  return jwt.verify(token, process.env.JWT_VOTER_SECRET);
}

function verifyAdminToken(token) {
  return jwt.verify(token, process.env.JWT_ADMIN_SECRET);
}

module.exports = { signVoterToken, signAdminToken, verifyVoterToken, verifyAdminToken };
