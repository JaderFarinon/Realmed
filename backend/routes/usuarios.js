const express = require("express");
const bcrypt = require("bcryptjs");
const knexFactory = require("knex");
const knexConfig = require("../knexfile");
const authMiddleware = require("../middleware/auth");
const {
  permissionMiddleware,
  canManageRole,
  normalizeRoleValue,
} = require("../middleware/permission");
const knex = knexFactory(
  knexConfig[process.env.NODE_ENV || "development"] || knexConfig.development,
);
const faceRecognition = require('../services/physiotherapistFaceRecognition');
const router = express.Router();
const ROLES = ["admin", "user"];
const STATUSES = ["active", "inactive", "blocked"];
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const clean = (v) => (typeof v === "string" ? v.trim() : "");
const mapUser = (row) => ({
  id: row.id,
  personId: row.personId,
  nome: row.full_name,
  email: row.email,
  telefone: row.phone || null,
  documento: row.cpf,
  login: row.username,
  role: normalizeRoleValue(row.role) || row.role,
  status: row.status,
  stenciLinked: Boolean(row.stenci_user_id),
  authProvider: row.auth_provider || "STENCI",
  lastLogin: row.last_login,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  professionalId: row.professional_id || null,
  professionalName: row.professional_name || null,
  faceEnrolled: Boolean(row.face_enrolled),
});
const userQuery = () =>
  knex("users as u")
    .leftJoin("people as p", "p.id", "u.person_id")
    .select(
      "u.id",
      "u.username",
      "u.role",
      "u.status",
      "u.stenci_user_id",
      "u.auth_provider",
      "u.last_login",
      "u.person_id as personId",
      "u.created_at",
      "u.updated_at",
      "p.full_name",
      "p.email",
      "p.phone",
      "p.cpf",
    )
    .leftJoin('physiotherapist_user_links as pul', 'pul.user_id', 'u.id')
    .leftJoin('professionals as pr', 'pr.id', 'pul.professional_id')
    .leftJoin('physiotherapist_face_biometrics as fb', 'fb.user_id', 'u.id')
    .select('pul.professional_id', 'pr.full_name as professional_name', 'fb.user_id as face_enrolled');
