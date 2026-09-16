const test = require('node:test')
const assert = require('node:assert/strict')
const { PDFDocument } = require('pdf-lib')
const { evaluationValues, generatePhysiotherapyEvaluation } = require('../services/physiotherapyEvaluationService')

test('gera ficha de duas páginas mesmo com somente o paciente', async () => {
  const buffer = await generatePhysiotherapyEvaluation({ patient_name: 'João Ávila', patient_cpf: null })
  const pdf = await PDFDocument.load(buffer)
  assert.equal(pdf.getPageCount(), 2)
  assert.ok(buffer.subarray(0, 5).equals(Buffer.from('%PDF-')))
})

test('mapeia dados completos, datas brasileiras e horários diferentes', () => {
  const values = evaluationValues({
    patient_name: 'Maria', birth_date: '1990-03-21', card_expiration: '2027-12-31',
    requested_sessions: 10, expected_start_date: '2026-09-20',
    treatment_days: JSON.stringify([{ day: 'MONDAY', enabled: true, time: '08:00' }, { day: 'WEDNESDAY', enabled: true, time: '14:30' }]),
  })
  assert.equal(values.PATIENT_BIRTH_DATE, '21/03/1990')
  assert.equal(values.INSURANCE_VALIDITY, '31/12/2027')
  assert.equal(values.schedule.MONDAY.time, '08:00')
  assert.equal(values.schedule.WEDNESDAY.time, '14:30')
  assert.equal(values.SESSIONS_PER_WEEK, '2')
  assert.equal(values.TOTAL_SESSIONS, '10')
})

test('mantém campos desconhecidos em branco', () => {
  const values = evaluationValues({ patient_name: 'Paciente sem cadastro completo' })
  assert.equal(values.PATIENT_CPF, '')
  assert.equal(values.INSURANCE_NAME, '')
  assert.equal(values.PHYSIOTHERAPIST_NAME, '')
  assert.deepEqual(values.schedule, {})
})
