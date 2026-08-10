const mongoose = require('mongoose');

const WhatsAppMessageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    phone: { type: String, required: true },
    phoneNormalized: { type: String, required: true },
    recipientName: { type: String },
    // Mensaje entrante al que se responde (contexto), opcional
    inboundMessage: { type: String },
    // Texto que JARVIS propone enviar
    message: { type: String, required: true, maxlength: 4096 },
    status: {
      type: String,
      enum: ['pending_confirmation', 'sent', 'cancelled', 'failed'],
      default: 'pending_confirmation',
      index: true
    },
    origin: { type: String, enum: ['jarvis', 'manual'], default: 'jarvis' },
    providerId: { type: String },
    error: { type: String },
    createdAt: { type: Date, default: Date.now },
    sentAt: { type: Date }
  },
  { versionKey: false }
);

WhatsAppMessageSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('WhatsAppMessage', WhatsAppMessageSchema);
