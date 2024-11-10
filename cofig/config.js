require('dotenv').config();

const config = {
  environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  bcrypt: {
    saltRounds: 10
  }
};

module.exports = config;