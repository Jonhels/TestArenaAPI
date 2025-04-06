const mongoose = require("mongoose");

const microsoftTokenSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true, unique: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    name: { type: String },
    microsoftId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MicrosoftToken", microsoftTokenSchema);
