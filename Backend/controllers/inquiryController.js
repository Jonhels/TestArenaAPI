const Inquiry = require("../models/inquirySchema");

// Opprette henvendelse
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
    res.status(500).json({ error: "Server error" });
  }
};

// Hente alle henvendelser
const getInquiries = async (req, res) => {
  try {
    const { includeArchived } = req.query;

    const filter = {};

    if (includeArchived !== "true") {
      filter.archived = false; // Skjul arkiverte med mindre spurt
    }

    const inquiries = await Inquiry.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ status: "success", inquiries });
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Hente én henvendelse med ID
const getInquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await Inquiry.findById(id);

    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found" });
    }

    res.status(200).json({ status: "success", inquiry });
  } catch (error) {
    console.error("Error fetching inquiry:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Oppdatere en henvendelse
const updateInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;

    const inquiry = await Inquiry.findByIdAndUpdate(
      id,
      { title, description, status },
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found" });
    }

    res.status(200).json({ status: "success", inquiry });
  } catch (error) {
    console.error("Error updating inquiry:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Slette en henvendelse
const deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = await Inquiry.findByIdAndDelete(id);

    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found" });
    }

    res
      .status(200)
      .json({ status: "success", message: "Inquiry deleted successfully" });
  } catch (error) {
    console.error("Error deleting inquiry:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Arkivere en henvendelse
const archiveInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = await Inquiry.findByIdAndUpdate(
      id,
      { archived: true },
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found" });
    }

    res.status(200).json({
      status: "success",
      message: "Inquiry archived successfully",
      inquiry,
    });
  } catch (error) {
    console.error("Error archiving inquiry:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Gjenopprette en arkivert henvendelse
const restoreInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = await Inquiry.findById(id);

    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found" });
    }

    if (!inquiry.archived) {
      return res.status(400).json({ error: "Inquiry is not archived" });
    }

    inquiry.archived = false;
    await inquiry.save();

    res.status(200).json({
      status: "success",
      message: "Inquiry restored successfully",
      inquiry,
    });
  } catch (error) {
    console.error("Error restoring inquiry:", error);
    res.status(500).json({ error: "Server error" });
  }
};


module.exports = {
  createInquiry,
  getInquiries,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  archiveInquiry,
    restoreInquiry,
};
