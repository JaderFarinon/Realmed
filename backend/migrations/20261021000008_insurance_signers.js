exports.up = async (knex) => {
  await knex.schema.createTable("insurance_provider_signatures", (t) => {
    t.increments("id");
    t.integer("insurance_provider_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("insurance_providers")
      .onDelete("RESTRICT");
    t.string("doctor_name", 150).notNullable();
    t.string("file_path", 255).notNullable();
    t.string("original_name", 255).notNullable();
    t.string("mime_type", 100).notNullable();
    t.integer("file_size").unsigned().notNullable();
    t.boolean("active").notNullable().defaultTo(true);
    t.integer("created_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    t.index(["insurance_provider_id", "active"], "idx_insurance_signer_active");
  });
};
exports.down = (knex) => knex.schema.dropTable("insurance_provider_signatures");
