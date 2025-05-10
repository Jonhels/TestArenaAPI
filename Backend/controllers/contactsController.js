const Contacts = require("../models/contactsSchema");
const CreateError = require("../utils/createError");
const { successResponse } = require("../utils/responseHelper");
const { validateEmail, validatePhone } = require("../utils/validators");

// Opprett ny kontakt med case-insensitive sjekk på e-post
const createContact = async (req, res, next) => {
  try {
    const { name, email, phone, officeLocation, businessName, responsibility } =
      req.body;

    // Valider obligatoriske felt
    if (!name || !email) {
      return next(new CreateError("Name and email are required", 400));
    }

    // Valider e-postformat
    if (!validateEmail(email)) {
      return next(new CreateError("Invalid email format", 400));
    }

    // Valider telefonnummerformat (hvis oppgitt)
    if (phone && !validatePhone(phone)) {
      return next(new CreateError("Invalid phone format", 400));
    }

    // Case-insensitive duplikatsjekk på e-post
    const existing = await Contacts.findOne({
      email: new RegExp(`^${email}$`, "i"),
    });
    if (existing) {
      return next(
        new CreateError("A contact with this email already exists", 409)
      );
    }

    const newContact = await Contacts.create({
      name,
      email,
      phone,
      officeLocation,
      businessName,
      responsibility,
    });

    return successResponse(
      res,
      { contact: newContact },
      "Contact created",
      201
    );
  } catch (error) {
    next(error);
  }
};

// Oppdater eksisterende kontakt
const updateContact = async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const updates = req.body;

    if (updates.email && !validateEmail(updates.email)) {
      return next(new CreateError("Invalid email format", 400));
    }

    if (updates.phone && !validatePhone(updates.phone)) {
      return next(new CreateError("Invalid phone format", 400));
    }

    const updatedContact = await Contacts.findByIdAndUpdate(
      contactId,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedContact) {
      return next(new CreateError("Contact not found", 404));
    }

    return successResponse(res, { contact: updatedContact }, "Contact updated");
  } catch (error) {
    next(error);
  }
};

// Slett kontakt
const deleteContact = async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const deletedContact = await Contacts.findByIdAndDelete(contactId);

    if (!deletedContact) {
      return next(new CreateError("Contact not found", 404));
    }

    return successResponse(res, {}, "Contact deleted");
  } catch (error) {
    next(error);
  }
};

// Søk etter kontakter
const searchContacts = async (req, res, next) => {
  try {
    const { name, email, phone, businessName } = req.query;
    const query = {};

    if (name) query.name = { $regex: name, $options: "i" };
    if (email) query.email = { $regex: email, $options: "i" };
    if (phone) query.phone = { $regex: phone, $options: "i" };
    if (businessName)
      query.businessName = { $regex: businessName, $options: "i" };

    const contacts = await Contacts.find(query);

    if (contacts.length === 0) {
      return next(new CreateError("No contacts found", 404));
    }

    return successResponse(res, { contacts });
  } catch (error) {
    next(error);
  }
};

// Hent alle kontakter med paginering og sortering
const getAllContacts = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 20, 1);
    const sortOrder = req.query.sort === "desc" ? -1 : 1;

    const [contacts, total] = await Promise.all([
      Contacts.find()
        .sort({ name: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit),
      Contacts.countDocuments(),
    ]);

    return successResponse(res, {
      contacts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createContact,
  updateContact,
  deleteContact,
  searchContacts,
  getAllContacts,
};
