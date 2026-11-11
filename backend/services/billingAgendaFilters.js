const ALL = "all";
function parseFilters(query = {}) {
  const read = (key, max = 64) => {
    const value =
      query[key] === undefined || query[key] === "" ? ALL : query[key];
    if (
      typeof value !== "string" ||
      value.length > max ||
      !/^[-\w]+$/.test(value)
    )
      throw Object.assign(new Error("Filtro de agenda inválido."), {
        status: 400,
      });
    return value;
  };
  const filters = {
    scheduleId: read("scheduleId"),
    placeId: read("placeId"),
    attendanceType: read("attendanceType"),
    status: query.status === undefined ? "active" : read("status", 60),
  };
  if (!["all", "physiotherapy", "evaluation"].includes(filters.attendanceType))
    throw Object.assign(new Error("Tipo de atendimento inválido."), {
      status: 400,
    });
  return filters;
}
function memberships(row) {
  let links = row.schedule_memberships;
  if (typeof links === "string") {
    try {
      links = JSON.parse(links);
    } catch {
      links = null;
    }
  }
  return Array.isArray(links) && links.length
    ? links
    : [
        {
          id: row.schedule_id,
          name: row.schedule_name,
          place_id: null,
          place_name: null,
        },
      ];
}
function applyFilters(rows, filters) {
  return rows
    .filter(
      (row) =>
        (filters.status === "all" ||
          (filters.status === "active"
            ? ![
                "patient_canceled",
                "professional_canceled",
                "canceled",
                "rescheduled",
                "available",
              ].includes(row.status)
            : row.status === filters.status)) &&
        (filters.attendanceType === "all" ||
          (filters.attendanceType === "evaluation"
            ? Boolean(row.is_evaluation)
            : Boolean(row.is_physiotherapy) && !row.is_evaluation)) &&
        memberships(row).some(
          (link) =>
            (filters.scheduleId === "all" || link.id === filters.scheduleId) &&
            (filters.placeId === "all" ||
              (filters.placeId === "unassigned"
                ? !link.place_id
                : link.place_id === filters.placeId)),
        ),
    )
    .map((row) => {
      const links = memberships(row).filter(
        (link) =>
          (filters.scheduleId === "all" || link.id === filters.scheduleId) &&
          (filters.placeId === "all" ||
            (filters.placeId === "unassigned"
              ? !link.place_id
              : link.place_id === filters.placeId)),
      );
      return {
        ...row,
        schedule_name: [
          ...new Set(links.map((link) => link.name).filter(Boolean)),
        ].join(" • "),
        place_name: [
          ...new Set(
            links.map((link) => link.place_name || "Sem local informado"),
          ),
        ].join(" • "),
      };
    });
}
function filterOptions(schedules, rows) {
  const agenda = new Map(
    schedules.map((row) => [
      row.external_id,
      {
        id: row.external_id,
        name: row.name,
        placeId: row.place_external_id || null,
      },
    ]),
  );
  const places = new Map(
    schedules
      .filter((row) => row.place_external_id)
      .map((row) => [
        row.place_external_id,
        {
          id: row.place_external_id,
          name: row.place_name || "Local não identificado",
        },
      ]),
  );
  for (const row of rows)
    for (const link of memberships(row)) {
      if (link.id && !agenda.has(link.id))
        agenda.set(link.id, {
          id: link.id,
          name: link.name,
          placeId: link.place_id || null,
        });
      if (link.place_id && !places.has(link.place_id))
        places.set(link.place_id, {
          id: link.place_id,
          name: link.place_name || "Local não identificado",
        });
    }
  const byName = (a, b) => a.name.localeCompare(b.name, "pt-BR");
  return {
    schedules: [...agenda.values()].sort(byName),
    places: [...places.values()].sort(byName),
    statuses: [...new Set(rows.map((row) => row.status))].sort(),
    metadataPending: rows.some(
      (row) => row.schedule_memberships == null || row.is_physiotherapy == null,
    ),
  };
}
module.exports = { parseFilters, applyFilters, filterOptions, memberships };
