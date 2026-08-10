const mongoose = require('mongoose');

const WhatsAppInboundSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, index: true },
    profileName: { type: String },
    waMessageId: { type: String, unique: true, sparse: true },
    type: { type: String, default: 'text' },
    text: { type: String },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    handled: { type: Boolean, default: false },
    receivedAt: { type: Date, default: Date.now, index: true }
  },
  { versionKey: false }
);

module.exports = mongoose.model('WhatsAppInbound', WhatsAppInboundSchema);
