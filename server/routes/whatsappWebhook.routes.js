const crypto = require('crypto');
const express = require('express');
const WhatsAppInbound = require('../models/WhatsAppInbound');
const Client = require('../models/Client');
const WhatsAppService = require('../services/WhatsAppService');

const router = express.Router();

let broadcastAll = null;
function setWebhookEmitter(fn) {
  broadcastAll = fn;
}

/**
 * Verifica la firma X-Hub-Signature-256 de Meta usando el App Secret.
 * Si no hay APP_SECRET configurado, se omite (modo desarrollo) pero se advierte.
 */
function verifySignature(req) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // dev sin firma
  const signature = req.get('x-hub-signature-256');
  if (!signature || !req.rawBody) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── Verificación del webhook (Meta hace un GET al configurarlo) ──────────────
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ── Recepción de eventos (mensajes entrantes + estados) ─────────────────────
router.post('/', async (req, res) => {
  if (!verifySignature(req)) {
    console.warn('[WhatsApp Webhook] Firma inválida — evento rechazado');
    return res.sendStatus(401);
  }

  // Responder 200 de inmediato (Meta reintenta si no)
  res.sendStatus(200);

  try {
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const contacts = value.contacts || [];
        for (const msg of value.messages || []) {
          if (msg.type !== 'text') continue;

          const from = msg.from;
          const text = msg.text?.body || '';
          const profileName = contacts.find((c) => c.wa_id === from)?.profile?.name;

          // Evitar duplicados por reintentos de Meta
          const exists = await WhatsAppInbound.findOne({ waMessageId: msg.id }).lean();
          if (exists) continue;

          const client = await Client.findOne({
            whatsapp: { $regex: from.slice(-10) }
          })
            .select('_id nombre')
            .lean();

          const saved = await WhatsAppInbound.create({
            from,
            profileName: profileName || client?.nombre,
            waMessageId: msg.id,
            type: 'text',
            text,
            clientId: client?._id
          });

          if (broadcastAll) {
            broadcastAll('whatsapp:inbound', {
              id: saved._id,
              from: WhatsAppService.normalizePhone(from) || from,
              name: saved.profileName || null,
              clientId: client?._id || null,
              clientName: client?.nombre || null,
              text,
              receivedAt: saved.receivedAt
            });
          }

          console.log(`[WhatsApp Webhook] Mensaje de ${profileName || from}: ${text.slice(0, 60)}`);
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp Webhook]', err.message);
  }
});

module.exports = router;
module.exports.setWebhookEmitter = setWebhookEmitter;
