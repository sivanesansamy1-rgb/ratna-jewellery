require('dotenv').config();
const twilio = require('twilio');

async function test() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  const toPhone = '9042463701';

  try {
    console.log('Sending message to', toPhone);
    const client = twilio(accountSid, authToken);
    
    let formattedPhone = toPhone.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone;
    }

    const response = await client.messages.create({
      body: `Your RATNA code is ${Math.floor(100000 + Math.random() * 900000)}`,
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${formattedPhone}`
    });
    console.log('Success! Message SID:', response.sid);
  } catch (err) {
    console.error('Twilio Error:', err.message);
    if (err.code) console.error('Error Code:', err.code);
  }
}

test();
