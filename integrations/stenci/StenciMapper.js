class StenciMapper {
  static userIdentity(me, loginUsername) {
    if (!me || typeof me !== 'object' || Array.isArray(me)) throw new Error('Resposta de usuário Stenci inválida.')
    const source = me.user && typeof me.user === 'object' ? me.user : me
    // The Stenci user id is the durable external key. Identity values (such as CPF)
    // are mutable account attributes and are used only for first-login reconciliation.
    const externalId = source.id ?? source.identityId
    if (externalId == null || String(externalId).trim() === '') throw new Error('Usuário Stenci sem identificador estável.')
    return {
      stenci_user_id: String(externalId),
      stenci_username: source.identity?.value || source.username || source.login || loginUsername || null,
      identity: source.identity?.value == null ? null : String(source.identity.value),
      name: source.name || source.fullName || null,
      email: source.email || null,
    }
  }
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
