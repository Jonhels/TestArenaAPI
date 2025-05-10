const jwt = require("jsonwebtoken");
const CreateError = require("./createError");

const generateToken = (payload, expiresIn = "1d") => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error(`JWT Verification Error: ${error.message}`);
    throw new CreateError("Invalid or expired token", 400);
  }
};

module.exports = { generateToken, verifyToken };
