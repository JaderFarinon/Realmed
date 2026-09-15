const TABLE_NAME = 'parametros_esteira_procedimento'

const PARAMS = [
  {
    parametro: 'intervalo_envio_notificacoes_alertas_tarefas',
    valor: '2',
  },
  {
    parametro: 'intervalo_envio_notificacoes_alertas_solicitacoes',
    valor: '5',
  },
]

exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME)
  if (!exists) {
    return undefined
  }

  for (const param of PARAMS) {
    const [rows] = await knex(TABLE_NAME)
      .select('id')
      .where({ parametro: param.parametro })
      .limit(1)

    if (!rows || rows.length === 0) {
      await knex(TABLE_NAME).insert({ ...param })
    }
  }

  return undefined
}

exports.down = async function down(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME)
  if (!exists) {
    return undefined
  }

  await knex(TABLE_NAME)
    .whereIn(
      'parametro',
      PARAMS.map((item) => item.parametro),
    )
    .del()

  return undefined
}
