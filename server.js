const express = require('express');
const connectDB = require('./config/database');
const { apiLimiter, authLimiter } = require('./middleware/rateLimit');
const securityMiddleware = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoute');
const userRoutes = require('./routes/userRoute');
const hospitalRoutes = require('./routes/hospitalRoute');
const healthRecordRoutes = require('./routes/healthRecordRoute');
const appointmentRoutes = require('./routes/appointmentRoute');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());

//security middleware
app.use(securityMiddleware);

// Rate Limiting
app.use('/auth/', authLimiter);
app.use('/api/', apiLimiter);

// Routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/hospitals', hospitalRoutes);
app.use('/health', healthRecordRoutes);
app.use('/appointments', appointmentRoutes);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});