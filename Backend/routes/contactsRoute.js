const express = require("express");
const {
  createContact,
  updateContact,
  deleteContact,
  searchContacts,
  getAllContacts,
} = require("../controllers/contactsController");

const authenticateUser = require("../utils/authenticateUser");
const router = express.Router();

// Søk først for å unngå konflikt med /:contactId
router.get("/search", authenticateUser, searchContacts);

// Hent alle kontakter
router.get("/", authenticateUser, getAllContacts);

// Opprett kontakt
router.post("/", authenticateUser, createContact);

// Oppdater kontakt
router.put("/:contactId", authenticateUser, updateContact);

// Slett kontakt
router.delete("/:contactId", authenticateUser, deleteContact);

module.exports = router;
