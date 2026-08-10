const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  monto: { type: Number, required: true },
  fecha: { type: Date, default: Date.now },
  metodo: { type: String, enum: ['TRANSFERENCIA', 'EFECTIVO', 'TARJETA', 'OTRO'], default: 'TRANSFERENCIA' },
  verificado: { type: Boolean, default: false },
  comprobanteUrl: { type: String },
  notas: { type: String },
  createdAt: { type: Date, default: Date.now }
});

PaymentSchema.index({ fecha: -1 });
PaymentSchema.index({ clientId: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);
