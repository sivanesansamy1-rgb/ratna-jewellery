const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  let transporter;

  // If SMTP config is missing, use Ethereal for testing
  if (!process.env.SMTP_HOST) {
    console.log('No SMTP config found. Generating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } else {
    // Use real SMTP server
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  const message = {
    from: `${process.env.SMTP_FROM_NAME || 'RATNA'} <${process.env.SMTP_FROM_EMAIL || 'noreply@ratna.com'}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  const info = await transporter.sendMail(message);

  if (!process.env.SMTP_HOST) {
    console.log('\n\n============================================');
    console.log('Test email sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    console.log('============================================\n\n');
  } else {
    console.log(`Email sent to ${options.email}`);
  }
};

module.exports = sendEmail;
