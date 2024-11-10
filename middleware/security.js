const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const securityMiddleware = [
  helmet(), // Secure HTTP headers
  mongoSanitize(), // Prevent NoSQL injection
  xss(), // Prevent XSS attacks
];

module.exports = securityMiddleware;