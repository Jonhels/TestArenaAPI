const express = require('express');
const checkAdmin = require("../middleware/checkAdmin");
const {
    createContact,
    updateContact,
    deleteContact,
    searchContacts,
    getAllContacts,
    getContactById
} = require('../controllers/contactsController'); 
const authenticateUser = require('../utils/authenticateUser');
const router = express.Router();

// Route to create a new contact, protected route with authenticateUser
router.post('/', authenticateUser, checkAdmin, createContact);

// Route to update an existing contact, protected route with authenticateUser
router.put('/:contactId', authenticateUser, checkAdmin, updateContact);

// Route to delete a contact, protected route with authenticateUser
router.delete('/:contactId', authenticateUser, checkAdmin, deleteContact);

// Route to search contacts, protected route with authenticateUser
router.get('/search', authenticateUser, searchContacts);

// Get single contact by ID
router.get('/:contactId', authenticateUser, getContactById);

// Route to get all contacts, protected route with authenticateUser
router.get('/', authenticateUser, getAllContacts);


module.exports = router; // Export the router to be used in the main app