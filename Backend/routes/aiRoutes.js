const express = require("express");
const { recommendContactsForInquiry } = require("../controllers/aiController");
const authenticateUser = require("../utils/authenticateUser");

const router = express.Router();

router.get("/recommend/:inquiryId", authenticateUser, recommendContactsForInquiry);

module.exports = router;
