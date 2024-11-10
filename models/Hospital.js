const hospitalSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    contact: {
      phone: String,
      email: String
    },
    services: [String]
  });
  
  hospitalSchema.index({ location: '2dsphere' });
  
  module.exports = mongoose.model('Hospital', hospitalSchema);