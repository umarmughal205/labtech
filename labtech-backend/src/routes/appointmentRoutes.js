const express = require('express');
const router = express.Router();

const {
  createAppointment,
  getMyAppointments,
  getAllAppointments,
  updateAppointmentStatus,
  cancelOwnAppointment,
} = require('../controllers/appointmentController');

const validate = require('../middleware/validate');
const { verifyToken, requireAdmin, requirePatient } = require('../middleware/authMiddleware');
const {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} = require('../validation/appointmentValidation');

// Patient creates an appointment
router.post(
  '/',
  verifyToken,
  requirePatient,
  validate(createAppointmentSchema),
  createAppointment
);

// Patient gets own appointments
router.get('/mine', verifyToken, requirePatient, getMyAppointments);

// Patient cancels own appointment
router.patch('/mine/:id/cancel', verifyToken, requirePatient, cancelOwnAppointment);

// Admin gets all appointments
router.get('/admin', verifyToken, requireAdmin, getAllAppointments);

// Admin updates appointment status
router.patch(
  '/admin/:id/status',
  verifyToken,
  requireAdmin,
  validate(updateAppointmentStatusSchema),
  updateAppointmentStatus
);

module.exports = router;
