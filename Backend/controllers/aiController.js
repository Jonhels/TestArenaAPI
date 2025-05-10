const Inquiry = require("../models/inquirySchema");
const Contacts = require("../models/contactsSchema");
const { OpenAI } = require("openai");

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const recommendContactsForInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;

    // Get the inquiry
    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    // ✅ If recommendations already exist, return them (cached)
    if (inquiry.recommendations && inquiry.recommendations.length > 0) {
      return res.status(200).json({
        status: "cached",
        recommendedContacts: inquiry.recommendations,
      });
    }

    // Get all contacts from the DB
    const contacts = await Contacts.find();
    if (contacts.length === 0) {
      return res.status(404).json({ error: "No contacts found." });
    }

    // Format contacts for prompt
    const contactList = contacts
      .map((c, idx) => {
        return `Contact ${idx + 1}:
Name: ${c.name}
Business: ${c.businessName}
Responsibility: ${c.responsibility}
Location: ${c.officeLocation}`;
      })
      .join("\n\n");

    // Construct prompt
    const prompt = `
You are an expert business consultant AI. A new inquiry has been submitted:

Title: ${inquiry.productTitle}
Description: ${inquiry.productDescription}


Below is a list of available contacts. Recommend the 2 most relevant contacts for this inquiry.

${contactList}

Return ONLY JSON like this:
[
  { "name": "Full Name", "businessName": "Business AB" },
  { "name": "Full Name", "businessName": "Business XY" }
]
`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const responseText = completion.choices[0].message.content;

    let aiSuggestions;
    try {
      aiSuggestions = JSON.parse(responseText);
    } catch (err) {
      console.error("Failed to parse AI response:", responseText);
      return res
        .status(500)
        .json({ error: "AI returned invalid JSON. Try again later." });
    }

    // Match suggestions to MongoDB contact objects
    const recommendedContacts = contacts
      .filter((contact) =>
        aiSuggestions.some(
          (rec) =>
            rec.name?.toLowerCase() === contact.name.toLowerCase() &&
            rec.businessName?.toLowerCase() === contact.businessName.toLowerCase()
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

    // Save to inquiry
    inquiry.recommendations = recommendedContacts;
    await inquiry.save();

    res.status(200).json({
      status: "generated",
      recommendedContacts,
    });
  } catch (error) {
    console.error("AI Recommendation error:", error);
    res.status(500).json({ error: "AI Recommendation failed." });
  }
};

module.exports = { recommendContactsForInquiry };
