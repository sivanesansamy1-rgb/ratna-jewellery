require('dotenv').config({ override: true });
const nodemailer = require('nodemailer');

async function testMail() {
  try {
    console.log('Testing SMTP with:', process.env.SMTP_HOST, process.env.SMTP_PORT, process.env.SMTP_USER);
    
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: 'sivanesansamy1@gmail.com', // Sending to self for test
      subject: 'Test Email Configuration',
      html: '<p>If you see this, email is working.</p>',
    });

    console.log('✅ Email sent successfully:', info.messageId);
  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
    console.error(err);
  }
}

testMail();
