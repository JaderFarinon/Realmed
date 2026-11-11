exports.config = { transaction: false };
exports.up = async (db) => {
  if (!(await db.schema.hasTable("guide_billing_items")))
    await db.schema.createTable("guide_billing_items", (t) => {
      t.increments("id");
      t.integer("guide_process_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("guide_processes");
      t.string("document_type", 40).notNullable();
      t.string("status", 20).notNullable().defaultTo("PENDING");
      t.boolean("applicable").nullable();
      t.integer("revision").unsigned().notNullable().defaultTo(0);
      t.text("notes").nullable();
      t.integer("updated_by").unsigned().nullable();
      t.timestamp("updated_at").nullable();
      t.unique(["guide_process_id", "document_type"], "uk_guide_billing_type");
    });
  for (const type of [
    "CONSULTATION_GUIDE",
    "PHYSIOTHERAPY_GUIDE",
    "ELECTROSTIMULATION",
  ])
    await db.raw(
      `INSERT IGNORE INTO guide_billing_items (guide_process_id,document_type,status) SELECT id,?,CASE WHEN billing_status IN ('BILLED','DELIVERED') THEN billing_status ELSE 'PENDING' END FROM guide_processes`,
      [type],
    );
};
exports.down = async () => {}; // Preserve billing records and their audit history.
