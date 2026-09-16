exports.up = async (knex) => {
  await knex.schema.alterTable('guide_processes', (table) => {
    table.integer('patient_insurance_id').unsigned().nullable().alter()
    table.integer('physiotherapist_id').unsigned().nullable().alter()
    table.date('assessment_date').nullable().alter()
    table.date('expected_start_date').nullable().alter()
    table.integer('requested_sessions').unsigned().nullable().alter()
    table.date('referral_date').nullable()
    table.string('medical_diagnosis', 255).nullable()
    table.string('cid', 20).nullable()
  })
  await knex.schema.alterTable('patients', (table) => {
    table.string('gender', 30).nullable()
    table.string('cellphone', 30).nullable()
  })
  await knex.schema.alterTable('patient_insurances', (table) => table.string('card_number', 80).nullable().alter())
  await knex.schema.alterTable('guide_process_documents', (table) => {
    table.integer('document_version').unsigned().nullable()
  })
  await knex.raw("ALTER TABLE guide_process_documents MODIFY document_type ENUM('CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','PHYSIO_ASSESSMENT','PHYSIOTHERAPY_EVALUATION','ELECTROSTIMULATION','INSURANCE_CARD','OTHER') NOT NULL")
  await knex.raw("ALTER TABLE document_templates MODIFY document_type ENUM('CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','PHYSIOTHERAPY_EVALUATION','ELECTROSTIMULATION','OTHER') NOT NULL")
}

exports.down = async (knex) => {
  await knex('guide_process_documents').where({ document_type: 'PHYSIOTHERAPY_EVALUATION' }).del()
  await knex('document_templates').where({ document_type: 'PHYSIOTHERAPY_EVALUATION' }).del()
  await knex.raw("ALTER TABLE guide_process_documents MODIFY document_type ENUM('CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','PHYSIO_ASSESSMENT','ELECTROSTIMULATION','INSURANCE_CARD','OTHER') NOT NULL")
  await knex.raw("ALTER TABLE document_templates MODIFY document_type ENUM('CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION','OTHER') NOT NULL")
  await knex.schema.alterTable('guide_process_documents', (table) => table.dropColumn('document_version'))
  await knex.schema.alterTable('guide_processes', (table) => table.dropColumns('referral_date', 'medical_diagnosis', 'cid'))
  await knex.schema.alterTable('patients', (table) => table.dropColumns('gender', 'cellphone'))
  await knex.schema.alterTable('patient_insurances', (table) => table.string('card_number', 80).notNullable().alter())
}
