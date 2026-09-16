const text = (value, max = 180) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null

async function syncInsurance(trx, insurance, patientId) {
  const externalId = text(insurance?.externalId, 120), name = text(insurance?.name)
  if (!externalId || !name) throw Object.assign(new Error('Convênio Stenci inválido.'), { status: 422 })
  let provider = await trx('insurance_providers').where({ external_source: 'STENCI', external_id: externalId }).first()
  if (!provider) {
    const [id] = await trx('insurance_providers').insert({ external_source: 'STENCI', external_id: externalId, name, active: true, authorization_type: 'PRE_AUTHORIZATION' })
    provider = { id }
  } else await trx('insurance_providers').where({ id: provider.id }).update({ name, active: true })
  const values = { plan: text(insurance.planName, 120), plan_external_id: text(insurance.planExternalId, 120), card_number: text(insurance.cardNumber, 80), card_expiration: text(insurance.cardExpiration, 10), active: true }
  let link = await trx('patient_insurances').where({ patient_id: patientId, insurance_provider_id: provider.id }).first()
  if (link) await trx('patient_insurances').where({ id: link.id }).update(values)
  else { const [id] = await trx('patient_insurances').insert({ ...values, patient_id: patientId, insurance_provider_id: provider.id }); link = { id } }
  return link.id
}

async function syncProfessional(trx, item, expectedCouncil) {
  const externalId = text(item?.externalId, 120), name = text(item?.name)
  const councils = Array.isArray(item?.councils) ? item.councils : []
  const council = councils.find((entry) => String(entry?.name || '').toUpperCase() === expectedCouncil)
  if (!externalId || !name || !council || !text(council.record, 40) || !text(council.state, 2)) throw Object.assign(new Error(`Profissional Stenci sem ${expectedCouncil} válido.`), { status: 422 })
  const values = { full_name: name, type: expectedCouncil === 'CRM' ? 'DOCTOR' : 'PHYSIOTHERAPIST', council: expectedCouncil, council_number: text(council.record, 40), state: text(council.state, 2).toUpperCase(), identity_external_id: text(item.identityId, 120), specialties: JSON.stringify(Array.isArray(item.specialties) ? item.specialties : []), signature: text(item.signature, 65535), signature_image_url: text(item.signatureImageUrl, 500), active: true }
  let professional = await trx('professionals').where({ external_source: 'STENCI', external_id: externalId }).first()
  if (professional) await trx('professionals').where({ id: professional.id }).update(values)
  else { const [id] = await trx('professionals').insert({ ...values, external_source: 'STENCI', external_id: externalId }); professional = { id } }
  return professional.id
}

module.exports = { syncInsurance, syncProfessional }
