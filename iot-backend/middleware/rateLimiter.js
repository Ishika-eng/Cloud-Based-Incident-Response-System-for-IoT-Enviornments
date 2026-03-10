const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ 
        error: message || 'Too many requests, please try again later.',
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

const telemetryLimiter = createRateLimiter(
  10 * 1000,
  100,
  'Too many telemetry requests, please try again later.'
);

const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  'Too many authentication attempts, please try again later.'
);

module.exports = {
  telemetryLimiter,
  authLimiter,
  createRateLimiter
};
