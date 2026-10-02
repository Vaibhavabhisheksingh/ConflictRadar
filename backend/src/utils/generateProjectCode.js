const crypto = require('crypto');
const Project = require('../models/Project');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — avoids ambiguity when read aloud

function randomSegment(length) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return out;
}

async function generateProjectCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `CR-${randomSegment(4)}`;
    const existing = await Project.findOne({ projectCode: code });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique project code — try again.');
}

module.exports = { generateProjectCode };
