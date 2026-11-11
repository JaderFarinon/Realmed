exports.up = async (db) => {
  if (!(await db.schema.hasTable('physiotherapist_user_links'))) {
    await db.schema.createTable('physiotherapist_user_links', (t) => {
      t.integer('user_id').unsigned().primary().references('id').inTable('users').onDelete('CASCADE')
      t.integer('professional_id').unsigned().notNullable().unique().references('id').inTable('professionals').onDelete('RESTRICT')
      t.integer('updated_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
      t.timestamp('updated_at').notNullable().defaultTo(db.fn.now())
    })
  }
  if (!(await db.schema.hasTable('physiotherapist_face_biometrics'))) {
    await db.schema.createTable('physiotherapist_face_biometrics', (t) => {
      t.integer('user_id').unsigned().primary().references('id').inTable('users').onDelete('CASCADE')
      t.text('encrypted_templates', 'mediumtext').notNullable()
      t.string('iv', 24).notNullable()
      t.string('auth_tag', 32).notNullable()
      t.string('algorithm_version', 40).notNullable().defaultTo('human-faceres-3.3.6')
      t.integer('enrolled_by').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT')
      t.timestamp('created_at').notNullable().defaultTo(db.fn.now())
      t.timestamp('updated_at').notNullable().defaultTo(db.fn.now())
    })
  }
}

exports.down = async () => {} // Keep biometric and identity records unless handled through an audited removal flow.
