require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function setAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Remove all existing admins
    const deleteResult = await User.deleteMany({ role: 'admin' });
    console.log(`Deleted ${deleteResult.deletedCount} existing admin accounts.`);

    // Check if the user already exists as a normal user, if so delete them to avoid duplicate email errors
    await User.deleteMany({ email: 'sivanesansamy1@gmail.com' });

    // Create the new admin account
    await User.create({
      name: 'Store Admin',
      email: 'sivanesansamy1@gmail.com',
      password: 'Siva@2005',
      role: 'admin',
      isVerified: true
    });
    
    console.log(`Successfully created admin account: sivanesansamy1@gmail.com`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

setAdmin();
