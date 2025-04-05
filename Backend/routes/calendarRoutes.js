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

// Protected routes (krever login)
router.post("/", authenticateUser, createEvent); // Opprette ny kalenderhendelse
router.get("/", authenticateUser, getAllEvents); // Hente alle hendelser (med filtrering)
router.get("/:eventId", authenticateUser, getEventById); // Hente én spesifikk hendelse
router.put("/:eventId", authenticateUser, updateEvent); // Oppdatere en hendelse
router.delete("/:eventId", authenticateUser, deleteEvent); // Slette en hendelse

// Ekstra filtrerte visninger
router.get("/filter/date", authenticateUser, getEventsByDate); // Hente hendelser for én dato
router.get("/filter/week", authenticateUser, getEventsByWeek); // Hente hendelser for en uke
router.get("/filter/month", authenticateUser, getEventsByMonth); // Hente hendelser for en måned

module.exports = router;
