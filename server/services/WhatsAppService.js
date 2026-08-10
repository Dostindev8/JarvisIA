const DEFAULT_COUNTRY_CODE = process.env.WHATSAPP_DEFAULT_CC || '1'; // RD/USA por defecto
const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';

/**
 * Normaliza a formato E.164 sin '+', requerido por WhatsApp Cloud API.
 * Acepta: +1 849..., 849..., 0849..., (849) 473-7963, etc.
 */
function normalizePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d]/g, '');
  if (!digits) return null;

  // Quitar prefijos de marcado internacional
  if (digits.startsWith('00')) digits = digits.slice(2);

  // Números locales RD (10 dígitos empezando en 8) → anteponer código país
  if (digits.length === 10 && /^8[024]9/.test(digits)) {
    digits = DEFAULT_COUNTRY_CODE + digits;
  } else if (digits.length === 10) {
    // 10 dígitos genérico (ej. USA) → anteponer CC
    digits = DEFAULT_COUNTRY_CODE + digits;
  }

  // Validación E.164: 8-15 dígitos
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

const WhatsAppService = {
  normalizePhone,

  isConfigured() {
    return Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  },

  /**
   * Envía el mensaje real. Si no hay credenciales, opera en modo simulado
   * (útil en desarrollo). NUNCA lanza por credenciales faltantes.
   */
  async send(phone, message) {
    const to = normalizePhone(phone);
    if (!to) {
      throw new Error('Número de WhatsApp inválido');
    }
    const text = String(message || '').trim().slice(0, 4096);
    if (!text) throw new Error('Mensaje vacío');

    if (!this.isConfigured()) {
      console.log(`[WhatsApp MOCK] → ${to}: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`);
      return { sent: true, mock: true, to, providerId: `mock_${Date.now()}` };
    }

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: false, body: text }
        }),
        signal: controller.signal
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.error?.message || `HTTP ${res.status}`;
        throw new Error(`WhatsApp API: ${detail}`);
      }

      return { sent: true, to, providerId: data?.messages?.[0]?.id || null };
    } finally {
      clearTimeout(timeout);
    }
  }
};

module.exports = WhatsAppService;
