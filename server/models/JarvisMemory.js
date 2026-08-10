const mongoose = require('mongoose');

const JarvisMemorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['preference', 'pattern', 'fact', 'feedback'],
    required: true
  },
  content: { type: String, required: true },
  context: { type: String },
  importance: { type: Number, default: 1, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date }
});

JarvisMemorySchema.index({ importance: -1, lastUsedAt: -1 });
JarvisMemorySchema.index({ userId: 1 });

module.exports = mongoose.model('JarvisMemory', JarvisMemorySchema);
