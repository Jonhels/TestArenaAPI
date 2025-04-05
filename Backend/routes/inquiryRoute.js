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

const router = express.Router();

// Public Route (no authentication needed)

// Opprett en ny henvendelse (offentlig skjema)
router.post("/", createInquiry);

// Protected Routes (authentication required)

// Hent alle henvendelser (med filtrering)
router.get("/", authenticateUser, getAllInquiries);

// Hent én spesifikk henvendelse
router.get("/:inquiryId", authenticateUser, getInquiryById);

// Oppdater en spesifikk henvendelse
router.put("/:inquiryId", authenticateUser, updateInquiry);

// Slett en spesifikk henvendelse
router.delete("/:inquiryId", authenticateUser, deleteInquiry);

// Arkiver en henvendelse
router.put("/archive/:inquiryId", authenticateUser, archiveInquiry);

// Gjenopprett en arkivert henvendelse
router.put("/restore/:inquiryId", authenticateUser, restoreInquiry);

// Tilordne en admin til en henvendelse
router.put("/assign/:inquiryId", authenticateUser, assignAdminToInquiry);

// Endre status på en henvendelse (ulest, i arbeid, ferdig)
router.put("/status/:inquiryId", authenticateUser, updateStatus);

// Kommentar-funksjonalitet på henvendelser

// Legg til en kommentar på en henvendelse
router.post("/comment/:inquiryId", authenticateUser, addComment);

// Rediger en kommentar
router.put("/comment/:inquiryId/:commentId", authenticateUser, editComment);

// Slett en kommentar
router.delete(
  "/comment/:inquiryId/:commentId",
  authenticateUser,
  deleteComment
);

// Tagger-funksjonalitet på henvendelser

// Legg til én tag
router.post("/tag/:inquiryId", authenticateUser, addTag);

// Legg til flere tagger
router.post("/tags/:inquiryId", authenticateUser, addTags);

// Slett én tag
router.delete("/tag/:inquiryId", authenticateUser, removeTag);

// Slett flere tagger
router.delete("/tags/:inquiryId", authenticateUser, removeTags);

module.exports = router;
