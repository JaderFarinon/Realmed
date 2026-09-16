exports.up = async (knex) => {
  if (!(await knex.schema.hasColumn('insurance_providers', 'external_source'))) await knex.schema.alterTable('insurance_providers', (table) => table.string('external_source', 60).nullable())
  if (!(await knex.schema.hasColumn('insurance_providers', 'external_id'))) await knex.schema.alterTable('insurance_providers', (table) => table.string('external_id', 120).nullable())
  await knex.schema.alterTable('insurance_providers', (table) => table.unique(['external_source', 'external_id'], 'uk_insurance_providers_external'))
  await knex.schema.alterTable('patients', (table) => { table.date('birth_date').nullable().alter(); table.string('phone', 30).nullable().alter() })
  await knex.schema.alterTable('patient_insurances', (table) => table.string('card_number', 80).nullable().alter())
}
exports.down = async (knex) => {
  await knex.schema.alterTable('insurance_providers', (table) => { table.dropUnique([], 'uk_insurance_providers_external'); table.dropColumns('external_source', 'external_id') })
}
