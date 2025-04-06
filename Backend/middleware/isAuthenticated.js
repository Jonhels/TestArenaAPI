const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.microsoft) {
    // Hvis microsoft-data finnes i session
    return next(); // Brukeren er autentisert, gå videre
  } else {
    return res.status(401).json({ error: "Unauthorized. Please login first." });
  }
};

module.exports = isAuthenticated;
