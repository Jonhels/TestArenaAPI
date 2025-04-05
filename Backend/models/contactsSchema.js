const mongoose = require('mongoose');
const {isEmail} = require("validator");

const contactsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter the contact's name"],
        maxlength: [50, "Name cannot exceed 50 characters"],
    },
    // Ensure email is in a valid format, validation regex for email format
    email: {
        type: String,
        required: [true, "Please enter contact's email"],
        lowercase: true,
        unique: true,
        validate: [isEmail, "Please enter a valid email"],
    },
    phone: {
        type: String,
        required: [true, "Please enter the contact's phone number"],
    },
    officeLocation: {
        type: String,
        required: [true, "Please enter the contact's office location"],
        maxlength: [100, "Office location cannot exceed 100 characters"],
    },
    businessName: {
        type: String,
        required: [true, "Please enter the contact's business name"],
        maxlength: [100, "Business name cannot exceed 100 characters"],
    },
    responsibility: {
        type: String,
        required: [true, "Please enter the contact's responsibility"],
        maxlength: [100, "Responsibility cannot exceed 100 characters"],
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Timestamp for contact creation
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

const Contacts = mongoose.model('Contacts', contactsSchema);
module.exports = Contacts;