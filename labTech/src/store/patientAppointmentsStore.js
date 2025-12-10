// Simple in-memory store for patient appointments that are created via booking.
// This allows admin actions to update the same appointments the patient sees.

let dynamicPatientAppointments = [];

export const addPatientAppointment = (appointment) => {
  const exists = dynamicPatientAppointments.some((apt) => apt.id === appointment.id);
  if (!exists) {
    dynamicPatientAppointments.unshift(appointment);
  }
};

export const getDynamicPatientAppointments = () => {
  return dynamicPatientAppointments;
};

export const updatePatientAppointmentStatus = (id, newStatus) => {
  dynamicPatientAppointments = dynamicPatientAppointments.map((apt) =>
    apt.id === id ? { ...apt, status: newStatus } : apt
  );
};
