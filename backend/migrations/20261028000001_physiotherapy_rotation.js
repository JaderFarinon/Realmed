exports.up = async (db) => {
  if (!(await db.schema.hasTable("physiotherapy_rotation_agendas")))
    await db.schema.createTable("physiotherapy_rotation_agendas", (t) => {
      t.string("schedule_id", 120).primary();
      t.string("schedule_name", 180).notNullable();
      t.integer("professional_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("professionals");
      t.string("place_id", 120).notNullable();
      t.integer("updated_by").unsigned().nullable();
      t.timestamp("updated_at").defaultTo(db.fn.now());
    });
  if (!(await db.schema.hasTable("physiotherapy_rotation_state"))) {
    await db.schema.createTable("physiotherapy_rotation_state", (t) => {
      t.integer("id").primary();
      t.integer("sequence").unsigned().notNullable().defaultTo(0);
    });
    await db("physiotherapy_rotation_state").insert({ id: 1, sequence: 0 });
  }
  if (!(await db.schema.hasTable("physiotherapy_rotation_assignments")))
    await db.schema.createTable("physiotherapy_rotation_assignments", (t) => {
      t.increments("id");
      t.integer("guide_process_id")
        .unsigned()
        .notNullable()
        .unique()
        .references("id")
        .inTable("guide_processes");
      t.integer("professional_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("professionals");
      t.string("schedule_id", 120).notNullable();
      t.string("request_token", 64).notNullable().unique();
      t.integer("sequence").unsigned().notNullable();
      t.json("request").notNullable();
      t.json("sessions").notNullable();
      t.integer("created_by").unsigned().notNullable();
      t.timestamp("created_at").defaultTo(db.fn.now());
    });
};
exports.down = async () => {}; // Preserve the audited rotation history.
