const jwt = require("jsonwebtoken");
const User = require("../models/userSchema");
const createError = require("../utils/createError");
const { hashPassword, comparePassword } = require("../utils/hashPassword");
const validator = require("validator");
const path = require("path");
const fs = require("fs");

let SMTPClient;
(async () => {
  const emailjs = await import("emailjs");
  SMTPClient = emailjs.SMTPClient;
})();

const validateStrongPassword = (password) => {
  return validator.isStrongPassword(password, {
    minLength: 6,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  });
};

// // Oppretter SMTP-klient inne i try/catch for å unngå krasj ved feil initiering
const sendVerificationEmail = async (user) => {
  if (!SMTPClient) {
    throw new Error("SMTP Client not initialized yet");
  }

  const verificationToken = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" } // Token valid for 1 day
  );

  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  try {
    const client = new SMTPClient({
      user: process.env.EMAILJS_USER,
      password: process.env.EMAILJS_PASSWORD,
      host: process.env.EMAILJS_HOST,
      ssl: true, // Use SSL (Port 465)
      port: process.env.EMAILJS_PORT || 465,
    });

    await client.sendAsync({
      text: `Click the following link to verify your email: ${verificationLink}`,
      from: process.env.EMAILJS_FROM,
      to: user.email,
      subject: "Verify Your Email",
      attachment: [
        {
          data: `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`,
          alternative: true,
        },
      ],
    });

    console.log("Verification email sent successfully");
  } catch (error) {
    console.error("Error sending verification email:", error.message);
    throw new Error("Failed to send verification email");
  }
};

// Registrere ny bruker (med e-postbekreftelse)
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, organization } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (name.length > 50) {
      return res
        .status(400)
        .json({ error: "Name cannot exceed 50 characters" });
    }

    if (!validateStrongPassword(password)) {
      return res.status(400).json({
        error:
          "Password must be stronger. At least 6 characters, including a number, a symbol, and mixed case letters",
      });
    }

    const exist = await User.findOne({ email });
    if (exist) {
      return next(new createError("Email already exists", 400));
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      phone,
      role: role || "guest",
      organization
    });

    await sendVerificationEmail(newUser);

    const userForResponse = { ...newUser._doc };
    delete userForResponse.password;

    res.status(201).json({
      status: "success",
      messsage:
        "User registred successfully. Please check your email to verify your account.",
      user: userForResponse,
    });
  } catch (error) {
    next(error);
  }
};

const updateAnyUser = async (req, res, next) => {
  const { id } = req.params;
  const { name, email, phone, role, organization } = req.body;

  const updateData = {};

  if (name) {
    if (name.trim().length > 50) {
      return res.status(400).json({ error: "Name cannot exceed 50 characters" });
    }
    updateData.name = name.trim();
  }

  if (email) {
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    updateData.email = email.trim();
  }

  if (phone !== undefined) {
    const trimmedPhone = phone.trim();
    if (trimmedPhone === "") {
      updateData.phone = "";
    } else if (!/^\d{8,15}$/.test(trimmedPhone)) {
      return res.status(400).json({ error: "Phone number must be 8 digits" });
    } else {
      updateData.phone = trimmedPhone;
    }
  }


  if (role) {
    if (!["admin", "guest"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    updateData.role = role;
  }

  if (organization) {
    if (organization.length > 50) {
      return res.status(400).json({ error: "Organization name cannot exceed 50 characters" });
    }
    updateData.organization = organization.trim();
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      select: "-password",
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      status: "success",
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    next(error);
  }
};



// 	Logge inn bruker (JWT, cookie)
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !validator.isEmail(email) || !password) {
      return next(new createError("Invalid email or password", 400));
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await comparePassword(password, user.password))) {
      return next(new createError("Invalid email or password", 401));
    }

    const token = jwt.sign(
      { id: user._id }, // Add role here later when implementing administrator access
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) * 24 * 60 * 60 * 1000,
    });

    const userForResponse = { ...user.toObject() };
    delete userForResponse.password;

    res.status(200).json({
      status: "success",
      message: "User logged in successfully",
      user: userForResponse,
    });
  } catch (error) {
    next(error);
  }
};

// 	Logge ut bruker (nullstille cookie)
const logoutUser = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
  res.status(200).json({ message: "Logged out successfully" });
};

