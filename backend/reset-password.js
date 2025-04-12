const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Connect to MongoDB
const MONGO_URL = process.env.MONGO_URL;

mongoose
  .connect(MONGO_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

// Define the User model (matching your existing schema)
const Users = mongoose.model('Users', {
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  cartData: { type: Object },
  Date: { type: Date, default: Date.now },
  userType: { type: String, default: 'user' },
});

// Admin email to reset password for
const adminEmail = 'admin@tamarjewelry.com'; // Replace with your actual admin email
const newPassword = 'Bamba1964!'; // New password to set

async function resetAdminPassword() {
  try {
    // Find the admin user
    const admin = await Users.findOne({ email: adminEmail });

    if (!admin) {
      console.log(`No user found with email: ${adminEmail}`);
      console.log('Creating new admin user...');

      // Create cart data structure (matching your existing code)
      let cart = {};
      for (let i = 0; i < 300; i++) {
        cart[i] = 0;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Create a new admin user
      const newAdmin = new Users({
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        cartData: cart,
        userType: 'admin',
      });

      await newAdmin.save();
      console.log(`Created new admin user with email: ${adminEmail}`);
      console.log(`Password reset to: ${newPassword}`);
    } else {
      // Update existing admin's password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      admin.password = hashedPassword;
      await admin.save();

      console.log(`Password reset for admin: ${adminEmail}`);
      console.log(`New password: ${newPassword}`);
    }

    console.log('Password reset completed successfully!');
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the password reset function
resetAdminPassword();
