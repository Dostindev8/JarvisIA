const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    ip: String,
    userAgent: String,
    requestId: String,
    toolName: String,
    toolInput: { type: mongoose.Schema.Types.Mixed },
    toolOutput: String,
    duration: Number,
    success: Boolean,
    errorMsg: String,
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

AuditLogSchema.pre('save', function redactSensitive(next) {
  const sensitive = ['password', 'token', 'apiKey', 'secret', 'creditCard'];
  if (this.toolInput && typeof this.toolInput === 'object') {
    sensitive.forEach((f) => {
      if (this.toolInput[f]) this.toolInput[f] = '[REDACTED]';
    });
  }
  next();
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
