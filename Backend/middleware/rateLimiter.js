const rateLimit = require("express-rate-limit");
const CreateError = require("../utils/createError");

// Felles funksjon for tilpasset feilmelding via middleware
const rateLimitHandler = (message) => (req, res, next, options) => {
  next(new CreateError(message, 429));
};

// Login limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutter
  max: 5,
  message: "Too many login attempts. Please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many login attempts. Please try again after 15 minutes."),
});

// Password reset limiter
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many password reset attempts. Please try again later."),
});

module.exports = {
  loginLimiter,
  resetPasswordLimiter,
};
