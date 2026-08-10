function errorHandler(err, req, res, _next) {
  console.error('[Error]', { requestId: req.requestId, message: err.message, stack: err.stack });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message, requestId: req.requestId });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'ID inválido', requestId: req.requestId });
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token inválido', requestId: req.requestId });
  }
  if (err.message?.startsWith('CORS bloqueado')) {
    return res.status(403).json({ success: false, message: err.message, requestId: req.requestId });
  }

  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    success: false,
    message: isProd ? 'Error interno del servidor' : err.message,
    requestId: req.requestId,
    ...(isProd ? {} : { stack: err.stack })
  });
}

module.exports = errorHandler;
