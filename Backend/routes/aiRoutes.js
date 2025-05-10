const express = require("express");
const { recommendContactsForInquiry } = require("../controllers/aiController");
const authenticateUser = require("../utils/authenticateUser");
const isAdmin = require("../utils/requireAdmin");

const router = express.Router();

router.get(
  "/recommend/:inquiryId",
  authenticateUser,
  isAdmin,
  recommendContactsForInquiry
);

module.exports = router;
