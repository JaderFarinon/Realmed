const express = require("express"),
  crypto = require("node:crypto");
const auth = require("../middleware/auth");
const {
  modulePermission,
  permissionMiddleware,
} = require("../middleware/permission");
const {
  getAuthenticatedStenciService,
} = require("../services/authenticatedStenciService");
const { knex, history, id } = require("./guide-center");
const { normalize, rank } = require("../services/physiotherapyRotation");
const {
  syncProfessional,
} = require("../../integrations/stenci/StenciTreatmentSyncService");
const stages = require("../services/treatmentStages");
const confirmation = require('../services/physiotherapyRotationConfirmation');
function createRouter({
  db = knex,
  onError = () => {},
  serviceFactory = (req) => getAuthenticatedStenciService(req).service,
} = {}) {
  const router = express.Router();
  router.use(auth);
  const run = (handler) => async (req, res) => {
    try {
      res.set("Cache-Control", "no-store");
      await handler(req, res);
    } catch (e) {
      onError(e);
      if (
        ["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT", "ER_DUP_ENTRY"].includes(
          e.code,
        )
      )
        e = Object.assign(
          new Error(
            "O rodízio mudou durante a confirmação. Consulte novamente.",
          ),
          { status: 409, code: "ROTATION_CONFLICT" },
        );
      const status =
        e.code === "STENCI_REFRESH_REQUIRED" ? 428 : e.status || 502;
      res.status(status).json({
        error: e.status
          ? e.message
          : "Não foi possível consultar todas as vagas no Stenci. Tente novamente.",
        code: e.code,
        ...(e.code === "STENCI_REFRESH_REQUIRED"
          ? { stenciOperation: { name: "rotationRead", kind: "options" } }
          : {}),
      });
    }
  };
  async function editable(db, processId, lock = false) {
    let q = db("guide_processes").where({ id: processId });
    if (lock) q = q.forUpdate();
    const p = await q.first();
    if (!p)
      throw Object.assign(new Error("Tratamento não encontrado."), {
        status: 404,
      });
    stages.assertOpen(p, "central");
    await stages.assertStageUnlocked(db,p,'evaluation');
    require("../services/guideContinuity").assertOriginalEvaluation(p);
    const ev = await db("physiotherapy_evaluations")
      .where({ guide_process_id: processId })
      .first();
    if (ev?.status === "COMPLETED")
      throw Object.assign(
        new Error("Reabra a avaliação antes de alterar a indicação."),
        { status: 409 },
      );
    return p;
  }
  const configs = (connection = db) =>
    connection("physiotherapy_rotation_agendas as a")
      .join("professionals as p", "p.id", "a.professional_id")
      .where("p.active", 1)
      .whereRaw("UPPER(p.council) = ?", ["CREFITO"])
      .select("a.*", "p.full_name as professional_name", "p.external_id");
  router.get(
    "/physiotherapy-rotation/options",
    modulePermission("guide_processes", "edit"),
    run(async (req, res) => {
      const source = await serviceFactory(req).rotationRead({
        kind: "options",
      });
      res.json({ ...source, mappings: await configs() });
    }),
  );
  router.put(
    "/physiotherapy-rotation/agendas",
    permissionMiddleware(["admin", "masteradmin"]),
    modulePermission("guide_processes", "edit"),
    run(async (req, res) => {
      const source = await serviceFactory(req).rotationRead({
        kind: "options",
      });
      if (!Array.isArray(req.body.mappings) || req.body.mappings.length > 40)
        throw Object.assign(
          new Error("Informe até 40 agendas participantes."),
          { status: 422 },
        );
      const values = req.body.mappings;
      const seen = new Set();
      for (const v of values)
        if (
          seen.has(v.schedule_id) ||
          !source.schedules.some((s) => s.id === v.schedule_id) ||
          !source.professionals.some((p) => p.externalId === v.external_id)
        ) {
          throw Object.assign(
            new Error("Vínculo de agenda/profissional inválido."),
            { status: 422 },
          );
        } else seen.add(v.schedule_id);
      await db.transaction(async (trx) => {
        await trx("physiotherapy_rotation_state")
          .where({ id: 1 })
          .forUpdate()
          .first();
        await trx("physiotherapy_rotation_agendas").delete();
        for (const v of values) {
          const s = source.schedules.find((s) => s.id === v.schedule_id),
            p = source.professionals.find(
              (p) => p.externalId === v.external_id,
            );
          const professional_id = await syncProfessional(trx, p, "CREFITO");
          await trx("physiotherapy_rotation_agendas").insert({
            schedule_id: s.id,
            schedule_name: s.name,
            place_id: s.place.id,
            professional_id,
            updated_by: req.user.id,
            updated_at: trx.fn.now(),
          });
        }
      });
      res.json({ mappings: await configs() });
    }),
  );
  router.post(
    "/guide-processes/:id/rotation/suggest",
    modulePermission("guide_processes", "edit"),
    run(async (req, res) => {
      const processId = id(req.params.id);
      await editable(db, processId);
      const request = normalize(req.body),
        agendas = await configs();
      if (!agendas.length)
        throw Object.assign(
          new Error(
            "Um administrador precisa vincular as agendas de fisioterapia da Realmed Matriz em Agendas participantes.",
          ),
          { status: 422 },
        );
      const service = serviceFactory(req);
      const result = await service.rotationRead({
        kind: "availability",
        request,
        scheduleIds: agendas.map((a) => a.schedule_id),
      });
      const assignments = await db("physiotherapy_rotation_assignments")
        .whereNot("guide_process_id", processId)
        .select("professional_id", "sequence");
      const candidates = rank(request, agendas, result.snapshots, assignments);
      const token = crypto.randomUUID();
      await db.transaction(async trx=>{
        await editable(trx,processId,true);
        await history(trx,processId,req.user.id,'PHYSIOTHERAPY_ROTATION_SUGGESTED',null,null,
          candidates[0]?.professional_name || 'Nenhum fisioterapeuta disponível',
          {previewToken:candidates.length?token:null,request,agendas,candidate:candidates[0] || null,fetchedAt:result.fetchedAt});
      });
      res.json({
        token: candidates.length ? token : null,
        candidates,
        fetchedAt: result.fetchedAt,
        message: candidates.length
          ? "Indicação calculada para todas as sessões. Confirme para registrar no rodízio."
          : "Nenhum fisioterapeuta tem vagas em todas as sessões nos dias solicitados, dentro de 25 minutos do horário desejado.",
      });
    }),
  );
  router.post(
    "/guide-processes/:id/rotation/confirm",
    modulePermission("guide_processes", "edit"),
    run(async (req, res) => {
      confirmation.assertScheduled(req.body.stenci_scheduled_confirmed);
      const processId = id(req.params.id),
        token = String(req.body.token || "");
      const previous = await db("physiotherapy_rotation_assignments")
        .where({ guide_process_id: processId, request_token: token })
        .first();
      if (previous) {
        previous.sessions =
          typeof previous.sessions === "string"
            ? JSON.parse(previous.sessions)
            : previous.sessions;
        const professional = await db("professionals")
          .where({ id: previous.professional_id })
          .first();
        return res.json({
          assignment: {
            ...previous,
            professional_name: professional?.full_name,
          },
        });
      }
      const latestSuggestion=connection=>connection('guide_process_history').where({guide_process_id:processId,action:'PHYSIOTHERAPY_ROTATION_SUGGESTED'}).orderBy('id','desc').first();
      const preview = confirmation.previewFromHistory(await latestSuggestion(db),token,req.user.id);
      await editable(db, processId);
      const current = await configs();
      if (
        JSON.stringify(
          current.map((a) => [a.schedule_id, a.professional_id]).sort(),
        ) !==
        JSON.stringify(
          preview.agendas.map((a) => [a.schedule_id, a.professional_id]).sort(),
        )
      )
        throw Object.assign(
          new Error("As agendas participantes mudaram. Consulte novamente."),
          { status: 409 },
        );
      const assignment = await db.transaction(async (trx) => {
        await editable(trx, processId, true);
        const latest=confirmation.previewFromHistory(await latestSuggestion(trx),token,req.user.id);
        if(latest.historyId!==preview.historyId) throw Object.assign(new Error('A indicação mudou. Confira o histórico antes de confirmar.'),{status:409});
        const state = await trx("physiotherapy_rotation_state")
          .where({ id: 1 })
          .forUpdate()
          .first();
        const lockedConfig = await configs(trx).forUpdate();
        if (
          JSON.stringify(
            lockedConfig.map((a) => [a.schedule_id, a.professional_id]).sort(),
          ) !==
          JSON.stringify(
            current.map((a) => [a.schedule_id, a.professional_id]).sort(),
          )
        )
          throw Object.assign(
            new Error("As agendas participantes mudaram. Consulte novamente."),
            { status: 409 },
          );
        const existing = await trx("physiotherapy_rotation_assignments")
          .where({ guide_process_id: processId })
          .forUpdate()
          .first();
        if (existing?.request_token === token) return {...existing,professional_name:preview.candidate.professional_name,schedule_name:preview.candidate.schedule_name};
        // After manual booking the chosen slots need not remain available.
        // Confirm the audited suggestion, never rerank or silently choose another person.
        const best = preview.candidate;
        const sequence = Number(state.sequence) + 1;
        const value = {
          guide_process_id: processId,
          professional_id: best.professional_id,
          schedule_id: best.schedule_id,
          sequence,
          request_token: token,
          request: JSON.stringify(preview.request),
          sessions: JSON.stringify(best.sessions),
          created_by: req.user.id,
          created_at: trx.fn.now(),
        };
        if (existing)
          await trx("physiotherapy_rotation_assignments")
            .where({ id: existing.id })
            .update(value);
        else await trx("physiotherapy_rotation_assignments").insert(value);
        await trx("physiotherapy_rotation_state")
          .where({ id: 1 })
          .update({ sequence });
        await trx("guide_processes").where({ id: processId }).update({
          physiotherapist_id: best.professional_id,
          updated_at: trx.fn.now(),
        });
        await history(
          trx,
          processId,
          req.user.id,
          "PHYSIOTHERAPY_ROTATION_CONFIRMED",
          null,
          null,
          "Indicação confirmada; usuário declarou que agendou o paciente no Stenci.",
          {
            professionalId: best.professional_id,
            professionalName: best.professional_name,
            scheduleName: best.schedule_name,
            suggestionHistoryId: preview.historyId,
            stenciScheduledConfirmed: true,
            scheduleId: best.schedule_id,
            sequence,
            sessions: best.sessions,
          },
        );
        return {
          ...value,
          created_at: new Date().toISOString(),
          professional_name: best.professional_name,
          schedule_name: best.schedule_name,
          sessions: best.sessions,
        };
      });
      if (typeof assignment.sessions === "string")
        assignment.sessions = JSON.parse(assignment.sessions);
      res.json({ assignment });
    }),
  );
  router.get(
    '/guide-processes/:id/rotation/history',
    modulePermission('guide_processes'),
    run(async(req,res)=>{
      const processId=id(req.params.id);
      if(!await db('guide_processes').where({id:processId}).first()) return res.status(404).json({error:'Tratamento não encontrado.'});
      const rows=await db('guide_process_history as h')
        .leftJoin('users as u','u.id','h.user_id').leftJoin('people as p','p.id','u.person_id')
        .where('h.guide_process_id',processId)
        .whereIn('h.action',['PHYSIOTHERAPY_ROTATION_SUGGESTED','PHYSIOTHERAPY_ROTATION_CONFIRMED'])
        .select('h.*','p.full_name as user_name').orderBy('h.id','desc');
      const professionalIds=rows.map(row=>{const data=typeof row.metadata==='string'?JSON.parse(row.metadata):row.metadata;return data?.professionalId}).filter(Boolean);
      const professionals=professionalIds.length?await db('professionals').whereIn('id',professionalIds).select('id','full_name'):[];
      res.json(rows.map(row=>{
        const data=typeof row.metadata==='string'?JSON.parse(row.metadata):row.metadata;
        return confirmation.historyItem({...row,professional_name:professionals.find(p=>Number(p.id)===Number(data?.professionalId))?.full_name});
      }));
    }),
  );
  router.get(
    "/guide-processes/:id/rotation",
    modulePermission("guide_processes"),
    run(async (req, res) => {
      if (
        !(await db("guide_processes")
          .where({ id: id(req.params.id) })
          .first())
      )
        return res.status(404).json({ error: "Tratamento não encontrado." });
      const value = await db("physiotherapy_rotation_assignments as a")
        .join("professionals as p", "p.id", "a.professional_id")
        .where("a.guide_process_id", id(req.params.id))
        .select("a.*", "p.full_name as professional_name")
        .first();
      if (value) {
        for (const key of ["sessions", "request"])
          if (typeof value[key] === "string")
            value[key] = JSON.parse(value[key]);
      }
      res.json(value || null);
    }),
  );
  return router;
}
module.exports = { createRouter };
