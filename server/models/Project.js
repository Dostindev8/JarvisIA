const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  titulo: { type: String, required: true },
  descripcion: { type: String },
  kanbanStatus: {
    type: String,
    enum: ['LEADS', 'COTIZADO', 'NEGOCIANDO', 'CERRADO', 'ACTIVO', 'EN_RIESGO', 'SUSPENDIDO', 'PERDIDO'],
    default: 'LEADS'
  },
  prioridad: { type: String, enum: ['BAJA', 'MEDIA', 'ALTA'], default: 'MEDIA' },
  fechaLimite: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ProjectSchema.index({ kanbanStatus: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
