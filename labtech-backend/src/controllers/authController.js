const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/env');

// POST /api/auth/signup-patient
async function signupPatient(req, res) {
  try {
    const { email, password, name } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role: 'patient',
      name,
    });

    return res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// POST /api/auth/login (both patients and admins)
async function login(req, res) {
  try {
    const { emailOrPhone, password } = req.body;

    console.log('=== LOGIN REQUEST RECEIVED ===');
    console.log('Raw emailOrPhone:', emailOrPhone);
    console.log('Trimmed & lowercased:', emailOrPhone.trim().toLowerCase());

    const user = await User.findOne({ email: emailOrPhone.trim().toLowerCase() });
    console.log('Found user in DB:', user ? {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    } : null);

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    console.log('Password valid?', isValid);

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  signupPatient,
  login,
};
