const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev', // NOTE: You MUST use this exact 'from' address on the free tier
      to: options.email,            // The email address the user typed in your registration form
      subject: options.subject,
      html: options.html
    });
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Email error:", error);
  }
};

module.exports = sendEmail;
