const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status =
    err.status || (statusCode >= 400 && statusCode < 500 ? "fail" : "error");
  const message = err.message || "Something went wrong";

  if (process.env.NODE_ENV !== "production") {
    console.error("Error:", message);
    console.error("Stack:", err.stack);
  }

  res.status(statusCode).json({
    status,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
