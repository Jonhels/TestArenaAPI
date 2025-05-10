const mongoose = require("mongoose");
const { isEmail } = require("validator");

const microsoftTokenSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: [true, "User email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: [isEmail, "Please provide a valid email address"],
    },
    accessToken: {
      type: String,
      required: [true, "Access token is required"],
    },
    refreshToken: {
      type: String,
      required: [true, "Refresh token is required"],
      select: false,
    },
    name: {
      type: String,
      trim: true,
    },
    microsoftId: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);
