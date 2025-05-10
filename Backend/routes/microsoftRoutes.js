const express = require("express");
const router = express.Router();

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

// AUTH ROUTES
router.get("/auth/login", loginLimiter, loginToMicrosoft);
router.get("/auth/logout", logoutMicrosoft);
router.get("/auth/callback", handleMicrosoftCallback);
router.get("/auth/status", getMicrosoftAuthStatus);

// CALENDAR ROUTES (protected)
router.get(
  "/calendar",
  isAuthenticated,
  isMicrosoftAuthenticated,
  getCalendarEvents
);

router.post(
  "/calendar",
  isAuthenticated,
  isMicrosoftAuthenticated,
  createCalendarEvent
);

router.delete(
  "/calendar/:eventId",
  isAuthenticated,
  isMicrosoftAuthenticated,
  deleteCalendarEvent
);

module.exports = router;
