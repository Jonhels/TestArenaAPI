const Inquiry = require("../models/inquirySchema");
const User = require("../models/userSchema");

// Opprette en ny henvendelse
const createInquiry = async (req, res) => {
  try {
    const { title, description, status } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "Title and description are required." });
    }

    const inquiry = await Inquiry.create({ title, description, status });
    res.status(201).json({ status: "success", inquiry });
  } catch (error) {
    console.error("Error creating inquiry:", error);
    res.status(500).json({ error: "Failed to create inquiry." });
  }
};

// Hente alle henvendelser (med filtrering)
const getAllInquiries = async (req, res) => {
  try {
    const { status, assignedTo, includeArchived } = req.query;

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
    const { title, description, status } = req.body;

    const inquiry = await Inquiry.findByIdAndUpdate(
      inquiryId,
      { title, description, status },
      { new: true, runValidators: true }
    );

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

    res
      .status(200)
      .json({ status: "success", message: "Inquiry deleted successfully." });
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

    res
      .status(200)
      .json({
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

    res
      .status(200)
      .json({
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

    res
      .status(200)
      .json({
        status: "success",
        message: "Admin assigned successfully.",
        inquiry,
      });
  } catch (error) {
    console.error("Error assigning admin:", error);
    res.status(500).json({ error: "Failed to assign admin." });
  }
};

// Legge til en kommentar
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

    res
      .status(200)
      .json({
        status: "success",
        message: "Comment added successfully.",
        inquiry,
      });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment." });
  }
};

// Redigere en kommentar
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

    res
      .status(200)
      .json({
        status: "success",
        message: "Comment updated successfully.",
        inquiry,
      });
  } catch (error) {
    console.error("Error editing comment:", error);
    res.status(500).json({ error: "Failed to edit comment." });
  }
};

// Slette en kommentar
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

    res
      .status(200)
      .json({
        status: "success",
        message: "Comment deleted successfully.",
        inquiry,
      });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment." });
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
  addComment,
  editComment,
  deleteComment,
};
