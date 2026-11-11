exports.up = async (knex) => {
  await knex.schema.createTable("insurance_procedures", (t) => {
    t.increments("id").primary();
    t.integer("insurance_provider_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("insurance_providers");
    t.integer("procedure_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("procedures");
    t.string("description", 255).notNullable();
    t.json('source_codes').nullable();
    t.boolean("active").notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.unique(["insurance_provider_id", "procedure_id"], "ip_insurer_procedure");
  });
  const rows = await knex("procedure_code_rules as r")
    .join("procedures as p", "p.id", "r.target_procedure_id")
    .whereNotNull("r.insurance_provider_id")
    .distinct(
      "r.insurance_provider_id",
      "p.id as procedure_id",
      "p.description",
    );
  if (rows.length) await knex("insurance_procedures").insert(rows);
};
exports.down = (knex) => knex.schema.dropTableIfExists("insurance_procedures");
