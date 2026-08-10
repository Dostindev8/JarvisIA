const cron = require('node-cron');
const Anthropic = require('@anthropic-ai/sdk');
const JarvisConversation = require('../models/JarvisConversation');
const JarvisMemory = require('../models/JarvisMemory');

function initMemorySummaryCron() {
  if (process.env.DISABLE_CRON === 'true') return;
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[CRON memory] ANTHROPIC_API_KEY no configurada — job desactivado');
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

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      let summarized = 0;

      for (const conv of conversations) {
        const text = conv.messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n')
          .slice(0, 6000);

        if (!text.trim()) continue;

        const response = await client.messages.create({
          model: process.env.ANTHROPIC_HAIKU_MODEL || 'claude-3-5-haiku-20241022',
          max_tokens: 256,
          messages: [
            {
              role: 'user',
              content: `Resume en 2-3 oraciones los patrones, preferencias o hechos importantes de esta conversación:\n\n${text}`
            }
          ]
        });

        const summary = response.content.find((b) => b.type === 'text')?.text || '';
        if (!summary) continue;

        conv.summary = summary;
        conv.endedAt = new Date();
        await conv.save();

        await JarvisMemory.create({
          userId: conv.userId,
          type: 'pattern',
          content: summary,
          importance: 2,
          context: 'memorySummary.cron',
          lastUsedAt: new Date()
        });

        summarized += 1;
      }

      console.log(`[CRON memory] ${summarized} conversaciones resumidas`);
    } catch (err) {
      console.error('[CRON memory] Error:', err.message);
    }
  });
}

module.exports = { initMemorySummaryCron };
