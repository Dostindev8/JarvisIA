const requiredProd = ['MONGODB_URI', 'JWT_SECRET'];
const requiredDev = ['JWT_SECRET'];
const warnOptional = ['ANTHROPIC_API_KEY', 'ELEVENLABS_API_KEY', 'REDIS_URL', 'UPSTASH_REDIS_REST_URL'];

module.exports = function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const required = isProd ? requiredProd : requiredDev;
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length) {
    console.error('[ENV] Variables requeridas faltantes:', missing.join(', '));
    if (isProd) process.exit(1);
  }

  warnOptional.forEach((key) => {
    if (!process.env[key]) console.warn(`[ENV] Opcional sin configurar: ${key}`);
  });
};
