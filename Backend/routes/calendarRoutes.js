const express = require("express");
const checkAdmin = require("../middleware/checkAdmin");
const {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventsByDate,
  getEventsByWeek,
  getEventsByMonth,
} = require("../controllers/calendarController");
const authenticateUser = require("../utils/authenticateUser");

const router = express.Router();

// Protected routes (krever login)

// Opprette ny kalenderhendelse
router.post("/", authenticateUser, createEvent);

// Hente alle hendelser (med filtrering)
router.get("/", authenticateUser, getAllEvents);

// Hente én spesifikk hendelse
router.get("/:eventId", authenticateUser, getEventById);

// Oppdatere en hendelse
router.put("/:eventId", authenticateUser, checkAdmin, updateEvent);

// Slette en hendelse
router.delete("/:eventId", authenticateUser, checkAdmin, deleteEvent);

// Ekstra filtrerte visninger

// Hente hendelser for én dato
router.get("/filter/date", authenticateUser, getEventsByDate);

// Hente hendelser for en uke
router.get("/filter/week", authenticateUser, getEventsByWeek);

// Hente hendelser for en måned
router.get("/filter/month", authenticateUser, getEventsByMonth);

module.exports = router;
