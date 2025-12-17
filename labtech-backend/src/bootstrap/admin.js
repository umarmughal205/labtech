const bcrypt = require('bcrypt');
const User = require('../models/User');

async function ensureAdmin() {
  const email = 'admin@local';
  const password = 'admin';
  const name = 'Administrator';

  const existing = await User.findOne({ email });
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ email, passwordHash, name, role: 'admin' });
}

module.exports = { ensureAdmin };
