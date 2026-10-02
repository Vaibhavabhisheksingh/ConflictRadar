const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  projectCode: { type: String, required: true, unique: true, index: true },
  // createdBy: { type: String, required: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  githubRepoUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.Project || mongoose.model("Project", projectSchema);
