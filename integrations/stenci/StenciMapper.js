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
  static insuranceCatalog(item) {
    if (!item?.id || !item?.name) return null
    return { externalId: String(item.id), name: String(item.name), type: item.type || null, imageUrl: item.imageUrl || null }
  }
  static insurancePlan(item) {
    if (!item?.id || !item?.plan?.id || !item.plan.name) return null
    return { insuranceExternalId: String(item.id), insuranceName: item.name || null, planExternalId: String(item.plan.id), planName: item.customName || item.plan.name, originalPlanName: item.plan.name, type: item.plan.type || null, record: item.plan.record || null }
  }
  static professional(item) {
    if (!item?.id || !item?.name) return null
    const details = item.professional && typeof item.professional === 'object' ? item.professional : {}
    const councils = Array.isArray(details.councils) ? details.councils.filter(Boolean).map((c) => ({ name: c.name || null, state: c.state || null, record: c.record || null })) : []
    const specialties = Array.isArray(details.specialties) ? details.specialties.filter(Boolean).map((s) => ({ code: s.code || null, name: s.name || null, rqe: s.rqe || null })) : []
    return { externalId: String(item.id), identityId: item.identityId == null ? null : String(item.identityId), name: String(item.name), active: details.active === true, councils, specialties, title: details.title || null, signature: details.signature || null, signatureImageUrl: details.signatureImageUrl || null }
  }
}
module.exports = StenciMapper
