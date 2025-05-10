const User = require("../models/userSchema");
const { SMTPClient } = require("emailjs");
const CreateError = require("./createError");
const validator = require("validator");

const sendInquiryNotification = async (inquiry) => {
  const requiredEnvVars = [
    "EMAILJS_USER",
    "EMAILJS_PASSWORD",
    "EMAILJS_HOST",
    "EMAILJS_FROM",
    "ADMIN_URL",
  ];

  const missingEnvVars = requiredEnvVars.filter((env) => !process.env[env]);

  if (missingEnvVars.length) {
    throw new CreateError(
      `Missing environment variables: ${missingEnvVars.join(", ")}`,
      500
    );
  }

  try {
    const admins = await User.find({ emailNotifications: true });
    const adminEmails = admins
      .map((admin) => admin.email)
      .filter((email) => email && validator.isEmail(email));

    if (adminEmails.length === 0) {
      console.warn("No valid admin emails found.");
      return;
    }

    const client = new SMTPClient({
      user: process.env.EMAILJS_USER,
      password: process.env.EMAILJS_PASSWORD,
      host: process.env.EMAILJS_HOST,
      ssl: true,
      port: process.env.EMAILJS_PORT || 465,
    });

    const adminLink = `${process.env.ADMIN_URL}/inquiries/${inquiry._id}`;
    const subject = `Ny henvendelse: ${inquiry.title}`;

    const dateFormatted = new Date().toLocaleString("nb-NO", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const htmlBody = `
      <h2>Ny henvendelse mottatt</h2>
      <p><strong>Tittel:</strong> ${inquiry.title}</p>
      <p><strong>Dato:</strong> ${dateFormatted}</p>
      <p><strong>Beskrivelse:</strong> ${inquiry.description}</p>
      <p><a href="${adminLink}">Se henvendelsen i adminpanelet</a></p>
    `;

    await client.sendAsync({
      text: `Ny henvendelse: ${inquiry.title}\n\n${inquiry.description}\n\nLink: ${adminLink}`,
      from: process.env.EMAILJS_FROM,
      to: adminEmails.join(","),
      subject,
      attachment: [{ data: htmlBody, alternative: true }],
    });

    console.log("Inquiry notification email sent successfully.");
  } catch (error) {
    console.error("Failed to send inquiry notification email:", error.message);
    throw new CreateError("Failed to send notification email", 500);
  }
};

module.exports = sendInquiryNotification;
