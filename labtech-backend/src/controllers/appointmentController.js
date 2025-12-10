const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const User = require('../models/User');

// POST /api/appointments - patient books an appointment
async function createAppointment(req, res) {
  try {
    const userId = req.user ? req.user.sub : null; // from JWT (verifyToken middleware)

    const {
      selectedTest,
      fullName,
      email,
      cnic,
      selectedGuardian,
      guardianName,
      address,
      gender,
      age,
      date,
      time,
      paymentMethod,
      paymentStatus,
      testFee,
      // Optional flag: when true, this booking is part of a
      // reschedule flow. In that case, we skip the standalone
      // "new appointment booked" admin notification and let the
      // cancellation endpoint send a single combined reschedule
      // notification instead.
      isReschedule,
    } = req.body;

    // Debug log: inspect exactly what the mobile app is sending
    // when creating an appointment (including address field).
    console.log('createAppointment body:', JSON.stringify(req.body));

    // Prevent booking on past dates: only today or future dates allowed
    try {
      if (date) {
        const [yearStr, monthStr, dayStr] = String(date).split('-');

        if (yearStr && monthStr && dayStr) {
          const year = Number(yearStr);
          const month = Number(monthStr) - 1; // JS month 0-11
          const day = Number(dayStr);

          const appointmentDateOnly = new Date(year, month, day);
          const today = new Date();
          const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

          if (appointmentDateOnly.getTime() < todayDateOnly.getTime()) {
            return res.status(400).json({
              success: false,
              code: 'PAST_DATE_NOT_ALLOWED',
              message: 'You can only book appointments for today or future dates.',
            });
          }
        }
      }
    } catch (parseErr) {
      console.warn('createAppointment date parsing error:', parseErr);
      // fall through: let validation or DB constraints handle any bad date
    }

    // Prevent double booking: if there is already an appointment for the same
    // date & time that is not cancelled, reject the new booking.
    const existing = await Appointment.findOne({
      date,
      time,
      status: { $ne: 'Cancelled' },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        code: 'TIME_SLOT_TAKEN',
        message: 'This date and time slot is already booked. Please choose another time.',
      });
    }

    // Generate a professional-style unique appointment ID like P01, P02, ...
    const lastAppointment = await Appointment.findOne({
      appointmentSequence: { $ne: null },
    })
      .sort({ appointmentSequence: -1 })
      .lean();

    const nextSequence = (lastAppointment?.appointmentSequence || 0) + 1;
    const appointmentCode = `P${nextSequence.toString().padStart(2, '0')}`;

    const appointment = await Appointment.create({
      patient: userId || undefined,
      patientName: fullName,
      contact: email,
      cnic,
      gender,
      age,
      guardian: selectedGuardian,
      guardianName,
      address,
      testName: selectedTest,
      testFee,
      date,
      time,
      status: 'Pending',
      paymentMethod,
      paymentStatus: paymentStatus || 'Pending',
      appointmentSequence: nextSequence,
      appointmentCode,
    });

    // Notify admin: new appointment booked. If this booking is part of a
    // reschedule flow, we skip this standalone notification and instead
    // let the cancellation endpoint send one combined reschedule
    // notification that includes both old and new times.
    if (!isReschedule) {
      try {
        const adminUser = await User.findOne({ role: 'admin' }).lean();
        if (adminUser) {
          await Notification.create({
            user: adminUser._id,
            audience: 'admin',
            type: 'appointment_booked',
            title: 'New Appointment Booked',
            message: `A patient booked ${appointment.testName} on ${appointment.date} at ${appointment.time}.`,
            icon: 'calendar',
            iconColor: '#3B82F6',
            appointment: appointment._id,
          });
        }
      } catch (notifyErr) {
        console.error('Error creating admin notification in createAppointment:', notifyErr);
        // Do not fail main request because of notification issues
      }
    }

    return res.status(201).json({ success: true, appointment });
  } catch (err) {
    console.error('Create appointment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/appointments/mine - patient sees their appointments
async function getMyAppointments(req, res) {
  try {
    const userId = req.user ? req.user.sub : null;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const appointments = await Appointment.find({ patient: userId }).sort({ createdAt: -1 });

    return res.json({ success: true, appointments });
  } catch (err) {
    console.error('Get my appointments error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/admin/appointments - admin view of all appointments
async function getAllAppointments(req, res) {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    return res.json({ success: true, appointments });
  } catch (err) {
    console.error('Get all appointments error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PATCH /api/admin/appointments/:id/status - admin updates status
async function updateAppointmentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const update = { status };

    if (status === 'Cancelled') {
      update.cancelledBy = 'admin';
    }

    const appointment = await Appointment.findByIdAndUpdate(id, update, { new: true });

    // Backend-driven notification for the patient when admin confirms/cancels
    try {
      if (appointment && appointment.patient && (status === 'Confirmed' || status === 'Cancelled')) {
        const title = status === 'Confirmed' ? 'Appointment Confirmed' : 'Appointment Cancelled';
        const message =
          status === 'Confirmed'
            ? `Your appointment for ${appointment.testName} on ${appointment.date} at ${appointment.time} has been confirmed.`
            : `Your appointment for ${appointment.testName} on ${appointment.date} at ${appointment.time} has been cancelled.`;

        await Notification.create({
          user: appointment.patient,
          audience: 'patient',
          type: status === 'Confirmed' ? 'appointment_confirmed' : 'appointment_cancelled',
          title,
          message,
          icon: status === 'Confirmed' ? 'checkmark-circle' : 'close-circle',
          iconColor: status === 'Confirmed' ? '#059669' : '#DC2626',
          appointment: appointment._id,
        });

        // Also send an Expo push notification if the patient has a registered token
        try {
          const patientUser = await User.findById(appointment.patient).lean();
          if (patientUser && patientUser.expoPushToken) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: patientUser.expoPushToken,
                sound: 'default',
                title,
                body: message,
                data: {
                  appointmentId: String(appointment._id),
                  status,
                },
              }),
            });
          }
        } catch (pushErr) {
          console.error('Error sending Expo push notification in updateAppointmentStatus:', pushErr);
        }
      }
    } catch (notifyErr) {
      console.error('Error creating patient notification in updateAppointmentStatus:', notifyErr);
      // Do not fail the main request because of notification issues
    }

    return res.json({ success: true, appointment });
  } catch (err) {
    console.error('Update appointment status error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PATCH /api/appointments/mine/:id/cancel - patient cancels own appointment
async function cancelOwnAppointment(req, res) {
  try {
    const userId = req.user ? req.user.sub : null;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const appointment = await Appointment.findOne({ _id: id, patient: userId });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Enforce: patient can only cancel at least 3 hours before scheduled time
    try {
      const { date, time } = appointment; // date: 'YYYY-MM-DD', time example: '10:30 AM'

      if (date && time) {
        const [yearStr, monthStr, dayStr] = String(date).split('-');
        const match = String(time).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

        if (yearStr && monthStr && dayStr && match) {
          const year = Number(yearStr);
          const month = Number(monthStr) - 1; // JS month 0-11
          const day = Number(dayStr);

          let hours = Number(match[1]);
          const minutes = Number(match[2]);
          const ampm = match[3].toUpperCase();

          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;

          const appointmentDate = new Date(year, month, day, hours, minutes, 0, 0);

          if (!Number.isNaN(appointmentDate.getTime())) {
            const now = new Date();
            const diffMs = appointmentDate.getTime() - now.getTime();
            const minMs = 3 * 60 * 60 * 1000; // 3 hours

            if (diffMs < minMs) {
              return res.status(400).json({
                success: false,
                code: 'TOO_LATE_TO_CANCEL',
                message: 'Appointments can only be cancelled at least 3 hours before the scheduled time.',
              });
            }
          }
        }
      }
    } catch (parseErr) {
      // If date parsing fails, do not hard-block; allow cancellation
      console.warn('cancelOwnAppointment time parsing error:', parseErr);
    }

    appointment.status = 'Cancelled';
    appointment.cancelledBy = 'patient';

    await appointment.save();

    // Backend-driven notification for admins when a patient cancels.
    // For a pure cancel, send a simple "cancelled" notification.
    // For a reschedule (isReschedule=true), send a single combined
    // notification that explains both old and new appointment times.
    try {
      const adminUser = await User.findOne({ role: 'admin' }).lean();
      if (adminUser) {
        const { isReschedule, newDate, newTime } = req.body || {};

        if (isReschedule && newDate && newTime) {
          await Notification.create({
            user: adminUser._id,
            audience: 'admin',
            type: 'appointment_rescheduled',
            title: 'Patient Rescheduled Appointment',
            message: `Patient rescheduled ${appointment.testName} from ${appointment.date} at ${appointment.time} to ${newDate} at ${newTime}.`,
            // Distinct icon/color for reschedule vs plain cancel
            icon: 'swap-horizontal',
            iconColor: '#8B5CF6',
            appointment: appointment._id,
          });
        } else {
          await Notification.create({
            user: adminUser._id,
            audience: 'admin',
            type: 'appointment_cancelled',
            title: 'Patient Cancelled Appointment',
            message: `Patient cancelled appointment for ${appointment.testName} on ${appointment.date} at ${appointment.time}.`,
            icon: 'close-circle',
            iconColor: '#DC2626',
            appointment: appointment._id,
          });
        }
      }
    } catch (notifyErr) {
      console.error('Error creating admin notification in cancelOwnAppointment:', notifyErr);
      // Do not fail the main request because of notification issues
    }

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    return res.json({ success: true, appointment });
  } catch (err) {
    console.error('Cancel own appointment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  createAppointment,
  getMyAppointments,
  getAllAppointments,
  updateAppointmentStatus,
  cancelOwnAppointment,
};
