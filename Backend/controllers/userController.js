const User = require("../models/userSchema");
const CreateError = require("../utils/createError");
const { hashPassword, comparePassword } = require("../utils/hashPassword");
const { validateStrongPassword } = require("../utils/validators");
const { generateToken, verifyToken } = require("../utils/tokenUtils");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const path = require("path");
const fs = require("fs").promises;
const validator = require("validator");
const { SMTPClient } = require("emailjs");

// Initialisering av SMTP-klient ved oppstart
const smtpClient = new SMTPClient({
  user: process.env.EMAILJS_USER,
  password: process.env.EMAILJS_PASSWORD,
  host: process.env.EMAILJS_HOST,
  ssl: true,
  port: process.env.EMAILJS_PORT || 465,
});

// Hjelpefunksjon for sending av e-post
const sendEmail = async ({ to, subject, html, text }) => {
  await smtpClient.sendAsync({
    from: process.env.EMAILJS_FROM,
    to,
    subject,
    text,
    attachment: [{ data: html, alternative: true }],
  });
};

// Send verifiserings-e-post
const sendVerificationEmail = async (user) => {
  const token = generateToken({ id: user._id, email: user.email }, "1d");
  const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Verify Your Email",
    text: `Click to verify: ${link}`,
    html: `<p>Click <a href="${link}">here</a> to verify your email.</p>`,
  });
};

// Registrer bruker
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || name.length > 50)
      return next(
        new CreateError("Name is required and must be under 50 characters", 400)
      );

    if (!validateStrongPassword(password))
      return next(new CreateError("Password is too weak", 400));

    if (await User.findOne({ email }))
      return next(new CreateError("Email already exists", 400));

    const hashed = await hashPassword(password);
    const newUser = await User.create({
      name,
      email,
      password: hashed,
      isVerified: false,
    });

    // Håndtere feil ved e-post
    try {
      await sendVerificationEmail(newUser);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    const { password: _, ...safeUser } = newUser.toObject();
    return successResponse(
      res,
      { user: safeUser },
      "User registered. Please verify email.",
      201
    );
  } catch (err) {
    next(err);
  }
};

// Logg inn bruker
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !validator.isEmail(email) || !password)
      return next(new CreateError("Invalid email or password", 400));

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await comparePassword(password, user.password)))
      return next(new CreateError("Invalid email or password", 401));

    const token = generateToken({ id: user._id }, process.env.JWT_EXPIRES_IN);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge:
        (parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) || 14) * 86400000, // 14 dager fallback
    });

    const { password: _, ...safeUser } = user.toObject();
    return successResponse(res, { user: safeUser }, "User logged in");
  } catch (err) {
    next(err);
  }
};

// Logg ut bruker
const logoutUser = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
  return successResponse(res, {}, "Logged out successfully");
};

// Verifiser e-post
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id);
    if (!user) throw new CreateError("Invalid token or user not found", 400);
    if (user.isVerified) throw new CreateError("Email already verified", 400);

    user.isVerified = true;
    await user.save();

    res.cookie("token", "", {
      httpOnly: true,
      expires: new Date(0),
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    return successResponse(res, {}, "Email verified. You can now log in.");
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 400);
  }
};

// Be om lenke for å nullstille passord
const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return next(new CreateError("User not found", 404));

    const token = generateToken({ id: user._id, email: user.email }, "1h");
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: "Reset Your Password",
      text: `Reset here: ${link}`,
      html: `<p>Click <a href="${link}">here</a> to reset your password.</p>`,
    });

    return successResponse(res, {}, "Password reset link sent to email.");
  } catch (err) {
    next(err);
  }
};

// Nullstille passord
const resetPassword = async (req, res) => {
  try {
    const { token } = req.query;
    const { newPassword } = req.body;

    if (!validateStrongPassword(newPassword))
      return errorResponse(res, "Password is too weak", 400);

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) return errorResponse(res, "User not found", 404);

    user.password = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    await user.save();

    return successResponse(res, {}, "Password has been reset");
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 400);
  }
};

// Hent profil
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return next(new CreateError("User not found", 404));
    return successResponse(res, { user });
  } catch (err) {
    next(err);
  }
};

// Oppdater navn/passord
const updateUser = async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const update = {};

    if (name) {
      if (name.length > 50) return next(new CreateError("Name too long", 400));
      update.name = name.trim();
    }

    if (password) {
      if (!validateStrongPassword(password))
        return next(new CreateError("Weak password", 400));
      update.password = await hashPassword(password);
    }

    if (Object.keys(update).length === 0)
      return next(new CreateError("No data to update", 400));

    const updatedUser = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      select: "-password",
    });

    return successResponse(res, { user: updatedUser }, "User updated");
  } catch (err) {
    next(err);
  }
};

// Slett bruker
const deleteUser = async (req, res, next) => {
  try {
    const deleted = await User.findByIdAndDelete(req.user._id);
    if (!deleted) return next(new CreateError("User not found", 404));

    res.cookie("token", "", {
      httpOnly: true,
      expires: new Date(0),
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    return successResponse(res, {}, "User deleted");
  } catch (err) {
    next(err);
  }
};

// Last opp profilbilde
const uploadProfileImage = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new CreateError("User not found", 404));

    if (user.profileImage) {
      const oldPath = path.join(
        __dirname,
        "../uploads/profiles",
        path.basename(user.profileImage)
      );
      try {
        await fs.unlink(oldPath);
      } catch (err) {
        console.warn("Previous profile image deletion failed:", err.message);
      }
    }

    user.profileImage = `/uploads/profiles/${req.file.filename}`;
    await user.save();

    return successResponse(
      res,
      { imageUrl: user.profileImage },
      "Image uploaded"
    );
  } catch (err) {
    next(err);
  }
};

// Slett profilbilde
const deleteProfileImage = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user?.profileImage)
      return next(new CreateError("Profile image not found", 404));

    const filePath = path.join(
      __dirname,
      "../uploads/profiles",
      path.basename(user.profileImage)
    );

    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn("Profile image deletion failed:", err.message);
    }

    user.profileImage = "";
    await user.save();

    return successResponse(res, {}, "Image deleted");
  } catch (err) {
    next(err);
  }
};

// Hent alle admin-profiler
const getAllProfiles = async (req, res, next) => {
  try {
    const { name, sort } = req.query;
    const filter = name ? { name: { $regex: name, $options: "i" } } : {};
    let query = User.find(filter).select("name email profileImage");

    if (sort === "asc") query = query.sort({ name: 1 });
    if (sort === "desc") query = query.sort({ name: -1 });

    const admins = await query;
    return successResponse(res, { admins });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getProfile,
  updateUser,
  deleteUser,
  uploadProfileImage,
  deleteProfileImage,
  getAllProfiles,
};
