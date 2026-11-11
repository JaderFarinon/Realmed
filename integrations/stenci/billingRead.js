// Contracts observed in the agenda/invoice HAR. Never forward clinical text or raw payloads.
function billingOptions(input = {}) {
  const kind = String(input.kind || "");
  if (!["schedules", "calendar", "invoices", "account"].includes(kind))
    throw Object.assign(new Error("Consulta de faturamento inválida."), {
      status: 400,
    });
  const options = { kind };
  if (kind === "calendar") {
    const date = String(input.date || ""),
      scheduleId = String(input.scheduleId || "");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      !/^[a-f0-9]{24,32}$/i.test(scheduleId)
    )
      throw Object.assign(new Error("Informe uma data e agenda válidas."), {
        status: 400,
      });
    Object.assign(options, { date, scheduleId });
  }
  if (kind === "invoices") {
    const offset = Number(input.offset || 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
      throw Object.assign(new Error("Página inválida."), { status: 400 });
    options.offset = offset;
  }
  if (kind === "account") {
    const id = String(input.id || "");
    if (!/^[a-f0-9]{24,32}$/i.test(id))
      throw Object.assign(new Error("Conta inválida."), { status: 400 });
    options.id = id;
  }
  return options;
}
async function billingRead(client, input) {
  const options = billingOptions(input);
  client.assertAuthenticated();
  const statuses = "open,in_billing,closed,in_appeal,finished,canceled";
  let path, query;
  if (options.kind === "schedules") {
    path = "/v1/schedules";
    query = { limit: 0, active: true, type: "elective" };
  }
  if (options.kind === "calendar") {
    path = "/v1/calendar";
    query = {
      type: "elective",
      date: options.date,
      scheduleId: options.scheduleId,
    };
  }
  if (options.kind === "invoices") {
    path = "/v1/billing-invoices";
    query = { limit: 30, offset: options.offset, statuses, hasQuantity: true };
  }
  if (options.kind === "account") {
    path = `/v1/legacy/billing-accounts/${options.id}`;
    query = {};
  }
  const data = await client.request(path, {
    query,
    ...(options.kind !== "invoices" ? { base: "apiX" } : {}),
  });
  if (options.kind === "account") {
    if (!data || typeof data.id !== "string")
      throw Object.assign(new Error("Conta Stenci inválida."), { status: 502 });
    return {
      id: data.id,
      appointmentId: data.appointmentId,
      invoice: data.invoice
        ? { id: data.invoice.id, code: data.invoice.code }
        : null,
      status: data.status,
      total: data.total,
    };
  }
  if (!Array.isArray(data?.items))
    throw Object.assign(new Error("Lista Stenci inválida."), { status: 502 });
  let items;
  if (options.kind === "schedules")
    items = data.items.map((x) => ({
      id: x.id,
      name: x.name,
      place: x.place ? { id: x.place.id, name: x.place.name } : null,
    }));
  if (options.kind === "calendar")
    items = data.items
      .filter((x) => x.id && x.patient?.id && !x.isSlot)
      .map((x) => ({
        id: x.id,
        patient_id: x.patient.id,
        patient_name: x.patient.name,
        insurance_name: x.insurance?.name,
        insurance_id: x.insurance?.id,
        startDate: x.startDate,
        status: x.status,
        place_id:
          typeof x.placeId === "string" ? x.placeId : x.placeId?.id || null,
        is_physiotherapy:
          /CREFITO/i.test(x.professional?.council?.name || "") ||
          (x.expenses || []).some(
            (e) =>
              /fisioterap/i.test(
                String(e.expense?.name || "")
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, ""),
              ) && e.expense?.type !== "consultation",
          ),
        // Temporary operational policy explicitly requested on 19/10/2026.
        // This is not the result of querying the clinical record.
        evolution_status:
          x.status === "finished" ? "PENDING_POLICY" : "NOT_APPLICABLE",
        bundle: x.bundle
          ? { current: x.bundle.current, total: x.bundle.total }
          : null,
        expenses: (x.expenses || []).map((e) => ({
          id: e.id,
          name: e.expense?.name,
          code: e.expense?.code,
          quantity: e.quantity,
          type: e.expense?.type,
          accountId: e.billing?.accountId || e.accountId || null,
          billingStatus: e.billing?.status || null,
        })),
      }));
  if (options.kind === "invoices")
    items = data.items.map((x) => ({
      id: x.id,
      code: x.code,
      status: x.status,
      insurance_name: x.insurance?.name,
      quantity: x.quantity,
      total: x.value?.total,
      appealed: x.value?.appealed,
      recovered: x.value?.recovered,
      deliveryDate: x.deliveryDate,
      paymentDate: x.paymentDate,
    }));
  return {
    items,
    hasMore: Boolean(data.hasMore),
    fetchedAt: new Date().toISOString(),
    ...options,
  };
}
module.exports = { billingOptions, billingRead };
