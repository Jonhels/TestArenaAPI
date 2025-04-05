const express = require("express");
const {
  createInquiry,
  getInquiries,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
} = require("../controllers/inquiryController");

const router = express.Router();

router.post("/", createInquiry); // Opprette ny henvendelse
router.get("/", getInquiries); // Hente alle henvendelser
router.get("/:id", getInquiryById); // Hente spesifikk henvendelse
router.put("/:id", updateInquiry); // Oppdatere henvendelse
router.delete("/:id", deleteInquiry); // Slette henvendelse

module.exports = router;
