const Joi = require('joi');

const createAppointmentSchema = Joi.object({
  selectedTest: Joi.string().min(2).required(),
  fullName: Joi.string().min(3).required(),
  email: Joi.string().min(3).required(), // already validated as email/phone on frontend
  cnic: Joi.string().min(5).required(),
  selectedGuardian: Joi.string().allow('', null),
  guardianName: Joi.string().allow('', null),
  gender: Joi.string().required(),
  age: Joi.number().integer().min(1).max(120).required(),
  date: Joi.string().required(),
  time: Joi.string().required(),
  paymentMethod: Joi.string().allow('', null),
  paymentStatus: Joi.string().valid('Pending', 'Online', 'Pay at Lab').allow(null),
  testFee: Joi.number().integer().min(0).allow(null),
});

const updateAppointmentStatusSchema = Joi.object({
  status: Joi.string()
    .valid('Pending', 'Confirmed', 'Completed', 'Cancelled')
    .required(),
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
};
