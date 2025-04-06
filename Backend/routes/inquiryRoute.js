const express = require("express");
const {
  createInquiry,
  getInquiries,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  archiveInquiry,
  restoreInquiry,
  assignAdminToInquiry,
} = require("../controllers/inquiryController");
const authenticateUser = require("../utils/authenticateUser");

const router = express.Router();

// Public Routes (No Auth)
router.post("/", createInquiry); // Opprette ny henvendelse (offentlig)

// Protected Routes (Auth Required)
router.get("/", authenticateUser, getInquiries); // Hente alle henvendelser
router.get("/:id", authenticateUser, getInquiryById); // Hente én spesifikk henvendelse
router.put("/:id", authenticateUser, updateInquiry); // Oppdatere en henvendelse
router.delete("/:id", authenticateUser, deleteInquiry); // Slette en henvendelse
router.put("/archive/:id", authenticateUser, archiveInquiry); // Arkivere en henvendelse
router.put("/restore/:id", authenticateUser, restoreInquiry); // Gjenopprette en arkivert henvendelse
router.put("/assign/:id", authenticateUser, assignAdminToInquiry); // Tilordne admin til henvendelse

module.exports = router;
