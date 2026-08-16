const mongoose = require('mongoose');
require('dotenv').config({ override: true });
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.findOneAndUpdate(
    { email: 'sivanesansamy1@gmail.com' },
    { isVerified: true },
    { new: true }
  );
  
  if (user) {
    console.log('✅ Successfully verified user:', user.email);
  } else {
    console.log('❌ User not found');
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Database connection error:', err);
  process.exit(1);
});
