const UNIT_TABLE = 'units';
const USER_UNIT_TABLE = 'user_units';

exports.up = async function up(knex) {
  const hasUnitTable = await knex.schema.hasTable(UNIT_TABLE);
  if (!hasUnitTable) {
    await knex.schema.createTable(UNIT_TABLE, (table) => {
      table.increments('id').primary();
      table.string('name', 150).notNullable().unique('uk_units_name');
      table.timestamps(true, true);
    });
  }

  const hasUserUnitTable = await knex.schema.hasTable(USER_UNIT_TABLE);
  if (!hasUserUnitTable) {
    await knex.schema.createTable(USER_UNIT_TABLE, (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
      table
        .integer('unit_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable(UNIT_TABLE)
        .onDelete('RESTRICT')
        .onUpdate('CASCADE');
      table.unique(['user_id', 'unit_id'], 'uk_user_units_user_unit');
      table.index(['unit_id'], 'idx_user_units_unit');
      table.index(['user_id'], 'idx_user_units_user');
      table.timestamps(true, true);
    });
  }
};

exports.down = async function down(knex) {
  const hasUserUnitTable = await knex.schema.hasTable(USER_UNIT_TABLE);
  if (hasUserUnitTable) {
    await knex.schema.dropTable(USER_UNIT_TABLE);
  }

  const hasUnitTable = await knex.schema.hasTable(UNIT_TABLE);
  if (hasUnitTable) {
    await knex.schema.dropTable(UNIT_TABLE);
  }
};
