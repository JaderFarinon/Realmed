const StenciError = require('./StenciError')

class StenciReconciliationService {
  reconcileAssessments() { throw new StenciError('Conciliação de avaliações aguarda o contrato do Stenci.', { code: 'STENCI_RECONCILIATION_NOT_CONFIGURED', status: 501 }) }
  reconcileCompletedTreatments() { throw new StenciError('Conciliação de tratamentos aguarda o contrato do Stenci.', { code: 'STENCI_RECONCILIATION_NOT_CONFIGURED', status: 501 }) }
}

module.exports = StenciReconciliationService
