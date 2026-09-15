// middleware/auth.js
const jwt = require('jsonwebtoken');
const { normalizeRoleValue } = require('./permission');

const JWT_SECRET = process.env.JWT_SECRET || 'minhasecretkey';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Token not provided' });
  const token = auth.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    const normalizedRole = normalizeRoleValue(user.role);
    req.user = {
      ...user,
      role: normalizedRole || user.role,
    };
    next();
  });
}

module.exports = authMiddleware;
