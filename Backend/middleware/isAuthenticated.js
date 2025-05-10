const CreateError = require("../utils/createError");

const isAuthenticated = (req, res, next) => {
  if (req.session?.microsoft) return next();

  console.warn(
    "Unauthorized access attempt to protected route:",
    req.originalUrl
  );
  return next(new CreateError("Unauthorized. Please log in first", 401));
};

module.exports = isAuthenticated;
