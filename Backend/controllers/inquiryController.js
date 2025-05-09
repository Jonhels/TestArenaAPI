const Inquiry = require("../models/inquirySchema");
const User = require("../models/userSchema");
const sendInquiryNotification = require("../utils/sendInquiryNotification");

// Helper to generate 4-digit and 3-digit parts
const generateCaseNumber = () => {
  const part1 = Math.floor(1000 + Math.random() * 9000); // 4-digit
  const part2 = Math.floor(100 + Math.random() * 900);   // 3-digit
  return `${part1}-${part2}`;
};


// Opprette en ny henvendelse
const createInquiry = async (req, res) => {
  try {
    const data = req.body;

    // Hvis fil er lastet opp, legg til URL
    if (req.file) {
      data.attachmentUrl = `/uploads/inquiries/${req.file.filename}`;
    }

    // Generer unikt saksnummer
    let unique = false;
    let caseNumber = "";

    for (let i = 0; i < 10; i++) {
      caseNumber = generateCaseNumber();
      const existing = await Inquiry.findOne({ caseNumber });
      if (!existing) {
        unique = true;
        break;
      }
    }

    if (!unique) {
      return res.status(500).json({ error: "Failed to generate unique case number." });
    }

    data.caseNumber = caseNumber;

    const inquiry = await Inquiry.create(data);

    sendInquiryNotification(inquiry).catch((err) => {
      console.error("Failed to send inquiry notification email:", err);
    });

    res.status(201).json({ status: "success", inquiry });
  } catch (error) {
    console.error("Error creating inquiry:", error);
    res.status(500).json({ error: "Failed to create inquiry." });
  }
};


// Hente alle henvendelser (med filtrering)
const getAllInquiries = async (req, res) => {
  try {
    const { status, assignedTo, includeArchived, tag } = req.query;

    const filter = {};

    if (includeArchived !== "true") {
      filter.archived = false;
    }
    if (status) {
      filter.status = status;
    }
    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }
    if (tag) {
      filter.tags = { $in: [tag.toLowerCase()] };
    }

    const inquiries = await Inquiry.find(filter).sort({ createdAt: -1 });

    res.status(200).json({ status: "success", inquiries });
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    res.status(500).json({ error: "Failed to fetch inquiries." });
  }
};

// Hente én henvendelse basert på ID
const getInquiryById = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const inquiry = await Inquiry.findById(inquiryId);

    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    res.status(200).json({ status: "success", inquiry });
  } catch (error) {
    console.error("Error fetching inquiry:", error);
    res.status(500).json({ error: "Failed to fetch inquiry." });
  }
};

// Oppdatere en henvendelse
const updateInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;

    const inquiry = await Inquiry.findByIdAndUpdate(inquiryId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    res.status(200).json({ status: "success", inquiry });
  } catch (error) {
    console.error("Error updating inquiry:", error);
    res.status(500).json({ error: "Failed to update inquiry." });
  }
};

// Slette en henvendelse
const deleteInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;

    const inquiry = await Inquiry.findByIdAndDelete(inquiryId);

    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    res.status(200).json({
      status: "success",
      message: "Inquiry deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting inquiry:", error);
    res.status(500).json({ error: "Failed to delete inquiry." });
  }
};

// Arkivere en henvendelse
const archiveInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;

    const inquiry = await Inquiry.findByIdAndUpdate(
      inquiryId,
      { archived: true },
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    res.status(200).json({
      status: "success",
      message: "Inquiry archived successfully.",
      inquiry,
    });
  } catch (error) {
    console.error("Error archiving inquiry:", error);
    res.status(500).json({ error: "Failed to archive inquiry." });
  }
};

// Gjenopprette en arkivert henvendelse
const restoreInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;

    const inquiry = await Inquiry.findById(inquiryId);

    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }
    if (!inquiry.archived) {
      return res.status(400).json({ error: "Inquiry is not archived." });
    }

    inquiry.archived = false;
    await inquiry.save();

    res.status(200).json({
      status: "success",
      message: "Inquiry restored successfully.",
      inquiry,
    });
  } catch (error) {
    console.error("Error restoring inquiry:", error);
    res.status(500).json({ error: "Failed to restore inquiry." });
  }
};

