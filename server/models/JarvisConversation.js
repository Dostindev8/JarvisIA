const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'tool'], required: true },
  content: { type: String, required: true },
  audioUrl: { type: String },
  toolCalls: [{ type: mongoose.Schema.Types.Mixed }],
  createdAt: { type: Date, default: Date.now }
});

const JarvisConversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  messages: [MessageSchema],
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  summary: { type: String }
});

JarvisConversationSchema.index({ userId: 1, startedAt: -1 });

module.exports = mongoose.model('JarvisConversation', JarvisConversationSchema);
