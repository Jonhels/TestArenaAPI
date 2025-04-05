const CalendarEvent = require("../models/calendarSchema");

// Opprette kalenderhendelse
const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      startTime,
      endTime,
      location,
      status,
      linkedInquiryId,
      assignedTo,
    } = req.body;

    if (!title || !startTime || !endTime) {
      return res
        .status(400)
        .json({ error: "Title, startTime, and endTime are required." });
    }

    if (new Date(startTime) >= new Date(endTime)) {
      return res
        .status(400)
        .json({ error: "End time must be after start time." });
    }

    const newEvent = await CalendarEvent.create({
      title,
      description,
      startTime,
      endTime,
      location,
      status,
      linkedInquiryId,
      assignedTo,
      createdBy: req.user._id,
    });

    res.status(201).json({ status: "success", event: newEvent });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event." });
  }
};

// Hente alle kalenderhendelser (filtrering på dato)
const getAllEvents = async (req, res) => {
  try {
    const { from, to } = req.query;

    const filter = {};

    if (from && to) {
      if (isNaN(new Date(from)) || isNaN(new Date(to))) {
        return res.status(400).json({ error: "Invalid date format." });
      }
      filter.startTime = { $gte: new Date(from), $lte: new Date(to) };
    }

    const events = await CalendarEvent.find(filter).sort({ startTime: 1 });

    res.status(200).json({ status: "success", events });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events." });
  }
};

// Hente én spesifikk hendelse
const getEventById = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await CalendarEvent.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    res.status(200).json({ status: "success", event });
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event." });
  }
};

// Oppdatere kalenderhendelse
const updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { startTime, endTime } = req.body;

    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      return res
        .status(400)
        .json({ error: "End time must be after start time." });
    }

    const updatedEvent = await CalendarEvent.findByIdAndUpdate(
      eventId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ error: "Event not found." });
    }

    res.status(200).json({ status: "success", event: updatedEvent });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: "Failed to update event." });
  }
};

// Slette kalenderhendelse
const deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const deletedEvent = await CalendarEvent.findByIdAndDelete(eventId);

    if (!deletedEvent) {
      return res.status(404).json({ error: "Event not found." });
    }

    res
      .status(200)
      .json({ status: "success", message: "Event deleted successfully." });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Failed to delete event." });
  }
};

// Hente hendelser for en spesifikk dato
const getEventsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || isNaN(new Date(date))) {
      return res.status(400).json({ error: "Valid date is required." });
    }

    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const events = await CalendarEvent.find({
      startTime: { $gte: start, $lte: end },
    }).sort({ startTime: 1 });

    res.status(200).json({ status: "success", events });
  } catch (error) {
    console.error("Error fetching events by date:", error);
    res.status(500).json({ error: "Failed to fetch events." });
  }
};

// Hente hendelser for en uke
const getEventsByWeek = async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart || isNaN(new Date(weekStart))) {
      return res
        .status(400)
        .json({ error: "Valid week start date is required." });
    }

    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const events = await CalendarEvent.find({
      startTime: { $gte: start, $lte: end },
    }).sort({ startTime: 1 });

    res.status(200).json({ status: "success", events });
  } catch (error) {
    console.error("Error fetching weekly events:", error);
    res.status(500).json({ error: "Failed to fetch events." });
  }
};

// Hente hendelser for en måned
const getEventsByMonth = async (req, res) => {
  try {
    const { month } = req.query; // Format: "2025-04"
    if (!month) {
      return res.status(400).json({ error: "Month is required." });
    }

    const start = new Date(`${month}-01`);
    const end = new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const events = await CalendarEvent.find({
      startTime: { $gte: start, $lte: end },
    }).sort({ startTime: 1 });

    res.status(200).json({ status: "success", events });
  } catch (error) {
    console.error("Error fetching monthly events:", error);
    res.status(500).json({ error: "Failed to fetch events." });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventsByDate,
  getEventsByWeek,
  getEventsByMonth,
};
