const test = require("node:test"),
  assert = require("node:assert/strict");
const { summarize, ageGroup, filters } = require("../services/indicators");
const { demographics } = require("../services/patientDemographics");
const f = {
  start: "2026-10-01",
  end: "2026-10-31",
  area: "epidemiology",
  source: "combined",
  status: "active",
  insurance: "",
  scheduleId: "all",
  placeId: "all",
};
test('billing includes three mandatory guides before first movement and preserves individual/legacy billed status',()=>{
  const result=summarize({treatments:[{id:1,billing_status:'NOT_READY'},{id:2,billing_status:'BILLED'}],billing:[{guide_process_id:1,document_type:'CONSULTATION_GUIDE',status:'BILLED'}]}, {...f,area:'billing'});
  const metric=result.metrics.find(m=>m.key==='billing_status');assert.equal(metric.total,6);assert.deepEqual(metric.rows,[{label:'Faturada',value:4},{label:'Pendente',value:2}]);assert.match(metric.description,/três guias previstas/);
});
const appointment = (id, patient, status = "finished") => ({
  external_id: id,
  patient_external_id: patient,
  status,
  service_date: "2026-10-10",
  start_at: "2026-10-10T12:00:00Z",
  schedule_id: "s",
  schedule_name: "Fisio",
  is_physiotherapy: 1,
  insurance_name: "Convênio A",
});
test("epidemiology deduplicates local/Stenci by explicit ID, keeps missing fields and multi-valued procedure types", () => {
  const result = summarize(
    {
      appointments: [
        appointment("a", "p"),
        appointment("b", "p"),
        appointment("c", "other"),
        appointment("d", "cancel", "patient_canceled"),
      ],
      patients: [
        {
          id: 1,
          external_source: "STENCI",
          external_id: "p",
          gender: "female",
          birth_date: "2000-10-31",
          city: "Curitiba",
          neighborhood: "Centro",
          state: "PR",
        },
      ],
      treatments: [
        {
          id: 1,
          patient_id: 1,
          created_date: "2026-10-01",
          insurance_name: "Convênio B",
        },
      ],
      procedures: [
        { guide_process_id: 1, type: "CONSULTATION", quantity: 1 },
        { guide_process_id: 1, type: "ELECTROSTIMULATION", quantity: 10 },
      ],
    },
    f,
  );
  const metric = (key) => result.metrics.find((x) => x.key === key);
  assert.equal(metric("sex").population, 2);
  assert.deepEqual(metric("sex").rows, [
    { label: "Feminino", value: 1 },
    { label: "Não informado", value: 1 },
  ]);
  assert.equal(metric("insurance").rows[0].label, "Convênio A");
  assert.equal(metric("insurance").total, 2);
  assert.equal(metric("treatment_type").total, 4);
  assert.equal(metric("city").missing, 1);
  assert.ok(metric("city").rows.some((r) => r.label === "Curitiba / PR"));
  assert.equal(JSON.stringify(result).includes("patient_external_id"), false);
});
test("age uses end of selected period, handles birthdays, leap dates and invalid values", () => {
  assert.equal(ageGroup("2008-11-01", "2026-10-31"), "0–17 anos");
  assert.equal(ageGroup("2008-10-31", "2026-10-31"), "18–29 anos");
  assert.equal(ageGroup("2026-02-30", "2026-10-31"), "Não informado");
  assert.equal(ageGroup("2030-01-01", "2026-10-31"), "Não informado");
  assert.equal(ageGroup(null, "2026-10-31"), "Não informado");
});
test("missing collection is unavailable rather than zero; collected empty period is zero", () => {
  const no = summarize({}, { ...f, area: "reception" });
  assert.equal(no.metrics[0].total, null);
  const yes = summarize(
    {
      coverage: [
        {
          service_date: "2026-10-01",
          last_success_at: new Date(),
          status: "COMPLETE",
        },
      ],
    },
    { ...f, area: "reception", end: "2026-10-01" },
  );
  assert.equal(yes.metrics[0].total, 0);
  assert.equal(yes.coverage.complete, true);
});
test("cohort source, insurer, agenda membership filters and physio/evaluation separation are explicit", () => {
  const data = {
    appointments: [
      {
        ...appointment("a", "p"),
        schedule_memberships: [{ id: "s", name: "Fisio", place_id: "one" }],
      },
      {
        ...appointment("b", "q"),
        is_evaluation: 1,
        schedule_memberships: [{ id: "x", name: "Avaliação", place_id: "two" }],
      },
    ],
    patients: [{ id: 7, gender: "male" }],
    treatments: [{ id: 8, patient_id: 7, created_date: "2026-10-01" }],
  };
  assert.equal(
    summarize(data, { ...f, source: "local" }).metrics[0].population,
    1,
  );
  assert.equal(
    summarize(data, {
      ...f,
      source: "combined",
      scheduleId: "s",
      placeId: "two",
    }).metrics[0].population,
    1,
    "Local cohort is not silently filtered by Stenci unit",
  );
  const physio = summarize(
    {
      ...data,
      coverage: [{ service_date: "2026-10-10", last_success_at: new Date() }],
    },
    { ...f, area: "physio" },
  );
  assert.equal(physio.metrics[0].total, 1);
});
test("demographic normalization whitelists geography and rejects invalid birth dates", () => {
  assert.deepEqual(
    demographics({
      gender: "female",
      birthDate: "2000-01-02",
      addresses: [
        {
          city: "Curitiba",
          neighborhood: "Centro",
          state: "PR",
          addressLine1: "private",
          postalCode: "private",
        },
      ],
      phone: "private",
    }),
    {
      birth_date: "2000-01-02",
      gender: "female",
      city: "Curitiba",
      neighborhood: "Centro",
      state: "PR",
    },
  );
  assert.deepEqual(
    demographics({
      birthDate: "2000-02-31",
      addresses: [{ city: { name: "unexpected" } }],
    }),
    {},
  );
});
test("dates and filter values are validated without inventing future results", () => {
  assert.throws(() => filters({ ...f, end: "2099-01-01" }), { status: 400 });
  assert.throws(() => filters({ ...f, area: "invalid" }), { status: 400 });
  assert.throws(() => filters({ ...f, source: "unknown" }), { status: 400 });
  assert.throws(() => filters({ ...f, insurance: ["x"] }), { status: 400 });
});
