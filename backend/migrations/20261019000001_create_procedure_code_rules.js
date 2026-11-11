exports.up = async function (knex) {
  await knex.schema.createTable('procedure_code_rules', (t) => {
    t.increments('id').primary()
    t.integer('insurance_provider_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('insurance_providers')
    t.string('source_code', 50).notNullable()
    t.string('source_description', 255).nullable()
    t.string('source_table', 80).nullable()
    t.integer('target_procedure_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('procedures')
    t.integer('priority').unsigned().notNullable().defaultTo(1)
    t.date('valid_from').nullable()
    t.date('valid_until').nullable()
    t.boolean('active').notNullable().defaultTo(true)
    t.text('notes').nullable()
    t.timestamps(true, true)
    t.index(
      ['source_code', 'insurance_provider_id', 'active'],
      'pcr_source_insurer',
    )
  })
}
exports.down = (knex) => knex.schema.dropTableIfExists('procedure_code_rules')
