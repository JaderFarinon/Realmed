const StenciMapper = require('./StenciMapper')

async function syncPatientFromStenci(knex, externalPatient) {
  const mapped = StenciMapper.patient(externalPatient), mappedInsurance = StenciMapper.insurance(externalPatient)
  if (!mapped.full_name) throw Object.assign(new Error('Paciente Stenci sem nome para criação.'), { status: 422 })
  return knex.transaction(async (trx) => {
    const patientData = Object.fromEntries(Object.entries(mapped).filter(([key]) => key !== 'metadata'))
    let patient = await trx('patients').where({ external_source: 'STENCI', external_id: mapped.external_id }).first()
    let created = false
    if (patient) {
      const allowed = ['full_name', 'cpf', 'birth_date', 'phone', 'email'], updates = {}
      for (const field of allowed) if (mapped[field] != null) updates[field] = mapped[field]
      if (Object.keys(updates).length) await trx('patients').where({ id: patient.id }).update(updates)
      patient = await trx('patients').where({ id: patient.id }).first()
    } else {
      const [patientId] = await trx('patients').insert(patientData); patient = await trx('patients').where({ id: patientId }).first(); created = true
    }

    let patientInsurance = null
    if (mappedInsurance?.name) {
      let provider = await trx('insurance_providers').where({ external_source: 'STENCI', external_id: mappedInsurance.external_id }).first()
      if (!provider) { const [providerId] = await trx('insurance_providers').insert({ name: mappedInsurance.name, external_source: 'STENCI', external_id: mappedInsurance.external_id, active: true }); provider = await trx('insurance_providers').where({ id: providerId }).first() }
      else if (provider.name !== mappedInsurance.name || !provider.active) { await trx('insurance_providers').where({ id: provider.id }).update({ name: mappedInsurance.name, active: true }); provider = await trx('insurance_providers').where({ id: provider.id }).first() }
      const insuranceData = { card_number: mappedInsurance.card_number, card_expiration: mappedInsurance.card_expiration, plan: mappedInsurance.plan, active: true }
      patientInsurance = await trx('patient_insurances').where({ patient_id: patient.id, insurance_provider_id: provider.id }).first()
      if (patientInsurance) await trx('patient_insurances').where({ id: patientInsurance.id }).update(insuranceData)
      else { const [insuranceId] = await trx('patient_insurances').insert({ ...insuranceData, patient_id: patient.id, insurance_provider_id: provider.id }); patientInsurance = { id: insuranceId } }
      patientInsurance = await trx('patient_insurances as pi').join('insurance_providers as ip', 'ip.id', 'pi.insurance_provider_id').where('pi.id', patientInsurance.id).select('pi.*', 'ip.name as insurance_name').first()
    }
    return { patient: { ...patient, metadata: mapped.metadata }, patient_insurance: patientInsurance, created }
  })
}
module.exports = { syncPatientFromStenci }
