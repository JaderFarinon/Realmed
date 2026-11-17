const crypto = require('node:crypto');
const fail = (message, status = 403) => Object.assign(new Error(message), { status, code: 'PHYSIO_PREVIEW_UNAVAILABLE' });

async function previewIdentity(db, userId, professionalId) {
  const admin = await db('users').where({ id: userId, status: 'active' }).whereIn('role', ['admin', 'masteradmin']).first('id');
  if (!admin) throw fail('A visualização do fisioterapeuta está disponível somente para administradores ativos.');
  const professional = await db('professionals').where({ id: professionalId, active: 1, type: 'PHYSIOTHERAPIST' }).whereRaw('UPPER(council) = ?', ['CREFITO']).first('id', 'full_name', 'council_number', 'state');
  if (!professional) throw fail('Selecione um fisioterapeuta ativo com cadastro CREFITO.', 404);
  const schedules = await db('physiotherapy_rotation_agendas').where({ professional_id: professional.id }).select('schedule_id', 'schedule_name');
  return { user: { id: admin.id, professional_name: professional.full_name, council_number: professional.council_number, state: professional.state }, professionalId: professional.id, schedules };
}

// Kept apart from the administrator's own Stenci session and never sent to the browser.
function createAdminPreviewAccess({ db, sessionStore, createSession, now = Date.now }) {
  const sessions = new Map(), pending = new Map();
  function prune() {
    for (const [key, value] of sessions) if (!sessionStore.get(value.sid)) sessions.delete(key);
  }
  const readAllowed = path => /^\/(me|agenda|production|patients\/search)$/.test(path) || /^\/agenda\/[a-zA-Z0-9_-]{1,100}(\/(clinical|evaluation))?$/.test(path);
  async function middleware(req, res, next) {
    try {
      const path = req.path.replace(/\/$/, '') || '/';
      if (!(req.method === 'GET' && readAllowed(path) || req.method === 'POST' && (path === '/session' || /^\/agenda\/[a-zA-Z0-9_-]{1,100}\/clinical\/preview$/.test(path)))) throw fail('Este acesso permite somente visualizar o app e preparar prévias, sem gravar atendimentos.');
      if (!/^[1-9]\d*$/.test(req.params.professionalId)) throw fail('Profissional inválido.', 400);
      const professionalId = Number(req.params.professionalId);
      if (!Number.isSafeInteger(professionalId)) throw fail('Profissional inválido.', 400);
      const identity = await previewIdentity(db, req.user.id, professionalId);
      const key = crypto.createHash('sha256').update(req.get('Authorization')).update(':' + professionalId).digest('hex');
      prune();
      req.physioAdminPreview = true;
      req.physiotherapist = { id: req.user.id, professional_id: professionalId, professional_name: identity.user.professional_name, face_enrolled: false };
      req.physioSchedules = identity.schedules;
      req.physioSid = sessions.get(key)?.sid;
      req.revalidatePhysioPreview = async () => {
        if (Number(req.user.exp) * 1000 <= now()) throw fail('A sessão administrativa expirou. Entre novamente.');
        const fresh = await previewIdentity(db, req.user.id, professionalId);
        if (identity.schedules.some(s => !fresh.schedules.some(f => f.schedule_id === s.schedule_id))) throw fail('O vínculo da agenda mudou. Abra novamente a visualização.');
      };
      req.ensurePhysioPreview = async () => {
        const current = sessionStore.get(sessions.get(key)?.sid);
        if (current && (current.mode === 'physio-development' || sessionStore.hasCredentials(sessions.get(key).sid))) {
          req.physioSid = sessions.get(key).sid;
          return;
        }
        if (!pending.has(key)) {
          if (sessions.size + pending.size >= 1000) throw fail('Há muitas visualizações abertas. Tente novamente em alguns minutos.', 503);
          const creating = (async () => {
            let sid;
            try {
              await req.revalidatePhysioPreview();
              ({ sid } = await createSession({ userId: req.user.id, professionalId, sessionStore }));
              const session = sessionStore.get(sid);
              if (!session) throw fail('Não foi possível iniciar a visualização.', 503);
              session.adminPreview = true;
              if (!sessionStore.limitExpiration(sid, Math.min(Number(req.user.exp) * 1000, now() + 30 * 60000))) throw fail('A sessão administrativa expirou.');
              await req.revalidatePhysioPreview();
              await db('physio_admin_preview_audit').insert({ actor_id: req.user.id, professional_id: professionalId });
              sessionStore.delete(sessions.get(key)?.sid);
              sessions.set(key, { sid });
            } catch (error) { if (sid) sessionStore.delete(sid); throw error; }
          })();
          pending.set(key, creating);
          creating.finally(() => pending.delete(key)).catch(() => {});
        }
        await pending.get(key);
        req.physioSid = sessions.get(key)?.sid;
      };
      res.set('Cache-Control', 'no-store');
      next();
    } catch (error) { res.status(error.status || 503).json({ error: error.status ? error.message : 'Não foi possível abrir a visualização.', code: error.code || 'PHYSIO_PREVIEW_UNAVAILABLE' }); }
  }
  return { middleware };
}
module.exports = { previewIdentity, createAdminPreviewAccess };
