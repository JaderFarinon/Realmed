exports.up = async function (db) {
  await db.schema.createTable("billing_stenci_schedules", (t) => {
    t.string("branch_id", 64).notNullable();
    t.string("external_id", 64).notNullable();
    t.string("name", 180).notNullable();
    t.dateTime("last_seen_at").notNullable();
    t.primary(["branch_id", "external_id"]);
  });
  await db.schema.createTable("billing_collection_days", (t) => {
    t.string("branch_id", 64).notNullable();
    t.date("service_date").notNullable();
    t.string("status", 24).notNullable().defaultTo("QUEUED");
    t.dateTime("requested_at").notNullable();
    t.dateTime("last_attempt_at");
    t.dateTime("last_success_at");
    t.dateTime("retry_at");
    t.integer("attempts").unsigned().notNullable().defaultTo(0);
    t.integer("schedule_count").unsigned();
    t.integer("appointment_count").unsigned();
    t.string("error_code", 80);
    t.primary(["branch_id", "service_date"]);
    t.index(["branch_id", "status", "retry_at"], "bill_days_due");
  });
  await db.schema.createTable("billing_stenci_appointments", (t) => {
    t.string("branch_id", 64).notNullable();
    t.string("external_id", 64).notNullable();
    t.date("service_date").notNullable();
    t.string("schedule_id", 64).notNullable();
    t.string("schedule_name", 180).notNullable();
    t.string("patient_external_id", 64).notNullable();
    t.string("patient_name", 180).notNullable();
    t.string("insurance_external_id", 64);
    t.string("insurance_name", 180);
    t.string("start_at", 40).notNullable();
    t.string("status", 60).notNullable();
    t.boolean("is_evaluation").notNullable();
    t.boolean("is_session").notNullable();
    t.json("expenses").notNullable();
    t.dateTime("collected_at").notNullable();
    t.primary(["branch_id", "external_id"]);
    t.index(["branch_id", "service_date"], "bill_appt_day");
    t.index(
      ["branch_id", "patient_external_id", "service_date"],
      "bill_appt_patient",
    );
  });
};
exports.down = async (db) => {
  for (const name of [
    "billing_stenci_appointments",
    "billing_collection_days",
    "billing_stenci_schedules",
  ])
    await db.schema.dropTableIfExists(name);
};
