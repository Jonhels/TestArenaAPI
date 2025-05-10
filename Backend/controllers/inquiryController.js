const { v4: uuidv4 } = require("uuid");
const Inquiry = require("../models/inquirySchema");
const User = require("../models/userSchema");
const sendInquiryNotification = require("../utils/sendInquiryNotification");
const CreateError = require("../utils/createError");
const { successResponse } = require("../utils/responseHelper");
const findInquiry = require("../utils/findInquiry");

// Generer robust saksnummer med UUID
const generateCaseNumber = () => uuidv4();

// Enkel retry-mekanisme for sending av varsler (med maks 3 forsøk)
const sendNotificationWithRetry = async (inquiry, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sendInquiryNotification(inquiry);
      return;
    } catch (error) {
      console.error(`Notification attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        console.error("All notification attempts failed");
      }
    }
  }
};

// Opprett henvendelse
const createInquiry = async (req, res, next) => {
  try {
    const data = req.body;
    if (req.file) {
      data.attachmentUrl = `/uploads/inquiries/${req.file.filename}`;
    }

    data.caseNumber = generateCaseNumber();

    const inquiry = await Inquiry.create(data);
    sendNotificationWithRetry(inquiry);

    return successResponse(res, inquiry, "Inquiry created", 201);
  } catch (err) {
    next(err);
  }
};

// Hent alle henvendelser (paginering og søk)
const getAllInquiries = async (req, res, next) => {
  try {
    const {
      status,
      assignedTo,
      includeArchived,
      tag,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (includeArchived !== "true") filter.archived = false;
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (tag) filter.tags = { $in: [tag.toLowerCase()] };
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { companyName: regex },
        { contactName: regex },
        { caseNumber: regex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [inquiries, total] = await Promise.all([
      Inquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Inquiry.countDocuments(filter),
    ]);

    return successResponse(res, {
      inquiries,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// Hent én henvendelse med ID
const getInquiryById = async (req, res, next) => {
  try {
    const inquiry = await findInquiry(req.params.inquiryId);
    return successResponse(res, inquiry);
  } catch (err) {
    next(err);
  }
};

// Oppdater henvendelse
const updateInquiry = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.inquiryId,
      req.body,
      { new: true, runValidators: true }
    );
    if (!inquiry) throw new CreateError("Inquiry not found", 404);
    return successResponse(res, inquiry, "Inquiry updated");
  } catch (err) {
    next(err);
  }
};

// Slett henvendelse
const deleteInquiry = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findByIdAndDelete(req.params.inquiryId);
    if (!inquiry) throw new CreateError("Inquiry not found", 404);
    return successResponse(res, null, "Inquiry deleted");
  } catch (err) {
    next(err);
  }
};

// Arkiver henvendelse
const archiveInquiry = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.inquiryId,
      { archived: true },
      { new: true, runValidators: true }
    );
    if (!inquiry) throw new CreateError("Inquiry not found", 404);
    return successResponse(res, inquiry, "Inquiry archived");
  } catch (err) {
    next(err);
  }
};

// Gjenopprett arkivert henvendelse
const restoreInquiry = async (req, res, next) => {
  try {
    const inquiry = await findInquiry(req.params.inquiryId);
    if (!inquiry.archived)
      throw new CreateError("Inquiry is not archived", 400);
    inquiry.archived = false;
    await inquiry.save();
    return successResponse(res, inquiry, "Inquiry restored");
  } catch (err) {
    next(err);
  }
};

// Tildel administrator til henvendelse
const assignAdminToInquiry = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;
    const { adminId } = req.body;

    const inquiry = await findInquiry(inquiryId);
    const admin = await User.findById(adminId);
    if (!admin) throw new CreateError("Admin user not found", 404);

    inquiry.assignedTo = admin._id;
    inquiry.assignedBy = req.user._id;
    inquiry.assignedAt = new Date();

    await inquiry.save();
    return successResponse(res, inquiry, "Admin assigned");
  } catch (err) {
    next(err);
  }
};

// Oppdater status på henvendelse
const updateStatus = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;
    const { newStatus } = req.body;
    const allowedStatuses = ["ulest", "i arbeid", "ferdig"];

    if (!allowedStatuses.includes(newStatus)) {
      throw new CreateError("Invalid status value", 400);
    }

    const inquiry = await findInquiry(inquiryId);
    inquiry.status = newStatus;
    await inquiry.save();
    return successResponse(res, inquiry, "Inquiry status updated");
  } catch (err) {
    next(err);
  }
};

// Legg til kommentar
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) throw new CreateError("Comment text is required", 400);

    const inquiry = await findInquiry(req.params.inquiryId);
    inquiry.comments.push({ text, admin: req.user._id });
    await inquiry.save();

    return successResponse(res, inquiry, "Comment added");
  } catch (err) {
    next(err);
  }
};

const editComment = async (req, res, next) => {
  try {
    const { inquiryId, commentId } = req.params;
    const { text } = req.body;
    if (!text) throw new CreateError("Updated comment text is required", 400);

    const inquiry = await findInquiry(inquiryId);
    const comment = inquiry.comments.id(commentId);
    if (!comment) throw new CreateError("Comment not found", 404);
    if (!comment.admin.equals(req.user._id)) {
      throw new CreateError("Not authorized to edit this comment", 403);
    }

    comment.text = text;
    await inquiry.save();
    return successResponse(res, inquiry, "Comment updated");
  } catch (err) {
    next(err);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const inquiry = await findInquiry(req.params.inquiryId);
    const comment = inquiry.comments.id(req.params.commentId);
    if (!comment) throw new CreateError("Comment not found", 404);
    if (!comment.admin.equals(req.user._id)) {
      throw new CreateError("Not authorized to delete this comment", 403);
    }

    comment.remove();
    await inquiry.save();
    return successResponse(res, inquiry, "Comment deleted");
  } catch (err) {
    next(err);
  }
};

const addTag = async (req, res, next) => {
  try {
    const { tag } = req.body;
    if (!tag || typeof tag !== "string") {
      throw new CreateError("Tag must be a non-empty string", 400);
    }
    const normalizedTag = tag.trim().toLowerCase();

    const inquiry = await findInquiry(req.params.inquiryId);
    if (!inquiry.tags.includes(normalizedTag)) {
      inquiry.tags.push(normalizedTag);
      await inquiry.save();
    }

    return successResponse(res, inquiry, "Tag added");
  } catch (err) {
    next(err);
  }
};

const addTags = async (req, res, next) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags) || tags.length === 0) {
      throw new CreateError("Tags must be a non-empty array", 400);
    }

    const normalizedTags = tags.map((tag) => tag.trim().toLowerCase());
    const inquiry = await findInquiry(req.params.inquiryId);

    normalizedTags.forEach((tag) => {
      if (tag && !inquiry.tags.includes(tag)) {
        inquiry.tags.push(tag);
      }
    });

    await inquiry.save();
    return successResponse(res, inquiry, "Tags added");
  } catch (err) {
    next(err);
  }
};

const removeTag = async (req, res, next) => {
  try {
    const { tag } = req.body;
    if (!tag || typeof tag !== "string") {
      throw new CreateError("Tag must be a non-empty string", 400);
    }

    const normalizedTag = tag.trim().toLowerCase();
    const inquiry = await findInquiry(req.params.inquiryId);

    if (!inquiry.tags.includes(normalizedTag)) {
      throw new CreateError("Tag not found on this inquiry", 404);
    }

    inquiry.tags = inquiry.tags.filter((t) => t !== normalizedTag);
    await inquiry.save();

    return successResponse(res, inquiry, "Tag removed");
  } catch (err) {
    next(err);
  }
};

const removeTags = async (req, res, next) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags) || tags.length === 0) {
      throw new CreateError("Tags must be a non-empty array", 400);
    }

    const normalizedTags = tags.map((tag) => tag.trim().toLowerCase());
    const inquiry = await findInquiry(req.params.inquiryId);

    inquiry.tags = inquiry.tags.filter((tag) => !normalizedTags.includes(tag));
    await inquiry.save();

    return successResponse(res, inquiry, "Tags removed");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  archiveInquiry,
  restoreInquiry,
  assignAdminToInquiry,
  updateStatus,
  addComment,
  editComment,
  deleteComment,
  addTag,
  addTags,
  removeTag,
  removeTags,
};
