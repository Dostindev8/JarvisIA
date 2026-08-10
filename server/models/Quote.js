const mongoose = require('mongoose');

const QuoteSchema = new mongoose.Schema({
  quoteNumber: { type: String, required: true, unique: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  modules: [{ type: String }],
  setupFee: { type: Number, default: 0 },
  licenciaMensual: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  validUntil: { type: Date },
  status: { type: String, enum: ['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA'], default: 'BORRADOR' },
  createdAt: { type: Date, default: Date.now }
});

QuoteSchema.index({ clientId: 1 });

module.exports = mongoose.model('Quote', QuoteSchema);
