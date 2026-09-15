const timestamp = (table, knex) => {
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
  table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
}

exports.up = async (knex) => {
  await knex.schema.alterTable('patients', (t) => { t.date('birth_date').nullable().alter(); t.string('phone', 30).nullable().alter() })
  await knex.schema.createTable('professional_signatures', (t) => {
    t.increments('id').primary(); t.integer('professional_id').unsigned().notNullable().references('id').inTable('professionals').onDelete('RESTRICT')
    t.string('file_path', 255).notNullable(); t.string('original_name', 255).notNullable(); t.string('mime_type', 100).notNullable(); t.boolean('active').notNullable().defaultTo(true)
    t.integer('created_by').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT'); timestamp(t, knex); t.index(['professional_id', 'active'])
  })
  await knex.schema.createTable('insurance_provider_assets', (t) => {
    t.increments('id').primary(); t.integer('insurance_provider_id').unsigned().notNullable().references('id').inTable('insurance_providers').onDelete('RESTRICT')
    t.enu('asset_type', ['LOGO']).notNullable(); t.string('file_path', 255).notNullable(); t.string('original_name', 255).notNullable(); t.string('mime_type', 100).notNullable(); t.boolean('active').notNullable().defaultTo(true)
    timestamp(t, knex); t.index(['insurance_provider_id', 'asset_type', 'active'], 'idx_insurance_assets_active')
  })
  await knex.schema.createTable('document_templates', (t) => {
    t.increments('id').primary(); t.string('name', 180).notNullable(); t.enu('document_type', ['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION','OTHER']).notNullable()
    t.integer('insurance_provider_id').unsigned().references('id').inTable('insurance_providers').onDelete('RESTRICT'); t.string('template_file_path', 255); t.enu('template_format', ['PDF']).notNullable().defaultTo('PDF')
    t.boolean('active').notNullable().defaultTo(true); t.integer('version').unsigned().notNullable().defaultTo(1); t.text('notes'); t.integer('created_by').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT'); timestamp(t, knex)
    t.unique(['name', 'version'], 'uk_document_template_version'); t.index(['document_type', 'insurance_provider_id', 'active'], 'idx_document_templates_applicable')
  })
  await knex.schema.createTable('document_template_fields', (t) => {
    t.increments('id').primary(); t.integer('document_template_id').unsigned().notNullable().references('id').inTable('document_templates').onDelete('CASCADE')
    t.string('field_key', 80).notNullable(); t.integer('page').unsigned().notNullable(); t.decimal('x', 10, 2).notNullable(); t.decimal('y', 10, 2).notNullable(); t.decimal('width', 10, 2); t.decimal('height', 10, 2)
    t.decimal('font_size', 6, 2); t.enu('alignment', ['LEFT','CENTER','RIGHT']); t.json('options'); timestamp(t, knex); t.unique(['document_template_id','field_key','page'], 'uk_template_field_page')
  })
  await knex.schema.createTable('guide_process_procedures', (t) => {
    t.increments('id').primary(); t.integer('guide_process_id').unsigned().notNullable().references('id').inTable('guide_processes').onDelete('CASCADE'); t.integer('procedure_id').unsigned().notNullable().references('id').inTable('procedures').onDelete('RESTRICT')
    t.integer('requested_quantity').unsigned().notNullable(); t.integer('authorized_quantity').unsigned(); t.text('notes'); timestamp(t, knex); t.unique(['guide_process_id','procedure_id'], 'uk_process_procedure')
  })
  await knex.schema.createTable('document_template_audit', (t) => {
    t.bigIncrements('id').primary(); t.integer('document_template_id').unsigned().references('id').inTable('document_templates').onDelete('SET NULL'); t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT')
    t.string('action', 80).notNullable(); t.json('metadata'); t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
  })
  await knex.schema.alterTable('guide_process_documents', (t) => {
    t.integer('document_template_id').unsigned().references('id').inTable('document_templates').onDelete('RESTRICT'); t.integer('template_version').unsigned(); t.integer('signature_id').unsigned().references('id').inTable('professional_signatures').onDelete('RESTRICT')
  })
  await knex.raw("INSERT IGNORE INTO user_permissions (user_id, module_key, can_view, can_create, can_edit, can_delete) SELECT id, 'document_templates', role IN ('masteradmin','admin','cac_coord'), role IN ('masteradmin','admin','cac_coord'), role IN ('masteradmin','admin','cac_coord'), role IN ('masteradmin','admin') FROM users")

}

exports.down = async (knex) => {
  await knex('user_permissions').where({ module_key: 'document_templates' }).del()
  await knex.schema.alterTable('guide_process_documents', (t) => { t.dropForeign('signature_id'); t.dropForeign('document_template_id'); t.dropColumns('signature_id','template_version','document_template_id') })
  for (const table of ['document_template_audit','guide_process_procedures','document_template_fields','document_templates','insurance_provider_assets','professional_signatures']) await knex.schema.dropTableIfExists(table)
  await knex.schema.alterTable('patients', (t) => { t.date('birth_date').notNullable().alter(); t.string('phone', 30).notNullable().alter() })
}
