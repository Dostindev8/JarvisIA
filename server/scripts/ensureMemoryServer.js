/**
 * Self-heal: si el build de Render no instaló mongodb-memory-server
 * (Root Directory / --omit=dev incorrectos), lo instala en el arranque.
 */
function ensureMemoryServer() {
  try {
    require.resolve('mongodb-memory-server');
    return true;
  } catch {
    /* continue */
  }

  const { execSync } = require('child_process');
  const path = require('path');
  const cwd = path.join(__dirname, '..');
  console.warn('[DB] mongodb-memory-server ausente — instalando en arranque…');
  try {
    execSync('npm install mongodb-memory-server@11.2.0 --no-audit --no-fund', {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    });
    require.resolve('mongodb-memory-server');
    console.log('[DB] mongodb-memory-server instalado OK');
    return true;
  } catch (err) {
    console.error('[DB] No se pudo instalar mongodb-memory-server:', err.message);
    return false;
  }
}

module.exports = ensureMemoryServer;
