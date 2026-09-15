const { addUserReferenceColumn, shouldUseUnsignedUserId } = require('./_helpers/usuario')

const SORTEIOS_TABLE = 'sorteios'
const SORTEIO_ENTRADAS_TABLE = 'sorteio_entradas'
const SORTEIO_RESULTADOS_TABLE = 'sorteio_resultados'

exports.up = async function up(knex) {
  const useUnsignedUserId = await shouldUseUnsignedUserId(knex)

  const hasSorteios = await knex.schema.hasTable(SORTEIOS_TABLE)
  if (!hasSorteios) {
    await knex.schema.createTable(SORTEIOS_TABLE, (table) => {
      table.increments('id').primary()
      table.string('titulo', 180).notNullable()
      table.string('tipo', 20).notNullable()
      table.integer('quantidade_resultados').unsigned().notNullable().defaultTo(1)
      table.string('status', 30).notNullable().defaultTo('pendente')
      table.integer('numero_inicio').nullable()
      table.integer('numero_fim').nullable()

      const createdBy = addUserReferenceColumn(table, 'created_by', useUnsignedUserId)
      createdBy.nullable()

      const updatedBy = addUserReferenceColumn(table, 'updated_by', useUnsignedUserId)
      updatedBy.nullable()

      table.timestamp('started_at').nullable()
      table.timestamp('finished_at').nullable()
      table.timestamps(true, true)

      table.index(['tipo'], 'idx_sorteios_tipo')
      table.index(['status'], 'idx_sorteios_status')
      table.index(['created_by'], 'idx_sorteios_created_by')
      table.index(['created_at'], 'idx_sorteios_created_at')
    })
  }

  const hasEntradas = await knex.schema.hasTable(SORTEIO_ENTRADAS_TABLE)
  if (!hasEntradas) {
    await knex.schema.createTable(SORTEIO_ENTRADAS_TABLE, (table) => {
      table.increments('id').primary()
      table.integer('sorteio_id').unsigned().notNullable()
      table
        .foreign('sorteio_id', 'fk_sorteio_entradas_sorteio')
        .references('id')
        .inTable(SORTEIOS_TABLE)
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.string('valor', 255).notNullable()
      table.integer('ordem').unsigned().nullable()
      table.boolean('ativo').notNullable().defaultTo(true)

      table.timestamp('created_at').defaultTo(knex.fn.now())

      table.unique(['sorteio_id', 'valor'], 'uniq_sorteio_entradas_valor')
      table.index(['sorteio_id'], 'idx_sorteio_entradas_sorteio')
      table.index(['valor'], 'idx_sorteio_entradas_valor')
    })
  }

  const hasResultados = await knex.schema.hasTable(SORTEIO_RESULTADOS_TABLE)
  if (!hasResultados) {
    await knex.schema.createTable(SORTEIO_RESULTADOS_TABLE, (table) => {
      table.increments('id').primary()
      table.integer('sorteio_id').unsigned().notNullable()
      table
        .foreign('sorteio_id', 'fk_sorteio_resultados_sorteio')
        .references('id')
        .inTable(SORTEIOS_TABLE)
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.integer('entrada_id').unsigned().nullable()
      table
        .foreign('entrada_id', 'fk_sorteio_resultados_entrada')
        .references('id')
        .inTable(SORTEIO_ENTRADAS_TABLE)
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      table.string('valor', 255).notNullable()
      table.integer('ordem').unsigned().notNullable()

      table.timestamp('created_at').defaultTo(knex.fn.now())

      table.index(['sorteio_id'], 'idx_sorteio_resultados_sorteio')
      table.index(['ordem'], 'idx_sorteio_resultados_ordem')
    })
  }
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists(SORTEIO_RESULTADOS_TABLE)
  await knex.schema.dropTableIfExists(SORTEIO_ENTRADAS_TABLE)
  await knex.schema.dropTableIfExists(SORTEIOS_TABLE)
}
