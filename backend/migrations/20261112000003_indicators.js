exports.config = { transaction: false };
exports.up = async (db) => {
  for (const field of ["city", "neighborhood", "state"]) {
    if (!(await db.schema.hasColumn("patients", field)))
      await db.schema.alterTable("patients", (t) =>
        t.string(field, 120).nullable(),
      );
  }
  if (
    !(await db.schema.hasColumn(
      "billing_stenci_appointments",
      "patient_demographics",
    ))
  )
    await db.schema.alterTable("billing_stenci_appointments", (t) =>
      t.json("patient_demographics").nullable(),
    );
  if (!(await db.schema.hasTable("indicator_snapshots")))
    await db.schema.createTable("indicator_snapshots", (t) => {
      t.string("id", 36).primary();
      t.string("indicator_key", 60).notNullable();
      t.json("payload").notNullable();
      t.integer("created_by").unsigned().notNullable();
      t.timestamp("created_at").notNullable().defaultTo(db.fn.now());
    });
  if (!(await db.schema.hasTable("indicator_presentations")))
    await db.schema.createTable("indicator_presentations", (t) => {
      t.increments("id");
      t.string("title", 180).notNullable();
      t.json("slides").notNullable();
      t.integer("revision").unsigned().notNullable().defaultTo(1);
      t.integer("created_by").unsigned().notNullable();
      t.integer("updated_by").unsigned().notNullable();
      t.timestamp("created_at").notNullable().defaultTo(db.fn.now());
      t.timestamp("updated_at").notNullable().defaultTo(db.fn.now());
      t.timestamp("deleted_at").nullable();
    });
  if (!(await db.schema.hasTable("indicator_presentation_audit")))
    await db.schema.createTable("indicator_presentation_audit", (t) => {
      t.increments("id");
      t.integer("presentation_id").unsigned().notNullable();
      t.integer("actor_id").unsigned().notNullable();
      t.string("action", 20).notNullable();
      t.integer("revision").unsigned().notNullable();
      t.timestamp("created_at").notNullable().defaultTo(db.fn.now());
    });
};
exports.down = async () => {}; // Preserve saved analyses and captured results on code rollback.
