exports.up = async (knex) => {
  if (!(await knex.schema.hasColumn('insurance_provider_assets', 'file_size'))) {
    await knex.schema.alterTable('insurance_provider_assets', (table) => table.integer('file_size').unsigned().nullable())
  }
  if (!(await knex.schema.hasColumn('insurance_provider_assets', 'created_by'))) {
    await knex.schema.alterTable('insurance_provider_assets', (table) => {
      table.integer('created_by').unsigned().nullable().references('id').inTable('users').onDelete('RESTRICT')
    })
  }
}

exports.down = async (knex) => {
  if (await knex.schema.hasColumn('insurance_provider_assets', 'created_by')) {
    await knex.schema.alterTable('insurance_provider_assets', (table) => table.dropForeign('created_by'))
    await knex.schema.alterTable('insurance_provider_assets', (table) => table.dropColumn('created_by'))
  }
  if (await knex.schema.hasColumn('insurance_provider_assets', 'file_size')) {
    await knex.schema.alterTable('insurance_provider_assets', (table) => table.dropColumn('file_size'))
  }
}
