const timestamp = (table, knex) => {
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
  table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
}

exports.up = async (knex) => {
  if (await knex.schema.hasTable('physiotherapy_evaluations')) return
  await knex.schema.createTable('physiotherapy_evaluations', (table) => {
    table.increments('id').primary()
    table.integer('guide_process_id').unsigned().notNullable().unique().references('id').inTable('guide_processes').onDelete('CASCADE')
    table.enu('status', ['IN_PROGRESS', 'COMPLETED']).notNullable().defaultTo('IN_PROGRESS')
    table.text('chief_complaint'); table.text('current_history'); table.text('functional_limitations'); table.text('physical_exam')
    table.integer('pain_score').unsigned(); table.string('pain_classification', 40); table.string('pain_location', 255)
    table.enu('severity', ['MILD', 'MODERATE', 'SEVERE']); table.text('severity_justification')
    table.enu('care_risk', ['LOW', 'MODERATE', 'HIGH']); table.boolean('individual_monitoring')
    table.json('precautions'); table.text('specific_care_notes'); table.text('therapeutic_goals'); table.json('conducts'); table.text('conduct_description')
    table.date('reevaluation_date'); table.text('reevaluation_notes'); table.json('regions')
    table.integer('physiotherapist_id').unsigned().references('id').inTable('professionals').onDelete('RESTRICT')
    table.date('evaluation_date'); table.integer('created_by').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT')
    table.integer('updated_by').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT'); timestamp(table, knex)
    table.index(['status', 'physiotherapist_id'])
  })
}

exports.down = (knex) => knex.schema.dropTableIfExists('physiotherapy_evaluations')
