const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { getRedis } = require('../config/redis');

function applySecurityMiddleware(app) {
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
      hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false
    })
  );

  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.CLIENT_URL
  ].filter(Boolean));

  const isDev = process.env.NODE_ENV !== 'production';

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        // Dev: permitir cualquier localhost / 127.0.0.1
        if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        // Prod: permitir despliegues de Vercel y Render
        try {
          if (/\.(vercel\.app|onrender\.com)$/.test(new URL(origin).hostname)) {
            return callback(null, true);
          }
        } catch {
          /* origin malformado */
        }
        callback(new Error(`CORS bloqueado: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
    })
  );

  const redis = getRedis();
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    ...(redis && {
      store: new (require('rate-limit-redis'))({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:global:'
      })
    }),
    message: { success: false, message: 'Demasiadas solicitudes.' }
  });
  app.use(globalLimiter);

  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 15,
      skipSuccessfulRequests: true,
      message: { success: false, message: 'Demasiados intentos de autenticación.' }
    })
  );

  app.use(mongoSanitize());
  app.use(xss());
  app.use(hpp({ whitelist: ['status', 'type', 'month', 'year', 'importance'] }));

  app.use((req, res, next) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  });
}

module.exports = applySecurityMiddleware;
