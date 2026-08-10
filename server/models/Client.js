const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  empresa: { type: String },
  rncCedula: { type: String },
  whatsapp: { type: String },
  email: { type: String },
  tier: {
    type: String,
    enum: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'],
    default: 'STARTER'
  },
  precioMensual: { type: Number, default: 0 },
  fechaInicio: { type: Date },
  proximoVencimiento: { type: Date },
  status: {
    type: String,
    enum: ['ACTIVO', 'VENCIDO', 'LEAD', 'SUSPENDIDO', 'EN_RIESGO', 'COTIZADO', 'NEGOCIANDO'],
    default: 'LEAD'
  },
  notas: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ClientSchema.index({ status: 1 });
ClientSchema.index({ proximoVencimiento: 1 });

module.exports = mongoose.model('Client', ClientSchema);
