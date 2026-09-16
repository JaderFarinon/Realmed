exports.up = async (knex) => {
  if (!(await knex.schema.hasColumn('professionals', 'external_source'))) await knex.schema.alterTable('professionals', (t) => {
    t.string('external_source', 60).nullable(); t.string('external_id', 120).nullable(); t.string('identity_external_id', 120).nullable()
    t.json('specialties').nullable(); t.text('signature').nullable(); t.string('signature_image_url', 500).nullable()
    t.unique(['external_source', 'external_id'], 'uk_professionals_external')
  })
  if (!(await knex.schema.hasColumn('patient_insurances', 'plan_external_id'))) await knex.schema.alterTable('patient_insurances', (t) => t.string('plan_external_id', 120).nullable())
}

exports.down = async (knex) => {
  if (await knex.schema.hasColumn('patient_insurances', 'plan_external_id')) await knex.schema.alterTable('patient_insurances', (t) => t.dropColumn('plan_external_id'))
  if (await knex.schema.hasColumn('professionals', 'external_source')) await knex.schema.alterTable('professionals', (t) => {
    t.dropUnique([], 'uk_professionals_external'); t.dropColumns('external_source', 'external_id', 'identity_external_id', 'specialties', 'signature', 'signature_image_url')
  })
}
