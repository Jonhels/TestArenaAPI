const express = require("express");
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
    resetPasswordLimiter
} = require("../controllers/userController");
const authenticateUser = require("../utils/authenticateUser")

const router = express.Router();

// User Registration
router.post("/register", registerUser);

// User Login
router.post("/login", loginUser);

// User Logout
router.post("/logout", logoutUser);

// Update User Information, protected route with authenticateUser 
router.put("/update",authenticateUser, updateUser);

// Delete User Account, protected route with authenticateUser 
router.delete("/delete", authenticateUser, deleteUser);

// Email verification route
router.get("/verify-email", verifyEmail);

// Password Recovery
router.post("/password-reset-request",resetPasswordLimiter, requestPasswordReset);
router.post("/reset-password", resetPassword);

// Fetch User Profile
router.get("/profile", authenticateUser, getProfile);

module.exports = router;
