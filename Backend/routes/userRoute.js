const express = require("express");
const router = express.Router();

const authenticateUser = require("../utils/authenticateUser");
const {
  loginLimiter,
  resetPasswordLimiter,
} = require("../middleware/rateLimiter");
const upload = require("../middleware/uploadMiddleware");
const {
  registerUser,
  loginUser,
  logoutUser,
  updateUser,
  deleteUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getProfile,
  uploadProfileImage,
  deleteProfileImage,
} = require("../controllers/userController");

// Public Routes (No Auth)
// User Registration
router.post("/register", registerUser);

// User Login (with rate limiting)
router.post("/login", loginLimiter, loginUser);

// User Logout
router.post("/logout", logoutUser);

// Email Verification
router.get("/verify-email", verifyEmail);

// Request Password Reset (with rate limiting)
router.post(
  "/password-reset-request",
  resetPasswordLimiter,
  requestPasswordReset
);

// Reset Password
router.post("/reset-password", resetPassword);

// Last opp profilbilde
router.post(
  "/profile-image",
  authenticateUser,
  upload.single("profileImage"),
  uploadProfileImage
);

// Slett profilbilde
router.delete("/profile-image", authenticateUser, deleteProfileImage);

// Protected Routes (Auth Required)
// Update User Info
router.put("/update", authenticateUser, updateUser);

// Delete User Account
router.delete("/delete", authenticateUser, deleteUser);

// Get Current User Profile
router.get("/profile", authenticateUser, getProfile);

module.exports = router;
