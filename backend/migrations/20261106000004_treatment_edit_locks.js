exports.up = async knex => {
  await knex.schema.createTable('treatment_edit_locks', table => {
    table.integer('guide_process_id').unsigned().notNullable();
    table.string('stage', 32).notNullable();
    table.integer('owner_id').unsigned().nullable();
    table.string('editor_id', 64).nullable();
    table.bigInteger('expires_at').notNullable().defaultTo(0);
    table.primary(['guide_process_id','stage']);
  });
};
exports.down = knex => knex.schema.dropTable('treatment_edit_locks');
