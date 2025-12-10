# Quick Start - Admin Login

## 🚀 Installation

First, install the required package:

```bash
npm install @react-native-async-storage/async-storage
```

or

```bash
yarn add @react-native-async-storage/async-storage
```

---

## 📋 Demo Credentials

### Patient:
```
Email: patient@labtech.com
Password: patient123
Role: Patient
```

### Admin:
```
Email: admin@labtech.com
Password: admin123
Role: Admin
```

---

## 🏗️ File Structure

```
labtech/
├── src/
│   ├── context/
│   │   └── AuthContext.jsx          ← Auth management
│   └── features/
│       ├── auth/
│       │   └── Login.jsx             ← Updated with role selector
│       └── admin/
│           └── FinanceReport.jsx     ← Admin dashboard
├── app/
│   └── financereport.jsx             ← Admin route
└── ADMIN_LOGIN_SETUP.md              ← Full documentation
```

---

## ⚡ Quick Usage

### 1. Wrap Your App with AuthProvider

Update your root layout (`app/_layout.jsx` or `app/index.jsx`):

```javascript
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* Your app content */}
    </AuthProvider>
  );
}
```

### 2. Use Auth in Any Component

```javascript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, userRole, isAdmin, logout } = useAuth();
  
  return (
    <View>
      <Text>Welcome, {user?.name}</Text>
      <Text>Role: {userRole}</Text>
      {isAdmin() && <Text>Admin Panel Access</Text>}
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
```

### 3. Protect Admin Routes

```javascript
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

function AdminScreen() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isAdmin()) {
      router.push('/home');
    }
  }, []);
  
  return (
    // Admin content
  );
}
```

---

## 🔄 Backend Integration Checklist

- [ ] Install packages: `bcrypt`, `jsonwebtoken`, `express`, `mysql2`
- [ ] Create database tables (patients, admins)
- [ ] Set up Express server
- [ ] Create auth routes (`/api/auth/login`)
- [ ] Update API URL in AuthContext
- [ ] Test login with both roles
- [ ] Implement protected routes
- [ ] Add logout endpoint
- [ ] Set up environment variables

---

## 🎯 Testing Flow

1. **Start App** → Login Screen shows
2. **Select Role** → Choose Patient or Admin
3. **Enter Credentials** → Use demo credentials above
4. **Click Login** → Wait for authentication
5. **Navigate** → Redirects based on role:
   - Patient → Home Screen
   - Admin → Finance Report

---

## 🔐 API Response Format

Your backend should return this format:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@labtech.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

---

## 🛠️ Common Issues

### Issue: "Cannot find module '@react-native-async-storage/async-storage'"
**Solution**: Run `npm install @react-native-async-storage/async-storage`

### Issue: Login succeeds but doesn't navigate
**Solution**: Check AuthContext.login() returns `{ success: true, role: 'admin' }`

### Issue: Role selector not showing
**Solution**: Make sure Login.jsx is updated with the role selector code

---

## 📞 Support

For detailed documentation, see `ADMIN_LOGIN_SETUP.md`

For questions, check:
- Backend setup
- Database configuration
- Security implementation
- Additional features
