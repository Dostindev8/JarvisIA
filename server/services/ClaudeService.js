/**
 * Compat shim — Claude ya no es el cerebro primario.
 * Todo el chat pasa por LLMService (OpenAI → Gemini → motor local).
 */
const { chat, buildJarvisSystemPrompt, activeProvider, completeText } = require('./LLMService');

module.exports = { chat, buildJarvisSystemPrompt, activeProvider, completeText };
