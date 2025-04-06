const mongoose = require("mongoose");

const inquirySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Inquiry title is required"],
      maxlength: [50, "Inquiry title cannot exceed 50 characters"],
    },
    description: {
      type: String,
      required: [true, "Inquiry description is required"],
      maxlength: [500, "Inquiry description cannot exceed 500 characters"],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["ny", "pågår", "fullført"],
      default: "ny",
    },
    archived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inquiry", inquirySchema);
