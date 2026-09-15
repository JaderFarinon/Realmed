exports.up = async function (knex) {
  const addColumnIfMissing = async (columnName, callback) => {
    const exists = await knex.schema.hasColumn('procedimentos', columnName)
    if (!exists) {
      await knex.schema.alterTable('procedimentos', callback)
    }
  }

  await addColumnIfMissing('codigo_clinic', (table) => {
    table.string('codigo_clinic', 50)
  })
  await addColumnIfMissing('percentual', (table) => {
    table.decimal('percentual', 10, 4)
  })
  await addColumnIfMissing('porte', (table) => {
    table.string('porte', 50)
  })
  await addColumnIfMissing('valor', (table) => {
    table.decimal('valor', 14, 4)
  })
  await addColumnIfMissing('custo_operacional', (table) => {
    table.decimal('custo_operacional', 14, 4)
  })
  await addColumnIfMissing('numero_auxiliares', (table) => {
    table.integer('numero_auxiliares')
  })
  await addColumnIfMissing('portes_anestesicos', (table) => {
    table.decimal('portes_anestesicos', 14, 4)
  })
  await addColumnIfMissing('filmes', (table) => {
    table.decimal('filmes', 14, 4)
  })
  await addColumnIfMissing('incidencia', (table) => {
    table.string('incidencia', 100)
  })
  await addColumnIfMissing('unidade', (table) => {
    table.string('unidade', 50)
  })
  await addColumnIfMissing('exibir', (table) => {
    table.boolean('exibir').defaultTo(true)
  })
  await addColumnIfMissing('especialidade', (table) => {
    table.string('especialidade', 150)
  })
  await addColumnIfMissing('exibir_inter', (table) => {
    table.boolean('exibir_inter').defaultTo(false)
  })
  await addColumnIfMissing('destacar', (table) => {
    table.boolean('destacar').defaultTo(false)
  })
  await addColumnIfMissing('modalidade_wtt', (table) => {
    table.string('modalidade_wtt', 100)
  })
}

exports.down = async function (knex) {
  const dropColumnIfExists = async (columnName) => {
    const exists = await knex.schema.hasColumn('procedimentos', columnName)
    if (exists) {
      await knex.schema.alterTable('procedimentos', (table) => {
        table.dropColumn(columnName)
      })
    }
  }

  await dropColumnIfExists('modalidade_wtt')
  await dropColumnIfExists('destacar')
  await dropColumnIfExists('exibir_inter')
  await dropColumnIfExists('especialidade')
  await dropColumnIfExists('exibir')
  await dropColumnIfExists('unidade')
  await dropColumnIfExists('incidencia')
  await dropColumnIfExists('filmes')
  await dropColumnIfExists('portes_anestesicos')
  await dropColumnIfExists('numero_auxiliares')
  await dropColumnIfExists('custo_operacional')
  await dropColumnIfExists('valor')
  await dropColumnIfExists('porte')
  await dropColumnIfExists('percentual')
  await dropColumnIfExists('codigo_clinic')
}
