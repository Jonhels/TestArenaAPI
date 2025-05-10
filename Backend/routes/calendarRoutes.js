const express = require("express");
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

// Ekstra filtrerte visninger
router.get("/filter/date", authenticateUser, getEventsByDate);
router.get("/filter/week", authenticateUser, getEventsByWeek);
router.get("/filter/month", authenticateUser, getEventsByMonth);

// Hent alle hendelser (evt. med ?from=&to= filtrering)
router.get("/", authenticateUser, getAllEvents);

// Opprett hendelse
router.post("/", authenticateUser, createEvent);

// Hent én spesifikk hendelse
router.get("/:eventId", authenticateUser, getEventById);

// Oppdater hendelse
router.put("/:eventId", authenticateUser, updateEvent);

// Slett hendelse
router.delete("/:eventId", authenticateUser, deleteEvent);

module.exports = router;
