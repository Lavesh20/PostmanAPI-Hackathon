const Appointment = require('../models/Appointment');
const Hospital = require('../models/Hospital');
const { appointmentSchema } = require('../utils/validators');

const appointmentController = {
  async createAppointment(req, res) {
    try {
      const { error } = appointmentSchema.validate(req.body);
      if (error) throw new Error(error.details[0].message);

      // Check hospital availability
      const isSlotAvailable = await checkSlotAvailability(
        req.body.hospitalId,
        req.body.date,
        req.body.time
      );

      if (!isSlotAvailable) {
        throw new Error('Selected time slot is not available');
      }

      const appointment = new Appointment({
        ...req.body,
        userId: req.user.userId,
        status: 'pending'
      });

      await appointment.save();

      // Send notification to hospital
      await notifyHospital(appointment);
      
      res.status(201).json(appointment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async updateAppointment(req, res) {
    try {
      const { appointmentId } = req.params;
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        userId: req.user.userId
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.status === 'cancelled') {
        throw new Error('Cannot modify cancelled appointment');
      }

      if (req.body.date || req.body.time) {
        const isSlotAvailable = await checkSlotAvailability(
          appointment.hospitalId,
          req.body.date || appointment.date,
          req.body.time || appointment.time
        );

        if (!isSlotAvailable) {
          throw new Error('Selected time slot is not available');
        }
      }

      Object.assign(appointment, req.body);
      await appointment.save();

      res.json(appointment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};