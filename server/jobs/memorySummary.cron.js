const cron = require('node-cron');
const JarvisConversation = require('../models/JarvisConversation');
const JarvisMemory = require('../models/JarvisMemory');
const { completeText } = require('../services/LLMService');

function initMemorySummaryCron() {
  if (process.env.DISABLE_CRON === 'true') return;
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[CRON memory] OPENAI_API_KEY no configurada — job desactivado');
    return;
  }

  cron.schedule('0 3 * * *', async () => {
    console.log('[CRON memory] Iniciando resumen de conversaciones...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const conversations = await JarvisConversation.find({
        summary: { $exists: false },
        startedAt: { $gte: yesterday, $lt: today },
        'messages.0': { $exists: true }
      });

      let summarized = 0;

      for (const conv of conversations) {
        const text = conv.messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n')
          .slice(0, 6000);

        if (!text.trim()) continue;

        const summary = await completeText(
          `Resume en 2-3 oraciones los patrones, preferencias o hechos importantes de esta conversación:\n\n${text}`,
          { maxTokens: 256 }
        );
        if (!summary) continue;

        conv.summary = summary;
        conv.endedAt = new Date();
        await conv.save();

        await JarvisMemory.create({
          userId: conv.userId,
          type: 'preference',
          content: summary,
          importance: 5,
          source: 'cron_summary'
        });

        summarized += 1;
      }

      console.log(`[CRON memory] Resumidas ${summarized} conversaciones`);
    } catch (err) {
      console.error('[CRON memory]', err.message);
    }
  });
}

module.exports = { initMemorySummaryCron };
