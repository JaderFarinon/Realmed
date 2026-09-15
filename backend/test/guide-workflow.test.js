const test = require('node:test')
const assert = require('node:assert/strict')

Object.assign(process.env, { DB_HOST: 'localhost', DB_USER: 'test', DB_PASS: 'test', DB_NAME: 'test', DB_PORT: '3306' })
const { documentTransition } = require('../services/guideWorkflow')

test('a new or incomplete process remains in preparation', () => {
  assert.deepEqual(documentTransition(false, 'NOT_READY'), { document_status: 'INCOMPLETE', authorization_status: 'NOT_READY' })
  assert.deepEqual(documentTransition(false, 'READY'), { document_status: 'INCOMPLETE', authorization_status: 'NOT_READY' })
})

test('the last required document automatically exposes the process to billing', () => {
  assert.deepEqual(documentTransition(true, 'NOT_READY'), { document_status: 'COMPLETE', authorization_status: 'READY' })
})

test('document replacement does not reset an authorization already in progress', () => {
  assert.deepEqual(documentTransition(true, 'IN_PROGRESS'), { document_status: 'COMPLETE', authorization_status: 'IN_PROGRESS' })
})
