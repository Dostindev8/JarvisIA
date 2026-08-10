const dns = require('dns');
const mongoose = require('mongoose');

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

async function connectWithRetry(uri, attempts = 3) {
  ensurePublicDnsResolvers();
  const options = {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000
  };

  for (let i = 1; i <= attempts; i += 1) {
    try {
      await mongoose.connect(uri, options);
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
 * Fallback SOLO para desarrollo: si Atlas no responde (p. ej. clúster pausado
 * o sin DNS), levanta un MongoDB en memoria para que la app funcione localmente.
 * Nunca se activa en producción.
 */
async function connectInMemory() {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('jarvis'));
  console.log('[DB] MongoDB EN MEMORIA activo (fallback dev — datos no persistentes)');
  await seedDemoUser();
  return mongoose.connection;
}

/**
 * Siembra un usuario demo si la base está vacía, para poder iniciar sesión
 * en el fallback en memoria sin depender de datos previos.
 */
async function seedDemoUser() {
  try {
    const User = require('../models/User');
    const count = await User.estimatedDocumentCount();
    if (count > 0) return;
    const email = process.env.DEMO_USER_EMAIL || 'admin@jarvisia.do';
    const password = process.env.DEMO_USER_PASSWORD || 'JarvisIA2026!';
    await User.create({ name: 'Dostin Santana', email, password, role: 'admin' });
    console.log(`[DB] Usuario demo sembrado → ${email} / ${password}`);
  } catch (err) {
    console.warn('[DB] No se pudo sembrar usuario demo:', err.message);
  }
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  mongoose.connection.on('disconnected', () => console.warn('[DB] MongoDB desconectado'));
  mongoose.connection.on('reconnected', () => console.log('[DB] MongoDB reconectado'));

  if (!uri) {
    console.warn('[DB] MONGODB_URI no configurada');
    if (process.env.NODE_ENV !== 'production') return connectInMemory();
    return null;
  }

  try {
    const conn = await connectWithRetry(uri);
    // Seed opt-in en producción (primer deploy con base vacía)
    if (process.env.SEED_DEMO_USER === 'true') await seedDemoUser();
    return conn;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[DB] Atlas inaccesible (${err.message}). Usando fallback en memoria.`);
      return connectInMemory();
    }
    throw err;
  }
}

module.exports = connectDB;
