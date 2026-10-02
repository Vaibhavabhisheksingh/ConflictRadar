
const express = require('express');
const Project = require('../models/Project');
const Developer = require('../models/Developer');
const Overlap = require('../models/Overlap');
const { generateProjectCode } = require('../utils/generateProjectCode');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
const CODE_PATTERN = /^CR-[A-Z0-9]{4}$/;

// POST /project/create
router.post('/create', authenticateToken, async (req, res) => {
  const { githubRepoUrl } = req.body || {};
  const userId = req.user.userId;

  try {
    const projectCode = await generateProjectCode();

    const project = await Project.create({
      projectCode,
      createdBy: userId,
      githubRepoUrl,
    });

    await Developer.create({
      userId,
      projectCode,
    });

    res.status(201).json({
      projectCode: project.projectCode,
    });
  } catch (err) {
    console.error('[project/create]', err.message);
    res.status(500).json({
      error: 'Failed to create project.',
    });
  }
});

// POST /project/join
router.post('/join', authenticateToken, async (req, res) => {
  const { projectCode } = req.body || {};
  const userId = req.user.userId;

  if (!projectCode) {
    return res.status(400).json({
      error: 'projectCode is required.',
    });
  }

  const normalizedCode = projectCode.toUpperCase();

  if (!CODE_PATTERN.test(normalizedCode)) {
    return res.status(400).json({
      error: `"${projectCode}" isn't a valid project code (expected format: CR-XXXX).`,
    });
  }

  try {
    const project = await Project.findOne({
      projectCode: normalizedCode,
    });

    if (!project) {
      return res.status(404).json({
        error: `No project found with code ${projectCode}.`,
      });
    }

    await Developer.findOneAndUpdate(
      {
        userId,
        projectCode: project.projectCode,
      },
      {
        userId,
        projectCode: project.projectCode,
        lastSeen: new Date(),
      },
      {
        upsert: true,
        new: true,
      }
    );

    res.json({
      ok: true,
      project: {
        projectCode: project.projectCode,
        createdBy: project.createdBy,
        createdAt: project.createdAt,
      },
    });
  } catch (err) {
    console.error('[project/join]', err.message);
    res.status(500).json({
      error: 'Failed to join project.',
    });
  }
});

// GET /project/:projectCode/heatmap
router.get('/:projectCode/heatmap', async (req, res) => {
  const normalizedCode = (req.params.projectCode || '').toUpperCase();

  try {
    const rows = await Overlap.aggregate([
      { $match: { projectCode: normalizedCode } },
      {
        $group: {
          _id: { file: '$file', functionName: '$functionName' },
          count: { $sum: 1 },
          lastSeen: { $max: '$timestamp' },
          maxSeverity: { $max: '$severity' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    res.json({
      heatmap: rows.map((r) => ({
        file: r._id.file,
        functionName: r._id.functionName,
        count: r.count,
        lastSeen: r.lastSeen,
      })),
    });
  } catch (err) {
    console.error('[project/heatmap]', err.message);
    res.status(500).json({
      error: 'Failed to load heatmap.',
    });
  }
});

module.exports = router;