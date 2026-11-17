const express = require('express');
const rateLimit = require('express-rate-limit');
const { patientAccess, patientPortal } = require('../services/patientPortal');
function createPatientPortal(db) {
  const privateRouter = express.Router(), publicRouter = express.Router();
  const noStore = (_req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive' }); next(); };
  const respond = action => async (req, res) => {
    try { res.json(await action(req)); }
    catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível acessar o app do paciente. Tente novamente.' }); }
  };
  privateRouter.use(noStore, require('../middleware/auth'), require('../middleware/permission').modulePermission('guide_processes'));
  privateRouter.post('/treatments/:id/access', respond(req => patientAccess(db, req.params.id, req.user.id)));
  publicRouter.use(noStore, rateLimit({ windowMs: 60000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Aguarde um minuto antes de consultar novamente.' } }));
  // The opaque URL code is sent in the body, never in an API URL or an administrative JWT.
  publicRouter.post('/view', respond(req => patientPortal(db, req.body?.code, req.body?.treatmentId)));
  return { privateRouter, publicRouter };
}
module.exports = { createPatientPortal };
