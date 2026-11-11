exports.config = { transaction: false };
exports.up = async (db) => {
  if (!(await db.schema.hasTable("guide_authorization_items")))
    await db.schema.createTable("guide_authorization_items", (t) => {
      t.increments("id");
      t.integer("guide_process_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("guide_processes");
      t.string("document_type", 40).notNullable();
      t.string("status", 30).notNullable();
      t.boolean("is_individual").notNullable().defaultTo(false);
      t.boolean("applicable").nullable();
      t.string("decision_source", 30).notNullable().defaultTo("LEGACY");
      t.integer("revision").unsigned().notNullable().defaultTo(0);
      t.string("authorization_number", 100).nullable();
      t.date("authorization_date").nullable();
      t.date("expiration_date").nullable();
      t.date("requested_at").nullable();
      t.integer("authorized_sessions").unsigned().nullable();
      t.text("notes").nullable();
      t.integer("updated_by").unsigned().nullable();
      t.timestamp("updated_at").nullable();
      t.unique(["guide_process_id", "document_type"], "uk_auth_guide_type");
    });
  if (!(await db.schema.hasColumn("guide_authorizations", "document_type")))
    await db.schema.alterTable("guide_authorizations", (t) =>
      t.string("document_type", 40).nullable(),
    );
  if (
    !(await db.schema.hasColumn("guide_process_pending_items", "document_type"))
  )
    await db.schema.alterTable("guide_process_pending_items", (t) =>
      t.string("document_type", 40).nullable(),
    );
};
exports.down = async () => {};
