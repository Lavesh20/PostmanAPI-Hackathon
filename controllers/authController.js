const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const { userSchema } = require('../utils/validators');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const authController = {
  async register(req, res) {
    try {
      // Validate request body
      const { error } = userSchema.validate(req.body);
      if (error) {
        throw new Error(error.details[0].message);
      }

      const { name, email, password, healthData } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      // Create new user
      const user = new User({
        name,
        email,
        password,
        healthData,
        verificationToken,
        verificationExpires
      });

      await user.save();

      // Send verification email
      await sendVerificationEmail(user.email, verificationToken);

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      res.status(201).json({
        userId: user._id,
        token,
        message: 'Registration successful. Please check your email for verification.'
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user and select password field
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        throw new Error('Invalid login credentials');
      }

      // Check if user is verified
      if (!user.isVerified) {
        throw new Error('Please verify your email before logging in');
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid login credentials');
      }

      // Update last login
      user.lastLogin = Date.now();
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      res.json({
        userId: user._id,
        token,
        name: user.name,
        email: user.email
      });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  },

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

      await user.save();

      // Send reset email
      await sendPasswordResetEmail(email, resetToken);

      res.json({ message: 'Password reset instructions sent to your email' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Update password
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      const user = await User.findOne({
        verificationToken: token,
        verificationExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationExpires = undefined;

      await user.save();

      res.json({ message: 'Email verification successful' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

// Helper functions for sending emails
const transporter = nodemailer.createTransport(config.email);

async function sendVerificationEmail(email, token) {
  const verificationUrl = `${process.env.APP_URL}/verify-email/${token}`;
  
  await transporter.sendMail({
    to: email,
    subject: 'Verify Your Email',
    html: `Please click <a href="${verificationUrl}">here</a> to verify your email.`
  });
}

async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${process.env.APP_URL}/reset-password/${token}`;
  
  await transporter.sendMail({
    to: email,
    subject: 'Reset Your Password',
    html: `Please click <a href="${resetUrl}">here</a> to reset your password.`
  });
}

module.exports = authController;
