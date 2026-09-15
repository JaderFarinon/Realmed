const timestamp = (table, knex) => {
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
  table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
}

exports.up = async (knex) => {
  await knex.schema.createTable('insurance_providers', (t) => {
    t.increments('id').primary(); t.string('name', 180).notNullable(); t.string('internal_code', 60); t.string('ans_registration', 30)
    t.enu('authorization_type', ['PRE_AUTHORIZATION', 'SESSION_TOKEN', 'NOT_REQUIRED']).notNullable().defaultTo('PRE_AUTHORIZATION')
    t.boolean('active').notNullable().defaultTo(true); t.text('notes'); timestamp(t, knex); t.index(['active', 'name'])
  })
  await knex.schema.createTable('professionals', (t) => {
    t.increments('id').primary(); t.string('full_name', 180).notNullable(); t.enu('type', ['PHYSIOTHERAPIST', 'DOCTOR']).notNullable()
    t.string('council', 30).notNullable(); t.string('council_number', 40).notNullable(); t.string('state', 2).notNullable(); t.string('cbo', 20)
    t.boolean('active').notNullable().defaultTo(true); t.text('notes'); timestamp(t, knex); t.unique(['council', 'council_number', 'state']); t.index(['type', 'active'])
  })
  await knex.schema.createTable('procedures', (t) => {
    t.increments('id').primary(); t.string('code', 50).notNullable().unique(); t.string('description', 255).notNullable(); t.string('table_name', 80)
    t.enu('type', ['CONSULTATION', 'PHYSIOTHERAPY', 'ELECTROSTIMULATION', 'OTHER']).notNullable(); t.boolean('active').notNullable().defaultTo(true); t.text('notes'); timestamp(t, knex)
  })
  await knex.schema.createTable('patients', (t) => {
    t.increments('id').primary(); t.string('external_source', 60); t.string('external_id', 120); t.string('full_name', 180).notNullable(); t.string('cpf', 14).unique()
    t.date('birth_date').notNullable(); t.string('phone', 30).notNullable(); t.string('email', 180); timestamp(t, knex)
    t.unique(['external_source', 'external_id'], 'uk_patients_external'); t.index('full_name')
  })
  await knex.schema.createTable('patient_insurances', (t) => {
    t.increments('id').primary(); t.integer('patient_id').unsigned().notNullable().references('id').inTable('patients').onDelete('RESTRICT')
    t.integer('insurance_provider_id').unsigned().notNullable().references('id').inTable('insurance_providers').onDelete('RESTRICT')
    t.string('card_number', 80).notNullable(); t.date('card_expiration'); t.string('plan', 120); t.string('holder', 180); t.boolean('active').notNullable().defaultTo(true); timestamp(t, knex)
    t.index('patient_id'); t.index('insurance_provider_id')
  })
  await knex.schema.createTable('guide_processes', (t) => {
    t.increments('id').primary(); t.integer('patient_id').unsigned().notNullable().references('id').inTable('patients').onDelete('RESTRICT')
    t.integer('patient_insurance_id').unsigned().notNullable().references('id').inTable('patient_insurances').onDelete('RESTRICT')
    t.integer('physiotherapist_id').unsigned().notNullable().references('id').inTable('professionals').onDelete('RESTRICT')
    t.integer('requesting_doctor_id').unsigned().references('id').inTable('professionals').onDelete('RESTRICT'); t.date('assessment_date').notNullable(); t.date('expected_start_date').notNullable()
    t.integer('requested_sessions').unsigned().notNullable(); t.integer('authorized_sessions').unsigned(); t.integer('performed_sessions').unsigned().notNullable().defaultTo(0); t.integer('priority').notNullable().defaultTo(0); t.text('notes')
    t.string('external_source', 60); t.string('external_reference', 120); t.enu('document_status', ['INCOMPLETE', 'COMPLETE']).notNullable().defaultTo('INCOMPLETE')
    t.enu('authorization_status', ['NOT_READY', 'READY', 'IN_PROGRESS', 'PENDING', 'AUTHORIZED', 'DENIED', 'SESSION_TOKEN', 'NOT_REQUIRED']).notNullable().defaultTo('NOT_READY')
    t.enu('treatment_status', ['WAITING', 'IN_PROGRESS', 'COMPLETED']).notNullable().defaultTo('WAITING'); t.enu('billing_status', ['NOT_READY', 'READY', 'DELIVERED', 'BILLED']).notNullable().defaultTo('NOT_READY')
    t.integer('created_by').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT'); timestamp(t, knex)
    ;['patient_id','physiotherapist_id','assessment_date','expected_start_date','document_status','authorization_status','treatment_status','billing_status'].forEach((c) => t.index(c))
    t.unique(['external_source', 'external_reference'], 'uk_guide_process_external')
  })
  await knex.schema.createTable('guide_process_documents', (t) => {
    t.increments('id').primary(); t.integer('guide_process_id').unsigned().notNullable().references('id').inTable('guide_processes').onDelete('CASCADE')
    t.enu('document_type', ['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','PHYSIO_ASSESSMENT','ELECTROSTIMULATION','INSURANCE_CARD','OTHER']).notNullable()
    t.string('file_path', 255).notNullable(); t.string('original_name', 255).notNullable(); t.string('mime_type', 100).notNullable(); t.bigInteger('file_size').unsigned().notNullable()
    t.enu('source', ['UPLOADED','GENERATED','IMPORTED']).notNullable().defaultTo('UPLOADED'); t.integer('uploaded_by').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT')
    t.integer('replaced_by_document_id').unsigned(); t.timestamp('deleted_at'); timestamp(t, knex); t.index(['guide_process_id','document_type','deleted_at'], 'idx_guide_docs_active')
  })
  await knex.schema.alterTable('guide_process_documents', (t) => t.foreign('replaced_by_document_id').references('id').inTable('guide_process_documents').onDelete('SET NULL'))
  await knex.schema.createTable('guide_authorizations', (t) => {
    t.increments('id').primary(); t.integer('guide_process_id').unsigned().notNullable().references('id').inTable('guide_processes').onDelete('CASCADE'); t.string('authorization_number', 100)
    t.date('authorization_date'); t.date('expiration_date'); t.integer('requested_sessions').unsigned().notNullable(); t.integer('authorized_sessions').unsigned()
    t.enu('status', ['NOT_READY','READY','IN_PROGRESS','PENDING','AUTHORIZED','DENIED','SESSION_TOKEN','NOT_REQUIRED']).notNullable(); t.text('notes')
    t.integer('created_by').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT'); t.integer('updated_by').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT'); timestamp(t, knex); t.index('guide_process_id')
  })
  await knex.schema.createTable('guide_process_pending_items', (t) => {
    t.increments('id').primary(); t.integer('guide_process_id').unsigned().notNullable().references('id').inTable('guide_processes').onDelete('CASCADE'); t.string('description', 255).notNullable(); t.enu('status', ['OPEN','RESOLVED']).notNullable().defaultTo('OPEN')
    t.integer('created_by').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT'); t.integer('resolved_by').unsigned().references('id').inTable('users').onDelete('RESTRICT'); t.timestamp('created_at').notNullable().defaultTo(knex.fn.now()); t.timestamp('resolved_at'); t.text('notes'); t.index(['guide_process_id','status'])
  })
  await knex.schema.createTable('guide_process_history', (t) => {
    t.bigIncrements('id').primary(); t.integer('guide_process_id').unsigned().notNullable().references('id').inTable('guide_processes').onDelete('CASCADE'); t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT')
    t.string('action', 80).notNullable(); t.string('field', 80); t.text('old_value'); t.text('new_value'); t.json('metadata'); t.timestamp('created_at').notNullable().defaultTo(knex.fn.now()); t.index(['guide_process_id','created_at'])
  })
}

exports.down = async (knex) => {
  for (const table of ['guide_process_history','guide_process_pending_items','guide_authorizations','guide_process_documents','guide_processes','patient_insurances','patients','procedures','professionals','insurance_providers']) await knex.schema.dropTableIfExists(table)
}
