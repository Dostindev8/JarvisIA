function requestLogger(req, res, next) {
  const start = Date.now();
  const sensitive = req.path.startsWith('/api/auth');

  res.on('finish', () => {
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip,
      userId: req.user?._id?.toString(),
      requestId: req.requestId
    };
    if (!sensitive) console.log(JSON.stringify(log));
  });
  next();
}

module.exports = requestLogger;
