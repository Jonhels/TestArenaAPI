const Contacts = require('../models/contactsSchema');

// Function to create a new contact
const createContact = async (req, res) => {
    try {
        const { name, email, phone, officeLocation, businessName, responsibility } = req.body;

        // Create a new contact instance
        const newContact = new Contacts({
            name,
            email,
            phone,
            officeLocation,
            businessName,
            responsibility,
        });

        // Save the contact to the database
        await newContact.save();

        return res.status(201).json({ message: 'Contact created successfully', contact: newContact });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// Function to update an existing contact
const updateContact = async (req, res) => {
    try {
        const { contactId } = req.params; // Get the contact ID from request parameters
        const updates = req.body; // Get the updates from request body

        // Find the contact by ID and update it
        const updatedContact = await Contacts.findByIdAndUpdate(contactId, updates, { new: true });

        if (!updatedContact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        return res.status(200).json({ message: 'Contact updated successfully', contact: updatedContact });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// Function to delete a contact
const deleteContact = async (req, res) => {
    try {
        const { contactId } = req.params; // Get the contact ID from request parameters

        // Find the contact by ID and remove it
        const deletedContact = await Contacts.findByIdAndDelete(contactId);

        if (!deletedContact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        return res.status(200).json({ message: 'Contact deleted successfully' });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// Function to search for contacts based on query parameters
const searchContacts = async (req, res) => {
    try {
        const { name, email, phone, businessName } = req.query;
        let query = {};

        if (name) query.name = { $regex: name, $options: 'i' }; // Case-insensitive search
        if (email) query.email = { $regex: email, $options: 'i' };
        if (phone) query.phone = { $regex: phone, $options: 'i' };
        if (businessName) query.businessName = { $regex: businessName, $options: 'i' };

        const contacts = await Contacts.find(query);

        if (contacts.length === 0) {
            return res.status(404).json({ message: 'No contacts found' });
        }

        return res.status(200).json({ contacts });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// Function to get all contacts
const getAllContacts = async (req, res) => {
    try {
        const contacts = await Contacts.find();
        return res.status(200).json({ contacts });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

module.exports = { createContact, updateContact, deleteContact, searchContacts, getAllContacts };
