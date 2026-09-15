const CAC_TABLE = 'esteira_perfis_cac'
const SECRETARIA_TABLE = 'esteira_perfis_secretarias'
const LEGACY_CAC_TABLE = 'esteira_procedimento_cac_users'
const LEGACY_SECRETARIA_TABLE = 'esteira_procedimento_secretarias'

exports.seed = async function seed(knex) {
  const hasCacTable = await knex.schema.hasTable(CAC_TABLE)
  const hasSecretariaTable = await knex.schema.hasTable(SECRETARIA_TABLE)
  const legacyCacExists = await knex.schema.hasTable(LEGACY_CAC_TABLE)
  const legacySecretariaExists = await knex.schema.hasTable(LEGACY_SECRETARIA_TABLE)

  if (!hasCacTable && !hasSecretariaTable) {
    return undefined
  }

  return knex.transaction(async (trx) => {
    if (hasCacTable) {
      if (legacyCacExists) {
        const legacyUsers = await trx(LEGACY_CAC_TABLE).distinct('user_id')
        if (legacyUsers.length > 0) {
          const insertRows = legacyUsers.map((row) => ({
            user_id: row.user_id,
            is_coordenacao: false,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          }))

          if (insertRows.length > 0) {
            await trx(CAC_TABLE).insert(insertRows).onConflict('user_id').ignore()
          }
        }
      }
    }

    if (hasSecretariaTable) {
      if (legacySecretariaExists) {
        const legacyUsers = await trx(LEGACY_SECRETARIA_TABLE).distinct('user_id')
        if (legacyUsers.length > 0) {
          const insertRows = legacyUsers.map((row) => ({
            user_id: row.user_id,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          }))

          if (insertRows.length > 0) {
            await trx(SECRETARIA_TABLE).insert(insertRows).onConflict('user_id').ignore()
          }
        }
      }
    }
  })
}
