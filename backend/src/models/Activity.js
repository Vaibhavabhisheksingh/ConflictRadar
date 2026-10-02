const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  projectCode: { type: String, required: true, index: true },
  developer: { type: String, required: true },
  file: { type: String, required: true },
  functionName: { type: String, required: true },
  lineRange: {
    start: { type: Number },
    end: { type: Number },
  },
  editedLine: { type: Number },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'idle'], default: 'active' },
});

activitySchema.index({ projectCode: 1, file: 1, functionName: 1, status: 1 });

module.exports = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
