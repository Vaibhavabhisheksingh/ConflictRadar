const mongoose = require('mongoose');

const developerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  projectCode: {
    type: String,
    required: true,
    index: true,
  },

  socketId: {
    type: String,
  },

  lastSeen: {
    type: Date,
    default: Date.now,
  },
});

developerSchema.index(
  { userId: 1, projectCode: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.Developer ||
  mongoose.model('Developer', developerSchema);