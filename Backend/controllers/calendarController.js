const CalendarEvent = require("../models/calendarSchema");
const CreateError = require("../utils/createError");
const { successResponse } = require("../utils/responseHelper");
const { isValidDate } = require("../utils/validators");

const createEvent = async (req, res, next) => {
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
      return next(
        new CreateError("Title, startTime, and endTime are required", 400)
      );
    }

    if (!isValidDate(startTime) || !isValidDate(endTime)) {
      return next(new CreateError("Invalid date format", 400));
    }

    if (new Date(startTime) >= new Date(endTime)) {
      return next(new CreateError("End time must be after start time", 400));
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

    return successResponse(res, { event: newEvent }, "Event created", 201);
  } catch (error) {
    next(error);
  }
};

const getAllEvents = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const filter = {};

    if (from && to) {
      if (!isValidDate(from) || !isValidDate(to)) {
        return next(new CreateError("Invalid date format", 400));
      }
      filter.startTime = { $gte: new Date(from), $lte: new Date(to) };
    }

    const events = await CalendarEvent.find(filter).sort({ startTime: 1 });
    return successResponse(res, { events });
  } catch (error) {
    next(error);
  }
};

const getEventById = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.eventId);
    if (!event) return next(new CreateError("Event not found", 404));
    return successResponse(res, { event });
  } catch (error) {
    next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const { startTime, endTime } = req.body;

    if (startTime && endTime) {
      if (!isValidDate(startTime) || !isValidDate(endTime)) {
        return next(new CreateError("Invalid date format", 400));
      }
      if (new Date(startTime) >= new Date(endTime)) {
        return next(new CreateError("End time must be after start time", 400));
      }
    }

    const updated = await CalendarEvent.findByIdAndUpdate(
      req.params.eventId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) return next(new CreateError("Event not found", 404));
    return successResponse(res, { event: updated }, "Event updated");
  } catch (error) {
    next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const deleted = await CalendarEvent.findByIdAndDelete(req.params.eventId);
    if (!deleted) return next(new CreateError("Event not found", 404));
    return successResponse(res, {}, "Event deleted");
  } catch (error) {
    next(error);
  }
};

const getEventsInRange = async (start, end, res, next) => {
  try {
    const events = await CalendarEvent.find({
      startTime: { $gte: start, $lte: end },
    }).sort({ startTime: 1 });

    return successResponse(res, { events });
  } catch (error) {
    next(error);
  }
};

const getEventsByDate = async (req, res, next) => {
  const { date } = req.query;
  if (!date || !isValidDate(date)) {
    return next(new CreateError("Valid date is required", 400));
  }

  const start = new Date(date);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return getEventsInRange(start, end, res, next);
};

const getEventsByWeek = async (req, res, next) => {
  const { weekStart } = req.query;
  if (!weekStart || !isValidDate(weekStart)) {
    return next(new CreateError("Valid week start date is required", 400));
  }

  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return getEventsInRange(start, end, res, next);
};

const getEventsByMonth = async (req, res, next) => {
  const { month } = req.query;
  if (!month) return next(new CreateError("Month is required", 400));

  const start = new Date(`${month}-01`);
  if (!isValidDate(start)) {
    return next(new CreateError("Invalid month format. Use YYYY-MM", 400));
  }

  const end = new Date(
    start.getFullYear(),
    start.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  return getEventsInRange(start, end, res, next);
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
