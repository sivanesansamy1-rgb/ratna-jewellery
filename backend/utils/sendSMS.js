// Utility for sending SMS messages. 
// In a real production environment, you would integrate a service like Twilio or AWS SNS here.
// For now, this simply logs the message to the console for testing purposes.

const sendSMS = async (options) => {
  const { phone, message } = options;

  if (!phone) {
    console.log('No phone number provided, skipping SMS.');
    return;
  }

  // Simulate an API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 1. FAST2SMS IMPLEMENTATION (For Indian Numbers)
  if (process.env.FAST2SMS_API_KEY) {
    try {
      // Fast2SMS requires just the 10-digit number without the +91
      let fast2smsPhone = phone.replace('+91', '').trim();
      
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'v3',
          sender_id: 'TXTIND',
          message: message,
          language: 'english',
          flash: 0,
          numbers: fast2smsPhone
        })
      });
      
      const result = await response.json();
      if (result.return === true) {
        console.log(`[SMS] Live SMS sent to ${fast2smsPhone} via Fast2SMS.`);
      } else {
        console.error('[SMS ERROR] Fast2SMS failed:', result.message);
      }
    } catch (err) {
      console.error('[SMS ERROR] Failed to send Fast2SMS:', err.message);
    }
    return;
  }

  // 2. TWILIO WHATSAPP IMPLEMENTATION (100% Free, Bypasses SMS restrictions)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER) {
    try {
      let formattedPhone = phone;
      // Auto-format Indian 10-digit numbers to E.164 standard which Twilio requires
      if (formattedPhone.length === 10 && !formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone;
      }
      
      const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${formattedPhone}`
      });
      console.log(`[WHATSAPP] Live WhatsApp message sent to ${formattedPhone}!`);
    } catch (err) {
      console.error('[WHATSAPP ERROR] Failed to send real WhatsApp message:', err.message);
    }
    return;
  }
  
  // 3. FALLBACK MOCK (If no API keys are provided)
  console.log('\n\n============================================');
  console.log(`[SMS MOCK] Message destined for: ${phone}`);
  console.log(`[SMS MOCK] Content: "${message}"`);
  console.log('============================================\n\n');
};

module.exports = sendSMS;
