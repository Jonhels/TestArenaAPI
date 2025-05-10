const express = require("express");
const router = express.Router();

const authenticateUser = require("../utils/authenticateUser");
const requireAdmin = require("../utils/requireAdmin");
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
  getAllProfiles,
  uploadProfileImage,
  deleteProfileImage,
} = require("../controllers/userController");

// ======================
// PUBLIC ROUTES
// ======================

// User Registration
router.post("/register", registerUser);

// User Login (with rate limiting)
router.post("/login", loginLimiter, loginUser);

// User Logout
router.post("/logout", logoutUser);

// Email Verification
router.get("/verify-email", verifyEmail);

// Request Password Reset
router.post(
  "/password-reset-request",
  resetPasswordLimiter,
  requestPasswordReset
);

// Reset Password via Token
router.post("/reset-password", resetPassword);

// ======================
// AUTHENTICATED ROUTES (Logged-in users)
// ======================

// Upload Profile Image
router.post(
  "/profile-image",
  authenticateUser,
  upload.single("profileImage"),
  uploadProfileImage
);

// Delete Profile Image
router.delete("/profile-image", authenticateUser, deleteProfileImage);

// Update User Info (name/password)
router.put("/update", authenticateUser, updateUser);

// Delete User Account
router.delete("/delete", authenticateUser, deleteUser);

// Get Own Profile Info
router.get("/profile", authenticateUser, getProfile);

// ======================
// ADMIN-ONLY ROUTES
// ======================

// Get All User Profiles (admin only)
router.get("/profiles", authenticateUser, getAllProfiles);

module.exports = router;
