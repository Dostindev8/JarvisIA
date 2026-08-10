// Job existente placeholder — no modificar según prompt
const cron = require('node-cron');

function initCobrosCron() {
  if (process.env.DISABLE_CRON === 'true') return;

  cron.schedule('0 9 * * *', () => {
    console.log('[CRON cobros] Recordatorio de cobros — placeholder');
  });
}

module.exports = { initCobrosCron };
