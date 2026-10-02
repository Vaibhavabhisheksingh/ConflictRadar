const mongoose = require('mongoose');

const overlapSchema = new mongoose.Schema({
  projectCode: { type: String, required: true, index: true },
  developersInvolved: [{ type: String, required: true }],
  file: { type: String, required: true },
  functionName: { type: String, required: true },
  severity: {
    type: String,
    enum: ['same-file', 'same-function', 'same-line'],
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Overlap || mongoose.model('Overlap', overlapSchema);
