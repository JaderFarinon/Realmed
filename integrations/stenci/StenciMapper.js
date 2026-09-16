class StenciMapper {
  static patient(item) {
    if (!item || item.id == null || String(item.id).trim() === '') throw new Error('Paciente Stenci sem identificador externo.')
    return {
      external_source: 'STENCI', external_id: String(item.id), full_name: item.name || null,
      cpf: item.identity?.type === 'cpf' ? item.identity.value || null : null,
      birth_date: item.birthDate || null, phone: item.cellphone || item.phone || null, email: item.email || null,
      metadata: { identityId: item.identityId || null, gender: item.gender || null, socialName: item.socialName || null, address: item.addresses?.[0] || null, cns: item.patient?.cns || null },
    }
  }
  static insurance(item) {
    const insurance = item?.patient?.insurance
    if (!insurance?.id) return null
    return { external_source: 'STENCI', external_id: String(insurance.id), name: insurance.name || null, plan_id: insurance.planId || null, plan: insurance.plan?.name || null, card_number: insurance.record || null, card_expiration: insurance.validity || null }
  }
}
module.exports = StenciMapper
