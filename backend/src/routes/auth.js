const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('[auth] JWT_SECRET is not configured.');
}

// POST /auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'Name, email and password are required.',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters.',
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'An account with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    res.status(201).json({
      ok: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[auth/signup]', err.message);

    res.status(500).json({
      error: 'Failed to create account.',
    });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required.',
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password.',
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Invalid email or password.',
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        error: 'Authentication is not configured on the server.',
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
      }
    );

    res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err.message);

    res.status(500).json({
      error: 'Failed to login.',
    });
  }
});

module.exports = router;