// Simple in-memory store for admin-visible appointments.
// This is not persisted; it only lives for the current app session.

let dynamicAdminAppointments = [];

export const addAdminPendingAppointment = (appointment) => {
  const id = appointment.id || `APT-${Date.now()}`;

  const normalized = {
    id,
    patientName: appointment.patientName,
    testName: appointment.testName,
    date: appointment.date,
    time: appointment.time,
    emailOrPhone: appointment.emailOrPhone,
    gender: appointment.gender,
    age: appointment.age,
    cnic: appointment.cnic,
    guardian: appointment.guardian,
    guardianName: appointment.guardianName,
    payment: appointment.payment || 'Pending',
    status: appointment.status || 'Pending',
  };

  // Avoid duplicates by id
  const exists = dynamicAdminAppointments.some((apt) => apt.id === id);
  if (!exists) {
    dynamicAdminAppointments.unshift(normalized);
  }
};

export const getDynamicAdminAppointments = () => {
  return dynamicAdminAppointments;
};

export const updateAdminAppointmentStatus = (id, newStatus) => {
  dynamicAdminAppointments = dynamicAdminAppointments.map((apt) =>
    apt.id === id ? { ...apt, status: newStatus } : apt
  );
};
