const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Lag mappen hvis den ikke finnes
const uploadDir = path.join(__dirname, "../uploads/inquiries");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Kun PDF, bilde etc. (valgfritt filter)
const fileFilter = (req, file, cb) => {
  const allowed = /pdf|docx|jpg|jpeg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) cb(null, true);
  else cb(new CreateError("Only PDF, DOCX, or image files are allowed", 400));
};

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const userId = req.user?._id || "guest";
    const filename = `${Date.now()}-${userId}${ext}`;
    cb(null, filename);
  },
});

const uploadInquiryAttachment = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = uploadInquiryAttachment;
