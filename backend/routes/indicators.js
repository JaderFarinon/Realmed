const express = require("express");
const { randomUUID } = require("node:crypto");
const auth = require("../middleware/auth");
const {
  modulePermission,
  modulePermissionAny,
} = require("../middleware/permission");
const {
  areas,
  definitions,
  filters,
  loadDashboard,
  parseJson,
} = require("../services/indicators");
const error = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const text = (value, max, required = false) => {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw error("Preencha os textos da análise dentro do limite informado.");
  return value.trim();
};
const id = (value) => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw error("Apresentação inválida.");
  return n;
};
const uuid = (value) =>
  typeof value === "string" &&
  /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
async function presentationInput(trx, body) {
  const title = text(body.title, 180, true);
  if (!Array.isArray(body.slides) || body.slides.length > 30)
    throw error("Use até 30 telas por apresentação.");
  const slides = [];
  for (const s of body.slides) {
    if (
      !s ||
      !definitions.some((d) => d.key === s.indicatorKey) ||
      !uuid(s.beforeId) ||
      !uuid(s.nowId)
    )
      throw error("Capture os resultados de Antes e Agora para cada tela.");
    const rows = await trx("indicator_snapshots").whereIn("id", [
      s.beforeId,
      s.nowId,
    ]);
    if (
      !rows.some(
        (r) => r.id === s.beforeId && r.indicator_key === s.indicatorKey,
      ) ||
      !rows.some((r) => r.id === s.nowId && r.indicator_key === s.indicatorKey)
    )
      throw error("Os resultados não correspondem ao indicador escolhido.");
    const slide = {
      indicatorKey: s.indicatorKey,
      beforeId: s.beforeId,
      nowId: s.nowId,
    };
    for (const key of ["origin", "explanation", "direction", "actions"])
      slide[key] = text(s[key] ?? "", 3000);
    slide.title = text(s.title, 180, true);
    slide.target = text(s.target ?? "", 500);
    slide.responsible = text(s.responsible ?? "", 180);
    slide.dueDate = text(s.dueDate ?? "", 10);
    if (slide.dueDate) {
      try {
        require("../services/billingDashboard").period({
          start: slide.dueDate,
          end: slide.dueDate,
        });
      } catch {
        throw error("Prazo inválido.");
      }
    }
    slides.push(slide);
  }
  return { title, slides };
}
async function expanded(trx, row) {
  const slides = parseJson(row.slides) || [];
  const keys = [...new Set(slides.flatMap((s) => [s.beforeId, s.nowId]))];
  const snapshots = keys.length
    ? await trx("indicator_snapshots").whereIn("id", keys)
    : [];
  const payloads = new Map(snapshots.map((s) => [s.id, parseJson(s.payload)]));
  return {
    ...row,
    slides: slides.map((s) => ({
      ...s,
      before: payloads.get(s.beforeId),
      now: payloads.get(s.nowId),
    })),
  };
}
function createIndicatorsRouter(
  db,
  {
    branchId = () =>
      require("../../integrations/stenci/config").getStenciConfig().branchId,
    dashboard = loadDashboard,
  } = {},
) {
  const router = express.Router();
  router.use(auth);
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  const read = modulePermissionAny([
    ["indicator_panels", "view"],
    ["indicator_analysis", "view"],
  ]);
  const writeSnapshot = modulePermissionAny([
    ["indicator_analysis", "create"],
    ["indicator_analysis", "edit"],
  ]);
  const handler = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      res
        .status(e.status || 500)
        .json({
          error: e.status
            ? e.message
            : "Não foi possível concluir a operação de indicadores.",
        });
    }
  };
  router.get("/catalog", read, (_req, res) => res.json({ areas, definitions }));
  router.get(
    "/dashboard",
    read,
    handler(async (req, res) =>
      res.json(await dashboard(db, branchId(), req.query)),
    ),
  );
  router.post(
    "/snapshots",
    writeSnapshot,
    handler(async (req, res) => {
      const def = definitions.find((d) => d.key === req.body.indicatorKey);
      if (!def) throw error("Indicador inválido.");
      const result = await dashboard(
        db,
        branchId(),
        filters({ ...req.body.filters, area: def.area }),
      );
      const metric = result.metrics.find((m) => m.key === def.key);
      const key = randomUUID();
      await db("indicator_snapshots").insert({
        id: key,
        indicator_key: def.key,
        payload: JSON.stringify(metric),
        created_by: req.user.id,
      });
      res.status(201).json({ id: key, metric });
    }),
  );
  router.get(
    "/presentations",
    modulePermission("indicator_analysis", "view"),
    handler(async (req, res) => {
      const page = Number(req.query.page || 1),
        size = Number(req.query.pageSize || 10),
        search = req.query.search || "";
      if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(size) ||
        size < 1 ||
        size > 100 ||
        typeof search !== "string" ||
        search.length > 180
      )
        throw error("Filtros inválidos.");
      const base = () => {
        const q = db("indicator_presentations").whereNull("deleted_at");
        if (search.trim())
          q.where(
            "title",
            "like",
            "%" + search.trim().replace(/[\\%_]/g, "\\$&") + "%",
          );
        return q;
      };
      const { total } = await base().count({ total: "id" }).first();
      const items = await base()
        .select(
          "id",
          "title",
          "revision",
          "created_at",
          "updated_at",
          db.raw("JSON_LENGTH(slides) as slide_count"),
        )
        .orderBy("updated_at", "desc")
        .orderBy("id", "desc")
        .limit(size)
        .offset((page - 1) * size);
      res.json({ items, total: Number(total) });
    }),
  );
  router.get(
    "/presentations/:id",
    modulePermission("indicator_analysis", "view"),
    handler(async (req, res) => {
      const result = await db.transaction(async (trx) => {
        const row = await trx("indicator_presentations")
          .where({ id: id(req.params.id) })
          .whereNull("deleted_at")
          .first();
        if (!row) throw error("Apresentação não encontrada.", 404);
        return expanded(trx, row);
      });
      res.json(result);
    }),
  );
  router.post(
    "/presentations",
    modulePermission("indicator_analysis", "create"),
    handler(async (req, res) => {
      const result = await db.transaction(async (trx) => {
        const data = await presentationInput(trx, req.body);
        const [key] = await trx("indicator_presentations").insert({
          title: data.title,
          slides: JSON.stringify(data.slides),
          created_by: req.user.id,
          updated_by: req.user.id,
        });
        await trx("indicator_presentation_audit").insert({
          presentation_id: key,
          actor_id: req.user.id,
          action: "CREATE",
          revision: 1,
        });
        return expanded(
          trx,
          await trx("indicator_presentations").where({ id: key }).first(),
        );
      });
      res.status(201).json(result);
    }),
  );
  router.put(
    "/presentations/:id",
    modulePermission("indicator_analysis", "edit"),
    handler(async (req, res) => {
      const result = await db.transaction(async (trx) => {
        const key = id(req.params.id),
          row = await trx("indicator_presentations")
            .where({ id: key })
            .whereNull("deleted_at")
            .forUpdate()
            .first();
        if (!row) throw error("Apresentação não encontrada.", 404);
        if (
          !Number.isSafeInteger(req.body.revision) ||
          row.revision !== req.body.revision
        )
          throw error(
            "Outra pessoa alterou esta apresentação. Reabra a versão salva antes de editar; seu rascunho continua na tela.",
            409,
          );
        const data = await presentationInput(trx, req.body),
          revision = row.revision + 1;
        await trx("indicator_presentations")
          .where({ id: key })
          .update({
            title: data.title,
            slides: JSON.stringify(data.slides),
            revision,
            updated_by: req.user.id,
            updated_at: trx.fn.now(),
          });
        await trx("indicator_presentation_audit").insert({
          presentation_id: key,
          actor_id: req.user.id,
          action: "UPDATE",
          revision,
        });
        return expanded(
          trx,
          await trx("indicator_presentations").where({ id: key }).first(),
        );
      });
      res.json(result);
    }),
  );
  router.delete(
    "/presentations/:id",
    modulePermission("indicator_analysis", "delete"),
    handler(async (req, res) => {
      await db.transaction(async (trx) => {
        const key = id(req.params.id),
          row = await trx("indicator_presentations")
            .where({ id: key })
            .whereNull("deleted_at")
            .forUpdate()
            .first();
        if (!row) throw error("Apresentação não encontrada.", 404);
        if (req.body.revision !== row.revision)
          throw error(
            "A apresentação foi alterada. Atualize a lista antes de excluir.",
            409,
          );
        await trx("indicator_presentations")
          .where({ id: key })
          .update({
            deleted_at: trx.fn.now(),
            updated_by: req.user.id,
            revision: row.revision + 1,
          });
        await trx("indicator_presentation_audit").insert({
          presentation_id: key,
          actor_id: req.user.id,
          action: "DELETE",
          revision: row.revision + 1,
        });
      });
      res.json({ deleted: true });
    }),
  );
  return router;
}
module.exports = { createIndicatorsRouter, presentationInput };
