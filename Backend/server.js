require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");

// Custom imports
const dbConnect = require("./config/dbConnect");

// Routes
const userRoutes = require("./routes/userRoute");
const inquiryRoutes = require("./routes/inquiryRoute");
const contactsRoutes = require("./routes/contactsRoute");
const calendarRoutes = require("./routes/calendarRoutes");
const microsoftRoutes = require("./routes/microsoftRoutes");
const aiRoutes = require("./routes/aiRoutes");

// Init app
const app = express();

// Middleware
app.use(morgan("tiny"));
app.use(helmet());
app.use(cookieParser());
app.use(express.json());

// Session config
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 14 * 24 * 60 * 60, // 14 days
    }),
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

// CORS
const whitelist = [
  "https://testarena-production.up.railway.app",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      console.error("CORS Error: Missing Origin header");
      return callback(new Error("Access denied. Missing Origin header."));
    }
    if (whitelist.includes(origin)) {
      return callback(null, true);
    }
    console.error(`CORS Error: Origin ${origin} not allowed`);
    callback(new Error("Access denied. Origin not allowed by CORS."));
  },
  credentials: true,
};

// Static HTML landing page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "index.html"));
});

// Routes
app.use("/api/users", cors(corsOptions), userRoutes);
app.use("/api/inquiries", cors(corsOptions), inquiryRoutes);
app.use("/api/contacts", cors(corsOptions), contactsRoutes);
app.use("/api/calendar", cors(corsOptions), calendarRoutes);
app.use("/api/microsoft", cors(corsOptions), microsoftRoutes);
app.use("/api/ai", cors(corsOptions), aiRoutes);

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
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

app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log("Shutting down gracefully...");
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Start server
dbConnect()
  .then(() => {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });
