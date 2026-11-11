exports.up = async function (db) {
  await db.schema.alterTable("billing_stenci_schedules", (t) => {
    t.string("place_external_id", 64);
    t.string("place_name", 180);
  });
  await db.schema.alterTable("billing_stenci_appointments", (t) => {
    t.json("schedule_memberships");
    t.boolean("is_physiotherapy");
  });
  // Recollect operational metadata without discarding the last successful snapshot.
  await db("billing_collection_days")
    .whereNotNull("last_success_at")
    .update({ status: "QUEUED", retry_at: null });
};
exports.down = async function (db) {
  await db.schema.alterTable("billing_stenci_appointments", (t) => {
    t.dropColumn("schedule_memberships");
    t.dropColumn("is_physiotherapy");
  });
  await db.schema.alterTable("billing_stenci_schedules", (t) => {
    t.dropColumn("place_external_id");
    t.dropColumn("place_name");
  });
};
