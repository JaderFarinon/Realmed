const StenciMapper = require('./StenciMapper')

async function syncPatientFromStenci(knex, externalPatient, fieldMap) {
  const mapped = StenciMapper.patient(externalPatient, fieldMap)
  return knex.transaction(async (trx) => {
    const existing = await trx('patients').where({ external_source: 'STENCI', external_id: mapped.external_id }).first()
    if (existing) {
      // Conservador por padrão: completa somente campos vazios e nunca substitui edições internas.
      const allowed = ['full_name', 'cpf', 'birth_date', 'phone', 'email']
      const additions = Object.fromEntries(allowed.filter((field) => !existing[field] && mapped[field] != null).map((field) => [field, mapped[field]]))
      if (Object.keys(additions).length) await trx('patients').where({ id: existing.id }).update(additions)
      return { ...(await trx('patients').where({ id: existing.id }).first()), created: false }
    }
    if (!mapped.full_name) throw new Error('Paciente Stenci sem nome para criação.')
    const [id] = await trx('patients').insert(mapped)
    return { ...(await trx('patients').where({ id }).first()), created: true }
  })
}

module.exports = { syncPatientFromStenci }
