const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const { MONGO_URI } = require('../src/config/env');
const User = require('../src/models/User');

(async function run() {
  try {
    // Ensure DB connection
    await connectDB();

    const email = 'admin@local';
    const password = 'admin';
    const name = 'Administrator';

    const passwordHash = await bcrypt.hash(password, 10);

    // Upsert an admin user
    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      existingAdmin.email = email;
      existingAdmin.passwordHash = passwordHash;
      existingAdmin.name = name;
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('Updated existing admin credentials to admin@local / admin');
    } else {
      await User.create({ email, passwordHash, name, role: 'admin' });
      console.log('Created admin user admin@local / admin');
    }

    console.log('Done. You can now log in with email: admin@local and password: admin');
  } catch (err) {
    console.error('Failed to reset admin:', err);
    process.exitCode = 1;
  } finally {
    try { await mongoose.connection.close(); } catch {}
  }
})();
