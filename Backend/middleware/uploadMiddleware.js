const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const CreateError = require("../utils/createError");

const uploadDir = path.join(__dirname, "../uploads/profiles");

(async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    console.log(`Directory ${uploadDir} is ready.`);
  } catch (err) {
    console.error(`Error creating directory ${uploadDir}:`, err);
  }
})();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = /\.(jpg|jpeg|png|webp)$/i.test(ext) ? ext : ".png";
    const filename = `${req.user?._id || "anonymous"}-${Date.now()}${safeExt}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.warn(
      `Rejected upload: ${file.originalname} with MIME type ${file.mimetype}`
    );
    cb(new CreateError("Only image files (jpg, png, webp) are allowed", 400));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = upload;
