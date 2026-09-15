const OLD_TABLE = 'solicitacao_etapas'
const NEW_TABLE = 'esteira_procedimento_etapas'

async function renameTable(knex, from, to) {
  const hasFrom = await knex.schema.hasTable(from)
  const hasTo = await knex.schema.hasTable(to)

  if (hasFrom && !hasTo) {
    await knex.schema.renameTable(from, to)
    return true
  }

  if (!hasFrom && hasTo) {
    return false
  }

  return false
}

exports.up = async function up(knex) {
  await renameTable(knex, OLD_TABLE, NEW_TABLE)
}

exports.down = async function down(knex) {
  await renameTable(knex, NEW_TABLE, OLD_TABLE)
}
