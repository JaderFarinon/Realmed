const DAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];
const fail = (message) => {
  throw Object.assign(new Error(message), { status: 422 });
};
const plain = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const calendarDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const time = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
function normalize(input = {}) {
  const startDate = String(input.startDate || ""),
    total = Number(input.total);
  if (
    typeof input.total === "boolean" ||
    (Array.isArray(input.days) &&
      input.days.some((d) => !d || typeof d !== "object"))
  )
    fail("Informe sessões e dias válidos.");
  if (
    !calendarDate(startDate) ||
    !Number.isInteger(total) ||
    total < 1 ||
    total > 60
  )
    fail(
      "Informe início e total de 1 a 60 sessões para consultar todas as vagas.",
    );
  const days = (Array.isArray(input.days) ? input.days : [])
    .filter((d) => d.enabled !== false)
    .map((d) => ({ day: d.day, time: String(d.time || "") }));
  if (
    !days.length ||
    days.length > 5 ||
    new Set(days.map((d) => d.day)).size !== days.length ||
    days.some(
      (d) =>
        !DAYS.slice(1, 6).includes(d.day) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time),
    )
  )
    fail("Selecione os dias e informe o horário desejado em cada dia.");
  const sessions = [];
  const date = new Date(startDate + "T12:00:00Z");
  for (let offset = 0; sessions.length < total && offset < 420; offset++) {
    const day = DAYS[date.getUTCDay()],
      wanted = days.find((d) => d.day === day);
    if (wanted)
      sessions.push({
        date: date.toISOString().slice(0, 10),
        day,
        time: wanted.time,
      });
    date.setUTCDate(date.getUTCDate() + 1);
  }
  if (sessions.length !== total) fail("O período solicitado é muito extenso.");
  return { startDate, total, days, sessions };
}
function matrixSchedules(items) {
  return items.filter(
    (s) =>
      plain(s.place?.name) === "realmed matriz" &&
      !/avalia/.test(plain(s.name)) &&
      s.id &&
      s.place?.id,
  );
}
function localStart(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)) {
    const dt = new Date(value);
    if (!Number.isFinite(dt.getTime())) return null;
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(dt)
        .map((x) => [x.type, x.value]),
    );
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      minute: Number(parts.hour) * 60 + Number(parts.minute),
    };
  }
  return { date: match[1], minute: Number(match[2]) * 60 + Number(match[3]) };
}
function blocks(items, date) {
  const minutes = new Map();
  for (const item of items) {
    const start = localStart(item.startDate);
    if (!start || start.date !== date) continue;
    const available = item.status === "available";
    // Duplicate entries never create extra capacity; occupied wins conflicts.
    minutes.set(
      start.minute,
      minutes.has(start.minute)
        ? minutes.get(start.minute) && available
        : available,
    );
  }
  const groups = [];
  for (const [minute, available] of [...minutes].sort((a, b) => a[0] - b[0])) {
    let group = groups.at(-1);
    if (!group || minute > group.at(-1).minute + 1) {
      group = [];
      groups.push(group);
    }
    group.push({ minute, available });
  }
  return groups
    .filter((g) => g.length <= 6)
    .map((g) => ({
      base: g[0].minute,
      capacity: g.length,
      free: g.filter((x) => x.available).length,
      slot: g.find((x) => x.available)?.minute,
    }));
}
function rank(request, agendas, snapshots, assignments = []) {
  const candidates = [];
  for (const agenda of agendas) {
    const chosen = [];
    let valid = true;
    for (const day of request.days) {
      const occurrences = request.sessions.filter((s) => s.day === day.day);
      if (!occurrences.length) continue;
      const wanted =
        Number(day.time.slice(0, 2)) * 60 + Number(day.time.slice(3));
      const daily = occurrences.map((s) => ({
        session: s,
        blocks: blocks(
          snapshots[`${agenda.schedule_id}:${s.date}`] || [],
          s.date,
        ).filter((b) => b.free > 0 && Math.abs(b.base - wanted) <= 25),
      }));
      const common = daily[0].blocks.filter((b) =>
        daily.every((d) => d.blocks.some((x) => x.base === b.base)),
      );
      common.sort(
        (a, b) =>
          Math.abs(a.base - wanted) - Math.abs(b.base - wanted) ||
          a.base - b.base,
      );
      if (!common.length) {
        valid = false;
        break;
      }
      for (const d of daily) {
        const b = d.blocks.find((b) => b.base === common[0].base);
        chosen.push({
          date: d.session.date,
          day: day.day,
          requested_time: day.time,
          session_time: time(b.base),
          stenci_time: time(b.slot),
          free: b.free,
          capacity: b.capacity,
          difference_minutes: b.base - wanted,
        });
      }
    }
    if (!valid) continue;
    const previous = assignments.filter(
      (a) => Number(a.professional_id) === Number(agenda.professional_id),
    );
    candidates.push({
      ...agenda,
      sessions: chosen.sort((a, b) => a.date.localeCompare(b.date)),
      max_difference: Math.max(
        ...chosen.map((s) => Math.abs(s.difference_minutes)),
      ),
      total_difference: chosen.reduce(
        (n, s) => n + Math.abs(s.difference_minutes),
        0,
      ),
      min_free: Math.min(...chosen.map((s) => s.free)),
      total_free: chosen.reduce((n, s) => n + s.free, 0),
      assignments: previous.length,
      last_sequence: Math.max(0, ...previous.map((a) => Number(a.sequence))),
    });
  }
  candidates.sort(
    (a, b) =>
      b.min_free - a.min_free ||
      b.total_free - a.total_free ||
      a.assignments - b.assignments ||
      a.last_sequence - b.last_sequence ||
      a.schedule_id.localeCompare(b.schedule_id),
  );
  // One person appears only once even with multiple configured agendas.
  return candidates.filter(
    (a, i) =>
      candidates.findIndex((b) => b.professional_id === a.professional_id) ===
      i,
  );
}
module.exports = { normalize, matrixSchedules, blocks, rank, plain, localStart };
