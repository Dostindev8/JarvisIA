require('dotenv').config();
require('./config/validateEnv')();

const http = require('http');
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const { Server } = require('socket.io');

// Antes de connectDB: repara installs rotos de Render (monorepo / omit=dev)
require('./scripts/ensureMemoryServer')();

const connectDB = require('./config/db');
const applySecurityMiddleware = require('./middleware/security.middleware');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const { seedLCSKnowledge } = require('./scripts/seedLCSKnowledge');
const initJarvisSocket = require('./sockets/jarvisSocket');
const { setSocketBroadcast } = require('./tools/jarvisTools');
const aiRoutes = require('./routes/ai.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const whatsappWebhookRoutes = require('./routes/whatsappWebhook.routes');
const { initCobrosCron } = require('./jobs/cobros.cron');
const { initMemorySummaryCron } = require('./jobs/memorySummary.cron');
const { ensureAudioDir } = require('./services/MusicService');

const app = express();
// Detrás del proxy de Render/Vercel: necesario para IP real (rate-limit, logs)
app.set('trust proxy', 1);
const server = http.createServer(app);

const staticOrigins = new Set(
  ['http://localhost:5173', 'http://127.0.0.1:5173', process.env.CLIENT_URL].filter(Boolean)
);

/** Permite localhost, CLIENT_URL y despliegues *.vercel.app / *.onrender.com */
function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (staticOrigins.has(origin)) return true;
  return /\.(vercel\.app|onrender\.com)$/.test(new URL(origin).hostname);
}

const io = new Server(server, {
  cors: {
    origin(origin, cb) {
      return isAllowedOrigin(origin) ? cb(null, true) : cb(new Error(`CORS: ${origin}`));
    },
    credentials: true
  }
});

const { broadcastToUser, broadcastAll } = initJarvisSocket(io);
setSocketBroadcast(broadcastToUser);

aiRoutes.setJarvisEmitters({
  response: (userId, data) => broadcastToUser(userId, 'jarvis:response', data),
  state: (userId, data) => broadcastToUser(userId, 'jarvis:state', data)
});

whatsappRoutes.setWhatsAppEmitter(broadcastToUser);
whatsappWebhookRoutes.setWebhookEmitter(broadcastAll);

applySecurityMiddleware(app);
app.use(morgan('dev'));
app.use(express.json({
  limit: '512kb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));
app.use(requestLogger);

ensureAudioDir();
app.use('/audio', express.static(path.join(__dirname, 'public', 'audio')));

app.get('/api/health', (_req, res) => {
  // Siempre 200 = proceso vivo (Render free reinicia si el health falla).
  // El estado real de Mongo va en `db` para diagnóstico.
  const { dbStatus } = require('./config/db');
  const db = dbStatus();
  res.json({
    success: true,
    service: 'jarvis-api',
    timestamp: new Date().toISOString(),
    commit: process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || null,
    db
  });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/clients', require('./routes/clients.routes'));
app.use('/api/payments', require('./routes/payments.routes'));
app.use('/api/quotes', require('./routes/quotes.routes'));
app.use('/api/projects', require('./routes/projects.routes'));
app.use('/api/ai', aiRoutes);
app.use('/api/tasks', require('./routes/tasks.routes'));
app.use('/api/whatsapp/webhook', whatsappWebhookRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/music', require('./routes/music.routes'));

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    await seedLCSKnowledge();
  } catch (err) {
    console.error('[DB] Fallo crítico de arranque:', err.message);
    // Segundo intento: memoria pura (por si el primer fallback falló a medias)
    try {
      if (process.env.ALLOW_INMEMORY_DB !== 'false') {
        const { connectInMemoryOnly } = require('./config/db');
        if (typeof connectInMemoryOnly === 'function') {
          await connectInMemoryOnly();
          await seedLCSKnowledge();
        }
      }
    } catch (err2) {
      console.error('[DB] Sin DB usable:', err2.message);
      console.warn('[DB] Continuando sin MongoDB — login fallará hasta Atlas o redeploy con cache limpio');
    }
  }

  initCobrosCron();
  initMemorySummaryCron();

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[JARVIS] Puerto ${PORT} en uso. Cierra la instancia anterior o usa PORT distinto.`);
      process.exit(1);
    }
    throw err;
  });

  server.listen(PORT, () => {
    console.log(`[JARVIS] API + Socket.io en puerto ${PORT}`);
  });
}

start();

module.exports = { app, server, io };
