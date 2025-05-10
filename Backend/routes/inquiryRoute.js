const express = require("express");
const {
  createInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  archiveInquiry,
  restoreInquiry,
  assignAdminToInquiry,
  updateStatus,
  addComment,
  editComment,
  deleteComment,
  addTag,
  addTags,
  removeTag,
  removeTags,
} = require("../controllers/inquiryController");

const authenticateUser = require("../utils/authenticateUser");
const requireAdmin = require("../utils/requireAdmin");
const uploadInquiryAttachment = require("../utils/uploadInquiryAttachment");

const router = express.Router();

// --------------------
// PUBLIC ROUTES
// --------------------

// Opprett en ny henvendelse (offentlig skjema med vedlegg)
router.post("/", uploadInquiryAttachment.single("attachment"), createInquiry);

// --------------------
// AUTHENTICATED ROUTES (User or Admin)
// --------------------

router.get("/", authenticateUser, getAllInquiries);
router.get("/:inquiryId", authenticateUser, getInquiryById);
router.put("/:inquiryId", authenticateUser, updateInquiry);

// Kommentarer (egen og egne rettigheter gjelder)
router.post("/comment/:inquiryId", authenticateUser, addComment);
router.put("/comment/:inquiryId/:commentId", authenticateUser, editComment);
router.delete(
  "/comment/:inquiryId/:commentId",
  authenticateUser,
  deleteComment
);

// Tagging
router.post("/tag/:inquiryId", authenticateUser, addTag);
router.post("/tags/:inquiryId", authenticateUser, addTags);
router.delete("/tag/:inquiryId", authenticateUser, removeTag);
router.delete("/tags/:inquiryId", authenticateUser, removeTags);

// --------------------
// ADMIN-ONLY ROUTES
// --------------------

router.put(
  "/archive/:inquiryId",
  authenticateUser,
  requireAdmin,
  archiveInquiry
);
router.put(
  "/restore/:inquiryId",
  authenticateUser,
  requireAdmin,
  restoreInquiry
);
router.put(
  "/assign/:inquiryId",
  authenticateUser,
  requireAdmin,
  assignAdminToInquiry
);
router.put("/status/:inquiryId", authenticateUser, requireAdmin, updateStatus);
router.delete("/:inquiryId", authenticateUser, requireAdmin, deleteInquiry);

module.exports = router;
