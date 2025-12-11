const express = require('express');
const cors = require('cors');

const { PORT } = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const { ensureAdmin } = require('./src/bootstrap/admin');
const authRoutes = require('./src/routes/authRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const testRoutes = require('./src/routes/testRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const sampleRoutes = require('./src/routes/sampleRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const profilingRoutes = require('./src/routes/profilingRoutes');
const staffRoutes = require('./src/routes/staffRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Connect to DB, then ensure admin user exists
connectDB()
  .then(() => ensureAdmin())
  .catch((e) => console.error('DB connection or ensureAdmin error:', e));

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/labtech/samples', sampleRoutes);
app.use('/api/lab/dashboard', dashboardRoutes);
app.use('/api/profiling', profilingRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/expenses', expenseRoutes);

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
