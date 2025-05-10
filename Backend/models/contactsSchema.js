const mongoose = require("mongoose");
const { isEmail } = require("validator");

const contactsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter the contact's name"],
      maxlength: [50, "Name cannot exceed 50 characters"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please enter contact's email"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [isEmail, "Please enter a valid email"],
    },
    phone: {
      type: String,
      required: [true, "Please enter the contact's phone number"],
      trim: true,
      validate: {
        validator: function (value) {
          return /^[+\d\s()-]{5,20}$/.test(value); // enkel regex
        },
        message: "Please enter a valid phone number",
      },
    },
    officeLocation: {
      type: String,
      required: [true, "Please enter the contact's office location"],
      maxlength: [100, "Office location cannot exceed 100 characters"],
      trim: true,
    },
    businessName: {
      type: String,
      required: [true, "Please enter the contact's business name"],
      maxlength: [100, "Business name cannot exceed 100 characters"],
      trim: true,
    },
    responsibility: {
      type: String,
      required: [true, "Please enter the contact's responsibility"],
      maxlength: [100, "Responsibility cannot exceed 100 characters"],
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contacts", contactsSchema);
