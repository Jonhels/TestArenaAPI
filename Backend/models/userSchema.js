const mongoose = require("mongoose");
const { isEmail } = require("validator");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your full name"],
    maxlength: [50, "Name cannot exceed 50 characters"],
  },
  email: {
    type: String,
    required: [true, "Please enter your email"],
    lowercase: true,
    unique: true,
    validate: [isEmail, "Please enter a valid email"],
  },
  password: {
    type: String,
    required: [true, "Please enter your password"],
    minlength: [6, "Minimum password length is 6 characters"],
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  passwordChangedAt: {
    type: Date,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  profileImage: {
    type: String,
    default: "",
  },
  // Administratorer kan velge om de vil få e-poster eller ikke
  emailNotifications: {
    type: Boolean,
    default: true,
  },
});

const User = mongoose.model("User", userSchema);
module.exports = User;
