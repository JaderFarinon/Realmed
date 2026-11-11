exports.up = async function (knex) {
  if (!(await knex.schema.hasColumn('guide_processes', 'deleted_at'))) {
    await knex.schema.alterTable('guide_processes', (table) => {
      table.timestamp('deleted_at').nullable()
      table.index('deleted_at', 'idx_guide_processes_deleted_at')
    })
  }
}

exports.down = async function (knex) {
  if (await knex.schema.hasColumn('guide_processes', 'deleted_at')) {
    await knex.schema.alterTable('guide_processes', (table) => table.dropColumn('deleted_at'))
  }
}
