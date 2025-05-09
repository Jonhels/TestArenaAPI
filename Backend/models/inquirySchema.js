const mongoose = require("mongoose");

const inquirySchema = new mongoose.Schema(
  {
    // Kontaktinformasjon
    companyName: String,
    companyCity: String,
    companyWebsite: String,
    contactName: String,
    contactEmail: String,
    contactPhone: String,

    // Om produktet
    productTitle: String,
    productDescription: String,
    developmentStage: String,
    productType: [String],
    partnerDescription: String,
    storageDescription: String,
    projectOwner: String,
    readyToUse: String,

    // Tilleggsinformasjon
    userExperience: String,
    testingInfo: String,
    marketAnalysis: String,
    testedElsewhere: String,
    explanationIfTested: String,
    collaboration: String,
    additionalNotes: String,
    feedback: String,

    // Vedlegg
    attachmentUrl: {
      type: String,
    },

    // Systemfelter
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
    assignedAt: Date,
    status: {
      type: String,
      enum: ["ulest", "i arbeid", "ferdig"],
      default: "ulest",
    },
    archived: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    comments: [
      {
        text: { type: String, required: true },
        admin: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    recommendations: [
      {
        name: String,
        businessName: String,
        contactId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Contacts",
        },
        email: String,
        phone: String,
        officeLocation: String,
        responsibility: String,
      },
    ],
    caseNumber: {
      type: String,
      unique: true,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inquiry", inquirySchema);
