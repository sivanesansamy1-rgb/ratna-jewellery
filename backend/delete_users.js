require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function deleteUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Delete all users except admin
    const result = await User.deleteMany({ role: { $ne: 'admin' } });
    
    console.log(`Successfully deleted ${result.deletedCount} user accounts.`);
    
    // Check remaining users (should be admin)
    const admins = await User.find({});
    console.log(`Remaining accounts:`, admins.map(a => a.email));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

deleteUsers();
