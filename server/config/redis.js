const Redis = require('ioredis');

let redis = null;

function getRedis() {
  if (redis) return redis;

  const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (!url) {
    console.warn('[Redis] No configurado — rate limiting en memoria');
    return null;
  }

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      ...(process.env.UPSTASH_REDIS_REST_TOKEN && {
        password: process.env.UPSTASH_REDIS_REST_TOKEN
      })
    });
    redis.connect().catch(() => {
      console.warn('[Redis] Conexión fallida — fallback a memoria');
      redis = null;
    });
  } catch {
    redis = null;
  }

  return redis;
}

module.exports = { getRedis };
