const CreateError = require("./createError");

module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new CreateError("Admin access required", 403));
  }
  next();
};
