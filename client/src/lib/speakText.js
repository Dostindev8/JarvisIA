/**
 * Limpia texto para TTS: sin menús, markdown ni ruido visual.
 */
export function cleanSpeakText(raw, maxLen = 900) {
  let text = String(raw || '');

  // Cortar menú post-respuesta
  text = text.split(/¿Qué deseas hacer ahora\?/i)[0];
  text = text.split(/────────/)[0];
  text = text.split(/Elige una opción/i)[0];

  // Prefijos de modo
  text = text.replace(/^🔌[^\n]*\n+/gm, '');
  text = text.replace(/^⚠️[^\n]*\n+/gm, '');
  text = text.replace(/^🌐[^\n]*\n+/gm, '');

  // Markdown / código
  text = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).replace(/\s+\S*$/, '')}…`;
}
