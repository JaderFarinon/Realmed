const express = require("express");
const knexFactory = require("knex");
const knexConfig = require("../knexfile");
const { permissionCatalog } = require("../services/permissionCatalog");
const authMiddleware = require("../middleware/auth");
const {
  permissionMiddleware,
  canManageRole,
  normalizeRoleValue,
} = require("../middleware/permission");

const environment = process.env.NODE_ENV || "development";
const config = knexConfig[environment] || knexConfig.development;
const knex = knexFactory(config);

const router = express.Router();

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const normalizeBoolean = (value) => {
  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }

  return value === true || value === 1;
};

const mapPermissionRow = (row) => ({
  moduleKey: row.module_key,
  canView: Boolean(row.can_view),
  canCreate: Boolean(row.can_create),
  canEdit: Boolean(row.can_edit),
  canDelete: Boolean(row.can_delete),
});

const findUserById = async (userId) => {
  return knex("users").where("id", userId).first();
};

const ensureCanManageUser = (currentUser, targetUser) => {
  if (!targetUser) {
    throw new HttpError(404, "Usuário não encontrado.");
  }

  const currentRole = normalizeRoleValue(currentUser?.role);
  const targetRole = normalizeRoleValue(targetUser?.role);

  if (currentRole === "masteradmin") {
    return;
  }

  if (currentRole === "admin") {
    if (canManageRole(currentRole, targetRole) === false) {
      throw new HttpError(
        403,
        "Você não possui permissão para gerenciar este usuário.",
      );
    }

    // Administradores devem sempre conseguir gerenciar permissões, independentemente
    // de vínculo com setor ou configurações adicionais.
    return;
  }

  throw new HttpError(403, "Permissão negada.");
};

const validateModuleKey = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return permissionCatalog.some((item) => item.key === trimmed)
    ? trimmed
    : null;
};

const validatePermissionsPayload = (payload) => {
  if (!Array.isArray(payload)) {
    throw new HttpError(400, "O formato de permissões enviado é inválido.");
  }

  const normalized = [];
  const moduleKeys = new Set();

  payload.forEach((item, index) => {
    const moduleKey = validateModuleKey(item?.moduleKey);
    if (!moduleKey) {
      throw new HttpError(
        400,
        `moduleKey inválido ou ausente na posição ${index}.`,
      );
    }

    if (moduleKeys.has(moduleKey)) {
      return;
    }

    moduleKeys.add(moduleKey);

    normalized.push({
      module_key: moduleKey,
      can_view: normalizeBoolean(item?.canView),
      can_create:
        normalizeBoolean(item?.canView) && normalizeBoolean(item?.canCreate),
      can_edit:
        normalizeBoolean(item?.canView) && normalizeBoolean(item?.canEdit),
      can_delete:
        normalizeBoolean(item?.canView) && normalizeBoolean(item?.canDelete),
    });
  });

  return normalized;
};

/**
 * @swagger
 * tags:
 *   - name: Permissions
 *     description: Gerenciamento de permissões por usuário
 */

router.use(authMiddleware);
router.use(permissionMiddleware(["masteradmin", "admin"]));
router.get("/catalog", (_req, res) => res.json(permissionCatalog));
router.get("/users", async (_req, res) => {
  try {
    const users = await knex("users as u")
      .leftJoin("people as p", "p.id", "u.person_id")
      .leftJoin("inventory_user_profiles as ip", "ip.user_id", "u.id")
      .select(
        "u.id",
        "u.username",
        "u.role",
        "u.status",
        "p.full_name as name",
        "p.email",
        "ip.sector_id",
        "ip.profile",
      )
      .orderBy("p.full_name");
    const sectors = await knex("inventory_sectors")
      .where({ active: true })
      .orderBy("name");
    res.json({ users, sectors });
  } catch {
    res
      .status(500)
      .json({ error: "Não foi possível carregar usuários e setores." });
  }
});

/**
 * @swagger
 * /api/permissoes/{userId}:
 *   get:
 *     summary: Lista as permissões atribuídas a um usuário
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Permissões cadastradas para o usuário informado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: integer
 *                 permissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserPermission'
 *       403:
 *         description: Usuário autenticado não possui permissão para gerenciar o usuário informado.
 *       404:
 *         description: Usuário alvo não encontrado.
 *   post:
 *     summary: Atualiza as permissões de um usuário
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/UserPermissionPayload'
 *     responses:
 *       200:
 *         description: Permissões atualizadas com sucesso.
 *       400:
 *         description: Dados inválidos informados na requisição.
 *       403:
 *         description: Usuário autenticado não possui permissão para salvar as permissões.
 *       404:
 *         description: Usuário alvo não encontrado.
 */
