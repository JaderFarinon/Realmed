const {
  normalize,
  matrixSchedules,
} = require("../../backend/services/physiotherapyRotation");
function rotationOptions(input = {}) {
  if (input.kind === "options") return { kind: "options" };
  if (input.kind !== "availability")
    throw Object.assign(new Error("Consulta de rodízio inválida."), {
      status: 422,
    });
  const request = normalize(input.request);
  const scheduleIds = Array.isArray(input.scheduleIds)
    ? [...new Set(input.scheduleIds)]
    : [];
  if (
    !scheduleIds.length ||
    scheduleIds.length > 40 ||
    scheduleIds.some((id) => !/^[a-f0-9]{24,32}$/i.test(id))
  )
    throw Object.assign(new Error("Selecione até 40 agendas válidas."), {
      status: 422,
    });
  return { kind: "availability", request, scheduleIds };
}
async function rotationRead(client, input) {
  const options = rotationOptions(input);
  client.assertAuthenticated();
  const listed = await client.request("/v1/schedules", {
    base: "apiX",
    query: { limit: 0, active: true, type: "elective" },
  });
  if (!Array.isArray(listed?.items) || listed.hasMore)
    throw Object.assign(new Error("Lista de agendas incompleta."), {
      status: 502,
    });
  const schedules = matrixSchedules(listed.items).map((s) => ({
    id: s.id,
    name: s.name,
    place: { id: s.place.id, name: s.place.name },
  }));
  if (options.kind === "options") {
    const professionals = [];
    let offset = 0;
    while (true) {
      const data = await client.request("/v1/professionals", {
        query: { limit: 100, offset, active: true },
      });
      if (!Array.isArray(data?.items))
        throw Object.assign(new Error("Lista de profissionais inválida."), {
          status: 502,
        });
      professionals.push(
        ...data.items
          .map((x) => require("./StenciMapper").professional(x))
          .filter(
            (p) =>
              p?.active &&
              p.councils.some(
                (c) =>
                  c.name?.toUpperCase() === "CREFITO" && c.record && c.state,
              ),
          ),
      );
      if (!data.hasMore) break;
      offset += 100;
      if (offset >= 1000 || !data.items.length)
        throw Object.assign(new Error("Lista de profissionais incompleta."), {
          status: 502,
        });
    }
    return { schedules, professionals };
  }
  const allowed = new Set(schedules.map((s) => s.id));
  if (options.scheduleIds.some((id) => !allowed.has(id)))
    throw Object.assign(
      new Error("Agenda fora da Realmed Matriz, de avaliação ou inativa."),
      { status: 422 },
    );
  const tasks = options.scheduleIds.flatMap((scheduleId) =>
    options.request.sessions.map((s) => ({ scheduleId, date: s.date })),
  );
  if (tasks.length > 1200)
    throw Object.assign(
      new Error(
        "A consulta excede 1.200 agendas/datas. Reduza o número de agendas participantes.",
      ),
      { status: 422 },
    );
  const snapshots = {};
  for (let i = 0; i < tasks.length; i += 4) {
    const batch = await Promise.allSettled(
      tasks.slice(i, i + 4).map(async (task) => {
        const data = await client.request("/v1/calendar", {
          base: "apiX",
          query: { type: "elective", ...task },
        });
        if (!Array.isArray(data?.items) || data.hasMore)
          throw Object.assign(
            new Error("Agenda incompleta; nenhuma indicação foi confirmada."),
            { status: 502 },
          );
        snapshots[`${task.scheduleId}:${task.date}`] = data.items.map((x) => ({
          startDate: x.startDate,
          status:
            x.status === "available" && !x.patient?.id
              ? "available"
              : "occupied",
        }));
      }),
    );
    const failed = batch.find((x) => x.status === "rejected");
    if (failed) throw failed.reason;
  }
  return { snapshots, fetchedAt: new Date().toISOString() };
}
module.exports = { rotationOptions, rotationRead };
