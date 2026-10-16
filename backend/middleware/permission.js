const DEFAULT_DENIED_MESSAGE = "Usuário sem permissão a essa função";

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
  if (typeof role !== "string") {
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

const permissionMiddleware = (allowedRoles) => async (req, res, next) => {
  try {
    await refreshRole(req);
  } catch {
    return res
      .status(500)
      .json({ error: "Não foi possível validar o usuário." });
  }
  const normalizedAllowedRoles = normalizeRoles(allowedRoles);
  const normalizedUserRole = normalizeRoleValue(req.user?.role);

  if (!normalizedUserRole) {
    return res
      .status(403)
      .json({ error: DEFAULT_DENIED_MESSAGE, code: "PERMISSION_DENIED" });
  }

  req.user.role = normalizedUserRole;

  if (
    normalizedAllowedRoles.length > 0 &&
    normalizedAllowedRoles.includes(normalizedUserRole) === false
  ) {
    return res
      .status(403)
      .json({ error: DEFAULT_DENIED_MESSAGE, code: "PERMISSION_DENIED" });
  }

  return next();
};

const canManageRole = (currentRole, targetRole) => {
  const normalizedCurrentRole = normalizeRoleValue(currentRole);
  const normalizedTargetRole = normalizeRoleValue(targetRole);

  if (!normalizedCurrentRole || !normalizedTargetRole) return false;

  if (normalizedCurrentRole === "masteradmin") {
    return true;
  }

  if (normalizedCurrentRole === "admin") {
    return normalizedTargetRole !== "masteradmin";
  }

  if (normalizedCurrentRole === "cac_coord") {
    return (
      normalizedTargetRole === "cac" || normalizedTargetRole === "secretaria"
    );
  }

  const currentLevel = ROLE_LEVEL[normalizedCurrentRole] ?? -1;
  const targetLevel = ROLE_LEVEL[normalizedTargetRole] ?? -1;

  return currentLevel > targetLevel;
};

const db = require("../db");
async function refreshRole(req) {
  if (req.realmedRoleLoaded) return;
  const [rows] = await db.query(
    "SELECT role, status FROM users WHERE id = ? LIMIT 1",
    [req.user.id],
  );
  req.user.role =
    rows[0]?.status === "active" ? normalizeRoleValue(rows[0].role) : null;
  req.realmedRoleLoaded = true;
}
const modulePermission =
  (moduleKey, action = "view") =>
  async (req, res, next) => {
    // Authentication is still enforced by each router before this middleware.
    // Module authorization is feature-flagged until the permission matrix is ready.
    if (process.env.PERMISSIONS_ENABLED === "false") return next();
    const column = {
      view: "can_view",
      create: "can_create",
      edit: "can_edit",
      delete: "can_delete",
    }[action];
    if (!column)
      return res.status(500).json({ error: "Ação de permissão inválida." });
    try {
      await refreshRole(req);
      if (["admin", "masteradmin"].includes(req.user.role)) return next();
      if (!req.user.role)
        return res.status(401).json({ error: "Usuário inativo." });
      const [rows] = await db.query(
        `SELECT ${column} AS allowed, can_view FROM user_permissions WHERE user_id = ? AND module_key = ? LIMIT 1`,
        [req.user.id, moduleKey],
      );
      if (!rows[0]?.allowed || !rows[0]?.can_view)
        return res
          .status(403)
          .json({ error: DEFAULT_DENIED_MESSAGE, code: "PERMISSION_DENIED" });
      return next();
    } catch (error) {
      console.error("[Permissões] Falha ao validar módulo:", error);
      return res
        .status(500)
        .json({ error: "Não foi possível validar a permissão." });
    }
  };

module.exports = {
  permissionMiddleware,
  canManageRole,
  ROLE_LEVEL,
  normalizeRoleValue,
  modulePermission,
};
