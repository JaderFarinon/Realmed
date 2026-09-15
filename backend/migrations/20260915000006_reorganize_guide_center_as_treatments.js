exports.up = async (knex) => {
  if (!(await knex.schema.hasColumn('guide_processes', 'treatment_days'))) {
    await knex.schema.alterTable('guide_processes', (table) => table.json('treatment_days').nullable())
  }
  if (!(await knex.schema.hasColumn('guide_processes', 'preferred_period'))) {
    await knex.schema.alterTable('guide_processes', (table) => table.string('preferred_period', 120).nullable())
  }
  if (!(await knex.schema.hasColumn('guide_process_documents', 'document_role'))) {
    await knex.schema.alterTable('guide_process_documents', (table) => {
      table.enu('document_role', ['RECEIVED', 'GENERATED']).notNullable().defaultTo('RECEIVED')
      table.boolean('is_usable').nullable()
      table.index(['guide_process_id', 'document_type', 'document_role', 'deleted_at'], 'idx_guide_docs_role_active')
    })
    await knex('guide_process_documents').where({ source: 'GENERATED' }).update({ document_role: 'GENERATED', is_usable: true })
  }
}

exports.down = async (knex) => {
  if (await knex.schema.hasColumn('guide_process_documents', 'document_role')) {
    await knex.schema.alterTable('guide_process_documents', (table) => {
      table.dropIndex([], 'idx_guide_docs_role_active')
      table.dropColumns('document_role', 'is_usable')
    })
  }
  if (await knex.schema.hasColumn('guide_processes', 'preferred_period')) await knex.schema.alterTable('guide_processes', (table) => table.dropColumn('preferred_period'))
  if (await knex.schema.hasColumn('guide_processes', 'treatment_days')) await knex.schema.alterTable('guide_processes', (table) => table.dropColumn('treatment_days'))
}
