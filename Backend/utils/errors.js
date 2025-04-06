class SessionExpiredError extends Error {
  constructor(message = "Session expired. Please login again.") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

module.exports = { SessionExpiredError };