// Tilordne en admin til en henvendelse
const assignAdminToInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { adminId } = req.body;

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: "Admin user not found." });
    }

    inquiry.assignedTo = admin._id;
    inquiry.assignedBy = req.user._id;
    inquiry.assignedAt = new Date();

    await inquiry.save();

    res.status(200).json({
      status: "success",
      message: "Admin assigned successfully.",
      inquiry,
    });
  } catch (error) {
    console.error("Error assigning admin:", error);
    res.status(500).json({ error: "Failed to assign admin." });
  }
};

// Oppdatere status på en henvendelse
const updateStatus = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { newStatus } = req.body;

    const allowedStatuses = ["ulest", "i arbeid", "ferdig"];

    if (!allowedStatuses.includes(newStatus)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    inquiry.status = newStatus;
    await inquiry.save();

    res.status(200).json({
      status: "success",
      message: "Inquiry status updated successfully.",
      inquiry,
    });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ error: "Failed to update status." });
  }
};

// Kommentar-funksjoner
const addComment = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Comment text is required." });
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    inquiry.comments.push({
      text,
      admin: req.user._id,
    });

    await inquiry.save();

    res.status(200).json({
      status: "success",
      message: "Comment added successfully.",
      inquiry,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment." });
  }
};

const editComment = async (req, res) => {
  try {
    const { inquiryId, commentId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res
        .status(400)
        .json({ error: "Updated comment text is required." });
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    const comment = inquiry.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found." });
    }

    if (!comment.admin.equals(req.user._id)) {
      return res
        .status(403)
        .json({ error: "Not authorized to edit this comment." });
    }

    comment.text = text;
    await inquiry.save();

    res.status(200).json({
      status: "success",
      message: "Comment updated successfully.",
      inquiry,
    });
  } catch (error) {
    console.error("Error editing comment:", error);
    res.status(500).json({ error: "Failed to edit comment." });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { inquiryId, commentId } = req.params;

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    const comment = inquiry.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found." });
    }

    if (!comment.admin.equals(req.user._id)) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this comment." });
    }

    comment.remove();
    await inquiry.save();

    res.status(200).json({
      status: "success",
      message: "Comment deleted successfully.",
      inquiry,
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment." });
  }
};

// Tags
const addTag = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { tag } = req.body;

    if (!tag || typeof tag !== "string") {
      return res.status(400).json({ error: "Tag must be a non-empty string." });
    }

    const normalizedTag = tag.trim().toLowerCase();

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    if (!inquiry.tags.includes(normalizedTag)) {
      inquiry.tags.push(normalizedTag);
      await inquiry.save();
    }

    res.status(200).json({ status: "success", inquiry });
  } catch (error) {
    console.error("Error adding tag:", error);
    res.status(500).json({ error: "Failed to add tag." });
  }
};

const addTags = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: "Tags must be a non-empty array." });
    }

    const normalizedTags = tags.map((tag) => tag.trim().toLowerCase());

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    normalizedTags.forEach((tag) => {
      if (tag && !inquiry.tags.includes(tag)) {
        inquiry.tags.push(tag);
      }
    });

    await inquiry.save();

    res.status(200).json({ status: "success", inquiry });
  } catch (error) {
    console.error("Error adding tags:", error);
    res.status(500).json({ error: "Failed to add tags." });
  }
};

const removeTag = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { tag } = req.body;

    if (!tag || typeof tag !== "string") {
      return res.status(400).json({ error: "Tag must be a non-empty string." });
    }

    const normalizedTag = tag.trim().toLowerCase();

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    if (!inquiry.tags.includes(normalizedTag)) {
      return res.status(404).json({ error: "Tag not found on this inquiry." });
    }

    inquiry.tags = inquiry.tags.filter((t) => t !== normalizedTag);
    await inquiry.save();

    res.status(200).json({
      status: "success",
      message: "Tag removed successfully.",
      inquiry,
    });
  } catch (error) {
    console.error("Error removing tag:", error);
    res.status(500).json({ error: "Failed to remove tag." });
  }
};

const removeTags = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: "Tags must be a non-empty array." });
    }

    const normalizedTags = tags.map((tag) => tag.trim().toLowerCase());

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    inquiry.tags = inquiry.tags.filter((tag) => !normalizedTags.includes(tag));
    await inquiry.save();

    res.status(200).json({
      status: "success",
      message: "Tags removed successfully.",
      inquiry,
    });
  } catch (error) {
    console.error("Error removing tags:", error);
    res.status(500).json({ error: "Failed to remove tags." });
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
