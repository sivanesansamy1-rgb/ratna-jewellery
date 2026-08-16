const mongoose = require('mongoose');
require('dotenv').config({ override: true });
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.findOne({ email: 'sivanesansamy1@gmail.com' }).select('+otp');
  
  if (user) {
    if (user.isVerified) {
      console.log('✅ User is already verified!');
    } else {
      console.log('----------------------------------------------------');
      console.log('Found your unverified account!');
      console.log('Your secret 6-digit OTP code is:', user.otp);
      console.log('----------------------------------------------------');
    }
  } else {
    console.log('❌ User not found in database');
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Database connection error:', err);
  process.exit(1);
});
