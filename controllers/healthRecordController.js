const HealthRecord = require('../models/HealthRecord');
const { healthRecordSchema } = require('../utils/validators');

const healthRecordController = {
  async createRecord(req, res) {
    try {
      const { error } = healthRecordSchema.validate(req.body);
      if (error) throw new Error(error.details[0].message);

      const record = new HealthRecord({
        ...req.body,
        userId: req.user.userId
      });

      await record.save();
      res.status(201).json(record);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async getRecords(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const recordType = req.query.type;

      let query = { userId: req.user.userId };
      if (recordType) {
        query.recordType = recordType;
      }

      const records = await HealthRecord.find(query)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('doctor', 'name specialization');

      const total = await HealthRecord.countDocuments(query);

      res.json({
        records,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};