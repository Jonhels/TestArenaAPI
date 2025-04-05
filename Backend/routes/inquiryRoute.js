const express = require("express");
const {
  createInquiry,
  getInquiries,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  archiveInquiry,
  restoreInquiry,
} = require("../controllers/inquiryController");

const router = express.Router();

router.post("/", createInquiry); // Opprette ny henvendelse
router.get("/", getInquiries); // Hente alle henvendelser
router.get("/:id", getInquiryById); // Hente spesifikk henvendelse
router.put("/:id", updateInquiry); // Oppdatere henvendelse
router.delete("/:id", deleteInquiry); // Slette henvendelse
router.put("/archive/:id", archiveInquiry); // Arkivere henvendelse
router.put("/restore/:id", restoreInquiry); // Gjenopprette arkivert henvendelse

module.exports = router;
