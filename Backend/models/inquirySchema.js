const mongoose = require("mongoose");
const { isEmail } = require("validator");

const inquirySchema = new mongoose.Schema(
  {
    // Kontaktinformasjon
    companyName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    companyCity: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    companyWebsite: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    contactName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      validate: [isEmail, "Please enter a valid email address"],
    },
    contactPhone: {
      type: String,
      trim: true,
      maxlength: 20,
    },

    // Om produktet
    productTitle: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    productDescription: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
    developmentStage: {
      type: String,
      trim: true,
    },
    productType: {
      type: [String],
      default: [],
    },
    partnerDescription: {
      type: String,
      trim: true,
    },
    storageDescription: {
      type: String,
      trim: true,
    },
    projectOwner: {
      type: String,
      trim: true,
    },
    readyToUse: {
      type: String,
      trim: true,
    },

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
      trim: true,
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
        text: {
          type: String,
          required: true,
          trim: true,
          maxlength: 1000,
        },
        admin: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
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
        email: {
          type: String,
          trim: true,
          lowercase: true,
        },
        phone: {
          type: String,
          trim: true,
        },
        officeLocation: String,
        responsibility: String,
      },
    ],

    caseNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inquiry", inquirySchema);
