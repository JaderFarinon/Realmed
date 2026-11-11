exports.up = async (knex) => {
  if (!(await knex.schema.hasColumn("users", "auth_provider"))) {
    await knex.schema.alterTable("users", (table) => {
      table.string("auth_provider", 20).notNullable().defaultTo("STENCI");
    });
  }
  if (!(await knex.schema.hasColumn("users", "password_hash"))) {
    await knex.schema.alterTable("users", (table) => {
      table.string("password_hash", 255).nullable();
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasColumn("users", "password_hash")) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("password_hash");
    });
  }
  if (await knex.schema.hasColumn("users", "auth_provider")) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("auth_provider");
    });
  }
};
