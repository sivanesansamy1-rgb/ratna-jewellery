const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  if (!process.env.SMTP_HOST) {
    throw new Error("SMTP variables are not configured on the server!");
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, // true for 465, false for other ports
      connectionTimeout: 10000, // Fail fast if it can't connect
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'RATNA Jewellery'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
    });

    console.log("Email sent successfully via Nodemailer: %s", info.messageId);
  } catch (error) {
    console.error("Email error:", error);
    throw error; // Throw so the controller knows it failed
  }
};

module.exports = sendEmail;
