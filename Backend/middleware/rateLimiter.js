const rateLimit = require("express-rate-limit");

// Logg inn rate limiter for å begrense antall loginforsøk
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutter
  max: 5, // Maks 5 loginforsøk per IP på 15 min
  message: "Too many login attempts. Please try again after 15 minutes.",
  standardHeaders: true, // Returner rate limit info i headers
  legacyHeaders: false, // Ikke bruk gamle headers
});

// 	Rate limiter for å beskytte mot mange reset-forsøk
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many password reset attempts. Please try again later.",
});

module.exports = { loginLimiter, resetPasswordLimiter };
