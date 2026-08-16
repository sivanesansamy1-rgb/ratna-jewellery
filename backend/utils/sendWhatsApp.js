const twilio = require('twilio');

const sendWhatsApp = async ({ phone, message }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log('\n========================================================');
    console.log('📱 SIMULATED WHATSAPP MESSAGE');
    console.log(`To: ${phone}`);
    console.log(`Message: ${message}`);
    console.log('========================================================\n');
    return;
  }

  try {
    const client = twilio(accountSid, authToken);
    
    // Ensure the phone number is in E.164 format (e.g. +919876543210)
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      // Default to India if no country code provided, just as a fallback
      formattedPhone = '+91' + formattedPhone;
    }

    await client.messages.create({
      body: message,
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${formattedPhone}`
    });
    console.log(`WhatsApp message sent successfully to ${formattedPhone}`);
  } catch (error) {
    console.error('Failed to send WhatsApp message through Twilio:', error.message);
    console.log('\n========================================================');
    console.log('📱 SIMULATED WHATSAPP MESSAGE (FALLBACK DUE TO TWILIO ERROR)');
    console.log(`To: ${phone}`);
    console.log(`Message: ${message}`);
    console.log('========================================================\n');
  }
};

module.exports = sendWhatsApp;
