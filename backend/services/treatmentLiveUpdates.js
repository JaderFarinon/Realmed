const { EventEmitter } = require('node:events');

function createTreatmentLiveUpdates() {
  const events = new EventEmitter();
  events.setMaxListeners(0);
  function observe(req, res, next) {
    if (['POST','PUT','PATCH','DELETE'].includes(req.method) &&
        /^\/api\/(guide-processes|documents|authorizations|patients|integrations\/stenci\/treatments|physiotherapy-rotation)(\/|$)/.test(req.path) &&
        !/\/(preview|code-review-options|read-codes|indicate|suggest)$/.test(req.path) &&
        !(req.path.includes('/edit-lock/') && req.body?.renew === true)) {
      res.once('finish', () => {
        if (req.user && res.statusCode >= 200 && res.statusCode < 300) events.emit('changed');
      });
    }
    next();
  }
  function stream(req, res) {
    res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'});
    res.flushHeaders();
    const send = () => { if (!res.writableEnded) res.write('data: refresh\n\n'); };
    events.on('changed', send);
    send(); // Also reconciles changes missed during reconnects.
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);
    // Reconnect to revalidate JWT, account status and module permission.
    const lifetime = Math.min(300000, Math.max(1, (Number(req.user.exp) * 1000 || Date.now()+300000)-Date.now()));
    const expiry = setTimeout(() => res.end(), lifetime);
    res.once('close', () => { clearInterval(heartbeat); clearTimeout(expiry); events.off('changed', send); });
  }
  return { observe, stream };
}
module.exports = { createTreatmentLiveUpdates };
