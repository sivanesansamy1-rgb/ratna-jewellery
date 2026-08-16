require('dotenv').config();
const sendEmail = require('./utils/sendEmail');

(async () => {
  try {
    console.log('Sending test email...');
    await sendEmail({
      email: process.env.SMTP_USER, // send to self
      subject: 'Test Email',
      html: '<p>Testing</p>'
    });
    console.log('Test email success');
  } catch (err) {
    console.error('Test email failed:', err);
  }
})();
