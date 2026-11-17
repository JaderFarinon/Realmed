const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { validCode, seal, unseal } = require('../services/patientPortal');
test('patient portal accepts only opaque 256-bit URL codes, never patient IDs', () => {
  assert.ok(validCode(crypto.randomBytes(32).toString('base64url')));
  for (const value of [null, 17, '17', '../17', 'a'.repeat(44), 'a'.repeat(42), 'a'.repeat(42) + '/', {}]) assert.equal(validCode(value), false);
});
test('stable portal token envelope binds the patient and rejects tampering', () => {
  const old = process.env.PATIENT_PORTAL_KEY; process.env.PATIENT_PORTAL_KEY = 'synthetic-test-portal-key';
  try {
    const code = crypto.randomBytes(32).toString('base64url'), envelope = seal(code, 12);
    assert.ok(!envelope.includes(code)); assert.equal(unseal(envelope, 12), code); assert.throws(() => unseal(envelope, 13));
    const changed = JSON.parse(envelope); changed.tag = Buffer.alloc(16).toString('base64'); assert.throws(() => unseal(JSON.stringify(changed), 12));
  } finally { if (old === undefined) delete process.env.PATIENT_PORTAL_KEY; else process.env.PATIENT_PORTAL_KEY = old; }
});
test('patient PWA manifest launches the same individual link and navigation never caches it', async () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path'), handlers = {}, writes = [];
  const self = { location: { origin: 'https://realmed.example' }, addEventListener: (name, fn) => { handlers[name] = fn; } };
  const context = { self, URL, Response, Promise, caches: { open: async () => ({ put: (...args) => writes.push(args), match: async () => new Response('shell') }) }, fetch: async () => new Response('shell') };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../frontend/public/sw.js'), 'utf8'), context);
  const code = 'a'.repeat(43), target = '/paciente/' + code; let result;
  handlers.fetch({ request: { method: 'GET', url: self.location.origin + target + '/manifest.webmanifest' }, respondWith: p => { result = p; } });
  const response = await result, manifest = await response.json();
  assert.equal(manifest.start_url, target); assert.equal(manifest.id, target); assert.equal(manifest.scope, '/paciente/'); assert.equal(response.headers.get('cache-control'), 'no-store');
  handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: self.location.origin + target }, respondWith: p => { result = p; } });
  assert.equal((await result).status, 200); assert.equal(writes.length, 0);
});
