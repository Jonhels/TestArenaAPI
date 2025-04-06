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

// Database connection
const dbConnect = require("./config/dbConnect");

// Import routes
const userRoutes = require("./routes/userRoute");
const inquiryRoutes = require("./routes/inquiryRoute");
const contactsRoutes = require("./routes/contactsRoute");
const calendarRoutes = require("./routes/calendarRoutes");
const microsoftRoutes = require("./routes/microsoftRoutes");

// Init app
const app = express();

// Middleware
app.use(morgan("tiny")); // Log requests
app.use(helmet()); // Secure HTTP headers
app.use(cookieParser());
app.use(express.json()); // Parse JSON bodies

// Setup sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Must exist in .env
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 14 * 24 * 60 * 60, // Session valid for 14 days
    }),
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // HTTPS cookies only in production
    },
  })
);

// CORS setup
const whitelist = [
  "https://testarena-production.up.railway.app",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      console.error("CORS Error: Missing Origin header");
      callback(new Error("Access denied. Missing Origin header."));
    } else if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS Error: Origin ${origin} not allowed`);
      callback(new Error("Access denied. Origin not allowed by CORS."));
    }
  },
  credentials: true,
};

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "index.html"));
});

app.use("/api/users", cors(corsOptions), userRoutes);
app.use("/api/inquiries", cors(corsOptions), inquiryRoutes);
app.use("/api/contacts", cors(corsOptions), contactsRoutes);
app.use("/api/calendar", cors(corsOptions), calendarRoutes);
app.use("/api/microsoft", cors(corsOptions), microsoftRoutes);

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Error Handling
app.use((err, req, res, next) => {
  if (err.message.includes("CORS")) {
    return res.status(403).json({ error: "Access denied by CORS policy." });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }
  if (err.name === "AuthenticationError") {
    return res.status(401).json({ error: err.message });
  }
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }

  console.error("Unhandled Error:", err.stack);
  res.status(500).json({ error: "An internal server error occurred." });
});

// Graceful Shutdown
const gracefulShutdown = async () => {
  console.log("Shutting down gracefully...");
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Start Server
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
