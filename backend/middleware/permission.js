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

module.exports = {
  permissionMiddleware,
  canManageRole,
  ROLE_LEVEL,
  normalizeRoleValue,
};
