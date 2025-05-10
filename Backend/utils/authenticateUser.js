const jwt = require("jsonwebtoken");
const User = require("../models/userSchema");
const CreateError = require("./createError");

const authenticateUser = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return next(new CreateError("Authentication required", 401));
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not defined in .env");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(new CreateError("Invalid or expired token", 401));
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isVerified) {
      return next(
        new CreateError("Account not verified or user not found", 401)
      );
    }

    if (
      user.passwordChangedAt &&
      decoded.iat * 1000 < user.passwordChangedAt.getTime()
    ) {
      return next(
        new CreateError("Password changed recently. Please log in again.", 401)
      );
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
module.exports = authenticateUser;
