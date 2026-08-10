const dns = require('dns');
const mongoose = require('mongoose');

let memoryServer = null;
let reconnectTimer = null;
let usingMemory = false;

/**
 * Algunos ISPs/redes bloquean o fallan las consultas SRV (mongodb+srv://).
 * Forzamos resolvers DNS públicos para que la resolución SRV funcione de forma fiable.
 */
function ensurePublicDnsResolvers() {
  try {
    const current = dns.getServers();
    const publicResolvers = ['8.8.8.8', '1.1.1.1', '8.8.4.4'];
    const hasPublic = current.some((s) => publicResolvers.includes(s));
    if (!hasPublic) {
      dns.setServers([...publicResolvers, ...current]);
      console.log('[DB] Resolvers DNS públicos activados para SRV de Atlas');
    }
  } catch (err) {
    console.warn('[DB] No se pudieron ajustar los resolvers DNS:', err.message);
  }
}

function dbStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    readyState: mongoose.connection.readyState,
    state: states[mongoose.connection.readyState] || 'unknown',
    usingMemory,
    connected: mongoose.connection.readyState === 1
  };
}

async function connectWithRetry(uri, attempts = 3) {
  ensurePublicDnsResolvers();
  const options = {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000
  };

  for (let i = 1; i <= attempts; i += 1) {
    try {
      await mongoose.connect(uri, options);
      usingMemory = false;
      console.log('[DB] MongoDB conectado');
      return mongoose.connection;
    } catch (err) {
      const isLast = i === attempts;
      console.error(`[DB] Intento ${i}/${attempts} falló: ${err.message}`);
      if (isLast) throw err;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  return null;
}

/**
 * Fallback en memoria: permite login/demo si Atlas no resuelve DNS
 * (clúster pausado/eliminado). Datos no persistentes entre reinicios.
 */
async function connectInMemory() {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  if (memoryServer) {
    try {
      await memoryServer.stop();
    } catch {
      /* ignore */
    }
  }
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri('jarvis'));
  usingMemory = true;
  console.log('[DB] MongoDB EN MEMORIA activo (fallback — datos no persistentes)');
  await seedDemoUser();
  return mongoose.connection;
}

function allowInMemoryFallback() {
  if (process.env.ALLOW_INMEMORY_DB === 'false') return false;
  if (process.env.NODE_ENV !== 'production') return true;
  // Producción: opt-in explícito o SEED_DEMO_USER (modo demo)
  return process.env.ALLOW_INMEMORY_DB === 'true' || process.env.SEED_DEMO_USER === 'true';
}

/**
 * Siembra un usuario demo si la base está vacía, para poder iniciar sesión
 * sin depender de datos previos.
 */
async function seedDemoUser() {
  try {
    const User = require('../models/User');
    const email = (process.env.DEMO_USER_EMAIL || 'admin@jarvisia.do').toLowerCase();
    const password = process.env.DEMO_USER_PASSWORD || 'JarvisIA2026!';
    const existing = await User.findOne({ email });
    if (existing) return;
    await User.create({ name: 'Dostin Santana', email, password, role: 'admin' });
    console.log(`[DB] Usuario demo sembrado → ${email}`);
  } catch (err) {
    console.warn('[DB] No se pudo sembrar usuario demo:', err.message);
  }
}

function scheduleAtlasReconnect(uri) {
  if (!uri || reconnectTimer || !usingMemory) return;
  reconnectTimer = setInterval(async () => {
    if (!usingMemory) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
      return;
    }
    try {
      console.log('[DB] Reintentando Atlas…');
      ensurePublicDnsResolvers();
      const probe = await mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 5000
      }).asPromise();
      await probe.close();
      await mongoose.disconnect();
      if (memoryServer) {
        await memoryServer.stop().catch(() => {});
        memoryServer = null;
      }
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000
      });
      usingMemory = false;
      if (process.env.SEED_DEMO_USER === 'true') await seedDemoUser();
      console.log('[DB] Atlas recuperado — saliendo del modo memoria');
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    } catch {
      /* sigue en memoria */
    }
  }, 5 * 60 * 1000);
  if (typeof reconnectTimer.unref === 'function') reconnectTimer.unref();
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  mongoose.connection.on('disconnected', () => console.warn('[DB] MongoDB desconectado'));
  mongoose.connection.on('reconnected', () => console.log('[DB] MongoDB reconectado'));

  if (!uri) {
    console.warn('[DB] MONGODB_URI no configurada');
    if (allowInMemoryFallback()) return connectInMemory();
    return null;
  }

  try {
    const conn = await connectWithRetry(uri);
    if (process.env.SEED_DEMO_USER === 'true') await seedDemoUser();
    return conn;
  } catch (err) {
    if (allowInMemoryFallback()) {
      console.warn(`[DB] Atlas inaccesible (${err.message}). Usando fallback en memoria.`);
      const conn = await connectInMemory();
      scheduleAtlasReconnect(uri);
      return conn;
    }
    throw err;
  }
}

module.exports = connectDB;
module.exports.dbStatus = dbStatus;
module.exports.seedDemoUser = seedDemoUser;
