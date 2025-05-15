const User = require("../models/userSchema");


const sendInquiryNotification = async (inquiry) => {



  try {
    const { SMTPClient } = await import("emailjs");
    // Hent alle admin-brukere med e-postvarsling aktivert
    const admins = await User.find({ emailNotifications: true });
    const adminEmails = admins.map((admin) => admin.email).filter(Boolean);

    if (adminEmails.length === 0) {
      console.warn("No admins with email notifications enabled.");
      return;
    }

    const client = new SMTPClient({
      user: process.env.EMAILJS_USER,
      password: process.env.EMAILJS_PASSWORD,
      host: process.env.EMAILJS_HOST,
      ssl: true,
      port: process.env.EMAILJS_PORT || 465,
    });

    const adminLink = `${process.env.FRONTEND_URL}/henvendelser/${inquiry._id}`;

    const subject = `Ny henvendelse: ${inquiry.productTitle}`;
    const htmlBody = `
      <h2>Ny henvendelse mottatt</h2>
      <p><strong>Tittel:</strong> ${inquiry.productTitle}</p>
      <p><strong>Beskrivelse:</strong> ${inquiry.productDescription}</p>
      <p><a href="${adminLink}">Se henvendelsen i adminpanelet</a></p>
    `;

    await client.sendAsync({
      text: `Ny henvendelse: ${inquiry.productTitle}\n\n${inquiry.productDescription}\n\nLink: ${adminLink}`,
      from: process.env.EMAILJS_FROM,
      to: adminEmails.join(","),
      subject: subject,
      attachment: [{ data: htmlBody, alternative: true }],
    });

    console.log("Inquiry notification email sent successfully.");
  } catch (error) {
    console.error("Failed to send inquiry notification email:", error.message);
  }
};

module.exports = sendInquiryNotification;
