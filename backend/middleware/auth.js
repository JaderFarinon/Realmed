// middleware/auth.js
const jwt = require('jsonwebtoken');
const { normalizeRoleValue } = require('./permission');

const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  if (!JWT_SECRET) return res.status(500).json({ error: 'Autenticação não configurada' });
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Token not provided' });
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Token not provided' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token', code: 'AUTH_SESSION_EXPIRED' });
    const normalizedRole = normalizeRoleValue(user.role);
    req.user = {
      ...user,
      role: normalizedRole || user.role,
    };
    next();
  });
}

module.exports = authMiddleware;
