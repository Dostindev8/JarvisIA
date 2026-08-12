const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    priority: {
      type: String,
      enum: ['baja', 'media', 'alta', 'urgente'],
      default: 'media'
    },
    status: {
      type: String,
      enum: ['pendiente', 'en_progreso', 'completada'],
      default: 'pendiente',
      index: true
    },
    dueDate: { type: Date },
    tags: [{ type: String, trim: true, maxlength: 40 }],
    notes: { type: String, maxlength: 2000 }
  },
  { timestamps: true }
);

TaskSchema.index({ userId: 1, status: 1, priority: 1 });

module.exports = mongoose.model('Task', TaskSchema);
