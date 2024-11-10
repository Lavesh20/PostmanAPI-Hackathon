const Hospital = require('../models/Hospital');

const hospitalController = {
  async getNearbyHospitals(req, res) {
    try {
      const { latitude, longitude, radius = 5000, services } = req.query;
      
      let query = {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            $maxDistance: parseInt(radius)
          }
        }
      };

      // Add services filter if specified
      if (services) {
        query.services = { $all: services.split(',') };
      }

      const hospitals = await Hospital.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            distanceField: 'distance',
            spherical: true,
            maxDistance: parseInt(radius)
          }
        },
        {
          $match: services ? { services: { $all: services.split(',') } } : {}
        },
        {
          $project: {
            name: 1,
            address: 1,
            contact: 1,
            services: 1,
            distance: 1,
            availability: 1
          }
        }
      ]);

      res.json(hospitals);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getHospitalAvailability(req, res) {
    try {
      const { hospitalId, date } = req.query;
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const appointments = await Appointment.find({
        hospitalId,
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }).select('time');

      const availableSlots = generateAvailableTimeSlots(appointments);
      res.json({ availableSlots });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};