router
  .route("/:userId")
  .get(async (req, res) => {
    try {
      const userId = Number(req.params.userId);

      if (!Number.isInteger(userId) || userId <= 0) {
        throw new HttpError(400, "Identificador de usuário inválido.");
      }

      const [currentUser, targetUser] = await Promise.all([
        findUserById(req.user.id),
        findUserById(userId),
      ]);

      if (!currentUser) {
        throw new HttpError(403, "Usuário autenticado não encontrado.");
      }

      ensureCanManageUser(currentUser, targetUser);

      const permissions = await knex("user_permissions").where(
        "user_id",
        userId,
      );

      res.json({
        userId,
        permissions: permissions.map(mapPermissionRow),
      });
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      console.error("[Permissions] Erro ao listar permissões:", error);
      return res
        .status(500)
        .json({ error: "Erro ao listar permissões do usuário." });
    }
  })
  .post(async (req, res) => {
    const trx = await knex.transaction();

    try {
      const userId = Number(req.params.userId);

      if (!Number.isInteger(userId) || userId <= 0) {
        throw new HttpError(400, "Identificador de usuário inválido.");
      }

      const [currentUser, targetUser] = await Promise.all([
        findUserById(req.user.id),
        findUserById(userId),
      ]);

      if (!currentUser) {
        throw new HttpError(403, "Usuário autenticado não encontrado.");
      }

      ensureCanManageUser(currentUser, targetUser);

      const normalizedPermissions = validatePermissionsPayload(
        req.body?.permissions,
      );
      const previousPermissions = await trx("user_permissions").where(
        "user_id",
        userId,
      );
      const previousProfile = await trx("inventory_user_profiles")
        .where({ user_id: userId })
        .first();
      if (req.body.inventoryProfile !== undefined) {
        const profile = req.body.inventoryProfile;
        if (!["USER", "COORDINATOR", "MANAGER"].includes(profile?.profile))
          throw new HttpError(422, "Perfil de estoque inválido.");
        const sectorId =
          profile.sector_id == null || profile.sector_id === ""
            ? null
            : Number(profile.sector_id);
        if (
          sectorId !== null &&
          (!Number.isInteger(sectorId) ||
            !(await trx("inventory_sectors")
              .where({ id: sectorId, active: true })
              .first()))
        )
          throw new HttpError(422, "Setor inválido.");
        await trx("inventory_user_profiles")
          .insert({
            user_id: userId,
            sector_id: sectorId,
            profile: profile.profile,
          })
          .onConflict("user_id")
          .merge({
            sector_id: sectorId,
            profile: profile.profile,
            updated_at: trx.fn.now(),
          });
      }
      if (req.body.role !== undefined && req.body.role !== targetUser.role) {
        if (
          !["user", "admin"].includes(req.body.role) ||
          userId === currentUser.id ||
          targetUser.role === "masteradmin"
        )
          throw new HttpError(
            403,
            "Não é possível alterar este perfil administrativo.",
          );
        await trx("users")
          .where({ id: userId })
          .update({ role: req.body.role });
      }

      await trx("user_permissions").where("user_id", userId).del();

      if (normalizedPermissions.length > 0) {
        const rows = normalizedPermissions.map((permission) => ({
          user_id: userId,
          module_key: permission.module_key,
          can_view: permission.can_view,
          can_create: permission.can_create,
          can_edit: permission.can_edit,
          can_delete: permission.can_delete,
        }));

        await trx("user_permissions").insert(rows);
      }

      await trx("permission_audit").insert({
        user_id: userId,
        changed_by: currentUser.id,
        previous_permissions: JSON.stringify(
          previousPermissions.map(mapPermissionRow),
        ),
        new_permissions: JSON.stringify(normalizedPermissions),
        context: JSON.stringify({
          previousRole: targetUser.role,
          role: req.body.role || targetUser.role,
          previousProfile,
          inventoryProfile: req.body.inventoryProfile || previousProfile,
        }),
      });
      await trx.commit();

      const savedPermissions = await knex("user_permissions").where(
        "user_id",
        userId,
      );

      res.json({
        userId,
        permissions: savedPermissions.map(mapPermissionRow),
      });
    } catch (error) {
      await trx.rollback();

      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      console.error("[Permissions] Erro ao salvar permissões:", error);
      return res
        .status(500)
        .json({ error: "Erro ao salvar permissões do usuário." });
    }
  });

/**
 * @swagger
 * components:
 *   schemas:
 *     UserPermission:
 *       type: object
 *       properties:
 *         moduleKey:
 *           type: string
 *         canView:
 *           type: boolean
 *         canCreate:
 *           type: boolean
 *         canEdit:
 *           type: boolean
 *         canDelete:
 *           type: boolean
 *     UserPermissionPayload:
 *       type: object
 *       required:
 *         - moduleKey
 *       properties:
 *         moduleKey:
 *           type: string
 *         canView:
 *           type: boolean
 *           default: false
 *         canCreate:
 *           type: boolean
 *           default: false
 *         canEdit:
 *           type: boolean
 *           default: false
 *         canDelete:
 *           type: boolean
 *           default: false
 */

module.exports = router;
module.exports.knex = knex;
