exports.up = async function (db) {
  await db.schema.alterTable('billing_stenci_appointments', table => {
    table.integer('bundle_current').unsigned().nullable()
    table.integer('bundle_total').unsigned().nullable()
  })

  await db.schema.createTable('whatsapp_events', table => {
    table.increments('id')
    table.string('branch_id', 64).notNullable()
    table.string('type', 24).notNullable()
    table.string('name', 180).notNullable()
    table.date('start_date').notNullable()
    table.date('end_date').notNullable()
    table.text('message').nullable()
    table.json('audience').nullable()
    table.dateTime('send_at').nullable()
    table.dateTime('send_deadline_at').nullable()
    table.string('status', 20).notNullable().defaultTo('DRAFT')
    table.string('webhook_status', 24).notNullable().defaultTo('NOT_SCHEDULED')
    table.integer('webhook_attempts').unsigned().notNullable().defaultTo(0)
    table.dateTime('webhook_last_attempt_at').nullable()
    table.dateTime('webhook_retry_at').nullable()
    table.dateTime('webhook_delivered_at').nullable()
    table.string('webhook_error_code', 80).nullable()
    table.boolean('active').notNullable().defaultTo(true)
    table.integer('revision').unsigned().notNullable().defaultTo(1)
    table.integer('created_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
    table.integer('updated_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now())
    table.timestamp('updated_at').notNullable().defaultTo(db.fn.now())
    table.timestamp('deleted_at').nullable()
    table.index(['branch_id', 'active', 'start_date', 'end_date'], 'wa_events_period')
  })

  await db.schema.createTable('whatsapp_absence_batches', table => {
    table.increments('id')
    table.string('branch_id', 64).notNullable()
    table.date('report_date').notNullable()
    table.date('history_start').notNullable()
    table.string('rule', 20).notNullable()
    table.integer('minimum_misses').unsigned().notNullable().defaultTo(3)
    table.string('status', 20).notNullable().defaultTo('READY')
    table.integer('eligible_total').unsigned().notNullable().defaultTo(0)
    table.integer('contactable_total').unsigned().notNullable().defaultTo(0)
    table.integer('excluded_no_phone').unsigned().notNullable().defaultTo(0)
    table.json('coverage').notNullable()
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now())
    table.unique(['branch_id', 'report_date', 'history_start', 'rule', 'minimum_misses'], 'wa_abs_batch_unique')
  })

  await db.schema.createTable('whatsapp_absence_cases', table => {
    table.increments('id')
    table.integer('batch_id').unsigned().notNullable().references('id').inTable('whatsapp_absence_batches').onDelete('CASCADE')
    table.string('case_token', 64).notNullable().unique()
    table.string('patient_external_id', 64).notNullable()
    table.string('patient_name', 180).notNullable()
    table.string('phone', 30).notNullable()
    table.json('absence_snapshot').notNullable()
    table.string('choice', 32).notNullable().defaultTo('PENDING')
    table.text('response_text').nullable()
    table.string('billing_status', 24).notNullable().defaultTo('NOT_APPLICABLE')
    table.text('billing_notes').nullable()
    table.timestamp('responded_at').nullable()
    table.integer('revision').unsigned().notNullable().defaultTo(1)
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now())
    table.timestamp('updated_at').notNullable().defaultTo(db.fn.now())
    table.unique(['batch_id', 'patient_external_id'], 'wa_abs_case_patient')
    table.index(['choice', 'billing_status'], 'wa_abs_case_report')
  })

  await db.schema.createTable('whatsapp_absence_responses', table => {
    table.increments('id')
    table.integer('case_id').unsigned().notNullable().references('id').inTable('whatsapp_absence_cases').onDelete('CASCADE')
    table.string('external_event_id', 160).nullable().unique()
    table.string('choice', 32).notNullable()
    table.text('response_text').nullable()
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now())
    table.index(['case_id', 'created_at'], 'wa_abs_response_case')
  })

  await db.schema.createTable('whatsapp_completion_batches', table => {
    table.increments('id')
    table.string('branch_id', 64).notNullable()
    table.date('report_date').notNullable()
    table.string('status', 20).notNullable().defaultTo('READY')
    table.integer('eligible_total').unsigned().notNullable().defaultTo(0)
    table.integer('contactable_total').unsigned().notNullable().defaultTo(0)
    table.integer('excluded_no_phone').unsigned().notNullable().defaultTo(0)
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now())
    table.unique(['branch_id', 'report_date'], 'wa_completion_batch_unique')
  })

  await db.schema.createTable('whatsapp_campaign_recipients', table => {
    table.bigIncrements('id')
    table.integer('event_id').unsigned().notNullable().references('id').inTable('whatsapp_events').onDelete('CASCADE')
    table.integer('event_revision').unsigned().notNullable()
    table.string('patient_external_id', 64).notNullable()
    table.string('patient_name', 180).notNullable()
    table.string('phone', 30).notNullable()
    table.json('snapshot').notNullable()
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now())
    table.unique(['event_id', 'event_revision', 'patient_external_id'], 'wa_campaign_recipient_unique')
    table.index(['event_id', 'event_revision'], 'wa_campaign_recipient_event')
  })

  await db.schema.createTable('whatsapp_completion_cases', table => {
    table.increments('id')
    table.integer('batch_id').unsigned().notNullable().references('id').inTable('whatsapp_completion_batches').onDelete('CASCADE')
    table.string('case_token', 64).notNullable().unique()
    table.string('appointment_external_id', 64).notNullable()
    table.string('patient_external_id', 64).notNullable()
    table.string('patient_name', 180).notNullable()
    table.string('phone', 30).notNullable()
    table.json('completion_snapshot').notNullable()
    table.string('response_status', 20).notNullable().defaultTo('PENDING')
    table.string('response_external_event_id', 160).nullable().unique()
    table.json('survey_response').nullable()
    table.timestamp('responded_at').nullable()
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now())
    table.timestamp('updated_at').notNullable().defaultTo(db.fn.now())
    table.unique(['appointment_external_id'], 'wa_completion_appointment')
    table.index(['response_status', 'responded_at'], 'wa_completion_report')
  })

  await db.schema.createTable('whatsapp_automation_audit', table => {
    table.bigIncrements('id')
    table.string('event_type', 80).notNullable()
    table.string('entity_type', 40).notNullable()
    table.string('entity_id', 80).notNullable()
    table.integer('actor_user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
    table.string('external_event_id', 160).nullable()
    table.json('metadata').nullable()
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now())
    table.index(['entity_type', 'entity_id', 'created_at'], 'wa_audit_entity')
  })

  await db.schema.createTable('whatsapp_stenci_operations', table => {
    table.bigIncrements('id')
    table.string('operation_key', 160).notNullable()
    table.string('branch_id', 64).notNullable()
    table.string('kind', 40).notNullable()
    table.string('request_hash', 64).notNullable()
    table.string('status', 24).notNullable().defaultTo('PENDING')
    table.string('source_appointment_id', 64).nullable()
    table.string('result_appointment_id', 64).nullable()
    table.json('request_snapshot').nullable()
    table.json('result_snapshot').nullable()
    table.string('error_code', 80).nullable()
    table.integer('attempts').unsigned().notNullable().defaultTo(1)
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now())
    table.timestamp('updated_at').notNullable().defaultTo(db.fn.now())
    table.unique(['branch_id', 'operation_key'], 'wa_stenci_operation_key')
    table.index(['branch_id', 'kind', 'status'], 'wa_stenci_operation_status')
  })

  await db.schema.createTable('whatsapp_stenci_slot_locks', table => {
    table.string('target_key', 180).primary()
    table.string('operation_key', 160).notNullable()
    table.dateTime('expires_at').notNullable()
    table.timestamp('updated_at').notNullable().defaultTo(db.fn.now())
  })
}

exports.down = async function (db) {
  for (const table of [
    'whatsapp_stenci_slot_locks',
    'whatsapp_stenci_operations',
    'whatsapp_automation_audit',
    'whatsapp_completion_cases',
    'whatsapp_completion_batches',
    'whatsapp_campaign_recipients',
    'whatsapp_absence_responses',
    'whatsapp_absence_cases',
    'whatsapp_absence_batches',
    'whatsapp_events',
  ]) await db.schema.dropTableIfExists(table)
  await db.schema.alterTable('billing_stenci_appointments', table => {
    table.dropColumns('bundle_current', 'bundle_total')
  })
}
