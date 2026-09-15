const { addUsuarioIdColumn, shouldUseUnsignedUserId } = require('./_helpers/usuario')

const TABLE_NAME = 'procedimento_etapas'

const parseJsonArray = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch (err) {
      return []
    }
  }
  if (typeof value === 'object') {
    return Array.isArray(value) ? value : []
  }
  return []
}

const parseReferencias = (value) => {
  const array = parseJsonArray(value)
  return array
    .map((item) => {
      if (!item) return null
      if (typeof item === 'object') {
        const id = Number(item.id)
        if (!Number.isInteger(id)) return null
        return {
          id,
          nome: item.nome || '',
          referencia: item.referencia || null,
          usa_integracao: Boolean(item.usa_integracao),
        }
      }

      const id = Number(item)
      if (!Number.isInteger(id)) return null
      return {
        id,
        nome: '',
        referencia: String(item),
        usa_integracao: false,
      }
    })
    .filter((item) => item !== null)
}

exports.up = async function up(knex) {
  const useUnsignedUserId = await shouldUseUnsignedUserId(knex)
  const tableExists = await knex.schema.hasTable(TABLE_NAME)
  if (!tableExists) {
    await knex.schema.createTable(TABLE_NAME, (table) => {
      table.increments('id').primary()
      table.string('nome', 255).notNullable()
      table.json('procedimento_tipo_ids').notNullable()
      table.json('convenio_ids').notNullable()
      table.json('convenio_referencias')
      table.boolean('usa_integracao').notNullable().defaultTo(0)
      table.boolean('ativo').notNullable().defaultTo(1)
      addUsuarioIdColumn(table, useUnsignedUserId)
      table.timestamps(true, true)
      table.index(['usuario_id'], 'idx_etapas_usuario')
    })
    return
  }

  const hasNewColumns = await knex.schema.hasColumn(TABLE_NAME, 'procedimento_tipo_ids')
  if (hasNewColumns) {
    return
  }

  await knex.schema.dropTableIfExists(`${TABLE_NAME}_novo`)
  await knex.schema.createTable(`${TABLE_NAME}_novo`, (table) => {
    table.increments('id').primary()
    table.string('nome', 255).notNullable()
    table.json('procedimento_tipo_ids').notNullable()
    table.json('convenio_ids').notNullable()
    table.json('convenio_referencias')
    table.boolean('usa_integracao').notNullable().defaultTo(0)
    table.boolean('ativo').notNullable().defaultTo(1)
    addUsuarioIdColumn(table, useUnsignedUserId)
    table.timestamps(true, true)
    table.index(['usuario_id'], 'idx_etapas_usuario')
  })

  const rows = await knex(TABLE_NAME).select(
    'id',
    'nome',
    'procedimento_tipo_id',
    'convenio_id',
    'convenio_referencia',
    'usa_integracao',
    'ativo',
    'usuario_id',
    'created_at',
    'updated_at'
  )

  if (rows.length) {
    const mapped = rows.map((row) => {
      const tipoId = Number(row.procedimento_tipo_id)
      const convenioId = Number(row.convenio_id)
      const tipoIds = Number.isInteger(tipoId) ? [tipoId] : []
      const convenioIds = Number.isInteger(convenioId) ? [convenioId] : []

      let referencias = null
      if (row.convenio_referencia && convenioIds.length) {
        referencias = [
          {
            id: convenioIds[0],
            nome: '',
            referencia: row.convenio_referencia,
            usa_integracao: Boolean(row.usa_integracao),
          },
        ]
      }

      return {
        id: row.id,
        nome: row.nome,
        procedimento_tipo_ids: JSON.stringify(tipoIds),
        convenio_ids: JSON.stringify(convenioIds),
        convenio_referencias: referencias ? JSON.stringify(referencias) : null,
        usa_integracao: row.usa_integracao ?? 0,
        ativo: row.ativo ?? 1,
        usuario_id: row.usuario_id || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    })

    const chunkSize = 100
    for (let i = 0; i < mapped.length; i += chunkSize) {
      const chunk = mapped.slice(i, i + chunkSize)
      await knex(`${TABLE_NAME}_novo`).insert(chunk)
    }

    const maxId = Math.max(...mapped.map((item) => item.id))
    if (Number.isFinite(maxId)) {
      await knex.raw(`ALTER TABLE ?? AUTO_INCREMENT = ?`, [`${TABLE_NAME}_novo`, maxId + 1])
    }
  }

  await knex.schema.dropTable(TABLE_NAME)
  await knex.schema.renameTable(`${TABLE_NAME}_novo`, TABLE_NAME)
}

exports.down = async function down(knex) {
  const useUnsignedUserId = await shouldUseUnsignedUserId(knex)
  const tableExists = await knex.schema.hasTable(TABLE_NAME)
  if (!tableExists) {
    return
  }

  const hasOldColumn = await knex.schema.hasColumn(TABLE_NAME, 'procedimento_tipo_id')
  if (hasOldColumn) {
    return
  }

  await knex.schema.dropTableIfExists(`${TABLE_NAME}_antiga`)
  await knex.schema.createTable(`${TABLE_NAME}_antiga`, (table) => {
    table.increments('id').primary()
    table.string('nome', 255).notNullable()
    table
      .integer('procedimento_tipo_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('procedimento_tipos')
      .onUpdate('CASCADE')
    table
      .integer('convenio_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('convenios')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
    table.string('convenio_referencia', 120).notNullable()
    table.boolean('usa_integracao').notNullable().defaultTo(0)
    table.boolean('ativo').notNullable().defaultTo(1)
    addUsuarioIdColumn(table, useUnsignedUserId)
    table.timestamps(true, true)
    table.unique(['convenio_id', 'nome'], 'uq_etapa_convenio_nome')
    table.index(['procedimento_tipo_id'], 'idx_etapas_tipo')
    table.index(['convenio_referencia'], 'idx_etapas_convenio_ref')
    table.index(['usuario_id'], 'fk_etapas_usuario')
  })

  const rows = await knex(TABLE_NAME).select(
    'id',
    'nome',
    'procedimento_tipo_ids',
    'convenio_ids',
    'convenio_referencias',
    'usa_integracao',
    'ativo',
    'usuario_id',
    'created_at',
    'updated_at'
  )

  if (rows.length) {
    const mapped = rows.map((row) => {
      const tipoIds = parseJsonArray(row.procedimento_tipo_ids)
      const convenioIds = parseJsonArray(row.convenio_ids)
      const referencias = parseReferencias(row.convenio_referencias)

      const tipoId = tipoIds.length ? Number(tipoIds[0]) : null
      const convenioId = convenioIds.length ? Number(convenioIds[0]) : null

      if (!Number.isInteger(tipoId)) {
        throw new Error(
          'Não foi possível determinar um procedimento_tipo_id válido ao reverter a migração de procedimento_etapas'
        )
      }

      if (!Number.isInteger(convenioId)) {
        throw new Error(
          'Não foi possível determinar um convenio_id válido ao reverter a migração de procedimento_etapas'
        )
      }

      let referencia = '0'
      if (referencias.length) {
        const encontrada = referencias.find((ref) => Number(ref.id) === convenioId)
        const referenciaObj = encontrada || referencias[0]
        if (referenciaObj && referenciaObj.referencia) {
          referencia = String(referenciaObj.referencia)
        }
      } else if (convenioId) {
        referencia = String(convenioId)
      }

      return {
        id: row.id,
        nome: row.nome,
        procedimento_tipo_id: tipoId,
        convenio_id: convenioId,
        convenio_referencia: referencia,
        usa_integracao: row.usa_integracao ?? 0,
        ativo: row.ativo ?? 1,
        usuario_id: row.usuario_id || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    })

    const chunkSize = 100
    for (let i = 0; i < mapped.length; i += chunkSize) {
      const chunk = mapped.slice(i, i + chunkSize)
      await knex(`${TABLE_NAME}_antiga`).insert(chunk)
    }

    const maxId = Math.max(...mapped.map((item) => item.id))
    if (Number.isFinite(maxId)) {
      await knex.raw(`ALTER TABLE ?? AUTO_INCREMENT = ?`, [`${TABLE_NAME}_antiga`, maxId + 1])
    }
  }

  await knex.schema.dropTable(TABLE_NAME)
  await knex.schema.renameTable(`${TABLE_NAME}_antiga`, TABLE_NAME)
}
