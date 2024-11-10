const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  reason: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'],
    default: 'pending'
  },
  department: {
    type: String,
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  cancellationReason: {
    type: String,
    maxlength: 500
  },
  reminders: [{
    type: Date,
    required: true
  }],
  checkedIn: {
    type: Boolean,
    default: false
  },
  followUp: {
    required: false,
    date: Date,
    notes: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
appointmentSchema.index({ userId: 1, date: 1 });
appointmentSchema.index({ hospitalId: 1, date: 1 });
appointmentSchema.index({ status: 1 });

// Middleware to prevent scheduling conflicts
appointmentSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('date') || this.isModified('time')) {
    const existingAppointment = await this.constructor.findOne({
      hospitalId: this.hospitalId,
      date: this.date,
      time: this.time,
      status: { $nin: ['cancelled', 'completed'] },
      _id: { $ne: this._id }
    });

    if (existingAppointment) {
      throw new Error('This time slot is already booked');
    }
  }
  next();
});

// Virtual for full appointment time
appointmentSchema.virtual('fullDateTime').get(function() {
  const [hours, minutes] = this.time.split(':');
  const dateTime = new Date(this.date);
  dateTime.setHours(parseInt(hours), parseInt(minutes));
  return dateTime;
});

module.exports = mongoose.model('Appointment', appointmentSchema);
