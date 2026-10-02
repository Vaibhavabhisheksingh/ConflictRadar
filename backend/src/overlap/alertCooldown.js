
const COOLDOWN_MS = 20_000;
const lastAlertAt = new Map();

function alertKey(projectCode, developerA, developerB, file, functionName) {
  const pair = [developerA, developerB].sort().join('+');
  return `${projectCode}::${pair}::${file}::${functionName}`;
}

function shouldAlert(projectCode, developerA, developerB, file, functionName) {
  const key = alertKey(projectCode, developerA, developerB, file, functionName);
  const last = lastAlertAt.get(key);
  const now = Date.now();
  if (last && now - last < COOLDOWN_MS) return false;
  lastAlertAt.set(key, now);
  return true;
}

module.exports = { shouldAlert, COOLDOWN_MS };