router.use(authMiddleware);
router.use(permissionMiddleware(["masteradmin", "admin"]));
router.get("/", async (req, res) => {
  try {
    const q = userQuery().orderBy("p.full_name"),
      search = clean(req.query.search);
    if (search)
      q.where((b) =>
        b
          .where("p.full_name", "like", `%${search}%`)
          .orWhere("p.email", "like", `%${search}%`)
          .orWhere("u.username", "like", `%${search}%`),
      );
    if (ROLES.includes(req.query.role)) q.where("u.role", req.query.role);
    if (STATUSES.includes(req.query.status))
      q.where("u.status", req.query.status);
    res.json((await q).map(mapUser));
  } catch (e) {
    handle(e, res, "listar");
  }
});
router.get('/physiotherapist-options', async (_req, res) => {
  try {
    const items = await knex('professionals')
      .where({ active: 1, type: 'PHYSIOTHERAPIST' })
      .whereRaw('UPPER(council) = ?', ['CREFITO'])
      .orderBy('full_name')
      .select('id', 'full_name', 'council_number', 'state')
    res.json(items)
  } catch (error) {
    handle(error, res, 'listar fisioterapeutas')
  }
})
async function lockedUsers(trx, actorId, targetId) {
  const rows = await trx("users")
    .whereIn("id", [actorId, ...(targetId ? [targetId] : [])])
    .orderBy("id")
    .forUpdate();
  const actor = rows.find((r) => r.id === Number(actorId)),
    target = rows.find((r) => r.id === Number(targetId));
  if (
    !actor ||
    actor.status !== "active" ||
    !["admin", "masteradmin"].includes(actor.role)
  )
    throw new HttpError(403, "Usuário sem permissão a essa função");
  if (targetId && (!target || !canManageRole(actor.role, target.role)))
    throw new HttpError(
      target ? 403 : 404,
      target
        ? "Você não pode gerenciar este usuário."
        : "Usuário não encontrado.",
    );
  return { actor, target };
}
async function audit(trx, userId, actorId, action, before, after) {
  await trx("permission_audit").insert({
    user_id: userId,
    changed_by: actorId,
    previous_permissions: null,
    new_permissions: "[]",
    context: JSON.stringify({ action, before, after }),
  });
}
router.post("/", async (req, res) => {
  try {
    const data = validate(req.body, true);
    const passwordHash = data.senha ? await bcrypt.hash(data.senha, 12) : null;
    const id = await knex.transaction(async (trx) => {
      const { actor } = await lockedUsers(trx, req.user.id);
      ensureRole(actor.role, data.role);
      await ensureUnique(trx, data);
      const [personId] = await trx("people").insert({
        cpf: data.documento,
        full_name: data.nome,
        email: data.email,
        phone: data.telefone,
      });
      const [id] = await trx("users").insert({
        username: data.login,
        password: null,
        password_hash: passwordHash,
        auth_provider: data.authProvider,
        person_id: personId,
        role: data.role,
        status: data.status,
      });
      await audit(trx, id, actor.id, "USER_REGISTERED", null, {
        role: data.role,
        status: data.status,
        authentication: data.authProvider,
      });
      return id;
    });
    res.status(201).json(mapUser(await userQuery().where("u.id", id).first()));
  } catch (e) {
    handle(e, res, "criar");
  }
});
router.put('/:id/physiotherapist', async (req, res) => {
  try {
    const id = positiveId(req.params.id)
    const professionalId = req.body?.professionalId == null || req.body?.professionalId === '' ? null : positiveId(req.body.professionalId)
    await knex.transaction(async (trx) => {
      const { actor, target } = await lockedUsers(trx, req.user.id, id)
      if (target.role !== 'user') throw new HttpError(422, 'O modo fisioterapeuta aceita usuários com perfil User.')
      if (professionalId) {
        if (target.status !== 'active') throw new HttpError(422, 'Ative o usuário antes de associar o fisioterapeuta.')
        const professional = await trx('professionals').where({ id: professionalId, active: 1, type: 'PHYSIOTHERAPIST' }).whereRaw('UPPER(council) = ?', ['CREFITO']).first()
        if (!professional) throw new HttpError(422, 'Selecione um fisioterapeuta ativo com CREFITO.')
        const conflict = await trx('physiotherapist_user_links').where({ professional_id: professionalId }).whereNot({ user_id: id }).first()
        if (conflict) throw new HttpError(409, 'Este profissional já está associado a outro usuário.')
      }
      const existing = await trx('physiotherapist_user_links').where({ user_id: id }).forUpdate().first()
      if (professionalId == null) {
        await trx('physiotherapist_user_links').where({ user_id: id }).delete()
        await trx('physiotherapist_face_biometrics').where({ user_id: id }).delete()
      } else if (existing) {
        await trx('physiotherapist_user_links').where({ user_id: id }).update({ professional_id: professionalId, updated_by: actor.id, updated_at: trx.fn.now() })
      } else {
        await trx('physiotherapist_user_links').insert({ user_id: id, professional_id: professionalId, updated_by: actor.id, updated_at: trx.fn.now() })
      }
      await audit(trx, id, actor.id, 'PHYSIOTHERAPIST_LINK_UPDATED', existing?.professional_id || null, professionalId)
    })
    res.json(mapUser(await userQuery().where('u.id', id).first()))
  } catch (error) {
    handle(error, res, 'associar fisioterapeuta')
  }
})
router.post('/:id/face', async (req, res) => {
  try {
    const id = positiveId(req.params.id)
    const images = req.body?.images
    const user = await userQuery().where('u.id', id).first()
    if (!user) throw new HttpError(404, 'Usuário não encontrado.')
    if (user.status !== 'active' || user.role !== 'user' || !user.professional_id) throw new HttpError(422, 'Associe primeiro um fisioterapeuta ativo a um usuário com perfil User.')
    const templates = await faceRecognition.enrollmentTemplates(images)
    let encrypted
    try {
      encrypted = faceRecognition.encryptTemplates(id, templates)
    } finally {
      templates.forEach((template) => template.fill(0))
    }
    await knex.transaction(async (trx) => {
      const { actor,target } = await lockedUsers(trx, req.user.id, id)
      const current=await trx('physiotherapist_user_links as l').join('professionals as p','p.id','l.professional_id').where({'l.user_id':id,'p.active':1,'p.type':'PHYSIOTHERAPIST'}).whereRaw('UPPER(p.council) = ?', ['CREFITO']).first('p.id')
      if(target.status!=='active'||target.role!=='user'||current?.id!==user.professional_id)throw new HttpError(409,'O vínculo do usuário mudou. Confira o cadastro antes de cadastrar o rosto novamente.')
      const existing = await trx('physiotherapist_face_biometrics').where({ user_id: id }).forUpdate().first()
      const values = { ...encrypted, algorithm_version: 'human-faceres-3.3.6', enrolled_by: actor.id, updated_at: trx.fn.now() }
      if (existing) await trx('physiotherapist_face_biometrics').where({ user_id: id }).update(values)
      else await trx('physiotherapist_face_biometrics').insert({ user_id: id, ...values, created_at: trx.fn.now() })
      await audit(trx, id, actor.id, 'USER_FACE_ENROLLED', existing ? 'ENROLLED' : 'NOT_ENROLLED', 'ENROLLED')
    })
    res.status(201).json({ faceEnrolled: true })
  } catch (error) {
    if (error.code === 'BIOMETRY_KEY_REQUIRED') return res.status(503).json({ error: error.message, code: error.code })
    handle(error, res, 'cadastrar biometria facial')
  }
})
router.delete('/:id/face', async (req, res) => {
  try {
    const id = positiveId(req.params.id)
    await knex.transaction(async (trx) => {
      const { actor } = await lockedUsers(trx, req.user.id, id)
      const existing = await trx('physiotherapist_face_biometrics').where({ user_id: id }).forUpdate().first()
      if (existing) {
        await trx('physiotherapist_face_biometrics').where({ user_id: id }).delete()
        await audit(trx, id, actor.id, 'USER_FACE_REMOVED', 'ENROLLED', 'REMOVED')
      }
    })
    res.status(204).end()
  } catch (error) {
    handle(error, res, 'remover biometria facial')
  }
})
router.put("/:id", async (req, res) => {
  try {
    const id = positiveId(req.params.id),
      data = validate(req.body, false);
    const passwordHash = data.senha ? await bcrypt.hash(data.senha, 12) : null;
    await knex.transaction(async (trx) => {
      const { actor, target } = await lockedUsers(trx, req.user.id, id);
      ensureRole(actor.role, data.role);
      if (data.authProvider !== (target.auth_provider || "STENCI"))
        throw new HttpError(422, "O tipo de autenticação da conta não pode ser alterado depois do cadastro.");
      if (
        id === actor.id &&
        (data.role !== target.role || data.status !== "active")
      )
        throw new HttpError(
          403,
          "Não é possível alterar o próprio perfil administrativo ou bloquear o próprio acesso.",
        );
      const person = await trx("people")
        .where({ id: target.person_id })
        .forUpdate()
        .first();
      if (
        target.stenci_user_id &&
        (data.login !== target.username ||
          (data.documento || null) !== (person.cpf || null))
      )
        throw new HttpError(
          422,
          "CPF e login vinculados ao Stenci devem ser alterados no Stenci.",
        );
      await ensureUnique(trx, data, id, target.person_id);
      await trx("people").where({ id: target.person_id }).update({
        cpf: data.documento,
        full_name: data.nome,
        email: data.email,
        phone: data.telefone,
        updated_at: trx.fn.now(),
      });
      await trx("users").where({ id }).update({
        username: data.login,
        role: data.role,
        status: data.status,
        ...(passwordHash ? { password_hash: passwordHash } : {}),
        updated_at: trx.fn.now(),
      });
      if (data.status !== 'active') await trx('physiotherapist_face_biometrics').where({ user_id: id }).delete()
      await audit(
        trx,
        id,
        actor.id,
        "USER_UPDATED",
        { role: target.role, status: target.status },
        { role: data.role, status: data.status },
      );
    });
    res.json(mapUser(await userQuery().where("u.id", id).first()));
  } catch (e) {
    handle(e, res, "atualizar");
  }
});
// Keep users and their audit/clinical relationships. DELETE is retained for API compatibility and blocks access.
router.delete("/:id", async (req, res) => {
  try {
    const id = positiveId(req.params.id);
    if (id === Number(req.user.id))
      throw new HttpError(400, "Não é possível bloquear o próprio usuário.");
    await knex.transaction(async (trx) => {
      const { actor, target } = await lockedUsers(trx, req.user.id, id);
      if (target.status === "blocked") return;
      await trx("users")
        .where({ id })
        .update({ status: "blocked", updated_at: trx.fn.now() });
      await trx('physiotherapist_face_biometrics').where({ user_id: id }).delete()
      await audit(
        trx,
        id,
        actor.id,
        "USER_BLOCKED",
        { status: target.status },
        { status: "blocked" },
      );
    });
    res.status(204).end();
  } catch (e) {
    handle(e, res, "bloquear");
  }
});
function positiveId(v) {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 1)
    throw new HttpError(400, "Identificador inválido.");
  return n;
}
function validate(body, creating = false) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new HttpError(400, "Dados de usuário inválidos.");
  const authProvider = clean(body.authProvider || "STENCI").toUpperCase();
  if (!["STENCI", "LOCAL"].includes(authProvider))
    throw new HttpError(400, "Tipo de autenticação inválido.");
  const senha = typeof body.senha === "string" ? body.senha : "";
  const confirmarSenha = typeof body.confirmarSenha === "string" ? body.confirmarSenha : "";
  if (authProvider === "STENCI" && (senha || confirmarSenha))
    throw new HttpError(400, "Contas Stenci usam a senha cadastrada no Stenci.");
  if (authProvider === "LOCAL" && (senha || confirmarSenha)) {
    if (senha.length < 12 || Buffer.byteLength(senha, "utf8") > 72)
      throw new HttpError(400, "A senha local deve ter de 12 a 72 bytes.");
    if (senha !== confirmarSenha)
      throw new HttpError(400, "A confirmação da senha não confere.");
  } else if (authProvider === "LOCAL" && creating && !senha) {
    throw new HttpError(400, "Defina uma senha com pelo menos 12 caracteres para a conta local.");
  }
  let login = clean(body.login),
    documento = clean(body.documento);
  const digits = login.replace(/\D/g, "");
  if (/^[\d.\-\s]+$/.test(login) && digits.length === 11) login = digits;
  if (documento && !/^[\d.\-\s]+$/.test(documento))
    throw new HttpError(400, "CPF inválido.");
  documento =
    documento.replace(/\D/g, "") || (/^\d{11}$/.test(login) ? login : null);
  const data = {
    nome: clean(body.nome),
    email: clean(body.email).toLowerCase() || null,
    telefone: clean(body.telefone) || null,
    documento,
    login,
    authProvider,
    senha,
    role: normalizeRoleValue(body.role) || "user",
    status: clean(body.status) || "active",
  };
  if (!data.nome || !data.login)
    throw new HttpError(400, "Nome e login são obrigatórios.");
  if (
    data.nome.length > 150 ||
    data.login.length > 100 ||
    (data.email?.length || 0) > 150 ||
    (data.telefone?.length || 0) > 20 ||
    (documento && documento.length !== 11)
  )
    throw new HttpError(
      400,
      "Confira os tamanhos dos campos e o CPF (11 dígitos).",
    );
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    throw new HttpError(400, "E-mail inválido.");
  if (!ROLES.includes(data.role) || !STATUSES.includes(data.status))
    throw new HttpError(400, "Perfil ou status inválido.");
  return data;
}
function ensureRole(current, target) {
  if (!canManageRole(current, target))
    throw new HttpError(403, "Você não pode atribuir este perfil.");
}
async function ensureUnique(trx, data, userId, personId) {
  const q = trx("users").where({ username: data.login });
  if (userId) q.whereNot({ id: userId });
  if (await q.first()) throw new HttpError(409, "Login já cadastrado.");
  if (data.email || data.documento) {
    const p = trx("people").where((b) => {
      if (data.email) b.orWhere({ email: data.email });
      if (data.documento) b.orWhere({ cpf: data.documento });
    });
    if (personId) p.whereNot({ id: personId });
    if (await p.first())
      throw new HttpError(409, "E-mail ou CPF já cadastrado.");
  }
}
function handle(e, res, action) {
  if (e instanceof HttpError)
    return res.status(e.status).json({ error: e.message });
  if (e.code === "ER_DUP_ENTRY")
    return res
      .status(409)
      .json({ error: "Login, e-mail ou CPF já cadastrado." });
  console.error("[Usuários]", action, e.code || e.name);
  return res.status(500).json({ error: `Erro ao ${action} usuário.` });
}
module.exports = router;
module.exports.knex = knex;
