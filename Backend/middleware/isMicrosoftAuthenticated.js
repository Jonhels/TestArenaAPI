const isMicrosoftAuthenticated = (req, res, next) => {
  if (req.session?.microsoft?.email) {
    next();
  } else {
    res
      .status(401)
      .json({ error: "Unauthorized. Please login with Microsoft." });
  }
};

module.exports = isMicrosoftAuthenticated;
