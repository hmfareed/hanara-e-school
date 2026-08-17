const crypto = require('crypto');
const OfflineMutation = require('../models/OfflineMutation');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function actorKey(req) {
  const credential = req.headers.authorization || req.headers['x-kiosk-device-token'] || 'anonymous';
  return crypto.createHash('sha256').update(String(credential)).digest('hex');
}

async function idempotency(req, res, next) {
  const key = req.get('X-Idempotency-Key');
  if (!key || !MUTATING_METHODS.has(req.method)) return next();

  const identity = actorKey(req);
  const path = req.originalUrl.split('?')[0];

  try {
    let mutation;
    try {
      mutation = await OfflineMutation.create({
        key,
        actorKey: identity,
        method: req.method,
        path,
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      mutation = await OfflineMutation.findOne({ key, actorKey: identity });
      if (!mutation || mutation.method !== req.method || mutation.path !== path) {
        return res.status(409).json({ success: false, message: 'Idempotency key does not match this request.' });
      }
      if (mutation.status === 'completed') {
        return res.status(mutation.responseStatus || 200).json(mutation.responseBody);
      }
      return res.status(409).json({ success: false, message: 'This offline change is already being processed.' });
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      mutation
        .updateOne({
          status: 'completed',
          responseStatus: res.statusCode,
          responseBody: body,
        })
        .catch(() => {});
      return originalJson(body);
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = idempotency;
