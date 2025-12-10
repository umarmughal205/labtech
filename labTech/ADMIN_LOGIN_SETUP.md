# Admin Login Setup - Documentation

## Overview
This document explains the admin login implementation and how to integrate it with your Node.js + SQL backend.

---

## ✅ What's Implemented

### 1. **AuthContext** (`src/context/AuthContext.jsx`)
- Manages authentication state globally
- Handles login/logout operations
- Stores user data, role, and auth token
- Ready for backend API integration

### 2. **Updated Login Screen** (`src/features/auth/Login.jsx`)
- Role selector (Patient/Admin)
- Integrated with AuthContext
- Role-based navigation after login
- Backend-ready structure

### 3. **Finance Report Screen** (`src/features/admin/FinanceReport.jsx`)
- Admin dashboard example
- Financial reporting interface
- Can be extended with more admin features

---

## 🔐 Demo Credentials

### Patient Login:
- **Email**: `patient@labtech.com`
- **Password**: `patient123`
- **Role**: Select "Patient"
- **Navigates to**: Home Screen (`/home`)

### Admin Login:
- **Email**: `admin@labtech.com`
- **Password**: `admin123`
- **Role**: Select "Admin"
- **Navigates to**: Finance Report (`/financereport`)

---

## 🚀 How It Works

### Login Flow:
1. User opens login screen
2. User selects role (Patient or Admin)
3. User enters credentials
4. App calls `AuthContext.login()` with email, password, and role
5. AuthContext handles authentication
6. On success, app navigates based on role:
   - **Patient** → `/home`
   - **Admin** → `/financereport`

### Role-Based Navigation:
```javascript
if (result.role === 'admin') {
  router.push('/financereport'); // Admin Panel
} else {
  router.push('/home'); // Patient Panel
}
```

---

## 🔌 Backend API Integration Guide

### Step 1: Setup Your Backend API

Create a login endpoint in your Node.js backend:

```javascript
// Example: routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and role are required'
      });
    }

    // Query database based on role
    let query;
    if (role === 'admin') {
      query = 'SELECT * FROM admins WHERE email = ?';
    } else {
      query = 'SELECT * FROM patients WHERE email = ?';
    }
    
    const [users] = await db.execute(query, [email]);
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const user = users[0];
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Remove password from response
    delete user.password;
    
    // Send response
    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: role,
        ...user
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
```

### Step 2: Update AuthContext

In `src/context/AuthContext.jsx`, update the `login` function:

```javascript
const login = async (email, password, role) => {
  try {
    // Replace with your actual API URL
    const API_URL = 'http://your-backend-url.com'; // or 'http://localhost:3000'
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        password: password,
        role: role,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store authentication data
    await AsyncStorage.setItem('authToken', data.token);
    await AsyncStorage.setItem('userRole', data.user.role);
    await AsyncStorage.setItem('userData', JSON.stringify(data.user));

    // Update state
    setAuthToken(data.token);
    setUserRole(data.user.role);
    setUser(data.user);

    return { success: true, user: data.user, role: data.user.role };
    
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
```

### Step 3: Add API Configuration

Create `src/config/api.js`:

```javascript
// API Configuration
const API_CONFIG = {
  // Development
  DEV_URL: 'http://localhost:3000',
  
  // Production
  PROD_URL: 'https://your-production-api.com',
  
  // Use development or production
  BASE_URL: __DEV__ ? 'http://localhost:3000' : 'https://your-production-api.com',
};

export const API_ENDPOINTS = {
  LOGIN: `${API_CONFIG.BASE_URL}/api/auth/login`,
  LOGOUT: `${API_CONFIG.BASE_URL}/api/auth/logout`,
  PROFILE: `${API_CONFIG.BASE_URL}/api/user/profile`,
  // Add more endpoints as needed
};

export default API_CONFIG;
```

Then import and use in AuthContext:

```javascript
import { API_ENDPOINTS } from '../config/api';

// In login function:
const response = await fetch(API_ENDPOINTS.LOGIN, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password, role }),
});
```

---

## 💾 Database Schema

### Patients Table:
```sql
CREATE TABLE patients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  date_of_birth DATE,
  gender ENUM('male', 'female', 'other'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Admins Table:
```sql
CREATE TABLE admins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  department VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🔒 Security Best Practices

### 1. **Password Hashing**
```javascript
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Hash password before storing
const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

// Compare during login
const match = await bcrypt.compare(plainPassword, hashedPassword);
```

### 2. **JWT Token**
```javascript
const jwt = require('jsonwebtoken');

// Generate token
const token = jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Verify token (middleware)
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.user = decoded;
    next();
  });
};
```

### 3. **Environment Variables**
Create `.env` file:
```
JWT_SECRET=your-super-secret-jwt-key-here
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=labtech
PORT=3000
```

---

## 🧪 Testing

### Test Patient Login:
```javascript
// POST http://localhost:3000/api/auth/login
{
  "email": "patient@labtech.com",
  "password": "patient123",
  "role": "patient"
}
```

### Test Admin Login:
```javascript
// POST http://localhost:3000/api/auth/login
{
  "email": "admin@labtech.com",
  "password": "admin123",
  "role": "admin"
}
```

---

## 📱 Protected Routes

Create middleware to protect admin routes:

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

exports.requireAuth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

exports.requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
```

Usage:
```javascript
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Patient routes
router.get('/appointments', requireAuth, getAppointments);

// Admin routes
router.get('/finance-report', requireAuth, requireAdmin, getFinanceReport);
```

---

## 🎯 Next Steps

1. **Set up your Node.js backend** with Express
2. **Create database tables** using the schemas above
3. **Implement authentication endpoints** (`/login`, `/logout`)
4. **Update AuthContext** with your API URL
5. **Test login flow** with both roles
6. **Add more admin features** to Finance Report screen
7. **Implement logout** functionality
8. **Add protected routes** for admin-only content

---

## 📞 Need Help?

If you need assistance with:
- Backend API setup
- Database configuration
- Additional features
- Security implementations

Feel free to ask!

---

## 🎨 Customization

### Add More Admin Screens:
1. Create new screen: `src/features/admin/YourScreen.jsx`
2. Create route: `app/yourroute.jsx`
3. Add navigation in admin panel

### Add More User Roles:
1. Update role selector in Login.jsx
2. Add role handling in AuthContext
3. Create navigation logic for new role
4. Update backend to handle new role

---

**Version**: 1.0
**Last Updated**: November 2025
