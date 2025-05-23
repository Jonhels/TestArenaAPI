const express = require("express");
const router = express.Router();
const checkAdmin = require("../middleware/checkAdmin");

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
  createUserAsAdmin,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getProfile,
  getAllProfiles,
  uploadProfileImage,
  deleteProfileImage,
  updateAnyUser,
  deleteAnyUser
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

// Delete any user (admin only)
router.delete("/:id", authenticateUser, checkAdmin, deleteAnyUser);


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
router.delete("/delete", authenticateUser, checkAdmin, deleteUser);

// Get Current User Profile
router.get("/profile", authenticateUser, getProfile);

// Get All User Profiles (Admin Only)
router.get("/profiles", authenticateUser, getAllProfiles);

// Update any user (admin only)
router.put("/:id", authenticateUser, checkAdmin, updateAnyUser);

// Create new user (admin only)
router.post("/", authenticateUser, checkAdmin, createUserAsAdmin);

module.exports = router;
