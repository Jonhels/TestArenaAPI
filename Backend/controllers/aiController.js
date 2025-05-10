const Inquiry = require("../models/inquirySchema");
const Contacts = require("../models/contactsSchema");
const { OpenAI } = require("openai");
const CreateError = require("../utils/createError");
const { successResponse, errorResponse } = require("../utils/responseHelper");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const recommendContactsForInquiry = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;
    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return next(new CreateError("Inquiry not found.", 404));
    }

    if (inquiry.recommendations?.length > 0) {
      return successResponse(res, {
        recommendedContacts: inquiry.recommendations,
        source: "cache",
      });
    }

    const contacts = await Contacts.find();
    if (contacts.length === 0) {
      return next(new CreateError("No contacts found.", 404));
    }

    const contactList = contacts
      .map((c, idx) => {
        return `Contact ${idx + 1}:
Name: ${c.name}
Business: ${c.businessName}
Responsibility: ${c.responsibility}
Location: ${c.officeLocation}`;
      })
      .join("\n\n");

    const prompt = `
You are an expert business consultant AI. A new inquiry has been submitted:

Title: ${inquiry.title}
Description: ${inquiry.description}

Below is a list of available contacts. Recommend the 2 most relevant contacts for this inquiry.

${contactList}

Return ONLY JSON like this:
[
  { "name": "Full Name", "businessName": "Business AB" },
  { "name": "Full Name", "businessName": "Business XY" }
]
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    let aiSuggestions;
    try {
      aiSuggestions = JSON.parse(completion.choices[0].message.content);
    } catch (err) {
      console.error(
        "AI returned invalid JSON:",
        completion.choices[0].message.content
      );
      return next(new CreateError("AI returned invalid JSON format.", 500));
    }

    const recommendedContacts = contacts
      .filter((contact) =>
        aiSuggestions.some(
          (rec) =>
            rec.name?.toLowerCase() === contact.name.toLowerCase() &&
            rec.businessName?.toLowerCase() ===
              contact.businessName.toLowerCase()
        )
      )
      .map((contact) => ({
        name: contact.name,
        businessName: contact.businessName,
        contactId: contact._id,
        email: contact.email,
        phone: contact.phone,
        officeLocation: contact.officeLocation,
        responsibility: contact.responsibility,
      }));

    inquiry.recommendations = recommendedContacts;
    await inquiry.save();

    return successResponse(res, { recommendedContacts, source: "ai" });
  } catch (error) {
    console.error("AI Recommendation error:", error);
    return errorResponse(res, "AI Recommendation failed.", 500);
  }
};

module.exports = { recommendContactsForInquiry };
