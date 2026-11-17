const express = require('express');
const { readPatientPreview } = require('../services/patientPreview');
function createPatientPreviewRouter(db) {
  const router = express.Router();
  router.use(require('../middleware/auth'), require('../middleware/permission').modulePermission('guide_processes'));
  router.get('/:id', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try { res.json(await readPatientPreview(db, req.params.id)); }
    catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível carregar a visão do paciente.' }); }
  });
  return router;
}
module.exports = { createPatientPreviewRouter };
