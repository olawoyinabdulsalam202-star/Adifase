const { verifyVoterToken, verifyAdminToken } = require('../utils/jwt');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

// Requires a valid voter JWT. Populates req.voter = { id, name, email }
function requireVoter(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Missing or invalid session. Please log in again.' });
  try {
    const payload = verifyVoterToken(token);
    if (payload.role !== 'voter') throw new Error('wrong role');
    req.voter = { id: payload.sub, name: payload.name, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

// Requires a valid admin JWT.
function requireAdmin(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Admin session required.' });
  try {
    const payload = verifyAdminToken(token);
    if (payload.role !== 'admin') throw new Error('wrong role');
    req.admin = true;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Admin session expired or invalid. Please log in again.' });
  }
}

module.exports = { requireVoter, requireAdmin };
