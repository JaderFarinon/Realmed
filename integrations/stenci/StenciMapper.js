class StenciMapper {
  // Os nomes de campos externos dependem do HAR; o chamador fornece o contrato descoberto.
  static patient(externalPatient, fieldMap) {
    if (!fieldMap?.id) throw new Error('Mapeamento do identificador Stenci não configurado.')
    const read = (field) => fieldMap[field] ? externalPatient[fieldMap[field]] : undefined
    const externalId = read('id')
    if (externalId == null || String(externalId).trim() === '') throw new Error('Paciente Stenci sem identificador externo.')
    return {
      external_source: 'STENCI', external_id: String(externalId), full_name: read('name'),
      cpf: read('cpf'), birth_date: read('birthDate'), phone: read('phone'), email: read('email'),
    }
  }
}

module.exports = StenciMapper
