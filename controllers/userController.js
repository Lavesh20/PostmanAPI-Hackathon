// controllers/userController.js
const User = require('../models/User');
const HealthRecord = require('../models/HealthRecord');
const Appointment = require('../models/Appointment');
const bcrypt = require('bcryptjs');
const { userSchema } = require('../utils/validators');
const config = require('../config/config');
const mongoose = require('mongoose');

const userController = {
  // Get user profile
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .lean();

      if (!user) {
        throw new Error('User not found');
      }

      // Get upcoming appointments
      const upcomingAppointments = await Appointment.find({
        userId: user._id,
        date: { $gte: new Date() },
        status: { $nin: ['cancelled', 'completed'] }
      })
        .sort({ date: 1 })
        .limit(5)
        .populate('hospitalId', 'name address')
        .populate('doctor', 'name specialization')
        .lean();

      // Get recent health records
      const recentHealthRecords = await HealthRecord.find({
        userId: user._id
      })
        .sort({ date: -1 })
        .limit(5)
        .populate('doctor', 'name specialization')
        .lean();

      res.json({
        user,
        upcomingAppointments,
        recentHealthRecords
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Update user profile
  async updateProfile(req, res) {
    try {
      const allowedUpdates = ['name', 'email', 'phone', 'address', 'emergencyContact', 'healthData'];
      const updates = Object.keys(req.body)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});

      // Validate updates
      const { error } = userSchema.validate(updates);
      if (error) {
        throw new Error(error.details[0].message);
      }

      // Check email uniqueness if email is being updated
      if (updates.email) {
        const existingUser = await User.findOne({
          email: updates.email,
          _id: { $ne: req.user.userId }
        });
        if (existingUser) {
          throw new Error('Email already in use');
        }
      }

      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password -resetPasswordToken -resetPasswordExpires');

      if (!user) {
        throw new Error('User not found');
      }

      res.json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Update password
  async updatePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user.userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Hash new password
      user.password = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
      await user.save();

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Update health data
  async updateHealthData(req, res) {
    try {
      const allowedHealthFields = [
        'bloodGroup',
        'allergies',
        'conditions',
        'medications',
        'weight',
        'height',
        'emergencyContact'
      ];

      const updates = Object.keys(req.body)
        .filter(key => allowedHealthFields.includes(key))
        .reduce((obj, key) => {
          obj[`healthData.${key}`] = req.body[key];
          return obj;
        }, {});

      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('healthData');

      if (!user) {
        throw new Error('User not found');
      }

      res.json(user.healthData);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Get user's health summary
  async getHealthSummary(req, res) {
    try {
      const userId = req.user.userId;

      // Get user's basic info and health data
      const user = await User.findById(userId)
        .select('healthData name dateOfBirth')
        .lean();

      // Get recent vital statistics
      const recentVitals = await HealthRecord.find({
        userId,
        recordType: 'Lab Result',
        'details.labResults': { $exists: true }
      })
        .sort({ date: -1 })
        .limit(5)
        .lean();

      // Get medication history
      const medications = await HealthRecord.find({
        userId,
        'details.medications': { $exists: true }
      })
        .sort({ date: -1 })
        .lean();

      // Get appointment history
      const appointmentHistory = await Appointment.find({
        userId,
        status: 'completed'
      })
        .sort({ date: -1 })
        .limit(10)
        .populate('hospitalId', 'name')
        .populate('doctor', 'name specialization')
        .lean();

      res.json({
        basicInfo: {
          name: user.name,
          dateOfBirth: user.dateOfBirth,
          bloodGroup: user.healthData.bloodGroup
        },
        healthData: user.healthData,
        recentVitals,
        medications,
        appointmentHistory
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Share health records with another user or healthcare provider
  async shareHealthRecords(req, res) {
    try {
      const { targetUserId, recordIds, accessLevel } = req.body;

      // Validate target user exists
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        throw new Error('Target user not found');
      }

      // Update sharing permissions for each record
      await HealthRecord.updateMany(
        {
          _id: { $in: recordIds },
          userId: req.user.userId
        },
        {
          $push: {
            sharedWith: {
              userId: targetUserId,
              accessLevel,
              sharedDate: new Date()
            }
          }
        }
      );

      res.json({ message: 'Health records shared successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Delete user account
  async deleteAccount(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { password } = req.body;

      // Verify password
      const user = await User.findById(req.user.userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new Error('Password is incorrect');
      }

      // Delete all related records
      await Promise.all([
        HealthRecord.deleteMany({ userId: user._id }, { session }),
        Appointment.deleteMany({ userId: user._id }, { session }),
        User.findByIdAndDelete(user._id, { session })
      ]);

      await session.commitTransaction();
      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      await session.abortTransaction();
      res.status(400).json({ error: error.message });
    } finally {
      session.endSession();
    }
  },

  // Get notification preferences
  async getNotificationPreferences(req, res) {
    try {
      const user = await User.findById(req.user.userId)
        .select('notificationPreferences')
        .lean();

      if (!user) {
        throw new Error('User not found');
      }

      res.json(user.notificationPreferences);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Update notification preferences
  async updateNotificationPreferences(req, res) {
    try {
      const { preferences } = req.body;

      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { $set: { notificationPreferences: preferences } },
        { new: true }
      ).select('notificationPreferences');

      if (!user) {
        throw new Error('User not found');
      }

      res.json(user.notificationPreferences);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = userController;