require('dotenv').config();
const sendWhatsApp = require('./utils/sendWhatsApp');

async function test() {
  try {
    console.log('Sending message...');
    await sendWhatsApp({
      phone: '8939023260',
      message: 'Test message from RATNA backend.'
    });
    console.log('Done!');
  } catch (err) {
    console.error('Error during test:', err);
  }
}

test();
