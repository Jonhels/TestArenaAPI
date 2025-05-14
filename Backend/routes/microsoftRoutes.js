const express = require("express");
const router = express.Router();
const checkAdmin = require("../middleware/checkAdmin");
const {
  loginToMicrosoft,
  logoutMicrosoft,
  handleMicrosoftCallback,
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  getMicrosoftAuthStatus,
} = require("../controllers/microsoftController");

const isMicrosoftAuthenticated = require("../middleware/isMicrosoftAuthenticated");
const isAuthenticated = require("../middleware/isAuthenticated");
const { loginLimiter } = require("../middleware/rateLimiter");

// Login + callback (åpne)
router.get("/auth/login", loginLimiter, loginToMicrosoft);
router.get("/auth/logout", logoutMicrosoft);
router.get("/auth/callback", handleMicrosoftCallback);
router.get("/auth/status", getMicrosoftAuthStatus);

// Kalender (beskyttet)
router.get(
  "/calendar",
  isAuthenticated,
  isMicrosoftAuthenticated,
  getCalendarEvents
);
router.post(
  "/calendar/create",
  isAuthenticated,
  checkAdmin,
  isMicrosoftAuthenticated,
  createCalendarEvent
);
router.delete(
  "/calendar/:eventId",
  isAuthenticated,
  checkAdmin,
  isMicrosoftAuthenticated,
  deleteCalendarEvent
);

module.exports = router;
