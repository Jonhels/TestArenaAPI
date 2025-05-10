const CreateError = require("../utils/createError");

const isMicrosoftAuthenticated = (req, res, next) => {
  if (req.session?.microsoft?.email) {
    return next();
  }

  console.warn("Unauthorized Microsoft access attempt:", req.originalUrl);
  return next(
    new CreateError("Unauthorized. Please login with Microsoft.", 401)
  );
};

module.exports = isMicrosoftAuthenticated;
