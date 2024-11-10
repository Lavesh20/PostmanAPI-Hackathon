const Joi = require('joi');

const validators = {
  userSchema: Joi.object({
    name: Joi.string().required().min(2).max(50),
    email: Joi.string().required().email(),
    password: Joi.string().required().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/),
    healthData: Joi.object({
      bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      allergies: Joi.array().items(Joi.string()),
      conditions: Joi.array().items(Joi.string())
    })
  }),

  appointmentSchema: Joi.object({
    hospitalId: Joi.string().required(),
    date: Joi.date().greater('now').required(),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    reason: Joi.string().required().min(10).max(500)
  }),

  healthRecordSchema: Joi.object({
    recordType: Joi.string().required().valid('Lab Result', 'Prescription', 'Diagnosis', 'Vaccination'),
    details: Joi.object({
      description: Joi.string().required(),
      attachments: Joi.array().items(Joi.string().uri()),
      doctor: Joi.string(),
      facility: Joi.string()
    }).required(),
    date: Joi.date().required()
  })
};

module.exports = validators;