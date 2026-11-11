exports.up = async (knex) => {
  if (!(await knex.schema.hasColumn('guide_processes', 'workflow_stages')))
    await knex.schema.alterTable('guide_processes', (t) => t.json('workflow_stages').nullable());
};
exports.down = async (knex) => {
  if (await knex.schema.hasColumn('guide_processes', 'workflow_stages'))
    await knex.schema.alterTable('guide_processes', (t) => t.dropColumn('workflow_stages'));
};
