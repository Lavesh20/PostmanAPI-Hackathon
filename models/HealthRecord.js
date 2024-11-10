const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recordType: {
    type: String,
    required: true,
    enum: ['Lab Result', 'Prescription', 'Diagnosis', 'Vaccination', 
           'Surgery', 'Allergy', 'Medical Image', 'Treatment Plan']
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  facility: {
    name: {
      type: String,
      required: true
    },
    address: String,
    contact: String
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  details: {
    description: {
      type: String,
      required: true
    },
    diagnosis: [String],
    symptoms: [String],
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    labResults: [{
      testName: String,
      value: String,
      unit: String,
      normalRange: String,
      interpretation: String
    }],
    attachments: [{
      fileType: {
        type: String,
        enum: ['image', 'pdf', 'document']
      },
      url: String,
      name: String,
      size: Number
    }]
  },
  followUp: {
    required: false,
    date: Date,
    instructions: String,
    reminderSent: {
      type: Boolean,
      default: false
    }
  },
  confidentiality: {
    type: String,
    enum: ['normal', 'sensitive', 'highly-sensitive'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['draft', 'final', 'amended'],
    default: 'final'
  },
  version: {
    type: Number,
    default: 1
  },
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    accessLevel: {
      type: String,
      enum: ['read', 'write'],
      default: 'read'
    },
    sharedDate: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
healthRecordSchema.index({ userId: 1, date: -1 });
healthRecordSchema.index({ recordType: 1 });
healthRecordSchema.index({ 'details.diagnosis': 1 });

// Middleware to version control updates
healthRecordSchema.pre('save', function(next) {
  if (!this.isNew && this.isModified()) {
    this.version += 1;
  }
  next();
});

// Virtual for age at time of record
healthRecordSchema.virtual('patientAge').get(async function() {
  const user = await mongoose.model('User').findById(this.userId);
  if (user && user.dateOfBirth) {
    const recordDate = this.date;
    const birthDate = new Date(user.dateOfBirth);
    let age = recordDate.getFullYear() - birthDate.getFullYear();
    const m = recordDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && recordDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  return null;
});

module.exports = mongoose.model('HealthRecord', healthRecordSchema);