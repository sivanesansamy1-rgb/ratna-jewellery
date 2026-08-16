const sendEmail = async (options) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        // IMPORTANT: This must be the email you verified on your Brevo account
        sender: { name: 'RATNA Fine Jewellery', email: 'sivanesansamy1@gmail.com' }, 
        to: [{ email: options.email }], 
        subject: options.subject,
        htmlContent: options.html
      })
    });
    
    if (!response.ok) {
        const err = await response.json();
        console.error("Brevo error:", err);
    } else {
        console.log("OTP Email sent successfully via Brevo!");
    }
  } catch (error) {
    console.error("Email error:", error);
  }
};

module.exports = sendEmail;
