const express = require("express");
const checkAdmin = require("../middleware/checkAdmin");
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
const uploadInquiryAttachment = require("../utils/uploadInquiryAttachment");

const router = express.Router();

// Public Route (no authentication needed)

// Opprett en ny henvendelse (offentlig skjema med vedlegg)
router.post("/", uploadInquiryAttachment.single("attachment"), createInquiry);

// Protected Routes (authentication required)

// Hent alle henvendelser (med filtrering)
router.get("/", authenticateUser, getAllInquiries);

// Hent én spesifikk henvendelse
router.get("/:inquiryId", authenticateUser, getInquiryById);

// Oppdater en spesifikk henvendelse
router.put("/:inquiryId", authenticateUser, checkAdmin, updateInquiry);

// Slett en spesifikk henvendelse
router.delete("/:inquiryId", authenticateUser, checkAdmin, deleteInquiry);

// Arkiver en henvendelse
router.put("/archive/:inquiryId", authenticateUser, checkAdmin, archiveInquiry);

// Gjenopprett en arkivert henvendelse
router.put("/restore/:inquiryId", authenticateUser, checkAdmin, restoreInquiry);

// Tilordne en admin til en henvendelse
router.put("/assign/:inquiryId", authenticateUser, checkAdmin, assignAdminToInquiry);

// Endre status på en henvendelse (ulest, i arbeid, ferdig)
router.put("/status/:inquiryId", authenticateUser, checkAdmin, updateStatus);

// Kommentar-funksjonalitet på henvendelser

// Legg til en kommentar på en henvendelse
router.post("/comment/:inquiryId", authenticateUser, checkAdmin, addComment);

// Rediger en kommentar
router.put("/comment/:inquiryId/:commentId", authenticateUser, checkAdmin, editComment);

// Slett en kommentar
router.delete(
  "/comment/:inquiryId/:commentId",
  authenticateUser, checkAdmin,
  deleteComment
);

// Tagger-funksjonalitet på henvendelser

// Legg til én tag
router.post("/tag/:inquiryId", authenticateUser, checkAdmin, addTag);

// Legg til flere tagger
router.post("/tags/:inquiryId", authenticateUser, checkAdmin, addTags);

// Slett én tag
router.delete("/tag/:inquiryId", authenticateUser, checkAdmin, removeTag);

// Slett flere tagger
router.delete("/tags/:inquiryId", authenticateUser, checkAdmin, removeTags);

module.exports = router;
