const DEFAULT_DENIED_MESSAGE = 'Permissão negada.';

const ROLE_LEVEL = {
  masteradmin: 3,
  admin: 2,
  cac_coord: 2,
  cac: 1,
  secretaria: 1,
  user: 1,
  doctor: 1,
  nurse: 1,
  pharmacist: 1,
  patient: 0,
};

const normalizeRoleValue = (role) => {
  if (typeof role !== 'string') {
    return null;
  }

  const trimmed = role.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.toLowerCase();
};

const normalizeRoles = (roles) => {
  if (!roles) return [];

  const toNormalize = Array.isArray(roles) ? roles : [roles];

  return toNormalize
    .map((role) => normalizeRoleValue(role))
    .filter((role) => role !== null);
};

const permissionMiddleware = (allowedRoles) => (req, res, next) => {
  const normalizedAllowedRoles = normalizeRoles(allowedRoles);
  const normalizedUserRole = normalizeRoleValue(req.user?.role);

  if (!normalizedUserRole) {
    return res.status(403).json({ error: DEFAULT_DENIED_MESSAGE });
  }

  req.user.role = normalizedUserRole;

  if (
    normalizedAllowedRoles.length > 0 &&
    normalizedAllowedRoles.includes(normalizedUserRole) === false
  ) {
    return res.status(403).json({ error: DEFAULT_DENIED_MESSAGE });
  }

  return next();
};

const canManageRole = (currentRole, targetRole) => {
  const normalizedCurrentRole = normalizeRoleValue(currentRole);
  const normalizedTargetRole = normalizeRoleValue(targetRole);

  if (!normalizedCurrentRole || !normalizedTargetRole) return false;

  if (normalizedCurrentRole === 'masteradmin') {
    return true;
  }

  if (normalizedCurrentRole === 'admin') {
    return normalizedTargetRole !== 'masteradmin';
  }

  if (normalizedCurrentRole === 'cac_coord') {
    return (
      normalizedTargetRole === 'cac' || normalizedTargetRole === 'secretaria'
    );
  }

  const currentLevel = ROLE_LEVEL[normalizedCurrentRole] ?? -1;
  const targetLevel = ROLE_LEVEL[normalizedTargetRole] ?? -1;

  return currentLevel > targetLevel;
};

const db = require('../db');
const modulePermission = (moduleKey, action = 'view') => async (req, res, next) => {
  if (normalizeRoleValue(req.user?.role) === 'masteradmin') return next();
  const column = { view: 'can_view', create: 'can_create', edit: 'can_edit', delete: 'can_delete' }[action];
  if (!column) return res.status(500).json({ error: 'Ação de permissão inválida.' });
  try {
    const [rows] = await db.query(
      `SELECT ${column} AS allowed FROM user_permissions WHERE user_id = ? AND module_key = ? LIMIT 1`,
      [req.user.id, moduleKey],
    );
    if (!rows[0]?.allowed) return res.status(403).json({ error: DEFAULT_DENIED_MESSAGE });
    return next();
  } catch (error) {
    console.error('[Permissões] Falha ao validar módulo:', error);
    return res.status(500).json({ error: 'Não foi possível validar a permissão.' });
  }
};

module.exports = {
  permissionMiddleware,
  canManageRole,
  ROLE_LEVEL,
  normalizeRoleValue,
  modulePermission,
};
