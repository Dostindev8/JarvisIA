const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { getRedis } = require('../config/redis');

async function isTokenBlacklisted(token) {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const result = await redis.get(`blacklist:${token}`);
    return result !== null;
  } catch {
    return false;
  }
}

async function blacklistToken(token, expiresAt) {
  const redis = getRedis();
  if (!redis) return;
  const ttl = Math.max(0, Math.floor((expiresAt * 1000 - Date.now()) / 1000));
  if (ttl > 0) await redis.setex(`blacklist:${token}`, ttl, '1');
}

function logAuthEvent(type, userId, req) {
  AuditLog.create({
    type,
    userId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId
  }).catch((err) => console.error('[AuditLog]', err.message));
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      logAuthEvent('UNAUTHORIZED', null, req);
      return res.status(401).json({ success: false, message: 'Token requerido' });
    }

    const token = header.split(' ')[1];
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ success: false, message: 'Sesión cerrada' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }

    req.user = user;
    req.token = token;
    req.tokenExp = decoded.exp;
    next();
  } catch (err) {
    logAuthEvent('UNAUTHORIZED', null, req);
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
}

module.exports = { requireAuth, blacklistToken, logAuthEvent };
