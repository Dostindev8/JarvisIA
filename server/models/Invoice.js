const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  monto: { type: Number, required: true },
  periodo: { type: String },
  pdfUrl: { type: String },
  status: { type: String, enum: ['PENDIENTE', 'PAGADA', 'VENCIDA'], default: 'PENDIENTE' },
  fechaEmision: { type: Date, default: Date.now },
  fechaVencimiento: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

InvoiceSchema.index({ clientId: 1, fechaEmision: -1 });

module.exports = mongoose.model('Invoice', InvoiceSchema);
