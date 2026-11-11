exports.up = async (knex) => {
  await knex.schema.alterTable("guide_processes", (t) => {
    t.text("medical_diagnosis").nullable().alter();
    t.string("cid", 40).nullable().alter();
  });
  await knex.schema.alterTable("physiotherapy_evaluations", (t) => {
    for (const name of [
      "referral_professional",
      "medical_diagnosis",
      "authorization_reference",
      "responsible_name",
      "responsible_crefito",
      "other_region",
      "other_precaution",
      "other_conduct",
    ])
      t.text(name).nullable();
    t.string("cid", 40).nullable();
    t.date("referral_date").nullable();
    t.date("expected_start_date").nullable();
    t.integer("requested_sessions").unsigned().nullable();
    t.integer("planned_total_sessions").unsigned().nullable();
    t.integer("sessions_per_week").unsigned().nullable();
    t.json("treatment_days").nullable();
    t.json("body_marks").nullable();
    t.json("signature_strokes").nullable();
    t.dateTime("completed_at").nullable();
  });
};
exports.down = async (knex) =>
  knex.schema.alterTable("physiotherapy_evaluations", (t) => {
    for (const name of [
      "referral_professional",
      "medical_diagnosis",
      "authorization_reference",
      "responsible_name",
      "responsible_crefito",
      "other_region",
      "other_precaution",
      "other_conduct",
      "cid",
      "referral_date",
      "expected_start_date",
      "requested_sessions",
      "planned_total_sessions",
      "sessions_per_week",
      "treatment_days",
      "body_marks",
      "signature_strokes",
      "completed_at",
    ])
      t.dropColumn(name);
  });