// Oppdatere navn eller passord for innlogget bruker
const updateUser = async (req, res, next) => {
  const userId = req.user._id;
  const { name, email, password, phone, role, organization } = req.body;

  const updateData = {};

  try {
    // Name
    if (name && name.trim()) {
      if (name.length > 50) {
        return res.status(400).json({ error: "Name cannot exceed 50 characters" });
      }
      updateData.name = name.trim();
    }

    // Email
    if (email && email.trim()) {
      if (!validator.isEmail(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== userId.toString()) {
        return res.status(400).json({ error: "Email is already in use" });
      }

      updateData.email = email.trim().toLowerCase();
    }

    // Password
    if (password && password.trim()) {
      if (!validateStrongPassword(password)) {
        return res.status(400).json({
          error:
            "Password must be stronger. At least 6 characters, including a number, a symbol, and mixed case letters",
        });
      }
      const hashedPassword = await hashPassword(password);
      updateData.password = hashedPassword;
    }

    // Phone
    if (phone !== undefined) {
      const trimmedPhone = phone.trim();
      if (trimmedPhone === "") {
        updateData.phone = ""; // clear phone
      } else if (!/^\d{8,15}$/.test(trimmedPhone)) {
        return res.status(400).json({ error: "Phone number must be 8–15 digits" });
      } else {
        updateData.phone = trimmedPhone;
      }
    }


    // Organization
    if (organization !== undefined) {
      if (organization.trim().length > 50) {
        return res.status(400).json({ error: "Organization name cannot exceed 50 characters" });
      }
      updateData.organization = organization.trim();
    }


    // Optional: prevent user from changing their own role
    // Prevent user from changing their own role
    if (role && role !== req.user.role) {
      return res.status(403).json({ error: "You are not allowed to change your role" });
    }


    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      select: "-password",
    });

    res.status(200).json({
      status: "success",
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    next(error);
  }
};


// 	Slette egen bruker og cookie
const deleteUser = async (req, res, next) => {
  const userId = req.user._id;

  try {
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.cookie("token", "", {
      httpOnly: true,
      expires: new Date(0),
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.status(200).json({
      status: "success",
      message: "User account and data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    next(error);
  }
};

// 	Verifisere brukerens e-postadresse via token
const verifyEmail = async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res
        .status(400)
        .json({ error: "Invalid token or user does not exist." });
    }

    if (user.isVerified) {
      return res
        .status(400)
        .json({ error: "Email already verified. Please log in." });
    }

    user.isVerified = true; // Mark user as verified
    await user.save();

    res.cookie("token", "", {
      httpOnly: true,
      expires: new Date(0),
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.status(200).json({
      status: "success",
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    res.status(400).json({ error: "Invalid or expired token." });
  }
};

// 	Be om å få tilsendt link for å nullstille passord
const requestPasswordReset = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ error: "User with this email does not exist." });
    }

    const resetToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // Token valid for 1 hour
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const client = new SMTPClient({
      user: process.env.EMAILJS_USER,
      password: process.env.EMAILJS_PASSWORD,
      host: process.env.EMAILJS_HOST,
      ssl: true,
    });

    await client.sendAsync({
      text: `Reset your password by clicking the link: ${resetLink}`, // Plain text content
      from: process.env.EMAILJS_FROM,
      to: user.email,
      subject: "Reset Your Password",
      attachment: [
        {
          data: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
          alternative: true,
        }, // HTML content
      ],
    });

    res.status(200).json({
      status: "success",
      message: "Password reset link sent to your email.",
    });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    next(error);
  }
};

// 	Nullstille passord via token
const resetPassword = async (req, res, next) => {
  const { token } = req.query; // Token from the reset link
  const { newPassword } = req.body; // New password provided by the user

  try {
    if (!newPassword || newPassword.trim().length === 0) {
      return res.status(400).json({ error: "Password is required." });
    }

    if (!validateStrongPassword(newPassword)) {
      return res.status(400).json({
        error:
          "Password must be stronger. At least 6 characters, including a number, a symbol, and mixed case letters.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res
        .status(404)
        .json({ error: "Invalid token or user does not exist." });
    }

    // Hash the new password and update it
    user.password = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    await user.save();

    res.status(200).json({
      status: "success",
      message:
        "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(400).json({ error: "Invalid or expired token." });
  }
};

// Hente innlogget brukers profilinfo (uten passord).
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user._id; // Extracted from the `authenticateUser` middleware
    const user = await User.findById(userId).select("-password"); // Fetch user without the password

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json({
      status: "success",
      user, // Return the user's data
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    next(error);
  }
};

// Hente alle admin-profiler
const getAllProfiles = async (req, res, next) => {
  try {
    const { name, sort } = req.query;

    const filter = {};
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    const query = User.find(filter).select("-password");

    if (sort === "asc") {
      query.sort({ name: 1 });
    } else if (sort === "desc") {
      query.sort({ name: -1 });
    }

    const users = await query;

    res.status(200).json({
      status: "success",
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    next(error);
  }
};


// Last opp profilbilde
const uploadProfileImage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Slett gammelt bilde hvis det finnes
    if (user.profileImage) {
      const oldImagePath = path.join(
        __dirname,
        "../uploads/profiles",
        path.basename(user.profileImage)
      );
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Lagre nytt bilde
    user.profileImage = `/uploads/profiles/${req.file.filename}`;
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Profile image uploaded successfully",
      imageUrl: user.profileImage,
    });
  } catch (error) {
    console.error("Error uploading profile image:", error);
    next(error);
  }
};

// In userController.js
const createUserAsAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, role } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const generatedPassword = Math.random().toString(36).slice(-8) + "A1!";
    const hashedPassword = await hashPassword(generatedPassword);

    const newUser = await User.create({
      name,
      email,
      phone,
      role: role || "guest",
      password: hashedPassword,
      isVerified: false,
    });

    await sendVerificationEmail(newUser);

    const userForResponse = { ...newUser._doc };
    delete userForResponse.password;

    res.status(201).json({ user: userForResponse });
  } catch (error) {
    next(error);
  }
};


// Slett profilbilde
const deleteProfileImage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user || !user.profileImage) {
      return res.status(404).json({ error: "Profile image not found." });
    }

    const imagePath = path.join(
      __dirname,
      "../uploads/profiles",
      path.basename(user.profileImage)
    );
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    user.profileImage = "";
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Profile image deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting profile image:", error);
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  updateUser,
  updateAnyUser,
  createUserAsAdmin,
  deleteUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getProfile,
  getAllProfiles,
  uploadProfileImage,
  deleteProfileImage,
};
