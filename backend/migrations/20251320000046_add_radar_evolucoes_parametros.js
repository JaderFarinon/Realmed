const TABLE_NAME = 'parametros_esteira_procedimento'

const PARAMS = [
  {
    parametro: 'radar_evolucoes_palavras',
    valor: 'fratura, ruptura, tumor, lesão, hérnia, osteossíntese',
  },
  {
    parametro: 'radar_evolucoes_excluir',
    valor: 'sem indicação cirúrgica, dor leve, melhora clínica, alta clínica',
  },
  {
    parametro: 'radar_evolucoes_periodo',
    valor: '90',
  },
]

exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME)
  if (!exists) {
    return undefined
  }

  for (const param of PARAMS) {
    const existente = await knex(TABLE_NAME)
      .select('id')
      .where({ parametro: param.parametro })
      .first()

    if (!existente) {
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
